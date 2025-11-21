# Shared Wallet Feature - Complete Guide

**Date:** 2025-01-XX  
**Status:** ✅ **COMPLETE**  
**Purpose:** Comprehensive documentation of shared wallet feature implementation, cleanup, and best practices

---

## Overview

The shared wallet feature allows multiple users to create and manage a shared wallet for splitting expenses. This document consolidates all shared wallet documentation including implementation details, cleanup efforts, best practices, and architecture.

---

## Architecture

### Component Structure

```
Shared Wallet System
├── Services
│   ├── SharedWalletCreation.ts - Wallet creation logic
│   ├── SharedWalletFunding.ts - Funding operations
│   ├── SharedWalletWithdrawal.ts - Withdrawal operations
│   ├── SharedWalletPayments.ts - Payment processing
│   └── utils.ts - Common utilities
├── Screens
│   ├── SharedWalletDetailsScreen.tsx - Main wallet view
│   └── SharedWalletSettingsScreen.tsx - Settings management
└── Components
    ├── BalanceCard.tsx - Balance display
    ├── MembersList.tsx - Member management
    └── TransactionHistoryItem.tsx - Transaction display
```

### Data Flow

1. **Wallet Creation**: User creates shared wallet → Firestore document created
2. **Funding**: Members fund wallet → Balance updated, transaction recorded
3. **Withdrawal**: Members withdraw funds → Balance updated, transaction recorded
4. **Transactions**: All operations recorded in Firestore with proper deduplication

---

## Code Cleanup Summary

### ✅ 1. Centralized Balance Formatting

**Problem:** Multiple `formatBalance` functions duplicated across components

**Solution:** Created unified `formatBalance` function in `src/utils/ui/format/formatUtils.ts`

**Files Updated:**
- `src/components/sharedWallet/BalanceCard.tsx`
- `src/components/sharedWallet/MembersList.tsx`
- `src/components/sharedWallet/TransactionHistoryItem.tsx`
- `src/screens/SharedWallet/SharedWalletDetailsScreen.tsx`

**Impact:** Reduced code duplication by 4 duplicate implementations → 1 centralized function

### ✅ 2. Centralized ID Generation

**Problem:** Duplicated ID generation logic using `Math.random().toString(36).substring(2, 11)`

**Solution:** Created `generateUniqueId` function in `src/services/sharedWallet/utils.ts`

**Files Updated:**
- `src/services/sharedWallet/SharedWalletCreation.ts` - Uses `generateUniqueId('shared_wallet')`
- `src/services/sharedWallet/SharedWalletFunding.ts` - Uses `generateUniqueId('tx')`
- `src/services/sharedWallet/SharedWalletWithdrawal.ts` - Uses `generateUniqueId('tx')`

**Impact:** Reduced code duplication by 3 duplicate patterns → 1 centralized function

### ✅ 3. Removed Duplicated roundUsdcAmount

**Problem:** `roundUsdcAmount` existed in both `utils.ts` and `formatUtils.ts`

**Solution:** Removed from `utils.ts`, all code uses `formatUtils.roundUsdcAmount`

**Note:** The function in `formatUtils.ts` uses `Math.round` (more accurate) vs `Math.floor` (was in utils.ts)

### ✅ 4. Standardized Error Handling

**Problem:** Inconsistent error logging with type errors

**Solution:** Standardized all `logger.error` calls to use proper object format

**Files Updated:**
- `src/services/sharedWallet/index.ts` - All 10 error handlers now use `{ error: errorMessage }` format

### ✅ 5. Removed Duplicate Firebase Query Logic

**Before:** Firebase queries by custom `id` field were duplicated in:
- `index.ts` (getSharedWallet, linkCardToSharedWallet, unlinkCardFromSharedWallet, inviteToSharedWallet)
- `SharedWalletFunding.ts`
- `SharedWalletWithdrawal.ts`

**After:** All queries now use `getSharedWalletDocById()` from `utils.ts`

**Impact:** Reduced code duplication by ~150 lines, improved maintainability

### ✅ 6. Optimized Firebase Operations

**Before:** Multiple `updateDoc` calls in funding/withdrawal operations

**After:** Single `updateDoc` call that updates both balance and members simultaneously

**Impact:** Reduced Firebase write operations by 50%, improved performance

### ✅ 7. Code Quality Improvements

- Removed unused imports
- Fixed deprecated code (`.substr()` → `.substring()`)
- Improved type safety (replaced `any[]` with explicit types)
- Updated documentation comments

---

## Best Practices

### 1. Use Centralized Utilities

Always use centralized utility functions:
- `formatBalance()` from `formatUtils.ts`
- `generateUniqueId()` from `utils.ts`
- `roundUsdcAmount()` from `formatUtils.ts`

### 2. Firebase Query Pattern

Always use `getSharedWalletDocById()` for querying shared wallets:
```typescript
import { getSharedWalletDocById } from './utils';

const walletDoc = await getSharedWalletDocById(walletId);
```

### 3. Error Handling

Use standardized error handling pattern:
```typescript
try {
  // operation
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error('Operation failed', { error: errorMessage });
  throw error;
}
```

### 4. Transaction Recording

All shared wallet operations should:
- Record transactions using centralized `saveTransactionAndAwardPoints`
- Use proper transaction types (`split_payment`, `split_wallet_withdrawal`)
- Include proper fee calculation using `FeeService.calculateCompanyFee`

---

## UI/UX Integration

### Navigation Flow

See [SHARED_WALLET_NAVIGATION_FLOW.md](./SHARED_WALLET_NAVIGATION_FLOW.md) for complete navigation details.

### Data Flow

See [SHARED_WALLET_DATA_FLOW.md](./SHARED_WALLET_DATA_FLOW.md) for complete data flow details.

### Component Optimization

See [SHARED_WALLET_COMPONENT_OPTIMIZATION.md](./SHARED_WALLET_COMPONENT_OPTIMIZATION.md) for optimization details.

---

## Transaction Integration

### Transaction Types

- **Split Funding**: `'split_payment'` - Fee: 1.5% (min $0.001, max $5.00)
- **Split Withdrawal**: `'split_wallet_withdrawal'` - Fee: 0% (no fees)

### Points Attribution

- Points awarded for split funding (recipient gets points)
- Points NOT awarded for split withdrawals

### Fee Calculation

All shared wallet transactions use centralized `FeeService.calculateCompanyFee()`:
```typescript
const { fee: companyFee, totalAmount, recipientAmount } = 
  FeeService.calculateCompanyFee(amount, 'split_payment');
```

---

## Participant Invitation

See [PARTICIPANT_INVITATION_ARCHITECTURE.md](./PARTICIPANT_INVITATION_ARCHITECTURE.md) for complete invitation system details.

---

## Benefits of Cleanup

1. **Reduced Code Duplication**: 
   - 4 duplicate `formatBalance` implementations → 1 centralized function
   - 3 duplicate ID generation patterns → 1 centralized function
   - ~150 lines of duplicate Firebase query code removed

2. **Improved Maintainability**:
   - Single source of truth for formatting logic
   - Easier to update formatting behavior across the app
   - Consistent error handling patterns

3. **Better Performance**:
   - Reduced Firebase write operations by 50%
   - Optimized Firebase queries

4. **Enhanced Type Safety**:
   - Replaced `any[]` with explicit types
   - Improved type assertions

---

## Files Modified

### Services
- `src/services/sharedWallet/index.ts` - Consolidated Firebase queries
- `src/services/sharedWallet/SharedWalletCreation.ts` - Uses centralized ID generation
- `src/services/sharedWallet/SharedWalletFunding.ts` - Uses centralized utilities
- `src/services/sharedWallet/SharedWalletWithdrawal.ts` - Uses centralized utilities
- `src/services/sharedWallet/utils.ts` - New utility module

### Components
- `src/components/sharedWallet/BalanceCard.tsx` - Uses centralized formatting
- `src/components/sharedWallet/MembersList.tsx` - Uses centralized formatting
- `src/components/sharedWallet/TransactionHistoryItem.tsx` - Uses centralized formatting

### Screens
- `src/screens/SharedWallet/SharedWalletDetailsScreen.tsx` - Uses centralized formatting

### Utils
- `src/utils/ui/format/formatUtils.ts` - Centralized formatting functions

---

## Related Documentation

- [SHARED_WALLET_NAVIGATION_FLOW.md](./SHARED_WALLET_NAVIGATION_FLOW.md) - Navigation flow details
- [SHARED_WALLET_DATA_FLOW.md](./SHARED_WALLET_DATA_FLOW.md) - Data flow details
- [SHARED_WALLET_COMPONENT_OPTIMIZATION.md](./SHARED_WALLET_COMPONENT_OPTIMIZATION.md) - Component optimization
- [SHARED_WALLET_UI_INTEGRATION.md](./SHARED_WALLET_UI_INTEGRATION.md) - UI integration details
- [SHARED_WALLET_UI_REFACTOR.md](./SHARED_WALLET_UI_REFACTOR.md) - UI refactoring details
- [PARTICIPANT_INVITATION_ARCHITECTURE.md](./PARTICIPANT_INVITATION_ARCHITECTURE.md) - Invitation system
- [SPLIT_TRANSACTION_HISTORY_INTEGRATION.md](./SPLIT_TRANSACTION_HISTORY_INTEGRATION.md) - Transaction history integration

---

**Last Updated:** 2025-01-XX

