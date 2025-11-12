# 🚀 WeSplit APK Build Guide

This guide will help you build downloadable APK and IPA files for the WeSplit app with proper environment variable configuration for Firebase interactions.

## 📋 Prerequisites

1. **EAS CLI installed**: `npm install -g @expo/eas-cli`
2. **EAS account**: Sign up at [expo.dev](https://expo.dev)
3. **Firebase project**: Set up Firebase project with authentication and Firestore
4. **Solana wallet**: Company wallet for fee collection
5. **Helius API key**: For Solana RPC endpoints

## 🔧 Environment Setup

### 1. Configure EAS Secrets

Set up all required environment variables as EAS secrets:

```bash
# Firebase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-firebase-api-key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project.firebasestorage.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "your-measurement-id"

# Solana Configuration
eas secret:create --scope project --name EXPO_PUBLIC_HELIUS_API_KEY --value "your-helius-api-key"

# Company Wallet Configuration
# SECURITY: Secret key is NOT stored in client-side code
# EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY removed - must be handled by backend services only
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "your-wallet-address"

# OAuth Configuration
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "your-google-client-id"
eas secret:create --scope project --name ANDROID_GOOGLE_CLIENT_ID --value "your-android-google-client-id"
eas secret:create --scope project --name IOS_GOOGLE_CLIENT_ID --value "your-ios-google-client-id"
eas secret:create --scope project --name EXPO_PUBLIC_APPLE_CLIENT_ID --value "your-apple-client-id"
eas secret:create --scope project --name EXPO_PUBLIC_APPLE_SERVICE_ID --value "your-apple-service-id"
eas secret:create --scope project --name EXPO_PUBLIC_APPLE_TEAM_ID --value "your-apple-team-id"
eas secret:create --scope project --name EXPO_PUBLIC_APPLE_KEY_ID --value "your-apple-key-id"

# Security Configuration
eas secret:create --scope project --name JWT_SECRET --value "your-jwt-secret"

# MoonPay Configuration
eas secret:create --scope project --name MOONPAY_API_KEY --value "your-moonpay-api-key"
eas secret:create --scope project --name MOONPAY_SECRET_KEY --value "your-moonpay-secret-key"

# Email Configuration
eas secret:create --scope project --name EMAIL_USER --value "your-email@gmail.com"
eas secret:create --scope project --name EMAIL_PASS --value "your-app-password"

# Monitoring
eas secret:create --scope project --name SENTRY_DSN --value "your-sentry-dsn"
eas secret:create --scope project --name FIREBASE_SERVER_KEY --value "your-firebase-server-key"
```

### 2. Validate Configuration

Run the validation script to ensure all required variables are set:

```bash
npm run validate:apk
```

## 🏗️ Building APKs

### Quick Build Commands

```bash
# Build Android APK
npm run build:android

# Build iOS IPA
npm run build:ios

# Build both platforms
npm run build:both

# Direct EAS commands
npm run eas:build:android
npm run eas:build:ios
npm run eas:build:both
```

### Manual Build Commands

```bash
# Android APK
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production

# Both platforms
eas build --platform all --profile production
```

## 📱 Installation & Testing

### Android APK Installation

1. **Download APK**: Get the APK from your EAS dashboard
2. **Enable Unknown Sources**: 
   - Go to Settings > Security > Unknown Sources
   - Enable installation from unknown sources
3. **Install APK**: Tap the downloaded APK file
4. **Test Firebase**: Verify authentication and Firestore operations

### iOS IPA Installation

1. **TestFlight**: Upload to App Store Connect for TestFlight distribution
2. **Direct Install**: Use Apple Configurator 2 or Xcode for direct installation
3. **Test Firebase**: Verify authentication and Firestore operations

## 🔍 Testing Checklist

After installing the APK/IPA, test the following:

### ✅ Firebase Integration
- [ ] User registration/login
- [ ] Email verification
- [ ] Social authentication (Google, Apple)
- [ ] Firestore read/write operations
- [ ] Push notifications
- [ ] User profile management

### ✅ Solana Integration
- [ ] Wallet creation/import
- [ ] USDC transactions
- [ ] Fee calculations
- [ ] Transaction history
- [ ] Balance updates

### ✅ App Features
- [ ] Bill splitting functionality
- [ ] Group management
- [ ] Payment processing
- [ ] Receipt scanning
- [ ] Settings and preferences

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Authentication Fails**
   - Check Firebase API key and project ID
   - Verify Firebase project configuration
   - Ensure proper domain configuration

2. **Solana Transactions Fail**
   - Verify Helius API key
   - Check company wallet configuration
   - Ensure sufficient SOL balance for fees

3. **Build Fails**
   - Check EAS secrets are properly set
   - Verify eas.json configuration
   - Check for missing dependencies

4. **APK Installation Fails**
   - Enable "Unknown Sources" on Android
   - Check APK file integrity
   - Verify device compatibility

### Debug Commands

```bash
# Check EAS secrets
eas secret:list --scope project

# View build logs
eas build:list

# Check project configuration
eas project:info

# Validate environment
npm run validate:env
```

## 📊 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `wesplit-35186` |
| `EXPO_PUBLIC_HELIUS_API_KEY` | Helius RPC API key | `your-helius-key` |
| `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` | Company wallet address | `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM` |
| `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY` | **REMOVED** - Secret key must be handled by backend services only | N/A |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_FORCE_MAINNET` | Force mainnet usage | `true` |
| `EXPO_PUBLIC_DEV_NETWORK` | Network environment | `mainnet` |
| `EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE` | Default fee percentage | `3.0` |
| `EXPO_PUBLIC_COMPANY_MIN_FEE` | Minimum fee amount | `0.001` |
| `EXPO_PUBLIC_COMPANY_MAX_FEE` | Maximum fee amount | `10.00` |

## 🔐 Security Considerations

1. **Never commit secrets**: Use EAS secrets for all sensitive data
2. **Rotate keys regularly**: Update API keys and secrets periodically
3. **Monitor usage**: Check Firebase and Helius usage regularly
4. **Test thoroughly**: Verify all functionality before distribution
5. **Backup wallet**: Ensure company wallet is properly backed up

## 📞 Support

If you encounter issues:

1. Check the [EAS documentation](https://docs.expo.dev/build/introduction/)
2. Review Firebase console for errors
3. Check Helius dashboard for RPC issues
4. Contact the development team for assistance

## 🎯 Next Steps

After successful APK/IPA generation:

1. **Distribute**: Share APK/IPA with testers
2. **Monitor**: Track app performance and errors
3. **Update**: Deploy updates as needed
4. **Scale**: Prepare for app store submission

---

**Happy Building! 🚀**
