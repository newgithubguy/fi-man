const API_BASE_URL = '/api';

const timeRangeSelect = document.getElementById("timeRange");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
const timeRangeControls = document.getElementById("timeRangeControls");
const monthSelectorControls = document.getElementById("monthSelectorControls");
const chartTypeSelect = document.getElementById("chartType");
const totalIncomeDisplay = document.getElementById("totalIncome");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const netAmountDisplay = document.getElementById("netAmount");
const refreshDataBtn = document.getElementById("refreshDataBtn");

let chart = null;
let accounts = [];
let activeAccountId = null;
let transactions = [];
let viewMode = "timeRange";

async function loadAccountsFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to load accounts (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

async function loadActiveAccountIdFromAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/active-account`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to load active account (${response.status})`);
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

function navigateToCalendarDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return;
  }

  window.location.href = `index.html?date=${encodeURIComponent(dateKey)}`;
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
  
  const chartType = chartTypeSelect?.value || 'line';
  const chartCanvas = document.getElementById('incomeExpensesChart');
  const ctx = chartCanvas?.getContext('2d');
  if (!ctx) {
    console.error('Graph canvas is unavailable.');
    return;
  }

  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#dea94a';
  const accentStrong = css.getPropertyValue('--accent-strong').trim() || '#c79031';
  const good = css.getPropertyValue('--good').trim() || '#3d876b';
  const bad = css.getPropertyValue('--bad').trim() || '#a63e36';
  const text = css.getPropertyValue('--text').trim() || '#183038';
  const border = css.getPropertyValue('--border').trim() || '#d9c7a4';
  const isPie = chartType === 'pie';
  const datasets = isPie
    ? [{
        data: [chartData.totalIncome, chartData.totalExpenses],
        backgroundColor: [good, bad],
        borderColor: [accentStrong, bad],
        borderWidth: 1,
      }]
    : [
        {
          label: 'Income',
          data: chartData.incomeData,
          borderColor: good,
          backgroundColor: chartType === 'line' ? 'rgba(61, 135, 107, 0.18)' : 'rgba(61, 135, 107, 0.72)',
          borderWidth: 2,
          tension: 0.35,
          fill: chartType === 'line',
        },
        {
          label: 'Expenses',
          data: chartData.expensesData,
          borderColor: bad,
          backgroundColor: chartType === 'line' ? 'rgba(166, 62, 54, 0.16)' : 'rgba(166, 62, 54, 0.7)',
          borderWidth: 2,
          tension: 0.35,
          fill: chartType === 'line',
        }
      ];

  chart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: isPie ? ['Income', 'Expenses'] : chartData.labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, _elements, chartInstance) => {
        if (isPie) {
          return;
        }

        const points = chartInstance.getElementsAtEventForMode(
          event,
          'nearest',
          { intersect: false },
          true,
        );

        if (!points.length) {
          return;
        }

        const pointIndex = points[0].index;
        const selectedDate = chartData.labels[pointIndex];
        navigateToCalendarDate(selectedDate);
      },
      interaction: isPie ? undefined : {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: text,
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || context.label || '';
              const value = isPie ? context.parsed : context.parsed.y;
              return `${label}: ${formatCurrency(value)}`;
            }
          }
        }
      },
      scales: isPie ? undefined : {
        y: {
          beginAtZero: true,
          grid: {
            color: border,
          },
          ticks: {
            color: text,
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          }
        },
        x: {
          grid: {
            color: 'rgba(217, 199, 164, 0.45)',
          },
          ticks: {
            color: text,
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
      timeRangeControls.classList.remove('hidden');
      monthSelectorControls.classList.add('hidden');
    } else {
      timeRangeControls.classList.add('hidden');
      monthSelectorControls.classList.remove('hidden');
    }
    
    updateChart();
  });
});

// Year and month selects
yearSelect.addEventListener('change', updateChart);
monthSelect.addEventListener('change', updateChart);

if (chartTypeSelect) {
  chartTypeSelect.addEventListener('change', updateChart);
}

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

// Initialize year selector and render chart
async function initialize() {
  try {
    accounts = await loadAccountsFromAPI();
    activeAccountId = await loadActiveAccountIdFromAPI();
    transactions = selectActiveAccountTransactions();
    populateYearSelect();
    monthSelect.value = new Date().getMonth();
    updateChart();
  } catch (error) {
    console.error('Error initializing graph data:', error);
  }
}

// Reload data when page becomes visible (e.g., when returning from calendar page)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    initialize();
  }
});

initialize();
