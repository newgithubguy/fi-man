const STORAGE_KEY = "finance-calendar-transactions";
const ACCOUNTS_STORAGE_KEY = "finance-calendar-accounts";
const ACTIVE_ACCOUNT_KEY = "finance-calendar-active-account";

const timeRangeSelect = document.getElementById("timeRange");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
const timeRangeControls = document.getElementById("timeRangeControls");
const monthSelectorControls = document.getElementById("monthSelectorControls");
const totalIncomeDisplay = document.getElementById("totalIncome");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const netAmountDisplay = document.getElementById("netAmount");

let chart = null;
let transactions = loadTransactions();
let viewMode = "timeRange";

function loadTransactions() {
  try {
    // Try to load from multi-account storage first
    const rawAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      const activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      
      // Find the active account or use the first one
      const activeAccount = accounts.find(acc => acc.id === activeAccountId) || accounts[0];
      if (activeAccount && activeAccount.transactions) {
        return Array.isArray(activeAccount.transactions) ? activeAccount.transactions : [];
      }
    }
    
    // Fallback to old single-account storage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error loading transactions:", e);
    return [];
  }
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

function prepareChartData(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const allTransactions = expandRecurringTransactions(startDate, endDate);
  
  // Group by date
  const dailyData = new Map();
  
  // Initialize all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = toDateKey(d);
    dailyData.set(dateKey, { income: 0, expenses: 0 });
  }
  
  // Populate with transaction data
  for (const txn of allTransactions) {
    if (dailyData.has(txn.date)) {
      const data = dailyData.get(txn.date);
      if (txn.amount > 0) {
        data.income += txn.amount;
      } else {
        data.expenses += Math.abs(txn.amount);
      }
    }
  }
  
  // Convert to arrays for Chart.js
  const labels = [];
  const incomeData = [];
  const expensesData = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  
  for (const [date, data] of dailyData) {
    labels.push(date);
    incomeData.push(data.income);
    expensesData.push(data.expenses);
    totalIncome += data.income;
    totalExpenses += data.expenses;
  }
  
  return {
    labels,
    incomeData,
    expensesData,
    totalIncome,
    totalExpenses,
  };
}

function prepareMonthChartData(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const allTransactions = expandRecurringTransactions(startDate, endDate);
  
  // Group by date
  const dailyData = new Map();
  
  // Initialize all dates in the month
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = toDateKey(d);
    dailyData.set(dateKey, { income: 0, expenses: 0 });
  }
  
  // Populate with transaction data
  for (const txn of allTransactions) {
    if (dailyData.has(txn.date)) {
      const data = dailyData.get(txn.date);
      if (txn.amount > 0) {
        data.income += txn.amount;
      } else {
        data.expenses += Math.abs(txn.amount);
      }
    }
  }
  
  // Convert to arrays for Chart.js
  const labels = [];
  const incomeData = [];
  const expensesData = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  
  for (const [date, data] of dailyData) {
    labels.push(date);
    incomeData.push(data.income);
    expensesData.push(data.expenses);
    totalIncome += data.income;
    totalExpenses += data.expenses;
  }
  
  return {
    labels,
    incomeData,
    expensesData,
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

function updateChart() {
  let chartData;
  
  if (viewMode === "timeRange") {
    const days = parseInt(timeRangeSelect.value);
    chartData = prepareChartData(days);
  } else {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    chartData = prepareMonthChartData(year, month);
  }
  
  // Update summary stats
  totalIncomeDisplay.textContent = formatCurrency(chartData.totalIncome);
  totalExpensesDisplay.textContent = formatCurrency(chartData.totalExpenses);
  const net = chartData.totalIncome - chartData.totalExpenses;
  netAmountDisplay.textContent = formatCurrency(net);
  netAmountDisplay.className = net === 0 ? "" : net > 0 ? "positive" : "negative";
  
  // Destroy existing chart if it exists
  if (chart) {
    chart.destroy();
  }
  
  // Create new chart
  const ctx = document.getElementById('incomeExpensesChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Income',
          data: chartData.incomeData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Expenses',
          data: chartData.expensesData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += formatCurrency(context.parsed.y);
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          }
        },
        x: {
          ticks: {
            maxTicksLimit: 12,
            autoSkip: true,
          }
        }
      }
    }
  });
}

// Event listeners
timeRangeSelect.addEventListener('change', updateChart);

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
    
    updateChart();
  });
});

// Year and month selects
yearSelect.addEventListener('change', updateChart);
monthSelect.addEventListener('change', updateChart);

// Initialize year selector and render chart
populateYearSelect();
monthSelect.value = new Date().getMonth();
updateChart();
