const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('colors');

class AppLogMonitor {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.logFile = path.join(this.projectRoot, 'app-logs.txt');
    this.isMonitoring = false;
  }

  log(message, color = 'white') {
    console.log(message[color]);
  }

  async startMonitoring() {
    this.log('\n📱 Starting WeSplit App Log Monitoring', 'bright');
    this.log('This will capture all logs from the WeSplit app on the emulator...\n', 'cyan');

    // Clear previous logs
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }

    // Start logcat monitoring
    this.log('🔍 Monitoring logs for WeSplit app...', 'yellow');
    this.log('📝 Logs will be saved to: app-logs.txt', 'blue');
    this.log('💡 Try to reproduce the login issue now!', 'green');
    this.log('⏹️  Press Ctrl+C to stop monitoring\n', 'yellow');

    const logcat = spawn('adb', [
      'logcat',
      '-s', 'ReactNativeJS:V',  // React Native JavaScript logs
      '-s', 'ReactNative:V',    // React Native native logs
      '-s', 'ExpoModules:V',    // Expo modules logs
      '-s', 'Firebase:V',       // Firebase logs
      '--pid=' + await this.getAppPid()
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

    logcat.stdout.on('data', (data) => {
      const logLine = data.toString();
      process.stdout.write(logLine);
      logStream.write(logLine);
    });

    logcat.stderr.on('data', (data) => {
      const logLine = data.toString();
      process.stderr.write(logLine);
      logStream.write(logLine);
    });

    logcat.on('close', (code) => {
      this.log(`\n📊 Log monitoring stopped (exit code: ${code})`, 'yellow');
      this.log(`📁 Logs saved to: ${this.logFile}`, 'blue');
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.log('\n⏹️  Stopping log monitoring...', 'yellow');
      logcat.kill();
      logStream.end();
      this.analyzeLogs();
      process.exit(0);
    });

    this.isMonitoring = true;
  }

  async getAppPid() {
    try {
      const output = execSync('adb shell ps | grep com.wesplit.app', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes('com.wesplit.app')) {
          const parts = line.trim().split(/\s+/);
          return parts[1]; // PID is usually the second column
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  analyzeLogs() {
    if (!fs.existsSync(this.logFile)) {
      this.log('❌ No log file found to analyze', 'red');
      return;
    }

    this.log('\n📊 ANALYZING LOGS FOR AUTHENTICATION ISSUES', 'bright');
    
    const logContent = fs.readFileSync(this.logFile, 'utf8');
    const lines = logContent.split('\n');

    // Look for Firebase Functions related logs
    const firebaseLogs = lines.filter(line => 
      line.includes('Firebase Functions') || 
      line.includes('firebaseFunctionsService') ||
      line.includes('sendVerificationEmail') ||
      line.includes('verifyCode')
    );

    // Look for environment variable logs
    const envLogs = lines.filter(line => 
      line.includes('Environment Variables Debug') ||
      line.includes('Firebase Config') ||
      line.includes('MISSING') ||
      line.includes('apiKey') ||
      line.includes('authDomain')
    );

    // Look for error logs
    const errorLogs = lines.filter(line => 
      line.includes('ERROR') ||
      line.includes('Error') ||
      line.includes('Failed') ||
      line.includes('Exception')
    );

    // Look for authentication flow logs
    const authLogs = lines.filter(line => 
      line.includes('AuthMethodsScreen') ||
      line.includes('sendVerificationCode') ||
      line.includes('authenticateUser') ||
      line.includes('Existing user') ||
      line.includes('User not found')
    );

    this.log('\n🔍 KEY FINDINGS:', 'bright');
    
    if (firebaseLogs.length > 0) {
      this.log(`\n🔥 Firebase Functions Logs (${firebaseLogs.length} entries):`, 'yellow');
      firebaseLogs.slice(0, 10).forEach(log => {
        this.log(`  ${log}`, 'white');
      });
    }

    if (envLogs.length > 0) {
      this.log(`\n🔧 Environment Variable Logs (${envLogs.length} entries):`, 'yellow');
      envLogs.slice(0, 10).forEach(log => {
        this.log(`  ${log}`, 'white');
      });
    }

    if (errorLogs.length > 0) {
      this.log(`\n❌ Error Logs (${errorLogs.length} entries):`, 'red');
      errorLogs.slice(0, 10).forEach(log => {
        this.log(`  ${log}`, 'white');
      });
    }

    if (authLogs.length > 0) {
      this.log(`\n👤 Authentication Flow Logs (${authLogs.length} entries):`, 'yellow');
      authLogs.slice(0, 10).forEach(log => {
        this.log(`  ${log}`, 'white');
      });
    }

    if (firebaseLogs.length === 0 && envLogs.length === 0 && errorLogs.length === 0 && authLogs.length === 0) {
      this.log('\n⚠️  No relevant logs found. The app might not be running or logs are not being captured.', 'yellow');
      this.log('💡 Make sure to:', 'blue');
      this.log('  1. Open the WeSplit app on the emulator', 'blue');
      this.log('  2. Try to reproduce the login issue', 'blue');
      this.log('  3. Check if the app is actually running', 'blue');
    }

    this.log(`\n📁 Full logs available in: ${this.logFile}`, 'blue');
  }
}

if (require.main === module) {
  new AppLogMonitor().startMonitoring();
}

module.exports = AppLogMonitor;
