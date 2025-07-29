# Environment Setup Guide

## Overview
This guide helps you set up the required environment variables for the WeSplit app.

## Required Environment Variables

### Firebase Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# MoonPay Configuration (Optional)
MOONPAY_API_KEY=your_moonpay_api_key_here
MOONPAY_SECRET_KEY=your_moonpay_secret_key_here
MOONPAY_WEBHOOK_SECRET=your_moonpay_webhook_secret_here
```

### Getting Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings
4. Scroll down to "Your apps" section
5. Click on the web app (or create one if none exists)
6. Copy the configuration values

### Development vs Production

- **Development**: Only Solana configuration is required
- **Production**: Both Firebase and Solana configurations are required

## Current Status

The app is currently configured to work in development mode without Firebase keys. The environment validation will:

- ✅ Allow the app to start in development without Firebase keys
- ❌ Require Firebase keys in production
- ✅ Always require Solana configuration

## Troubleshooting

### Firebase Auth Persistence Warning
This warning appears because Firebase Auth needs AsyncStorage for persistence. The app includes a persistence configuration, but you may need to update your Firebase version to get the full React Native persistence support.

### Missing Environment Variables
If you see errors about missing environment variables:

1. Check that your `.env` file exists in the root directory
2. Verify that all required variables are set
3. Restart the development server after making changes

### Development Mode
In development mode, the app will work without Firebase configuration. You can:

1. Use mock data for testing
2. Focus on UI/UX development
3. Test Solana wallet functionality

## Next Steps

1. Set up Firebase project and add configuration
2. Configure MoonPay for production payments
3. Test the app with real Firebase backend
4. Deploy to production with all environment variables set 