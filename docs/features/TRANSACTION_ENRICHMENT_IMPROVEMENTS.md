# Transaction Enrichment Improvements

## Overview
Enhanced the transaction history system to properly display split names instead of wallet IDs and add labels for external cards/wallets. The system now handles both directions (funding INTO and withdrawing FROM split wallets) and ensures unique transactions.

## Key Improvements

### 1. Bidirectional Split Wallet Detection

#### Funding INTO Split Wallets
- **Transaction Type**: `send` or `payment`
- **Detection**: Checks `to_wallet` address against split wallet addresses
- **Display**: Shows split name instead of wallet ID
- **Example**: "Send to [Split Name]" instead of "Send to degen_split_wallet_176365..."

#### Withdrawing FROM Split Wallets
- **Transaction Type**: `withdrawal`, `send`, or `payment`
- **Detection**: Checks `from_wallet` address against split wallet addresses
- **Display**: Shows split name for withdrawals from split wallets
- **Example**: "Withdrawal from [Split Name]" or shows split name in subtitle

#### Receiving FROM Split Wallets
- **Transaction Type**: `receive` or `deposit`
- **Detection**: Checks `from_wallet` address against split wallet addresses
- **Display**: Shows split name as source
- **Example**: "Received from [Split Name]"

### 2. External Destination Detection

#### External Cards (KAST Cards)
- **Detection**: Checks wallet address against user's linked KAST cards
- **Display**: Shows "External Card" label
- **Transaction Types**: `withdrawal`, `send`, `payment`

#### External Wallets
- **Detection**: Checks wallet address against user's linked external wallets
- **Display**: Shows "External Wallet" label
- **Transaction Types**: `withdrawal`, `send`, `payment`

### 3. Transaction Deduplication

- **Method**: Deduplicates transactions by `tx_hash` or `transactionSignature`
- **Strategy**: Keeps the first occurrence of each unique transaction
- **Location**: Applied in `TransactionHistory` component before enrichment
- **Purpose**: Prevents duplicate transactions from appearing in history

### 4. Caching for Performance

- **Split Wallet Cache**: Caches split wallet lookups by address
- **External Destination Cache**: Caches external card/wallet lookups by address
- **Benefit**: Reduces database queries when multiple transactions reference the same addresses

## Implementation Details

### Transaction Enrichment Flow

1. **Deduplication**: Remove duplicate transactions by hash
2. **Enrichment**: For each unique transaction:
   - Check `to_wallet` for split wallets or external destinations
   - Check `from_wallet` for split wallets (for withdrawals)
   - Cache results to avoid duplicate queries
3. **Display**: Show enriched information in transaction history

### Transaction Types Handled

| Transaction Type | Direction | Detection Field | Display |
|-----------------|-----------|-----------------|---------|
| `send` | Funding INTO split | `to_wallet` | Split name |
| `send` | Withdrawing FROM split | `from_wallet` | Split name |
| `payment` | Funding INTO split | `to_wallet` | Split name |
| `payment` | Withdrawing FROM split | `from_wallet` | Split name |
| `withdrawal` | To external card/wallet | `to_wallet` | "External Card" or "External Wallet" |
| `withdrawal` | From split wallet | `from_wallet` | Split name |
| `receive` | From split wallet | `from_wallet` | Split name |
| `deposit` | From split wallet | `from_wallet` | Split name |

## Files Modified

1. **`src/utils/transactionEnrichment.ts`**
   - Added bidirectional split wallet detection
   - Enhanced external destination detection
   - Added caching for performance

2. **`src/components/sharedWallet/TransactionHistory.tsx`**
   - Added transaction deduplication
   - Integrated enrichment on transaction load

3. **`src/components/sharedWallet/TransactionHistoryItem.tsx`**
   - Updated display logic to show split names and external labels
   - Handles both funding and withdrawal scenarios

4. **`src/components/sharedWallet/TransactionHistoryItem.tsx` (UnifiedTransaction interface)**
   - Added `from_wallet`, `to_wallet` fields
   - Added `splitId`, `splitName`, `splitWalletId` fields
   - Added `isExternalCard`, `isExternalWallet` flags

## Testing Scenarios

### Scenario 1: Funding Split Wallet
- **Action**: User sends funds to split wallet
- **Expected**: Transaction shows split name instead of wallet ID
- **Transaction**: `type: 'send'`, `to_wallet: <split_wallet_address>`

### Scenario 2: Withdrawing from Split Wallet
- **Action**: User withdraws funds from split wallet to external card
- **Expected**: Transaction shows split name and "External Card" label
- **Transaction**: `type: 'withdrawal'`, `from_wallet: <split_wallet_address>`, `to_wallet: <external_card_address>`

### Scenario 3: Receiving from Split Wallet
- **Action**: User receives funds from split wallet (winner payout)
- **Expected**: Transaction shows split name as source
- **Transaction**: `type: 'receive'`, `from_wallet: <split_wallet_address>`

### Scenario 4: Duplicate Prevention
- **Action**: Same transaction appears multiple times
- **Expected**: Only one instance appears in history
- **Detection**: By `tx_hash` or `transactionSignature`

## Performance Considerations

- **Caching**: Reduces database queries for repeated addresses
- **Batch Processing**: Enriches all transactions in parallel
- **Lazy Loading**: Enrichment happens only when transactions are loaded
- **Error Handling**: Falls back to original transaction data if enrichment fails

## Future Enhancements

1. **Split Wallet Name Caching**: Cache split names in local storage
2. **Background Enrichment**: Pre-enrich transactions in background
3. **Transaction Grouping**: Group related transactions (e.g., funding + fee)
4. **Smart Labels**: More descriptive labels based on transaction context

