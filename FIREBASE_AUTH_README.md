# Firebase Authentication System for WeSplit

This document explains the new Firebase-based authentication system that uses email verification codes without passwords.

## Overview

The new authentication system uses:
- **Firebase Auth** for user management
- **Firestore** for storing verification codes and user data
- **Firebase Functions** for sending verification emails (optional)
- **AsyncStorage** for local token persistence

## Features

- ✅ 4-digit email verification codes
- ✅ No passwords required
- ✅ Secure token-based authentication
- ✅ Automatic token refresh
- ✅ Email verification via Firebase Functions or local service
- ✅ Persistent authentication state
- ✅ Clean logout functionality

## Architecture

### 1. Authentication Flow

```
User enters email → Generate 4-digit code → Store in Firestore → Send email → User enters code → Verify code → Create/authenticate Firebase user → Store tokens → User logged in
```

### 2. Components

- **`src/config/firebase.ts`** - Firebase configuration and initialization
- **`src/services/firebaseAuthService.ts`** - Main authentication service
- **`src/services/emailService.ts`** - Email service for development
- **`firebase-functions/`** - Firebase Cloud Functions for production email sending

## Setup Instructions

### 1. Firebase Configuration

1. **Update Firebase Config**: Replace the placeholder values in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

2. **Enable Authentication**: In Firebase Console:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password" provider
   - Enable "Email link (passwordless sign-in)" if desired

3. **Setup Firestore**: In Firebase Console:
   - Go to Firestore Database
   - Create database in production mode
   - Deploy security rules: `firebase deploy --only firestore:rules`

### 2. Firebase Functions (Optional - for production email sending)

1. **Install Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Firebase Functions**:
```bash
cd firebase-functions
npm install
```

4. **Configure Email Service**:
   - Update email configuration in `firebase-functions/src/index.ts`
   - Set Firebase config values:
```bash
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
```

5. **Deploy Functions**:
```bash
firebase deploy --only functions
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# EmailJS Configuration (for real email sending)
EXPO_PUBLIC_EMAILJS_SERVICE_ID=your-emailjs-service-id
EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
EXPO_PUBLIC_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
```

### 4. EmailJS Setup (for real email sending)

1. **Sign up for EmailJS**: Go to [EmailJS](https://www.emailjs.com/) and create an account

2. **Create Email Service**:
   - Go to Email Services → Add New Service
   - Choose your email provider (Gmail, Outlook, etc.)
   - Configure your email credentials

3. **Create Email Template**:
   - Go to Email Templates → Create New Template
   - Use this template:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 32px;">WeSplit</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Your verification code</p>
  </div>
  
  <div style="padding: 40px; background: #f9f9f9;">
    <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
    <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
      You requested a verification code for your WeSplit account. Use the code below to complete your verification:
    </p>
    
    <div style="background: white; border: 2px solid #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
      <h1 style="color: #667eea; font-size: 48px; margin: 0; letter-spacing: 10px; font-family: 'Courier New', monospace;">{{code}}</h1>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
    </p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #999; font-size: 12px;">
        © 2024 WeSplit. All rights reserved.
      </p>
    </div>
  </div>
</div>
```

4. **Get Configuration Values**:
   - Service ID: Found in Email Services
   - Template ID: Found in Email Templates
   - Public Key: Found in Account → API Keys

5. **Update Environment Variables**: Add the EmailJS values to your `.env` file

## Usage

### 1. Send Verification Code

```typescript
import { sendVerificationCode } from '../services/firebaseAuthService';

const result = await sendVerificationCode('user@example.com');
if (result.success) {
  console.log('Verification code sent!');
  // In development, the code will be logged to console
  // In production, it will be sent via email
}
```

### 2. Verify Code and Authenticate

```typescript
import { verifyCode } from '../services/firebaseAuthService';

const result = await verifyCode('user@example.com', '1234');
if (result.success) {
  console.log('User authenticated:', result.user);
  // User is now logged in and tokens are stored
}
```

### 3. Check Authentication Status

```typescript
import { isAuthenticated, getCurrentUser } from '../services/firebaseAuthService';

const isLoggedIn = await isAuthenticated();
const currentUser = await getCurrentUser();
```

### 4. Logout

```typescript
import { logout } from '../services/firebaseAuthService';

await logout();
// User is signed out and all tokens are cleared
```

## Development vs Production

### Development Mode
- Verification codes are logged to console
- No actual emails are sent
- Uses local email service simulation
- Firebase Functions are optional

### Production Mode
- Verification codes are sent via email
- Uses Firebase Functions for email delivery
- Requires proper email service configuration
- All security rules are enforced

## Security Features

1. **Verification Code Security**:
   - 4-digit codes expire after 10 minutes
   - Codes can only be used once
   - Codes are stored securely in Firestore

2. **Token Security**:
   - Access tokens are stored in AsyncStorage
   - Automatic token refresh via Firebase
   - Secure logout clears all tokens

3. **Firestore Security Rules**:
   - Users can only access their own data
   - Verification codes are protected
   - Group and expense data is properly secured

## Troubleshooting

### Common Issues

1. **Firebase Configuration Error**:
   - Check that all Firebase config values are correct
   - Ensure Firebase project is properly set up

2. **Email Not Sending**:
   - In development: Check console logs for verification codes
   - In production: Verify Firebase Functions deployment
   - Check email service configuration

3. **Authentication Fails**:
   - Verify Firestore security rules are deployed
   - Check that Firebase Auth is enabled
   - Ensure proper error handling in your app

4. **AsyncStorage Warning**:
   - This is normal and expected
   - AsyncStorage is already installed and configured

### Debug Mode

Enable debug logging by checking `__DEV__` in your code:

```typescript
if (__DEV__) {
  console.log('Debug information');
}
```

## Migration from Backend API

If you're migrating from the backend API approach:

1. **Update imports**: Change from `emailAuthService` to `firebaseAuthService`
2. **Update function calls**: Use the new Firebase-based functions
3. **Remove backend dependencies**: No more API calls to your backend
4. **Update error handling**: Handle Firebase-specific errors

## Next Steps

1. **Deploy Firebase Functions** for production email sending
2. **Configure proper email service** (SendGrid, Mailgun, etc.)
3. **Set up Firebase Analytics** for user tracking
4. **Implement user profile management**
5. **Add social authentication** if needed

## Support

For issues or questions:
1. Check Firebase Console for errors
2. Review Firebase documentation
3. Check console logs for debugging information
4. Verify all configuration values are correct 