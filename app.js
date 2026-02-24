const STORAGE_KEY = "finance-calendar-transactions";
const IMPORT_NO_VALID_ROWS_MESSAGE = "No valid transactions found in the CSV file.";
const IMPORT_READ_ERROR_MESSAGE = "Could not import this CSV file.";
const TOAST_DURATION_MS = 3000;

const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const calendarGrid = document.getElementById("calendarGrid");
const transactionForm = document.getElementById("transactionForm");
const dateInput = document.getElementById("dateInput");
const dateHint = document.getElementById("dateHint");
const descriptionInput = document.getElementById("descriptionInput");
const descriptionHint = document.getElementById("descriptionHint");
const vendorInput = document.getElementById("vendorInput");
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
const editVendorInput = document.getElementById("editVendorInput");
const editDescriptionInput = document.getElementById("editDescriptionInput");
const editAmountInput = document.getElementById("editAmountInput");
const editRecurrenceInput = document.getElementById("editRecurrenceInput");
const editNotesInput = document.getElementById("editNotesInput");
const editCancel = document.getElementById("editCancel");

let transactions = loadTransactions();
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
  if (!transactions.length) {
    return;
  }
  const confirmed = await openClearAllConfirm();
  if (!confirmed) {
    return;
  }
  commitTransactions([]);
});

exportCsvButton.addEventListener("click", () => {
  const csv = toCsv(transactions);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `finance-transactions-${stamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
});

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
  const vendor = vendorInput.value.trim();
  const notes = notesInput.value.trim();
  const amount = Number(amountInput.value);
  const recurrence = recurrenceInput.value;

  if (!date || !description || Number.isNaN(amount) || amount === 0) {
    setDateValidationHint({ showRequiredWhenEmpty: true });
    setDescriptionValidationHint({ showRequiredWhenEmpty: true });
    setAmountValidationHint({ showRequiredWhenEmpty: true });
    return;
  }

  const nextTransactions = [
    ...transactions,
    {
      id: crypto.randomUUID(),
      date,
      description,
      vendor,
      notes,
      amount,
      recurrence,
    },
  ];

  commitTransactions(nextTransactions);
  transactionForm.reset();
  recurrenceInput.value = "one-time";
  dateInput.value = selectedDateKey;
  setDateValidationHint();
  setDescriptionValidationHint();
  setAmountValidationHint();
  descriptionInput.focus();
});

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && entry.date && entry.description && Number.isFinite(Number(entry.amount)))
      .map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        date: entry.date,
        vendor: entry.vendor || '',
        description: entry.description,
        notes: entry.notes || '',
        amount: Number(entry.amount),
        recurrence: entry.recurrence || 'one-time',
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function persistTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function commitTransactions(nextTransactions) {
  transactions = sortTransactions(nextTransactions);
  persistTransactions();
  render();
}

function toCsv(rows) {
  const header = ["date", "vendor", "description", "notes", "amount", "recurrence"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const escapedVendor = (row.vendor || "").replace(/"/g, '""');
    const escapedDescription = row.description.replace(/"/g, '""');
    const escapedNotes = (row.notes || "").replace(/"/g, '""');
    const recurrence = row.recurrence || "one-time";
    lines.push(`${row.date},"${escapedVendor}","${escapedDescription}","${escapedNotes}",${row.amount},${recurrence}`);
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
  
  // Determine column order: check if vendor comes before description
  const vendorBeforeDesc = headerLine.indexOf("vendor") > 0 && 
                           headerLine.indexOf("vendor") < headerLine.indexOf("description");
  const hasNotesColumn = /notes/i.test(headerLine);
  const hasVendorColumn = /vendor/i.test(headerLine);
  
  const startIndex = hasHeader ? 1 : 0;
  const totalRows = Math.max(lines.length - startIndex, 0);

  for (let index = startIndex; index < lines.length; index++) {
    const values = splitCsvLine(lines[index]);
    if (values.length < 3) {
      invalidRows++;
      continue;
    }

    let date, description, vendor, notes, amount, recurrence;
    
    if (vendorBeforeDesc && hasNotesColumn) {
      // New format: date, vendor, description, notes, amount, recurrence
      date = values[0].trim();
      vendor = values.length > 1 ? values[1].trim() : "";
      description = values.length > 2 ? values[2].trim() : "";
      notes = values.length > 3 ? values[3].trim() : "";
      amount = Number(values.length > 4 ? values[4] : 0);
      recurrence = values.length > 5 ? values[5].trim() : "one-time";
    } else if (hasNotesColumn && !vendorBeforeDesc) {
      // Format: date, description, vendor, notes, amount, recurrence
      date = values[0].trim();
      description = values[1].trim();
      vendor = values.length > 2 ? values[2].trim() : "";
      notes = values.length > 3 ? values[3].trim() : "";
      amount = Number(values.length > 4 ? values[4] : 0);
      recurrence = values.length > 5 ? values[5].trim() : "one-time";
    } else if (hasVendorColumn && !vendorBeforeDesc) {
      // Previous format: date, description, vendor, amount, recurrence
      date = values[0].trim();
      description = values[1].trim();
      vendor = values.length > 2 ? values[2].trim() : "";
      notes = "";
      amount = Number(values.length > 3 ? values[3] : 0);
      recurrence = values.length > 4 ? values[4].trim() : "one-time";
    } else {
      // Old format: date, description, amount, recurrence (or just date, description, amount)
      date = values[0].trim();
      description = values[1].trim();
      vendor = "";
      notes = "";
      amount = Number(values[2]);
      recurrence = values.length > 3 ? values[3].trim() : "one-time";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isFinite(amount) || amount === 0) {
      invalidRows++;
      continue;
    }

    result.push({
      id: crypto.randomUUID(),
      date,
      description,
      vendor,
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

    const vendor = document.createElement("span");
    vendor.textContent = item.vendor || "—";
    vendor.className = "vendor";

    const description = document.createElement("span");
    description.textContent = item.description + (item.isRecurring ? " (recurring)" : "");

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
      const remainingTransactions = transactions.filter((tx) => tx.id !== idToUse);
      commitTransactions(remainingTransactions);
    });

    row.append(date, vendor, description, notes, amount, editButton, removeButton);
    transactionList.appendChild(row);
  }
}

function render() {
  renderCalendar();
  renderTransactions();
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
  editVendorInput.value = txn.vendor || '';
  editDescriptionInput.value = txn.description || '';
  editAmountInput.value = txn.amount;
  editRecurrenceInput.value = txn.recurrence || 'one-time';
  editNotesInput.value = txn.notes || '';
  
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
  
  // Update transaction properties
  txn.date = editDateInput.value;
  txn.vendor = editVendorInput.value.trim();
  txn.description = editDescriptionInput.value.trim();
  txn.amount = Number(editAmountInput.value);
  txn.recurrence = editRecurrenceInput.value;
  txn.notes = editNotesInput.value.trim();
  
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
  dateInput.value = selectedDateKey;
  render();
})();
