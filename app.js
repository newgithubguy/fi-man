const STORAGE_KEY = "finance-calendar-transactions";
const ACCOUNTS_STORAGE_KEY = "finance-calendar-accounts";
const ACTIVE_ACCOUNT_KEY = "finance-calendar-active-account";
const PAYEE_HISTORY_KEY = "finance-calendar-payee-history";
const DESCRIPTION_HISTORY_KEY = "finance-calendar-description-history";
const ENTRY_HISTORY_MAX_ITEMS = 100;
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

function loadEntryHistory(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => typeof value === "string" ? value.trim() : "")
      .filter(Boolean)
      .slice(0, ENTRY_HISTORY_MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveEntryHistory(storageKey, entries) {
  localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, ENTRY_HISTORY_MAX_ITEMS)));
}

function prependUniqueEntry(entries, value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return entries;
  }

  const lowered = trimmed.toLowerCase();
  const deduped = entries.filter((entry) => entry.toLowerCase() !== lowered);
  return [trimmed, ...deduped].slice(0, ENTRY_HISTORY_MAX_ITEMS);
}

function ensureDatalist(input, listId) {
  if (!input) {
    return null;
  }

  input.setAttribute("list", listId);
  let datalist = document.getElementById(listId);
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = listId;
    document.body.appendChild(datalist);
  }

  return datalist;
}

function renderDatalistOptions(datalist, entries) {
  if (!datalist) {
    return;
  }

  datalist.innerHTML = "";
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry;
    datalist.appendChild(option);
  }
}

function collectAccountFieldHistory(fieldName) {
  const values = [];
  for (const account of accounts) {
    const rows = Array.isArray(account?.transactions) ? account.transactions : [];
    for (const row of rows) {
      const value = typeof row?.[fieldName] === "string" ? row[fieldName].trim() : "";
      if (!value) {
        continue;
      }

      const lowered = value.toLowerCase();
      if (!values.some((entry) => entry.toLowerCase() === lowered)) {
        values.push(value);
      }
    }
  }

  return values.slice(0, ENTRY_HISTORY_MAX_ITEMS);
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
let accounts = loadAccounts();
let activeAccountId = loadActiveAccountId();

// Initialize default account if none exists
if (accounts.length === 0) {
  const defaultAccount = {
    id: generateUuid(),
    name: "Main Account",
    transactions: migrateOldTransactions()
  };
  accounts = [defaultAccount];
  activeAccountId = defaultAccount.id;
  saveAccounts();
  saveActiveAccountId();
}

// Ensure active account is valid
if (!accounts.find(acc => acc.id === activeAccountId)) {
  activeAccountId = accounts[0]?.id || null;
  saveActiveAccountId();
}

let transactions = loadTransactions();
let currentMonth = new Date();
currentMonth.setDate(1);
let selectedDateKey = toDateKey(new Date());
let editingTransactionId = null;
let payeeHistory = loadEntryHistory(PAYEE_HISTORY_KEY);
let descriptionHistory = loadEntryHistory(DESCRIPTION_HISTORY_KEY);
let calculatorExpression = "";

function updateCalculatorDisplay(value) {
  if (!calculatorDisplay) {
    return;
  }

  calculatorDisplay.value = value || "0";
}

function evaluateCalculatorExpression(expression) {
  const normalized = expression.replace(/[×x]/g, "*").replace(/[÷]/g, "/").trim();
  if (!normalized || !/^[0-9+\-*/().\s]+$/.test(normalized)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${normalized});`)();
    if (!Number.isFinite(result)) {
      return null;
    }

    return String(Number(result.toFixed(10)));
  } catch {
    return null;
  }
}

function handleCalculatorInput({ value, action }) {
  if (!calculatorDisplay) {
    return;
  }

  if (action === "clear") {
    calculatorExpression = "";
    updateCalculatorDisplay("0");
    return;
  }

  if (action === "backspace") {
    calculatorExpression = calculatorExpression.slice(0, -1);
    updateCalculatorDisplay(calculatorExpression || "0");
    return;
  }

  if (action === "equals") {
    const evaluated = evaluateCalculatorExpression(calculatorExpression);
    if (evaluated === null) {
      calculatorExpression = "";
      updateCalculatorDisplay("Error");
      return;
    }

    calculatorExpression = evaluated;
    updateCalculatorDisplay(calculatorExpression);
    return;
  }

  if (!value || !/^[0-9+\-*/().]$/.test(value)) {
    return;
  }

  if (calculatorDisplay.value === "Error") {
    calculatorExpression = "";
  }

  calculatorExpression += value;
  updateCalculatorDisplay(calculatorExpression);
}

function initializeEntryHistories() {
  const accountPayees = collectAccountFieldHistory("payee");
  const accountDescriptions = collectAccountFieldHistory("description");

  payeeHistory = [...payeeHistory];
  descriptionHistory = [...descriptionHistory];

  for (const payee of accountPayees) {
    payeeHistory = prependUniqueEntry(payeeHistory, payee);
  }

  for (const description of accountDescriptions) {
    descriptionHistory = prependUniqueEntry(descriptionHistory, description);
  }

  saveEntryHistory(PAYEE_HISTORY_KEY, payeeHistory);
  saveEntryHistory(DESCRIPTION_HISTORY_KEY, descriptionHistory);
}

function renderEntryHistorySuggestions() {
  const payeeDatalist = ensureDatalist(payeeInput, "payeeHistoryList");
  const descriptionDatalist = ensureDatalist(descriptionInput, "descriptionHistoryList");
  renderDatalistOptions(payeeDatalist, payeeHistory);
  renderDatalistOptions(descriptionDatalist, descriptionHistory);
}

function rememberFieldEntries({ payee, description }) {
  const nextPayeeHistory = prependUniqueEntry(payeeHistory, payee);
  const nextDescriptionHistory = prependUniqueEntry(descriptionHistory, description);

  const payeeChanged = nextPayeeHistory !== payeeHistory;
  const descriptionChanged = nextDescriptionHistory !== descriptionHistory;

  if (!payeeChanged && !descriptionChanged) {
    return;
  }

  payeeHistory = nextPayeeHistory;
  descriptionHistory = nextDescriptionHistory;
  saveEntryHistory(PAYEE_HISTORY_KEY, payeeHistory);
  saveEntryHistory(DESCRIPTION_HISTORY_KEY, descriptionHistory);
  renderEntryHistorySuggestions();
}

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

if (calculatorKeys) {
  calculatorKeys.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    handleCalculatorInput({
      value: button.dataset.value,
      action: button.dataset.action,
    });
  });
}

if (calculatorToggle && calculatorBody) {
  calculatorToggle.addEventListener("click", () => {
    const isHidden = calculatorBody.classList.toggle("hidden");
    calculatorToggle.textContent = isHidden ? "+" : "−";
    calculatorToggle.setAttribute("aria-expanded", String(!isHidden));
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
    recurrenceEndDate: null,
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
        recurrenceEndDate: null,
        linkedTransactionId: newTransactionId,
        linkedAccountId: activeAccountId,
      };
      
      targetAccount.transactions = targetAccount.transactions || [];
      targetAccount.transactions.push(linkedTransaction);
      saveAccounts();
    }
  }

  rememberFieldEntries({ payee, description });
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
        recurrenceEndDate: entry.recurrenceEndDate || null,
        linkedTransactionId: entry.linkedTransactionId || null,
        linkedAccountId: entry.linkedAccountId || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function migrateOldTransactions() {
  // Migrate old transactions from single-account storage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts() {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function loadActiveAccountId() {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

function saveActiveAccountId() {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccountId);
}

function persistTransactions() {
  const activeAccount = accounts.find(acc => acc.id === activeAccountId);
  if (activeAccount) {
    activeAccount.transactions = transactions;
    saveAccounts();
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

function getPreviousDateKey(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

function expandRecurringTransactions(startDate, endDate) {
  const expanded = [];
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  
  for (const txn of transactions) {
    const recurrenceEndDate = txn.recurrenceEndDate || null;

    // Add the original transaction if it's in range
    if (
      txn.date >= startKey &&
      txn.date <= endKey &&
      (!recurrenceEndDate || txn.date <= recurrenceEndDate)
    ) {
      expanded.push(txn);
    }
    
    // If it's recurring, generate instances
    if (txn.recurrence && txn.recurrence !== 'one-time') {
      let currentDate = txn.date;
      
      // Generate recurring instances
      while (true) {
        const nextDate = getNextRecurrenceDate(currentDate, txn.recurrence);
        if (!nextDate || nextDate > endKey) break;
        if (recurrenceEndDate && nextDate > recurrenceEndDate) break;
        
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

      if (txnToDelete && item.isRecurring && txnToDelete.recurrence && txnToDelete.recurrence !== 'one-time') {
        const cutoffDate = getPreviousDateKey(item.date);
        const nextTransactions = [...transactions];
        const txnIndex = nextTransactions.findIndex(tx => tx.id === idToUse);

        if (txnIndex === -1) {
          return;
        }

        if (txnToDelete.date > cutoffDate) {
          nextTransactions.splice(txnIndex, 1);
        } else {
          nextTransactions[txnIndex] = {
            ...txnToDelete,
            recurrenceEndDate: cutoffDate,
          };
        }

        if (txnToDelete.linkedTransactionId && txnToDelete.linkedAccountId) {
          truncateOrDeleteLinkedTransactionFromDate(
            txnToDelete.linkedTransactionId,
            txnToDelete.linkedAccountId,
            item.date
          );
        }

        commitTransactions(nextTransactions);
        return;
      }
      
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

function truncateOrDeleteLinkedTransactionFromDate(linkedTransactionId, linkedAccountId, fromDateKey) {
  const linkedAccount = accounts.find(acc => acc.id === linkedAccountId);
  if (!linkedAccount) {
    return;
  }

  const linkedTransactions = linkedAccount.transactions || [];
  const linkedTxn = linkedTransactions.find(t => t.id === linkedTransactionId);
  if (!linkedTxn) {
    return;
  }

  if (linkedTxn.recurrence && linkedTxn.recurrence !== 'one-time') {
    const cutoffDate = getPreviousDateKey(fromDateKey);
    if (linkedTxn.date > cutoffDate) {
      linkedAccount.transactions = linkedTransactions.filter(t => t.id !== linkedTransactionId);
    } else {
      linkedTxn.recurrenceEndDate = cutoffDate;
    }
  } else {
    linkedAccount.transactions = linkedTransactions.filter(t => t.id !== linkedTransactionId);
  }

  saveAccounts();
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
      linkedTxn.recurrenceEndDate = txn.recurrenceEndDate || null;
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
        recurrenceEndDate: null,
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
        recurrenceEndDate: null,
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
  if (txn.recurrence === 'one-time') {
    txn.recurrenceEndDate = null;
  }
  txn.notes = editNotesInput.value.trim();

  rememberFieldEntries({
    payee: txn.payee,
    description: txn.description,
  });
  
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

(function initialize() {
  if (dateInput) dateInput.value = selectedDateKey;
  if (transferAccountInput) updateTransferAccountOptions(transferAccountInput, transferAccountLabel);
  if (editTransferAccountInput) updateTransferAccountOptions(editTransferAccountInput, editTransferAccountLabel);
  initializeEntryHistories();
  renderEntryHistorySuggestions();
  render();
})();
