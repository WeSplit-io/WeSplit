# WeSplit Authentication System

This document describes the updated authentication system for WeSplit, which integrates Firebase Authentication with Solana AppKit for wallet creation.

## 🔐 Authentication Flow

### 1. Email/Password Authentication (Firebase)
- Users can sign up or sign in using email and password
- Firebase handles email verification automatically
- User data is stored in Firestore database

### 2. Solana Wallet Creation (AppKit)
- After successful Firebase authentication, users get a Solana wallet
- Wallet is created using Solana AppKit for mobile compatibility
- Wallet information is stored in the user's Firestore document

### 3. Social Authentication (Coming Soon)
- Google, Twitter, and Apple sign-in options
- Currently placeholder implementations

## 📱 Mobile Compatibility

### Solana Mobile Stack Integration
- **Mobile Wallet Adapter (MWA)**: Secure wallet connection protocol
- **Seed Vault**: Secure private key management (when available)
- **AppKit**: Simplified wallet creation and management

### React Native & Expo Support
- Works with both Expo managed and bare React Native
- Compatible with iOS and Android
- Uses Firebase Modular SDK for optimal performance

## 🏗️ Architecture

### File Structure
```
src/
├── config/
│   └── firebase.ts              # Firebase configuration and services
├── services/
│   └── solanaAppKitService.ts   # Solana AppKit integration
├── hooks/
│   └── useFirebaseAuth.ts       # Firebase auth state management
├── screens/
│   └── AuthMethods/
│       ├── AuthMethodsScreen.tsx # Main authentication screen
│       └── styles.ts            # UI styles
└── context/
    ├── AppContext.tsx           # App state management
    └── WalletContext.tsx        # Wallet state management
```

### Key Components

#### 1. Firebase Configuration (`src/config/firebase.ts`)
- Firebase app initialization
- Authentication service wrapper
- Firestore service for user data

#### 2. Solana AppKit Service (`src/services/solanaAppKitService.ts`)
- Wallet creation and management
- USDC and SOL transaction handling
- Network configuration (devnet/mainnet)

#### 3. AuthMethodsScreen (`src/screens/AuthMethods/AuthMethodsScreen.tsx`)
- Complete authentication UI
- Email verification flow
- Wallet creation modal
- Error handling and loading states

## 🚀 Getting Started

### Prerequisites
1. Firebase project with Authentication and Firestore enabled
2. Environment variables configured (see `FIREBASE_SETUP.md`)
3. Solana development environment (for testing)

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase configuration

# Start development server
npm start
```

### Configuration
1. Follow the Firebase setup guide in `FIREBASE_SETUP.md`
2. Configure your environment variables
3. Set up Firestore security rules
4. Test the authentication flow

## 🔧 Features

### Authentication Features
- ✅ Email/password sign up and sign in
- ✅ Email verification with resend capability
- ✅ Password visibility toggle
- ✅ Form validation and error handling
- ✅ Loading states and user feedback
- ✅ Persistent authentication state

### Wallet Features
- ✅ Automatic Solana wallet creation
- ✅ USDC and SOL balance tracking
- ✅ Transaction support (SOL and USDC)
- ✅ Development airdrop for testing
- ✅ Secure key management

### UI/UX Features
- ✅ Modern, responsive design
- ✅ Sign in/Sign up toggle
- ✅ Modal-based email verification
- ✅ Wallet creation confirmation
- ✅ Social authentication placeholders
- ✅ Keyboard-aware layout

## 🔒 Security Considerations

### Firebase Security
- Email verification required for full access
- Firestore security rules protect user data
- Authentication state persistence
- Rate limiting on authentication attempts

### Solana Security
- Private keys stored securely
- Network isolation (devnet vs mainnet)
- Transaction signing with proper validation
- USDC token account management

### Mobile Security
- Secure storage for sensitive data
- Biometric authentication support (future)
- App-level security measures

## 🧪 Testing

### Development Testing
1. **Firebase Authentication**: Test sign up/sign in flows
2. **Email Verification**: Verify email delivery and verification
3. **Wallet Creation**: Test wallet generation and storage
4. **Transactions**: Test SOL and USDC transfers
5. **Error Handling**: Test various error scenarios

### Production Testing
1. **Security**: Verify Firestore security rules
2. **Performance**: Test with real network conditions
3. **Compatibility**: Test on various devices and OS versions
4. **User Experience**: Validate complete user flows

## 🐛 Troubleshooting

### Common Issues

#### Firebase Issues
- **"Firebase not initialized"**: Check environment variables
- **"Permission denied"**: Verify Firestore security rules
- **"Email not verified"**: Check spam folder or resend

#### Solana Issues
- **"Wallet creation failed"**: Check network connectivity
- **"Transaction failed"**: Verify sufficient balance
- **"Airdrop failed"**: Normal in some cases, not critical

#### React Native Issues
- **"Module not found"**: Ensure all dependencies installed
- **"Metro bundler errors"**: Clear cache and restart
- **"Platform-specific issues"**: Check iOS/Android compatibility

### Debug Mode
Enable debug logging by checking `__DEV__` flag:
```javascript
if (__DEV__) {
  console.log('Auth state:', authState);
  console.log('Wallet info:', walletInfo);
}
```

## 📈 Future Enhancements

### Planned Features
- [ ] Social authentication (Google, Apple, Twitter)
- [ ] Biometric authentication
- [ ] Multi-wallet support
- [ ] Advanced security features
- [ ] Offline support
- [ ] Push notifications

### Solana Mobile Stack
- [ ] Full MWA integration
- [ ] Seed Vault integration
- [ ] Hardware wallet support
- [ ] Cross-wallet compatibility

## 📚 Resources

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [Solana AppKit](https://docs.solanaappkit.com/)
- [Solana Mobile Stack](https://solanamobile.radiant.nexus/)
- [React Native Firebase](https://rnfirebase.io/)

### Community
- [Solana Discord](https://discord.gg/solana)
- [Firebase Community](https://firebase.google.com/community)
- [React Native Community](https://reactnative.dev/community)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 