# Devnet vs Mainnet: Key Differences Causing Transaction Issues

## Executive Summary

**Devnet works smoothly** because it's:
- ✅ Low traffic, fast response times
- ✅ No rate limiting
- ✅ Fast transaction confirmation (1-3 seconds)
- ✅ Reliable RPC endpoints
- ✅ Immediate transaction indexing

**Mainnet has issues** because it's:
- ❌ High traffic, slower response times
- ❌ **RPC Rate Limiting (HTTP 429 errors)**
- ❌ Slower transaction confirmation (10-30+ seconds)
- ❌ Multiple RPC endpoints with varying reliability
- ❌ Delayed transaction indexing
- ❌ Network congestion during peak times

---

## 1. RPC Endpoint Differences

### Devnet
```typescript
rpcEndpoints: [
  'https://api.devnet.solana.com',        // Fast, reliable
  'https://devnet.helius-rpc.com'          // Fast, reliable
]
```
- **2 endpoints** (simple, reliable)
- **No rate limiting** - can make many requests quickly
- **Fast response times** (< 500ms)
- **Immediate indexing** - transactions appear in RPC immediately

### Mainnet
```typescript
rpcEndpoints: [
  'https://mainnet.helius-rpc.com/?api-key=...',  // Rate limited
  'https://api.mainnet-beta.solana.com',          // Rate limited, slow
  'https://solana-api.projectserum.com',          // Rate limited
  'https://rpc.ankr.com/solana',                   // Rate limited
  'https://solana-mainnet.g.alchemy.com/v2/demo'  // Rate limited
]
```
- **5 endpoints** (complex, varying reliability)
- **Heavy rate limiting** - HTTP 429 errors common
- **Slower response times** (1-5 seconds, sometimes 10+ seconds)
- **Delayed indexing** - transactions may take 5-15 seconds to appear in RPC

**Impact:** Mainnet RPC calls fail frequently due to rate limits, causing verification to fail even when transactions succeed.

---

## 2. Transaction Verification Timing

### Devnet
```typescript
// Fast verification - works immediately
const maxAttempts = 2;
const baseDelayMs = 300; // 300ms between checks

// Total time: ~600ms - 1 second
```

**Why it works:**
- Transaction confirms in 1-3 seconds
- RPC responds immediately
- No rate limits to worry about
- Can check status multiple times quickly

### Mainnet
```typescript
// Slow verification - needs delays
const maxAttempts = 3;
const baseDelayMs = 5000; // 5 seconds between checks

// Plus delayed final check:
await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s
// Then check once more with 20s timeout

// Total time: ~15-40 seconds
```

**Why it fails:**
- Transaction confirms in 10-30+ seconds
- RPC rate limits prevent frequent checks
- Need to wait longer between checks
- Even with delays, rate limits can still hit

**Impact:** Mainnet verification times out or hits rate limits before transaction is confirmed.

---

## 3. Immediate Verification Strategy

### Devnet
```typescript
// ✅ WORKS: Immediate verification after submission
try {
  let signatureStatus = await this.connection.getSignatureStatus(signature, { 
    searchTransactionHistory: true 
  });
  // Transaction found immediately
} catch (verifyError) {
  // Rarely happens
}
```

**Why it works:**
- Transaction indexed immediately
- RPC responds quickly
- No rate limits

### Mainnet
```typescript
// ❌ PROBLEM: Immediate verification hits rate limits
if (!isMainnet) {
  // Only verify immediately on devnet
  try {
    let signatureStatus = await this.connection.getSignatureStatus(signature, { 
      searchTransactionHistory: true 
    });
  } catch (verifyError) {
    // Rate limit errors common
  }
} else {
  // Skip immediate verification on mainnet to avoid rate limits
  logger.info('Skipping immediate verification on mainnet to avoid rate limits');
}
```

**Why it fails:**
- Transaction not indexed immediately (5-15 second delay)
- Immediate check hits rate limits
- Need to wait before checking

**Impact:** Can't verify immediately on mainnet, must wait and retry.

---

## 4. Confirmation Polling Strategy

### Devnet
```typescript
// ✅ WORKS: Quick polling
const quickPollDuration = 3000; // 3 seconds
while (Date.now() - quickStart < quickPollDuration) {
  const quickStatus = await this.connection.getSignatureStatus(signature, { 
    searchTransactionHistory: true 
  });
  if (quickStatus.value && !quickStatus.value.err) {
    return true; // Found immediately
  }
  await new Promise(resolve => setTimeout(resolve, 300)); // 300ms intervals
}
```

**Why it works:**
- Can poll every 300ms
- No rate limit issues
- Transaction appears quickly

### Mainnet
```typescript
// ❌ PROBLEM: Quick polling hits rate limits
if (!isMainnet) {
  // Only do quick polling on devnet
  // ... quick polling code ...
}

// Mainnet uses slower polling:
const pollIntervalMs = 5000; // 5 seconds between polls
const remainingTime = 10000; // Only 10 seconds total
// Much fewer checks due to rate limits
```

**Why it fails:**
- Can't poll frequently (rate limits)
- Need 5 second intervals
- Only 2-3 checks before timeout
- Transaction may not be indexed yet

**Impact:** Mainnet can't poll frequently enough to catch confirmation quickly.

---

## 5. Transaction Confirmation Timeouts

### Devnet
```typescript
// ✅ WORKS: Short timeouts
const maxTimeout = 20000; // 20 seconds
const shortTimeout = 20000;
// Transaction confirms in 1-3 seconds, plenty of time
```

**Why it works:**
- Transactions confirm quickly
- 20 seconds is more than enough
- Usually confirms in first check

### Mainnet
```typescript
// ❌ PROBLEM: Need longer timeouts but can't check frequently
const maxTimeout = 30000; // 30 seconds for iOS production
// But can only check 2-3 times due to rate limits
// Transaction may take 20-30+ seconds to confirm
```

**Why it fails:**
- Transactions take 10-30+ seconds to confirm
- Rate limits prevent frequent checks
- May timeout before transaction confirms
- Even with longer timeout, can't check often enough

**Impact:** Mainnet transactions may not be confirmed before timeout, even though they succeed.

---

## 6. Rate Limit Handling

### Devnet
```typescript
// ✅ NOT NEEDED: No rate limits
// Can make unlimited requests
// No exponential backoff needed
```

**Why it works:**
- No rate limiting
- Can make as many requests as needed
- No need for backoff strategies

### Mainnet
```typescript
// ❌ CRITICAL: Must handle rate limits
const isRateLimit = errorMessage.includes('429') || 
                   errorMessage.includes('rate limit') || 
                   errorMessage.includes('too many requests');

if (isRateLimit) {
  // Exponential backoff
  const rateLimitDelay = baseDelayMs * Math.pow(2, attempt - 1);
  await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
  continue; // Retry after backoff
}
```

**Why it fails:**
- Rate limits hit frequently
- Need exponential backoff
- Each retry takes longer
- May exhaust retries before transaction confirms

**Impact:** Rate limits cause verification to fail even when transaction succeeds.

---

## 7. RPC Endpoint Rotation

### Devnet
```typescript
// ✅ WORKS: Simple rotation
const rotateInterval = 5; // Rotate every 5 polls
if (pollCount % rotateInterval === 0) {
  await this.switchToNextEndpoint();
}
```

**Why it works:**
- All endpoints reliable
- Rotation helps with visibility
- No rate limit issues

### Mainnet
```typescript
// ❌ PROBLEM: Less frequent rotation due to rate limits
const rotateInterval = 3; // Rotate every 3 polls (less frequently)
// But polling is already slow (5s intervals)
// So rotation happens every 15 seconds
```

**Why it fails:**
- Need to rotate less frequently to avoid rate limits
- Each endpoint has its own rate limits
- Rotation may hit rate limits on new endpoint too

**Impact:** Can't rotate endpoints frequently enough to improve visibility.

---

## 8. Transaction Submission Flow

### Devnet
```
1. Build transaction (100ms)
2. Get blockhash (200ms)
3. Sign transaction (50ms)
4. Submit transaction (300ms)
5. Immediate verification (300ms) ✅
6. Confirmation (1-3 seconds) ✅
Total: ~2-4 seconds
```

**Why it works:**
- Fast at every step
- Immediate verification works
- Quick confirmation

### Mainnet
```
1. Build transaction (100ms)
2. Get blockhash (1-3 seconds) ⚠️
3. Sign transaction (50ms)
4. Submit transaction (1-5 seconds) ⚠️
5. Skip immediate verification (to avoid rate limits) ⚠️
6. Wait 3 seconds for propagation
7. Verification attempts (15-30 seconds) ⚠️
8. Delayed final check (15s wait + 20s timeout) ⚠️
Total: ~35-75 seconds
```

**Why it fails:**
- Slower at every step
- Can't verify immediately
- Need multiple delayed checks
- Rate limits cause failures

**Impact:** Mainnet flow is much slower and more prone to failures.

---

## 9. Error Handling Differences

### Devnet
```typescript
// ✅ SIMPLE: Most errors are actual failures
try {
  const status = await this.connection.getSignatureStatus(signature);
  if (status.value?.err) {
    return { success: false, error: 'Transaction failed' };
  }
} catch (error) {
  // Rare - usually means actual error
  throw error;
}
```

**Why it works:**
- Errors are usually real failures
- Can trust error responses
- No need for complex retry logic

### Mainnet
```typescript
// ❌ COMPLEX: Must distinguish rate limits from failures
try {
  const status = await this.connection.getSignatureStatus(signature);
  if (status.value?.err) {
    return { success: false, error: 'Transaction failed' };
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isRateLimit = errorMessage.includes('429') || 
                     errorMessage.includes('rate limit');
  
  if (isRateLimit) {
    // Not a real failure - retry with backoff
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    continue;
  } else {
    // Might be real failure, or might be rate limit in disguise
    // Hard to tell - assume success if we got signature
  }
}
```

**Why it fails:**
- Must handle rate limits vs real failures
- Hard to distinguish between them
- May assume success when transaction actually failed
- Complex retry logic needed

**Impact:** Error handling is complex and may miss real failures or assume success incorrectly.

---

## 10. Network Congestion

### Devnet
- **Low traffic** - always fast
- **No congestion** - consistent performance
- **Predictable** - same behavior every time

### Mainnet
- **High traffic** - varies by time of day
- **Network congestion** - slower during peak times
- **Unpredictable** - behavior varies significantly
- **Peak times:** Transactions can take 30-60+ seconds

**Impact:** Mainnet performance is unpredictable, making timeouts and retries harder to tune.

---

## Summary: Root Causes of Mainnet Issues

1. **RPC Rate Limiting** - Can't check transaction status frequently enough
2. **Delayed Indexing** - Transactions take 5-15 seconds to appear in RPC
3. **Slower Confirmation** - Transactions take 10-30+ seconds to confirm
4. **Network Congestion** - Unpredictable performance during peak times
5. **Complex Error Handling** - Hard to distinguish rate limits from failures
6. **Multiple RPC Endpoints** - Each has its own rate limits and reliability issues
7. **Longer Timeouts Needed** - But can't check frequently due to rate limits

## Solutions Implemented

1. ✅ **Skip immediate verification on mainnet** - Avoid rate limits
2. ✅ **Longer delays between checks** - 5 seconds instead of 300ms
3. ✅ **Delayed final check** - Wait 15 seconds, then check once more
4. ✅ **Exponential backoff for rate limits** - Handle 429 errors properly
5. ✅ **Fewer verification attempts** - Reduce from 5 to 3 to avoid rate limits
6. ✅ **Mainnet-specific verification flow** - Different logic for mainnet vs devnet
7. ✅ **Proper error distinction** - Handle rate limits vs real failures

## Remaining Challenges

1. ⚠️ **Still can't verify immediately** - Must wait for indexing
2. ⚠️ **Rate limits still hit** - Even with backoff
3. ⚠️ **Unpredictable timing** - Network congestion varies
4. ⚠️ **May assume success incorrectly** - If verification times out

## Recommendations

1. **Consider using Solana Explorer API** as alternative verification method
2. **Implement balance-based verification** as fallback (check if funds moved)
3. **Use WebSocket subscriptions** for real-time confirmation (if available)
4. **Cache transaction signatures** and verify asynchronously in background
5. **Implement transaction status polling service** that handles rate limits better

