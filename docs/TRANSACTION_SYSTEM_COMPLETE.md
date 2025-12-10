# Complete Transaction System Documentation

**Last Updated:** December 2024  
**Status:** ✅ Production Ready

This document provides a complete overview of the transaction system, including architecture, usage, and best practices for all transaction types.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Transaction Types & Flows](#transaction-types--flows)
3. [File Organization](#file-organization)
4. [Usage Guide](#usage-guide)
5. [Configuration Builders](#configuration-builders)
6. [Unified Services](#unified-services)
7. [Best Practices](#best-practices)
8. [Migration Guide](#migration-guide)

---

## 🏗️ Architecture Overview

### System Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                  │
│  CentralizedTransactionModal  │  CentralizedTransactionScreen│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Configuration Layer                             │
│  TransactionConfigBuilders (Split, Shared, Send)            │
│  useTransactionModal Hook                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Service Layer                                   │
│  UnifiedWithdrawalService  │  CentralizedTransactionHandler │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Execution Layer                                  │
│  ConsolidatedTransactionService  │  TransactionProcessor    │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/services/transactions/
├── index.ts                          # Main exports
├── CentralizedTransactionHandler.ts  # Main transaction handler
├── UnifiedWithdrawalService.ts       # Unified withdrawal service
├── UnifiedTransactionConfig.ts       # Unified config system (optional)
├── types.ts                          # Transaction types
├── configs/                          # Configuration builders
│   ├── index.ts
│   ├── splitTransactionConfigs.ts    # Fair, Degen, Spend split configs
│   ├── sharedWalletTransactionConfigs.ts  # Shared wallet configs
│   └── sendTransactionConfigs.ts     # 1:1 send configs
└── hooks/                            # React hooks
    └── useTransactionModal.ts         # Unified transaction modal hook

src/services/split/                   # Split wallet services
├── index.ts                          # Unified SplitWalletService
├── SplitWalletCreation.ts            # Wallet creation
├── SplitWalletManagement.ts         # Wallet management
├── SplitWalletPayments.ts            # Payments (aligned)
├── SplitWalletQueries.ts            # Database queries
├── SplitWalletSecurity.ts            # Security & encryption
├── SplitWalletCleanup.ts             # Cleanup operations
├── SplitWalletAtomicUpdates.ts      # Atomic operations
├── SplitRouletteService.ts          # Degen roulette
├── SplitDataSynchronizer.ts         # Data synchronization
└── types.ts                          # Type definitions

src/services/splits/                  # Split data services (Firestore)
├── splitStorageService.ts            # Data storage
├── splitInvitationService.ts         # Invitations
├── SplitParticipantInvitationService.ts  # Participant invitations
├── splitRealtimeService.ts          # Real-time updates
└── splitDataValidationService.ts    # Data validation
```

---

## 💸 Transaction Types & Flows

### Transaction Contexts

| Context | Type | Flow | Handler |
|---------|------|------|---------|
| `send_1to1` | Transfer | Outgoing | `CentralizedTransactionHandler` |
| `fair_split_contribution` | Funding | Incoming | `CentralizedTransactionHandler` |
| `fair_split_withdrawal` | Withdrawal | Outgoing | `UnifiedWithdrawalService` |
| `degen_split_lock` | Funding | Incoming | `CentralizedTransactionHandler` |
| `spend_split_payment` | Payment | Outgoing | `CentralizedTransactionHandler` |
| `shared_wallet_funding` | Funding | Incoming | `CentralizedTransactionHandler` |
| `shared_wallet_withdrawal` | Withdrawal | Outgoing | `UnifiedWithdrawalService` |

### Flow Direction

- **Incoming (Funding)**: User wallet → Split/Shared wallet
- **Outgoing (Withdrawal)**: Split/Shared wallet → User wallet/External

---

## 📁 File Organization

### Transaction Services

**Core Services:**
- `CentralizedTransactionHandler.ts` - Main transaction handler (routes to appropriate handler)
- `UnifiedWithdrawalService.ts` - Unified withdrawal service (all withdrawal types)
- `ConsolidatedTransactionService.ts` - Low-level transaction execution

**Configuration:**
- `configs/splitTransactionConfigs.ts` - Split transaction configs
- `configs/sharedWalletTransactionConfigs.ts` - Shared wallet configs
- `configs/sendTransactionConfigs.ts` - 1:1 send configs

**Hooks:**
- `hooks/useTransactionModal.ts` - Unified transaction modal hook

### Split Services

**Wallet Operations** (`src/services/split/`):
- `SplitWalletCreation.ts` - Create split wallets
- `SplitWalletManagement.ts` - Manage split wallets
- `SplitWalletPayments.ts` - Process payments (aligned with unified services)
- `SplitWalletQueries.ts` - Database queries
- `SplitWalletSecurity.ts` - Security & encryption
- `SplitWalletCleanup.ts` - Cleanup operations
- `SplitWalletAtomicUpdates.ts` - Atomic operations
- `SplitRouletteService.ts` - Degen split roulette
- `SplitDataSynchronizer.ts` - Data synchronization

**Data Operations** (`src/services/splits/`):
- `splitStorageService.ts` - Split data storage
- `splitInvitationService.ts` - Invitations
- `splitRealtimeService.ts` - Real-time updates
- `splitDataValidationService.ts` - Data validation

---

## 📖 Usage Guide

### 1. Withdrawals (Unified Service)

**Always use `UnifiedWithdrawalService` for all withdrawals:**

```typescript
import { UnifiedWithdrawalService } from '../../services/transactions';

// Split wallet withdrawal
const result = await UnifiedWithdrawalService.withdraw({
  sourceType: 'split_wallet',
  sourceId: splitWalletId,
  destinationAddress: userWalletAddress,
  userId: userId,
  amount: 50.0,
  currency: 'USDC',
  memo: 'Withdrawal from split',
  splitId: splitId,
  billId: billId
});

// Shared wallet withdrawal
const result = await UnifiedWithdrawalService.withdraw({
  sourceType: 'shared_wallet',
  sourceId: sharedWalletId,
  destinationAddress: userWalletAddress,
  userId: userId,
  amount: 25.0,
  currency: 'USDC',
  memo: 'Withdrawal from shared wallet'
});

// Validate balance before withdrawal
const validation = await UnifiedWithdrawalService.validateWithdrawalBalance({
  sourceType: 'split_wallet',
  sourceId: splitWalletId,
  destinationAddress: userWalletAddress,
  userId: userId,
  amount: 50.0
});

if (!validation.canWithdraw) {
  Alert.alert('Error', validation.error);
  return;
}
```

### 2. Transaction Configurations

**Use configuration builders for consistent setup:**

```typescript
import { 
  FairSplitTransactionConfig,
  SharedWalletTransactionConfig,
  SendTransactionConfig
} from '../../services/transactions/configs';

// Fair split contribution
const config = FairSplitTransactionConfig.contribution({
  splitWalletId: 'split_123',
  splitId: 'split_id',
  billId: 'bill_id',
  walletAddress: 'ABC123...',
  currentUser: currentUser,
  amount: 25.0
});

// Shared wallet funding
const config = SharedWalletTransactionConfig.funding({
  sharedWalletId: 'shared_123',
  walletAddress: 'XYZ789...',
  currentUser: currentUser,
  amount: 100.0
});

// 1:1 send
const config = SendTransactionConfig.send({
  recipientAddress: 'ABC123...',
  recipientName: 'John Doe',
  currentUser: currentUser,
  amount: 10.5
});
```

### 3. Transaction Modal Hook

**Use the unified hook for managing transaction modals:**

```typescript
import { useTransactionModal } from '../../services/transactions/hooks/useTransactionModal';

const {
  transactionModalConfig,
  showFairSplitContribution,
  showSharedWalletFunding,
  showSharedWalletWithdrawal,
  hideTransactionModal
} = useTransactionModal();

// Show modal
showFairSplitContribution({
  splitWalletId: 'split_123',
  walletAddress: 'ABC123...',
  currentUser: currentUser
});

// Render modal
<CentralizedTransactionModal
  visible={!!transactionModalConfig}
  config={transactionModalConfig || {}}
  currentUser={currentUser}
  onClose={hideTransactionModal}
/>
```

### 4. Direct Transaction Execution

**For programmatic transactions (without UI):**

```typescript
import { CentralizedTransactionHandler } from '../../services/transactions';

const result = await CentralizedTransactionHandler.executeTransaction({
  context: 'fair_split_contribution',
  userId: userId,
  amount: 25.0,
  currency: 'USDC',
  splitWalletId: splitWalletId,
  splitId: splitId,
  billId: billId
});

if (result.success) {
  console.log('Transaction successful:', result.transactionSignature);
} else {
  console.error('Transaction failed:', result.error);
}
```

---

## 🔧 Configuration Builders

### Split Transactions

```typescript
import { 
  FairSplitTransactionConfig,
  DegenSplitTransactionConfig,
  SpendSplitTransactionConfig
} from '../../services/transactions/configs';

// Fair Split Contribution
FairSplitTransactionConfig.contribution({
  splitWalletId: string,
  splitId?: string,
  billId?: string,
  walletAddress: string,
  currentUser: any,
  amount?: number,
  memo?: string
});

// Fair Split Withdrawal
FairSplitTransactionConfig.withdrawal({
  splitWalletId: string,
  splitId?: string,
  billId?: string,
  destinationAddress: string,
  destinationName?: string,
  currentUser: any,
  amount?: number,
  memo?: string
});

// Degen Split Lock
DegenSplitTransactionConfig.lock({
  splitWalletId: string,
  splitId?: string,
  billId?: string,
  walletAddress: string,
  currentUser: any,
  amount: number  // Fixed amount
});

// Spend Split Payment
SpendSplitTransactionConfig.payment({
  splitWalletId: string,
  splitId: string,
  merchantAddress: string,
  merchantName: string,
  currentUser: any,
  amount?: number,
  memo?: string
});
```

### Shared Wallet Transactions

```typescript
import { SharedWalletTransactionConfig } from '../../services/transactions/configs';

// Funding
SharedWalletTransactionConfig.funding({
  sharedWalletId: string,
  walletAddress: string,
  currentUser: any,
  amount?: number,
  memo?: string
});

// Withdrawal
SharedWalletTransactionConfig.withdrawal({
  sharedWalletId: string,
  destinationAddress: string,
  destinationName?: string,
  currentUser: any,
  amount?: number,
  memo?: string
});
```

### Send (1:1) Transactions

```typescript
import { SendTransactionConfig } from '../../services/transactions/configs';

SendTransactionConfig.send({
  contact?: UserContact,
  recipientAddress: string,
  recipientName: string,
  recipientId?: string,
  recipientAvatar?: string,
  currentUser: any,
  amount?: number,
  memo?: string,
  requestId?: string,
  isSettlement?: boolean
});
```

---

## 🔄 Unified Services

### UnifiedWithdrawalService

**Purpose:** Single service for all withdrawal operations

**Features:**
- Supports split wallets and shared wallets
- Balance validation
- Type-safe parameters
- Consistent error handling

**Methods:**
- `withdraw(params)` - Execute withdrawal
- `validateWithdrawalBalance(params)` - Validate before withdrawal

### CentralizedTransactionHandler

**Purpose:** Main transaction handler that routes to appropriate service

**Features:**
- Context-based routing
- Validation
- Deduplication
- Error handling

**Methods:**
- `executeTransaction(params)` - Execute transaction
- `validateTransaction(params)` - Validate before execution

---

## ✅ Best Practices

### 1. Always Use Configuration Builders
```typescript
// ✅ Good
const config = FairSplitTransactionConfig.contribution({...});

// ❌ Bad
const config: TransactionModalConfig = {
  title: 'Contribute to Fair Split',
  // ... 20+ lines of config
};
```

### 2. Use Unified Withdrawal Service
```typescript
// ✅ Good
await UnifiedWithdrawalService.withdraw({...});

// ❌ Bad
await SplitWalletPayments.extractFairSplitFunds(...);
await SharedWalletWithdrawal.withdrawFromSharedWallet(...);
```

### 3. Validate Before Executing
```typescript
// ✅ Good
const validation = await UnifiedWithdrawalService.validateWithdrawalBalance({...});
if (!validation.canWithdraw) {
  Alert.alert('Error', validation.error);
  return;
}
await UnifiedWithdrawalService.withdraw({...});
```

### 4. Use the Unified Hook
```typescript
// ✅ Good
const { showFairSplitContribution, transactionModalConfig } = useTransactionModal();

// ❌ Bad
const [transactionModalConfig, setTransactionModalConfig] = useState(null);
// ... manual config creation
```

### 5. Handle Errors Properly
```typescript
// ✅ Good
const result = await UnifiedWithdrawalService.withdraw({...});
if (result.success) {
  console.log('Success:', result.transactionSignature);
} else {
  Alert.alert('Error', result.error);
}

// ❌ Bad
await UnifiedWithdrawalService.withdraw({...}); // No error handling
```

---

## 🔄 Migration Guide

### From Old Withdrawal Methods

**Before:**
```typescript
// Old way - direct service calls
await SplitWalletPayments.extractFairSplitFunds(
  splitWalletId,
  recipientAddress,
  creatorId,
  description
);

await SharedWalletWithdrawal.withdrawFromSharedWallet({
  sharedWalletId,
  userId,
  amount,
  destination: 'personal-wallet'
});
```

**After:**
```typescript
// New way - unified service
await UnifiedWithdrawalService.withdraw({
  sourceType: 'split_wallet', // or 'shared_wallet'
  sourceId: splitWalletId, // or sharedWalletId
  destinationAddress: recipientAddress,
  userId: creatorId, // or userId
  amount: amount,
  currency: 'USDC',
  memo: description
});
```

### From Manual Config Creation

**Before:**
```typescript
const modalConfig: TransactionModalConfig = {
  title: 'Contribute to Fair Split',
  subtitle: 'Pay your share...',
  showAmountInput: true,
  showMemoInput: false,
  // ... 20+ more lines
};
```

**After:**
```typescript
const config = FairSplitTransactionConfig.contribution({
  splitWalletId: 'split_123',
  walletAddress: 'ABC123...',
  currentUser: currentUser
});
```

### From Duplicate Hooks

**Before:**
```typescript
// Old hook in SharedWallet screens
import { useTransactionModal } from '../hooks/useTransactionModal';
```

**After:**
```typescript
// Unified hook
import { useTransactionModal } from '../../../services/transactions/hooks/useTransactionModal';
```

---

## 📊 Transaction Flow Status

### ✅ All Flows Aligned

| Transaction Type | Operation | Status | Handler |
|-----------------|-----------|--------|---------|
| **Fair Split** | Contribution | ✅ | `CentralizedTransactionHandler` |
| **Fair Split** | Withdrawal | ✅ | `UnifiedWithdrawalService` |
| **Degen Split** | Lock | ✅ | `CentralizedTransactionHandler` |
| **Degen Split** | Winner Payout | ✅ | `CentralizedTransactionHandler` |
| **Degen Split** | Loser Payment | ✅ | `CentralizedTransactionHandler` |
| **Spend Split** | Payment | ✅ | `CentralizedTransactionHandler` |
| **Shared Wallet** | Funding | ✅ | `CentralizedTransactionHandler` |
| **Shared Wallet** | Withdrawal | ✅ | `UnifiedWithdrawalService` |
| **1:1 Transfer** | Send | ✅ | `CentralizedTransactionHandler` |

---

## 🧹 Cleanup Status

### Files Removed
- ✅ `src/services/split/SplitWalletPayments.ts.bak` - Backup file removed

### Files to Clean Up (Optional)
- ⚠️ `src/screens/SharedWallet/hooks/useTransactionModal.ts` - Duplicate hook (can be removed)
- ⚠️ `src/services/sharedWallet/SharedWalletWithdrawal.ts` - Can be deprecated if all logic moved
- ⚠️ `src/components/transactions/UnifiedTransactionModal.tsx` - Check if used

---

## 🎯 Key Benefits

1. **Single Source of Truth**: All withdrawal logic in one place
2. **Consistency**: Same interface for all transaction types
3. **Type Safety**: Strongly typed parameters throughout
4. **Maintainability**: Changes in one place affect all transactions
5. **Reusability**: Easy to use across different screens
6. **Testability**: Unified services can be tested independently
7. **Cleaner Code**: Less duplication, better organization

---

## 📝 Quick Reference

### Import Paths

```typescript
// Main services
import { UnifiedWithdrawalService } from '../../services/transactions';
import { CentralizedTransactionHandler } from '../../services/transactions';

// Configuration builders
import { 
  FairSplitTransactionConfig,
  SharedWalletTransactionConfig,
  SendTransactionConfig
} from '../../services/transactions/configs';

// Hooks
import { useTransactionModal } from '../../services/transactions/hooks/useTransactionModal';

// Split services
import { SplitWalletService } from '../../services/split';
```

### Common Patterns

```typescript
// Pattern 1: Withdrawal with validation
const validation = await UnifiedWithdrawalService.validateWithdrawalBalance({...});
if (validation.canWithdraw) {
  const result = await UnifiedWithdrawalService.withdraw({...});
}

// Pattern 2: Transaction with config
const config = FairSplitTransactionConfig.contribution({...});
setTransactionModalConfig(config);

// Pattern 3: Direct execution
const result = await CentralizedTransactionHandler.executeTransaction({...});
```

---

## 🔍 Verification Checklist

- [x] All withdrawals use `UnifiedWithdrawalService`
- [x] All contributions use `CentralizedTransactionHandler`
- [x] All payments use `CentralizedTransactionHandler`
- [x] Configuration builders are used consistently
- [x] Transaction modals use unified hook
- [x] Error handling is consistent
- [x] Type safety is maintained
- [x] No duplicate transaction logic

---

## 📚 Additional Resources

- **Code Examples**: See `src/services/transactions/README.md`
- **Split Services**: See `src/services/split/index.ts`
- **Transaction Types**: See `src/services/transactions/types.ts`

---

**Last Updated:** December 2024  
**Maintained By:** Development Team
