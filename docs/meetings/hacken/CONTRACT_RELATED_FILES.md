# 📁 Contract-Related Files

**Complete list of files that reference Solana programs, contracts, and addresses**

---

## 🔑 Core Contract/Program Files

### Primary Contract Definitions

1. **`src/services/blockchain/secureTokenUtils.ts`**
   - **Purpose:** Defines TOKEN_PROGRAM_ID and ASSOCIATED_TOKEN_PROGRAM_ID
   - **Exports:** Program IDs, token utility functions
   - **Key Exports:**
     - `TOKEN_PROGRAM_ID`
     - `ASSOCIATED_TOKEN_PROGRAM_ID`
     - `getAssociatedTokenAddress()`
     - `createAssociatedTokenAccountInstruction()`
     - `createTransferInstruction()`
     - `getAccount()` (secure implementation)

2. **`src/config/constants/tokens.ts`**
   - **Purpose:** USDC mint address definitions
   - **Key Constants:**
     - `MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'`
     - `DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'`
     - `getUSDC_MINT()` function
     - `USDC_MINT` proxy

3. **`src/config/network/solanaNetworkConfig.ts`**
   - **Purpose:** Network-specific USDC mint addresses
   - **Key Config:**
     - Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
     - Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
     - Network configuration

4. **`src/config/unified.ts`**
   - **Purpose:** Unified configuration including USDC mint addresses
   - **References:** USDC mint addresses per network

5. **`src/config/network/chain.ts`**
   - **Purpose:** Chain configuration with USDC addresses
   - **References:** USDC mint addresses

---

## 💸 Transaction Files (Using Programs)

### Transaction Construction

6. **`src/services/blockchain/transaction/sendExternal.ts`**
   - **Uses:** TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SystemProgram, ComputeBudgetProgram
   - **Uses:** Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
   - **Purpose:** External wallet transfers

7. **`src/services/blockchain/transaction/sendInternal.ts`**
   - **Uses:** TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SystemProgram, ComputeBudgetProgram
   - **Uses:** Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
   - **Purpose:** Internal user-to-user transfers

8. **`src/services/blockchain/transaction/TransactionProcessor.ts`**
   - **Uses:** TOKEN_PROGRAM_ID, ComputeBudgetProgram
   - **Uses:** Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
   - **Purpose:** Transaction processing and validation

9. **`src/services/blockchain/transaction/ConsolidatedTransactionService.ts`**
   - **Uses:** Transaction signing service (references programs indirectly)
   - **Purpose:** Unified transaction service

---

## 🔐 Wallet & Authentication Files

10. **`src/services/blockchain/wallet/solanaAppKitService.ts`**
    - **Uses:** SystemProgram, TOKEN_PROGRAM_ID
    - **Uses:** Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
    - **Purpose:** Wallet operations and Solana App Kit integration

11. **`src/services/blockchain/wallet/phantomConnectService.ts`**
    - **Uses:** SystemProgram, TOKEN_PROGRAM_ID
    - **Purpose:** Phantom wallet connection

12. **`src/services/blockchain/wallet/phantomSplitWalletService.ts`**
    - **Uses:** SystemProgram, TOKEN_PROGRAM_ID
    - **Purpose:** Split wallet operations with Phantom

13. **`src/services/blockchain/wallet/linking/signatureLinkService.ts`**
    - **Uses:** Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
    - **Purpose:** Wallet linking via signatures

14. **`src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts`**
    - **Uses:** SystemProgram
    - **Purpose:** Mobile Wallet Adapter discovery

15. **`src/services/auth/PhantomAuthService.ts`**
    - **Uses:** System Program address (`11111111111111111111111111111112`)
    - **Purpose:** Phantom authentication

---

## ⚙️ Configuration Files

16. **`src/config/constants/feeConfig.ts`**
    - **References:** Company wallet (via Firebase Functions)
    - **Purpose:** Fee configuration

17. **`src/services/shared/walletConstants.ts`**
    - **Purpose:** Shared wallet constants
    - **References:** RPC config, USDC config

18. **`app.config.js`**
    - **Purpose:** Expo app configuration
    - **References:** Environment variables for contracts

---

## 🧪 Test Files

19. **`src/config/network/__tests__/solanaNetworkConfig.test.ts`**
    - **Tests:** Network configuration including USDC addresses

20. **`src/services/core/__tests__/solanaPay.test.ts`**
    - **Tests:** Solana payment functionality

21. **`test-secure-tokens.js`**
    - **Tests:** Secure token utilities
    - **Uses:** USDC mint address for testing

22. **`test-token-utils.js`**
    - **Tests:** Token utility functions
    - **Uses:** USDC mint address for testing

---

## 🔧 Utility & Debug Files

23. **`src/utils/debug/networkConfigDiagnostic.ts`**
    - **Purpose:** Network configuration diagnostics
    - **References:** Contract addresses

24. **`src/components/wallet/MWADetectionButton.tsx`**
    - **Uses:** SystemProgram
    - **Purpose:** Mobile Wallet Adapter detection

---

## 🔥 Backend/Firebase Files

25. **`services/firebase-functions/src/transactionSigningService.js`**
    - **Purpose:** Transaction signing with company wallet
    - **Uses:** Company wallet (stored in Firebase secrets)
    - **Note:** Backend service, not directly using program IDs

26. **`services/firebase-functions/test-transaction-processing.js`**
    - **Purpose:** Transaction processing tests
    - **References:** Contract-related functionality

---

## 📚 Documentation Files

27. **`docs/SOLANA_CONTRACT_ADDRESSES.md`**
    - **Purpose:** Complete documentation of all contract addresses
    - **Contains:** All program IDs, token addresses, wallet addresses

28. **`docs/meetings/hacken/CONTRACTS_AND_PROGRAMS.md`**
    - **Purpose:** Contracts summary for Hacken audit
    - **Contains:** Security implications and audit focus areas

---

## 📊 Summary by Category

### Core Definitions (5 files)
- `src/services/blockchain/secureTokenUtils.ts` ⭐
- `src/config/constants/tokens.ts` ⭐
- `src/config/network/solanaNetworkConfig.ts` ⭐
- `src/config/unified.ts`
- `src/config/network/chain.ts`

### Transaction Files (4 files)
- `src/services/blockchain/transaction/sendExternal.ts` ⭐
- `src/services/blockchain/transaction/sendInternal.ts` ⭐
- `src/services/blockchain/transaction/TransactionProcessor.ts` ⭐
- `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`

### Wallet Files (6 files)
- `src/services/blockchain/wallet/solanaAppKitService.ts` ⭐
- `src/services/blockchain/wallet/phantomConnectService.ts`
- `src/services/blockchain/wallet/phantomSplitWalletService.ts`
- `src/services/blockchain/wallet/linking/signatureLinkService.ts`
- `src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts`
- `src/services/auth/PhantomAuthService.ts`

### Configuration (3 files)
- `src/config/constants/feeConfig.ts`
- `src/services/shared/walletConstants.ts`
- `app.config.js`

### Tests (4 files)
- `src/config/network/__tests__/solanaNetworkConfig.test.ts`
- `src/services/core/__tests__/solanaPay.test.ts`
- `test-secure-tokens.js`
- `test-token-utils.js`

### Utilities (2 files)
- `src/utils/debug/networkConfigDiagnostic.ts`
- `src/components/wallet/MWADetectionButton.tsx`

### Backend (2 files)
- `services/firebase-functions/src/transactionSigningService.js` ⭐
- `services/firebase-functions/test-transaction-processing.js`

### Documentation (2 files)
- `docs/SOLANA_CONTRACT_ADDRESSES.md`
- `docs/meetings/hacken/CONTRACTS_AND_PROGRAMS.md`

---

## ⭐ Critical Files for Audit

**Most Important Files (marked with ⭐):**

1. **`src/services/blockchain/secureTokenUtils.ts`** - Program ID definitions
2. **`src/config/constants/tokens.ts`** - USDC mint addresses
3. **`src/config/network/solanaNetworkConfig.ts`** - Network-specific addresses
4. **`src/services/blockchain/transaction/sendExternal.ts`** - External transfers
5. **`src/services/blockchain/transaction/sendInternal.ts`** - Internal transfers
6. **`src/services/blockchain/transaction/TransactionProcessor.ts`** - Transaction processing
7. **`src/services/blockchain/wallet/solanaAppKitService.ts`** - Wallet operations
8. **`services/firebase-functions/src/transactionSigningService.js`** - Backend signing

---

## 🔍 Quick Search Commands

To find all contract references:

```bash
# Find TOKEN_PROGRAM_ID references
grep -r "TOKEN_PROGRAM_ID" src/ services/

# Find USDC mint addresses
grep -r "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" src/ services/

# Find Memo Program
grep -r "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr" src/ services/

# Find SystemProgram
grep -r "SystemProgram" src/ services/

# Find ComputeBudgetProgram
grep -r "ComputeBudgetProgram" src/ services/
```

---

**Total Files:** 28 files  
**Critical Files:** 8 files (marked with ⭐)  
**Last Updated:** January 2025
