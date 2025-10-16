#!/usr/bin/env node

/**
 * Comprehensive Production Testing Script
 * Runs all production tests in sequence
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class ComprehensiveProductionTester {
  constructor() {
    this.results = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runScript(scriptName, description) {
    this.log(`\n🔄 Running ${description}...`, 'cyan');
    
    try {
      const scriptPath = path.join(__dirname, scriptName);
      const output = execSync(`node "${scriptPath}"`, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      this.log(`✅ ${description} completed successfully`, 'green');
      this.results.push({ name: description, passed: true });
      return true;
    } catch (error) {
      this.log(`❌ ${description} failed`, 'red');
      this.results.push({ name: description, passed: false, error: error.message });
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Production Testing...', 'bright');
    this.log('This will run all production tests in sequence.\n', 'cyan');

    // Test 1: Local Authentication Testing
    await this.runScript('test-auth-locally.js', 'Local Authentication Testing');

    // Test 2: Production Requirements Testing
    await this.runScript('test-production-requirements.js', 'Production Requirements Testing');

    // Test 3: Production Environment Simulation
    await this.runScript('simulate-production.js', 'Production Environment Simulation');

    // Generate final report
    this.generateFinalReport();
  }

  generateFinalReport() {
    this.log('\n📊 Comprehensive Production Test Report', 'bright');
    this.log('=' .repeat(60), 'cyan');

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

    this.log(`\nTest Results: ${passed}/${total} (${percentage}%)`, 
             percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');

    this.log('\nDetailed Results:', 'yellow');
    for (const result of this.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const color = result.passed ? 'green' : 'red';
      this.log(`  ${status} ${result.name}`, color);
      if (result.error) {
        this.log(`    Error: ${result.error}`, 'yellow');
      }
    }

    if (percentage >= 80) {
      this.log('\n🎉 All production tests PASSED!', 'green');
      this.log('Your app is ready for production build.', 'green');
      
      this.log('\n🚀 Ready to Build:', 'cyan');
      this.log('  eas build --platform android --profile production', 'yellow');
      this.log('  eas build --platform ios --profile production', 'yellow');
      this.log('  eas build --platform all --profile production', 'yellow');
      
    } else if (percentage >= 60) {
      this.log('\n⚠️ Some production tests FAILED', 'yellow');
      this.log('Please address the issues above before building.', 'yellow');
      
    } else {
      this.log('\n❌ Multiple production tests FAILED', 'red');
      this.log('Please fix the issues above before attempting production build.', 'red');
    }

    this.log('\n💡 Troubleshooting Tips:', 'cyan');
    this.log('  1. Check your .env file for missing environment variables', 'yellow');
    this.log('  2. Verify Firebase project configuration', 'yellow');
    this.log('  3. Ensure OAuth client IDs are correctly configured', 'yellow');
    this.log('  4. Test network connectivity', 'yellow');
    this.log('  5. Check that all required files exist', 'yellow');

    this.log('\n📱 Testing in App:', 'cyan');
    this.log('  1. Start the app: npx expo start', 'yellow');
    this.log('  2. Navigate to Auth Debug screen', 'yellow');
    this.log('  3. Run diagnostics and follow recommendations', 'yellow');
    this.log('  4. Test all authentication methods', 'yellow');

    process.exit(percentage >= 80 ? 0 : 1);
  }
}

// Run all tests
if (require.main === module) {
  const tester = new ComprehensiveProductionTester();
  tester.runAllTests().catch(error => {
    console.error('Comprehensive testing failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveProductionTester;
