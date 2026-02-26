# Finance Calendar

Simple browser-based finance tracker with:
- **Multi-account support** - Create separate calendars for different accounts
- **Linked transfers** - Transfer money between accounts (creates matching transactions)
- Calendar view with daily totals and running balance
- **Income vs Expenses graph** - Visualize financial trends over time
- **Category breakdown** - Analyze spending by category with doughnut charts
- **Recurring transactions** - Automatically expand weekly, bi-weekly, monthly, quarterly, and yearly transactions
- CSV import/export with recurring transaction expansion
- Built-in calculator positioned in the accounts sidebar
- Data persistence with SQLite database (Docker) or browser storage

## Run

### Option 1: Local Development (Recommended for Development)
Requires Node.js installed.

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser: http://localhost:3000
```

### Option 2: Docker Container (Best for Production/Sharing)
Requires Docker and Docker Compose.

```bash
# Quick start with Docker Compose
docker compose up -d
```

Access at: `http://localhost:8080` or `http://YOUR_MACHINE_IP:8080`

For detailed Docker setup instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

**Prefer a UI?** Use [Portainer](PORTAINER_SETUP.md) for easy container management without command line.

### Option 3: Static HTML (Offline, Limited Features)
Open `index.html` directly in your browser for a basic offline experience (no persistent storage).

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

### Graphs & Analysis
- Click **📊 Graph** to see income vs expenses over time.
  - Green line shows income trends
  - Red line shows expense trends
  - Switch between time range (30, 60, 90, 180, or 365 days) or specific month view
  - View summary statistics for the selected period
  - Data automatically refreshes when returning from the calendar
  - Use the **🔄 Refresh** button to manually reload data

- Click **📂 Categories** to analyze spending and income by category.
  - Doughnut charts showing percentage breakdown by category
  - Category names are based on transaction descriptions
  - View totals and percentages for each category
  - Filter by time range or specific month
  - List view shows all categories with visual bars and percentages

### Tools
- **Built-in Calculator**: Located in the left sidebar below accounts. Use for quick calculations while managing transactions.
  - Supports basic operations (+, −, ×, ÷)
  - Collapsible for space management
  - Automatically repositions when adding new accounts

### Import & Export
- Export transactions with **Export CSV**.
   - Select a date range to export specific transactions
   - CSV includes all recurring transaction instances within the selected date range
   - Recurring transactions are automatically expanded to show each occurrence (up to 12 months)
   - Export "All" transactions to get the complete dataset including all generated recurring instances
- Choose import mode:
   - **Merge Import** adds imported rows to existing data.
   - **Replace Import** overwrites existing data with imported rows.
- Import transactions with **Import CSV** (columns: date, payee, description, notes, amount, recurrence).
   - Payee, Notes, and Recurrence columns are optional.
   - Recurrence defaults to "one-time" if not provided.
   - Duplicate rows are skipped automatically.
   - An in-page preview dialog appears before applying import (valid, duplicate, invalid counts) with Confirm/Cancel.
   - Import results/errors are shown as small in-page toast notifications.
- Remove individual transactions or clear all data.
   - When removing a recurring transaction, all future instances are also removed.
   - Clear All uses an in-page confirmation dialog.

## Data Storage

**Docker/Server:** Data is persisted in SQLite database stored at `/data/finance.db` (mounted volume).

**Browser (Offline):** Data is stored in browser's localStorage under the key `finance-calendar-transactions`.
