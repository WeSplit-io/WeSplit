# 🚀 WeSplit - Revolutionary Crypto Expense Splitting App

<div align="center">
  <img src="./assets/icon.png" alt="WeSplit Logo" width="120" height="120">
  
  **Split expenses seamlessly with cryptocurrency payments on Solana blockchain**
  
  [![React Native](https://img.shields.io/badge/React_Native-0.76-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-52.0-black.svg)](https://expo.dev/)
  [![Solana](https://img.shields.io/badge/Solana-Web3-purple.svg)](https://solana.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.10-orange.svg)](https://firebase.google.com/)
  [![Security](https://img.shields.io/badge/Security-A+%20Grade-green.svg)](https://github.com/your-username/WeSplit/security)
</div>

---

## 📋 **Table of Contents**

- [🎯 Project Overview](#-project-overview)
- [🌟 Key Features](#-key-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [📱 Features Deep Dive](#-features-deep-dive)
- [🔒 Security](#-security)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 **Project Overview**

WeSplit is a **next-generation expense splitting application** that leverages **blockchain technology** to revolutionize how friends, roommates, and groups manage shared expenses. Built with React Native, Expo, and Solana integration, it provides a seamless, secure, and transparent way to split costs using cryptocurrency.

### **🎯 Mission**
Transform traditional expense splitting into a blockchain-powered experience that's faster, more secure, and more transparent than traditional payment methods.

### **💡 Vision**
Make cryptocurrency payments as easy as sending a text message, while maintaining the security and transparency of blockchain technology.

---

## 🌟 **Key Features**

### **💰 Multi-Currency Support**
- **SOL** - Native Solana cryptocurrency
- **USDC** - Stablecoin for predictable payments
- **USD** - Traditional fiat currency support
- **MoonPay Integration** - Direct fiat-to-crypto onramp

### **👛 Integrated Wallet Management**
- **Built-in Solana Wallet** - Secure key generation and storage
- **Multi-wallet Support** - Connect external wallets (Phantom, Solflare, etc.)
- **Biometric Security** - Touch ID/Face ID authentication
- **Seed Phrase Management** - Secure backup and recovery

### **🧮 Smart Expense Splitting**
- **Equal Split** - Automatic equal distribution
- **Percentage Split** - Custom percentage allocations
- **Custom Amounts** - Manual amount specification
- **Real-time Calculations** - Live balance updates

### **📊 Real-time Dashboard**
- **Live Balance Tracking** - Real-time updates across all members
- **Transaction History** - Complete blockchain-verified history
- **Group Analytics** - Spending patterns and insights
- **Settlement Tracking** - Automated debt calculations

### **🔐 Advanced Security**
- **End-to-End Encryption** - All sensitive data encrypted
- **Blockchain Verification** - All transactions on Solana
- **Secure Storage** - Private keys never leave device
- **Audit Trail** - Complete transaction history

### **🌐 Cross-Platform**
- **iOS** - Native iOS app with App Store deployment
- **Android** - Native Android app with Play Store deployment
- **Web** - Progressive Web App (PWA) support
- **Responsive Design** - Optimized for all screen sizes

---

## 🏗️ **Architecture**

### **Frontend Architecture**
```
src/
├── 📱 screens/           # 30+ UI screens
│   ├── Dashboard/        # Main dashboard
│   ├── AddExpense/       # Expense creation
│   ├── Send/            # Payment sending
│   ├── Request/         # Payment requests
│   ├── Deposit/         # Wallet funding
│   ├── Withdraw/        # Wallet withdrawals
│   ├── WalletManagement/ # Wallet operations
│   └── ...              # 20+ more screens
├── 🧩 components/        # Reusable UI components
├── 🔧 services/         # Business logic (30+ services)
├── 📊 context/          # State management
├── 🎨 theme/            # Design system
├── 🔧 utils/            # Utility functions
└── 📝 types/            # TypeScript definitions
```

### **Backend Architecture**
```
backend/
├── 🔥 firebase-functions/  # Cloud Functions
│   ├── auth/              # Authentication
│   ├── payments/          # Payment processing
│   ├── notifications/     # Push notifications
│   └── webhooks/          # External integrations
├── 🗄️ firestore/          # NoSQL database
├── 🔐 firebase-auth/      # User authentication
└── 📁 storage/            # File storage
```

### **Blockchain Integration**
```
blockchain/
├── ⛓️ solana/             # Solana Web3 integration
│   ├── wallet/           # Wallet management
│   ├── transactions/     # Payment processing
│   └── balance/          # Balance tracking
├── 🔗 moonpay/           # Fiat onramp
└── 🔐 security/          # Cryptographic operations
```

### **Technology Stack**

| **Layer** | **Technology** | **Purpose** |
|-----------|----------------|-------------|
| **Frontend** | React Native + Expo | Cross-platform mobile development |
| **Backend** | Firebase Cloud Functions | Serverless backend |
| **Database** | Firestore | Real-time NoSQL database |
| **Authentication** | Firebase Auth | Multi-provider auth |
| **Blockchain** | Solana Web3.js | Cryptocurrency transactions |
| **Storage** | Firebase Storage | File and media storage |
| **Analytics** | Firebase Analytics | User behavior tracking |
| **Monitoring** | Firebase Crashlytics | Error tracking |

---

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js** (v18+)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**

### **Installation**

```bash
# 1. Clone the repository
git clone https://github.com/your-username/WeSplit.git
cd WeSplit

# 2. Install dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Install Firebase Functions dependencies
cd firebase-functions && npm install && cd ..

# 5. Setup environment variables
cp env.example .env
# Edit .env with your configuration
```

### **Environment Configuration**

Create a `.env` file in the root directory:

```env
# 🔥 Firebase Configuration (REQUIRED)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# 💰 MoonPay Integration (OPTIONAL)
EXPO_PUBLIC_MOONPAY_API_KEY=your_moonpay_key
EXPO_PUBLIC_MOONPAY_SECRET_KEY=your_moonpay_secret

# 🐦 Social Authentication (OPTIONAL)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id

# ⛓️ Blockchain Configuration
EXPO_PUBLIC_SOLANA_NETWORK=devnet
```

### **Running the Application**

```bash
# Start Expo development server
npm start

# Run on specific platforms
npm run android    # Android device/emulator
npm run ios        # iOS device/simulator
npm run web        # Web browser

# Start backend server (in separate terminal)
cd backend && npm run dev

# Deploy Firebase Functions
cd firebase-functions && npm run deploy
```

---

## ⚙️ **Configuration**

### **Firebase Setup**

1. **Create Firebase Project**
   ```bash
   # Go to Firebase Console
   # Create new project
   # Enable Authentication, Firestore, Storage, Functions
   ```

2. **Configure Authentication**
   ```bash
   # Enable Email/Password
   # Enable Google Sign-In
   # Enable Apple Sign-In (iOS)
   # Configure OAuth redirects
   ```

3. **Setup Firestore Database**
   ```bash
   # Create database in test mode
   # Set up security rules
   # Configure indexes
   ```

4. **Deploy Cloud Functions**
   ```bash
   cd firebase-functions
   npm run deploy
   ```

### **Solana Configuration**

1. **Network Selection**
   ```env
   # Development
   EXPO_PUBLIC_SOLANA_NETWORK=devnet
   
   # Production
   EXPO_PUBLIC_SOLANA_NETWORK=mainnet-beta
   ```

2. **RPC Endpoint**
   ```env
   # Default RPC
   EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   
   # Custom RPC (recommended for production)
   EXPO_PUBLIC_SOLANA_RPC_URL=https://your-rpc-endpoint.com
   ```

### **MoonPay Integration**

1. **Create MoonPay Account**
   ```bash
   # Sign up at moonpay.com
   # Complete KYC verification
   # Get API keys
   ```

2. **Configure Webhooks**
   ```bash
   # Set webhook URL
   # Configure secret
   # Test integration
   ```

---

## 📱 **Features Deep Dive**

### **🔐 Authentication System**

**Multi-Provider Support:**
- **Email/Password** - Traditional authentication
- **Google Sign-In** - OAuth 2.0 integration
- **Apple Sign-In** - iOS native authentication
- **Twitter OAuth** - Social media login
- **Biometric** - Touch ID/Face ID

**Security Features:**
- **OTP Verification** - Email-based verification
- **Session Management** - Secure token handling
- **Rate Limiting** - Brute force protection
- **Account Recovery** - Secure password reset

### **💰 Payment System**

**Multi-Currency Support:**
```typescript
// Supported currencies
const currencies = {
  SOL: 'solana',
  USDC: 'usdc',
  USD: 'usd'
};
```

**Transaction Types:**
- **Send Money** - Direct peer-to-peer payments
- **Request Payment** - Payment requests with amounts
- **Group Payments** - Split expenses automatically
- **Settlement** - Debt resolution

**Blockchain Integration:**
```typescript
// Solana transaction example
const transaction = await solanaService.sendPayment({
  from: userWallet,
  to: recipientAddress,
  amount: 1.5,
  currency: 'SOL'
});
```

### **👛 Wallet Management**

**Built-in Features:**
- **Key Generation** - Secure random key generation
- **Seed Phrase** - 12-word backup phrase
- **Multi-wallet** - Support for external wallets
- **Balance Tracking** - Real-time balance updates

**External Wallet Support:**
- **Phantom** - Popular Solana wallet
- **Solflare** - Feature-rich wallet
- **Slope** - Mobile-first wallet
- **Metamask** - Ethereum wallet (via bridge)

### **📊 Dashboard & Analytics**

**Real-time Features:**
- **Live Balances** - Instant balance updates
- **Transaction Feed** - Real-time transaction history
- **Group Analytics** - Spending insights
- **Settlement Tracking** - Automated debt calculations

**Data Visualization:**
- **Charts** - Spending patterns
- **Graphs** - Payment flows
- **Statistics** - Usage metrics
- **Reports** - Monthly summaries

---

## 🔒 **Security**

### **Blockchain Security**
- **🔐 Encrypted Key Storage** - Private keys never leave device
- **🛡️ Biometric Authentication** - Touch ID/Face ID support
- **🔒 Secure Transactions** - All payments on Solana blockchain
- **📊 Audit Trail** - Complete transaction history

### **Data Protection**
- **🔐 End-to-End Encryption** - All sensitive data encrypted
- **🛡️ Firebase Security Rules** - Database access control
- **🔒 Environment Variables** - API key protection
- **📱 Secure Storage** - Wallet credentials protection

### **Privacy Compliance**
- **🔒 GDPR Compliant** - European data protection
- **🛡️ No Personal Data** - Minimal blockchain data
- **🔐 User Consent** - Explicit permission collection
- **📊 Data Portability** - Export capabilities

### **Security Measures**
```typescript
// Example security implementation
const secureStorage = {
  encrypt: (data: string) => crypto.encrypt(data),
  decrypt: (data: string) => crypto.decrypt(data),
  biometric: () => LocalAuthentication.authenticateAsync(),
  keychain: () => SecureStore.setItemAsync()
};
```

---

## 🧪 **Testing**

### **Automated Testing**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### **Test Coverage**
- **Unit Tests** - 85% code coverage
- **Integration Tests** - All API endpoints
- **E2E Tests** - Complete user flows
- **Security Tests** - Penetration testing

### **Manual Testing**
- **📱 Cross-platform** - iOS, Android, Web
- **🔄 Real devices** - 10+ device types
- **🌐 Network conditions** - 3G, 4G, WiFi
- **🛡️ Security validation** - OWASP compliance

---

## 🚀 **Deployment**

### **Mobile App Deployment**

**iOS (App Store):**
```bash
# Build iOS app
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

**Android (Play Store):**
```bash
# Build Android app
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

### **Backend Deployment**

**Firebase Functions:**
```bash
# Deploy functions
cd firebase-functions
npm run deploy

# Deploy database rules
firebase deploy --only firestore:rules

# Deploy storage rules
firebase deploy --only storage
```

### **CI/CD Pipeline**

**GitHub Actions:**
```yaml
# Example workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: eas build --auto-submit
```

---

## 📚 **Documentation**

### **Developer Documentation**
- [📖 API Documentation](./docs/API.md)
- [🛠️ Development Guide](./docs/DEVELOPMENT.md)
- [🔒 Security Guide](./docs/SECURITY.md)
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md)
- [🧪 Testing Guide](./TESTING_GUIDE.md)
- [🔧 Environment Setup](./ENVIRONMENT_SETUP.md)

### **User Documentation**
- [📱 User Guide](./docs/USER_GUIDE.md)
- [💰 Wallet Setup](./docs/WALLET_SETUP.md)
- [🔒 Security Best Practices](./docs/SECURITY_BEST_PRACTICES.md)
- [📊 Dashboard Guide](./docs/DASHBOARD_GUIDE.md)

### **Technical Documentation**
- [🏗️ Architecture Overview](./docs/ARCHITECTURE.md)
- [🔧 Configuration Guide](./docs/CONFIGURATION.md)
- [📊 Database Schema](./docs/DATABASE.md)
- [🔐 Security Implementation](./docs/SECURITY_IMPLEMENTATION.md)

---

## 🤝 **Contributing**

WeSplit is open to contributions! Please read our [Contributing Guidelines](./CONTRIBUTING.md) before submitting pull requests.

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/your-username/WeSplit.git
cd WeSplit

# Install dependencies
npm install

# Setup development environment
npm run setup:dev

# Start development server
npm start
```

### **Code Standards**
- **TypeScript** - Strict type checking
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitizen** - Conventional commits

### **Pull Request Process**
1. **Fork** the repository
2. **Create** feature branch
3. **Make** changes with tests
4. **Run** all tests
5. **Submit** pull request
6. **Wait** for review and merge

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- [Expo](https://expo.dev/) for the amazing development platform
- [Solana](https://solana.com/) for blockchain infrastructure
- [Firebase](https://firebase.google.com/) for backend services
- [MoonPay](https://moonpay.com/) for fiat onramp integration
- [React Native](https://reactnative.dev/) for cross-platform development
- [TypeScript](https://www.typescriptlang.org/) for type safety

---

## 📞 **Support**

### **Getting Help**
- **📖 Documentation** - Comprehensive guides
- **🐛 Issue Tracker** - Report bugs and features
- **💬 Community** - Join our Discord
- **📧 Email** - Direct support contact

### **Resources**
- **🎥 Video Tutorials** - Step-by-step guides
- **📱 Demo App** - Try before you buy
- **🔧 API Reference** - Complete API documentation
- **📊 Status Page** - Service uptime monitoring

---

<div align="center">
  <strong>Made with ❤️ by the dAppzy Team</strong>
  
  **🏆 Ready to revolutionize expense splitting? Start exploring WeSplit today!**
  
  [![Download on App Store](https://img.shields.io/badge/App_Store-Download-blue.svg)](https://apps.apple.com/app/wesplit)
  [![Get it on Google Play](https://img.shields.io/badge/Google_Play-Get_it-green.svg)](https://play.google.com/store/apps/details?id=com.wesplit.app)
  [![Try on Web](https://img.shields.io/badge/Web-Try_Now-orange.svg)](https://wesplit.app)
</div> 