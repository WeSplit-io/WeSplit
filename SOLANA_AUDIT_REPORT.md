# WeSplit Solana App Audit Report

## Executive Summary

This audit examines the WeSplit Solana application for compliance with the specified requirements for wallet generation, custody, fee payment, and transaction handling. The audit reveals several critical violations that need immediate attention.

## Critical Findings

### 🚨 CRITICAL VIOLATIONS

#### 1. Random Keypair Generation (Multiple Locations)
**Severity: CRITICAL**

Found 9 instances of `Keypair.generate()` that create wallets without BIP39 mnemonics:

- `utils/walletService.ts:55`
- `src/services/solanaAppKitService.ts:348,664,921,1226,1296`
- `src/services/legacyWalletRecoveryService.ts:209`
- `src/services/consolidatedWalletService.ts:138` ⚠️ **MAIN WALLET SERVICE**
- `src/services/groupWalletService.ts:36`

**Impact**: Users cannot recover their wallets if they lose their device. This violates the core requirement of BIP39 mnemonic-based wallet generation.

#### 2. Fee Payer Violations
**Severity: CRITICAL**

All USDC transfer implementations use the user's wallet as fee payer instead of the company wallet:

- `src/transfer/sendInternal.ts:417` - `feePayer: fromPublicKey`
- `src/services/consolidatedTransactionService.ts:311` - `feePayer: fromPublicKey`
- `src/transfer/sendExternal.ts:337` - `feePayer: fromPublicKey`
- `src/services/consolidatedWalletService.ts:609` - `feePayer: fromPublicKey`
- `src/services/solanaAppKitService.ts:830` - `feePayer: fromPublicKey`

**Impact**: Users must hold SOL to pay transaction fees, violating the requirement that users may hold only USDC and the company pays all fees.

#### 3. Inconsistent Wallet Generation
**Severity: HIGH**

The app has multiple wallet generation paths with inconsistent approaches:

- `src/services/userWalletService.ts:470` - Uses BIP39 correctly
- `src/services/consolidatedWalletService.ts:138` - Uses random keypair
- `src/services/secureSeedPhraseService.ts:31` - Uses BIP39 correctly

**Impact**: Users may get different wallet types depending on which code path is used.

### ⚠️ HIGH PRIORITY ISSUES

#### 4. Private Key Storage Concerns
**Severity: HIGH**

Private keys are stored in multiple formats and locations:
- Base64 encoded in `secureStorageService.ts`
- JSON array format in `userWalletService.ts:498`
- Direct secret key storage in various services

**Impact**: Inconsistent storage may lead to key recovery issues.

#### 5. Missing Company Fee Payer Implementation
**Severity: HIGH**

While company wallet configuration exists in environment variables, there's no actual implementation of company-signed transactions:

- Company wallet keys are configured but never used for fee payment
- No server-side transaction signing with company keys
- No partial signature handling

**Impact**: Users must pay their own transaction fees, violating the business model.

#### 6. ATA Creation Issues
**Severity: MEDIUM**

ATA creation is inconsistent across services:
- Some services create ATAs, others don't
- ATA creation fees are paid by users instead of company
- Missing ATA creation in some transfer paths

## Detailed File Analysis

### Wallet Generation Files

#### ✅ COMPLIANT
- `src/services/bip39WalletService.ts` - Proper BIP39 implementation
- `src/services/userWalletService.ts:470` - Uses BIP39 mnemonic generation
- `src/services/secureSeedPhraseService.ts` - Proper mnemonic handling

#### ❌ NON-COMPLIANT
- `src/services/consolidatedWalletService.ts:138` - Uses `Keypair.generate()`
- `utils/walletService.ts:55` - Uses `Keypair.generate()`
- `src/services/solanaAppKitService.ts` - Multiple `Keypair.generate()` calls

### Transfer Implementation Files

#### ❌ ALL NON-COMPLIANT
All transfer services use user as fee payer:
- `src/transfer/sendInternal.ts`
- `src/transfer/sendExternal.ts`
- `src/services/consolidatedTransactionService.ts`
- `src/services/consolidatedWalletService.ts`
- `src/services/solanaAppKitService.ts`

### Environment Configuration

#### ✅ COMPLIANT
- `src/config/chain.ts` - Proper network configuration
- `env.example` - Complete environment setup
- `env.production.example` - Production-ready configuration

#### ⚠️ CONCERNS
- Company wallet keys are in environment but not used in code
- No server-side environment for company key signing

## Required Fixes

### 1. Wallet Generation Standardization

**Priority: CRITICAL**

Replace all `Keypair.generate()` calls with BIP39 mnemonic-based generation:

```typescript
// ❌ Current (WRONG)
const keypair = Keypair.generate();

// ✅ Required (CORRECT)
const mnemonic = bip39.generateMnemonic(128);
const keypair = deriveKeypairFromMnemonic(mnemonic);
```

### 2. Company Fee Payer Implementation

**Priority: CRITICAL**

Implement proper fee payer flow:

```typescript
// ✅ Required implementation
const transaction = new Transaction({
  recentBlockhash: blockhash,
  feePayer: companyPublicKey // Company pays fees
});

// User signs as owner
transaction.sign(userKeypair);

// Server adds company signature
transaction.sign(companyKeypair);
```

### 3. ATA Auto-Creation

**Priority: HIGH**

Ensure all USDC transfers create missing ATAs with company paying fees:

```typescript
// ✅ Required ATA creation
if (!await ataExists(toTokenAccount)) {
  transaction.add(
    createAssociatedTokenAccountInstruction(
      companyPublicKey, // Company pays ATA creation
      toTokenAccount,
      toPublicKey,
      usdcMint
    )
  );
}
```

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. Create unified wallet derivation utility
2. Replace all random keypair generation
3. Implement company fee payer for USDC transfers
4. Fix ATA creation with company fee payment

### Phase 2: Infrastructure (Week 2)
1. Create server-side transaction signing service
2. Implement partial signature handling
3. Add wallet migration script for existing users
4. Create comprehensive test suite

### Phase 3: Validation (Week 3)
1. Test devnet transfers with 0 SOL users
2. Verify mainnet compatibility
3. Validate MoonPay integration
4. Test wallet export/import parity

## Test Scenarios

### Must Pass Tests
1. **Wallet Generation**: New user gets BIP39 mnemonic → same public key on re-import
2. **Zero SOL Transfer**: User with 0 SOL can send USDC (company pays fees)
3. **ATA Creation**: Missing ATA created during transfer (company pays)
4. **MoonPay Integration**: Deposit to user's SOL address credits USDC ATA
5. **Cross-Device Recovery**: Exported mnemonic works on different device

### Test Commands
```bash
# Test wallet derivation
npm run test:wallet-derivation

# Test zero-SOL transfer
npm run test:zero-sol-transfer

# Test ATA creation
npm run test:ata-creation

# Test MoonPay webhook
npm run test:moonpay-webhook
```

## Security Recommendations

1. **Never log private keys or mnemonics**
2. **Use biometric authentication for key export**
3. **Implement rate limiting on transaction endpoints**
4. **Add transaction preview with all details**
5. **Validate all user inputs before transaction building**

## Compliance Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| BIP39 Mnemonic Generation | ❌ | Multiple random keypair violations |
| Single Source of Truth | ❌ | Inconsistent wallet creation paths |
| Export/Import Parity | ❌ | Random keypairs cannot be exported |
| User Custody | ✅ | Private keys stored client-side only |
| Company Fee Payer | ❌ | Users pay their own fees |
| USDC-Only Users | ❌ | Users need SOL for fees |
| ATA Auto-Creation | ⚠️ | Inconsistent implementation |
| MoonPay Integration | ✅ | Properly configured |
| Environment Safety | ✅ | Proper network configuration |

## Next Steps

1. **Immediate**: Fix critical wallet generation violations
2. **Priority**: Implement company fee payer system
3. **Important**: Create migration path for existing users
4. **Testing**: Comprehensive test suite for all scenarios

This audit reveals that while the foundation is solid, critical violations in wallet generation and fee payment must be addressed before production deployment.
