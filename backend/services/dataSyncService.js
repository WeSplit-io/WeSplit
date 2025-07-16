const pool = require('../db');
const { getFirestore } = require('../config/firebase-admin');
const db = getFirestore();

class DataSyncService {
  constructor() {
    this.syncStats = {
      lastSync: null,
      users: { synced: 0, errors: 0 },
      groups: { synced: 0, errors: 0 },
      expenses: { synced: 0, errors: 0 },
      notifications: { synced: 0, errors: 0 }
    };
    this.isSyncing = false;
  }

  // ===== SYNC OPERATIONS =====

  async syncAllData() {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting full data synchronization...');

    try {
      await this.syncUsers();
      await this.syncGroups();
      await this.syncExpenses();
      await this.syncNotifications();
      
      this.syncStats.lastSync = new Date();
      console.log('✅ Full data synchronization completed');
      console.log('📊 Sync Statistics:', JSON.stringify(this.syncStats, null, 2));
    } catch (error) {
      console.error('❌ Data synchronization failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncUsers() {
    console.log('👥 Syncing users...');
    
    try {
      const { rows } = await pool.query('SELECT * FROM users');
      
      for (const user of rows) {
        try {
          await this.syncUserToFirebase(user);
          this.syncStats.users.synced++;
        } catch (error) {
          console.error(`❌ Error syncing user ${user.email}:`, error);
          this.syncStats.users.errors++;
        }
      }
      
      console.log(`✅ Synced ${this.syncStats.users.synced} users`);
    } catch (error) {
      console.error('❌ Error syncing users:', error);
      throw error;
    }
  }

  async syncGroups() {
    console.log('👥 Syncing groups...');
    
    try {
      const { rows } = await pool.query('SELECT * FROM groups');
      
      for (const group of rows) {
        try {
          await this.syncGroupToFirebase(group);
          this.syncStats.groups.synced++;
        } catch (error) {
          console.error(`❌ Error syncing group ${group.name}:`, error);
          this.syncStats.groups.errors++;
        }
      }
      
      console.log(`✅ Synced ${this.syncStats.groups.synced} groups`);
    } catch (error) {
      console.error('❌ Error syncing groups:', error);
      throw error;
    }
  }

  async syncExpenses() {
    console.log('💰 Syncing expenses...');
    
    try {
      const { rows } = await pool.query('SELECT * FROM expenses');
      
      for (const expense of rows) {
        try {
          await this.syncExpenseToFirebase(expense);
          this.syncStats.expenses.synced++;
        } catch (error) {
          console.error(`❌ Error syncing expense ${expense.id}:`, error);
          this.syncStats.expenses.errors++;
        }
      }
      
      console.log(`✅ Synced ${this.syncStats.expenses.synced} expenses`);
    } catch (error) {
      console.error('❌ Error syncing expenses:', error);
      throw error;
    }
  }

  async syncNotifications() {
    console.log('🔔 Syncing notifications...');
    
    try {
      const { rows } = await pool.query('SELECT * FROM notifications');
      
      for (const notification of rows) {
        try {
          await this.syncNotificationToFirebase(notification);
          this.syncStats.notifications.synced++;
        } catch (error) {
          console.error(`❌ Error syncing notification ${notification.id}:`, error);
          this.syncStats.notifications.errors++;
        }
      }
      
      console.log(`✅ Synced ${this.syncStats.notifications.synced} notifications`);
    } catch (error) {
      console.error('❌ Error syncing notifications:', error);
      throw error;
    }
  }

  // ===== INDIVIDUAL SYNC METHODS =====

  async syncUserToFirebase(user) {
    const userDoc = {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      walletAddress: user.wallet_address,
      walletPublicKey: user.wallet_public_key,
      avatar: user.avatar,
      createdAt: new Date(user.created_at),
      lastVerifiedAt: user.last_verified_at ? new Date(user.last_verified_at) : null,
      syncedFrom: 'sqlite',
      lastSyncedAt: new Date()
    };

    await db.collection('users').doc(user.id.toString()).set(userDoc, { merge: true });
  }

  async syncGroupToFirebase(group) {
    // Get group members
    const { rows: members } = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [group.id]
    );

    const groupDoc = {
      id: group.id.toString(),
      name: group.name,
      description: group.description,
      category: group.category,
      currency: group.currency,
      icon: group.icon,
      color: group.color,
      createdBy: group.created_by.toString(),
      memberIds: members.map(m => m.user_id.toString()),
      createdAt: new Date(group.created_at),
      updatedAt: new Date(group.updated_at),
      syncedFrom: 'sqlite',
      lastSyncedAt: new Date()
    };

    await db.collection('groups').doc(group.id.toString()).set(groupDoc, { merge: true });

    // Sync group members subcollection
    for (const member of members) {
      const memberDoc = {
        joinedAt: new Date(), // We don't have this in SQLite, using current time
        syncedFrom: 'sqlite'
      };
      
      await db.collection('groups').doc(group.id.toString())
        .collection('members').doc(member.user_id.toString())
        .set(memberDoc, { merge: true });
    }
  }

  async syncExpenseToFirebase(expense) {
    const expenseDoc = {
      id: expense.id.toString(),
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      paidBy: expense.paid_by.toString(),
      groupId: expense.group_id.toString(),
      category: expense.category,
      splitType: 'equal', // Default since we don't have this in SQLite
      splitData: expense.splitData ? JSON.parse(expense.splitData) : {},
      createdAt: new Date(expense.created_at),
      syncedFrom: 'sqlite',
      lastSyncedAt: new Date()
    };

    await db.collection('expenses').doc(expense.id.toString()).set(expenseDoc, { merge: true });
  }

  async syncNotificationToFirebase(notification) {
    const notificationDoc = {
      id: notification.id.toString(),
      userId: notification.user_id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      data: notification.data ? JSON.parse(notification.data) : {},
      read: Boolean(notification.read),
      createdAt: new Date(notification.created_at),
      syncedFrom: 'sqlite',
      lastSyncedAt: new Date()
    };

    await db.collection('notifications').doc(notification.id.toString()).set(notificationDoc, { merge: true });
  }

  // ===== INCREMENTAL SYNC =====

  async syncIncremental() {
    console.log('🔄 Starting incremental sync...');
    
    try {
      // Get last sync timestamp
      const lastSync = this.syncStats.lastSync || new Date(0);
      
      // Sync only records modified since last sync
      await this.syncIncrementalUsers(lastSync);
      await this.syncIncrementalGroups(lastSync);
      await this.syncIncrementalExpenses(lastSync);
      await this.syncIncrementalNotifications(lastSync);
      
      this.syncStats.lastSync = new Date();
      console.log('✅ Incremental sync completed');
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      throw error;
    }
  }

  async syncIncrementalUsers(lastSync) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE updated_at > ? OR created_at > ?',
      [lastSync.toISOString(), lastSync.toISOString()]
    );
    
    for (const user of rows) {
      await this.syncUserToFirebase(user);
    }
  }

  async syncIncrementalGroups(lastSync) {
    const { rows } = await pool.query(
      'SELECT * FROM groups WHERE updated_at > ? OR created_at > ?',
      [lastSync.toISOString(), lastSync.toISOString()]
    );
    
    for (const group of rows) {
      await this.syncGroupToFirebase(group);
    }
  }

  async syncIncrementalExpenses(lastSync) {
    const { rows } = await pool.query(
      'SELECT * FROM expenses WHERE created_at > ?',
      [lastSync.toISOString()]
    );
    
    for (const expense of rows) {
      await this.syncExpenseToFirebase(expense);
    }
  }

  async syncIncrementalNotifications(lastSync) {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE created_at > ?',
      [lastSync.toISOString()]
    );
    
    for (const notification of rows) {
      await this.syncNotificationToFirebase(notification);
    }
  }

  // ===== REAL-TIME SYNC TRIGGERS =====

  async onUserCreated(userId) {
    try {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) {
        await this.syncUserToFirebase(rows[0]);
        console.log(`✅ Real-time sync: User ${userId} synced to Firebase`);
      }
    } catch (error) {
      console.error(`❌ Real-time sync failed for user ${userId}:`, error);
    }
  }

  async onGroupCreated(groupId) {
    try {
      const { rows } = await pool.query('SELECT * FROM groups WHERE id = ?', [groupId]);
      if (rows.length > 0) {
        await this.syncGroupToFirebase(rows[0]);
        console.log(`✅ Real-time sync: Group ${groupId} synced to Firebase`);
      }
    } catch (error) {
      console.error(`❌ Real-time sync failed for group ${groupId}:`, error);
    }
  }

  async onExpenseCreated(expenseId) {
    try {
      const { rows } = await pool.query('SELECT * FROM expenses WHERE id = ?', [expenseId]);
      if (rows.length > 0) {
        await this.syncExpenseToFirebase(rows[0]);
        console.log(`✅ Real-time sync: Expense ${expenseId} synced to Firebase`);
      }
    } catch (error) {
      console.error(`❌ Real-time sync failed for expense ${expenseId}:`, error);
    }
  }

  async onNotificationCreated(notificationId) {
    try {
      const { rows } = await pool.query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
      if (rows.length > 0) {
        await this.syncNotificationToFirebase(rows[0]);
        console.log(`✅ Real-time sync: Notification ${notificationId} synced to Firebase`);
      }
    } catch (error) {
      console.error(`❌ Real-time sync failed for notification ${notificationId}:`, error);
    }
  }

  // ===== SYNC STATUS & MONITORING =====

  async getSyncStatus() {
    try {
      // Get counts from both databases
      const sqliteCounts = await this.getSQLiteCounts();
      const firebaseCounts = await this.getFirebaseCounts();
      
      return {
        lastSync: this.syncStats.lastSync,
        isSyncing: this.isSyncing,
        syncStats: this.syncStats,
        counts: {
          sqlite: sqliteCounts,
          firebase: firebaseCounts,
          differences: {
            users: sqliteCounts.users - firebaseCounts.users,
            groups: sqliteCounts.groups - firebaseCounts.groups,
            expenses: sqliteCounts.expenses - firebaseCounts.expenses,
            notifications: sqliteCounts.notifications - firebaseCounts.notifications
          }
        }
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }

  async getSQLiteCounts() {
    const [users, groups, expenses, notifications] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM groups'),
      pool.query('SELECT COUNT(*) as count FROM expenses'),
      pool.query('SELECT COUNT(*) as count FROM notifications')
    ]);

    return {
      users: users.rows[0].count,
      groups: groups.rows[0].count,
      expenses: expenses.rows[0].count,
      notifications: notifications.rows[0].count
    };
  }

  async getFirebaseCounts() {
    const [users, groups, expenses, notifications] = await Promise.all([
      db.collection('users').get(),
      db.collection('groups').get(),
      db.collection('expenses').get(),
      db.collection('notifications').get()
    ]);

    return {
      users: users.size,
      groups: groups.size,
      expenses: expenses.size,
      notifications: notifications.size
    };
  }

  // ===== SCHEDULED SYNC =====

  startScheduledSync(intervalMinutes = 30) {
    console.log(`⏰ Starting scheduled sync every ${intervalMinutes} minutes`);
    
    setInterval(async () => {
      try {
        await this.syncIncremental();
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

module.exports = new DataSyncService(); 