# Finance Calendar

Simple browser-based finance tracker with:
- **Multi-account support** - Create separate calendars for different accounts
- **Linked transfers** - Transfer money between accounts (creates matching transactions)
- Calendar view
- Daily totals
- Balance by day
- Income vs Expenses line graph
- Recurring transactions (daily, weekly, bi-weekly, monthly, quarterly, yearly)
- CSV import/export
- Local storage persistence

## Run

### Option 1: Direct Browser (Simplest)
Open `index.html` in your browser.

### Option 2: Docker Container (Local Network)
To run on your local network, use Docker:

```bash
# Quick start with Docker Compose
docker-compose up -d
```

Access at: `http://localhost:8080` or `http://YOUR_MACHINE_IP:8080`

For detailed Docker setup instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

**Prefer a UI?** Use [Portainer](PORTAINER_SETUP.md) for easy container management without command line.

### Option 3: Local HTTP Server
```bash
# Python
python -m http.server 8000

# Then open: http://localhost:8000
```

## Use

### Accounts
- Click the **+** button in the left sidebar to create new accounts
- Click an account name to switch between them
- Each account has its own separate transaction history
- Hover over an account and click **×** to delete it (only if you have multiple accounts)

### Transactions
1. Add transactions using date, payee, description, notes, amount, and recurrence.
   - Positive amount = income
   - Negative amount = expense
   - Payee is optional (e.g., Walmart, Employer, Landlord)
   - Notes is optional for additional memo or details
   - Click a calendar day to prefill the transaction date quickly.
   - Select recurrence frequency: one-time, daily, weekly, bi-weekly, monthly, quarterly, or yearly.
   - Recurring transactions automatically appear on future dates based on the selected frequency.
   - Date, Description, and Amount show inline validation hints when required values are missing (Amount also blocks zero).

2. **Transfers Between Accounts**:
   - Check "Transfer to another account" when adding a transaction
   - Select which account to transfer to
   - A matching transaction with the opposite amount will automatically be created in the other account
   - Both transactions are linked - editing one updates the other
   - Deleting one transaction removes both linked transactions
   - Transfer links are shown as a badge on the transaction

3. Move between months with arrow buttons.
4. Review daily and balance totals directly in the calendar.
5. Click on a day to view all transactions for that specific date (including recurring instances).
6. Click "📊 View Graph" to see income vs expenses over time.
   - Green line shows income trends
   - Red line shows expense trends
   - Adjust time range (30, 60, 90, 180, or 365 days)
   - View summary statistics for the selected period
7. Export transactions with **Export CSV**.
8. Choose import mode:
   - **Merge Import** adds imported rows to existing data.
   - **Replace Import** overwrites existing data with imported rows.
9. Import transactions with **Import CSV** (columns: date, payee, description, notes, amount, recurrence).
   - Payee, Notes, and Recurrence columns are optional.
   - Recurrence defaults to "one-time" if not provided.
   - Duplicate rows are skipped automatically.
   - An in-page preview dialog appears before applying import (valid, duplicate, invalid counts) with Confirm/Cancel.
   - Import results/errors are shown as small in-page toast notifications.
9. Remove individual transactions or clear all data.
   - When removing a recurring transaction, all future instances are also removed.
   - Clear All uses an in-page confirmation dialog.

Data is stored in your browser's local storage under the key `finance-calendar-transactions`.
