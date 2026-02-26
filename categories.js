const API_BASE_URL = '/api';

const timeRangeSelect = document.getElementById("timeRange");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
const timeRangeControls = document.getElementById("timeRangeControls");
const monthSelectorControls = document.getElementById("monthSelectorControls");
const totalIncomeDisplay = document.getElementById("totalIncome");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const netAmountDisplay = document.getElementById("netAmount");
const refreshDataBtn = document.getElementById("refreshDataBtn");
const expensesList = document.getElementById("expensesList");
const incomeList = document.getElementById("incomeList");

let expensesChart = null;
let incomeChart = null;
let accounts = [];
let activeAccountId = null;
let transactions = [];
let viewMode = "timeRange";

async function loadAccountsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    if (!response.ok) {
      throw new Error('Failed to load accounts');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

async function loadActiveAccountIdFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/active-account`);
    if (!response.ok) {
      throw new Error('Failed to load active account');
    }
    const data = await response.json();
    return data.activeAccountId;
  } catch (error) {
    console.error('Error loading active account:', error);
    return null;
  }
}

function selectActiveAccountTransactions() {
  const activeAccount = accounts.find(acc => acc.id === activeAccountId) || accounts[0];
  if (!activeAccount || !Array.isArray(activeAccount.transactions)) {
    return [];
  }
  return activeAccount.transactions;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function getNextRecurrenceDate(dateStr, recurrence) {
  const date = new Date(dateStr + 'T00:00:00');
  
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'bi-weekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return toDateKey(date);
}

function expandRecurringTransactions(startDate, endDate) {
  const expanded = [];
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  
  for (const txn of transactions) {
    // Add the original transaction if it's in range
    if (txn.date >= startKey && txn.date <= endKey) {
      expanded.push(txn);
    }
    
    // If it's recurring, generate instances
    if (txn.recurrence && txn.recurrence !== 'one-time') {
      let currentDate = txn.date;
      
      // Generate recurring instances
      while (true) {
        const nextDate = getNextRecurrenceDate(currentDate, txn.recurrence);
        if (!nextDate || nextDate > endKey) break;
        
        if (nextDate >= startKey) {
          expanded.push({
            ...txn,
            id: `${txn.id}-recur-${nextDate}`,
            date: nextDate,
            isRecurring: true,
            originalId: txn.id,
          });
        }
        
        currentDate = nextDate;
      }
    }
  }
  
  return expanded;
}

function prepareCategoryData(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const allTransactions = expandRecurringTransactions(startDate, endDate);
  
  const expensesByCategory = new Map();
  const incomeByCategory = new Map();
  let totalIncome = 0;
  let totalExpenses = 0;
  
  for (const txn of allTransactions) {
    const category = txn.description || 'Uncategorized';
    const amount = Math.abs(txn.amount);
    
    if (txn.amount < 0) {
      // Expense
      expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + amount);
      totalExpenses += amount;
    } else if (txn.amount > 0) {
      // Income
      incomeByCategory.set(category, (incomeByCategory.get(category) || 0) + amount);
      totalIncome += amount;
    }
  }
  
  return {
    expensesByCategory,
    incomeByCategory,
    totalIncome,
    totalExpenses,
  };
}

function prepareMonthCategoryData(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const allTransactions = expandRecurringTransactions(startDate, endDate);
  
  const expensesByCategory = new Map();
  const incomeByCategory = new Map();
  let totalIncome = 0;
  let totalExpenses = 0;
  
  for (const txn of allTransactions) {
    const category = txn.description || 'Uncategorized';
    const amount = Math.abs(txn.amount);
    
    if (txn.amount < 0) {
      // Expense
      expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + amount);
      totalExpenses += amount;
    } else if (txn.amount > 0) {
      // Income
      incomeByCategory.set(category, (incomeByCategory.get(category) || 0) + amount);
      totalIncome += amount;
    }
  }
  
  return {
    expensesByCategory,
    incomeByCategory,
    totalIncome,
    totalExpenses,
  };
}

function populateYearSelect() {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  // Add current year and nearby years
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.add(i);
  }
  
  // Add years from existing transactions
  for (const txn of transactions) {
    const year = parseInt(txn.date.substring(0, 4));
    years.add(year);
  }
  
  const sortedYears = Array.from(years).sort();
  yearSelect.innerHTML = sortedYears.map(year => 
    `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
  ).join('');
}

function renderCategoryList(container, categoryMap, total) {
  if (categoryMap.size === 0) {
    container.innerHTML = '<p class="empty-message">No transactions found</p>';
    return;
  }
  
  // Sort by amount descending
  const sorted = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
  
  let html = '<div class="category-breakdown">';
  for (const [category, amount] of sorted) {
    const percentage = total > 0 ? (amount / total * 100).toFixed(1) : 0;
    html += `
      <div class="category-row">
        <div class="category-info">
          <span class="category-name">${category}</span>
          <span class="category-amount">${formatCurrency(amount)}</span>
        </div>
        <div class="category-bar-container">
          <div class="category-bar" style="width: ${percentage}%"></div>
          <span class="category-percentage">${percentage}%</span>
        </div>
      </div>
    `;
  }
  html += '</div>';
  
  container.innerHTML = html;
}

function updateCharts() {
  let categoryData;
  
  if (viewMode === "timeRange") {
    const days = parseInt(timeRangeSelect.value);
    categoryData = prepareCategoryData(days);
  } else {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    categoryData = prepareMonthCategoryData(year, month);
  }
  
  // Update summary stats
  totalIncomeDisplay.textContent = formatCurrency(categoryData.totalIncome);
  totalExpensesDisplay.textContent = formatCurrency(categoryData.totalExpenses);
  const net = categoryData.totalIncome - categoryData.totalExpenses;
  netAmountDisplay.textContent = formatCurrency(net);
  netAmountDisplay.className = net === 0 ? "" : net > 0 ? "positive" : "negative";
  
  // Render category lists
  renderCategoryList(expensesList, categoryData.expensesByCategory, categoryData.totalExpenses);
  renderCategoryList(incomeList, categoryData.incomeByCategory, categoryData.totalIncome);
  
  // Update expenses chart
  if (expensesChart) {
    expensesChart.destroy();
  }
  
  if (categoryData.expensesByCategory.size > 0) {
    const expenseCtx = document.getElementById('expensesChart').getContext('2d');
    const expenseLabels = Array.from(categoryData.expensesByCategory.keys());
    const expenseData = Array.from(categoryData.expensesByCategory.values());
    
    expensesChart = new Chart(expenseCtx, {
      type: 'doughnut',
      data: {
        labels: expenseLabels,
        datasets: [{
          data: expenseData,
          backgroundColor: [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
            '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
            '#ec4899', '#f43f5e'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 10,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / categoryData.totalExpenses) * 100).toFixed(1);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // Update income chart
  if (incomeChart) {
    incomeChart.destroy();
  }
  
  if (categoryData.incomeByCategory.size > 0) {
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    const incomeLabels = Array.from(categoryData.incomeByCategory.keys());
    const incomeData = Array.from(categoryData.incomeByCategory.values());
    
    incomeChart = new Chart(incomeCtx, {
      type: 'doughnut',
      data: {
        labels: incomeLabels,
        datasets: [{
          data: incomeData,
          backgroundColor: [
            '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
            '#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#84cc16',
            '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 10,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / categoryData.totalIncome) * 100).toFixed(1);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}

// Event listeners
timeRangeSelect.addEventListener('change', updateCharts);

// View mode radio buttons
viewModeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    viewMode = e.target.value;
    
    if (viewMode === 'timeRange') {
      timeRangeControls.style.display = 'block';
      monthSelectorControls.style.display = 'none';
    } else {
      timeRangeControls.style.display = 'none';
      monthSelectorControls.style.display = 'block';
    }
    
    updateCharts();
  });
});

// Year and month selects
yearSelect.addEventListener('change', updateCharts);
monthSelect.addEventListener('change', updateCharts);

// Refresh button
if (refreshDataBtn) {
  refreshDataBtn.addEventListener('click', async () => {
    refreshDataBtn.disabled = true;
    refreshDataBtn.textContent = '🔄 Refreshing...';
    await initialize();
    refreshDataBtn.disabled = false;
    refreshDataBtn.textContent = '🔄 Refresh';
  });
}

// Initialize
async function initialize() {
  try {
    accounts = await loadAccountsFromAPI();
    activeAccountId = await loadActiveAccountIdFromAPI();
    transactions = selectActiveAccountTransactions();
    populateYearSelect();
    monthSelect.value = new Date().getMonth();
    updateCharts();
  } catch (error) {
    console.error('Error initializing category data:', error);
  }
}

// Reload data when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    initialize();
  }
});

initialize();
