const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_PATH = '/data/finance.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        date TEXT NOT NULL,
        payee TEXT,
        description TEXT NOT NULL,
        notes TEXT,
        amount REAL NOT NULL,
        recurrence TEXT,
        linked_transaction_id TEXT,
        linked_account_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);

    // Create active account table
    db.run(`
      CREATE TABLE IF NOT EXISTS active_account (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Create entry histories table
    db.run(`
      CREATE TABLE IF NOT EXISTS entry_histories (
        key TEXT PRIMARY KEY,
        account_id TEXT,
        entries TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      )
    `);
  });
}

// Helper function to run database queries with promises
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// API Routes

// Get all accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await dbAll('SELECT * FROM accounts ORDER BY created_at DESC');
    
    // Fetch transactions for each account
    const accountsWithTransactions = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await dbAll(
          'SELECT * FROM transactions WHERE account_id = ? ORDER BY date ASC',
          [account.id]
        );
        return {
          id: account.id,
          name: account.name,
          transactions: transactions.map((txn) => ({
            id: txn.id,
            date: txn.date,
            payee: txn.payee,
            description: txn.description,
            notes: txn.notes,
            amount: txn.amount,
            recurrence: txn.recurrence,
            linkedTransactionId: txn.linked_transaction_id || null,
            linkedAccountId: txn.linked_account_id || null,
          }))
        };
      })
    );
    
    res.json(accountsWithTransactions);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Create account or replace all accounts
app.post('/api/accounts', async (req, res) => {
  try {
    const payload = req.body;
    const accountsPayload = Array.isArray(payload) ? payload : [payload];

    if (!accountsPayload.length) {
      return res.json({ success: true });
    }

    await dbRun('DELETE FROM transactions');
    await dbRun('DELETE FROM accounts');

    for (const account of accountsPayload) {
      if (!account || !account.id || !account.name) {
        continue;
      }

      await dbRun('INSERT OR REPLACE INTO accounts (id, name) VALUES (?, ?)', [account.id, account.name]);

      for (const txn of account.transactions || []) {
        await dbRun(
          `INSERT OR REPLACE INTO transactions 
           (id, account_id, date, payee, description, notes, amount, recurrence, linked_transaction_id, linked_account_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            txn.id,
            account.id,
            txn.date,
            txn.payee,
            txn.description,
            txn.notes,
            txn.amount,
            txn.recurrence,
            txn.linkedTransactionId,
            txn.linkedAccountId
          ]
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Save transactions
app.post('/api/transactions', async (req, res) => {
  try {
    const { accountId, transactions } = req.body;
    
    // Clear existing transactions for this account
    await dbRun('DELETE FROM transactions WHERE account_id = ?', [accountId]);
    
    // Insert new transactions
    for (const txn of transactions) {
      await dbRun(
        `INSERT INTO transactions 
         (id, account_id, date, payee, description, notes, amount, recurrence, linked_transaction_id, linked_account_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txn.id, accountId, txn.date, txn.payee, txn.description, txn.notes, txn.amount, txn.recurrence, txn.linkedTransactionId, txn.linkedAccountId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving transactions:', error);
    res.status(500).json({ error: 'Failed to save transactions' });
  }
});

// Get active account ID
app.get('/api/active-account', async (req, res) => {
  try {
    const result = await dbGet('SELECT value FROM active_account WHERE key = ?', ['active_account_id']);
    res.json({ activeAccountId: result?.value || null });
  } catch (error) {
    console.error('Error fetching active account:', error);
    res.status(500).json({ error: 'Failed to fetch active account' });
  }
});

// Set active account ID
app.post('/api/active-account', async (req, res) => {
  try {
    const { activeAccountId } = req.body;
    
    await dbRun(
      'INSERT OR REPLACE INTO active_account (key, value) VALUES (?, ?)',
      ['active_account_id', activeAccountId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting active account:', error);
    res.status(500).json({ error: 'Failed to set active account' });
  }
});

// Get entry histories
app.get('/api/entry-histories/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const payeeResult = await dbGet(
      'SELECT entries FROM entry_histories WHERE key = ? AND account_id = ?',
      [`payee-${accountId}`, accountId]
    );
    const descriptionResult = await dbGet(
      'SELECT entries FROM entry_histories WHERE key = ? AND account_id = ?',
      [`description-${accountId}`, accountId]
    );
    
    res.json({
      payees: payeeResult ? JSON.parse(payeeResult.entries) : [],
      descriptions: descriptionResult ? JSON.parse(descriptionResult.entries) : []
    });
  } catch (error) {
    console.error('Error fetching entry histories:', error);
    res.status(500).json({ error: 'Failed to fetch entry histories' });
  }
});

// Save entry histories
app.post('/api/entry-histories/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { payees, descriptions } = req.body;
    
    await dbRun(
      'INSERT OR REPLACE INTO entry_histories (key, account_id, entries) VALUES (?, ?, ?)',
      [`payee-${accountId}`, accountId, JSON.stringify(payees || [])]
    );
    
    await dbRun(
      'INSERT OR REPLACE INTO entry_histories (key, account_id, entries) VALUES (?, ?, ?)',
      [`description-${accountId}`, accountId, JSON.stringify(descriptions || [])]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving entry histories:', error);
    res.status(500).json({ error: 'Failed to save entry histories' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err);
    console.log('Database closed');
    process.exit(0);
  });
});
