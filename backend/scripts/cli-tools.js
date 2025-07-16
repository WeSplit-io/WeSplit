#!/usr/bin/env node

const readline = require('readline');
const FirebaseMigration = require('./migrate-to-firebase');
const dataSyncService = require('../services/dataSyncService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class CLITools {
  constructor() {
    this.migration = new FirebaseMigration();
  }

  async showMenu() {
    console.log('\n🚀 WeSplit Database Management Tools');
    console.log('=====================================');
    console.log('1. 🔄 Full Migration to Firebase');
    console.log('2. 📊 Sync Status Check');
    console.log('3. 🔄 Full Data Sync (SQLite → Firebase)');
    console.log('4. ⚡ Incremental Sync');
    console.log('5. 📈 Database Statistics');
    console.log('6. 🧹 Reset Sync Statistics');
    console.log('7. ⏰ Start Scheduled Sync');
    console.log('8. ❌ Exit');
    console.log('=====================================');

    const choice = await this.prompt('Select an option (1-8): ');

    switch (choice) {
      case '1':
        await this.runFullMigration();
        break;
      case '2':
        await this.checkSyncStatus();
        break;
      case '3':
        await this.runFullSync();
        break;
      case '4':
        await this.runIncrementalSync();
        break;
      case '5':
        await this.showDatabaseStats();
        break;
      case '6':
        await this.resetSyncStats();
        break;
      case '7':
        await this.startScheduledSync();
        break;
      case '8':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        console.log('❌ Invalid option. Please try again.');
        await this.showMenu();
    }
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async runFullMigration() {
    console.log('\n🔄 Starting Full Migration to Firebase...');
    console.log('⚠️  This will migrate ALL data from SQLite to Firebase Firestore');
    
    const confirm = await this.prompt('Are you sure you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Migration cancelled.');
      await this.showMenu();
      return;
    }

    try {
      await this.migration.runMigration();
      console.log('\n✅ Migration completed successfully!');
      
      const continueChoice = await this.prompt('\nWould you like to continue with other operations? (yes/no): ');
      if (continueChoice.toLowerCase() === 'yes') {
        await this.showMenu();
      } else {
        console.log('👋 Goodbye!');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      await this.showMenu();
    }
  }

  async checkSyncStatus() {
    console.log('\n📊 Checking Sync Status...');
    
    try {
      const status = await dataSyncService.getSyncStatus();
      
      console.log('\n📈 Sync Status Report:');
      console.log('======================');
      console.log(`Last Sync: ${status.lastSync ? status.lastSync.toLocaleString() : 'Never'}`);
      console.log(`Currently Syncing: ${status.isSyncing ? 'Yes' : 'No'}`);
      
      console.log('\n📊 Record Counts:');
      console.log('SQLite:', status.counts.sqlite);
      console.log('Firebase:', status.counts.firebase);
      
      console.log('\n🔍 Differences (SQLite - Firebase):');
      Object.entries(status.counts.differences).forEach(([entity, diff]) => {
        const status = diff === 0 ? '✅' : diff > 0 ? '⚠️' : '❌';
        console.log(`${status} ${entity}: ${diff}`);
      });
      
      console.log('\n📈 Sync Statistics:');
      Object.entries(status.syncStats).forEach(([entity, stats]) => {
        if (entity !== 'lastSync') {
          console.log(`${entity}: ${stats.synced} synced, ${stats.errors} errors`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error checking sync status:', error.message);
    }
    
    await this.showMenu();
  }

  async runFullSync() {
    console.log('\n🔄 Starting Full Data Sync...');
    console.log('⚠️  This will sync ALL data from SQLite to Firebase');
    
    const confirm = await this.prompt('Are you sure you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Sync cancelled.');
      await this.showMenu();
      return;
    }

    try {
      await dataSyncService.syncAllData();
      console.log('\n✅ Full sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Full sync failed:', error.message);
    }
    
    await this.showMenu();
  }

  async runIncrementalSync() {
    console.log('\n⚡ Starting Incremental Sync...');
    
    try {
      await dataSyncService.syncIncremental();
      console.log('\n✅ Incremental sync completed successfully!');
      
    } catch (error) {
      console.error('❌ Incremental sync failed:', error.message);
    }
    
    await this.showMenu();
  }

  async showDatabaseStats() {
    console.log('\n📈 Database Statistics...');
    
    try {
      const status = await dataSyncService.getSyncStatus();
      
      console.log('\n📊 SQLite Database:');
      Object.entries(status.counts.sqlite).forEach(([entity, count]) => {
        console.log(`  ${entity}: ${count} records`);
      });
      
      console.log('\n🔥 Firebase Firestore:');
      Object.entries(status.counts.firebase).forEach(([entity, count]) => {
        console.log(`  ${entity}: ${count} documents`);
      });
      
      console.log('\n🔍 Sync Status:');
      console.log(`  Last Sync: ${status.lastSync ? status.lastSync.toLocaleString() : 'Never'}`);
      console.log(`  Sync in Progress: ${status.isSyncing ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.error('❌ Error getting database stats:', error.message);
    }
    
    await this.showMenu();
  }

  async resetSyncStats() {
    console.log('\n🧹 Resetting Sync Statistics...');
    
    const confirm = await this.prompt('Are you sure you want to reset sync statistics? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Reset cancelled.');
      await this.showMenu();
      return;
    }

    try {
      dataSyncService.syncStats = {
        lastSync: null,
        users: { synced: 0, errors: 0 },
        groups: { synced: 0, errors: 0 },
        expenses: { synced: 0, errors: 0 },
        notifications: { synced: 0, errors: 0 }
      };
      
      console.log('✅ Sync statistics reset successfully!');
      
    } catch (error) {
      console.error('❌ Error resetting sync statistics:', error.message);
    }
    
    await this.showMenu();
  }

  async startScheduledSync() {
    console.log('\n⏰ Starting Scheduled Sync...');
    
    const interval = await this.prompt('Enter sync interval in minutes (default: 30): ');
    const intervalMinutes = parseInt(interval) || 30;
    
    if (intervalMinutes < 5) {
      console.log('❌ Sync interval must be at least 5 minutes.');
      await this.showMenu();
      return;
    }
    
    try {
      dataSyncService.startScheduledSync(intervalMinutes);
      console.log(`✅ Scheduled sync started with ${intervalMinutes} minute interval`);
      console.log('💡 The sync will run automatically in the background');
      console.log('💡 You can stop the process with Ctrl+C to stop scheduled sync');
      
    } catch (error) {
      console.error('❌ Error starting scheduled sync:', error.message);
    }
    
    await this.showMenu();
  }
}

// Main execution
async function main() {
  const cli = new CLITools();
  
  console.log('🚀 Welcome to WeSplit Database Management Tools!');
  console.log('This tool helps you manage database migration and synchronization.');
  
  try {
    await cli.showMenu();
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = CLITools; 