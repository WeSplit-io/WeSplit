# 🔍 Blockchain Audit - Critical Files Index

**Quick reference for auditors to access all critical blockchain interaction code**

---

## 📋 Smart Contracts / Programs

**No custom smart contracts.** Uses Solana native programs:

| Program | Address | File Reference |
|---------|---------|---------------|
| System Program | `11111111111111111111111111111112` | Used in transaction construction |
| SPL Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | [`secureTokenUtils.ts`](../src/services/blockchain/secureTokenUtils.ts) |
| Associated Token Program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | [`secureTokenUtils.ts`](../src/services/blockchain/secureTokenUtils.ts) |
| Memo Program | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | [`TransactionProcessor.ts`](../src/services/blockchain/transaction/TransactionProcessor.ts:271) |
| Compute Budget Program | `ComputeBudget111111111111111111111111111111` | [`TransactionProcessor.ts`](../src/services/blockchain/transaction/TransactionProcessor.ts:216) |

### Token Mints
- **USDC Mainnet:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDC Devnet:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Wrapped SOL:** `So11111111111111111111111111111111111111112`

---

## 🔴 Maximum Criticality Files (Start Here)

### 1. Token Operations & Constants
- **File:** [`src/services/blockchain/secureTokenUtils.ts`](../src/services/blockchain/secureTokenUtils.ts)
- **Lines:** 1-147 (~147 lines)
- **Key Functions:**
  - `getAccount()` - Secure token account parsing
  - Exports: `TOKEN_PROGRAM_ID`, `ASSOCIATED_TOKEN_PROGRAM_ID`
  - Exports: `getAssociatedTokenAddress`, `createAssociatedTokenAccountInstruction`, `createTransferInstruction`

### 2. Token Configuration
- **File:** [`src/config/constants/tokens.ts`](../src/config/constants/tokens.ts)
- **Key Functions:**
  - `getUSDC_MINT()` - Network-aware USDC mint address
  - `getTOKEN_CONFIG()` - Token configuration

### 3. Network Configuration
- **File:** [`src/config/network/solanaNetworkConfig.ts`](../src/config/network/solanaNetworkConfig.ts)
- **File:** [`src/services/shared/walletConstants.ts`](../src/services/shared/walletConstants.ts)

---

## 🟠 High Criticality Files - Transaction Processing

### 4. Core Transaction Processor
- **File:** [`src/services/blockchain/transaction/TransactionProcessor.ts`](../src/services/blockchain/transaction/TransactionProcessor.ts)
- **Function:** `sendUSDCTransaction(params, keypair)` - **Lines 70-945** (~875 lines)
- **Key Operations:**
  - Transaction construction with company fee
  - Token account creation (recipient & company)
  - Blockhash management and expiration handling
  - Transaction signing (user keypair)
  - Firebase Function integration for company signature
  - Transaction verification on-chain
  - Retry logic with fresh blockhash

### 5. Consolidated Transaction Service
- **File:** [`src/services/blockchain/transaction/ConsolidatedTransactionService.ts`](../src/services/blockchain/transaction/ConsolidatedTransactionService.ts)
- **Function:** `sendUSDCTransaction(params)` - **Lines 110-469** (~360 lines)
- **Function:** `executeTransactionByContext(params)` - **Lines 788-843** (~55 lines)
- **Key Operations:**
  - Transaction deduplication (prevents duplicate submissions)
  - Wallet loading and keypair creation
  - Transaction routing by context (send_1to1, fair_split, degen_split, shared_wallet)
  - Post-transaction processing (save to DB, award points)
  - Payment request handling

### 6. Backend Transaction Signing (Firebase Functions)
- **File:** [`services/firebase-functions/src/transactionSigningService.js`](../services/firebase-functions/src/transactionSigningService.js)
- **Function:** `initialize()` - **Lines 82-561** (~480 lines)
- **Function:** `addCompanySignature(serializedTransaction)` - **Lines 567-616** (~50 lines)
- **Function:** `submitTransaction(serializedTransaction)` - **Lines 688-1316** (~628 lines)
- **Key Operations:**
  - Company wallet keypair creation from Firebase Secrets
  - Network detection (mainnet/devnet) with security checks
  - RPC endpoint rotation and failover
  - Transaction signing with company wallet
  - Transaction submission with retry logic
  - Blockhash validation

### 7. Client Transaction Signing
- **File:** [`src/services/blockchain/transaction/transactionSigningService.ts`](../src/services/blockchain/transaction/transactionSigningService.ts)
- **Function:** `signTransaction(serializedTransaction)` - **Lines 1-712** (~712 lines)
- **Key Operations:**
  - Firebase Function call for company signature
  - Transaction serialization/deserialization
  - Error handling and retry logic

---

## 🟡 Moderate Criticality - Transaction Handlers

### 8. Fair Split Handler
- **File:** [`src/services/blockchain/transaction/handlers/FairSplitHandler.ts`](../src/services/blockchain/transaction/handlers/FairSplitHandler.ts)
- **Function:** `handleFairSplitContribution()` - **~242 lines**
- **Purpose:** Handles fair split payment contributions

### 9. Fair Split Withdrawal Handler
- **File:** [`src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts`](../src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts)
- **Function:** `handleFairSplitWithdrawal()` - **Lines 90-491** (~401 lines)
- **Purpose:** Handles fair split withdrawals to user wallets

### 10. Degen Split Handler
- **File:** [`src/services/blockchain/transaction/handlers/DegenSplitHandler.ts`](../src/services/blockchain/transaction/handlers/DegenSplitHandler.ts)
- **Function:** `handleDegenSplitLock()` - **~226 lines**
- **Purpose:** Handles degen split payment locking

---

## 📊 Summary

**Total Critical Code:** ~3,617 lines across 10 core files/functions

**Audit Focus Areas:**
1. Transaction construction and instruction ordering
2. Key management and signing process
3. Blockhash expiration handling
4. Transaction deduplication
5. Input validation (addresses, amounts)
6. Company wallet security (Firebase Functions)
7. Token account creation logic
8. Fee calculation and collection

---

## 🔗 Related Documentation

- **Main Audit Guide:** [`../../SECURITY_CHECK.md`](../../SECURITY_CHECK.md)
- **Security Overview:** [`../../SECURITY.md`](../../SECURITY.md)
- **Complete File List:** See `docs/meetings/security-audit/CONTRACT_FILES_SYNTHESIZED.md`
