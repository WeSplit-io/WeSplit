# Transaction System - Quick Reference

**📖 Full Documentation:** See [`TRANSACTION_SYSTEM_COMPLETE.md`](./TRANSACTION_SYSTEM_COMPLETE.md) for complete details.

## Quick Start

### Withdrawals
```typescript
import { UnifiedWithdrawalService } from '../../services/transactions';

const result = await UnifiedWithdrawalService.withdraw({
  sourceType: 'split_wallet', // or 'shared_wallet'
  sourceId: walletId,
  destinationAddress: address,
  userId: userId,
  amount: 50.0
});
```

### Transaction Configs
```typescript
import { FairSplitTransactionConfig } from '../../services/transactions/configs';

const config = FairSplitTransactionConfig.contribution({
  splitWalletId: 'split_123',
  walletAddress: 'ABC123...',
  currentUser: currentUser
});
```

### Transaction Modal Hook
```typescript
import { useTransactionModal } from '../../services/transactions/hooks/useTransactionModal';

const { showFairSplitContribution, transactionModalConfig } = useTransactionModal();
```

## Key Files

- **Main Handler:** `src/services/transactions/CentralizedTransactionHandler.ts`
- **Withdrawal Service:** `src/services/transactions/UnifiedWithdrawalService.ts`
- **Configs:** `src/services/transactions/configs/`
- **Hook:** `src/services/transactions/hooks/useTransactionModal.ts`

## Status

✅ All transaction flows unified and aligned  
✅ All withdrawals use `UnifiedWithdrawalService`  
✅ All contributions use `CentralizedTransactionHandler`  
✅ Configuration builders in place  
✅ Documentation consolidated

