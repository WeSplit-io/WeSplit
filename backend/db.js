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
          avatar TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
        } else {
          console.log('Users table ready');
          
          // Add avatar column to existing table if it doesn't exist
          db.run(`
            ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL
          `, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Error adding avatar column:', err.message);
            }
          });
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
          
          // Check if migration is needed (check if icon and color columns exist)
          db.all('PRAGMA table_info(groups)', (pragmaErr, columns) => {
            if (pragmaErr) {
              console.error('Error checking groups table structure:', pragmaErr.message);
              return;
            }
            
            const hasIcon = columns.some(col => col.name === 'icon');
            const hasColor = columns.some(col => col.name === 'color');
            
            if (!hasIcon || !hasColor) {
              console.log('Migrating groups table to add icon and color fields...');
              
              // Clean up any leftover migration tables first
              db.run(`DROP TABLE IF EXISTS groups_new`, (cleanupErr) => {
                if (cleanupErr) {
                  console.error('Error cleaning up migration table:', cleanupErr.message);
                  return;
                }
                
                // Disable foreign keys first, outside of transaction
                db.run('PRAGMA foreign_keys = OFF', (fkOffErr) => {
                  if (fkOffErr) {
                    console.error('Error disabling foreign keys:', fkOffErr.message);
                    return;
                  }
                  
                  console.log('Foreign keys disabled for migration');
                  
                  // Start transaction for safe migration
                  db.run('BEGIN TRANSACTION', (beginErr) => {
                    if (beginErr) {
                      console.error('Error starting transaction:', beginErr.message);
                      // Re-enable foreign keys before returning
                      db.run('PRAGMA foreign_keys = ON');
                      return;
                    }
                    
                    console.log('Transaction started');
                    
                    // Create new table with icon and color fields
                    db.run(`
                      CREATE TABLE groups_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        category TEXT DEFAULT 'general',
                        currency TEXT DEFAULT 'USDC',
                        icon TEXT DEFAULT 'people',
                        color TEXT DEFAULT '#A5EA15',
                        created_by INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (created_by) REFERENCES users (id)
                      )
                    `, (createErr) => {
                      if (createErr) {
                        console.error('Error creating new groups table:', createErr.message);
                        db.run('ROLLBACK');
                        db.run('PRAGMA foreign_keys = ON');
                        return;
                      }
                      
                      console.log('New groups table created');
                      
                      // Copy existing data with default values for new fields
                      db.run(`
                        INSERT INTO groups_new (id, name, description, category, currency, icon, color, created_by, created_at, updated_at)
                        SELECT id, name, description, 
                               COALESCE(category, 'general') as category,
                               COALESCE(currency, 'USDC') as currency,
                               'people' as icon,
                               '#A5EA15' as color,
                               created_by, created_at, updated_at
                        FROM groups
                      `, (copyErr) => {
                        if (copyErr) {
                          console.error('Error copying groups data:', copyErr.message);
                          db.run('ROLLBACK');
                          db.run('PRAGMA foreign_keys = ON');
                          return;
                        }
                        
                        console.log('Data copied to new groups table');
                        
                        // Drop old table
                        db.run(`DROP TABLE groups`, (dropErr) => {
                          if (dropErr) {
                            console.error('Error dropping old groups table:', dropErr.message);
                            db.run('ROLLBACK');
                            db.run('PRAGMA foreign_keys = ON');
                            return;
                          }
                          
                          console.log('Old groups table dropped');
                          
                          // Rename new table
                          db.run(`ALTER TABLE groups_new RENAME TO groups`, (renameErr) => {
                            if (renameErr) {
                              console.error('Error renaming groups table:', renameErr.message);
                              db.run('ROLLBACK');
                              db.run('PRAGMA foreign_keys = ON');
                              return;
                            }
                            
                            console.log('New groups table renamed');
                            
                            // Commit transaction
                            db.run('COMMIT', (commitErr) => {
                              if (commitErr) {
                                console.error('Error committing transaction:', commitErr.message);
                                db.run('ROLLBACK');
                              } else {
                                console.log('Transaction committed successfully');
                              }
                              
                              // Re-enable foreign key constraints
                              db.run('PRAGMA foreign_keys = ON', (fkOnErr) => {
                                if (fkOnErr) {
                                  console.error('Error re-enabling foreign keys:', fkOnErr.message);
                                } else {
                                  console.log('Foreign keys re-enabled');
                                  console.log('Groups table successfully migrated with icon and color fields');
                                }
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            } else {
              console.log('Groups table already has icon and color fields');
            }
          });
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
          type TEXT NOT NULL CHECK (type IN ('settlement_request', 'settlement_notification', 'funding_notification', 'payment_request', 'payment_reminder', 'general')),
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
          
          // Check if payment_reminder type migration is needed
          db.all('PRAGMA table_info(notifications)', (pragmaErr, columns) => {
            if (pragmaErr) {
              console.error('Error checking notifications table structure:', pragmaErr.message);
              return;
            }
            
            // Check the CHECK constraint on type column
            db.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'`, (schemaErr, schema) => {
              if (schemaErr) {
                console.error('Error checking notifications schema:', schemaErr.message);
                return;
              }
              
              const tableSchema = schema[0]?.sql || '';
              const hasPaymentReminder = tableSchema.includes('payment_reminder');
              
              if (!hasPaymentReminder) {
                console.log('Adding payment_reminder type to notifications table...');
                
                // Clean up any leftover migration tables first
                db.run(`DROP TABLE IF EXISTS notifications_new`, (cleanupErr) => {
                  if (cleanupErr) {
                    console.error('Error cleaning up notifications migration table:', cleanupErr.message);
                    return;
                  }
                  
                  // Migration to add payment_reminder type to existing table
                  db.run(`
                    CREATE TABLE notifications_new (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      user_id INTEGER NOT NULL,
                      title TEXT NOT NULL,
                      message TEXT NOT NULL,
                      type TEXT NOT NULL CHECK (type IN ('settlement_request', 'settlement_notification', 'funding_notification', 'payment_request', 'payment_reminder', 'general')),
                      data TEXT DEFAULT '{}',
                      read INTEGER DEFAULT 0 CHECK (read IN (0, 1)),
                      created_at TEXT NOT NULL,
                      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                  `, (migrationErr) => {
                    if (migrationErr) {
                      console.error('Error creating new notifications table:', migrationErr.message);
                      return;
                    }
                    
                    // Copy existing data
                    db.run(`INSERT INTO notifications_new SELECT * FROM notifications`, (copyErr) => {
                      if (copyErr) {
                        console.error('Error copying notifications data:', copyErr.message);
                        return;
                      }
                      
                      // Drop old table and rename new one
                      db.run(`DROP TABLE notifications`, (dropErr) => {
                        if (dropErr) {
                          console.error('Error dropping old notifications table:', dropErr.message);
                          return;
                        }
                        
                        db.run(`ALTER TABLE notifications_new RENAME TO notifications`, (renameErr) => {
                          if (renameErr) {
                            console.error('Error renaming notifications table:', renameErr.message);
                          } else {
                            console.log('Notifications table updated with payment_reminder type');
                          }
                        });
                      });
                    });
                  });
                });
              } else {
                console.log('Notifications table already supports payment_reminder type');
              }
            });
          });
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