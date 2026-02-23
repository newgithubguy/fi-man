const STORAGE_KEY = "finance-calendar-transactions";
const IMPORT_NO_VALID_ROWS_MESSAGE = "No valid transactions found in the CSV file.";
const IMPORT_READ_ERROR_MESSAGE = "Could not import this CSV file.";
const TOAST_DURATION_MS = 3000;

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const transactionForm = document.getElementById("transactionForm");
const dateInput = document.getElementById("dateInput");
const dateHint = document.getElementById("dateHint");
const descriptionInput = document.getElementById("descriptionInput");
const descriptionHint = document.getElementById("descriptionHint");
const amountInput = document.getElementById("amountInput");
const amountHint = document.getElementById("amountHint");
const transactionList = document.getElementById("transactionList");
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

let transactions = loadTransactions();
let currentMonth = new Date();
currentMonth.setDate(1);
let selectedDateKey = toDateKey(new Date());

document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
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
  const amount = Number(amountInput.value);

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
      amount,
    },
  ];

  commitTransactions(nextTransactions);
  transactionForm.reset();
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
        description: entry.description,
        amount: Number(entry.amount),
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
  const header = ["date", "description", "amount"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const escapedDescription = row.description.replace(/"/g, '""');
    lines.push(`${row.date},"${escapedDescription}",${row.amount}`);
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
  const startIndex = /^date\s*,\s*description\s*,\s*amount$/i.test(lines[0]) ? 1 : 0;
  const totalRows = Math.max(lines.length - startIndex, 0);

  for (let index = startIndex; index < lines.length; index++) {
    const values = splitCsvLine(lines[index]);
    if (values.length < 3) {
      invalidRows++;
      continue;
    }

    const date = values[0].trim();
    const description = values[1].trim();
    const amount = Number(values[2]);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isFinite(amount) || amount === 0) {
      invalidRows++;
      continue;
    }

    result.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount,
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

function getDailyTotalsMap() {
  const totals = new Map();
  for (const item of transactions) {
    totals.set(item.date, (totals.get(item.date) || 0) + item.amount);
  }
  return totals;
}

function getBalanceBefore(dateKey) {
  return transactions
    .filter((item) => item.date < dateKey)
    .reduce((sum, item) => sum + item.amount, 0);
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  monthLabel.textContent = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

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

    const runningTotal = document.createElement("div");
    runningTotal.className = "running-total";
    runningTotal.textContent = `Running: ${formatCurrency(isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount)}`;
    if ((isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount) > 0) runningTotal.classList.add("positive");
    if ((isCurrentMonth ? runningBalance : getBalanceBefore(dateKey) + dayAmount) < 0) runningTotal.classList.add("negative");

    day.append(dayNum, dailyTotal, runningTotal);
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

  const monthStart = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const monthEnd = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
  const monthItems = transactions.filter((item) => item.date >= monthStart && item.date <= monthEnd);

  if (!monthItems.length) {
    const empty = document.createElement("li");
    empty.textContent = "No transactions for this month yet.";
    transactionList.appendChild(empty);
    return;
  }

  for (const item of monthItems) {
    const row = document.createElement("li");

    const date = document.createElement("span");
    date.textContent = item.date;

    const description = document.createElement("span");
    description.textContent = item.description;

    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(item.amount);
    amount.className = item.amount >= 0 ? "positive" : "negative";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-btn";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const remainingTransactions = transactions.filter((tx) => tx.id !== item.id);
      commitTransactions(remainingTransactions);
    });

    row.append(date, description, amount, removeButton);
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
