const API_BASE_URL = '/api';
const IMPORT_NO_VALID_ROWS_MESSAGE = "No valid transactions found in the CSV file.";
const IMPORT_READ_ERROR_MESSAGE = "Could not import this CSV file.";
const TOAST_DURATION_MS = 3000;

function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const calendarGrid = document.getElementById("calendarGrid");
const transactionForm = document.getElementById("transactionForm");
const dateInput = document.getElementById("dateInput");
const dateHint = document.getElementById("dateHint");
const descriptionInput = document.getElementById("descriptionInput");
const descriptionHint = document.getElementById("descriptionHint");
const payeeInput = document.getElementById("payeeInput");
const notesInput = document.getElementById("notesInput");
const amountInput = document.getElementById("amountInput");
const amountHint = document.getElementById("amountHint");
const recurrenceInput = document.getElementById("recurrenceInput");
const transactionList = document.getElementById("transactionList");
const transactionListTitle = document.getElementById("transactionListTitle");
const monthChangeDisplay = document.getElementById("monthChangeDisplay");
const endBalanceDisplay = document.getElementById("endBalanceDisplay");
const startingBalanceDisplay = document.getElementById("startingBalanceDisplay");
const exportCsvButton = document.getElementById("exportCsv");
const importCsvInput = document.getElementById("importCsv");
const importModeSelect = document.getElementById("importMode");
const importPreviewModal = document.getElementById("importPreviewModal");
const importPreviewTitle = document.getElementById("importPreviewTitle");
const previewRowsRead = document.getElementById("previewRowsRead");
const previewValidRows = document.getElementById("previewValidRows");
const previewWillImport = document.getElementById("previewWillImport");
const previewDuplicates = document.getElementById("previewDuplicates");
const previewInvalid = document.getElementById("previewInvalid");
const previewCancel = document.getElementById("previewCancel");
const previewConfirm = document.getElementById("previewConfirm");
const clearAllModal = document.getElementById("clearAllModal");
const clearAllCancel = document.getElementById("clearAllCancel");
const clearAllConfirm = document.getElementById("clearAllConfirm");
const editTransactionModal = document.getElementById("editTransactionModal");
const editTransactionForm = document.getElementById("editTransactionForm");
const editDateInput = document.getElementById("editDateInput");
const editPayeeInput = document.getElementById("editPayeeInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editAmountInput = document.getElementById("editAmountInput");
const editRecurrenceInput = document.getElementById("editRecurrenceInput");
const editNotesInput = document.getElementById("editNotesInput");
const editCancel = document.getElementById("editCancel");
const exportDateRangeModal = document.getElementById("exportDateRangeModal");
const exportDateRangeForm = document.getElementById("exportDateRangeForm");
const exportFromDate = document.getElementById("exportFromDate");
const exportToDate = document.getElementById("exportToDate");
const exportTransactionCount = document.getElementById("exportTransactionCount");
const exportCancel = document.getElementById("exportCancel");
const accountsList = document.getElementById("accountsList");
const addAccountBtn = document.getElementById("addAccountBtn");
const isTransferInput = document.getElementById("isTransferInput");
const transferAccountInput = document.getElementById("transferAccountInput");
const transferAccountLabel = document.getElementById("transferAccountLabel");
const editIsTransferInput = document.getElementById("editIsTransferInput");
const editTransferAccountInput = document.getElementById("editTransferAccountInput");
const editTransferAccountLabel = document.getElementById("editTransferAccountLabel");
const calculatorDisplay = document.getElementById("calculatorDisplay");
const calculatorKeys = document.getElementById("calculatorKeys");
const calculatorToggle = document.getElementById("calculatorToggle");
const calculatorBody = document.getElementById("calculatorBody");

// Account management
let accounts = [];
let activeAccountId = null;
let transactions = [];
let payeeHistory = [];
let descriptionHistory = [];
const HISTORY_MAX_ITEMS = 100;

// Initialize async
let currentMonth = new Date();
currentMonth.setDate(1);
let selectedDateKey = toDateKey(new Date());
let editingTransactionId = null;

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  render();
});

if (addAccountBtn) {
  addAccountBtn.addEventListener("click", addAccount);
}

if (isTransferInput) {
  isTransferInput.addEventListener("change", () => {
    if (isTransferInput.checked) {
      updateTransferAccountOptions(transferAccountInput, transferAccountLabel);
      transferAccountLabel.classList.remove("hidden");
    } else {
      transferAccountLabel.classList.add("hidden");
    }
  });
}

if (editIsTransferInput) {
  editIsTransferInput.addEventListener("change", () => {
    if (editIsTransferInput.checked) {
      updateTransferAccountOptions(editTransferAccountInput, editTransferAccountLabel);
      editTransferAccountLabel.classList.remove("hidden");
    } else {
      editTransferAccountLabel.classList.add("hidden");
    }
  });
}

if (calculatorToggle && calculatorBody) {
  calculatorToggle.addEventListener("click", () => {
    const isHidden = calculatorBody.classList.toggle("hidden");
    calculatorToggle.setAttribute("aria-expanded", (!isHidden).toString());
  });
}

if (calculatorKeys && calculatorDisplay) {
  let calculatorExpression = calculatorDisplay.value || "0";

  const updateCalculatorDisplay = (value) => {
    calculatorDisplay.value = value;
  };

  const sanitizeExpression = (value) => {
    if (!/^[0-9+\-*/().\s]+$/.test(value)) {
      return null;
    }
    return value.replace(/\s+/g, "");
  };

  const evaluateExpression = (value) => {
    const sanitized = sanitizeExpression(value);
    if (sanitized === null || sanitized.length === 0) {
      return "Error";
    }
    try {
      const result = Function(`"use strict"; return (${sanitized});`)();
      if (!Number.isFinite(result)) {
        return "Error";
      }
      return String(result);
    } catch {
      return "Error";
    }
  };

  const appendValue = (value) => {
    if (calculatorExpression === "0" && /[0-9.]/.test(value)) {
      calculatorExpression = value === "." ? "0." : value;
    } else {
      calculatorExpression += value;
    }
    updateCalculatorDisplay(calculatorExpression);
  };

  const clearExpression = () => {
    calculatorExpression = "0";
    updateCalculatorDisplay(calculatorExpression);
  };

  const backspace = () => {
    if (calculatorExpression.length <= 1) {
      calculatorExpression = "0";
    } else {
      calculatorExpression = calculatorExpression.slice(0, -1);
    }
    updateCalculatorDisplay(calculatorExpression);
  };

  const handleEquals = () => {
    const result = evaluateExpression(calculatorExpression);
    calculatorExpression = result === "Error" ? "0" : result;
    updateCalculatorDisplay(result);
  };

  calculatorKeys.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute("data-action");
    const value = target.getAttribute("data-value");

    if (action === "clear") {
      clearExpression();
      return;
    }

    if (action === "backspace") {
      backspace();
      return;
    }

    if (action === "equals") {
      handleEquals();
      return;
    }

    if (value) {
      appendValue(value);
    }
  });
}

document.getElementById("yearSelect").addEventListener("change", () => {
  const year = parseInt(yearSelect.value);
  const month = currentMonth.getMonth();
  currentMonth = new Date(year, month, 1);
  render();
});

document.getElementById("monthSelect").addEventListener("change", () => {
  const year = currentMonth.getFullYear();
  const month = parseInt(monthSelect.value);
  currentMonth = new Date(year, month, 1);
  render();
});

descriptionInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  if (!descriptionInput.value.trim()) {
    setDescriptionValidationHint({ showRequiredWhenEmpty: true });
    descriptionInput.focus();
    return;
  }

  setDescriptionValidationHint();
  amountInput.focus();
});

descriptionInput.addEventListener("input", () => {
  setDescriptionValidationHint();
});

descriptionInput.addEventListener("blur", () => {
  setDescriptionValidationHint({ showRequiredWhenEmpty: true });
});

amountInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  if (isTransactionFormValid()) {
    setAmountValidationHint();
    transactionForm.requestSubmit();
    return;
  }

  setAmountValidationHint({ showRequiredWhenEmpty: true });
  amountInput.focus();
});

amountInput.addEventListener("input", () => {
  setAmountValidationHint();
});

amountInput.addEventListener("blur", () => {
  setAmountValidationHint({ showRequiredWhenEmpty: true });
});

dateInput.addEventListener("change", () => {
  if (!dateInput.value) {
    setDateValidationHint({ showRequiredWhenEmpty: true });
    return;
  }

  selectedDateKey = dateInput.value;
  setDateValidationHint();
  render();
});

dateInput.addEventListener("blur", () => {
  setDateValidationHint({ showRequiredWhenEmpty: true });
});

document.getElementById("clearAll").addEventListener("click", async () => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Filter to check if there are any transactions in current month
  const hasTransactionsInMonth = transactions.some(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    return tDate.getFullYear() === year && tDate.getMonth() === month;
  });
  
  if (!hasTransactionsInMonth) {
    return;
  }
  const confirmed = await openClearAllConfirm();
  if (!confirmed) {
    return;
  }
  
  // Keep only transactions NOT in the current month
  const remainingTransactions = transactions.filter(t => {
    const tDate = new Date(t.date + 'T00:00:00');
    return !(tDate.getFullYear() === year && tDate.getMonth() === month);
  });
  
  commitTransactions(remainingTransactions);
});

exportCsvButton.addEventListener("click", () => {
  // Reset modal fields
  exportFromDate.value = "";
  exportToDate.value = "";
  updateExportTransactionCount();
  
  // Show modal
  exportDateRangeModal.removeAttribute("hidden");
});

exportCancel.addEventListener("click", () => {
  exportDateRangeModal.setAttribute("hidden", "");
});

exportDateRangeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  
  // Get date range values
  const fromDate = exportFromDate.value ? new Date(exportFromDate.value) : null;
  const toDate = exportToDate.value ? new Date(exportToDate.value) : null;
  
  // Filter transactions by date range
  let filteredTransactions = transactions;
  if (fromDate) {
    filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= fromDate);
  }
  if (toDate) {
    // Set to end of day to include the full date
    const toDateEndOfDay = new Date(toDate);
    toDateEndOfDay.setHours(23, 59, 59, 999);
    filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= toDateEndOfDay);
  }
  
  // Generate and download CSV
  const csv = toCsv(filteredTransactions);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  
  // Create filename with date range
  let filename = "finance-transactions";
  if (exportFromDate.value) {
    filename += `-from-${exportFromDate.value}`;
  }
  if (exportToDate.value) {
    filename += `-to-${exportToDate.value}`;
  }
  const stamp = new Date().toISOString().slice(0, 10);
  filename += `-export-${stamp}.csv`;
  
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  
  // Close modal
  exportDateRangeModal.setAttribute("hidden", "");
});

// Update transaction count when date range changes
exportFromDate.addEventListener("change", updateExportTransactionCount);
exportToDate.addEventListener("change", updateExportTransactionCount);

// Close modal on backdrop click
exportDateRangeModal.addEventListener("click", (event) => {
  if (event.target === exportDateRangeModal) {
    exportDateRangeModal.setAttribute("hidden", "");
  }
});

// Close modal on Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !exportDateRangeModal.hasAttribute("hidden")) {
    exportDateRangeModal.setAttribute("hidden", "");
  }
});

function updateExportTransactionCount() {
  const fromDate = exportFromDate.value ? new Date(exportFromDate.value) : null;
  const toDate = exportToDate.value ? new Date(exportToDate.value) : null;
  
  let count = transactions.length;
  if (fromDate || toDate) {
    count = transactions.filter(t => {
      const tDate = new Date(t.date);
      if (fromDate && tDate < fromDate) return false;
      if (toDate) {
        const toDateEndOfDay = new Date(toDate);
        toDateEndOfDay.setHours(23, 59, 59, 999);
        if (tDate > toDateEndOfDay) return false;
      }
      return true;
    }).length;
  }
  
  exportTransactionCount.textContent = count === transactions.length ? "All" : count;
}

importCsvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const content = await file.text();
    const parsedImport = parseCsv(content);
    if (!parsedImport.validRows.length) {
      showToast({ message: IMPORT_NO_VALID_ROWS_MESSAGE, type: "warning" });
      resetImportFileInput();
      return;
    }

    const importMode = importModeSelect.value;
    const preview = analyzeImport({
      existing: transactions,
      incoming: parsedImport.validRows,
      importMode,
      invalidRows: parsedImport.invalidRows,
      totalRows: parsedImport.totalRows,
    });

    const shouldProceed = await openImportPreview(preview);

    if (!shouldProceed) {
      resetImportFileInput();
      return;
    }

    if (importMode === "replace") {
      const dedupedImported = dedupeTransactions(parsedImport.validRows);
      commitTransactions(dedupedImported);
    } else {
      const mergedTransactions = mergeTransactions(transactions, parsedImport.validRows);
      commitTransactions(mergedTransactions);
    }

    showToast({ message: buildImportSummaryText({ importMode, preview }), type: "success" });
  } catch {
    showToast({ message: IMPORT_READ_ERROR_MESSAGE, type: "error" });
  } finally {
    resetImportFileInput();
  }
});

transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const date = dateInput.value;
  const description = descriptionInput.value.trim();
  const payee = payeeInput.value.trim();
  const notes = notesInput.value.trim();
  const amount = Number(amountInput.value);
  const recurrence = recurrenceInput.value;
  const isTransfer = isTransferInput.checked;
  const transferToAccountId = transferAccountInput.value;

  if (!date || !description || Number.isNaN(amount) || amount === 0) {
    setDateValidationHint({ showRequiredWhenEmpty: true });
    setDescriptionValidationHint({ showRequiredWhenEmpty: true });
    setAmountValidationHint({ showRequiredWhenEmpty: true });
    return;
  }

  if (isTransfer && !transferToAccountId) {
    alert("Please select an account to transfer to.");
    return;
  }

  const newTransactionId = generateUuid();
  const linkedTransactionId = isTransfer ? generateUuid() : null;

  const newTransaction = {
    id: newTransactionId,
    date,
    description,
    payee,
    notes,
    amount,
    recurrence,
    linkedTransactionId,
    linkedAccountId: isTransfer ? transferToAccountId : null,
  };

  const nextTransactions = [...transactions, newTransaction];

  // If it's a transfer, create the linked transaction in the other account
  if (isTransfer && transferToAccountId) {
    const targetAccount = accounts.find(acc => acc.id === transferToAccountId);
    if (targetAccount) {
      const linkedTransaction = {
        id: linkedTransactionId,
        date,
        description,
        payee,
        notes,
        amount: -amount, // Opposite amount
        recurrence,
        linkedTransactionId: newTransactionId,
        linkedAccountId: activeAccountId,
      };
      
      targetAccount.transactions = targetAccount.transactions || [];
      targetAccount.transactions.push(linkedTransaction);
      saveAccounts();
    }
  }

  // Track payee and description in history
  if (payee) payeeHistory = addToHistory(payee, payeeHistory);
  if (description) descriptionHistory = addToHistory(description, descriptionHistory);
  saveEntryHistories();

  commitTransactions(nextTransactions);
  transactionForm.reset();
  recurrenceInput.value = "one-time";
  dateInput.value = selectedDateKey;
  isTransferInput.checked = false;
  transferAccountLabel.classList.add("hidden");
  updateTransferAccountOptions();
  setDateValidationHint();
  setDescriptionValidationHint();
  setAmountValidationHint();
  descriptionInput.focus();
});

function loadTransactions() {
  const activeAccount = accounts.find(acc => acc.id === activeAccountId);
  if (!activeAccount) {
    return [];
  }

  try {
    const parsed = activeAccount.transactions || [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && entry.date && entry.description && Number.isFinite(Number(entry.amount)))
      .map((entry) => ({
        id: entry.id || generateUuid(),
        date: entry.date,
        payee: entry.payee || entry.vendor || '',
        description: entry.description,
        notes: entry.notes || '',
        amount: Number(entry.amount),
        recurrence: entry.recurrence || 'one-time',
        linkedTransactionId: entry.linkedTransactionId || null,
        linkedAccountId: entry.linkedAccountId || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

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

async function saveAccountsToAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accounts)
    });
    if (!response.ok) {
      throw new Error('Failed to save accounts');
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving accounts:', error);
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

async function saveActiveAccountIdToAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/active-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeAccountId })
    });
    if (!response.ok) {
      throw new Error('Failed to save active account');
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving active account:', error);
  }
}

async function persistTransactionsToAPI() {
  const activeAccount = accounts.find(acc => acc.id === activeAccountId);
  if (activeAccount) {
    activeAccount.transactions = transactions;
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: activeAccountId, transactions })
      });
      if (!response.ok) {
        throw new Error('Failed to save transactions');
      }
      await saveAccountsToAPI();
    } catch (error) {
      console.error('Error persisting transactions:', error);
    }
  }
}

// Legacy storage functions for backwards compatibility
function migrateOldTransactions() {
  return [];
}

// Synchronous wrapper functions that update in-memory state
function saveAccounts() {
  // Just mark dirty, actual save happens in persistChanges()
  markDirty();
}

function saveActiveAccountId() {
  // Just mark dirty, actual save happens in persistChanges()
  markDirty();
}

function persistTransactions() {
  // Just mark dirty, actual save happens in persistChanges()
  markDirty();
}

async function loadEntryHistories() {
  try {
    if (!activeAccountId) return;
    const response = await fetch(`${API_BASE_URL}/entry-histories/${activeAccountId}`);
    if (!response.ok) throw new Error('Failed to load entry histories');
    const data = await response.json();
    payeeHistory = data.payees || [];
    descriptionHistory = data.descriptions || [];
  } catch (error) {
    console.error('Error loading entry histories:', error);
    payeeHistory = [];
    descriptionHistory = [];
  }
}

async function saveEntryHistories() {
  try {
    if (!activeAccountId) return;
    const response = await fetch(`${API_BASE_URL}/entry-histories/${activeAccountId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payees: payeeHistory, descriptions: descriptionHistory })
    });
    if (!response.ok) throw new Error('Failed to save entry histories');
  } catch (error) {
    console.error('Error saving entry histories:', error);
  }
}

function addToHistory(value, historyArray, maxItems = HISTORY_MAX_ITEMS) {
  if (!value || !value.trim()) return historyArray;
  const trimmed = value.trim();
  // Remove if already exists, then add to front
  const filtered = historyArray.filter(item => item !== trimmed);
  return [trimmed, ...filtered].slice(0, maxItems);
}

function renderSuggestionsForInput(inputElement, historyArray) {
  const dataListId = inputElement.getAttribute('list');
  if (!dataListId) return;
  
  const dataList = document.getElementById(dataListId);
  if (!dataList) return;
  
  const value = inputElement.value.trim().toLowerCase();
  const filtered = historyArray.filter(item => 
    !value || item.toLowerCase().includes(value)
  ).slice(0, 10);
  
  dataList.innerHTML = filtered
    .map(item => `<option value="${item}"></option>`)
    .join('');
}

// Setup input history and suggestions
if (payeeInput) {
  // Create datalist if it doesn't exist
  if (!document.getElementById('payeeSuggestions')) {
    const dataList = document.createElement('datalist');
    dataList.id = 'payeeSuggestions';
    document.body.appendChild(dataList);
    payeeInput.setAttribute('list', 'payeeSuggestions');
  }
  
  payeeInput.addEventListener('input', () => {
    renderSuggestionsForInput(payeeInput, payeeHistory);
  });
}

if (descriptionInput) {
  // Create datalist if it doesn't exist
  if (!document.getElementById('descriptionSuggestions')) {
    const dataList = document.createElement('datalist');
    dataList.id = 'descriptionSuggestions';
    document.body.appendChild(dataList);
    descriptionInput.setAttribute('list', 'descriptionSuggestions');
  }
  
  descriptionInput.addEventListener('input', () => {
    renderSuggestionsForInput(descriptionInput, descriptionHistory);
  });
}

if (editPayeeInput) {
  if (!document.getElementById('editPayeeSuggestions')) {
    const dataList = document.createElement('datalist');
    dataList.id = 'editPayeeSuggestions';
    document.body.appendChild(dataList);
    editPayeeInput.setAttribute('list', 'editPayeeSuggestions');
  }
  
  editPayeeInput.addEventListener('input', () => {
    renderSuggestionsForInput(editPayeeInput, payeeHistory);
  });
}

if (editDescriptionInput) {
  if (!document.getElementById('editDescriptionSuggestions')) {
    const dataList = document.createElement('datalist');
    dataList.id = 'editDescriptionSuggestions';
    document.body.appendChild(dataList);
    editDescriptionInput.setAttribute('list', 'editDescriptionSuggestions');
  }
  
  editDescriptionInput.addEventListener('input', () => {
    renderSuggestionsForInput(editDescriptionInput, descriptionHistory);
  });
}


// Dirty flag for debounced persistence
let isDirty = false;
let persistTimer = null;

function markDirty() {
  isDirty = true;
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  // Persist changes 500ms after last change
  persistTimer = setTimeout(() => {
    persistChanges();
  }, 500);
}

async function persistChanges() {
  if (!isDirty) return;
  
  try {
    // Update active account transactions in memory
    const activeAccount = accounts.find(acc => acc.id === activeAccountId);
    if (activeAccount) {
      activeAccount.transactions = transactions;
    }
    
    // Save all data to API
    await Promise.all([
      saveAccountsToAPI(),
      saveActiveAccountIdToAPI()
    ]);
    
    isDirty = false;
  } catch (error) {
    console.error('Error persisting changes:', error);
    // Will retry on next change
  }
}

function commitTransactions(nextTransactions) {
  transactions = sortTransactions(nextTransactions);
  persistTransactions();
  render();
}

function toCsv(rows) {
  const header = ["date", "payee", "description", "notes", "amount", "recurrence"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const escapedPayee = (row.payee || "").replace(/"/g, '""');
    const escapedDescription = row.description.replace(/"/g, '""');
    const escapedNotes = (row.notes || "").replace(/"/g, '""');
    const recurrence = row.recurrence || "one-time";
    lines.push(`${row.date},"${escapedPayee}","${escapedDescription}","${escapedNotes}",${row.amount},${recurrence}`);
  }
  return `${lines.join("\n")}\n`;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      validRows: [],
      invalidRows: 0,
      totalRows: 0,
    };
  }

  const result = [];
  let invalidRows = 0;
  
  // Check if first line is a header and detect format
  const hasHeader = /^date\s*,/i.test(lines[0]);
  const headerLine = hasHeader ? lines[0].toLowerCase() : "";
  
  // Determine column order: check if payee/vendor comes before description
  const payeeBeforeDesc = (headerLine.indexOf("payee") > 0 && headerLine.indexOf("payee") < headerLine.indexOf("description")) ||
                          (headerLine.indexOf("vendor") > 0 && headerLine.indexOf("vendor") < headerLine.indexOf("description"));
  const hasNotesColumn = /notes/i.test(headerLine);
  const hasPayeeColumn = /payee|vendor/i.test(headerLine);
  
  const startIndex = hasHeader ? 1 : 0;
  const totalRows = Math.max(lines.length - startIndex, 0);

  for (let index = startIndex; index < lines.length; index++) {
    const values = splitCsvLine(lines[index]);
    if (values.length < 3) {
      invalidRows++;
      continue;
    }

    let date, description, payee, notes, amount, recurrence;
    
    if (payeeBeforeDesc && hasNotesColumn) {
      // New format: date, payee, description, notes, amount, recurrence
      date = values[0].trim();
      payee = values.length > 1 ? values[1].trim() : "";
      description = values.length > 2 ? values[2].trim() : "";
      notes = values.length > 3 ? values[3].trim() : "";
      amount = Number(values.length > 4 ? values[4] : 0);
      recurrence = values.length > 5 ? values[5].trim() : "one-time";
    } else if (hasNotesColumn && !payeeBeforeDesc) {
      // Format: date, description, payee, notes, amount, recurrence
      date = values[0].trim();
      description = values[1].trim();
      payee = values.length > 2 ? values[2].trim() : "";
      notes = values.length > 3 ? values[3].trim() : "";
      amount = Number(values.length > 4 ? values[4] : 0);
      recurrence = values.length > 5 ? values[5].trim() : "one-time";
    } else if (hasPayeeColumn && !payeeBeforeDesc) {
      // Previous format: date, description, payee, amount, recurrence
      date = values[0].trim();
      description = values[1].trim();
      payee = values.length > 2 ? values[2].trim() : "";
      notes = "";
      amount = Number(values.length > 3 ? values[3] : 0);
      recurrence = values.length > 4 ? values[4].trim() : "one-time";
    } else {
      // Old format: date, description, amount, recurrence (or just date, description, amount)
      date = values[0].trim();
      description = values[1].trim();
      payee = "";
      notes = "";
      amount = Number(values[2]);
      recurrence = values.length > 3 ? values[3].trim() : "one-time";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isFinite(amount) || amount === 0) {
      invalidRows++;
      continue;
    }

    result.push({
      id: generateUuid(),
      date,
      description,
      payee,
      notes,
      amount,
      recurrence: recurrence || "one-time",
    });
  }

  return {
    validRows: result,
    invalidRows,
    totalRows,
  };
}

function analyzeImport({ existing, incoming, importMode, invalidRows, totalRows }) {
  const existingKeys = new Set(existing.map(getTransactionDedupKey));
  const seenIncoming = new Set();
  let duplicateRows = 0;
  let newRows = 0;

  for (const row of incoming) {
    const key = getTransactionDedupKey(row);
    if (importMode === "merge") {
      if (existingKeys.has(key) || seenIncoming.has(key)) {
        duplicateRows++;
      } else {
        newRows++;
        seenIncoming.add(key);
      }
      continue;
    }

    if (seenIncoming.has(key)) {
      duplicateRows++;
    } else {
      newRows++;
      seenIncoming.add(key);
    }
  }

  return {
    importMode,
    totalRows,
    validRows: incoming.length,
    invalidRows,
    duplicateRows,
    newRows,
  };
}

function openImportPreview(preview) {
  importPreviewTitle.textContent = `Import Preview (${preview.importMode === "replace" ? "Replace" : "Merge"})`;
  previewRowsRead.textContent = String(preview.totalRows);
  previewValidRows.textContent = String(preview.validRows);
  previewWillImport.textContent = String(preview.newRows);
  previewDuplicates.textContent = String(preview.duplicateRows);
  previewInvalid.textContent = String(preview.invalidRows);

  return openConfirmationModal({
    modal: importPreviewModal,
    cancelButton: previewCancel,
    confirmButton: previewConfirm,
    focusButton: previewConfirm,
  });
}

function openClearAllConfirm() {
  return openConfirmationModal({
    modal: clearAllModal,
    cancelButton: clearAllCancel,
    confirmButton: clearAllConfirm,
    focusButton: clearAllConfirm,
  });
}

function openConfirmationModal({ modal, cancelButton, confirmButton, focusButton }) {
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    const closeModal = (result) => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.removeEventListener("click", onBackdropClick);
      document.removeEventListener("keydown", onKeyDown);
      cancelButton.removeEventListener("click", onCancelClick);
      confirmButton.removeEventListener("click", onConfirmClick);
      resolve(result);
    };

    const onCancelClick = () => closeModal(false);
    const onConfirmClick = () => closeModal(true);
    const onBackdropClick = (event) => {
      if (event.target === modal) {
        closeModal(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal(false);
      }
    };

    cancelButton.addEventListener("click", onCancelClick);
    confirmButton.addEventListener("click", onConfirmClick);
    modal.addEventListener("click", onBackdropClick);
    document.addEventListener("keydown", onKeyDown);
    focusButton.focus();
  });
}

function buildImportSummaryText({ importMode, preview }) {
  const actionText = importMode === "replace" ? "Replaced with" : "Imported";
  return `${actionText} ${preview.newRows} transaction(s). Skipped ${preview.duplicateRows} duplicate row(s) and ${preview.invalidRows} invalid row(s).`;
}

function resetImportFileInput() {
  importCsvInput.value = "";
}

function showToast({ message, type = "info" }) {
  const toastRoot = getOrCreateToastRoot();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  toastRoot.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, TOAST_DURATION_MS);
}

function getOrCreateToastRoot() {
  let root = document.getElementById("toastRoot");
  if (root) {
    return root;
  }

  root = document.createElement("div");
  root.id = "toastRoot";
  root.className = "toast-root";
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "true");
  document.body.appendChild(root);
  return root;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function mergeTransactions(existing, incoming) {
  const existingKeys = new Set(existing.map(getTransactionDedupKey));
  const merged = [...existing];

  for (const row of incoming) {
    const key = getTransactionDedupKey(row);
    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    merged.push(row);
  }

  return sortTransactions(merged);
}

function dedupeTransactions(items) {
  const seen = new Set();
  const deduped = [];

  for (const row of items) {
    const key = getTransactionDedupKey(row);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

function getTransactionDedupKey(transaction) {
  const normalizedDescription = transaction.description.trim().replace(/\s+/g, " ").toLowerCase();
  const cents = Math.round(transaction.amount * 100);
  return `${transaction.date}|${normalizedDescription}|${cents}`;
}

function sortTransactions(items) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.description !== b.description) {
      return a.description.localeCompare(b.description);
    }
    return a.amount - b.amount;
  });
  return sorted;
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

function getDailyTotalsMap() {
  const totals = new Map();
  
  // Get the current month's start and end dates for expansion
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // Expand one year before and one year after to capture recurring transactions
  const expandStart = new Date(monthStart);
  expandStart.setFullYear(expandStart.getFullYear() - 1);
  const expandEnd = new Date(monthEnd);
  expandEnd.setFullYear(expandEnd.getFullYear() + 1);
  
  const allTransactions = expandRecurringTransactions(expandStart, expandEnd);
  
  for (const item of allTransactions) {
    totals.set(item.date, (totals.get(item.date) || 0) + item.amount);
  }
  return totals;
}

function getBalanceBefore(dateKey) {
  // Expand transactions from way before to the target date
  const targetDate = new Date(dateKey + 'T00:00:00');
  const expandStart = new Date(targetDate);
  expandStart.setFullYear(expandStart.getFullYear() - 10);
  
  const allTransactions = expandRecurringTransactions(expandStart, targetDate);
  
  return allTransactions
    .filter((item) => item.date < dateKey)
    .reduce((sum, item) => sum + item.amount, 0);
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Sync selectors with current month
  yearSelect.value = year;
  monthSelect.value = month;

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startOffset = firstOfMonth.getDay();
  const totalDays = lastOfMonth.getDate();

  const gridStart = new Date(year, month, 1 - startOffset);
  const dailyTotals = getDailyTotalsMap();

  calendarGrid.innerHTML = "";

  const firstDayKey = toDateKey(firstOfMonth);
  let runningBalance = getBalanceBefore(firstDayKey);
  const startingBalance = runningBalance;
  let monthChange = 0;

  for (let cell = 0; cell < 42; cell++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + cell);
    const dateKey = toDateKey(date);
    const isCurrentMonth = date.getMonth() === month;
    const dayAmount = dailyTotals.get(dateKey) || 0;

    if (isCurrentMonth) {
      monthChange += dayAmount;
      runningBalance += dayAmount;
    }

    const day = document.createElement("article");
    day.className = `day${isCurrentMonth ? "" : " other-month"}`;

    if (isCurrentMonth) {
      day.classList.add("clickable-day");
      if (dateKey === selectedDateKey) {
        day.classList.add("selected-day");
      }
      day.tabIndex = 0;
      day.setAttribute("role", "button");
      day.setAttribute("aria-label", `Add transaction for ${dateKey}`);
      day.addEventListener("click", () => {
        selectCalendarDate(dateKey);
      });
      day.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCalendarDate(dateKey);
        }
      });
    }

    const dayNum = document.createElement("div");
    dayNum.className = "day-number";
    dayNum.textContent = String(date.getDate());

    const dailyTotal = document.createElement("div");
    dailyTotal.className = "daily-total";
    dailyTotal.textContent = `Day: ${formatCurrency(dayAmount)}`;
    if (dayAmount > 0) dailyTotal.classList.add("positive");
    if (dayAmount < 0) dailyTotal.classList.add("negative");

    const balanceTotal = document.createElement("div");
    balanceTotal.className = "balance-total";
    balanceTotal.textContent = `Balance: ${formatCurrency(isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount)}`;
    if ((isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount) > 0) balanceTotal.classList.add("positive");
    if ((isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount) < 0) balanceTotal.classList.add("negative");

    day.append(dayNum, dailyTotal, balanceTotal);
    calendarGrid.appendChild(day);
  }

  startingBalanceDisplay.textContent = formatCurrency(startingBalance);
  monthChangeDisplay.textContent = formatCurrency(monthChange);
  endBalanceDisplay.textContent = formatCurrency(startingBalance + monthChange);

  monthChangeDisplay.className = monthChange === 0 ? "" : monthChange > 0 ? "positive" : "negative";
  endBalanceDisplay.className = startingBalance + monthChange === 0 ? "" : startingBalance + monthChange > 0 ? "positive" : "negative";
}

function renderTransactions() {
  transactionList.innerHTML = "";
  
  if (selectedDateKey) {
    transactionListTitle.textContent = `Transactions - ${selectedDateKey}`;
  } else {
    transactionListTitle.textContent = "Transactions";
  }

  let dayItems = [];
  
  if (selectedDateKey) {
    // Get expanded transactions for a range around the selected date
    const selectedDate = new Date(selectedDateKey + 'T00:00:00');
    const expandStart = new Date(selectedDate);
    expandStart.setFullYear(expandStart.getFullYear() - 1);
    const expandEnd = new Date(selectedDate);
    expandEnd.setFullYear(expandEnd.getFullYear() + 1);
    
    const allTransactions = expandRecurringTransactions(expandStart, expandEnd);
    dayItems = allTransactions.filter((item) => item.date === selectedDateKey);
  }

  if (!dayItems.length) {
    const empty = document.createElement("li");
    empty.textContent = selectedDateKey 
      ? `No transactions for ${selectedDateKey}.`
      : "No transactions for this month yet.";
    transactionList.appendChild(empty);
    return;
  }

  for (const item of dayItems) {
    const row = document.createElement("li");

    const date = document.createElement("span");
    date.textContent = item.date;

    const payee = document.createElement("span");
    payee.textContent = item.payee || "—";
    payee.className = "payee";

    const recurrence = document.createElement("span");
    recurrence.textContent = item.recurrence && item.recurrence !== 'one-time' ? item.recurrence : "—";
    recurrence.className = "recurrence";

    const description = document.createElement("span");
    description.textContent = item.description + (item.isRecurring ? " (recurring)" : "");
    
    // Add linked indicator if transaction is linked to another account
    if (item.linkedTransactionId && item.linkedAccountId) {
      const linkedIndicator = document.createElement("span");
      linkedIndicator.className = "linked-indicator";
      linkedIndicator.textContent = getAccountNameById(item.linkedAccountId);
      linkedIndicator.title = `Linked to ${getAccountNameById(item.linkedAccountId)}`;
      description.appendChild(linkedIndicator);
    }

    const notes = document.createElement("span");
    notes.textContent = item.notes || "—";
    notes.className = "notes";

    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(item.amount);
    amount.className = item.amount >= 0 ? "positive" : "negative";

    // Get the ID to use for operations
    const idToUse = item.isRecurring ? item.originalId : item.id;
    
    // Edit button (only for non-recurring instances)
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-btn";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      openEditTransactionModal(idToUse);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-btn";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const txnToDelete = transactions.find(tx => tx.id === idToUse);
      
      // Delete linked transaction if exists
      if (txnToDelete && txnToDelete.linkedTransactionId && txnToDelete.linkedAccountId) {
        deleteLinkedTransaction(txnToDelete.linkedTransactionId, txnToDelete.linkedAccountId);
      }
      
      const remainingTransactions = transactions.filter((tx) => tx.id !== idToUse);
      commitTransactions(remainingTransactions);
    });

    row.append(date, payee, recurrence, description, notes, amount, editButton, removeButton);
    transactionList.appendChild(row);
  }
}

function render() {
  renderCalendar();
  renderTransactions();
  renderAccounts();
}

function renderAccounts() {
  if (!accountsList) return;
  
  accountsList.innerHTML = '';
  
  accounts.forEach(account => {
    const li = document.createElement('li');
    li.className = 'account-item';
    if (account.id === activeAccountId) {
      li.classList.add('active');
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'account-name';
    nameSpan.textContent = account.name;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-account-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete account';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteAccount(account.id);
    };
    
    li.appendChild(nameSpan);
    if (accounts.length > 1) {
      li.appendChild(deleteBtn);
    }
    
    li.onclick = () => switchAccount(account.id);
    
    accountsList.appendChild(li);
  });
  
  // Update transfer account dropdowns
  updateTransferAccountOptions(transferAccountInput, transferAccountLabel);
  updateTransferAccountOptions(editTransferAccountInput, editTransferAccountLabel);
}

function switchAccount(accountId) {
  if (activeAccountId === accountId) return;
  
  activeAccountId = accountId;
  saveActiveAccountId();
  transactions = loadTransactions();
  render();
}

function addAccount() {
  const accountNumber = accounts.length + 1;
  let accountName = `Account ${accountNumber}`;
  
  // Prompt for account name
  const customName = prompt('Enter account name:', accountName);
  if (customName === null) return; // User cancelled
  
  accountName = customName.trim() || accountName;
  
  const newAccount = {
    id: generateUuid(),
    name: accountName,
    transactions: []
  };
  
  accounts.push(newAccount);
  saveAccounts();
  switchAccount(newAccount.id);
}

function deleteAccount(accountId) {
  if (accounts.length === 1) {
    alert('Cannot delete the last account.');
    return;
  }
  
  const account = accounts.find(acc => acc.id === accountId);
  if (!account) return;
  
  if (!confirm(`Delete "${account.name}"? This will permanently delete all transactions in this account.`)) {
    return;
  }
  
  accounts = accounts.filter(acc => acc.id !== accountId);
  
  if (activeAccountId === accountId) {
    activeAccountId = accounts[0].id;
    saveActiveAccountId();
    transactions = loadTransactions();
  }
  
  saveAccounts();
  render();
}

function updateTransferAccountOptions(selectElement, labelElement) {
  if (!selectElement) return;
  
  selectElement.innerHTML = '';
  
  accounts.forEach(account => {
    if (account.id !== activeAccountId) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.name;
      selectElement.appendChild(option);
    }
  });
}

function deleteLinkedTransaction(linkedTransactionId, linkedAccountId) {
  const linkedAccount = accounts.find(acc => acc.id === linkedAccountId);
  if (linkedAccount) {
    linkedAccount.transactions = (linkedAccount.transactions || []).filter(
      t => t.id !== linkedTransactionId
    );
    saveAccounts();
  }
}

function updateLinkedTransaction(txn) {
  if (!txn.linkedTransactionId || !txn.linkedAccountId) return;
  
  const linkedAccount = accounts.find(acc => acc.id === txn.linkedAccountId);
  if (linkedAccount) {
    const linkedTxn = (linkedAccount.transactions || []).find(
      t => t.id === txn.linkedTransactionId
    );
    if (linkedTxn) {
      linkedTxn.date = txn.date;
      linkedTxn.description = txn.description;
      linkedTxn.payee = txn.payee;
      linkedTxn.notes = txn.notes;
      linkedTxn.amount = -txn.amount; // Keep opposite amount
      linkedTxn.recurrence = txn.recurrence;
      saveAccounts();
    }
  }
}

function getAccountNameById(accountId) {
  const account = accounts.find(acc => acc.id === accountId);
  return account ? account.name : 'Unknown Account';
}

function selectCalendarDate(dateKey) {
  selectedDateKey = dateKey;
  dateInput.value = dateKey;
  render();
  focusEntryFieldAfterDatePick();
}

function isTransactionFormValid() {
  const date = dateInput.value;
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  return Boolean(date) && Boolean(description) && Number.isFinite(amount) && amount !== 0;
}

function setDateValidationHint(options = {}) {
  const showRequiredWhenEmpty = Boolean(options.showRequiredWhenEmpty);
  const message = getDateValidationMessage({
    dateValue: dateInput.value,
    showRequiredWhenEmpty,
  });
  applyFieldValidationState({ input: dateInput, hint: dateHint, message });
}

function getDateValidationMessage({ dateValue, showRequiredWhenEmpty }) {
  if (!dateValue) {
    return showRequiredWhenEmpty ? "Date is required." : "";
  }
  return "";
}

function setDescriptionValidationHint(options = {}) {
  const showRequiredWhenEmpty = Boolean(options.showRequiredWhenEmpty);
  const message = getDescriptionValidationMessage({
    descriptionValue: descriptionInput.value,
    showRequiredWhenEmpty,
  });
  applyFieldValidationState({ input: descriptionInput, hint: descriptionHint, message });
}

function getDescriptionValidationMessage({ descriptionValue, showRequiredWhenEmpty }) {
  if (!descriptionValue.trim()) {
    return showRequiredWhenEmpty ? "Description is required." : "";
  }
  return "";
}

function setAmountValidationHint(options = {}) {
  const showRequiredWhenEmpty = Boolean(options.showRequiredWhenEmpty);
  const message = getAmountValidationMessage({
    rawAmountValue: amountInput.value,
    showRequiredWhenEmpty,
  });
  applyFieldValidationState({ input: amountInput, hint: amountHint, message });
}

function getAmountValidationMessage({ rawAmountValue, showRequiredWhenEmpty }) {
  if (!rawAmountValue) {
    return showRequiredWhenEmpty ? "Amount is required." : "";
  }

  const parsedAmount = Number(rawAmountValue);
  if (!Number.isFinite(parsedAmount)) {
    return "Enter a valid number.";
  }

  if (parsedAmount === 0) {
    return "Amount cannot be zero.";
  }

  return "";
}

function applyFieldValidationState({ input, hint, message }) {
  hint.textContent = message;
  hint.classList.toggle("visible", Boolean(message));
  input.classList.toggle("input-invalid", Boolean(message));
}

function populateYearSelect() {
  const currentYear = new Date().getFullYear();
  const years = new Set();
  
  // Add years from current - 5 to current + 3
  for (let i = currentYear - 5; i <= currentYear + 3; i++) {
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

function openEditTransactionModal(transactionId) {
  editingTransactionId = transactionId;
  
  // Find the transaction to edit
  const txn = transactions.find(t => t.id === transactionId);
  if (!txn) return;
  
  // Populate form fields
  editDateInput.value = txn.date;
  editPayeeInput.value = txn.payee || '';
  editDescriptionInput.value = txn.description || '';
  editAmountInput.value = txn.amount;
  editRecurrenceInput.value = txn.recurrence || 'one-time';
  editNotesInput.value = txn.notes || '';
  
  // Handle transfer fields
  const isLinked = Boolean(txn.linkedTransactionId && txn.linkedAccountId);
  editIsTransferInput.checked = isLinked;
  if (isLinked) {
    updateTransferAccountOptions(editTransferAccountInput, editTransferAccountLabel);
    editTransferAccountInput.value = txn.linkedAccountId;
    editTransferAccountLabel.classList.remove('hidden');
  } else {
    editTransferAccountLabel.classList.add('hidden');
  }
  
  editTransactionModal.hidden = false;
  editTransactionModal.setAttribute('aria-hidden', 'false');
  editDateInput.focus();
}

function closeEditTransactionModal() {
  editingTransactionId = null;
  editTransactionModal.hidden = true;
  editTransactionModal.setAttribute('aria-hidden', 'true');
}

editCancel.addEventListener("click", closeEditTransactionModal);

editTransactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  
  if (!editingTransactionId) return;
  
  const txn = transactions.find(t => t.id === editingTransactionId);
  if (!txn) return;
  
  const wasLinked = Boolean(txn.linkedTransactionId && txn.linkedAccountId);
  const isTransfer = editIsTransferInput.checked;
  const transferToAccountId = editTransferAccountInput.value;
  
  // Handle unlinking
  if (wasLinked && !isTransfer) {
    deleteLinkedTransaction(txn.linkedTransactionId, txn.linkedAccountId);
    txn.linkedTransactionId = null;
    txn.linkedAccountId = null;
  }
  
  // Handle new linking
  if (!wasLinked && isTransfer) {
    if (!transferToAccountId) {
      alert("Please select an account to transfer to.");
      return;
    }
    const linkedId = generateUuid();
    txn.linkedTransactionId = linkedId;
    txn.linkedAccountId = transferToAccountId;
    
    const targetAccount = accounts.find(acc => acc.id === transferToAccountId);
    if (targetAccount) {
      const linkedTransaction = {
        id: linkedId,
        date: editDateInput.value,
        description: editDescriptionInput.value.trim(),
        payee: editPayeeInput.value.trim(),
        notes: editNotesInput.value.trim(),
        amount: -Number(editAmountInput.value),
        recurrence: editRecurrenceInput.value,
        linkedTransactionId: txn.id,
        linkedAccountId: activeAccountId,
      };
      targetAccount.transactions = targetAccount.transactions || [];
      targetAccount.transactions.push(linkedTransaction);
      saveAccounts();
    }
  }
  
  // Handle change in linked account
  if (wasLinked && isTransfer && txn.linkedAccountId !== transferToAccountId) {
    deleteLinkedTransaction(txn.linkedTransactionId, txn.linkedAccountId);
    
    const linkedId = generateUuid();
    txn.linkedTransactionId = linkedId;
    txn.linkedAccountId = transferToAccountId;
    
    const targetAccount = accounts.find(acc => acc.id === transferToAccountId);
    if (targetAccount) {
      const linkedTransaction = {
        id: linkedId,
        date: editDateInput.value,
        description: editDescriptionInput.value.trim(),
        payee: editPayeeInput.value.trim(),
        notes: editNotesInput.value.trim(),
        amount: -Number(editAmountInput.value),
        recurrence: editRecurrenceInput.value,
        linkedTransactionId: txn.id,
        linkedAccountId: activeAccountId,
      };
      targetAccount.transactions = targetAccount.transactions || [];
      targetAccount.transactions.push(linkedTransaction);
      saveAccounts();
    }
  }
  
  // Update transaction properties
  txn.date = editDateInput.value;
  txn.payee = editPayeeInput.value.trim();
  txn.description = editDescriptionInput.value.trim();
  txn.amount = Number(editAmountInput.value);
  txn.recurrence = editRecurrenceInput.value;
  txn.notes = editNotesInput.value.trim();
  
  // Track payee and description in history
  if (txn.payee) payeeHistory = addToHistory(txn.payee, payeeHistory);
  if (txn.description) descriptionHistory = addToHistory(txn.description, descriptionHistory);
  saveEntryHistories();
  
  // Update linked transaction if it exists
  if (txn.linkedTransactionId && txn.linkedAccountId) {
    updateLinkedTransaction(txn);
  }
  
  commitTransactions(transactions);
  closeEditTransactionModal();
  showToast({ message: "Transaction updated successfully.", type: "success" });
});

// Initialize
// Initialize
populateYearSelect();
yearSelect.value = currentMonth.getFullYear();
monthSelect.value = currentMonth.getMonth();

function focusEntryFieldAfterDatePick() {
  if (descriptionInput.value.trim()) {
    amountInput.focus();
    return;
  }

  descriptionInput.focus();
}

async function initialize() {
  try {
    // Load accounts from API
    accounts = await loadAccountsFromAPI();
    
    // Load active account ID
    activeAccountId = await loadActiveAccountIdFromAPI();
    
    // Initialize default account if none exists
    if (accounts.length === 0) {
      const defaultAccount = {
        id: generateUuid(),
        name: "Main Account",
        transactions: []
      };
      accounts = [defaultAccount];
      activeAccountId = defaultAccount.id;
      await saveAccountsToAPI();
      await saveActiveAccountIdToAPI();
    }
    
    // Ensure active account is valid
    if (!accounts.find(acc => acc.id === activeAccountId)) {
      activeAccountId = accounts[0]?.id || null;
      await saveActiveAccountIdToAPI();
    }
    
    // Load transactions and entry histories for active account
    transactions = loadTransactions();
    await loadEntryHistories();
    
    // Initialize UI
    if (dateInput) dateInput.value = selectedDateKey;
    if (transferAccountInput) updateTransferAccountOptions(transferAccountInput, transferAccountLabel);
    if (editTransferAccountInput) updateTransferAccountOptions(editTransferAccountInput, editTransferAccountLabel);
    
    render();
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast({ message: 'Failed to load data. Please refresh the page.', type: 'error' });
  }
}

// Start initialization
initialize();
