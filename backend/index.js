const express = require('express');
const cors = require('cors');
const pool = require('./db');
const authService = require('./services/authService');
const security = require('./middleware/security');
const monitoringService = require('./services/monitoringService');
const emailVerificationService = require('./services/emailVerificationService');
require('dotenv').config();

const app = express();

// Security middleware
app.use(security.helmet);
app.use(security.cors);
app.use(security.generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(security.sanitizeInput);

// Monitoring middleware
app.use(monitoringService.requestTracker());

// Cleanup expired tokens every hour
setInterval(() => {
  authService.cleanupExpired();
}, 60 * 60 * 1000);

// Migration to add splitData column to expenses table
const runMigrations = async () => {
  try {
    // Check if splitData column exists in expenses table
    const tableInfo = await pool.query('PRAGMA table_info(expenses)');
    const hasColumn = tableInfo.rows.some(col => col.name === 'splitData');
    
    if (!hasColumn) {
      await pool.run(`
        ALTER TABLE expenses ADD COLUMN splitData TEXT DEFAULT NULL
      `);
      console.log('Added splitData column to expenses table');
    } else {
      console.log('splitData column already exists in expenses table');
    }
    
    console.log('Database migrations completed');
    
    

// Create sample data if database is empty
const createSampleDataIfEmpty = async () => {
  try {
    // Check if there are any users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const groupCount = await pool.query('SELECT COUNT(*) as count FROM groups');
    
    if (userCount.rows[0].count === 0) {
      console.log('Creating sample data...');
      
      // Create sample users
      const user1 = await pool.run(
        'INSERT INTO users (email, name, wallet_address, wallet_public_key, avatar) VALUES (?, ?, ?, ?, ?)',
        ['john@example.com', 'John Doe', 'wallet1address', 'publickey1', 'user.png']
      );
      
      const user2 = await pool.run(
        'INSERT INTO users (email, name, wallet_address, wallet_public_key, avatar) VALUES (?, ?, ?, ?, ?)',
        ['jane@example.com', 'Jane Smith', 'wallet2address', 'publickey2', 'user.png']
      );
      
      const user3 = await pool.run(
        'INSERT INTO users (email, name, wallet_address, wallet_public_key, avatar) VALUES (?, ?, ?, ?, ?)',
        ['bob@example.com', 'Bob Johnson', 'wallet3address', 'publickey3', 'user.png']
      );
      
      const userId1 = user1.rows[0].id;
      const userId2 = user2.rows[0].id;
      const userId3 = user3.rows[0].id;
      
      console.log('Created sample users:', { userId1, userId2, userId3 });
      
      // Create sample groups
      const group1 = await pool.run(
        'INSERT INTO groups (name, description, category, currency, created_by) VALUES (?, ?, ?, ?, ?)',
        ['Weekend Trip', 'Our amazing weekend getaway', 'travel', 'USDC', userId1]
      );
      
      const group2 = await pool.run(
        'INSERT INTO groups (name, description, category, currency, created_by) VALUES (?, ?, ?, ?, ?)',
        ['Dinner Group', 'Weekly dinner expenses', 'food', 'USDC', userId2]
      );
      
      const groupId1 = group1.rows[0].id;
      const groupId2 = group2.rows[0].id;
      
      console.log('Created sample groups:', { groupId1, groupId2 });
      
      // Add members to groups
      await pool.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId1, userId1]);
      await pool.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId1, userId2]);
      await pool.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId1, userId3]);
      
      await pool.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId2, userId1]);
      await pool.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId2, userId2]);
      
      console.log('Added group members');
      
      // Create sample expenses
      await pool.run(
        'INSERT INTO expenses (group_id, description, amount, currency, paid_by, category) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId1, 'Hotel accommodation', 120.50, 'USDC', userId1, 'accommodation']
      );
      
      await pool.run(
        'INSERT INTO expenses (group_id, description, amount, currency, paid_by, category) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId1, 'Gas for the trip', 45.20, 'USDC', userId2, 'transport']
      );
      
      await pool.run(
        'INSERT INTO expenses (group_id, description, amount, currency, paid_by, category) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId1, 'Groceries for breakfast', 28.75, 'USDC', userId3, 'food']
      );
      
      await pool.run(
        'INSERT INTO expenses (group_id, description, amount, currency, paid_by, category) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId2, 'Pizza dinner', 42.00, 'USDC', userId1, 'food']
      );
      
      await pool.run(
        'INSERT INTO expenses (group_id, description, amount, currency, paid_by, category) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId2, 'Thai food delivery', 38.50, 'USDC', userId2, 'food']
      );
      
      console.log('Created sample expenses');
      console.log('Sample data creation completed!');
    } else {
      console.log('Database already has data, skipping sample data creation');
    }
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
};

// Run migrations on startup
runMigrations();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = await monitoringService.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Metrics endpoint (for monitoring)
app.get('/api/metrics', (req, res) => {
  res.json(monitoringService.getMetrics());
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!', timestamp: new Date().toISOString() });
});

// Test endpoint for groups data
app.get('/api/test/groups/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Testing groups fetch for user ${userId}`);
    
    // Get groups with all aggregated data (same as main endpoint)
    const result = await pool.query(`
      SELECT g.*, 
             COUNT(DISTINCT gm.user_id) as member_count,
             COUNT(DISTINCT e.id) as expense_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN expenses e ON g.id = e.group_id
      WHERE g.created_by = ? OR gm.user_id = ?
      GROUP BY g.id
      ORDER BY g.updated_at DESC
    `, [userId, userId]);
    
    console.log(`Found ${result.rows.length} groups for user ${userId}`);
    
    // For each group, get expenses grouped by currency
    const groupsWithExpenses = await Promise.all(result.rows.map(async (group) => {
      const expensesResult = await pool.query(`
        SELECT currency, SUM(amount) as total_amount
        FROM expenses 
        WHERE group_id = ?
        GROUP BY currency
      `, [group.id]);
      
      console.log(`Group ${group.name} has ${expensesResult.rows.length} expense currencies`);
      
      return {
        ...group,
        expenses_by_currency: expensesResult.rows
      };
    }));
    
    console.log('Groups with expenses:', JSON.stringify(groupsWithExpenses, null, 2));
    
    res.json({
      message: 'Groups test successful',
      userId: userId,
      groupCount: groupsWithExpenses.length,
      groups: groupsWithExpenses
    });
  } catch (err) {
    console.error('Error in groups test:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// === SECURE AUTHENTICATION ENDPOINTS ===

// Helper function to check if user verified this month
const hasVerifiedThisMonth = (lastVerifiedAt) => {
  if (!lastVerifiedAt) return false;
  
  const lastVerified = new Date(lastVerifiedAt);
  const now = new Date();
  
  // Check if same month and year
  return lastVerified.getMonth() === now.getMonth() && 
         lastVerified.getFullYear() === now.getFullYear();
};

// Send verification code (signup or login)
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    await emailVerificationService.sendVerificationCode(email);
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending verification code:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify code
app.post('/api/auth/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
  try {
    const result = await emailVerificationService.verifyCode(email, code);
    if (result.success) {
    res.json({
        success: true,
        message: 'Code verified successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
    });
    } else {
      res.status(400).json({ error: result.error || 'Invalid code' });
    }
  } catch (err) {
    console.error('Error verifying code:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Refresh token
app.post('/api/auth/refresh', security.authLimiter, security.validateRequired(['refreshToken']), async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    const result = await authService.refreshAccessToken(refreshToken);
    
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    
    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
    
  } catch (err) {
    console.error('Error refreshing token:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
app.post('/api/auth/logout', security.validateRequired(['refreshToken']), async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    const result = await authService.logout(refreshToken);
    if (result.success) {
    res.json({ message: 'Logged out successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error('Error logging out:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// === LEGACY ENDPOINTS (for backward compatibility) ===

app.get('/api/users/findByEmail', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/users/create', async (req, res) => {
  const { email, name, walletAddress, walletPublicKey, walletSecretKey, avatar } = req.body;
  
  if (!email || !name || !walletAddress || !walletPublicKey) {
    return res.status(400).json({ error: 'Email, name, wallet address, and wallet public key are required' });
  }

  try {
    console.log('Attempting to create user:', { email, name, walletAddress });
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('User already exists:', existingUser.rows[0].email);
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const result = await pool.run(
      'INSERT INTO users (email, name, wallet_address, wallet_public_key, wallet_secret_key, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [email, name, walletAddress, walletPublicKey, walletSecretKey || null, avatar || null]
    );

    // Get the created user
    const newUserResult = await pool.query('SELECT * FROM users WHERE id = ?', [result.rows[0].id]);
    const newUser = newUserResult.rows[0];
    
    console.log('User created successfully:', { id: newUser.id, email: newUser.email, name: newUser.name });
    
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      walletAddress: newUser.wallet_address,
      walletPublicKey: newUser.wallet_public_key,
      avatar: newUser.avatar,
      createdAt: newUser.created_at
    });
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 'SQLITE_BUSY') {
      res.status(503).json({ error: 'Database temporarily unavailable, please try again' });
    } else {
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User logged in successfully:', { id: user.id, email: user.email, name: user.name });
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.wallet_address,
        walletPublicKey: user.wallet_public_key,
        avatar: user.avatar,
        createdAt: user.created_at
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update user avatar endpoint
app.put('/api/users/:userId/avatar', async (req, res) => {
  const { userId } = req.params;
  const { avatar } = req.body;
  
  if (!avatar) {
    return res.status(400).json({ error: 'Avatar is required' });
  }

  try {
    const result = await pool.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatar, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the updated user
    const userResult = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      walletAddress: user.wallet_address,
      walletPublicKey: user.wallet_public_key,
      avatar: user.avatar,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Error updating user avatar:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Groups endpoints
app.get('/api/groups/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT g.*, 
             COUNT(DISTINCT gm.user_id) as member_count,
             COUNT(DISTINCT e.id) as expense_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN expenses e ON g.id = e.group_id
      WHERE g.created_by = ? OR gm.user_id = ?
      GROUP BY g.id
      ORDER BY g.updated_at DESC
    `, [userId, userId]);
    
    // For each group, get expenses grouped by currency
    const groupsWithExpenses = await Promise.all(result.rows.map(async (group) => {
      const expensesResult = await pool.query(`
        SELECT currency, SUM(amount) as total_amount
        FROM expenses 
        WHERE group_id = ?
        GROUP BY currency
      `, [group.id]);
      
      return {
        ...group,
        expenses_by_currency: expensesResult.rows
      };
    }));
    
    res.json(groupsWithExpenses);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  const { name, description, category, currency, createdBy, members } = req.body;
  
  if (!name || !createdBy) {
    return res.status(400).json({ error: 'Group name and creator are required' });
  }

  try {
    // Create group
    const groupResult = await pool.run(
      'INSERT INTO groups (name, description, category, currency, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
      [name, description || '', category || 'general', currency || 'USDC', createdBy]
    );
    
    const groupId = groupResult.rows[0].id;
    
    // Add creator as member
    await pool.run(
      'INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, datetime("now"))',
      [groupId, createdBy]
    );
    
    // Add other members
    if (members && members.length > 0) {
      for (const memberId of members) {
        if (memberId !== createdBy) {
          await pool.run(
            'INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, datetime("now"))',
            [groupId, memberId]
          );
        }
      }
    }
    
    // Get the created group with member count and expenses by currency
    const groupData = await pool.query(`
      SELECT g.*, 
             COUNT(DISTINCT gm.user_id) as member_count,
             COUNT(DISTINCT e.id) as expense_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN expenses e ON g.id = e.group_id
      WHERE g.id = ?
      GROUP BY g.id
    `, [groupId]);
    
    // Get expenses grouped by currency
    const expensesResult = await pool.query(`
      SELECT currency, SUM(amount) as total_amount
      FROM expenses 
      WHERE group_id = ?
      GROUP BY currency
    `, [groupId]);
    
    const groupWithExpenses = {
      ...groupData.rows[0],
      expenses_by_currency: expensesResult.rows
    };
    
    res.status(201).json(groupWithExpenses);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get group members endpoint
app.get('/api/groups/:groupId/members', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const membersResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.wallet_address
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY u.name
    `, [groupId]);
    
    res.json(membersResult.rows);
  } catch (err) {
    console.error('Error getting group members:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get all contacts a user has met in groups
app.get('/api/users/:userId/contacts', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get all unique users that the current user has met in groups
    const contactsResult = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.wallet_address, 
             MIN(gm.joined_at) as first_met_at,
             COUNT(DISTINCT g.id) as mutual_groups_count
      FROM group_members gm1
      JOIN groups g ON gm1.group_id = g.id
      JOIN group_members gm ON g.id = gm.group_id
      JOIN users u ON gm.user_id = u.id
      WHERE gm1.user_id = ? AND gm.user_id != ?
      GROUP BY u.id, u.name, u.email, u.wallet_address
      ORDER BY mutual_groups_count DESC, u.name ASC
    `, [userId, userId]);
    
    res.json(contactsResult.rows);
  } catch (err) {
    console.error('Error getting user contacts:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Expenses endpoints
app.get('/api/expenses/:groupId', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT e.*, u.name as paid_by_name, u.wallet_address as paid_by_wallet
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      ORDER BY e.created_at DESC
    `, [groupId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/expenses', security.authenticateToken, security.validateRequired(['description', 'amount', 'paidBy', 'groupId']), security.validateNumeric(['amount']), async (req, res) => {
  const { description, amount, currency, paidBy, splitBetween, groupId, category, splitType, splitData } = req.body;
  
  // Ensure user can only create expenses for themselves
  if (parseInt(paidBy) !== parseInt(req.user.userId)) {
    return res.status(403).json({ error: 'You can only create expenses for yourself' });
  }

  try {
    // Create the main expense
    const result = await pool.run(
      'INSERT INTO expenses (description, amount, currency, paid_by, group_id, category, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [description, amount, currency || 'USDC', paidBy, groupId, category || 'general']
    );
    
    const expenseId = result.rows[0].id;
    
    // Handle split data - store it as JSON in a new table or as metadata
    // For now, let's add the split information to the response for frontend processing
    // In a real app, you might want a separate expense_splits table
    
    // Update group's updated_at timestamp
    await pool.run(
      'UPDATE groups SET updated_at = datetime("now") WHERE id = ?',
      [groupId]
    );
    
    // Get the created expense
    const expenseData = await pool.query(`
      SELECT e.*, u.name as paid_by_name, u.wallet_address as paid_by_wallet
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.id = ?
    `, [expenseId]);
    
    const expense = expenseData.rows[0];
    
    // Add split information to the response
    expense.splitType = splitType || 'equal';
    expense.splitData = splitData || { memberIds: [] };
    
    res.status(201).json(expense);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update expense endpoint
app.put('/api/expenses/:expenseId', async (req, res) => {
  const { expenseId } = req.params;
  const { description, amount, currency, category } = req.body;
  
  console.log('Backend: Update expense request:', { expenseId, description, amount, currency, category });
  
  if (!description || !amount) {
    return res.status(400).json({ error: 'Description and amount are required' });
  }

  try {
    // First check if the expense exists and get the group_id
    const existingExpense = await pool.query(`
      SELECT e.*, g.id as group_id
      FROM expenses e
      JOIN groups g ON e.group_id = g.id
      WHERE e.id = ?
    `, [expenseId]);
    
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    // Update the expense
    const currencyToUpdate = currency !== undefined ? currency : expense.currency;
    console.log('Backend: Updating expense with currency:', currencyToUpdate);
    
    await pool.run(
      'UPDATE expenses SET description = ?, amount = ?, currency = ?, category = ? WHERE id = ?',
      [description, amount, currencyToUpdate, category || expense.category, expenseId]
    );
    
    // Update group's updated_at timestamp
    await pool.run(
      'UPDATE groups SET updated_at = datetime("now") WHERE id = ?',
      [expense.group_id]
    );
    
    // Get the updated expense
    const updatedExpense = await pool.query(`
      SELECT e.*, u.name as paid_by_name, u.wallet_address as paid_by_wallet
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.id = ?
    `, [expenseId]);
    
    console.log('Backend: Updated expense response:', updatedExpense.rows[0]);
    res.json(updatedExpense.rows[0]);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Delete expense endpoint
app.delete('/api/expenses/:expenseId', async (req, res) => {
  const { expenseId } = req.params;
  
  try {
    // First check if the expense exists and get the group_id
    const existingExpense = await pool.query(`
      SELECT e.*, g.id as group_id
      FROM expenses e
      JOIN groups g ON e.group_id = g.id
      WHERE e.id = ?
    `, [expenseId]);
    
    if (existingExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    const expense = existingExpense.rows[0];
    
    // Delete the expense
    await pool.run('DELETE FROM expenses WHERE id = ?', [expenseId]);
    
    // Update group's updated_at timestamp
    await pool.run(
      'UPDATE groups SET updated_at = datetime("now") WHERE id = ?',
      [expense.group_id]
    );
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Generate invite link endpoint
app.post('/api/groups/:groupId/invite', async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  
  try {
    // Check if the group exists
    const groupResult = await pool.query(`
      SELECT g.*, u.name as creator_name
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `, [groupId]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const group = groupResult.rows[0];
    
    // Check if user is a member of the group
    const memberResult = await pool.query(`
      SELECT * FROM group_members 
      WHERE group_id = ? AND user_id = ?
    `, [groupId, userId]);
    
    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'You must be a member of the group to generate invite links' });
    }
    
    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store the invite code in the database
    await pool.run(`
      INSERT INTO group_invites (group_id, invite_code, created_by, created_at, expires_at)
      VALUES (?, ?, ?, datetime("now"), datetime("now", "+7 days"))
    `, [groupId, inviteCode, userId]);
    
    // Create the invite link
    const inviteLink = `wesplit://invite/${inviteCode}`;
    
    res.json({
      inviteLink,
      inviteCode,
      groupName: group.name,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    console.error('Error generating invite link:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get current invite code endpoint
app.get('/api/groups/:groupId/invite-code', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    // Get the most recent valid invite code for the group
    const inviteResult = await pool.query(`
      SELECT invite_code, expires_at
      FROM group_invites 
      WHERE group_id = ? AND used = FALSE AND expires_at > datetime("now")
      ORDER BY created_at DESC
      LIMIT 1
    `, [groupId]);
    
    if (inviteResult.rows.length === 0) {
      // If no valid invite code exists, create one automatically
      const groupResult = await pool.query(`
        SELECT g.*, u.name as creator_name
        FROM groups g
        JOIN users u ON g.created_by = u.id
        WHERE g.id = ?
      `, [groupId]);
      
      if (groupResult.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      const group = groupResult.rows[0];
      
      // Generate a new invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store the invite code in the database
      await pool.run(`
        INSERT INTO group_invites (group_id, invite_code, created_by, created_at, expires_at)
        VALUES (?, ?, ?, datetime("now"), datetime("now", "+7 days"))
      `, [groupId, inviteCode, group.created_by]);
      
      res.json({
        inviteCode,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    } else {
      const invite = inviteResult.rows[0];
      
      res.json({
        inviteCode: invite.invite_code,
        expiresAt: invite.expires_at
      });
    }
  } catch (err) {
    console.error('Error getting invite code:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Join group via invite code endpoint
app.post('/api/groups/join/:inviteCode', async (req, res) => {
  const { inviteCode } = req.params;
  const { userId } = req.body;
  
  try {
    // Check if the invite code exists and is valid
    const inviteResult = await pool.query(`
      SELECT gi.*, g.name as group_name, g.id as group_id
      FROM group_invites gi
      JOIN groups g ON gi.group_id = g.id
      WHERE gi.invite_code = ? AND gi.used = FALSE AND gi.expires_at > datetime("now")
    `, [inviteCode]);
    
    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }
    
    const invite = inviteResult.rows[0];
    
    // Check if user is already a member of the group
    const existingMember = await pool.query(`
      SELECT * FROM group_members 
      WHERE group_id = ? AND user_id = ?
    `, [invite.group_id, userId]);
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }
    
    // Add user to the group
    await pool.run(`
      INSERT INTO group_members (group_id, user_id, joined_at)
      VALUES (?, ?, datetime("now"))
    `, [invite.group_id, userId]);
    
    // Mark the invite as used
    await pool.run(`
      UPDATE group_invites SET used = TRUE WHERE invite_code = ?
    `, [inviteCode]);
    
    res.json({
      message: 'Successfully joined group',
      groupId: invite.group_id,
      groupName: invite.group_name
    });
  } catch (err) {
    console.error('Error joining group via invite:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Leave group endpoint
app.post('/api/groups/:groupId/leave', async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  
  try {
    // Check if user is a member of the group
    const memberResult = await pool.query(`
      SELECT * FROM group_members 
      WHERE group_id = ? AND user_id = ?
    `, [groupId, userId]);
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a member of this group' });
    }
    
    // Check if user is the only member of the group
    const memberCountResult = await pool.query(`
      SELECT COUNT(*) as member_count FROM group_members 
      WHERE group_id = ?
    `, [groupId]);
    
    const memberCount = memberCountResult.rows[0].member_count;
    
    if (memberCount === 1) {
      return res.status(400).json({ 
        error: 'Cannot leave group when you are the only member. Please delete the group instead.' 
      });
    }
    
    // Remove user from the group
    await pool.run(`
      DELETE FROM group_members 
      WHERE group_id = ? AND user_id = ?
    `, [groupId, userId]);
    
    res.json({ message: 'Successfully left the group' });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get group details endpoint
app.get('/api/groups/details/:groupId', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Group not found' });
    }
  } catch (err) {
    console.error('Error fetching group details:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update group endpoint
app.put('/api/groups/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { userId, name, description, category, currency, icon, color } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!name && !description && !category && !currency && !icon && !color) {
    return res.status(400).json({ error: 'At least one field to update is required' });
  }

  try {
    // Check if group exists and user is a member (or creator)
    const groupResult = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member of the group
    const memberResult = await pool.query(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'User is not a member of this group' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (category) {
      updates.push('category = ?');
      values.push(category);
    }
    if (currency) {
      updates.push('currency = ?');
      values.push(currency);
    }
    if (icon) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (color) {
      updates.push('color = ?');
      values.push(color);
    }
    
    updates.push('updated_at = datetime("now")');
    values.push(groupId);

    const updateQuery = `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`;
    
    await pool.run(updateQuery, values);

    // Fetch and return the updated group
    const updatedGroupResult = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);
    const updatedGroup = updatedGroupResult.rows[0];

    res.json({
      message: 'Group updated successfully',
      group: updatedGroup
    });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Delete group endpoint
app.delete('/api/groups/:groupId', async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  
  try {
    // Check if the group exists and user is the creator
    const groupResult = await pool.query(`
      SELECT * FROM groups 
      WHERE id = ? AND created_by = ?
    `, [groupId, userId]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found or you are not the creator' });
    }
    
    // Delete all expenses in the group
    await pool.run(`
      DELETE FROM expenses WHERE group_id = ?
    `, [groupId]);
    
    // Delete all group members
    await pool.run(`
      DELETE FROM group_members WHERE group_id = ?
    `, [groupId]);
    
    // Delete all invite codes for this group
    await pool.run(`
      DELETE FROM group_invites WHERE group_id = ?
    `, [groupId]);
    
    // Delete the group
    await pool.run(`
      DELETE FROM groups WHERE id = ?
    `, [groupId]);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Wallet management endpoints
app.get('/api/users/:userId/wallet', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query('SELECT wallet_address, wallet_public_key FROM users WHERE id = ?', [userId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error fetching wallet info:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.put('/api/users/:userId/wallet', async (req, res) => {
  const { userId } = req.params;
  const { walletAddress, walletPublicKey } = req.body;
  
  if (!walletAddress || !walletPublicKey) {
    return res.status(400).json({ error: 'Wallet address and public key are required' });
  }

  try {
    await pool.run(
      'UPDATE users SET wallet_address = ?, wallet_public_key = ? WHERE id = ?',
      [walletAddress, walletPublicKey, userId]
    );
    
    res.json({ message: 'Wallet updated successfully' });
  } catch (err) {
    console.error('Error updating wallet:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// MoonPay integration endpoints
app.post('/api/moonpay/create-url', async (req, res) => {
  const { walletAddress, amount, currency = 'SOL' } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    // MoonPay configuration
    const MOONPAY_API_KEY = process.env.MOONPAY_API_KEY || 'pk_test_1234567890abcdef'; // Replace with your actual MoonPay API key
    const MOONPAY_BASE_URL = 'https://buy.moonpay.com';
    
    // Build MoonPay URL with parameters
    const params = new URLSearchParams({
      apiKey: MOONPAY_API_KEY,
      currencyCode: currency,
      walletAddress: walletAddress,
      redirectURL: 'wesplit://moonpay-success',
      failureRedirectURL: 'wesplit://moonpay-failure'
    });
    
    if (amount) {
      params.append('baseCurrencyAmount', amount.toString());
    }
    
    const moonpayUrl = `${MOONPAY_BASE_URL}?${params.toString()}`;
    
    res.json({
      url: moonpayUrl,
      walletAddress,
      currency,
      amount
    });
  } catch (err) {
    console.error('Error creating MoonPay URL:', err);
    res.status(500).json({ error: 'Failed to create MoonPay URL', details: err.message });
  }
});


  } catch (err) {
    console.error('Error checking MoonPay status:', err);
    res.status(500).json({ error: 'Failed to check transaction status', details: err.message });
  }
});

// Group Wallet endpoints
app.post('/api/groups/:groupId/wallet', async (req, res) => {
  const { groupId } = req.params;
  const { walletAddress, walletPublicKey, walletSecretKey, createdBy, currency = 'USDC' } = req.body;
  
  if (!walletAddress || !walletPublicKey || !createdBy) {
    return res.status(400).json({ error: 'Wallet address, public key, and creator are required' });
  }

  try {
    // Check if group wallet already exists
    const existingWallet = await pool.query(`
      SELECT * FROM group_wallets WHERE group_id = ?
    `, [groupId]);
    
    if (existingWallet.rows.length > 0) {
      return res.status(400).json({ error: 'Group wallet already exists' });
    }

    // Create group wallet
    const result = await pool.run(`
      INSERT INTO group_wallets (group_id, wallet_address, wallet_public_key, wallet_secret_key, balance, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, datetime("now"), datetime("now"))
    `, [groupId, walletAddress, walletPublicKey, walletSecretKey, currency]);
    
    const walletId = result.rows[0].id;
    
    // Get the created wallet
    const walletData = await pool.query(`
      SELECT * FROM group_wallets WHERE id = ?
    `, [walletId]);
    
    res.status(201).json(walletData.rows[0]);
  } catch (err) {
    console.error('Error creating group wallet:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/groups/:groupId/wallet', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT * FROM group_wallets WHERE group_id = ?
    `, [groupId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Group wallet not found' });
    }
  } catch (err) {
    console.error('Error fetching group wallet:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/groups/:groupId/wallet/fund', async (req, res) => {
  const { groupId } = req.params;
  const { userId, amount, currency = 'USDC', fromAddress, memo } = req.body;
  
  if (!userId || !amount || !fromAddress) {
    return res.status(400).json({ error: 'User ID, amount, and from address are required' });
  }

  try {
    // Get group wallet
    const walletResult = await pool.query(`
      SELECT * FROM group_wallets WHERE group_id = ?
    `, [groupId]);
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group wallet not found' });
    }
    
    const groupWallet = walletResult.rows[0];
    
    // Create transaction record
    const transactionResult = await pool.run(`
      INSERT INTO group_wallet_transactions (
        group_wallet_id, from_address, amount, currency, 
        transaction_type, user_id, memo, status, created_at
      ) VALUES (?, ?, ?, ?, 'deposit', ?, ?, 'completed', datetime("now"))
    `, [groupWallet.id, fromAddress, amount, currency, userId, memo || 'Group wallet funding']);
    
    // Update wallet balance
    await pool.run(`
      UPDATE group_wallets 
      SET balance = balance + ?, updated_at = datetime("now")
      WHERE id = ?
    `, [amount, groupWallet.id]);
    
    // Get updated transaction
    const transactionData = await pool.query(`
      SELECT * FROM group_wallet_transactions WHERE id = ?
    `, [transactionResult.rows[0].id]);
    
    res.status(201).json(transactionData.rows[0]);
  } catch (err) {
    console.error('Error funding group wallet:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/groups/:groupId/settle', async (req, res) => {
  const { groupId } = req.params;
  const { userId, settlementType = 'individual' } = req.body;
  
  try {
    // Get user information
    const userResult = await pool.query(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get all group members
    const membersResult = await pool.query(`
      SELECT u.id, u.name, u.wallet_address 
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `, [groupId]);
    
    const members = membersResult.rows;
    
    // Get all expenses for balance calculation
    const expensesResult = await pool.query(`
      SELECT paid_by, amount, currency, splitType, splitData FROM expenses WHERE group_id = ?
    `, [groupId]);
    
    const expenses = expensesResult.rows;
    
    // Calculate balances for all members in their original currencies
    const balances = {};
    members.forEach(member => {
      balances[member.id] = { owes: {}, owed: {}, netBalance: {} };
    });
    
    expenses.forEach(expense => {
      const paidBy = expense.paid_by;
      const currency = expense.currency;
      const amount = expense.amount;
      
      // Parse split data if it exists
      let splitData;
      try {
        splitData = expense.splitData ? JSON.parse(expense.splitData) : null;
      } catch (e) {
        console.warn('Failed to parse split data:', expense.splitData);
        splitData = null;
      }
      
      // Determine who owes what based on split type
      let membersInSplit = [];
      let amountPerPerson = 0;
      
      if (splitData && splitData.memberIds) {
        // Use the specific member IDs from split data
        membersInSplit = splitData.memberIds;
        amountPerPerson = splitData.amountPerPerson || (amount / membersInSplit.length);
      } else {
        // Fallback: split equally among all group members
        membersInSplit = members.map(m => m.id);
        amountPerPerson = amount / membersInSplit.length;
      }
      
      // Initialize currency tracking if not exists
      members.forEach(member => {
        if (!balances[member.id].owes[currency]) {
          balances[member.id].owes[currency] = 0;
          balances[member.id].owed[currency] = 0;
          balances[member.id].netBalance[currency] = 0;
        }
      });
      
      // The person who paid should be reimbursed by the selected members
      membersInSplit.forEach(memberId => {
        if (memberId !== paidBy) {
          // Each selected member owes their share to the payer
          balances[memberId].owes[currency] += amountPerPerson;
          // The payer is owed this amount from each selected member
          balances[paidBy].owed[currency] += amountPerPerson;
        }
      });
    });
    
    // Calculate net balances for each currency
    Object.keys(balances).forEach(memberId => {
      const id = parseInt(memberId);
      Object.keys(balances[id].owes).forEach(currency => {
        balances[id].netBalance[currency] = balances[id].owed[currency] - balances[id].owes[currency];
      });
    });
    
    if (settlementType === 'individual') {
      // Settle only for the requesting user
      const userBalance = balances[parseInt(userId)];
      
      if (!userBalance) {
        return res.status(400).json({ error: 'User not found in group' });
      }
      
      // Check if user owes money in any currency
      const currenciesOwed = Object.keys(userBalance.netBalance).filter(
        currency => userBalance.netBalance[currency] < 0
      );
      
      if (currenciesOwed.length === 0) {
        return res.status(400).json({ 
          error: 'You don\'t owe any money to the group. You\'re either settled up or owed money by others.' 
        });
      }
      
      const settlements = [];
      let totalDebtInGroupWalletCurrency = 0;
      
      // For each currency the user owes money in
      for (const currency of currenciesOwed) {
        const amountOwed = Math.abs(userBalance.netBalance[currency]);
        
        // For now, let's assume group wallet uses the same currency or we convert
        // In a real app, you'd need currency conversion here
        totalDebtInGroupWalletCurrency += amountOwed;
        
        // Find creditors in this currency (people owed money)
        const creditors = Object.entries(balances)
          .filter(([id, balance]) => balance.netBalance[currency] > 0)
          .map(([id, balance]) => ({
            id: parseInt(id),
            amount: balance.netBalance[currency],
            member: members.find(m => m.id === parseInt(id))
          }));
        
        // Distribute the payment proportionally to creditors
        let remainingDebt = amountOwed;
        for (const creditor of creditors) {
          if (remainingDebt <= 0) break;
          
          const paymentAmount = Math.min(remainingDebt, creditor.amount);
          
          // Track the settlement payment (no actual group wallet transaction)
          // This represents that the user will pay this amount from their personal wallet
          settlements.push({
            userId: creditor.id,
            amount: paymentAmount,
            currency: currency,
            address: creditor.member.wallet_address,
            name: creditor.member.name
          });
          
          remainingDebt -= paymentAmount;
        }
      }
      
      // Create settlement record in a personal settlements table (we'll create this if it doesn't exist)
      // This tracks that the user has made a settlement payment from their personal wallet
      try {
        await pool.run(`
          INSERT INTO personal_settlements (
            group_id, user_id, amount, currency, settlement_type, 
            creditors_data, status, created_at
          ) VALUES (?, ?, ?, 'USDC', 'individual', ?, 'completed', datetime("now"))
        `, [
          groupId, 
          userId, 
          totalDebtInGroupWalletCurrency,
          JSON.stringify(settlements)
        ]);
      } catch (tableError) {
        // If table doesn't exist, create it first
        await pool.run(`
          CREATE TABLE IF NOT EXISTS personal_settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USDC',
            settlement_type TEXT DEFAULT 'individual',
            creditors_data TEXT,
            status TEXT DEFAULT 'completed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        
        // Now insert the settlement record
        await pool.run(`
          INSERT INTO personal_settlements (
            group_id, user_id, amount, currency, settlement_type, 
            creditors_data, status, created_at
          ) VALUES (?, ?, ?, 'USDC', 'individual', ?, 'completed', datetime("now"))
        `, [
          groupId, 
          userId, 
          totalDebtInGroupWalletCurrency,
          JSON.stringify(settlements)
        ]);
      }
      
      res.json({
        message: 'Individual settlement completed successfully',
        amountSettled: totalDebtInGroupWalletCurrency,
        settlements: settlements
      });
      
    } else {
      // Full settlement for all group members using personal wallets
      const settlements = [];
      
      Object.keys(balances).forEach(memberId => {
        const id = parseInt(memberId);
        const memberBalances = balances[id];
        
        Object.keys(memberBalances.netBalance).forEach(currency => {
          if (memberBalances.netBalance[currency] < 0) { // User owes money
            const member = members.find(m => m.id === id);
            settlements.push({
              userId: id,
              amount: Math.abs(memberBalances.netBalance[currency]),
              currency: currency,
              address: member.wallet_address,
              name: member.name
            });
          }
        });
      });
      
      // Record all settlements (personal wallet payments)
      for (const settlement of settlements) {
        try {
          await pool.run(`
            INSERT INTO personal_settlements (
              group_id, user_id, amount, currency, settlement_type, 
              creditors_data, status, created_at
            ) VALUES (?, ?, ?, ?, 'full', ?, 'completed', datetime("now"))
          `, [
            groupId, 
            settlement.userId, 
            settlement.amount,
            settlement.currency,
            JSON.stringify([{
              userId: settlement.userId,
              amount: settlement.amount,
              currency: settlement.currency,
              address: settlement.address,
              name: settlement.name
            }])
          ]);
        } catch (tableError) {
          // Table creation is handled in individual settlement, so this should work
          console.warn('Settlement recording failed:', tableError);
        }
      }
      
      res.json({
        message: 'Full settlement completed successfully',
        settlements: settlements
      });
    }
  } catch (err) {
    console.error('Error settling group expenses:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/groups/:groupId/wallet/transactions', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    // Get group wallet
    const walletResult = await pool.query(`
      SELECT * FROM group_wallets WHERE group_id = ?
    `, [groupId]);
    
    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group wallet not found' });
    }
    
    const groupWallet = walletResult.rows[0];
    
    // Get all transactions
    const result = await pool.query(`
      SELECT gwt.*, u.name as user_name
      FROM group_wallet_transactions gwt
      LEFT JOIN users u ON gwt.user_id = u.id
      WHERE gwt.group_wallet_id = ?
      ORDER BY gwt.created_at DESC
    `, [groupWallet.id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching group wallet transactions:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Simple endpoint to record a personal settlement payment
app.post('/api/groups/:groupId/record-settlement', async (req, res) => {
  const { groupId } = req.params;
  const { userId, amount, recipientId, currency = 'USDC' } = req.body;
  
  try {
    // Get user and recipient information
    const [userResult, recipientResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = ?', [userId]),
      pool.query('SELECT * FROM users WHERE id = ?', [recipientId])
    ]);
    
    if (userResult.rows.length === 0 || recipientResult.rows.length === 0) {
      return res.status(400).json({ error: 'User or recipient not found' });
    }
    
    const user = userResult.rows[0];
    const recipient = recipientResult.rows[0];
    
    // Create the settlement table if it doesn't exist
    await pool.run(`
      CREATE TABLE IF NOT EXISTS personal_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        recipient_id INTEGER,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USDC',
        settlement_type TEXT DEFAULT 'individual',
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      )
    `);
    
    // Record the settlement
    await pool.run(`
      INSERT INTO personal_settlements (
        group_id, user_id, recipient_id, amount, currency, 
        settlement_type, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'personal_payment', 'completed', datetime("now"))
    `, [groupId, userId, recipientId, amount, currency]);
    
    res.json({
      success: true,
      message: `Settlement of ${amount} ${currency} from ${user.name} to ${recipient.name} recorded successfully`
    });
    
  } catch (err) {
    console.error('Error recording settlement:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/groups/:groupId/settlement-calculation', async (req, res) => {
  const { groupId } = req.params;
  
  try {
    // Get all group members
    const membersResult = await pool.query(`
      SELECT u.id, u.name, u.wallet_address 
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `, [groupId]);
    
    const members = membersResult.rows;
    
    // Get all expenses for balance calculation
    const expensesResult = await pool.query(`
      SELECT paid_by, amount, currency, splitType, splitData FROM expenses WHERE group_id = ?
    `, [groupId]);
    
    const expenses = expensesResult.rows;
    
    // Calculate optimal settlement using simplified debt resolution
    const balances = {};
    members.forEach(member => {
      balances[member.id] = { owes: 0, owed: 0, balance: 0, name: member.name, address: member.wallet_address };
    });
    
    expenses.forEach(expense => {
      const amountPerPerson = expense.amount / members.length;
      const paidBy = expense.paid_by;
      
      balances[paidBy].owed += expense.amount - amountPerPerson;
      
      members.forEach(member => {
        if (member.id !== paidBy) {
          balances[member.id].owes += amountPerPerson;
        }
      });
    });
    
    // Calculate net balances
    Object.keys(balances).forEach(memberId => {
      const id = parseInt(memberId);
      balances[id].balance = balances[id].owed - balances[id].owes;
    });
    
    // Create optimal settlement plan
    const settlements = [];
    const creditors = Object.values(balances).filter(b => b.balance > 0.01);
    const debtors = Object.values(balances).filter(b => b.balance < -0.01);
    
    for (const debtor of debtors) {
      let remaining = Math.abs(debtor.balance);
      
      for (const creditor of creditors) {
        if (remaining <= 0.01 || creditor.balance <= 0.01) continue;
        
        const payment = Math.min(remaining, creditor.balance);
        settlements.push({
          from: debtor.address,
          to: creditor.address,
          amount: payment,
          fromName: debtor.name,
          toName: creditor.name
        });
        
        remaining -= payment;
        creditor.balance -= payment;
      }
    }
    
    res.json(settlements);
  } catch (err) {
    console.error('Error calculating settlement:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Payment reminder endpoints
app.post('/api/groups/:groupId/send-reminder', async (req, res) => {
  const { groupId } = req.params;
  const { senderId, recipientId, amount, reminderType = 'individual' } = req.body;
  
  try {
    // Get sender and recipient information
    const [senderResult, recipientResult, groupResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = ?', [senderId]),
      pool.query('SELECT * FROM users WHERE id = ?', [recipientId]),
      pool.query('SELECT * FROM groups WHERE id = ?', [groupId])
    ]);
    
    if (senderResult.rows.length === 0 || recipientResult.rows.length === 0 || groupResult.rows.length === 0) {
      return res.status(400).json({ error: 'User or group not found' });
    }
    
    const sender = senderResult.rows[0];
    const recipient = recipientResult.rows[0];
    const group = groupResult.rows[0];
    
    // Create reminders table if it doesn't exist
    await pool.run(`
      CREATE TABLE IF NOT EXISTS payment_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        reminder_type TEXT DEFAULT 'individual',
        last_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      )
    `);
    
    // Check if a reminder was sent recently (24-hour cooldown)
    const recentReminderResult = await pool.query(`
      SELECT * FROM payment_reminders 
      WHERE group_id = ? AND sender_id = ? AND recipient_id = ?
      AND datetime(last_sent_at, '+24 hours') > datetime('now')
      ORDER BY last_sent_at DESC
      LIMIT 1
    `, [groupId, senderId, recipientId]);
    
    if (recentReminderResult.rows.length > 0) {
      const lastSent = new Date(recentReminderResult.rows[0].last_sent_at);
      const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
      const timeRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60));
      
      return res.status(429).json({ 
        error: 'Reminder cooldown active',
        message: `You can send another reminder in ${timeRemaining} hours`,
        nextAllowedAt: nextAllowed.toISOString()
      });
    }
    
    // Record the reminder
    await pool.run(`
      INSERT INTO payment_reminders (
        group_id, sender_id, recipient_id, amount, reminder_type, last_sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [groupId, senderId, recipientId, amount, reminderType]);
    
    // Send notification to recipient
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        recipientId,
        'Payment Reminder',
        `${sender.name} is reminding you about a $${amount.toFixed(2)} payment in ${group.name}`,
        'payment_reminder',
        JSON.stringify({
          groupId: groupId,
          senderId: senderId,
          senderName: sender.name,
          amount: amount,
          groupName: group.name
        }),
        0
      ]
    );
    
    res.json({
      success: true,
      message: `Reminder sent to ${recipient.name}`,
      recipientName: recipient.name,
      amount: amount
    });
    
  } catch (err) {
    console.error('Error sending reminder:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/groups/:groupId/send-reminder-all', async (req, res) => {
  const { groupId } = req.params;
  const { senderId, debtors } = req.body; // debtors: [{ recipientId, amount, name }]
  
  try {
    // Get sender and group information
    const [senderResult, groupResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = ?', [senderId]),
      pool.query('SELECT * FROM groups WHERE id = ?', [groupId])
    ]);
    
    if (senderResult.rows.length === 0 || groupResult.rows.length === 0) {
      return res.status(400).json({ error: 'User or group not found' });
    }
    
    const sender = senderResult.rows[0];
    const group = groupResult.rows[0];
    
    // Check global reminder cooldown for "remind all" (24-hour cooldown)
    const recentGlobalReminderResult = await pool.query(`
      SELECT * FROM payment_reminders 
      WHERE group_id = ? AND sender_id = ? AND reminder_type = 'bulk'
      AND datetime(last_sent_at, '+24 hours') > datetime('now')
      ORDER BY last_sent_at DESC
      LIMIT 1
    `, [groupId, senderId]);
    
    if (recentGlobalReminderResult.rows.length > 0) {
      const lastSent = new Date(recentGlobalReminderResult.rows[0].last_sent_at);
      const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
      const timeRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60));
      
      return res.status(429).json({ 
        error: 'Bulk reminder cooldown active',
        message: `You can send "Remind all" again in ${Math.floor(timeRemaining / 60)}:${String(timeRemaining % 60).padStart(2, '0')}`,
        nextAllowedAt: nextAllowed.toISOString()
      });
    }
    
    const results = [];
    const notifications = [];
    
    // Send reminders to all debtors
    for (const debtor of debtors) {
      try {
        // Record the reminder
        await pool.run(`
          INSERT INTO payment_reminders (
            group_id, sender_id, recipient_id, amount, reminder_type, last_sent_at, created_at
          ) VALUES (?, ?, ?, ?, 'bulk', datetime('now'), datetime('now'))
        `, [groupId, senderId, debtor.recipientId, debtor.amount]);
        
        // Send notification
        await pool.run(
          'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
          [
            debtor.recipientId,
            'Payment Reminder',
            `${sender.name} is reminding you about a $${debtor.amount.toFixed(2)} payment in ${group.name}`,
            'payment_reminder',
            JSON.stringify({
              groupId: groupId,
              senderId: senderId,
              senderName: sender.name,
              amount: debtor.amount,
              groupName: group.name,
              isPartOfBulk: true
            }),
            0
          ]
        );
        
        results.push({
          recipientId: debtor.recipientId,
          recipientName: debtor.name,
          amount: debtor.amount,
          success: true
        });
        
      } catch (error) {
        console.error(`Error sending reminder to ${debtor.name}:`, error);
        results.push({
          recipientId: debtor.recipientId,
          recipientName: debtor.name,
          amount: debtor.amount,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalAmount = debtors.reduce((sum, d) => sum + d.amount, 0);
    
    res.json({
      success: true,
      message: `Reminders sent to ${successCount} members about $${totalAmount.toFixed(2)} total`,
      results: results,
      totalAmount: totalAmount
    });
    
  } catch (err) {
    console.error('Error sending bulk reminders:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/groups/:groupId/reminder-status/:userId', async (req, res) => {
  const { groupId, userId } = req.params;
  
  try {
    // Check individual reminder cooldowns
    const individualRemindersResult = await pool.query(`
      SELECT recipient_id, last_sent_at,
             CASE 
               WHEN datetime(last_sent_at, '+24 hours') > datetime('now') 
               THEN 1 ELSE 0 
             END as is_on_cooldown
      FROM payment_reminders 
      WHERE group_id = ? AND sender_id = ? AND reminder_type = 'individual'
      AND datetime(last_sent_at, '+24 hours') > datetime('now')
    `, [groupId, userId]);
    
    // Check bulk reminder cooldown
    const bulkReminderResult = await pool.query(`
      SELECT last_sent_at,
             CASE 
               WHEN datetime(last_sent_at, '+24 hours') > datetime('now') 
               THEN 1 ELSE 0 
             END as is_on_cooldown
      FROM payment_reminders 
      WHERE group_id = ? AND sender_id = ? AND reminder_type = 'bulk'
      AND datetime(last_sent_at, '+24 hours') > datetime('now')
      ORDER BY last_sent_at DESC
      LIMIT 1
    `, [groupId, userId]);
    
    const cooldowns = {};
    individualRemindersResult.rows.forEach(row => {
      if (row.is_on_cooldown) {
        const lastSent = new Date(row.last_sent_at);
        const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
        cooldowns[row.recipient_id] = {
          nextAllowedAt: nextAllowed.toISOString(),
          timeRemainingMinutes: Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60))
        };
      }
    });
    
    let bulkCooldown = null;
    if (bulkReminderResult.rows.length > 0 && bulkReminderResult.rows[0].is_on_cooldown) {
      const lastSent = new Date(bulkReminderResult.rows[0].last_sent_at);
      const nextAllowed = new Date(lastSent.getTime() + 24 * 60 * 60 * 1000);
      const timeRemainingMs = nextAllowed.getTime() - Date.now();
      const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemainingMs % (1000 * 60)) / 1000);
      
      bulkCooldown = {
        nextAllowedAt: nextAllowed.toISOString(),
        timeRemainingMs: timeRemainingMs,
        formattedTimeRemaining: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      };
    }
    
    res.json({
      individualCooldowns: cooldowns,
      bulkCooldown: bulkCooldown
    });
    
  } catch (err) {
    console.error('Error checking reminder status:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Notifications endpoints
app.post('/api/notifications', async (req, res) => {
  const { userId, title, message, type, data } = req.body;
  
  if (!userId || !title || !message || !type) {
    return res.status(400).json({ error: 'User ID, title, message, and type are required' });
  }

  try {
    const result = await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [userId, title, message, type, JSON.stringify(data || {}), 0]
    );
    
    const notification = await pool.query('SELECT * FROM notifications WHERE id = ?', [result.rows[0].id]);
    
    res.status(201).json({
      ...notification.rows[0],
      data: JSON.parse(notification.rows[0].data || '{}')
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/notifications/bulk', async (req, res) => {
  const { userIds, title, message, type, data } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || !title || !message || !type) {
    return res.status(400).json({ error: 'User IDs array, title, message, and type are required' });
  }

  try {
    const notifications = [];
    
    for (const userId of userIds) {
      const result = await pool.run(
        'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
        [userId, title, message, type, JSON.stringify(data || {}), 0]
      );
      
      const notification = await pool.query('SELECT * FROM notifications WHERE id = ?', [result.rows[0].id]);
      notifications.push({
        ...notification.rows[0],
        data: JSON.parse(notification.rows[0].data || '{}')
      });
    }
    
    res.status(201).json(notifications);
  } catch (err) {
    console.error('Error creating bulk notifications:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    const notifications = result.rows.map(notification => ({
      ...notification,
      data: JSON.parse(notification.data || '{}')
    }));
    
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.put('/api/notifications/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  
  try {
    await pool.run(
      'UPDATE notifications SET read = 1 WHERE id = ?',
      [notificationId]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Payment Request Management endpoints
app.post('/api/requests', async (req, res) => {
  const { senderId, recipientId, amount, currency, description, groupId } = req.body;
  
  if (!senderId || !recipientId || !amount || !currency) {
    return res.status(400).json({ error: 'Sender ID, recipient ID, amount, and currency are required' });
  }

  try {
    const result = await pool.run(
      'INSERT INTO payment_requests (sender_id, recipient_id, amount, currency, description, group_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [senderId, recipientId, amount, currency, description || '', groupId || null, 'pending']
    );
    
    const requestId = result.rows[0].id;
    
    // Get sender and recipient info for notification
    const senderResult = await pool.query('SELECT name, email FROM users WHERE id = ?', [senderId]);
    const recipientResult = await pool.query('SELECT name, email FROM users WHERE id = ?', [recipientId]);
    
    const sender = senderResult.rows[0];
    const recipient = recipientResult.rows[0];
    
    // Create notification for recipient
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        recipientId,
        'Payment Request',
        `${sender.name} requested $${amount} ${currency}${description ? ` for ${description}` : ''}`,
        'payment_request',
        JSON.stringify({ 
          requestId, 
          senderId, 
          senderName: sender.name,
          amount, 
          currency, 
          description,
          groupId
        }),
        0
      ]
    );
    
    res.status(201).json({
      id: requestId,
      senderId,
      recipientId,
      amount,
      currency,
      description,
      groupId,
      status: 'pending',
      senderName: sender.name,
      recipientName: recipient.name,
      message: 'Payment request created successfully'
    });
  } catch (err) {
    console.error('Error creating payment request:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/requests/:userId', async (req, res) => {
  const { userId } = req.params;
  const { type = 'all' } = req.query; // 'sent', 'received', or 'all'
  
  try {
    let query = `
      SELECT pr.*, 
             sender.name as sender_name,
             recipient.name as recipient_name,
             sender.email as sender_email,
             recipient.email as recipient_email,
             sender.wallet_address as sender_wallet,
             recipient.wallet_address as recipient_wallet,
             g.name as group_name
      FROM payment_requests pr
      JOIN users sender ON pr.sender_id = sender.id
      JOIN users recipient ON pr.recipient_id = recipient.id
      LEFT JOIN groups g ON pr.group_id = g.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type === 'sent') {
      query += ' AND pr.sender_id = ?';
      params.push(userId);
    } else if (type === 'received') {
      query += ' AND pr.recipient_id = ?';
      params.push(userId);
    } else {
      query += ' AND (pr.sender_id = ? OR pr.recipient_id = ?)';
      params.push(userId, userId);
    }
    
    query += ' ORDER BY pr.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payment requests:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/requests/request/:requestId', async (req, res) => {
  const { requestId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT pr.*, 
             sender.name as sender_name,
             recipient.name as recipient_name,
             sender.email as sender_email,
             recipient.email as recipient_email,
             sender.wallet_address as sender_wallet,
             recipient.wallet_address as recipient_wallet,
             g.name as group_name
      FROM payment_requests pr
      JOIN users sender ON pr.sender_id = sender.id
      JOIN users recipient ON pr.recipient_id = recipient.id
      LEFT JOIN groups g ON pr.group_id = g.id
      WHERE pr.id = ?
    `, [requestId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching payment request:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.put('/api/requests/:requestId/status', async (req, res) => {
  const { requestId } = req.params;
  const { status, userId } = req.body; // 'accepted', 'declined', 'completed'
  
  if (!status || !userId) {
    return res.status(400).json({ error: 'Status and user ID are required' });
  }
  
  if (!['accepted', 'declined', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be accepted, declined, or completed' });
  }
  
  try {
    // Get current request
    const requestResult = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [requestId]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    const request = requestResult.rows[0];
    
    // Verify user has permission to update this request
    if (request.recipient_id !== parseInt(userId) && request.sender_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'You do not have permission to update this request' });
    }
    
    // Update request status
    await pool.run(
      'UPDATE payment_requests SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, requestId]
    );
    
    // Get user info for notification
    const userResult = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];
    
    // Create notification for the other party
    const notificationUserId = request.recipient_id === parseInt(userId) ? request.sender_id : request.recipient_id;
    let notificationMessage = '';
    
    if (status === 'accepted') {
      notificationMessage = `${user.name} accepted your payment request of $${request.amount} ${request.currency}`;
    } else if (status === 'declined') {
      notificationMessage = `${user.name} declined your payment request of $${request.amount} ${request.currency}`;
    } else if (status === 'completed') {
      notificationMessage = `Payment of $${request.amount} ${request.currency} has been completed`;
    }
    
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        notificationUserId,
        'Payment Request Update',
        notificationMessage,
        'payment_request_update',
        JSON.stringify({ 
          requestId, 
          status, 
          amount: request.amount, 
          currency: request.currency, 
          description: request.description,
          groupId: request.group_id
        }),
        0
      ]
    );
    
    res.json({ 
      message: `Payment request ${status} successfully`,
      requestId,
      status
    });
  } catch (err) {
    console.error('Error updating payment request status:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.delete('/api/requests/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Get current request
    const requestResult = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [requestId]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    const request = requestResult.rows[0];
    
    // Only sender can delete their own request
    if (request.sender_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'You can only delete your own payment requests' });
    }
    
    // Delete the request
    await pool.run('DELETE FROM payment_requests WHERE id = ?', [requestId]);
    
    res.json({ message: 'Payment request deleted successfully' });
  } catch (err) {
    console.error('Error deleting payment request:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Subscription Management endpoints
app.get('/api/subscription/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price, p.currency, p.interval, p.features, p.description
      FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const subscription = result.rows[0];
    
    // Parse features if it's a JSON string
    if (subscription.features && typeof subscription.features === 'string') {
      try {
        subscription.features = JSON.parse(subscription.features);
      } catch (e) {
        subscription.features = [];
      }
    }
    
    res.json(subscription);
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/subscription', async (req, res) => {
  const { userId, planId, paymentMethod, paymentDetails } = req.body;
  
  if (!userId || !planId || !paymentMethod) {
    return res.status(400).json({ error: 'User ID, plan ID, and payment method are required' });
  }
  
  try {
    // Check if plan exists
    const planResult = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    const plan = planResult.rows[0];
    
    // Calculate period dates
    const now = new Date();
    const periodStart = now.toISOString();
    let periodEnd;
    
    if (plan.interval === 'monthly') {
      periodEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    } else if (plan.interval === 'yearly') {
      periodEnd = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
    }
    
    // Create subscription
    const result = await pool.run(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, status, current_period_start, current_period_end, 
        cancel_at_period_end, payment_method, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, planId, 'active', periodStart, periodEnd, 0, paymentMethod]);
    
    // Get the created subscription with plan details
    const subscriptionResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price, p.currency, p.interval, p.features, p.description
      FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `, [result.rows[0].id]);
    
    const subscription = subscriptionResult.rows[0];
    
    // Parse features if it's a JSON string
    if (subscription.features && typeof subscription.features === 'string') {
      try {
        subscription.features = JSON.parse(subscription.features);
      } catch (e) {
        subscription.features = [];
      }
    }
    
    // Create notification for user
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        userId,
        'Premium Subscription Activated',
        `Your ${plan.name} subscription is now active! Enjoy premium features.`,
        'general',
        JSON.stringify({ subscriptionId: result.rows[0].id, planId }),
        0
      ]
    );
    
    res.status(201).json(subscription);
  } catch (err) {
    console.error('Error creating subscription:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/subscription/:userId/cancel', async (req, res) => {
  const { userId } = req.params;
  const { cancelAtPeriodEnd } = req.body;
  
  try {
    // Get current active subscription
    const subscriptionResult = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    if (cancelAtPeriodEnd) {
      // Mark for cancellation at period end
      await pool.run(
        'UPDATE user_subscriptions SET cancel_at_period_end = 1, updated_at = datetime("now") WHERE id = ?',
        [subscription.id]
      );
      
      res.json({ message: 'Subscription will be cancelled at the end of the current period' });
    } else {
      // Cancel immediately
      await pool.run(
        'UPDATE user_subscriptions SET status = "cancelled", updated_at = datetime("now") WHERE id = ?',
        [subscription.id]
      );
      
      res.json({ message: 'Subscription cancelled immediately' });
    }
    
    // Create notification
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        userId,
        'Subscription Cancelled',
        cancelAtPeriodEnd ? 'Your subscription will end at the current period end.' : 'Your subscription has been cancelled.',
        'general',
        JSON.stringify({ subscriptionId: subscription.id }),
        0
      ]
    );
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/subscription/:userId/reactivate', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get current subscription
    const subscriptionResult = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const subscription = subscriptionResult.rows[0];
    
    // Reactivate subscription
    await pool.run(
      'UPDATE user_subscriptions SET status = "active", cancel_at_period_end = 0, updated_at = datetime("now") WHERE id = ?',
      [subscription.id]
    );
    
    res.json({ message: 'Subscription reactivated successfully' });
    
    // Create notification
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        userId,
        'Subscription Reactivated',
        'Your premium subscription has been reactivated.',
        'general',
        JSON.stringify({ subscriptionId: subscription.id }),
        0
      ]
    );
  } catch (err) {
    console.error('Error reactivating subscription:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/subscription/crypto-payment', async (req, res) => {
  const { userId, planId, paymentMethod, amount, currency, transactionSignature } = req.body;
  
  if (!userId || !planId || !paymentMethod || !amount || !currency || !transactionSignature) {
    return res.status(400).json({ error: 'All payment details are required' });
  }
  
  try {
    // Verify the transaction signature (in a real implementation, you would verify on-chain)
    console.log('Processing crypto payment:', { userId, planId, amount, currency, transactionSignature });
    
    // For demo purposes, we'll accept the payment
    const paymentVerified = true;
    
    if (!paymentVerified) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    // Create subscription after successful payment
    const subscriptionData = {
      userId,
      planId,
      paymentMethod: `${paymentMethod}_${currency}`,
      paymentDetails: {
        transactionSignature,
        amount,
        currency,
        timestamp: new Date().toISOString()
      }
    };
    
    // Use the existing subscription creation logic
    const planResult = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    const plan = planResult.rows[0];
    
    // Calculate period dates
    const now = new Date();
    const periodStart = now.toISOString();
    let periodEnd;
    
    if (plan.interval === 'monthly') {
      periodEnd = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    } else if (plan.interval === 'yearly') {
      periodEnd = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
    }
    
    // Create subscription
    const result = await pool.run(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, status, current_period_start, current_period_end, 
        cancel_at_period_end, payment_method, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [userId, planId, 'active', periodStart, periodEnd, 0, subscriptionData.paymentMethod]);
    
    res.json({
      success: true,
      subscriptionId: result.rows[0].id,
      message: 'Crypto payment processed successfully and subscription activated'
    });
    
    // Create notification
    await pool.run(
      'INSERT INTO notifications (user_id, title, message, type, data, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [
        userId,
        'Payment Successful',
        `Your ${currency} payment was processed successfully. Premium features are now active!`,
        'general',
        JSON.stringify({ subscriptionId: result.rows[0].id, transactionSignature }),
        0
      ]
    );
  } catch (err) {
    console.error('Error processing crypto payment:', err);
    res.status(500).json({ error: 'Payment processing error', details: err.message });
  }
});

app.post('/api/subscription/:userId/validate', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get current subscription
    const subscriptionResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price, p.currency, p.interval, p.features, p.description
      FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const subscription = subscriptionResult.rows[0];
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    
    // Check if subscription has expired
    if (now > periodEnd) {
      // Expire the subscription
      await pool.run(
        'UPDATE user_subscriptions SET status = "expired", updated_at = datetime("now") WHERE id = ?',
        [subscription.id]
      );
      
      return res.status(404).json({ error: 'Subscription has expired' });
    }
    
    // Check if it should be cancelled at period end
    if (subscription.cancel_at_period_end && now > periodEnd) {
      await pool.run(
        'UPDATE user_subscriptions SET status = "cancelled", updated_at = datetime("now") WHERE id = ?',
        [subscription.id]
      );
      
      return res.status(404).json({ error: 'Subscription was cancelled' });
    }
    
    // Parse features if it's a JSON string
    if (subscription.features && typeof subscription.features === 'string') {
      try {
        subscription.features = JSON.parse(subscription.features);
      } catch (e) {
        subscription.features = [];
      }
    }
    
    res.json(subscription);
  } catch (err) {
    console.error('Error validating subscription:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/subscription/:userId/history', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price, p.currency, p.interval, p.features, p.description
      FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId]);
    
    const subscriptions = result.rows.map(subscription => {
      // Parse features if it's a JSON string
      if (subscription.features && typeof subscription.features === 'string') {
        try {
          subscription.features = JSON.parse(subscription.features);
        } catch (e) {
          subscription.features = [];
        }
      }
      return subscription;
    });
    
    res.json(subscriptions);
  } catch (err) {
    console.error('Error fetching subscription history:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Add error handling middleware at the end
app.use(security.errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Security middleware active: JWT tokens, rate limiting, input validation`);
}); 