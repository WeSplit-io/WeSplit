# Transaction Enrichment Integration

## Overview
This document describes the complete integration of transaction enrichment into the transaction history system, ensuring backward compatibility with old splits, maintaining 1/1 transfer logic, and preserving request transaction handling.

## Integration Points

### 1. TransactionHistoryScreen Integration

**Location**: `src/screens/TransactionHistory/TransactionHistoryScreen.tsx`

**Changes**:
- Converts `Transaction` type to `UnifiedTransaction` format
- Enriches transactions with split names and external destination info
- Preserves existing `TransactionItem` component for backward compatibility
- Maintains all existing functionality (filtering, modals, etc.)

**Flow**:
1. Load transactions from Firebase
2. Convert to UnifiedTransaction format
3. Deduplicate by tx_hash
4. Enrich with split names and external destinations
5. Convert back to Transaction format with enriched data
6. Display using existing TransactionItem component

### 2. TransactionHistory Component Integration

**Location**: `src/components/sharedWallet/TransactionHistory.tsx`

**Changes**:
- Automatically enriches UnifiedTransaction arrays
- Deduplicates transactions
- Works seamlessly with existing usage

## Backward Compatibility

### Old Split Handling

**Problem**: Old splits may not have wallet addresses stored in transactions, or may have split info only in memo/note fields.

**Solution**:
1. **Memo Pattern Detection**: Extracts split information from memo/note fields using regex patterns:
   - `degen_split_wallet_*`
   - `split_wallet_*`
   - `fair split participant payment`
   - `Degen Split fund locking`

2. **Wallet ID Extraction**: If a wallet ID pattern is found in memo, attempts to look up the split name

3. **Fallback**: If wallet address lookup fails, preserves original memo/note content

**Code**: `extractSplitInfoFromMemo()` in `src/utils/transactionEnrichment.ts`

### 1/1 Transfer Preservation

**Problem**: 1/1 transfers (internal user-to-user) should display recipient/sender names, not split names.

**Solution**:
- Detects 1/1 transfers by checking:
  - Both `from_user` and `to_user` are present
  - Both are user IDs (not wallet addresses)
  - User IDs are short (< 20 characters)
  - Neither starts with "split_"
- Skips enrichment for 1/1 transfers to preserve original display

**Code**: Detection logic in `enrichTransaction()` and `enrichTransactions()`

### Request Transaction Preservation

**Problem**: Payment requests and settlements should maintain their original display logic.

**Solution**:
- Detects request transactions by:
  - Presence of `group_id` field
  - Memo/note containing "request" or "settlement"
- Skips enrichment for request transactions to preserve original display

**Code**: Detection logic in `enrichTransactions()`

## Data Flow

```
Transaction (from Firebase)
  ↓
convertTransactionToUnified()
  ↓
UnifiedTransaction
  ↓
enrichTransactions() [with backward compatibility checks]
  ↓
Enriched UnifiedTransaction
  ↓
Convert back to Transaction format (with enriched data in note/recipient_name)
  ↓
Display using TransactionItem
```

## Key Features

### 1. Split Name Display
- **New splits**: Uses wallet address lookup to get split name
- **Old splits**: Extracts from memo/note or wallet ID pattern
- **Display**: Shows split name instead of wallet ID

### 2. External Destination Labels
- **External Cards**: Shows "External Card" label
- **External Wallets**: Shows "External Wallet" label
- **Detection**: Checks user's linked destinations

### 3. Transaction Deduplication
- **Method**: Deduplicates by `tx_hash` or `transactionSignature`
- **Strategy**: Keeps first occurrence
- **Applied**: Before enrichment to avoid processing duplicates

### 4. Performance Optimization
- **Caching**: Caches split wallet and external destination lookups
- **Batch Processing**: Enriches all transactions in parallel
- **Error Handling**: Falls back gracefully if enrichment fails

## Testing Scenarios

### Scenario 1: New Split Transaction
- **Transaction**: `type: 'send'`, `to_wallet: <split_wallet_address>`
- **Expected**: Shows split name instead of wallet ID
- **Status**: ✅ Handled

### Scenario 2: Old Split Transaction
- **Transaction**: `type: 'send'`, `note: 'Degen Split fund locking - degen_split_wallet_123'`
- **Expected**: Extracts split name from memo or looks up by wallet ID
- **Status**: ✅ Handled

### Scenario 3: 1/1 Transfer
- **Transaction**: `type: 'send'`, `from_user: 'user123'`, `to_user: 'user456'`
- **Expected**: Shows recipient name, no enrichment applied
- **Status**: ✅ Handled

### Scenario 4: Request Transaction
- **Transaction**: `type: 'send'`, `group_id: 'group123'`
- **Expected**: Shows original request info, no enrichment applied
- **Status**: ✅ Handled

### Scenario 5: Withdrawal from Split
- **Transaction**: `type: 'withdrawal'`, `from_wallet: <split_wallet_address>`, `to_wallet: <external_card>`
- **Expected**: Shows split name and "External Card" label
- **Status**: ✅ Handled

## Files Modified

1. **`src/utils/transactionConversion.ts`** (NEW)
   - Converts Transaction to UnifiedTransaction
   - Preserves group_id for request detection

2. **`src/utils/transactionEnrichment.ts`**
   - Added backward compatibility for old splits
   - Added 1/1 transfer detection
   - Added request transaction detection
   - Enhanced memo pattern extraction

3. **`src/screens/TransactionHistory/TransactionHistoryScreen.tsx`**
   - Integrated enrichment
   - Maintains backward compatibility
   - Preserves existing UI components

4. **`src/components/sharedWallet/TransactionHistory.tsx`**
   - Already integrated (from previous work)

## Migration Notes

### For Developers

1. **Using TransactionHistory Component**: No changes needed, enrichment is automatic
2. **Using TransactionHistoryScreen**: Enrichment is now integrated, no changes needed
3. **Custom Transaction Lists**: Use `convertTransactionsToUnified()` and `enrichTransactions()`

### For Old Transactions

- Old transactions without wallet addresses will still work
- Memo/note patterns are detected and used for split identification
- If enrichment fails, original transaction data is preserved

## Performance Considerations

- **Caching**: Reduces database queries for repeated addresses
- **Batch Processing**: Enriches all transactions in parallel
- **Error Handling**: Graceful fallback if enrichment fails
- **Deduplication**: Applied before enrichment to avoid duplicate processing

## Future Enhancements

1. **Local Caching**: Cache split names in local storage
2. **Background Enrichment**: Pre-enrich transactions in background
3. **Smart Grouping**: Group related transactions
4. **Enhanced Memo Parsing**: Better extraction of split info from various memo formats

