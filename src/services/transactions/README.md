# Transaction Services

This directory contains all transaction-related services, organized for maintainability and reusability.

**📖 For complete documentation, see:** [`docs/TRANSACTION_SYSTEM_COMPLETE.md`](../../../docs/TRANSACTION_SYSTEM_COMPLETE.md)

## Structure

```
src/services/transactions/
├── index.ts                          # Main exports - use this for imports
├── CentralizedTransactionHandler.ts  # Main transaction handler
├── UnifiedWithdrawalService.ts       # Unified withdrawal service (use for all withdrawals)
├── UnifiedTransactionConfig.ts      # Unified config system (optional)
├── types.ts                          # Transaction types
├── configs/                          # Configuration builders
│   ├── index.ts
│   ├── splitTransactionConfigs.ts
│   ├── sharedWalletTransactionConfigs.ts
│   └── sendTransactionConfigs.ts
└── hooks/                            # React hooks
    └── useTransactionModal.ts        # Unified transaction modal hook
```

## Usage

### Withdrawals (Unified Service)

**Always use `UnifiedWithdrawalService` for all withdrawals:**

```typescript
import { UnifiedWithdrawalService } from '../../services/transactions';

// Split wallet withdrawal
const result = await UnifiedWithdrawalService.withdraw({
  sourceType: 'split_wallet',
  sourceId: splitWalletId,
  destinationAddress: userWalletAddress,
  userId: currentUser.id,
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
  userId: currentUser.id,
  amount: 25.0,
  currency: 'USDC',
  memo: 'Withdrawal from shared wallet'
});

// Validate balance before withdrawal
const validation = await UnifiedWithdrawalService.validateWithdrawalBalance({
  sourceType: 'split_wallet',
  sourceId: splitWalletId,
  destinationAddress: userWalletAddress,
  userId: currentUser.id,
  amount: 50.0
});

if (!validation.canWithdraw) {
  console.error(validation.error);
  return;
}
```

### Transaction Configurations

**Use configuration builders for consistent transaction setup:**

```typescript
import { 
  FairSplitTransactionConfig,
  SharedWalletTransactionConfig,
  SendTransactionConfig
} from '../../services/transactions/configs';

// Fair split contribution
const config = FairSplitTransactionConfig.contribution({
  splitWalletId: 'split_123',
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
```

### Transaction Modal Hook

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

## Best Practices

1. **Always use UnifiedWithdrawalService** for withdrawals - don't call handlers directly
2. **Use configuration builders** instead of manually creating configs
3. **Use the unified hook** for transaction modals
4. **Validate before executing** - use `validateWithdrawalBalance` first
5. **Handle errors properly** - check `result.success` and display `result.error`

## Migration

If you're using old withdrawal methods, migrate to `UnifiedWithdrawalService`:

```typescript
// ❌ Old way
await SplitWalletPayments.extractFairSplitFunds(...);
await SharedWalletWithdrawal.withdrawFromSharedWallet(...);

// ✅ New way
await UnifiedWithdrawalService.withdraw({
  sourceType: 'split_wallet', // or 'shared_wallet'
  sourceId: walletId,
  destinationAddress: address,
  userId: userId,
  amount: amount
});
```

