// Load environment variables first
require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initializeFirebaseAdmin, getFirestore } = require('../config/firebase-admin');

// Initialize Firebase Admin first
initializeFirebaseAdmin();
const { admin } = require('../config/firebase-admin');
const db = getFirestore();

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, '../wesplit.db'));

class FirebaseMigration {
  constructor() {
    this.migrationStats = {
      users: { migrated: 0, errors: 0 },
      groups: { migrated: 0, errors: 0 },
      expenses: { migrated: 0, errors: 0 },
      notifications: { migrated: 0, errors: 0 },
      settlements: { migrated: 0, errors: 0 }
    };
  }

  // Helper function to convert SQLite row to Firestore document
  convertRowToDocument(row) {
    const doc = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined) {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        doc[camelKey] = value;
      }
    }
    return doc;
  }

  // Migrate users
  async migrateUsers() {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', async (err, rows) => {
        if (err) {
          console.error('Error fetching users:', err);
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} users to migrate`);

        for (const row of rows) {
          try {
            const userDoc = this.convertRowToDocument(row);
            
            // Use Firebase UID if available, otherwise use SQLite ID
            const userId = userDoc.firebaseUid || `sqlite_${userDoc.id}`;
            
            await db.collection('users').doc(userId).set({
              ...userDoc,
              migratedFrom: 'sqlite',
              originalSqliteId: userDoc.id,
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            this.migrationStats.users.migrated++;
            console.log(`✅ Migrated user: ${userDoc.email}`);
          } catch (error) {
            console.error(`❌ Error migrating user ${row.email}:`, error);
            this.migrationStats.users.errors++;
          }
        }

        resolve();
      });
    });
  }

  // Migrate groups
  async migrateGroups() {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM groups', async (err, rows) => {
        if (err) {
          console.error('Error fetching groups:', err);
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} groups to migrate`);

        for (const row of rows) {
          try {
            const groupDoc = this.convertRowToDocument(row);
            
            // Get group members
            const members = await this.getGroupMembers(row.id);
            
            await db.collection('groups').doc(groupDoc.id.toString()).set({
              ...groupDoc,
              memberIds: members.map(m => m.userId),
              migratedFrom: 'sqlite',
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create group members subcollection
            for (const member of members) {
              await db.collection('groups').doc(groupDoc.id.toString())
                .collection('members').doc(member.userId.toString()).set({
                  joinedAt: member.joinedAt,
                  migratedFrom: 'sqlite'
                });
            }

            this.migrationStats.groups.migrated++;
            console.log(`✅ Migrated group: ${groupDoc.name}`);
          } catch (error) {
            console.error(`❌ Error migrating group ${row.name}:`, error);
            this.migrationStats.groups.errors++;
          }
        }

        resolve();
      });
    });
  }

  // Get group members
  async getGroupMembers(groupId) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(
        'SELECT user_id, joined_at FROM group_members WHERE group_id = ?',
        [groupId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => ({
              userId: row.user_id,
              joinedAt: row.joined_at
            })));
          }
        }
      );
    });
  }

  // Migrate expenses
  async migrateExpenses() {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM expenses', async (err, rows) => {
        if (err) {
          console.error('Error fetching expenses:', err);
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} expenses to migrate`);

        for (const row of rows) {
          try {
            const expenseDoc = this.convertRowToDocument(row);
            
            // Parse splitData if it exists
            if (expenseDoc.splitData) {
              try {
                expenseDoc.splitData = JSON.parse(expenseDoc.splitData);
              } catch (e) {
                console.warn(`Could not parse splitData for expense ${row.id}`);
              }
            }

            await db.collection('expenses').doc(expenseDoc.id.toString()).set({
              ...expenseDoc,
              migratedFrom: 'sqlite',
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            this.migrationStats.expenses.migrated++;
            console.log(`✅ Migrated expense: ${expenseDoc.description}`);
          } catch (error) {
            console.error(`❌ Error migrating expense ${row.id}:`, error);
            this.migrationStats.expenses.errors++;
          }
        }

        resolve();
      });
    });
  }

  // Migrate notifications
  async migrateNotifications() {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM notifications', async (err, rows) => {
        if (err) {
          console.error('Error fetching notifications:', err);
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} notifications to migrate`);

        for (const row of rows) {
          try {
            const notificationDoc = this.convertRowToDocument(row);
            
            // Parse data field if it exists
            if (notificationDoc.data) {
              try {
                notificationDoc.data = JSON.parse(notificationDoc.data);
              } catch (e) {
                console.warn(`Could not parse data for notification ${row.id}`);
              }
            }

            await db.collection('notifications').doc(notificationDoc.id.toString()).set({
              ...notificationDoc,
              migratedFrom: 'sqlite',
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            this.migrationStats.notifications.migrated++;
            console.log(`✅ Migrated notification: ${notificationDoc.title}`);
          } catch (error) {
            console.error(`❌ Error migrating notification ${row.id}:`, error);
            this.migrationStats.notifications.errors++;
          }
        }

        resolve();
      });
    });
  }

  // Migrate settlements
  async migrateSettlements() {
    return new Promise((resolve, reject) => {
      // Check if settlements table exists
      sqliteDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='personal_settlements'", async (err, row) => {
        if (err || !row) {
          console.log('No settlements table found, skipping...');
          resolve();
          return;
        }

        sqliteDb.all('SELECT * FROM personal_settlements', async (err, rows) => {
          if (err) {
            console.error('Error fetching settlements:', err);
            reject(err);
            return;
          }

          console.log(`Found ${rows.length} settlements to migrate`);

          for (const row of rows) {
            try {
              const settlementDoc = this.convertRowToDocument(row);
              
              // Parse creditors_data if it exists
              if (settlementDoc.creditorsData) {
                try {
                  settlementDoc.creditorsData = JSON.parse(settlementDoc.creditorsData);
                } catch (e) {
                  console.warn(`Could not parse creditorsData for settlement ${row.id}`);
                }
              }

              await db.collection('settlements').doc(settlementDoc.id.toString()).set({
                ...settlementDoc,
                migratedFrom: 'sqlite',
                migratedAt: admin.firestore.FieldValue.serverTimestamp()
              });

              this.migrationStats.settlements.migrated++;
              console.log(`✅ Migrated settlement: ${settlementDoc.id}`);
            } catch (error) {
              console.error(`❌ Error migrating settlement ${row.id}:`, error);
              this.migrationStats.settlements.errors++;
            }
          }

          resolve();
        });
      });
    });
  }

  // Migrate group memberships to top-level groupMembers collection
  async migrateGroupMembers() {
    return new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM group_members', async (err, rows) => {
        if (err) {
          console.error('Error fetching group memberships:', err);
          reject(err);
          return;
        }

        console.log(`Found ${rows.length} group memberships to migrate`);

        let migrated = 0;
        let errors = 0;
        for (const row of rows) {
          try {
            // Use Firebase UID if available, otherwise fallback to sqlite_#
            const userId = row.firebase_uid || `sqlite_${row.user_id}`;
            const groupId = row.group_id.toString();
            const joinedAt = row.joined_at || new Date().toISOString();

            await db.collection('groupMembers').add({
              user_id: userId,
              group_id: groupId,
              joined_at: joinedAt,
              migratedFrom: 'sqlite',
              migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            migrated++;
          } catch (error) {
            console.error(`❌ Error migrating group membership user ${row.user_id} group ${row.group_id}:`, error);
            errors++;
          }
        }
        console.log(`✅ Migrated ${migrated} group memberships, ${errors} errors`);
        resolve();
      });
    });
  }

  // Run complete migration
  async runMigration() {
    console.log('🚀 Starting Firebase migration...');
    
    try {
      // Initialize Firebase Admin
      initializeFirebaseAdmin();
      
      console.log('📊 Migration order: Users → Groups → GroupMembers → Expenses → Notifications → Settlements');
      
      await this.migrateUsers();
      await this.migrateGroups();
      await this.migrateGroupMembers();
      await this.migrateExpenses();
      await this.migrateNotifications();
      await this.migrateSettlements();
      
      console.log('\n🎉 Migration completed!');
      console.log('📈 Migration Statistics:');
      console.log(JSON.stringify(this.migrationStats, null, 2));
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      sqliteDb.close();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new FirebaseMigration();
  migration.runMigration()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = FirebaseMigration; 