# Unified Transaction History Component

## Overview
The transaction history components have been refactored to support both **shared wallets** and **splits**, providing a unified, reusable solution for displaying transaction history across the application.

## Components

### 1. **TransactionHistory Component**
Main container component that displays a list of transactions with loading and empty states.

**Location**: `src/components/sharedWallet/TransactionHistory.tsx`

**Props**:
```typescript
interface TransactionHistoryProps {
  transactions: UnifiedTransaction[];
  isLoading: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onTransactionPress?: (transaction: UnifiedTransaction) => void;
  variant?: 'sharedWallet' | 'split'; // Optional variant
  title?: string; // Custom title (default: "Transaction History")
  emptyMessage?: string; // Custom empty message
  emptySubtext?: string; // Custom empty subtext
}
```

### 2. **TransactionHistoryItem Component**
Individual transaction row component.

**Location**: `src/components/sharedWallet/TransactionHistoryItem.tsx`

**Props**:
```typescript
interface TransactionHistoryItemProps {
  transaction: UnifiedTransaction;
  onPress?: () => void;
  variant?: 'sharedWallet' | 'split'; // Optional variant
}
```

### 3. **UnifiedTransaction Interface**
Unified interface that supports both shared wallet and split transaction structures.

**Location**: `src/components/sharedWallet/TransactionHistoryItem.tsx`

```typescript
export interface UnifiedTransaction {
  id?: string;
  firebaseDocId?: string;
  type: 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund';
  amount: number;
  currency: string;
  // User information - supports different field names
  userName?: string; // For shared wallets
  senderName?: string; // For splits
  recipientName?: string; // For splits
  from_user?: string; // For splits
  to_user?: string; // For splits
  // Additional fields
  memo?: string;
  note?: string; // Alternative to memo
  status: 'confirmed' | 'pending' | 'failed' | 'completed';
  createdAt: string | Date;
  created_at?: string | Date; // Alternative field name
  // Optional transaction signature/hash
  transactionSignature?: string;
  tx_hash?: string;
}
```

## Usage Examples

### For Shared Wallets

```typescript
import { TransactionHistory, UnifiedTransaction } from '../../components/sharedWallet';

// In your component
const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

// Load transactions
const loadTransactions = useCallback(async () => {
  if (!wallet?.id) return;
  
  setIsLoadingTransactions(true);
  try {
    const result = await SharedWalletService.getSharedWalletTransactions(wallet.id, 20);
    if (result.success && result.transactions) {
      // Map shared wallet transactions to UnifiedTransaction format
      const unifiedTransactions: UnifiedTransaction[] = result.transactions.map(tx => ({
        id: tx.id || tx.firebaseDocId,
        firebaseDocId: tx.firebaseDocId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        userName: tx.userName,
        memo: tx.memo,
        status: tx.status,
        createdAt: tx.createdAt,
        transactionSignature: tx.transactionSignature,
      }));
      setTransactions(unifiedTransactions);
    }
  } catch (error) {
    logger.error('Error loading transactions', error, 'ComponentName');
  } finally {
    setIsLoadingTransactions(false);
  }
}, [wallet?.id]);

// Render
<TransactionHistory
  transactions={transactions}
  isLoading={isLoadingTransactions}
  variant="sharedWallet"
  onTransactionPress={(tx) => {
    // Handle transaction press
  }}
/>
```

### For Splits

```typescript
import { TransactionHistory, UnifiedTransaction } from '../../components/sharedWallet';

// In your component
const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

// Load transactions
const loadTransactions = useCallback(async () => {
  if (!splitId) return;
  
  setIsLoadingTransactions(true);
  try {
    // Get transactions from your split service
    // Example: const splitTransactions = await SplitService.getSplitTransactions(splitId);
    
    // Map split transactions to UnifiedTransaction format
    const unifiedTransactions: UnifiedTransaction[] = splitTransactions.map(tx => ({
      id: tx.id,
      firebaseDocId: tx.firebaseDocId,
      type: tx.type, // 'send', 'receive', 'payment', etc.
      amount: tx.amount,
      currency: tx.currency,
      senderName: tx.sender_name || tx.from_user,
      recipientName: tx.recipient_name || tx.to_user,
      note: tx.note,
      status: tx.status === 'completed' ? 'confirmed' : tx.status,
      createdAt: tx.created_at || tx.createdAt,
      tx_hash: tx.tx_hash,
    }));
    setTransactions(unifiedTransactions);
  } catch (error) {
    logger.error('Error loading transactions', error, 'ComponentName');
  } finally {
    setIsLoadingTransactions(false);
  }
}, [splitId]);

// Render
<TransactionHistory
  transactions={transactions}
  isLoading={isLoadingTransactions}
  variant="split"
  title="Payment History"
  emptyMessage="No payments yet"
  emptySubtext="Payments will appear here when participants pay their share"
  onTransactionPress={(tx) => {
    // Handle transaction press
  }}
/>
```

## Transaction Type Mapping

### Shared Wallet Types
- `funding` → "Top Up" (green, ArrowDown icon)
- `withdrawal` → "Withdrawal" (red, ArrowUp icon)
- `transfer` → "Transfer" (white, ArrowsClockwise icon)
- `fee` → "Fee" (white, ArrowsClockwise icon)

### Split Types
- `send` → "Sent" (red, ArrowUp icon)
- `receive` → "Received" (green, ArrowDown icon)
- `deposit` → "Deposit" (green, ArrowDown icon)
- `payment` → "Payment" (red, ArrowUp icon)
- `refund` → "Refund" (green, ArrowCounterClockwise icon)

## Features

### Automatic Field Mapping
The component automatically handles different field names:
- **User Name**: Uses `userName` (shared wallets) or `senderName`/`recipientName` (splits)
- **Memo/Note**: Uses `memo` or `note` field
- **Date**: Uses `createdAt` or `created_at` field

### Smart Display Logic
- **Income transactions** (funding, deposit, receive, refund): Green color, "+" prefix
- **Expense transactions** (withdrawal, send, payment): Red color, "-" prefix
- **Status badges**: Color-coded (green for confirmed, gray for pending, red for failed)

### Variant Support
- `sharedWallet`: Optimized for shared wallet transaction display
- `split`: Optimized for split payment display

## Benefits

1. **Code Reuse**: Single component for all transaction displays
2. **Consistency**: Unified UI/UX across the app
3. **Flexibility**: Supports different transaction structures
4. **Maintainability**: Single source of truth for transaction display logic
5. **Type Safety**: TypeScript interfaces ensure correct usage

## Migration Guide

### From Custom Transaction Display

**Before**:
```typescript
{transactions.map((tx) => (
  <View key={tx.id}>
    <Text>{tx.type}</Text>
    <Text>{tx.amount}</Text>
    {/* Custom rendering logic */}
  </View>
))}
```

**After**:
```typescript
<TransactionHistory
  transactions={transactions}
  isLoading={isLoading}
  variant="split"
/>
```

### Mapping Existing Transactions

If you have existing transaction data, map it to `UnifiedTransaction`:

```typescript
const mapToUnified = (tx: YourTransactionType): UnifiedTransaction => ({
  id: tx.id,
  type: mapTransactionType(tx.type), // Map your type to unified type
  amount: tx.amount,
  currency: tx.currency,
  userName: tx.userName || tx.senderName,
  memo: tx.memo || tx.note,
  status: mapStatus(tx.status), // Map to 'confirmed' | 'pending' | 'failed'
  createdAt: tx.createdAt || tx.created_at,
});
```

## Best Practices

1. **Always map transactions** to `UnifiedTransaction` format before passing to component
2. **Use appropriate variant** for better display logic
3. **Handle loading states** properly
4. **Provide meaningful empty messages** for better UX
5. **Use onTransactionPress** to navigate to transaction details if needed

## Future Enhancements

- Add transaction filtering (by type, date, status)
- Add transaction search
- Add pagination support
- Add export functionality
- Add transaction grouping by date

