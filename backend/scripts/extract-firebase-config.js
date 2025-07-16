#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Configuration Extractor');
console.log('=====================================');
console.log('This script helps you extract Firebase service account values to your .env file\n');

// Check if JSON file is provided as argument
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.log('❌ Please provide the path to your Firebase service account JSON file');
  console.log('Usage: node scripts/extract-firebase-config.js path/to/service-account.json');
  console.log('\nExample:');
  console.log('node scripts/extract-firebase-config.js wesplit-35186-firebase-adminsdk-xxxxx-xxxxxxxxxx.json');
  process.exit(1);
}

try {
  // Read the JSON file
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const serviceAccount = JSON.parse(jsonContent);

  console.log('✅ Successfully read service account JSON file');
  console.log(`📁 File: ${jsonFilePath}\n`);

  // Extract values
  const config = {
    FIREBASE_PROJECT_ID: serviceAccount.project_id,
    FIREBASE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
    FIREBASE_PRIVATE_KEY: `"${serviceAccount.private_key}"`,
    FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
    FIREBASE_CLIENT_ID: serviceAccount.client_id,
    FIREBASE_AUTH_URI: serviceAccount.auth_uri,
    FIREBASE_TOKEN_URI: serviceAccount.token_uri,
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL: serviceAccount.auth_provider_x509_cert_url,
    FIREBASE_CLIENT_X509_CERT_URL: serviceAccount.client_x509_cert_url
  };

  // Display the configuration
  console.log('📋 Firebase Configuration for your .env file:');
  console.log('==============================================');
  
  Object.entries(config).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });

  // Create .env file
  const envContent = `# Firebase Configuration
# Generated from ${path.basename(jsonFilePath)}

${Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n')}

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# MoonPay Configuration (optional)
MOONPAY_API_KEY=your_moonpay_api_key_here
`;

  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Created .env file with Firebase configuration');
  console.log(`📁 Location: ${envPath}`);
  console.log('\n🔒 Security Note:');
  console.log('- Keep your .env file secure and never commit it to version control');
  console.log('- The service account JSON file contains sensitive information');
  console.log('- Consider deleting the JSON file after extracting the values');

  // Verify the configuration
  console.log('\n🔍 Configuration Verification:');
  console.log(`✅ Project ID: ${config.FIREBASE_PROJECT_ID}`);
  console.log(`✅ Client Email: ${config.FIREBASE_CLIENT_EMAIL}`);
  console.log(`✅ Private Key: ${config.FIREBASE_PRIVATE_KEY.length > 50 ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`✅ Auth URI: ${config.FIREBASE_AUTH_URI}`);
  console.log(`✅ Token URI: ${config.FIREBASE_TOKEN_URI}`);

} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('❌ File not found:', jsonFilePath);
    console.log('\n💡 Make sure you:');
    console.log('1. Downloaded the service account JSON file from Firebase Console');
    console.log('2. Provided the correct path to the file');
    console.log('3. The file exists in the specified location');
  } else if (error instanceof SyntaxError) {
    console.error('❌ Invalid JSON file:', error.message);
    console.log('\n💡 Make sure the file is a valid JSON file from Firebase Console');
  } else {
    console.error('❌ Error:', error.message);
  }
  process.exit(1);
} 