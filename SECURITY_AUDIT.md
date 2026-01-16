# 🔒 Security Audit Guide

**Quick reference for security auditors reviewing WeSplit's blockchain integration**

---

## 📋 Quick Overview

**WeSplit** is a decentralized social payment app built on Solana that enables friends, groups, and DAOs to split expenses using cryptocurrency.

### ⚠️ Important: No Custom Smart Contracts

**WeSplit does NOT deploy custom smart contracts.** The application:
- Uses Solana's native system programs (immutable, trustless)
- Interacts with standard SPL token programs (audited by Solana Foundation)
- Implements business logic in Firebase Functions (off-chain)
- Handles wallet operations client-side with secure key management

**This is a client-side application that interacts with existing, audited Solana programs.**

---

## 🎯 Audit Scope

### Critical Areas to Review

1. **Transaction Construction & Signing** - How transactions are built and signed
2. **Wallet Key Management** - Secure storage and handling of private keys
3. **Split Wallet Security** - Multi-signature wallet operations
4. **Token Transfer Logic** - USDC transfer implementation
5. **Backend Security** - Firebase Functions transaction signing
6. **Input Validation** - User input sanitization and validation
7. **Replay Attack Prevention** - Transaction deduplication
8. **Network Security** - RPC endpoint security and validation

---

## 🔑 Critical Addresses & Contracts

### Solana System Programs

| Program | Address | Purpose |
|---------|---------|---------|
| **System Program** | `11111111111111111111111111111112` | Account creation, SOL transfers |
| **SPL Token Program** | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | Token operations |
| **Associated Token Program** | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | Token account creation |
| **Memo Program** | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | Transaction memos |
| **Compute Budget Program** | `ComputeBudget111111111111111111111111111111` | Transaction fees |

### Token Mints

| Token | Network | Address |
|-------|---------|---------|
| **USDC** | Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **USDC** | Devnet | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **Wrapped SOL** | All | `So11111111111111111111111111111111111111112` |

### Integration Wallets

| Wallet | Network | Address |
|--------|---------|---------|
| **SPEND Treasury** | Mainnet | `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp` |

**Complete address list:** See [`docs/meetings/security-audit/CONTRACTS_AND_PROGRAMS.md`](./docs/meetings/security-audit/CONTRACTS_AND_PROGRAMS.md)

---

## 📁 Critical Files for Audit

### 🔴 Maximum Criticality (5/5) - Start Here

**Core Contract Definitions:**
1. [`src/services/blockchain/secureTokenUtils.ts`](./src/services/blockchain/secureTokenUtils.ts)
   - TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
   - Secure token operations and account parsing

2. [`src/config/constants/tokens.ts`](./src/config/constants/tokens.ts)
   - USDC mint addresses (mainnet/devnet)
   - Token configuration

3. [`src/config/network/solanaNetworkConfig.ts`](./src/config/network/solanaNetworkConfig.ts)
   - Network-specific USDC addresses
   - RPC endpoint configuration

4. [`src/config/unified.ts`](./src/config/unified.ts)
   - Unified configuration with USDC addresses

5. [`src/config/network/chain.ts`](./src/config/network/chain.ts)
   - Chain configuration with addresses

6. [`src/services/shared/walletConstants.ts`](./src/services/shared/walletConstants.ts)
   - Wallet constants and RPC/USDC config

### 🟠 High Criticality (4/5) - Transaction & Wallet Security

**Transaction Services:**
- [`src/services/blockchain/transaction/ConsolidatedTransactionService.ts`](./src/services/blockchain/transaction/ConsolidatedTransactionService.ts)
- [`src/services/blockchain/transaction/sendExternal.ts`](./src/services/blockchain/transaction/sendExternal.ts)
- [`src/services/blockchain/transaction/sendInternal.ts`](./src/services/blockchain/transaction/sendInternal.ts)
- [`src/services/blockchain/transaction/TransactionProcessor.ts`](./src/services/blockchain/transaction/TransactionProcessor.ts)
- [`src/services/blockchain/transaction/transactionSigningService.ts`](./src/services/blockchain/transaction/transactionSigningService.ts)

**Wallet Services:**
- [`src/services/blockchain/wallet/solanaAppKitService.ts`](./src/services/blockchain/wallet/solanaAppKitService.ts)
- [`src/services/blockchain/wallet/phantomConnectService.ts`](./src/services/blockchain/wallet/phantomConnectService.ts)
- [`src/services/blockchain/wallet/phantomSplitWalletService.ts`](./src/services/blockchain/wallet/phantomSplitWalletService.ts)

**Split Wallet Security:**
- [`src/services/splitWallet/splitWalletService.ts`](./src/services/splitWallet/splitWalletService.ts)
- [`src/services/splitWallet/splitWalletEncryption.ts`](./src/services/splitWallet/splitWalletEncryption.ts)
- [`src/services/splitWallet/splitWalletRecovery.ts`](./src/services/splitWallet/splitWalletRecovery.ts)

### 🟡 Moderate Criticality (3/5) - Transaction Handlers

**Transaction Handlers:**
- [`src/services/blockchain/transaction/handlers/FairSplitHandler.ts`](./src/services/blockchain/transaction/handlers/FairSplitHandler.ts)
- [`src/services/blockchain/transaction/handlers/DegenSplitHandler.ts`](./src/services/blockchain/transaction/handlers/DegenSplitHandler.ts)
- [`src/services/split/handlers/TransferHandlers.ts`](./src/services/split/handlers/TransferHandlers.ts)
- [`src/services/split/handlers/ParticipantPaymentHandlers.ts`](./src/services/split/handlers/ParticipantPaymentHandlers.ts)

**Complete file list:** See [`docs/meetings/security-audit/CONTRACT_FILES_SYNTHESIZED.md`](./docs/meetings/security-audit/CONTRACT_FILES_SYNTHESIZED.md)

---

## 🏗️ Security Architecture

### Client-Side (React Native)

**Key Management:**
- Private keys stored in device Keychain/SecureStore (iOS/Android)
- Split wallet keys encrypted with AES-256-CBC + HMAC
- Biometric authentication for wallet access

**Transaction Flow:**
1. User initiates transaction in app
2. Transaction constructed using Solana Web3.js
3. Transaction signed with user's private key (client-side)
4. Transaction sent to Solana network via RPC

### Backend (Firebase Functions)

**Company Wallet Operations:**
- Company wallet private key stored in Firebase Functions secrets
- Used for fee collection and treasury operations
- All operations require authentication

**Transaction Signing:**
- [`services/firebase-functions/src/transactionSigningService.js`](./services/firebase-functions/src/transactionSigningService.js)
- Secure key retrieval from Firebase secrets
- Transaction signing for company operations

---

## 🔍 Key Security Features

### ✅ Implemented Security Measures

1. **Secure Token Operations**
   - Hybrid approach: safe @solana/spl-token functions + secure custom parsing
   - No vulnerable bigint operations
   - Proper account validation

2. **Transaction Security**
   - Blockhash validation and expiration
   - Transaction deduplication service
   - Replay attack prevention
   - Compute budget optimization

3. **Wallet Security**
   - AES-256-GCM encryption for secure vault
   - AES-256-CBC + HMAC for split wallet keys
   - Key derivation from user password
   - Secure key storage (Keychain/SecureStore)

4. **Input Validation**
   - Address validation
   - Amount validation
   - Transaction size limits
   - Sanitization of user inputs

5. **Network Security**
   - RPC endpoint validation
   - HTTPS-only communications
   - Rate limiting on backend
   - CORS protection

---

## 🚨 Known Security Considerations

### Production Vulnerabilities
- **Status**: ✅ MITIGATED
- **Details**: See [`SECURITY.md`](./SECURITY.md)

### Areas Requiring Special Attention

1. **Transaction Replay Attacks**
   - Review: [`src/services/blockchain/transaction/TransactionDeduplicationService.ts`](./src/services/blockchain/transaction/TransactionDeduplicationService.ts)
   - Check: Blockhash expiration handling

2. **Private Key Exposure**
   - Review: All wallet service files
   - Check: Key storage, encryption, and memory handling

3. **Transaction Construction**
   - Review: All transaction service files
   - Check: Instruction ordering, account validation, amount validation

4. **Backend Transaction Signing**
   - Review: [`services/firebase-functions/src/transactionSigningService.js`](./services/firebase-functions/src/transactionSigningService.js)
   - Check: Secret management, key retrieval, signing process

5. **Split Wallet Operations**
   - Review: All split wallet service files
   - Check: Multi-signature logic, key derivation, encryption

---

## 📚 Additional Documentation

### Detailed Contract Information
- **Complete Contracts List**: [`docs/meetings/security-audit/CONTRACTS_AND_PROGRAMS.md`](./docs/meetings/security-audit/CONTRACTS_AND_PROGRAMS.md)
- **All Contract Files**: [`docs/meetings/security-audit/CONTRACT_FILES_SYNTHESIZED.md`](./docs/meetings/security-audit/CONTRACT_FILES_SYNTHESIZED.md)
- **Complete File Audit**: [`docs/meetings/security-audit/COMPLETE_CONTRACT_FILES_AUDIT.md`](./docs/meetings/security-audit/COMPLETE_CONTRACT_FILES_AUDIT.md)

### Security Documentation
- **Security Overview**: [`SECURITY.md`](./SECURITY.md)
- **Security Status**: Current vulnerabilities and mitigations

### Project Information
- **Project Overview**: [`README.md`](./README.md)
- **Audit Preparation**: [`docs/meetings/security-audit/`](./docs/meetings/security-audit/)

---

## 🛠️ Getting Started with Audit

### Step 1: Understand the Architecture
1. Read this document
2. Review [`SECURITY.md`](./SECURITY.md)
3. Understand that WeSplit uses existing Solana programs (no custom contracts)

### Step 2: Review Critical Files
1. Start with **Maximum Criticality (5/5)** files
2. Review **High Criticality (4/5)** transaction and wallet files
3. Examine transaction handlers and split wallet operations

### Step 3: Test Key Scenarios
1. **Transaction Construction**: Verify all instructions are correct
2. **Key Management**: Verify keys are never exposed
3. **Transaction Signing**: Verify signatures are valid
4. **Replay Prevention**: Verify deduplication works
5. **Input Validation**: Verify all inputs are validated

### Step 4: Review Backend Security
1. Firebase Functions transaction signing
2. Secret management
3. Authentication and authorization
4. Rate limiting and CORS

---

## 📞 Contact

**Security Team:**
- Email: `vcharles@wesplit.com`
- Security Issues: See [`SECURITY.md`](./SECURITY.md)

---

## 📝 Audit Checklist

### Transaction Security
- [ ] Transaction construction is correct
- [ ] All instructions are properly ordered
- [ ] Account validation is performed
- [ ] Amount validation prevents overflow
- [ ] Blockhash expiration is handled
- [ ] Replay attacks are prevented

### Wallet Security
- [ ] Private keys are never logged
- [ ] Keys are stored securely (Keychain/SecureStore)
- [ ] Encryption is properly implemented
- [ ] Key derivation is secure
- [ ] Memory is cleared after use

### Backend Security
- [ ] Secrets are properly managed
- [ ] Authentication is required
- [ ] Rate limiting is implemented
- [ ] CORS is properly configured
- [ ] Input validation is performed

### Network Security
- [ ] RPC endpoints are validated
- [ ] HTTPS is enforced
- [ ] Network errors are handled
- [ ] Timeout handling is implemented

---

**Last Updated:** December 2024  
**Version:** 1.0
