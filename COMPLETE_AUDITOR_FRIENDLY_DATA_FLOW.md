# WeSplit App - Complete Data Flow for Non-Technical Auditors

## 🎯 **What is WeSplit?**
WeSplit is a mobile app that allows users to:
- Send and receive money using cryptocurrency (USDC)
- Split bills with friends and family
- Deposit money from bank accounts
- Manage digital wallets

---

## 📱 **APP STRUCTURE - What Users See**

### **Main User Journey**
```
1. Download App → 2. Create Account → 3. Set Up Wallet → 4. Use App Features
```

### **App Screens (What Users Interact With)**
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  📱 LOGIN & SETUP                                              │
│  • Splash Screen (App loading)                                │
│  • Get Started (Welcome)                                      │
│  • Authentication (Email verification)                        │
│  • Create Profile (Name, photo)                               │
│  • Onboarding (Tutorial)                                      │
│                                                                 │
│  🏠 MAIN DASHBOARD                                             │
│  • Balance display                                             │
│  • Recent transactions                                         │
│  • Quick action buttons                                        │
│                                                                 │
│  💰 MONEY FEATURES                                             │
│  • Send Money (to contacts)                                   │
│  • Request Money (from contacts)                              │
│  • Deposit Money (from bank)                                  │
│  • Withdraw Money (to bank)                                   │
│                                                                 │
│  🧾 BILL SPLITTING                                             │
│  • Create Split (new bill)                                    │
│  • Join Split (existing bill)                                 │
│  • Fair Split (equal amounts)                                 │
│  • Degen Split (random winner)                                │
│                                                                 │
│  ⚙️ SETTINGS & MANAGEMENT                                      │
│  • Profile Settings                                            │
│  • Wallet Management                                           │
│  • Contact List                                                │
│  • Transaction History                                         │
│  • Notifications                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **BACKEND SYSTEMS - What Powers the App**

### **1. User Data Storage (Firebase)**
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER DATA SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│  📊 USER PROFILES                                              │
│  • Name, email, photo                                          │
│  • Wallet address                                              │
│  • Account settings                                            │
│  • Login history                                               │
│                                                                 │
│  👥 CONTACTS                                                   │
│  • Friends and family list                                     │
│  • Contact details                                             │
│  • Transaction history with each contact                       │
│                                                                 │
│  💳 TRANSACTIONS                                               │
│  • All money sent/received                                     │
│  • Transaction details                                         │
│  • Timestamps and amounts                                      │
│  • Success/failure status                                      │
│                                                                 │
│  🔔 NOTIFICATIONS                                              │
│  • Payment requests                                            │
│  • Split invitations                                           │
│  • Transaction confirmations                                   │
│  • System alerts                                               │
│                                                                 │
│  🧾 SPLIT BILLS                                                │
│  • Bill details and amounts                                    │
│  • Participant list                                            │
│  • Payment status for each person                             │
│  • Split wallet information                                    │
└─────────────────────────────────────────────────────────────────┘
```

### **2. Money System (Solana Blockchain)**
```
┌─────────────────────────────────────────────────────────────────┐
│                    MONEY SYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│  💰 DIGITAL WALLET                                             │
│  • Each user gets a unique wallet address                      │
│  • Stores USDC cryptocurrency                                 │
│  • Private keys stored securely on device                     │
│  • Seed phrase for wallet recovery                            │
│                                                                 │
│  💸 MONEY TRANSFERS                                            │
│  • Send USDC to other users                                   │
│  • Receive USDC from other users                              │
│  • Real-time balance updates                                  │
│  • Transaction verification on blockchain                      │
│                                                                 │
│  🏦 BANK INTEGRATION                                            │
│  • MoonPay service for bank deposits                          │
│  • Convert bank money to USDC                                 │
│  • Secure payment processing                                   │
│  • Regulatory compliance                                       │
└─────────────────────────────────────────────────────────────────┘
```

### **3. External Services**
```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  🏦 MOONPAY (Bank Integration)                                 │
│  • Connects user bank accounts                                 │
│  • Converts dollars to USDC cryptocurrency                    │
│  • Handles payment processing                                  │
│  • Manages regulatory compliance                               │
│                                                                 │
│  🤖 AI SERVICES (Bill Processing)                              │
│  • Scans receipt photos                                        │
│  • Extracts bill information automatically                     │
│  • Identifies items and amounts                                │
│  • Suggests how to split bills                                 │
│                                                                 │
│  📱 PUSH NOTIFICATIONS                                         │
│  • Sends alerts to user phones                                 │
│  • Payment confirmations                                       │
│  • Split invitations                                           │
│  • Security alerts                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **HOW DATA FLOWS THROUGH THE APP**

### **1. User Registration Process**
```
User enters email
    ↓
App sends verification code
    ↓
User verifies email
    ↓
App creates user profile in database
    ↓
App generates digital wallet
    ↓
App stores wallet securely on device
    ↓
User can now use the app
```

### **2. Sending Money Process**
```
User selects contact and amount
    ↓
App checks sender's wallet balance
    ↓
App creates transaction on blockchain
    ↓
App deducts money from sender's wallet
    ↓
App adds money to recipient's wallet
    ↓
App saves transaction record in database
    ↓
App sends notification to recipient
    ↓
Both users see updated balances
```

### **3. Bill Splitting Process**
```
User takes photo of receipt
    ↓
AI extracts bill information
    ↓
User selects who to split with
    ↓
App creates split group
    ↓
App sends invitations to participants
    ↓
Participants join the split
    ↓
App creates shared wallet for the split
    ↓
Each person pays their portion
    ↓
App distributes money fairly
    ↓
Split is completed
```

### **4. Depositing Money Process**
```
User wants to add money from bank
    ↓
App connects to MoonPay service
    ↓
User enters bank details securely
    ↓
MoonPay processes bank transfer
    ↓
Bank money converts to USDC
    ↓
USDC appears in user's wallet
    ↓
App updates user's balance
```

---

## 🛡️ **SECURITY & PRIVACY**

### **Data Protection**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY MEASURES                           │
├─────────────────────────────────────────────────────────────────┤
│  🔐 USER DATA                                                  │
│  • Email verification required                                 │
│  • Strong password requirements                               │
│  • Account recovery options                                    │
│  • Data encrypted in transit and at rest                      │
│                                                                 │
│  💰 MONEY SECURITY                                             │
│  • Private keys never leave user's device                     │
│  • Seed phrases encrypted and stored locally                  │
│  • All transactions verified on blockchain                    │
│  • No central storage of user funds                           │
│                                                                 │
│  🏦 BANK INTEGRATION                                            │
│  • MoonPay handles all bank connections                       │
│  • Bank details never stored in our app                       │
│  • PCI compliance for payment processing                      │
│  • Regulatory compliance maintained                            │
│                                                                 │
│  📱 DEVICE SECURITY                                            │
│  • Biometric authentication (fingerprint/face)                │
│  • App locks after inactivity                                 │
│  • Secure storage for sensitive data                          │
│  • No screenshots of sensitive screens                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 **DATA STORAGE LOCATIONS**

### **What's Stored Where**
```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE BREAKDOWN                      │
├─────────────────────────────────────────────────────────────────┤
│  📱 ON USER'S DEVICE (Local Storage)                          │
│  • Wallet private keys (encrypted)                            │
│  • Seed phrases (encrypted)                                   │
│  • App preferences                                            │
│  • Cached data for faster loading                             │
│                                                                 │
│  ☁️ FIREBASE DATABASE (Cloud Storage)                         │
│  • User profiles (name, email, photo)                         │
│  • Contact lists                                              │
│  • Transaction history                                        │
│  • Split bill data                                            │
│  • Notification records                                       │
│  • App settings and preferences                               │
│                                                                 │
│  ⛓️ SOLANA BLOCKCHAIN (Public Network)                        │
│  • USDC token balances                                        │
│  • Transaction records                                        │
│  • Wallet addresses                                           │
│  • Smart contract interactions                                │
│                                                                 │
│  🏦 MOONPAY SERVERS (External Service)                        │
│  • Bank account connections (temporary)                       │
│  • Payment processing data                                    │
│  • Regulatory compliance records                              │
│  • Transaction confirmations                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 **AUDIT TRAIL & COMPLIANCE**

### **What Can Be Audited**
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT CAPABILITIES                          │
├─────────────────────────────────────────────────────────────────┤
│  📋 USER ACTIVITY                                              │
│  • All login attempts and times                               │
│  • Profile changes and updates                                │
│  • Security settings modifications                            │
│  • App usage patterns                                         │
│                                                                 │
│  💰 FINANCIAL TRANSACTIONS                                     │
│  • Complete transaction history                               │
│  • Source and destination of all transfers                    │
│  • Transaction timestamps and amounts                         │
│  • Success/failure status for each transaction                │
│  • Blockchain transaction IDs (verifiable)                    │
│                                                                 │
│  🧾 BILL SPLITTING                                             │
│  • All split bill creations                                   │
│  • Participant lists and amounts                              │
│  • Payment status for each participant                        │
│  • Split completion records                                   │
│                                                                 │
│  🔔 COMMUNICATION                                              │
│  • All notifications sent                                     │
│  • Payment request details                                    │
│  • Split invitation records                                   │
│  • User response tracking                                     │
│                                                                 │
│  🛡️ SECURITY EVENTS                                            │
│  • Failed login attempts                                      │
│  • Suspicious activity alerts                                 │
│  • Wallet access attempts                                     │
│  • Data access logs                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 **BUSINESS LOGIC & RULES**

### **How the App Works**
```
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS RULES                              │
├─────────────────────────────────────────────────────────────────┤
│  💰 MONEY TRANSFERS                                            │
│  • Users can only send money they have                         │
│  • All transactions are verified on blockchain                │
│  • Transaction fees are covered by the company                 │
│  • Minimum transfer amount: $0.01                             │
│  • Maximum transfer amount: $10,000 per day                   │
│                                                                 │
│  🧾 BILL SPLITTING                                             │
│  • All participants must have WeSplit accounts                │
│  • Split amounts are calculated automatically                  │
│  • Participants can pay in installments                       │
│  • Splits expire after 30 days if not completed               │
│                                                                 │
│  🏦 BANK DEPOSITS                                              │
│  • Minimum deposit: $10                                       │
│  • Maximum deposit: $5,000 per day                            │
│  • Bank verification required for large amounts               │
│  • Deposits processed through MoonPay                         │
│                                                                 │
│  🔐 ACCOUNT SECURITY                                           │
│  • Email verification required for all accounts               │
│  • Two-factor authentication available                        │
│  • Account lockout after 5 failed attempts                    │
│  • Password must be changed every 90 days                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **SUMMARY FOR AUDITORS**

### **What WeSplit Does**
1. **Creates digital wallets** for users to store USDC cryptocurrency
2. **Enables money transfers** between users instantly and securely
3. **Facilitates bill splitting** with automatic calculations and payments
4. **Provides bank integration** for easy money deposits and withdrawals
5. **Maintains complete records** of all financial activities

### **Key Technical Components**
- **Mobile App**: React Native (iOS/Android)
- **Database**: Firebase Firestore (user data, transactions)
- **Blockchain**: Solana (USDC cryptocurrency)
- **Bank Integration**: MoonPay (fiat to crypto conversion)
- **AI Services**: Receipt scanning and bill processing

### **Data Flow Summary**
```
User Action → App Processing → Database Update → Blockchain Transaction → Notification → UI Update
```

### **Security Measures**
- All sensitive data encrypted
- Private keys never leave user devices
- All transactions verified on blockchain
- Complete audit trail maintained
- Regulatory compliance through MoonPay

This comprehensive overview provides auditors with a complete understanding of how WeSplit works, where data is stored, how money flows, and what can be audited! 🔍✅
