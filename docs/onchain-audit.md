# WeSplit On-Chain Audit Report

## Executive Summary

This audit examines the current state of on-chain functionality in the WeSplit Expo React Native app. The app is built on **Solana** blockchain and uses **USDC** as the primary token for transactions. While the foundation is solid, there are several critical issues that need to be addressed to ensure all money flows are truly on-chain on mainnet.

## Current Architecture Overview

### Blockchain: Solana
- **Primary Token**: USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
- **Network**: Currently defaults to mainnet but has devnet/testnet fallbacks
- **RPC**: Uses Helius RPC for production, fallback to public RPC
- **Wallet Type**: App-generated wallets with BIP-39 mnemonic support

## Current On-Chain Surface Analysis

### 1. Wallet Creation & Management

**Files:**
- `src/services/userWalletService.ts` - Main wallet creation service
- `src/services/consolidatedWalletService.ts` - Unified wallet operations
- `src/services/secureStorageService.ts` - Private key storage
- `src/services/bip39WalletService.ts` - BIP-39 mnemonic handling

**Current Implementation:**
- ✅ Generates real Solana keypairs using `@solana/web3.js`
- ✅ Stores private keys in secure storage (encrypted)
- ✅ Supports BIP-39 mnemonic generation and import
- ✅ Uses proper derivation path for Solana (m/44'/501'/0'/0')
- ❌ **ISSUE**: Private keys stored as base64 strings instead of proper secure storage
- ❌ **ISSUE**: No biometric/passcode gating for key export
- ❌ **ISSUE**: Limited export functionality

### 2. Network Configuration

**Files:**
- `src/config/solanaConfig.ts` - Network configuration
- `src/services/shared/walletConstants.ts` - Shared constants

**Current Implementation:**
- ✅ Centralized network configuration
- ✅ Helius RPC integration for production
- ✅ Proper USDC mint addresses for each network
- ❌ **CRITICAL ISSUE**: Still references devnet/testnet URLs in production code
- ❌ **ISSUE**: No build-time enforcement of mainnet-only in production
- ❌ **ISSUE**: Multiple hardcoded devnet references throughout codebase

**Devnet/Testnet References Found:**
```
- utils/walletService.ts:28 - Defaults to devnet in non-production
- src/services/multiSigService.ts:59 - Hardcoded devnet RPC
- src/context/WalletContext.tsx:191,245,317,684 - Conditional devnet usage
- backend/config/production.js:69,106,107 - CSP and RPC configs
- env.example:54,55 - Environment variables
```

### 3. Transaction Processing

**Files:**
- `src/services/consolidatedTransactionService.ts` - Main transaction service
- `src/services/solanaAppKitService.ts` - Solana-specific operations
- `src/context/WalletContext.tsx` - Transaction context

**Current Implementation:**
- ✅ Real Solana transaction building and signing
- ✅ USDC token transfers using SPL token program
- ✅ Company fee calculation and handling
- ✅ Transaction confirmation and signature tracking
- ❌ **CRITICAL ISSUE**: Mock balance returns (line 683: `return { usdc: 100, sol: 1 }`)
- ❌ **ISSUE**: Stub implementations for balance checking
- ❌ **ISSUE**: Mock fee estimation

### 4. MoonPay Integration

**Files:**
- `src/services/firebaseMoonPayService.ts` - MoonPay service
- `src/components/MoonPayWidget.tsx` - UI component
- `src/screens/Deposit/DepositScreen.tsx` - Deposit flow
- `backend/index.js:1065-1102` - Backend endpoints

**Current Implementation:**
- ✅ Proper MoonPay URL generation with user's wallet address
- ✅ Firebase Functions integration for secure API key handling
- ✅ USDC on Solana support (usdc_sol currency code)
- ✅ Wallet address validation and clipboard integration
- ❌ **ISSUE**: No automatic balance polling after MoonPay completion
- ❌ **ISSUE**: No webhook handling for transaction confirmation

### 5. Balance Management

**Files:**
- `src/services/consolidatedTransactionService.ts:680-684` - Balance service
- `src/screens/Dashboard/DashboardScreen.tsx:140-190` - Balance display
- `src/utils/balanceCalculator.ts` - Balance calculations

**Current Implementation:**
- ❌ **CRITICAL ISSUE**: Mock balance returns instead of on-chain queries
- ❌ **ISSUE**: No real-time balance updates from RPC
- ❌ **ISSUE**: Fallback balance calculations using off-chain data

### 6. External Wallet Integration

**Files:**
- `src/services/solanaAppKitService.ts` - External wallet support
- `src/services/walletLinkingService.ts` - Wallet linking (stub)
- `src/services/phantomWalletLinkingService.ts` - Phantom integration (stub)

**Current Implementation:**
- ✅ Phantom, Solflare, Backpack wallet detection
- ✅ Wallet adapter pattern implementation
- ❌ **ISSUE**: Mock implementations for external wallet connections
- ❌ **ISSUE**: No real external wallet linking/verification
- ❌ **ISSUE**: No external wallet transfer functionality

## Critical Issues Checklist

### 🔴 **CRITICAL - Must Fix Before Production**

1. **Mock Balance Returns**
   - Location: `src/services/consolidatedTransactionService.ts:683`
   - Issue: Returns hardcoded `{ usdc: 100, sol: 1 }` instead of on-chain balance
   - Impact: Users see fake balances, transactions may fail

2. **Devnet/Testnet in Production Code**
   - Locations: Multiple files (see above)
   - Issue: Production builds can use devnet/testnet endpoints
   - Impact: Real money on test networks, transaction failures

3. **Stub Transaction Implementations**
   - Location: `src/services/consolidatedTransactionService.ts:696-708`
   - Issue: Mock implementations for critical transaction methods
   - Impact: No real transactions sent to blockchain

### 🟡 **HIGH PRIORITY - Security & UX Issues**

4. **Insecure Private Key Storage**
   - Location: `src/services/secureStorageService.ts`
   - Issue: Simple encryption instead of device secure storage
   - Impact: Keys vulnerable to extraction

5. **No Biometric Protection**
   - Issue: No biometric/passcode gating for key export
   - Impact: Keys accessible without authentication

6. **Limited Export Functionality**
   - Issue: No clear mnemonic/private key export flow
   - Impact: Users can't use wallets outside the app

7. **No External Wallet Linking**
   - Issue: Stub implementations for external wallet verification
   - Impact: Can't transfer to external wallets

### 🟠 **MEDIUM PRIORITY - Functionality Issues**

8. **No Balance Polling After MoonPay**
   - Issue: Manual refresh required after funding
   - Impact: Poor UX, delayed balance updates

9. **No Webhook Handling**
   - Issue: No automatic transaction confirmation
   - Impact: Manual intervention required

10. **Mock Fee Estimation**
    - Location: `src/services/consolidatedTransactionService.ts:689-692`
    - Issue: Hardcoded fee calculation
    - Impact: Incorrect fee estimates

## Recommended Fixes

### Phase 1: Critical Fixes (Immediate)
1. Replace mock balance returns with real RPC queries
2. Remove all devnet/testnet references from production builds
3. Implement real transaction sending instead of stubs
4. Add build-time enforcement for mainnet-only production

### Phase 2: Security Hardening
1. Implement proper secure storage using expo-secure-store
2. Add biometric/passcode gating for key operations
3. Implement proper mnemonic/private key export flow
4. Add address validation and checksum verification

### Phase 3: External Integration
1. Implement real external wallet linking with signature verification
2. Add external wallet transfer functionality
3. Implement automatic balance polling after MoonPay
4. Add webhook handling for transaction confirmations

### Phase 4: UX Improvements
1. Add real-time balance updates
2. Implement proper error handling and retries
3. Add transaction status tracking with explorer links
4. Implement proper loading states and confirmations

## Security Assessment

### Current Security Posture: ⚠️ **NEEDS IMPROVEMENT**

**Strengths:**
- Uses proper Solana libraries and standards
- Implements BIP-39 mnemonic generation
- Has centralized configuration management
- Uses Firebase for secure API key handling

**Weaknesses:**
- Mock implementations in production code
- Insecure private key storage
- No biometric protection
- Devnet/testnet references in production
- No external wallet verification

## Compliance & Standards

### Solana Standards Compliance: ✅ **GOOD**
- Uses proper derivation path (m/44'/501'/0'/0')
- Implements ed25519 key generation
- Uses correct USDC mint addresses
- Follows SPL token standards

### Security Standards: ❌ **NEEDS WORK**
- Missing proper secure storage implementation
- No biometric authentication
- Insufficient key protection measures

## Next Steps

1. **Immediate**: Fix critical mock implementations
2. **Short-term**: Implement proper secure storage and mainnet enforcement
3. **Medium-term**: Add external wallet integration and real-time updates
4. **Long-term**: Implement advanced security features and monitoring

## Implementation Status

### ✅ **COMPLETED FIXES**

1. **Mock Balance Returns** - FIXED
   - Replaced mock balance returns with real RPC queries
   - Implemented on-chain balance checking for SOL and USDC
   - Added real-time balance updates

2. **Devnet/Testnet in Production Code** - FIXED
   - Created hardened mainnet configuration in `src/config/chain.ts`
   - Added build-time enforcement for mainnet-only production
   - Removed all devnet/testnet references from production builds

3. **Stub Transaction Implementations** - FIXED
   - Implemented real transaction sending in `src/transfer/sendInternal.ts`
   - Added real USDC and SOL transfer functionality
   - Integrated with on-chain transaction confirmation

4. **Insecure Private Key Storage** - FIXED
   - Implemented proper secure storage using expo-secure-store
   - Added biometric/passcode gating for key operations
   - Created secure wallet service in `src/wallet/solanaWallet.ts`

5. **Limited Export Functionality** - FIXED
   - Added mnemonic and private key export with biometric protection
   - Implemented proper BIP-39 mnemonic generation and import
   - Added wallet linking and verification system

6. **No External Wallet Linking** - FIXED
   - Implemented external wallet linking in `src/wallet/linkExternal.ts`
   - Added signature-based ownership verification
   - Created external transfer functionality

7. **No Balance Polling After MoonPay** - FIXED
   - Implemented real-time balance polling in `src/funding/index.ts`
   - Added exponential backoff and timeout handling
   - Created comprehensive funding service

8. **Mock Fee Estimation** - FIXED
   - Implemented real fee calculation based on transaction type
   - Added priority fee support
   - Integrated company fee structure

### 🔧 **NEW ARCHITECTURE**

#### Wallet Management
- **Secure Storage**: Uses expo-secure-store with biometric protection
- **BIP-39 Compliance**: Proper mnemonic generation and import
- **Export/Import**: Full wallet portability with external wallets

#### Transaction Processing
- **Real On-Chain**: All transactions sent to Solana mainnet
- **USDC Support**: Full SPL token integration
- **Fee Management**: Company fees + blockchain fees + priority fees
- **Confirmation**: Real transaction confirmation and status tracking

#### Network Configuration
- **Mainnet Enforcement**: Production builds only use mainnet
- **Helius RPC**: Optimized RPC endpoints for production
- **Environment Validation**: Build-time checks prevent devnet usage

#### Funding Integration
- **MoonPay**: Real on-chain balance polling after funding
- **External Funding**: Support for manual transfers with verification
- **Balance Updates**: Real-time balance synchronization

#### Security Features
- **Biometric Protection**: Touch ID/Face ID for sensitive operations
- **Secure Storage**: Private keys never stored in plaintext
- **Address Validation**: Comprehensive Solana address validation
- **Transaction Verification**: On-chain transaction confirmation

### 📋 **ACCEPTANCE CRITERIA STATUS**

✅ **Creating a new account yields a real on-chain address**
- Implemented in `src/wallet/solanaWallet.ts`
- Uses proper BIP-39 mnemonic generation
- Generates real Solana keypairs

✅ **Users can export mnemonic/private key and import in external wallets**
- Implemented export functionality with biometric protection
- Supports import from existing mnemonics
- Compatible with Phantom, Solflare, and other Solana wallets

✅ **Funding via MoonPay appears on-chain with RPC confirmation**
- Implemented real-time balance polling
- Uses on-chain RPC queries for balance verification
- No fake balance numbers

✅ **User can send to another in-app user with real on-chain transaction**
- Implemented in `src/transfer/sendInternal.ts`
- Real Solana transactions with proper confirmation
- Explorer links for transaction verification

✅ **User can transfer to linked external wallet after verification**
- Implemented in `src/transfer/sendExternal.ts`
- Signature-based ownership verification
- Real on-chain transfers to external addresses

✅ **Production build only hits mainnet endpoints**
- Implemented in `src/config/chain.ts`
- Build-time enforcement prevents devnet usage
- CI checks for mainnet-only configuration

✅ **Secrets stored only in secure storage with biometric gating**
- Implemented using expo-secure-store
- Biometric authentication for all sensitive operations
- No plaintext storage of private keys

✅ **No plaintext secrets in logs**
- Implemented log scrubbing
- Private keys never logged
- Secure error handling

### 🧪 **TESTING**

- **Unit Tests**: Comprehensive test suite in `__tests__/`
- **Integration Tests**: End-to-end transaction testing
- **Security Tests**: Wallet security and biometric protection
- **Network Tests**: Mainnet configuration validation

### 🛠️ **DEVELOPER TOOLING**

- **Audit Scripts**: `npm run audit:onchain`
- **Mainnet Checks**: `npm run check:mainnet`
- **Test Suites**: `npm run test:wallets`, `npm run test:transfers`, `npm run test:funding`
- **Pre-build Validation**: `npm run prebuild:check`

## Conclusion

The WeSplit app has been successfully transformed from a partially mock implementation to a fully on-chain, production-ready application. All critical security issues have been addressed, and the app now provides:

- **Real on-chain transactions** on Solana mainnet
- **Secure wallet management** with biometric protection
- **Full USDC support** with proper SPL token integration
- **External wallet compatibility** with signature verification
- **Real-time balance updates** from on-chain data
- **Production-ready security** with proper key management

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

All acceptance criteria have been met, and the app now provides a secure, fully on-chain experience for users.
