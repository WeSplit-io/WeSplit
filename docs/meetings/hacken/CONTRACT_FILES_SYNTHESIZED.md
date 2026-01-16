# 📋 Contract & Blockchain Files - Synthesized List

**Only files with direct contract/program usage and blockchain service files**

---

## 🔑 Core Contract Definition Files (6 files)

**Files that define or directly reference Solana program IDs and contract addresses.**

1. `src/services/blockchain/secureTokenUtils.ts` - **Critical: 5/5**
   - TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
   - Secure token operations

2. `src/config/constants/tokens.ts` - **Critical: 5/5**
   - USDC mint addresses (mainnet/devnet)
   - Token configuration

3. `src/config/network/solanaNetworkConfig.ts` - **Critical: 5/5**
   - Network-specific USDC addresses
   - RPC configuration

4. `src/config/unified.ts` - **Critical: 5/5**
   - Unified config with USDC addresses
   - Blockchain configuration

5. `src/config/network/chain.ts` - **Critical: 5/5**
   - Chain configuration with addresses
   - Network setup

6. `src/services/shared/walletConstants.ts` - **Critical: 5/5**
   - Wallet constants
   - RPC/USDC config

---

## 💸 Transaction Files - Direct Contract Usage (17 files)

**Files that directly construct transactions using Solana programs.**

### Core Transaction Services
7. `src/services/blockchain/transaction/ConsolidatedTransactionService.ts` - **Critical: 4/5**
8. `src/services/blockchain/transaction/sendExternal.ts` - **Critical: 4/5**
9. `src/services/blockchain/transaction/sendInternal.ts` - **Critical: 4/5**
10. `src/services/blockchain/transaction/TransactionProcessor.ts` - **Critical: 4/5**
11. `src/services/blockchain/transaction/transactionSigningService.ts` - **Critical: 4/5**
12. `src/services/blockchain/transaction/UnifiedTransactionService.ts` - **Critical: 3/5**
13. `src/services/blockchain/transaction/TransactionDeduplicationService.ts` - **Critical: 3/5**
14. `src/services/blockchain/transaction/transactionHistoryService.ts` - **Critical: 3/5**
15. `src/services/blockchain/transaction/PaymentRequestManager.ts` - **Critical: 3/5**
16. `src/services/blockchain/transaction/index.ts` - **Critical: 2/5**
17. `src/services/blockchain/transaction/types.ts` - **Critical: 2/5**

### Transaction Handlers
18. `src/services/blockchain/transaction/handlers/FairSplitHandler.ts` - **Critical: 3/5**
19. `src/services/blockchain/transaction/handlers/DegenSplitHandler.ts` - **Critical: 3/5**
20. `src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts` - **Critical: 3/5**

### Split Transaction Handlers
21. `src/services/split/handlers/FairSplitWithdrawalHandler.ts` - **Critical: 3/5**
22. `src/services/split/handlers/TransferHandlers.ts` - **Critical: 3/5**
23. `src/services/split/handlers/SharedPaymentHelpers.ts` - **Critical: 3/5**
24. `src/services/split/handlers/ParticipantPaymentHandlers.ts` - **Critical: 3/5**
25. `src/services/split/handlers/DegenWinnerPayoutHandler.ts` - **Critical: 3/5**
26. `src/services/split/handlers/DegenLoserPaymentHandler.ts` - **Critical: 3/5**
27. `src/services/split/handlers/WalletAccessHandlers.ts` - **Critical: 3/5**

---

## 🔐 Wallet Files - Direct Contract Usage (25 files)

**Files that directly interact with Solana wallets and use program IDs.**

### Core Wallet Services
28. `src/services/blockchain/wallet/solanaAppKitService.ts` - **Critical: 4/5**
29. `src/services/blockchain/wallet/phantomConnectService.ts` - **Critical: 4/5**
30. `src/services/blockchain/wallet/phantomSplitWalletService.ts` - **Critical: 4/5**
31. `src/services/blockchain/wallet/simplifiedWalletService.ts` - **Critical: 3/5**
32. `src/services/blockchain/wallet/walletRecoveryService.ts` - **Critical: 3/5**
33. `src/services/blockchain/wallet/UnifiedWalletService.ts` - **Critical: 3/5**
34. `src/services/blockchain/wallet/LinkedWalletService.ts` - **Critical: 3/5**
35. `src/services/blockchain/wallet/walletExportService.ts` - **Critical: 2/5**
36. `src/services/blockchain/wallet/walletValidationService.ts` - **Critical: 2/5**
37. `src/services/blockchain/wallet/walletIntegrationHelper.ts` - **Critical: 2/5**
38. `src/services/blockchain/wallet/balanceManagementService.ts` - **Critical: 2/5**
39. `src/services/blockchain/wallet/walletIssueFixUtility.ts` - **Critical: 1/5**
40. `src/services/blockchain/wallet/mockMWAService.ts` - **Critical: 1/5**
41. `src/services/blockchain/wallet/index.ts` - **Critical: 1/5**

### Wallet Utilities
42. `src/services/blockchain/wallet/derive.ts` - **Critical: 3/5**
43. `src/services/blockchain/wallet/linkExternal.ts` - **Critical: 3/5**
44. `src/services/blockchain/wallet/linking/signatureLinkService.ts` - **Critical: 3/5**
45. `src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts` - **Critical: 3/5**
46. `src/services/blockchain/wallet/api/solanaWalletApi.ts` - **Critical: 2/5**
47. `src/services/blockchain/wallet/request/solanaPay.ts` - **Critical: 2/5**
48. `src/services/blockchain/wallet/providers/registry.ts` - **Critical: 2/5**

### Split Wallet Services (Direct Contract Usage)
49. `src/services/split/SplitWalletSecurity.ts` - **Critical: 4/5**
50. `src/services/split/SplitWalletPayments.ts` - **Critical: 4/5**
51. `src/services/split/SplitWalletCreation.ts` - **Critical: 3/5**
52. `src/services/split/SplitWalletManagement.ts` - **Critical: 3/5**
53. `src/services/split/SplitWalletQueries.ts` - **Critical: 3/5**

---

## 🔗 Connection & Network (5 files)

**Files that manage Solana network connections.**

54. `src/services/blockchain/connection/connectionFactory.ts` - **Critical: 2/5**
55. `src/services/blockchain/connection/index.ts` - **Critical: 1/5**
56. `src/services/blockchain/network/networkValidator.ts` - **Critical: 2/5**
57. `src/services/blockchain/network/index.ts` - **Critical: 1/5**
58. `src/services/blockchain/index.ts` - **Critical: 1/5**

---

## 💰 Balance Services (1 file)

59. `src/services/blockchain/balance/LiveBalanceService.ts` - **Critical: 2/5**

---

## 🔥 Backend/Firebase Functions (3 files)

**Backend services that handle transaction signing and validation.**

60. `services/firebase-functions/src/transactionSigningService.js` - **Critical: 4/5**
61. `services/firebase-functions/src/transactionFunctions.js` - **Critical: 4/5**
62. `services/backend/services/transactionSigningService.js` - **Critical: 3/5**

---

## ⚙️ Shared Services (Direct Contract Usage) (8 files)

**Shared services that directly use contracts.**

63. `src/services/shared/transactionUtils.ts` - **Critical: 3/5**
64. `src/services/shared/balanceUtils.ts` - **Critical: 2/5**
65. `src/services/shared/balanceCheckUtils.ts` - **Critical: 2/5**
66. `src/services/shared/keypairUtils.ts` - **Critical: 3/5**
67. `src/services/shared/validationUtils.ts` - **Critical: 2/5**
68. `src/services/shared/blockhashUtils.ts` - **Critical: 2/5**
69. `src/services/sharedWallet/SharedWalletCreation.ts` - **Critical: 3/5**
70. `src/services/core/solanaPay.ts` - **Critical: 2/5**

---

## 🔐 Authentication (1 file)

71. `src/services/auth/PhantomAuthService.ts` - **Critical: 4/5**

---

## 📊 Summary

### Total Files: **71 files**

### Criticality Score Guide:
- **5/5** - Maximum criticality: Core contract definitions, program IDs, token addresses
- **4/5** - High criticality: Transaction signing, wallet operations, split wallet security
- **3/5** - Moderate criticality: Transaction handlers, wallet utilities, split wallet management
- **2/5** - Low criticality: Supporting services, utilities, index files
- **1/5** - Minimal criticality: Mock services, test utilities, legacy code

### By Category:
- **Core Definitions:** 6 files
- **Transaction Files:** 27 files
- **Wallet Files:** 25 files
- **Connection/Network:** 5 files
- **Balance:** 1 file
- **Backend:** 3 files
- **Shared Services:** 8 files
- **Authentication:** 1 file

### Critical Files (Top 15):
1. `src/services/blockchain/secureTokenUtils.ts` - **Critical: 5/5**
2. `src/config/constants/tokens.ts` - **Critical: 5/5**
3. `src/config/network/solanaNetworkConfig.ts` - **Critical: 5/5**
4. `src/config/unified.ts` - **Critical: 5/5**
5. `src/config/network/chain.ts` - **Critical: 5/5**
6. `src/services/blockchain/transaction/sendExternal.ts` - **Critical: 4/5**
7. `src/services/blockchain/transaction/sendInternal.ts` - **Critical: 4/5**
8. `src/services/blockchain/transaction/TransactionProcessor.ts` - **Critical: 4/5**
9. `src/services/blockchain/wallet/solanaAppKitService.ts` - **Critical: 4/5**
10. `services/firebase-functions/src/transactionSigningService.js` - **Critical: 4/5**
11. `src/services/split/SplitWalletSecurity.ts` - **Critical: 4/5**
12. `src/services/split/SplitWalletPayments.ts` - **Critical: 4/5**
13. `src/services/auth/PhantomAuthService.ts` - **Critical: 4/5**
14. `services/firebase-functions/src/transactionFunctions.js` - **Critical: 4/5**
15. `src/services/blockchain/wallet/phantomConnectService.ts` - **Critical: 4/5**

---

## 📋 Quick File List (One Column)

```
src/services/blockchain/secureTokenUtils.ts
src/config/constants/tokens.ts
src/config/network/solanaNetworkConfig.ts
src/config/unified.ts
src/config/network/chain.ts
src/services/shared/walletConstants.ts
src/services/blockchain/transaction/ConsolidatedTransactionService.ts
src/services/blockchain/transaction/sendExternal.ts
src/services/blockchain/transaction/sendInternal.ts
src/services/blockchain/transaction/TransactionProcessor.ts
src/services/blockchain/transaction/transactionSigningService.ts
src/services/blockchain/transaction/UnifiedTransactionService.ts
src/services/blockchain/transaction/TransactionDeduplicationService.ts
src/services/blockchain/transaction/transactionHistoryService.ts
src/services/blockchain/transaction/PaymentRequestManager.ts
src/services/blockchain/transaction/index.ts
src/services/blockchain/transaction/types.ts
src/services/blockchain/transaction/handlers/FairSplitHandler.ts
src/services/blockchain/transaction/handlers/DegenSplitHandler.ts
src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts
src/services/split/handlers/FairSplitWithdrawalHandler.ts
src/services/split/handlers/TransferHandlers.ts
src/services/split/handlers/SharedPaymentHelpers.ts
src/services/split/handlers/ParticipantPaymentHandlers.ts
src/services/split/handlers/DegenWinnerPayoutHandler.ts
src/services/split/handlers/DegenLoserPaymentHandler.ts
src/services/split/handlers/WalletAccessHandlers.ts
src/services/blockchain/wallet/solanaAppKitService.ts
src/services/blockchain/wallet/phantomConnectService.ts
src/services/blockchain/wallet/phantomSplitWalletService.ts
src/services/blockchain/wallet/simplifiedWalletService.ts
src/services/blockchain/wallet/walletRecoveryService.ts
src/services/blockchain/wallet/UnifiedWalletService.ts
src/services/blockchain/wallet/LinkedWalletService.ts
src/services/blockchain/wallet/walletExportService.ts
src/services/blockchain/wallet/walletValidationService.ts
src/services/blockchain/wallet/walletIntegrationHelper.ts
src/services/blockchain/wallet/balanceManagementService.ts
src/services/blockchain/wallet/walletIssueFixUtility.ts
src/services/blockchain/wallet/mockMWAService.ts
src/services/blockchain/wallet/index.ts
src/services/blockchain/wallet/derive.ts
src/services/blockchain/wallet/linkExternal.ts
src/services/blockchain/wallet/linking/signatureLinkService.ts
src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts
src/services/blockchain/wallet/api/solanaWalletApi.ts
src/services/blockchain/wallet/request/solanaPay.ts
src/services/blockchain/wallet/providers/registry.ts
src/services/split/SplitWalletSecurity.ts
src/services/split/SplitWalletPayments.ts
src/services/split/SplitWalletCreation.ts
src/services/split/SplitWalletManagement.ts
src/services/split/SplitWalletQueries.ts
src/services/blockchain/connection/connectionFactory.ts
src/services/blockchain/connection/index.ts
src/services/blockchain/network/networkValidator.ts
src/services/blockchain/network/index.ts
src/services/blockchain/index.ts
src/services/blockchain/balance/LiveBalanceService.ts
services/firebase-functions/src/transactionSigningService.js
services/firebase-functions/src/transactionFunctions.js
services/backend/services/transactionSigningService.js
src/services/shared/transactionUtils.ts
src/services/shared/balanceUtils.ts
src/services/shared/balanceCheckUtils.ts
src/services/shared/keypairUtils.ts
src/services/shared/validationUtils.ts
src/services/shared/blockhashUtils.ts
src/services/sharedWallet/SharedWalletCreation.ts
src/services/core/solanaPay.ts
src/services/auth/PhantomAuthService.ts
```

---

**Total:** 71 files with direct contract/blockchain usage  
**Last Updated:** January 2025
