const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'wesplit.db');

console.log('Attempting to reset database connection...');

// Close any existing connections
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  
  console.log('Database opened successfully');
  
  // Set WAL mode
  db.run('PRAGMA journal_mode = WAL', (err) => {
    if (err) {
      console.error('Error setting WAL mode:', err.message);
    } else {
      console.log('WAL mode set successfully');
    }
    
    // Set busy timeout
    db.run('PRAGMA busy_timeout = 5000', (err) => {
      if (err) {
        console.error('Error setting busy timeout:', err.message);
      } else {
        console.log('Busy timeout set successfully');
      }
      
      // Test a simple query
      db.get('SELECT COUNT(*) as count FROM expenses', (err, row) => {
        if (err) {
          console.error('Error testing database:', err.message);
        } else {
          console.log('Database test successful. Expense count:', row.count);
        }
        
        // Close the connection
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed successfully');
            console.log('Database reset complete. You can now restart your server.');
          }
        });
      });
    });
  });
}); 