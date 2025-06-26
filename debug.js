// Debug script to help identify splash screen issues
// Run this with: node debug.js

const fs = require('fs');
const path = require('path');

console.log('=== WeSplit Debug Information ===\n');

// Check if key files exist
const filesToCheck = [
  'index.ts',
  'App.tsx',
  'package.json',
  'app.json',
  'metro.config.js',
  'context/WalletContext.tsx',
  'screens/WelcomeScreen.tsx',
  'screens/CreatePoolScreen.tsx',
  'screens/ViewPoolScreen.tsx',
  'screens/TransactionConfirmationScreen.tsx',
  'utils/poolUtils.ts',
  'utils/priceUtils.ts'
];

console.log('Checking file existence:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`${exists ? '✓' : '✗'} ${file}`);
});

// Check package.json dependencies
console.log('\nChecking package.json dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log('Main entry point:', packageJson.main);
  console.log('Scripts available:', Object.keys(packageJson.scripts));
  
  const criticalDeps = [
    'react',
    'react-native',
    'expo',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@tanstack/react-query'
  ];
  
  console.log('\nCritical dependencies:');
  criticalDeps.forEach(dep => {
    const version = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
    console.log(`${dep}: ${version || 'NOT FOUND'}`);
  });
} catch (error) {
  console.error('Error reading package.json:', error.message);
}

// Check app.json configuration
console.log('\nChecking app.json configuration:');
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));
  console.log('App name:', appJson.expo.name);
  console.log('App slug:', appJson.expo.slug);
  console.log('Main entry point:', appJson.expo.main || 'index.ts (default)');
  console.log('Splash screen configured:', !!appJson.expo.splash);
} catch (error) {
  console.error('Error reading app.json:', error.message);
}

console.log('\n=== Debug Information Complete ===');
console.log('\nNext steps:');
console.log('1. Run: npx expo start --clear');
console.log('2. Check Metro bundler console for errors');
console.log('3. Check device/emulator console for React Native logs');
console.log('4. Try running on web: npx expo start --web'); 