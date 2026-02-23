# Finance Calendar

Simple browser-based finance tracker with:
- Calendar view
- Daily totals
- Running balance by day
- CSV import/export
- Local storage persistence

## Run

Open `index.html` in your browser.

## Use

1. Add transactions using date, description, and amount.
   - Positive amount = income
   - Negative amount = expense
   - Click a calendar day to prefill the transaction date quickly.
   - Date, Description, and Amount show inline validation hints when required values are missing (Amount also blocks zero).
2. Move between months with arrow buttons.
3. Review daily and running totals directly in the calendar.
4. Export transactions with **Export CSV**.
5. Choose import mode:
   - **Merge Import** adds imported rows to existing data.
   - **Replace Import** overwrites existing data with imported rows.
6. Import transactions with **Import CSV** (columns: date, description, amount).
   - Duplicate rows are skipped automatically.
   - An in-page preview dialog appears before applying import (valid, duplicate, invalid counts) with Confirm/Cancel.
   - Import results/errors are shown as small in-page toast notifications.
7. Remove individual transactions or clear all data.
   - Clear All uses an in-page confirmation dialog.

Data is stored in your browser's local storage under the key `finance-calendar-transactions`.
