const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DB_PATH = process.env.DB_PATH || '/data/finance.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'finance-calendar-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));
app.use(express.static(path.join(__dirname)));

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check endpoint - useful for debugging
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create accounts table
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
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

    // Create active account table (per user)
    db.run(`
      CREATE TABLE IF NOT EXISTS active_account (
        user_id TEXT PRIMARY KEY,
        account_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
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

// Helper function to expand recurring transactions
function expandRecurringTransactions(transactions, months = 12) {
  const expanded = [];
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + months);
  const validRecurrences = new Set(['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly']);

  for (const txn of transactions) {
    // Add the original transaction
    expanded.push(txn);

    // If it has recurrence, generate future instances
    if (txn.recurrence && txn.recurrence !== 'none') {
      if (!validRecurrences.has(txn.recurrence)) {
        console.warn('Skipping unknown recurrence type', {
          id: txn.id,
          recurrence: txn.recurrence,
          date: txn.date
        });
        continue;
      }

      const startDate = new Date(`${txn.date}T00:00:00`);
      if (Number.isNaN(startDate.getTime())) {
        console.warn('Skipping recurrence with invalid date', {
          id: txn.id,
          recurrence: txn.recurrence,
          date: txn.date
        });
        continue;
      }

      const excludedDates = new Set(txn.excludedDates || []);
      const recurrenceEndDate =txn.recurrenceEndDate ? new Date(`${txn.recurrenceEndDate}T00:00:00`) : null;
      let currentDate = new Date(startDate);
      let safetyCounter = 0;

      // Generate instances up to endDate
      while (true) {
        const nextDate = new Date(currentDate);

        // Calculate next occurrence based on recurrence type
        switch (txn.recurrence) {
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          default:
            break;
        }

        if (Number.isNaN(nextDate.getTime())) break;
        if (nextDate <= currentDate) break;
        if (nextDate > endDate) break;
        
        // Stop if we've reached the recurrence end date
        if (recurrenceEndDate && nextDate > recurrenceEndDate) break;

        currentDate = nextDate;
        
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Skip if this date is excluded
        if (excludedDates.has(dateStr)) {
          continue;
        }

        // Create a new transaction instance
        const recurringInstance = {
          ...txn,
          id: `${txn.id}-${dateStr}`,
          date: dateStr,
          isRecurringInstance: true // Mark as generated instance
        };

        expanded.push(recurringInstance);

        safetyCounter += 1;
        if (safetyCounter > 1000) {
          console.warn('Stopping recurring expansion after safety limit', {
            id: txn.id,
            recurrence: txn.recurrence,
            date: txn.date
          });
          break;
        }
      }
    }
  }

  // Sort by date
  expanded.sort((a, b) => a.date.localeCompare(b.date));

  return expanded;
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Helper to generate UUID
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Authentication Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    // Check if user exists
    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateUuid();
    
    // Create user
    await dbRun('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', 
      [userId, username, passwordHash]);
    
    // Create session
    req.session.userId = userId;
    req.session.username = username;
    
    res.json({ success: true, username });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Find user
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

// API Routes

// Get all accounts
app.get('/api/accounts', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const accounts = await dbAll('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    
    // Fetch transactions for each account
    const accountsWithTransactions = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await dbAll(
          'SELECT * FROM transactions WHERE account_id = ? ORDER BY date ASC',
          [account.id]
        );
        
        // Map transactions to camelCase
        const mappedTransactions = transactions.map((txn) => ({
          id: txn.id,
          date: txn.date,
          payee: txn.payee,
          description: txn.description,
          notes: txn.notes,
          amount: txn.amount,
          recurrence: txn.recurrence,
          linkedTransactionId: txn.linked_transaction_id || null,
          linkedAccountId: txn.linked_account_id || null,
        }));
        
        // Expand recurring transactions
        const expandedTransactions = expandRecurringTransactions(mappedTransactions);
        
        return {
          id: account.id,
          name: account.name,
          transactions: expandedTransactions
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
app.post('/api/accounts', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const payload = req.body;
    const accountsPayload = Array.isArray(payload) ? payload : [payload];

    if (!accountsPayload.length) {
      return res.json({ success: true });
    }

    // Delete only this user's data
    await dbRun('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)', [userId]);
    await dbRun('DELETE FROM accounts WHERE user_id = ?', [userId]);

    for (const account of accountsPayload) {
      if (!account || !account.id || !account.name) {
        continue;
      }

      await dbRun('INSERT OR REPLACE INTO accounts (id, user_id, name) VALUES (?, ?, ?)', [account.id, userId, account.name]);

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
app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { accountId, transactions } = req.body;
    
    // Verify account belongs to user
    const account = await dbGet('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    if (!account) {
      return res.status(403).json({ error: 'Account not found or access denied' });
    }
    
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
app.get('/api/active-account', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await dbGet('SELECT account_id FROM active_account WHERE user_id = ?', [userId]);
    res.json({ activeAccountId: result?.account_id || null });
  } catch (error) {
    console.error('Error fetching active account:', error);
    res.status(500).json({ error: 'Failed to fetch active account' });
  }
});

// Set active account ID
app.post('/api/active-account', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { activeAccountId } = req.body;
    
    await dbRun(
      'INSERT OR REPLACE INTO active_account (user_id, account_id) VALUES (?, ?)',
      [userId, activeAccountId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting active account:', error);
    res.status(500).json({ error: 'Failed to set active account' });
  }
});

// Get entry histories
app.get('/api/entry-histories/:accountId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { accountId } = req.params;
    
    // Verify account belongs to user
    const account = await dbGet('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    if (!account) {
      return res.status(403).json({ error: 'Account not found or access denied' });
    }
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
app.post('/api/entry-histories/:accountId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { accountId } = req.params;
    
    // Verify account belongs to user
    const account = await dbGet('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    if (!account) {
      return res.status(403).json({ error: 'Account not found or access denied' });
    }
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

// Clear all database data
app.delete('/api/clear-all', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    await dbRun('DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)', [userId]);
    await dbRun('DELETE FROM accounts WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM active_account WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM entry_histories WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)', [userId]);
    
    console.log('Database cleared successfully');
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from other computers: http://<your-computer-ip>:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err);
    console.log('Database closed');
    process.exit(0);
  });
});
