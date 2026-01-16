# Corbits x402 Integration Plan for WeSplit

## Quick Reference

| **Aspect** | **Details** |
|------------|-------------|
| **Platform** | React Native (iOS/Android) with Expo |
| **Blockchain** | Solana (mainnet/devnet) |
| **Currency** | USDC (Solana SPL Token) |
| **SDK** | `@faremeter/rides` |
| **Integration Point** | `src/config/network/api.ts` (apiRequest function) |
| **Wallet Types** | Embedded (keypair) + Phantom wallet |
| **Primary Use Case** | Premium API features, rate limit bypass |

---

## About WeSplit

**WeSplit** is a decentralized social payment app on Solana enabling expense splitting, shared wallets, and instant USDC settlements.

### Current Architecture

**Transaction System**:
- 7 transaction contexts: `send_1to1`, `fair_split_contribution`, `fair_split_withdrawal`, `degen_split_lock`, `spend_split_payment`, `shared_wallet_funding`, `shared_wallet_withdrawal`
- 12 transaction types with different fee structures
- Centralized services: `ConsolidatedTransactionService`, `TransactionProcessor`, `simplifiedWalletService`

**Key Files**:
- `src/config/network/api.ts` - HTTP request handler (primary integration point)
- `src/services/blockchain/wallet/simplifiedWalletService.ts` - Wallet management
- `src/services/blockchain/transaction/ConsolidatedTransactionService.ts` - Transaction orchestration

---

## Integration Goals

**Objectives**: Enable automatic x402 payments for premium API features, rate limit bypass, and third-party service access.

**Requirements**:
- Solana network support (Base/Polygon future)
- Embedded + Phantom wallet compatibility
- Automatic payment flow (minimal user friction)
- Backward compatible (no breaking changes)

---

## Integration Architecture

### Service Structure
```
src/services/integrations/corbits/
├── CorbitsX402Service.ts      # Main service (wallet init, payment handling)
├── CorbitsWalletAdapter.ts    # Wallet format conversion (base64/JSON → Corbits format)
├── types.ts                   # TypeScript definitions
└── index.ts                   # Exports
```

### Integration Points

#### A. API Request Layer (`src/config/network/api.ts`)

**Current**: Generic `fetch` wrapper with retry logic, 429 handling

**Enhancement**: Add optional `userId` parameter, detect 402, auto-pay via Corbits, retry request

```typescript
// Current signature
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 3
): Promise<T>

// Enhanced signature
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 3,
  userId?: string  // NEW: For x402 support
): Promise<T> {
  // ... existing retry logic ...
  
  // NEW: Handle 402 Payment Required
  if (response.status === 402 && userId) {
    const paymentDetails = await extractPaymentDetails(response);
    const paymentResult = await corbitsX402Service.handlePaymentRequired(
      url, userId, paymentDetails
    );
    
    if (paymentResult.success) {
      // Retry with payment signature
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Payment-Signature': paymentResult.paymentSignature
        }
      });
    }
  }
}
```

#### B. Corbits Service (`src/services/integrations/corbits/CorbitsX402Service.ts`)

**Core Functions**:
1. Wallet initialization (convert WeSplit format → Corbits format)
2. Payment handling (402 detection, `payer.fetch()`, signature return)
3. Error management (retry logic, user-friendly messages)

**Service Interface**:
```typescript
import { payer } from '@faremeter/rides';

class CorbitsX402Service {
  private initialized = false;
  
  // Initialize Corbits with user's Solana wallet
  async initialize(userId: string): Promise<boolean> {
    const wallet = await simplifiedWalletService.getWalletInfo(userId);
    // Convert wallet.secretKey (base64/JSON) to Corbits format
    await payer.addLocalWallet(convertedKey);
    this.initialized = true;
  }
  
  // Handle 402 response and make payment
  async handlePaymentRequired(
    endpoint: string,
    userId: string,
    paymentDetails?: { amount?: number; currency?: string }
  ): Promise<X402PaymentResult> {
    await this.initialize(userId);
    const response = await payer.fetch(endpoint);
    return { success: true, paymentSignature: response.headers.get('X-Payment-Signature') };
  }
}
```

#### C. Wallet Adapter (`src/services/integrations/corbits/CorbitsWalletAdapter.ts`)

**Purpose**: Convert WeSplit wallet format → Corbits-compatible format

**Functions**:
- `convertToCorbitsFormat(secretKey: string): string` - Handle base64/JSON array conversion
- `validateFormat(secretKey: string): boolean` - Validate compatibility
- `detectWalletType(walletInfo): 'embedded' | 'phantom'` - Type detection

#### D. Backend Integration (Optional - `services/backend/index.js`)

**Features**: 402 response middleware, payment verification via facilitator

**Example**:
```javascript
app.get('/api/premium/analytics', security.authenticateToken, async (req, res) => {
  if (!hasPremiumAccess(req.user.id)) {
    return res.status(402).json({
      error: 'Payment Required',
      amount: 10.0,
      currency: 'USDC',
      description: 'Premium analytics access'
    });
  }
  res.json({ analytics: '...' });
});
```

---

## Technical Details

### Wallet Format

**WeSplit Format**:
```typescript
{
  address: string;        // Solana public key (base58)
  publicKey: string;      // Same as address
  secretKey?: string;     // Base64 OR JSON array format: [1,2,3,...]
  isConnected: boolean;
}
```

**Corbits Format Needed**: ❓ What format does `payer.addLocalWallet()` expect?
- Base64 string?
- JSON array `[1,2,3,...]`?
- File path?
- Other format?

### Network Configuration

**Current**: Solana mainnet/devnet via `@solana/web3.js` with RPC rotation

**Corbits Setup Needed**:
- Endpoint: `https://helius.api.corbits.dev` (mainnet)?
- Network selection: How to configure devnet vs. mainnet?
- RPC: Does Corbits handle RPC or do we configure separately?

### Payment Flow

```
1. apiRequest() → Backend → 402 Response
2. Extract payment details (amount, currency)
3. CorbitsX402Service.initialize(userId) → payer.addLocalWallet(key)
4. payer.fetch(endpoint) → Auto-payment
5. Retry original request with payment signature
6. Backend verifies → Grant access
```

**Questions**:
- Does `payer.fetch()` auto-detect 402 and pay?
- 402 response format: JSON body or headers?
- Backend verification: Which facilitator API endpoint?
- Retry headers: What to include (`X-Payment-Signature`?)?

### Error Handling

**Scenarios**: Insufficient balance, timeout, network errors, invalid details

**Questions**:
- Error codes/messages from `@faremeter/rides`?
- Insufficient balance handling strategy?
- Recommended timeout value?
- How to distinguish payment vs. network errors?

---

## Use Cases

1. **Premium Analytics**: `/api/premium/analytics` → 402 (10 USDC) → Auto-pay → Access
2. **Rate Limit Bypass**: Rate limit exceeded → 402 → Pay for increase → Continue
3. **Third-Party Services**: Proxy external API → 402 → Pay → Access service

---

## Configuration

**Environment Variables**:
```bash
CORBITS_ENDPOINT=https://helius.api.corbits.dev  # ❓ Confirm mainnet endpoint
CORBITS_NETWORK=solana
CORBITS_ENABLED=true
CORBITS_TIMEOUT=30000
CORBITS_RETRY_ATTEMPTS=3
```

**Feature Flags**: Per-endpoint enable/disable, test vs. production toggle

## Testing

**Development**: Solana devnet, mocked responses, integration tests

**Questions**:
- Test/sandbox environment available?
- Test wallet credentials?
- Testing best practices?

---

## Critical Questions for Corbits Team

### 1. Wallet Integration
- **Q**: What exact format does `payer.addLocalWallet()` expect for Solana wallets?
  - Base64 string? JSON array? File path? Private key format?
- **Q**: Can we pass `secretKey` (base64 or JSON array) directly?
- **Q**: How to handle Phantom wallet? Same approach or different?

### 2. Payment Flow
- **Q**: Does `payer.fetch()` automatically detect 402 and make payment?
- **Q**: What format should 402 response be? JSON body? Headers?
  ```json
  { "amount": 10.0, "currency": "USDC" }
  ```
  OR
  ```
  X-Payment-Amount: 10.0
  X-Payment-Currency: USDC
  ```
- **Q**: How to verify payment on backend? Which facilitator API endpoint?
- **Q**: What headers to include in retry request? (`X-Payment-Signature`?)

### 3. Network Configuration
- **Q**: Recommended Corbits endpoint for Solana mainnet?
- **Q**: How to configure devnet vs. mainnet? Environment variable?
- **Q**: Do we configure RPC endpoints separately or does Corbits handle it?

### 4. Error Handling
- **Q**: What error codes/messages does `@faremeter/rides` return?
- **Q**: How to handle insufficient balance? Specific error code?
- **Q**: Recommended timeout for payment transactions?
- **Q**: How to distinguish payment failures vs. network errors?

### 5. Testing
- **Q**: Test/sandbox environment available?
- **Q**: Test wallet credentials we should use?
- **Q**: Testing best practices?

### 6. Best Practices
- **Q**: Recommended integration patterns? Common pitfalls?
- **Q**: Performance considerations? Wallet caching strategy?
- **Q**: User experience: Auto-pay or require confirmation?
- **Q**: Backend verification patterns? Recommended approach?

---

## Implementation Plan

**Phase 1** (Week 1): Install `@faremeter/rides`, create service structure, config  
**Phase 2** (Week 2): Implement `CorbitsX402Service`, wallet adapter, types  
**Phase 3** (Week 2-3): Enhance `apiRequest`, add 402 handling, retry logic  
**Phase 4** (Week 3, Optional): Backend 402 responses, payment verification  
**Phase 5** (Week 4): Testing, refinement, production rollout

## Success Criteria

- Payment success rate > 95%
- Average payment time < 5 seconds
- Error rate < 1%
- Zero breaking changes
- Seamless UX

---

## Next Steps

1. **Review**: Corbits team review of this plan
2. **Clarify**: Answer critical questions above
3. **Test Setup**: Coordinate test environment/credentials
4. **Documentation**: Share additional docs/resources
5. **Implementation**: Begin based on feedback

**Contact**: Ready to integrate and looking forward to your feedback!

---

**Version**: 1.0 | **Status**: Draft - Awaiting Feedback
