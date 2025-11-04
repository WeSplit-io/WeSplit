# WeSplit App - Comprehensive Data Flow Audit

## Executive Summary

This document provides a complete audit of the WeSplit app's data flow architecture, covering all components, services, data storage mechanisms, and external integrations. The app is a React Native-based cryptocurrency payment and bill-splitting application built on Solana blockchain with Firebase backend.

## 1. Application Architecture Overview

### 1.1 Core Technology Stack
- **Frontend**: React Native with Expo
- **State Management**: React Context (AppContext, WalletContext)
- **Navigation**: React Navigation v7 (Stack Navigator)
- **Backend**: Firebase (Firestore, Auth, Functions, Storage)
- **Blockchain**: Solana (USDC transfers)
- **External Services**: MoonPay (fiat on-ramp), AI services for OCR

### 1.2 App Structure
```
App.tsx (Root)
├── ErrorBoundary
├── SafeAreaProvider
├── QueryClientProvider (React Query)
├── WalletProvider (Wallet State)
├── AppProvider (App State)
└── NavigationWrapper
    └── Stack.Navigator (All Screens)
```

## 2. Data Flow Architecture

### 2.1 Context Providers (State Management)

#### AppContext
- **Purpose**: Global app state management
- **State**: User authentication, notifications, loading states
- **Key Methods**:
  - `authenticateUser()` - User login/authentication
  - `updateUser()` - User profile updates
  - `loadNotifications()` - Notification management
  - `acceptSplitInvitation()` - Split invitation handling

#### WalletContext
- **Purpose**: Wallet and blockchain state management
- **State**: Wallet connections, balances, transaction history
- **Key Methods**:
  - `connectWallet()` - External wallet connection
  - `ensureAppWallet()` - App-generated wallet management
  - `sendTransaction()` - Blockchain transactions
  - `refreshBalance()` - Balance updates

### 2.2 Data Storage Layers

#### Firebase Firestore (Primary Database)
- **Collections**:
  - `users` - User profiles and wallet information
  - `contacts` - User contact relationships
  - `notifications` - Push and in-app notifications
  - `transactions` - Transaction history
  - `linkedWallets` - External wallet connections
  - `splits` - Bill splitting data
  - `splitWallets` - Split-specific wallet management
  - `verificationCodes` - Email verification codes

#### Local Storage (AsyncStorage)
- **Purpose**: Device-specific data and caching
- **Data**: Wallet private keys, user preferences, cached data
- **Security**: Encrypted storage for sensitive data

#### Secure Storage (Expo SecureStore)
- **Purpose**: Highly sensitive data
- **Data**: Wallet seed phrases, private keys, authentication tokens

## 3. Service Layer Architecture

### 3.1 Core Services

#### Firebase Data Service (`firebaseDataService`)
- **Purpose**: Centralized Firebase operations
- **Modules**:
  - `user` - User CRUD operations
  - `contact` - Contact management
  - `notification` - Notification handling
  - `transaction` - Transaction records
  - `linkedWallet` - External wallet management

#### Wallet Services (`services/blockchain/wallet/`)
- **SimplifiedWalletService**: Main wallet operations
- **WalletRecoveryService**: Wallet recovery and migration
- **WalletExportService**: Wallet export functionality
- **SolanaAppKitService**: Solana blockchain integration

#### Transaction Services (`services/blockchain/transaction/`)
- **ConsolidatedTransactionService**: Main transaction orchestrator
- **TransactionProcessor**: Transaction execution
- **PaymentRequestManager**: Payment request handling
- **BalanceManager**: Balance management

### 3.2 Specialized Services

#### Notification Service (`notificationService`)
- **Purpose**: Unified notification management
- **Features**: Push notifications, in-app notifications, navigation handling
- **Types**: Payment requests, split invitations, system notifications

#### Split Services (`services/splits/`)
- **SplitInvitationService**: Split invitation handling
- **SplitStorageService**: Split data persistence
- **SplitRealtimeService**: Real-time split updates

#### AI Services (`services/ai/`)
- **OCR Processing**: Bill image analysis
- **Receipt Extraction**: Automated bill parsing
- **AI Agent**: Intelligent bill splitting suggestions

## 4. Screen Components and Data Dependencies

### 4.1 Authentication Flow
```
SplashScreen → GetStartedScreen → AuthMethodsScreen → VerificationScreen → CreateProfileScreen → OnboardingScreen → DashboardScreen
```

### 4.2 Main App Flow
```
DashboardScreen (Main Hub)
├── Send Flow: SendScreen → SendAmountScreen → SendConfirmationScreen → SendSuccessScreen
├── Request Flow: RequestContactsScreen → RequestAmountScreen → RequestSuccessScreen
├── Deposit Flow: DepositScreen → CryptoTransferScreen → MoonPayWebViewScreen
├── Split Flow: SplitsListScreen → SplitDetailsScreen → FairSplitScreen/DegenSplitScreen
└── Settings Flow: ProfileScreen → AccountSettingsScreen → WalletManagementScreen
```

### 4.3 Data Dependencies by Screen

#### DashboardScreen
- **Data Sources**: User profile, wallet balance, transactions, payment requests, notifications
- **Hooks**: `useWalletState`, `useLiveBalance`
- **Services**: `firebaseDataService`, `walletService`, `notificationService`

#### Send/Request Screens
- **Data Sources**: Contact list, wallet balance, transaction history
- **Services**: `consolidatedTransactionService`, `firebaseDataService`

#### Split Screens
- **Data Sources**: Split data, participant information, wallet balances
- **Services**: `SplitStorageService`, `SplitInvitationService`, `notificationService`

## 5. External Integrations

### 5.1 Blockchain Integration
- **Solana Network**: USDC token transfers
- **RPC Endpoint**: Custom Solana RPC for transaction processing
- **Wallet Adapters**: Phantom, Solflare, external wallet support

### 5.2 Payment Processing
- **MoonPay**: Fiat to crypto on-ramp
- **Firebase Functions**: Server-side payment processing
- **USDC**: Primary payment token

### 5.3 AI Services
- **OCR Processing**: Bill image analysis
- **Receipt Extraction**: Automated data extraction
- **AI Agent**: Intelligent suggestions and processing

## 6. Data Flow Patterns

### 6.1 User Authentication Flow
```
1. User enters email → AuthMethodsScreen
2. Email verification → VerificationScreen
3. Profile creation → CreateProfileScreen
4. Wallet generation → WalletContext.ensureAppWallet()
5. Database sync → firebaseDataService.user.createUser()
6. State update → AppContext.authenticateUser()
7. Navigation → DashboardScreen
```

### 6.2 Transaction Flow
```
1. User initiates send → SendAmountScreen
2. Transaction validation → ConsolidatedTransactionService
3. Wallet preparation → SimplifiedWalletService.ensureUserWallet()
4. Blockchain transaction → TransactionProcessor.sendUSDCTransaction()
5. Database update → firebaseDataService.transaction.createTransaction()
6. Notification dispatch → notificationService.sendNotification()
7. UI update → DashboardScreen refresh
```

### 6.3 Split Creation Flow
```
1. User creates split → SplitDetailsScreen
2. Participant invitation → SplitInvitationService.generateInvitationData()
3. QR code generation → QRCodeService
4. Notification sending → notificationService.sendSplitInvitationNotification()
5. Database persistence → SplitStorageService.createSplit()
6. Real-time updates → SplitRealtimeService
```

## 7. Security and Data Protection

### 7.1 Sensitive Data Handling
- **Private Keys**: Stored in device secure storage only
- **Seed Phrases**: Encrypted local storage
- **User Data**: Firebase with proper authentication
- **API Keys**: Environment variables and secure configuration

### 7.2 Data Validation
- **Input Validation**: Client-side validation with server-side verification
- **Transaction Validation**: Blockchain-level validation
- **User Authentication**: Firebase Auth with email verification

## 8. Performance Optimizations

### 8.1 Caching Strategy
- **Wallet Data**: 30-second cache for balance data
- **User Data**: Context-level caching
- **Transaction History**: Pagination and lazy loading

### 8.2 Real-time Updates
- **Live Balance**: WebSocket connections for balance updates
- **Notifications**: Firebase real-time listeners
- **Split Updates**: Real-time collaboration features

## 9. Error Handling and Recovery

### 9.1 Error Boundaries
- **App Level**: ErrorBoundary component
- **Service Level**: Try-catch with logging
- **Transaction Level**: Blockchain error handling

### 9.2 Recovery Mechanisms
- **Wallet Recovery**: Seed phrase and private key recovery
- **Data Sync**: Firebase conflict resolution
- **Transaction Retry**: Automatic retry for failed transactions

## 10. Monitoring and Analytics

### 10.1 Logging Service
- **Structured Logging**: JSON-formatted logs
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Transaction timing and success rates

### 10.2 Analytics Integration
- **User Actions**: Track user interactions
- **Transaction Metrics**: Success rates and performance
- **Error Tracking**: Monitor and alert on errors

## 11. Data Flow Diagram Summary

The WeSplit app follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**: React Native screens and components
2. **State Management Layer**: Context providers and hooks
3. **Service Layer**: Business logic and external integrations
4. **Data Layer**: Firebase Firestore and local storage
5. **Blockchain Layer**: Solana network integration

The data flows primarily through:
- **User Actions** → **Context Updates** → **Service Calls** → **Database Operations** → **UI Updates**
- **External Events** → **Service Listeners** → **Context Updates** → **UI Updates**
- **Blockchain Events** → **Transaction Services** → **Database Sync** → **Notification Dispatch**

This architecture ensures scalability, maintainability, and security while providing a smooth user experience for cryptocurrency payments and bill splitting.
