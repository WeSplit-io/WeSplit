# Shared Wallet Service Architecture

## Overview

The Shared Wallet Service provides a modular, maintainable architecture for managing shared accounts/wallets. It follows the same patterns as the Split Wallet Service but is completely separate to maintain clear boundaries.

## Architecture Principles

### 1. **Separation of Concerns**
- **SharedWalletCreation**: Handles wallet creation only
- **SharedWalletService**: Main orchestrator (index.ts)
- **SplitWalletSecurity**: Reused for secure private key encryption (shared concern)
- Future modules: Management, Funding, Transactions (to be implemented)

### 2. **Security**
- Uses the same encrypted private key storage system as Degen Split
- All members can access the private key through secure encryption
- Private keys are never stored in plaintext
- Firebase security rules enforce access control

### 3. **Data Flow**

```
User Action (Create Shared Wallet)
    ↓
CreateChoiceModal (UI)
    ↓
CreateSharedWallet Screen (UI)
    ↓
SharedWalletService.createSharedWallet()
    ↓
SharedWalletCreation.createSharedWallet()
    ├─→ Generate Solana Wallet
    ├─→ Create Firebase Document (sharedWallets collection)
    └─→ SplitWalletSecurity.storeSplitWalletPrivateKeyForAllParticipants()
        └─→ Encrypt private key with AES-256-CBC
        └─→ Store in Firebase (sharedWalletPrivateKeys collection)
    ↓
Return SharedWallet object
    ↓
UI updates with new wallet
```

### 4. **Private Key Access Flow**

```
User requests private key
    ↓
SharedWalletService.getSharedWalletPrivateKey()
    ↓
SplitWalletSecurity.getSplitWalletPrivateKey()
    ├─→ Check cache (in-memory, 5 min TTL)
    ├─→ Check encrypted payload cache (10 min TTL)
    ├─→ Fetch from Firebase if not cached
    ├─→ Verify user is a member
    ├─→ Decrypt using AES-256-CBC
    └─→ Return decrypted private key
```

## File Structure

```
src/services/sharedWallet/
├── index.ts                    # Main service orchestrator
├── types.ts                    # TypeScript type definitions
├── SharedWalletCreation.ts     # Wallet creation logic
├── README.md                   # This file
└── (Future modules)
    ├── SharedWalletManagement.ts   # CRUD operations
    ├── SharedWalletFunding.ts      # Funding logic
    └── SharedWalletTransactions.ts # Transaction history
```

## Key Differences from Split Wallets

| Aspect | Split Wallets | Shared Wallets |
|--------|---------------|----------------|
| **Purpose** | One-time bill splitting | Ongoing shared account |
| **Lifespan** | Temporary (until paid) | Persistent |
| **Balance** | Fixed amount to split | Dynamic (can top up) |
| **Members** | Fixed at creation | Can invite/remove |
| **Private Key** | Creator only (Fair Split) or All (Degen Split) | All members (always) |
| **Collection** | `splitWallets` | `sharedWallets` |
| **Private Key Collection** | `splitWalletPrivateKeys` | `splitWalletPrivateKeys` (shared) |

## Best Practices Applied

### 1. **Type Safety**
- All functions have proper TypeScript types
- No `any` types used
- Interfaces for all data structures

### 2. **Error Handling**
- Comprehensive try-catch blocks
- Detailed error logging
- User-friendly error messages
- Cleanup on failure (e.g., delete document if private key storage fails)

### 3. **Logging**
- Structured logging with context
- Log levels: info, warn, error
- Includes relevant metadata

### 4. **Validation**
- Input validation before processing
- Early returns for invalid data
- Clear validation error messages

### 5. **Modularity**
- Single Responsibility Principle
- Lazy loading to prevent circular dependencies
- Clear module boundaries

### 6. **Security**
- Reuses proven encryption system
- No plaintext private key storage
- Access control through Firebase rules
- In-memory caching with TTL

## Usage Examples

### Creating a Shared Wallet

```typescript
import { SharedWalletService } from '@/services/sharedWallet';

const result = await SharedWalletService.createSharedWallet({
  name: 'Apartment Rent',
  description: 'Shared account for monthly rent',
  creatorId: currentUser.id,
  creatorName: currentUser.name,
  creatorWalletAddress: currentUser.walletAddress,
  initialMembers: [
    {
      userId: currentUser.id,
      name: currentUser.name,
      walletAddress: currentUser.walletAddress,
      role: 'creator'
    },
    {
      userId: friendId,
      name: friendName,
      walletAddress: friendWalletAddress,
      role: 'member'
    }
  ],
  currency: 'USDC',
  settings: {
    allowMemberInvites: true,
    requireApprovalForWithdrawals: false
  }
});

if (result.success && result.wallet) {
  console.log('Shared wallet created:', result.wallet.id);
} else {
  console.error('Failed to create wallet:', result.error);
}
```

### Getting Private Key

```typescript
const keyResult = await SharedWalletService.getSharedWalletPrivateKey(
  sharedWalletId,
  currentUser.id
);

if (keyResult.success && keyResult.privateKey) {
  // Use private key for transactions
  const privateKey = keyResult.privateKey;
} else {
  console.error('Failed to get private key:', keyResult.error);
}
```

### Pre-fetching for Performance

```typescript
// Pre-fetch encrypted payload when wallet loads
await SharedWalletService.preFetchPrivateKeyPayload(sharedWalletId);
// Later, when user requests key, it will be much faster
```

## Firebase Collections

### `sharedWallets`
- Stores shared wallet documents
- Fields: id, name, description, creatorId, walletAddress, members, etc.
- Security: Only members can read/write

### `sharedWalletPrivateKeys` (reuses `splitWalletPrivateKeys`)
- Stores encrypted private keys
- Fields: splitWalletId (used as sharedWalletId), encryptedPrivateKey, participants
- Security: Only members can read

## Future Enhancements

1. **SharedWalletManagement**: Update wallet settings, remove members
2. **SharedWalletFunding**: Add funds from various sources
3. **SharedWalletTransactions**: Transaction history and tracking
4. **SharedWalletInvitations**: Invite system with notifications
5. **SharedWalletWithdrawals**: Withdraw to linked cards or personal wallets

## Testing Considerations

- Unit tests for validation logic
- Integration tests for Firebase operations
- Security tests for encryption/decryption
- Performance tests for caching

## Migration Notes

- Shared wallets use the same private key encryption system as Degen Split
- The `splitWalletPrivateKeys` collection is shared (by design) for both split wallets and shared wallets
- This allows reuse of proven security infrastructure
- Firebase security rules should check both `splitWallets` and `sharedWallets` collections

