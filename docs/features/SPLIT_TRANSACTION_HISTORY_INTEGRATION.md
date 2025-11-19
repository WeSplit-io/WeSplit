# Split Transaction History Integration Guide

## Overview
This guide shows how to integrate the unified `TransactionHistory` component into the split details screen to display payment transactions.

## Step 1: Import the Component

```typescript
import { TransactionHistory, UnifiedTransaction } from '../../components/sharedWallet';
```

## Step 2: Add State Management

```typescript
const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
```

## Step 3: Create Transaction Loading Function

```typescript
const loadSplitTransactions = useCallback(async () => {
  if (!splitId || !currentUser?.id) return;
  
  setIsLoadingTransactions(true);
  try {
    // Option 1: Get transactions from the general transactions collection
    // Filter by split-related transactions
    const userTransactions = await firebaseDataService.transaction.getUserTransactions(
      currentUser.id.toString(),
      50
    );
    
    // Filter transactions related to this split
    // You can identify split transactions by:
    // - group_id field matching the split ID
    // - note/memo containing split information
    // - Or create a dedicated splitTransactions collection
    
    const splitTransactions = userTransactions.filter(tx => 
      tx.group_id === splitId || 
      tx.note?.includes(splitId) ||
      // Add other filtering logic based on your data structure
      false
    );
    
    // Map to UnifiedTransaction format
    const unifiedTransactions: UnifiedTransaction[] = splitTransactions.map(tx => ({
      id: tx.id,
      firebaseDocId: tx.id, // Use id as firebaseDocId if available
      type: tx.type, // 'send', 'receive', 'payment', etc.
      amount: tx.amount,
      currency: tx.currency,
      senderName: tx.sender_name || tx.from_user,
      recipientName: tx.recipient_name || tx.to_user,
      note: tx.note,
      status: tx.status === 'completed' ? 'confirmed' : 
              tx.status === 'pending' ? 'pending' : 
              'failed',
      createdAt: tx.created_at || tx.createdAt,
      tx_hash: tx.tx_hash,
    }));
    
    setTransactions(unifiedTransactions);
    
    // Option 2: If you have a dedicated split transactions service
    // const result = await SplitService.getSplitTransactions(splitId);
    // Map result.transactions to UnifiedTransaction format
    
  } catch (error) {
    logger.error('Error loading split transactions', error, 'SplitDetailsScreen');
    setTransactions([]);
  } finally {
    setIsLoadingTransactions(false);
  }
}, [splitId, currentUser?.id]);
```

## Step 4: Call Load Function

```typescript
useEffect(() => {
  if (splitId) {
    loadSplitTransactions();
  }
}, [splitId, loadSplitTransactions]);

// Also reload on focus
useFocusEffect(
  useCallback(() => {
    if (splitId) {
      loadSplitTransactions();
    }
  }, [splitId, loadSplitTransactions])
);
```

## Step 5: Render the Component

```typescript
<TransactionHistory
  transactions={transactions}
  isLoading={isLoadingTransactions}
  variant="split"
  title="Payment History"
  emptyMessage="No payments yet"
  emptySubtext="Payments will appear here when participants pay their share"
  onTransactionPress={(tx) => {
    // Navigate to transaction details or show modal
    navigation.navigate('TransactionDetails', {
      transactionId: tx.id,
      transaction: tx,
    });
  }}
/>
```

## Alternative: Create Split Transaction Service

If you want a dedicated service for split transactions:

```typescript
// src/services/splits/SplitTransactionService.ts
export class SplitTransactionService {
  static async getSplitTransactions(
    splitId: string,
    limit: number = 50
  ): Promise<{ success: boolean; transactions?: UnifiedTransaction[]; error?: string }> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');
      
      // Query transactions collection for split-related transactions
      const q = query(
        collection(db, 'transactions'),
        where('group_id', '==', splitId), // Assuming you store splitId in group_id
        orderBy('created_at', 'desc'),
        limitQuery(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: UnifiedTransaction[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firebaseDocId: doc.id,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          senderName: data.sender_name || data.from_user,
          recipientName: data.recipient_name || data.to_user,
          note: data.note,
          status: data.status === 'completed' ? 'confirmed' : 
                  data.status === 'pending' ? 'pending' : 
                  'failed',
          createdAt: data.created_at || data.createdAt,
          tx_hash: data.tx_hash,
        };
      });
      
      return {
        success: true,
        transactions,
      };
    } catch (error) {
      logger.error('Error getting split transactions', error, 'SplitTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
```

## Transaction Type Mapping for Splits

When mapping split transactions, use these mappings:

- **Payment made**: `type: 'payment'` or `type: 'send'`
- **Payment received**: `type: 'receive'`
- **Refund**: `type: 'refund'`
- **Deposit**: `type: 'deposit'`

## Example Integration in SplitDetailsScreen

```typescript
// In SplitDetailsScreen.tsx

import { TransactionHistory, UnifiedTransaction } from '../../components/sharedWallet';

// Add to component state
const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

// Add load function
const loadTransactions = useCallback(async () => {
  if (!splitId) return;
  
  setIsLoadingTransactions(true);
  try {
    // Get user transactions
    const userTransactions = await firebaseDataService.transaction.getUserTransactions(
      currentUser.id.toString(),
      100 // Get more to filter
    );
    
    // Filter for this split
    const splitTransactions = userTransactions.filter(tx => 
      tx.group_id === splitId || 
      (tx.note && tx.note.includes(splitId))
    );
    
    // Map to unified format
    const unified: UnifiedTransaction[] = splitTransactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      senderName: tx.sender_name,
      recipientName: tx.recipient_name,
      note: tx.note,
      status: tx.status === 'completed' ? 'confirmed' : tx.status,
      createdAt: tx.created_at,
      tx_hash: tx.tx_hash,
    }));
    
    setTransactions(unified);
  } catch (error) {
    logger.error('Error loading transactions', error, 'SplitDetailsScreen');
  } finally {
    setIsLoadingTransactions(false);
  }
}, [splitId, currentUser?.id]);

// Load on mount and focus
useEffect(() => {
  loadTransactions();
}, [loadTransactions]);

useFocusEffect(
  useCallback(() => {
    loadTransactions();
  }, [loadTransactions])
);

// Render in JSX
<TransactionHistory
  transactions={transactions}
  isLoading={isLoadingTransactions}
  variant="split"
  title="Payment History"
  emptyMessage="No payments yet"
  emptySubtext="Payments will appear here when participants pay their share"
/>
```

## Benefits

1. **Consistent UI**: Same transaction display across shared wallets and splits
2. **Reusable Code**: Single component for all transaction displays
3. **Easy Maintenance**: Update once, applies everywhere
4. **Type Safety**: TypeScript ensures correct usage

## Next Steps

1. Add transaction history to `SplitDetailsScreen`
2. Create `SplitTransactionService` if needed for better organization
3. Update Firestore queries to include `group_id` or similar field for split transactions
4. Test transaction display in both shared wallets and splits

