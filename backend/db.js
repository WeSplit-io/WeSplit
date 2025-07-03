const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the backend directory
const dbPath = path.join(__dirname, 'wesplit.db');

// Create database connection with better error handling
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Configure database for better concurrency
    db.serialize(() => {
      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) {
          console.error('Error setting WAL mode:', err.message);
        } else {
          console.log('WAL mode enabled for better concurrency');
        }
      });
      
      // Set busy timeout to 5 seconds
      db.run('PRAGMA busy_timeout = 5000', (err) => {
        if (err) {
          console.error('Error setting busy timeout:', err.message);
        } else {
          console.log('Busy timeout set to 5 seconds');
        }
      });
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err.message);
        } else {
          console.log('Foreign keys enabled');
        }
      });
      
      // Create users table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          wallet_address TEXT NOT NULL,
          wallet_public_key TEXT NOT NULL,
          wallet_secret_key TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
        } else {
          console.log('Users table ready');
        }
      });

      // Create groups table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          currency TEXT DEFAULT 'USDC',
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating groups table:', err.message);
        } else {
          console.log('Groups table ready');
        }
      });

      // Create group_members table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS group_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(group_id, user_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating group_members table:', err.message);
        } else {
          console.log('Group members table ready');
        }
      });

      // Create expenses table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'USDC',
          paid_by INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          category TEXT DEFAULT 'general',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (paid_by) REFERENCES users (id),
          FOREIGN KEY (group_id) REFERENCES groups (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating expenses table:', err.message);
        } else {
          console.log('Expenses table ready');
        }
      });

      // Create group_invites table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS group_invites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          invite_code TEXT UNIQUE NOT NULL,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (group_id) REFERENCES groups (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating group_invites table:', err.message);
        } else {
          console.log('Group invites table ready');
        }
      });

      // Create group_wallets table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS group_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          wallet_address TEXT NOT NULL,
          wallet_public_key TEXT NOT NULL,
          wallet_secret_key TEXT,
          balance REAL DEFAULT 0,
          currency TEXT DEFAULT 'USDC',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id),
          UNIQUE(group_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating group_wallets table:', err.message);
        } else {
          console.log('Group wallets table ready');
        }
      });

      // Create group_wallet_transactions table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS group_wallet_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_wallet_id INTEGER NOT NULL,
          from_address TEXT,
          to_address TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'USDC',
          transaction_type TEXT CHECK(transaction_type IN ('deposit', 'withdrawal', 'settlement')) NOT NULL,
          transaction_hash TEXT,
          user_id INTEGER,
          memo TEXT,
          status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_wallet_id) REFERENCES group_wallets (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating group_wallet_transactions table:', err.message);
        } else {
          console.log('Group wallet transactions table ready');
        }
      });

      // Create notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('settlement_request', 'settlement_notification', 'funding_notification', 'payment_request', 'general')),
          data TEXT DEFAULT '{}',
          read INTEGER DEFAULT 0 CHECK (read IN (0, 1)),
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating notifications table:', err.message);
        } else {
          console.log('Notifications table ready');
        }
      });
    });

    console.log('Database tables created successfully!');
  }
});

// Convert to promise-based interface with improved retry logic
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 3;
      
      const executeQuery = () => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries) {
              retryCount++;
              const delay = retryCount * 100; // Simple linear backoff: 100ms, 200ms, 300ms
              console.log(`Database busy, retrying in ${delay}ms... (attempt ${retryCount}/${maxRetries})`);
              setTimeout(executeQuery, delay);
            } else {
              console.error('Database query error:', err);
              reject(err);
            }
          } else {
            resolve({ rows });
          }
        });
      };
      executeQuery();
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 3;
      
      const executeRun = () => {
        db.run(sql, params, function(err) {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries) {
              retryCount++;
              const delay = retryCount * 100; // Simple linear backoff: 100ms, 200ms, 300ms
              console.log(`Database busy, retrying in ${delay}ms... (attempt ${retryCount}/${maxRetries})`);
              setTimeout(executeRun, delay);
            } else {
              console.error('Database run error:', err);
              reject(err);
            }
          } else {
            resolve({ 
              rows: [{ id: this.lastID }],
              rowCount: this.changes 
            });
          }
        });
      };
      executeRun();
    });
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = pool; 