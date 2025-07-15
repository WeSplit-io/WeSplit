#!/usr/bin/env node

/**
 * WeSplit Production Setup Script
 * 
 * This script helps configure the app for production deployment by:
 * 1. Updating network configurations
 * 2. Cleaning console logs
 * 3. Setting up environment variables
 * 4. Validating production readiness
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 WeSplit Production Setup Script');
console.log('=====================================\n');

// Configuration updates
const updates = [
  {
    file: 'utils/walletService.ts',
    description: 'Update Solana network to mainnet for production',
    changes: [
      {
        from: "const SOLANA_NETWORK = 'devnet'; // or 'mainnet-beta'",
        to: "const SOLANA_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet';"
      }
    ]
  },
  {
    file: 'src/services/solanaTransactionService.ts',
    description: 'Update Solana transaction service to use mainnet',
    changes: [
      {
        from: "const CURRENT_NETWORK = 'devnet';",
        to: "const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';"
      }
    ]
  },
  {
    file: 'src/context/WalletContext.tsx',
    description: 'Update wallet context to use mainnet chain ID',
    changes: [
      {
        from: "setChainId('solana:devnet');",
        to: "setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');"
      },
      {
        from: "setChainId('solana:devnet');",
        to: "setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');"
      }
    ]
  }
];

// Console log cleanup patterns
const consoleLogPatterns = [
  {
    pattern: /console\.log\([^)]+\);/g,
    replacement: (match) => {
      // Keep important logs, remove debug logs
      if (match.includes('Error') || match.includes('Failed') || match.includes('Warning')) {
        return match;
      }
      return `if (__DEV__) { ${match} }`;
    }
  }
];

// Environment variables template
const envTemplate = `# Production Environment Variables for WeSplit
# Copy this file to your production server and update with real values

# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=./wesplit.prod.db
DATABASE_BACKUP_ENABLED=true
DATABASE_BACKUP_INTERVAL=3600000

# JWT Configuration
JWT_SECRET=your-super-secure-32-character-jwt-secret-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@wesplit.com

# MoonPay Configuration
MOONPAY_API_KEY=your-production-moonpay-api-key
MOONPAY_SECRET_KEY=your-production-moonpay-secret-key
MOONPAY_WEBHOOK_SECRET=your-moonpay-webhook-secret
MOONPAY_BASE_URL=https://api.moonpay.com

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
SOLANA_TESTNET_RPC_URL=https://api.testnet.solana.com
SOLANA_COMMITMENT=confirmed

# Security Configuration
CORS_ORIGIN=https://your-app-domain.com
ALLOWED_ORIGINS=https://your-app-domain.com,https://api.your-app-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_STRICT_MAX=10

# Monitoring & Logging
SENTRY_DSN=your-sentry-dsn-here
SENTRY_TRACES_SAMPLE_RATE=1.0
LOG_LEVEL=info
LOG_FORMAT=json
ANALYTICS_ENABLED=true

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
MAX_FILES=10

# Cache Configuration
CACHE_TTL=300000
CACHE_MAX_SIZE=1000
CACHE_CHECK_PERIOD=600000

# Push Notifications
FIREBASE_SERVER_KEY=your-firebase-server-key
FIREBASE_PROJECT_ID=your-firebase-project-id
PUSH_NOTIFICATIONS_ENABLED=true

# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Business Logic Configuration
MAX_TRANSACTION_AMOUNT=10000
MAX_GROUP_MEMBERS=50
MAX_EXPENSES_PER_GROUP=1000
VERIFICATION_CODE_EXPIRY=600000
VERIFICATION_CODE_LENGTH=6
`;

function updateFile(filePath, changes) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    changes.forEach(change => {
      if (content.includes(change.from)) {
        content = content.replace(change.from, change.to);
        updated = true;
        console.log(`✅ Updated: ${change.from.split('=')[0].trim()}`);
      } else {
        console.log(`⚠️  Pattern not found: ${change.from.split('=')[0].trim()}`);
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated file: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function cleanupConsoleLogs() {
  console.log('\n🧹 Cleaning up console logs...');
  
  const filesToClean = [
    'src/services/moonpayService.ts',
    'src/services/emailAuthService.ts',
    'src/context/WalletContext.tsx',
    'src/screens/Dashboard/DashboardScreen.tsx',
    'src/screens/AuthMethods/AuthMethodsScreen.tsx',
    'src/screens/Verification/VerificationScreen.tsx',
    'utils/walletService.ts',
    'utils/useWalletConnection.ts',
    'App.tsx'
  ];

  let cleanedCount = 0;

  filesToClean.forEach(filePath => {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Apply console log cleanup patterns
      consoleLogPatterns.forEach(pattern => {
        content = content.replace(pattern.pattern, pattern.replacement);
      });

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Cleaned console logs in: ${filePath}`);
        cleanedCount++;
      }
    } catch (error) {
      console.error(`❌ Error cleaning ${filePath}:`, error.message);
    }
  });

  console.log(`🧹 Cleaned ${cleanedCount} files`);
}

function createEnvFile() {
  const envPath = '.env.production';
  try {
    fs.writeFileSync(envPath, envTemplate);
    console.log(`✅ Created ${envPath}`);
    console.log('📝 Please update the environment variables with your production values');
  } catch (error) {
    console.error(`❌ Error creating ${envPath}:`, error.message);
  }
}

function validateProductionReadiness() {
  console.log('\n🔍 Validating production readiness...');
  
  const checks = [
    {
      name: 'EAS Configuration',
      file: 'eas.json',
      check: (content) => content.includes('"production"')
    },
    {
      name: 'App Configuration',
      file: 'app.json',
      check: (content) => content.includes('"bundleIdentifier"') && content.includes('"package"')
    },
    {
      name: 'Android Manifest',
      file: 'android/app/src/main/AndroidManifest.xml',
      check: (content) => content.includes('com.wesplit.app')
    },
    {
      name: 'iOS Info.plist',
      file: 'ios/WeSplit/Info.plist',
      check: (content) => content.includes('com.wesplit.app')
    }
  ];

  let passedChecks = 0;

  checks.forEach(check => {
    try {
      if (!fs.existsSync(check.file)) {
        console.log(`❌ ${check.name}: File not found`);
        return;
      }

      const content = fs.readFileSync(check.file, 'utf8');
      if (check.check(content)) {
        console.log(`✅ ${check.name}: Passed`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name}: Failed`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Error - ${error.message}`);
    }
  });

  console.log(`\n📊 Production readiness: ${passedChecks}/${checks.length} checks passed`);
  return passedChecks === checks.length;
}

// Main execution
function main() {
  console.log('1. Updating network configurations...');
  let updatedFiles = 0;
  
  updates.forEach(update => {
    console.log(`\n📝 ${update.description}`);
    if (updateFile(update.file, update.changes)) {
      updatedFiles++;
    }
  });

  console.log(`\n✅ Updated ${updatedFiles} files`);

  // Clean up console logs
  cleanupConsoleLogs();

  // Create environment file
  console.log('\n2. Creating production environment file...');
  createEnvFile();

  // Validate production readiness
  console.log('\n3. Validating production readiness...');
  const isReady = validateProductionReadiness();

  // Summary
  console.log('\n🎯 Production Setup Summary');
  console.log('============================');
  console.log(`✅ Network configurations updated: ${updatedFiles} files`);
  console.log('✅ Console logs cleaned up');
  console.log('✅ Environment file created');
  console.log(`✅ Production readiness: ${isReady ? 'READY' : 'NEEDS WORK'}`);

  if (isReady) {
    console.log('\n🚀 Ready for production build!');
    console.log('\nNext steps:');
    console.log('1. Update .env.production with your real values');
    console.log('2. Run: eas build --platform android --profile production');
    console.log('3. Run: eas build --platform ios --profile production');
    console.log('4. Test on physical devices');
  } else {
    console.log('\n⚠️  Please address the failed checks before production deployment');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  updateFile,
  cleanupConsoleLogs,
  createEnvFile,
  validateProductionReadiness
}; 