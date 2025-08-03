# Firebase Setup for WeSplit

This guide will help you set up Firebase Authentication and Firestore for the WeSplit app.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "wesplit-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## 3. Set up Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database
5. Click "Done"

## 4. Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click the web app icon (</>) to add a web app
4. Register your app with a nickname (e.g., "WeSplit Web")
5. Copy the configuration object

## 5. Configure Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Solana Network Configuration
NODE_ENV=development
```

Replace the placeholder values with your actual Firebase configuration.

## 6. Firestore Security Rules

For development, you can use these basic rules. For production, you should implement proper security rules.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read and write groups
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read and write expenses
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 7. Email Templates (Optional)

1. In Firebase Authentication, go to "Templates" tab
2. Customize the email verification template
3. Add your app's branding and messaging

## 8. Testing the Setup

1. Start your development server: `npm start`
2. Navigate to the AuthMethods screen
3. Try creating a new account with email/password
4. Check your email for verification
5. Verify that the user document is created in Firestore

## 9. Production Considerations

Before deploying to production:

1. **Security Rules**: Implement proper Firestore security rules
2. **Email Verification**: Customize email templates
3. **Domain Verification**: Add your app's domain to authorized domains
4. **Rate Limiting**: Configure appropriate rate limits
5. **Monitoring**: Set up Firebase Analytics and Crashlytics

## 10. Troubleshooting

### Common Issues:

1. **"Firebase App not initialized"**: Make sure your environment variables are set correctly
2. **"Permission denied"**: Check your Firestore security rules
3. **"Email not verified"**: Check spam folder or resend verification email
4. **"Network error"**: Ensure you have internet connectivity

### Debug Mode:

Enable debug logging by adding this to your app:

```javascript
if (__DEV__) {
  console.log('Firebase config:', firebaseConfig);
}
```

## Support

If you encounter issues, check:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [React Native Firebase](https://rnfirebase.io/) 