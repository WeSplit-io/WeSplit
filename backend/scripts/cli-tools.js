#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class CLITools {
  constructor() {
    // No longer needed - app is Firebase-only
  }

  async showMenu() {
    console.log('\n🚀 WeSplit Backend Management Tools');
    console.log('=====================================');
    console.log('1. 📊 Health Check');
    console.log('2. 🔍 Backend Status');
    console.log('3. 📈 System Statistics');
    console.log('4. ❌ Exit');
    console.log('=====================================');

    const choice = await this.prompt('Select an option (1-4): ');
    await this.handleChoice(choice);
  }

  async handleChoice(choice) {
    switch (choice.trim()) {
      case '1':
        await this.healthCheck();
        break;
      case '2':
        await this.backendStatus();
        break;
      case '3':
        await this.systemStatistics();
        break;
      case '4':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        console.log('❌ Invalid option. Please try again.');
        await this.showMenu();
    }
  }

  async healthCheck() {
    console.log('\n🏥 Backend Health Check');
    console.log('========================');
    
    try {
      // Check if backend is running
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();
      
      console.log('✅ Backend Status:', data.status);
      console.log('📅 Timestamp:', data.timestamp);
      console.log('🏗️  Architecture:', data.architecture);
      console.log('📦 Version:', data.version);
      
    } catch (error) {
      console.log('❌ Backend is not running or not accessible');
      console.log('💡 Make sure to start the backend with: npm start');
    }
    
    await this.prompt('\nPress Enter to continue...');
    await this.showMenu();
  }

  async backendStatus() {
    console.log('\n🔍 Backend Status');
    console.log('=================');
    
    console.log('📊 Architecture: Firebase-only');
    console.log('🗄️  Database: Firebase Firestore');
    console.log('🔗 API Endpoints: Subscription management only');
    console.log('🚫 SQLite: Removed (migration complete)');
    console.log('✅ Status: Clean and optimized');
    
    await this.prompt('\nPress Enter to continue...');
    await this.showMenu();
  }

  async systemStatistics() {
    console.log('\n📈 System Statistics');
    console.log('====================');
    
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    console.log('💾 Memory Usage:');
    console.log(`   RSS: ${memoryUsageMB.rss} MB`);
    console.log(`   Heap Total: ${memoryUsageMB.heapTotal} MB`);
    console.log(`   Heap Used: ${memoryUsageMB.heapUsed} MB`);
    console.log(`   External: ${memoryUsageMB.external} MB`);
    
    console.log('\n⏰ Uptime:', this.formatUptime(process.uptime()));
    console.log('🆔 Process ID:', process.pid);
    console.log('📦 Node Version:', process.version);
    
    await this.prompt('\nPress Enter to continue...');
    await this.showMenu();
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 WeSplit Backend CLI Tools');
  console.log('Firebase-only architecture');
  
  const cli = new CLITools();
  await cli.showMenu();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CLITools;