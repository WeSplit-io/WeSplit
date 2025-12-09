# Unified Transaction Verification Logic

## Overview
Transaction verification logic has been unified for both **mainnet** and **devnet** to ensure consistent behavior across networks.

## Unified Verification Parameters

### Client-Side (TransactionProcessor.ts)
- **Max Attempts**: 6 (same for both networks)
- **Attempt Delay**: 1 second between attempts (same for both)
- **Timeout Per Attempt**: 2.5 seconds (same for both)
- **Initial Wait**: 1 second (same for both)
- **Total Time**: ~7-8 seconds maximum

### Firebase Function (transactionSigningService.js)
- **Max Attempts**: 6 (same for both networks)
- **Attempt Delay**: 1 second between attempts (same for both)
- **Timeout Per Attempt**: 2.5 seconds (same for both)
- **Initial Wait**: 1 second (same for both)
- **Total Time**: ~7-8 seconds maximum

## Verification Behavior

### Both Networks
1. ✅ **Strict Verification**: Fails if transaction not found after all attempts
2. ✅ **Error Detection**: Immediately fails if transaction has error
3. ✅ **No False Positives**: Only shows success if transaction verified on-chain
4. ✅ **Same Retry Logic**: Checks for signature in error, checks recent transactions before retrying

### Timeout Handling (Unified)
- Checks for signature in error message
- Checks recent transactions on-chain before retrying
- Only retries if no successful transaction found
- Same behavior for both mainnet and devnet

## Benefits

1. **Consistency**: Same behavior regardless of network
2. **Reliability**: No false positives - only shows success if transaction verified
3. **Predictability**: Same timing and attempts for both networks
4. **Maintainability**: Single code path for both networks

## Network-Specific Notes

- **Mainnet**: RPC indexing can be slower, but unified logic handles this
- **Devnet**: RPC can be unreliable, but unified logic handles this
- **Both**: Use same verification parameters for consistent UX
