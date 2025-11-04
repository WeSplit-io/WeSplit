# WeSplit App - Simplified Data Flow Diagram

## Frontend Components & Backend Interactions

### 🎯 **Main App Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                        WESPLIT APP                             │
├─────────────────────────────────────────────────────────────────┤
│  FRONTEND LAYER (React Native Screens)                        │
├─────────────────────────────────────────────────────────────────┤
│  [Splash] → [Auth] → [Dashboard] → [Send/Request/Split]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 **Frontend Screens & Their Backend Calls**

### **1. Authentication Flow**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SplashScreen  │    │ GetStartedScreen│    │ AuthMethodsScreen│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ VerificationScreen│   │CreateProfileScreen│   │OnboardingScreen│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DashboardScreen                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │    Send     │ │   Request   │ │   Deposit   │ │    Split    ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Backend Calls:**
- `firebaseAuth.sendSignInLink()` - Email verification
- `firebaseDataService.user.createUser()` - User profile creation
- `walletService.ensureAppWallet()` - Wallet generation
- `firebaseDataService.user.updateUser()` - Profile updates

---

### **2. Dashboard Screen**
```
┌─────────────────────────────────────────────────────────────────┐
│                    DashboardScreen                              │
├─────────────────────────────────────────────────────────────────┤
│  Data Sources:                                                  │
│  • User Profile (Firebase)                                     │
│  • Wallet Balance (Solana)                                     │
│  • Transactions (Firebase)                                     │
│  • Payment Requests (Firebase)                                 │
│  • Notifications (Firebase)                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Calls:**
- `firebaseDataService.user.getCurrentUser()` - User data
- `walletService.getUserWalletBalance()` - Balance from Solana
- `firebaseDataService.transaction.getUserTransactions()` - Transaction history
- `notificationService.getUserNotifications()` - Notifications

---

### **3. Send Money Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ SendScreen  │ →  │SendAmountScreen│ → │SendConfirmationScreen│ → │SendSuccessScreen│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Backend Calls:**
- `firebaseDataService.user.searchUsers()` - Find recipient
- `consolidatedTransactionService.sendUSDCTransaction()` - Execute transaction
- `firebaseDataService.transaction.createTransaction()` - Save transaction record
- `notificationService.sendNotification()` - Notify recipient

**Blockchain Services:**
- `Solana RPC` - Transaction execution
- `USDC Token Program` - Token transfer
- `Transaction Signing` - Wallet signature

---

### **4. Request Money Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│RequestContactsScreen│ → │RequestAmountScreen│ → │RequestSuccessScreen│
└─────────────┘    └─────────────┘    └─────────────┘
```

**Backend Calls:**
- `firebaseDataService.contact.getContacts()` - Get contacts
- `firebaseDataService.notification.createNotification()` - Create payment request
- `notificationService.sendNotification()` - Send request notification

---

### **5. Deposit Money Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ DepositScreen│ → │CryptoTransferScreen│ → │MoonPayWebViewScreen│
└─────────────┘    └─────────────┘    └─────────────┘
```

**Backend Calls:**
- `firebaseMoonPayService.createMoonPayURL()` - Generate MoonPay URL
- `firebaseMoonPayService.getMoonPayTransactionStatus()` - Check transaction status
- `firebaseDataService.transaction.createTransaction()` - Record deposit

**External Services:**
- `MoonPay API` - Fiat to crypto conversion
- `Solana Network` - USDC token receipt

---

### **6. Split Bill Flow**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ SplitsListScreen│ → │SplitDetailsScreen│ → │FairSplitScreen│
└─────────────┘    └─────────────┘    └─────────────┘
```

**Backend Calls:**
- `SplitStorageService.createSplit()` - Create split
- `SplitInvitationService.generateInvitationData()` - Generate invitation
- `notificationService.sendSplitInvitationNotification()` - Send invitations
- `SplitWalletManagement.createSplitWallet()` - Create split wallet

**Blockchain Services:**
- `Solana Program` - Split wallet creation
- `Multi-signature Wallet` - Split payment management

---

## 🔧 **Backend Services Architecture**

### **Firebase Services**
```
┌─────────────────────────────────────────────────────────────────┐
│                        FIREBASE BACKEND                        │
├─────────────────────────────────────────────────────────────────┤
│  Firestore Collections:                                        │
│  • users - User profiles and wallet info                       │
│  • contacts - User relationships                               │
│  • notifications - Push and in-app notifications              │
│  • transactions - Transaction history                          │
│  • splits - Bill splitting data                                │
│  • splitWallets - Split-specific wallets                      │
└─────────────────────────────────────────────────────────────────┘
```

### **Blockchain Services**
```
┌─────────────────────────────────────────────────────────────────┐
│                      SOLANA BLOCKCHAIN                         │
├─────────────────────────────────────────────────────────────────┤
│  • USDC Token Transfers                                        │
│  • Wallet Management                                           │
│  • Transaction Signing                                         │
│  • Balance Queries                                             │
│  • Multi-signature Wallets (for splits)                       │
└─────────────────────────────────────────────────────────────────┘
```

### **External Services**
```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  • MoonPay - Fiat to crypto on-ramp                            │
│  • AI Services - OCR and bill processing                       │
│  • Push Notifications - Expo Notifications                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Data Flow Patterns**

### **1. User Action → Backend → Blockchain → UI Update**
```
User Clicks Send
    ↓
Firebase: Validate recipient
    ↓
Solana: Execute USDC transfer
    ↓
Firebase: Save transaction record
    ↓
UI: Show success message
```

### **2. Real-time Updates**
```
Firebase: Data change
    ↓
React Context: State update
    ↓
UI: Component re-render
```

### **3. Split Creation Flow**
```
User: Create split
    ↓
Firebase: Save split data
    ↓
Solana: Create multi-sig wallet
    ↓
Firebase: Send invitations
    ↓
UI: Show split details
```

---

## 📊 **Key Service Interactions**

| Frontend Screen | Primary Backend Service | Blockchain Service | External Service |
|----------------|------------------------|-------------------|------------------|
| Dashboard | `firebaseDataService` | `walletService` | - |
| Send Money | `consolidatedTransactionService` | `Solana RPC` | - |
| Request Money | `notificationService` | - | - |
| Deposit | `firebaseMoonPayService` | `Solana RPC` | `MoonPay API` |
| Split Bill | `SplitStorageService` | `Multi-sig Wallet` | - |
| Bill Camera | `AI Services` | - | `OCR API` |

---

## 🎯 **Simplified Architecture Summary**

```
┌─────────────────────────────────────────────────────────────────┐
│                    WESPLIT APP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React Native)                                       │
│  ├── Screens (50+ components)                                 │
│  ├── Context (AppContext, WalletContext)                      │
│  └── Hooks (useWalletState, useLiveBalance)                   │
│                                                                 │
│  Backend (Firebase)                                            │
│  ├── Firestore (Database)                                     │
│  ├── Auth (Authentication)                                     │
│  ├── Functions (Server logic)                                 │
│  └── Storage (File storage)                                   │
│                                                                 │
│  Blockchain (Solana)                                           │
│  ├── USDC Token Program                                        │
│  ├── Wallet Management                                         │
│  └── Transaction Processing                                    │
│                                                                 │
│  External Services                                             │
│  ├── MoonPay (Fiat on-ramp)                                   │
│  ├── AI Services (OCR)                                        │
│  └── Push Notifications                                       │
└─────────────────────────────────────────────────────────────────┘
```

This simplified view focuses on the visual frontend components and their specific backend/blockchain interactions, making it easier to create a clear Excalidraw diagram! 🎨
