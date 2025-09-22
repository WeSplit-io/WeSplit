# API Keys Guide for WeSplit

This guide provides step-by-step instructions for obtaining all API keys and credentials needed for your WeSplit application.

##  Table of Contents

1. [Firebase Configuration](#firebase-configuration)
2. [Email Service (Gmail)](#email-service-gmail)
3. [Google OAuth](#google-oauth)
4. [Apple Sign-In](#apple-sign-in)
5. [Twitter OAuth](#twitter-oauth)
6. [MoonPay](#moonpay)
7. [Solana RPC](#solana-rpc)
8. [Sentry Monitoring](#sentry-monitoring)
9. [JWT Secret Generation](#jwt-secret-generation)
10. [Complete .env Template](#complete-env-template)

---

##  Firebase Configuration

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Select your project: wesplit-35186 (or create a new one)

### Step 2: Get Web App Configuration
1. Click the ** gear icon**  **Project settings**
2. Scroll down to **"Your apps"** section
3. If no web app exists, click **"Add app"**  **Web app**
4. Register your app with name: WeSplit Web
5. Copy the configuration object

### Step 3: Extract Required Values
From the Firebase config object, extract these values:

`javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", //  EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "wesplit-35186.firebaseapp.com", //  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "wesplit-35186", //  EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "wesplit-35186.appspot.com", //  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789", //  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abcdef" //  EXPO_PUBLIC_FIREBASE_APP_ID
};
`

### Step 4: Get Measurement ID (Optional)
1. In Firebase Console  **Analytics**  **Dashboard**
2. If Analytics is enabled, copy the Measurement ID: G-XXXXXXXXXX
3. This becomes: EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID

### Step 5: Enable Authentication
1. Go to **Authentication**  **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider (we'll configure this later)

---

##  Email Service (Gmail)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. This is required to generate app passwords

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **"Mail"** and **"Other (Custom name)"**
3. Enter name: WeSplit App
4. Copy the 16-character password (e.g., bcd efgh ijkl mnop)

### Step 3: Configure Email Variables
`ash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com  # Your Gmail address
EMAIL_PASS=abcdefghijklmnop      # The 16-character app password (no spaces)
EMAIL_FROM=noreply@wesplit.com   # Can be your Gmail or custom domain
`

### Step 4: Test Email Configuration
`ash
# Test with a simple Node.js script
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER,
  subject: 'Test Email',
  text: 'This is a test email from WeSplit'
}).then(console.log).catch(console.error);
"
`

---

##  Google OAuth

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: wesplit-35186

### Step 2: Enable Required APIs
1. Go to **APIs & Services**  **Library**
2. Search for and enable:
   - **Google+ API**
   - **Google Sign-In API**
   - **People API**

### Step 3: Create OAuth 2.0 Credentials

#### Web Application
1. Go to **APIs & Services**  **Credentials**
2. Click **"+ CREATE CREDENTIALS"**  **"OAuth 2.0 Client IDs"**
3. Application type: **"Web application"**
4. Name: WeSplit Web Client
5. Authorized redirect URIs:
   - https://wesplit-35186.firebaseapp.com/__/auth/handler
   - http://localhost:3000/__/auth/handler (for development)
6. Copy **Client ID** and **Client Secret**

#### Android Application
1. Click **"+ CREATE CREDENTIALS"**  **"OAuth 2.0 Client IDs"**
2. Application type: **"Android"**
3. Name: WeSplit Android
4. Package name: com.wesplit.app
5. SHA-1 certificate fingerprint:
   `ash
   # Get SHA-1 from your keystore
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   `
6. Copy **Client ID**

#### iOS Application
1. Click **"+ CREATE CREDENTIALS"**  **"OAuth 2.0 Client IDs"**
2. Application type: **"iOS"**
3. Name: WeSplit iOS
4. Bundle ID: com.wesplit.app
5. Copy **Client ID**

### Step 4: Configure Firebase Auth
1. Go back to Firebase Console  **Authentication**  **Sign-in method**
2. Click **Google** provider
3. Add the OAuth client IDs you just created
4. Save configuration

### Step 5: Environment Variables
`ash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-web-client-secret
ANDROID_GOOGLE_CLIENT_ID=your-android-client-id.googleusercontent.com
IOS_GOOGLE_CLIENT_ID=your-ios-client-id.googleusercontent.com
`

---

##  JWT Secret Generation

### Generate Secure JWT Secret
`ash
# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: Using OpenSSL
openssl rand -hex 32

# Method 3: Online generator
# Go to https://generate-secret.vercel.app/32
`

### Environment Variables
`ash
JWT_SECRET=your-generated-64-character-hex-string
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
`

---

##  Complete .env Template

Create a file named .env in your project root:

`ash
# ===========================================
# WeSplit Environment Variables
# ===========================================

# Environment
NODE_ENV=development

# ===========================================
# FIREBASE CONFIGURATION (CRITICAL)
# ===========================================
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC_your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wesplit-35186
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=wesplit-35186.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ===========================================
# EMAIL CONFIGURATION (CRITICAL)
# ===========================================
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=noreply@wesplit.com

# ===========================================
# GOOGLE OAUTH CONFIGURATION
# ===========================================
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your-google-client-secret
ANDROID_GOOGLE_CLIENT_ID=your-android-client-id.googleusercontent.com
IOS_GOOGLE_CLIENT_ID=your-ios-client-id.googleusercontent.com

# ===========================================
# JWT CONFIGURATION
# ===========================================
JWT_SECRET=your-super-secure-64-character-jwt-secret-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# ===========================================
# SOLANA CONFIGURATION
# ===========================================
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
SOLANA_TESTNET_RPC_URL=https://api.testnet.solana.com
SOLANA_COMMITMENT=confirmed
`

---

##  Quick Start Checklist

### Phase 1: Critical (Required for Basic Functionality)
- [ ] Firebase Configuration (API Key, Project ID, etc.)
- [ ] Email Service (Gmail App Password)
- [ ] JWT Secret (Generated secure key)

### Phase 2: Important (Required for Full Features)
- [ ] Google OAuth (Web, Android, iOS client IDs)
- [ ] Solana RPC (Helius or QuickNode)

### Phase 3: Optional (Enhanced Features)
- [ ] Apple Sign-In (Developer account required)
- [ ] Twitter OAuth (Developer account required)
- [ ] MoonPay (Business account required)
- [ ] Sentry Monitoring (Free tier available)

---

##  Troubleshooting

### Common Issues and Solutions

#### Firebase API Key Not Working
- **Problem**: App can't connect to Firebase
- **Solution**: Ensure you're using the Web app API key, not Android/iOS
- **Check**: Key should start with AIzaSy

#### Gmail App Password Not Working
- **Problem**: Email sending fails
- **Solution**: Ensure 2FA is enabled and you're using the 16-character app password
- **Check**: Remove spaces from the password

#### OAuth Redirect URI Mismatch
- **Problem**: Google sign-in fails
- **Solution**: Add your domain to authorized redirect URIs
- **Check**: Use exact domain from Firebase auth domain

---

##  Support Resources

- **Firebase**: [Firebase Documentation](https://firebase.google.com/docs)
- **Google OAuth**: [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- **Gmail App Passwords**: [Google Account Security](https://myaccount.google.com/security)

---

##  Security Best Practices

1. **Never commit .env files to version control**
2. **Use different keys for development and production**
3. **Rotate API keys regularly**
4. **Monitor API usage and set up alerts**
5. **Use environment-specific configurations**

---

*Last updated: 2024-01-15*
*For WeSplit Application*

##  MoonPay

### Step 1: Create MoonPay Account
1. Go to [MoonPay Dashboard](https://dashboard.moonpay.com/)
2. Sign up for a business account
3. Complete KYC verification process
4. Wait for account approval (can take 1-3 business days)

### Step 2: Get API Credentials
1. Log into MoonPay Dashboard
2. Go to **Settings**  **API Keys**
3. Create a new API key
4. Copy **Public Key** and **Secret Key**

### Step 3: Configure Environment Variables
`ash
MOONPAY_PUBLIC_KEY=pk_test_your_public_key_here
MOONPAY_SECRET_KEY=sk_test_your_secret_key_here
MOONPAY_WEBHOOK_SECRET=your_webhook_secret_here
MOONPAY_BASE_URL=https://api.moonpay.com
`

### Step 4: Test MoonPay Integration
`ash
# Test API connection
curl -H "Authorization: Bearer YOUR_SECRET_KEY" \
     https://api.moonpay.com/v1/currencies
`

---

##  Solana RPC

### Step 1: Choose RPC Provider

#### Option A: Helius (Recommended)
1. Go to [Helius Dashboard](https://dashboard.helius.xyz/)
2. Sign up for free account
3. Create a new project
4. Copy your **API Key**

#### Option B: QuickNode
1. Go to [QuickNode Dashboard](https://app.quicknode.com/)
2. Sign up for free account
3. Create Solana endpoint
4. Copy your **HTTP URL**

#### Option C: Alchemy
1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Sign up for free account
3. Create Solana app
4. Copy your **API Key**

### Step 2: Configure Environment Variables
`ash
# For Helius
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
SOLANA_RPC_API_KEY=your_helius_api_key_here

# For QuickNode
SOLANA_RPC_URL=https://your-endpoint.quiknode.pro/YOUR_API_KEY/
SOLANA_RPC_API_KEY=your_quicknode_api_key_here

# For Alchemy
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
SOLANA_RPC_API_KEY=your_alchemy_api_key_here
`

### Step 3: Test RPC Connection
`ash
# Test with curl
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  YOUR_SOLANA_RPC_URL
`

---

##  Sentry Monitoring

### Step 1: Create Sentry Account
1. Go to [Sentry.io](https://sentry.io/)
2. Sign up for free account
3. Create a new project
4. Select **React Native** as platform

### Step 2: Get DSN (Data Source Name)
1. In your Sentry project dashboard
2. Go to **Settings**  **Projects**  **Your Project**
3. Click **Client Keys (DSN)**
4. Copy the **DSN** URL

### Step 3: Configure Environment Variables
`ash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
`

### Step 4: Get Auth Token (Optional)
1. Go to **Settings**  **Auth Tokens**
2. Create new token with **project:read** scope
3. Copy the token

### Step 5: Test Sentry Integration
`ash
# Test error reporting
node -e "
const Sentry = require('@sentry/react-native');
Sentry.init({ dsn: 'YOUR_DSN' });
Sentry.captureException(new Error('Test error'));
"
`

---


##  Apple Sign-In

### Step 1: Apple Developer Account
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple ID
3. Enroll in Apple Developer Program (/year)
4. Wait for approval (can take 1-2 business days)

### Step 2: Create App ID
1. Go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers**  **+**  **App IDs**
3. Select **App**  **Continue**
4. Description: WeSplit App
5. Bundle ID: com.wesplit.app (must match your app)
6. Enable **Sign In with Apple** capability
7. Click **Continue**  **Register**

### Step 3: Create Service ID
1. Click **Identifiers**  **+**  **Services IDs**
2. Description: WeSplit Web Service
3. Identifier: com.wesplit.web.service
4. Enable **Sign In with Apple**
5. Configure domains and redirect URLs:
   - Primary App ID: Select your App ID
   - Domains: wesplit-35186.firebaseapp.com
   - Redirect URLs: https://wesplit-35186.firebaseapp.com/__/auth/handler

### Step 4: Create Private Key
1. Go to **Keys**  **+**
2. Key Name: WeSplit Sign In with Apple Key
3. Enable **Sign In with Apple**
4. Configure: Select your Primary App ID
5. Click **Continue**  **Register**
6. Download the .p8 file (you can only download once!)
7. Note the **Key ID**

### Step 5: Configure Environment Variables
`ash
APPLE_SIGN_IN_SERVICE_ID=com.wesplit.web.service
APPLE_SIGN_IN_KEY_ID=your_key_id_here
APPLE_SIGN_IN_TEAM_ID=your_team_id_here
APPLE_SIGN_IN_PRIVATE_KEY_PATH=./apple-signin-key.p8
`

---

##  Twitter OAuth

### Step 1: Twitter Developer Account
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. Apply for developer access
4. Wait for approval (can take 1-7 days)

### Step 2: Create App
1. Go to **Developer Portal**  **Projects & Apps**
2. Click **Create App**
3. App Name: WeSplit
4. App Description: WeSplit - Expense splitting app
5. Website URL: https://wesplit-35186.firebaseapp.com
6. Callback URLs: https://wesplit-35186.firebaseapp.com/__/auth/handler

### Step 3: Get API Keys
1. Go to your app  **Keys and tokens**
2. Copy **API Key** and **API Key Secret**
3. Generate **Access Token** and **Access Token Secret**

### Step 4: Configure Environment Variables
`ash
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here
`

### Step 5: Test Twitter Integration
`ash
# Test API connection
curl -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
     "https://api.twitter.com/2/users/me"
`

---

