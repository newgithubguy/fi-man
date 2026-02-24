# Finance Calendar

Simple browser-based finance tracker with:
- Calendar view
- Daily totals
- Balance by day
- Recurring transactions (daily, weekly, bi-weekly, monthly, quarterly, yearly)
- CSV import/export
- Local storage persistence

## Run

Open `index.html` in your browser.

## Use

1. Add transactions using date, description, vendor, notes, amount, and recurrence.
   - Positive amount = income
   - Negative amount = expense
   - Vendor is optional (e.g., Walmart, Employer, Landlord)
   - Notes is optional for additional memo or details
   - Click a calendar day to prefill the transaction date quickly.
   - Select recurrence frequency: one-time, daily, weekly, bi-weekly, monthly, quarterly, or yearly.
   - Recurring transactions automatically appear on future dates based on the selected frequency.
   - Date, Description, and Amount show inline validation hints when required values are missing (Amount also blocks zero).
2. Move between months with arrow buttons.
3. Review daily and balance totals directly in the calendar.
4. Click on a day to view all transactions for that specific date (including recurring instances).
5. Export transactions with **Export CSV**.
6. Choose import mode:
   - **Merge Import** adds imported rows to existing data.
   - **Replace Import** overwrites existing data with imported rows.
7. Import transactions with **Import CSV** (columns: date, description, vendor, notes, amount, recurrence).
   - Vendor, Notes, and Recurrence columns are optional.
   - Recurrence defaults to "one-time" if not provided.
   - Duplicate rows are skipped automatically.
   - An in-page preview dialog appears before applying import (valid, duplicate, invalid counts) with Confirm/Cancel.
   - Import results/errors are shown as small in-page toast notifications.
8. Remove individual transactions or clear all data.
   - When removing a recurring transaction, all future instances are also removed.
   - Clear All uses an in-page confirmation dialog.

Data is stored in your browser's local storage under the key `finance-calendar-transactions`.
