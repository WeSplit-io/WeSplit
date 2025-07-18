#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Environment Setup for WeSplit');
console.log('==========================================');
console.log('This script will help you create a .env file with Firebase configuration.\n');

console.log('📋 Instructions:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
console.log('2. Select your project: wesplit-35186');
console.log('3. Click the gear icon (⚙️) next to "Project Overview"');
console.log('4. Scroll down to "Your apps" section');
console.log('5. If no web app exists, click the web icon (</>) to add one');
console.log('6. Register your app with nickname "WeSplit Web"');
console.log('7. Copy the configuration object\n');

console.log('📝 Enter your Firebase configuration values:\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const questions = [
  {
    name: 'apiKey',
    message: 'Enter your Firebase API Key: ',
    required: true
  },
  {
    name: 'messagingSenderId',
    message: 'Enter your Firebase Messaging Sender ID: ',
    required: true
  },
  {
    name: 'appId',
    message: 'Enter your Firebase App ID: ',
    required: true
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    createEnvFile();
    return;
  }

  const question = questions[index];
  rl.question(question.message, (answer) => {
    if (!answer.trim() && question.required) {
      console.log('❌ This field is required. Please enter a value.');
      askQuestion(index);
      return;
    }
    
    answers[question.name] = answer.trim();
    askQuestion(index + 1);
  });
}

function createEnvFile() {
  const envContent = `# Firebase Configuration for WeSplit App
# Generated on ${new Date().toISOString()}

# Firebase Web App Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=${answers.apiKey}
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wesplit-35186
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=wesplit-35186.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${answers.messagingSenderId}
EXPO_PUBLIC_FIREBASE_APP_ID=${answers.appId}

# Environment
NODE_ENV=development

# Solana Network Configuration (if needed)
SOLANA_NETWORK=devnet

# MoonPay Configuration (optional)
MOONPAY_API_KEY=your_moonpay_api_key_here

# Email Configuration (optional)
EMAIL_SERVICE=gmail
EMAIL_USER=wesplit.io@gmail.com
EMAIL_PASS=your-app-specific-password
`;

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Successfully created .env file!');
    console.log(`📁 Location: ${envPath}`);
    console.log('\n🔒 Security Note:');
    console.log('- Keep your .env file secure and never commit it to version control');
    console.log('- Make sure .env is listed in your .gitignore file');
    console.log('\n🚀 Next Steps:');
    console.log('1. Restart your development server');
    console.log('2. Try signing in again');
    console.log('3. The Firebase API key error should be resolved');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
  
  rl.close();
}

// Start the questionnaire
askQuestion(0); 