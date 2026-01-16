# 📁 Complete List of Blockchain Contract Files

**All files in the codebase that contain blockchain contract/program-related code**

---

## 🔑 Core Contract/Program Definition Files

### Program IDs & Token Addresses
1. `src/services/blockchain/secureTokenUtils.ts`
2. `src/config/constants/tokens.ts`
3. `src/config/network/solanaNetworkConfig.ts`
4. `src/config/unified.ts`
5. `src/config/network/chain.ts`
6. `src/services/shared/walletConstants.ts`

---

## 💸 Transaction Files (Using Contracts)

### Transaction Services
7. `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`
8. `src/services/blockchain/transaction/sendExternal.ts`
9. `src/services/blockchain/transaction/sendInternal.ts`
10. `src/services/blockchain/transaction/TransactionProcessor.ts`
11. `src/services/blockchain/transaction/transactionSigningService.ts`
12. `src/services/blockchain/transaction/UnifiedTransactionService.ts`
13. `src/services/blockchain/transaction/TransactionDeduplicationService.ts`
14. `src/services/blockchain/transaction/transactionHistoryService.ts`
15. `src/services/blockchain/transaction/PaymentRequestManager.ts`
16. `src/services/blockchain/transaction/index.ts`
17. `src/services/blockchain/transaction/types.ts`

### Transaction Handlers
18. `src/services/blockchain/transaction/handlers/FairSplitHandler.ts`
19. `src/services/blockchain/transaction/handlers/DegenSplitHandler.ts`
20. `src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts`

---

## 🔐 Wallet Files (Using Contracts)

### Wallet Services
21. `src/services/blockchain/wallet/solanaAppKitService.ts`
22. `src/services/blockchain/wallet/phantomConnectService.ts`
23. `src/services/blockchain/wallet/phantomSplitWalletService.ts`
24. `src/services/blockchain/wallet/simplifiedWalletService.ts`
25. `src/services/blockchain/wallet/walletRecoveryService.ts`
26. `src/services/blockchain/wallet/UnifiedWalletService.ts`
27. `src/services/blockchain/wallet/LinkedWalletService.ts`
28. `src/services/blockchain/wallet/walletExportService.ts`
29. `src/services/blockchain/wallet/walletValidationService.ts`
30. `src/services/blockchain/wallet/walletIntegrationHelper.ts`
31. `src/services/blockchain/wallet/balanceManagementService.ts`
32. `src/services/blockchain/wallet/walletIssueFixUtility.ts`
33. `src/services/blockchain/wallet/mockMWAService.ts`
34. `src/services/blockchain/wallet/index.ts`

### Wallet Utilities
35. `src/services/blockchain/wallet/derive.ts`
36. `src/services/blockchain/wallet/linkExternal.ts`
37. `src/services/blockchain/wallet/linking/signatureLinkService.ts`
38. `src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts`
39. `src/services/blockchain/wallet/api/solanaWalletApi.ts`
40. `src/services/blockchain/wallet/request/solanaPay.ts`
41. `src/services/blockchain/wallet/providers/registry.ts`

---

## ⚙️ Configuration & Constants

42. `src/config/constants/feeConfig.ts`
43. `src/services/shared/transactionUtils.ts`
44. `src/services/shared/balanceUtils.ts`
45. `src/services/shared/balanceCheckUtils.ts`
46. `src/services/shared/keypairUtils.ts`
47. `src/services/shared/validationUtils.ts`
48. `src/services/shared/blockhashUtils.ts`
49. `src/services/shared/memoryManager.ts`

---

## 🔗 Connection & Network

50. `src/services/blockchain/connection/connectionFactory.ts`
51. `src/services/blockchain/connection/index.ts`
52. `src/services/blockchain/network/networkValidator.ts`
53. `src/services/blockchain/network/index.ts`
54. `src/services/blockchain/index.ts`

---

## 💰 Balance Services

55. `src/services/blockchain/balance/LiveBalanceService.ts`

---

## 🔥 Backend/Firebase Functions

56. `services/firebase-functions/src/transactionSigningService.js`
57. `services/firebase-functions/src/transactionFunctions.js`
58. `services/firebase-functions/test-transaction-processing.js`
59. `services/firebase-functions/test-secrets-integration.js`
60. `services/firebase-functions/test-secrets.js`
61. `services/firebase-functions/verify-secrets.js`
62. `services/backend/services/transactionSigningService.js`

---

## 🧪 Test Files

### Unit Tests
63. `src/services/blockchain/wallet/__tests__/phantomConnectService.test.ts`
64. `src/services/blockchain/connection/__tests__/connectionFactory.test.ts`
65. `src/services/blockchain/network/__tests__/networkValidator.test.ts`
66. `src/services/blockchain/__tests__/networkIntegration.test.ts`
67. `src/config/network/__tests__/solanaNetworkConfig.test.ts`
68. `src/services/core/__tests__/solanaPay.test.ts`

### Integration Tests
69. `tools/tests/tests/tx/degen-split.test.ts`
70. `tools/tests/tests/tx/fair-split.test.ts`
71. `tools/tests/tests/tx/send1to1.test.ts`
72. `tools/tests/__tests__/deposit.spec.ts`
73. `tools/tests/__tests__/funding.spec.ts`
74. `tools/tests/__tests__/wallet.spec.ts`

### Test Utilities
75. `test-secure-tokens.js`
76. `test-token-utils.js`
77. `jest.setup.js`

---

## 🎨 UI Components (Using Contracts)

78. `src/components/wallet/MWADetectionButton.tsx`
79. `src/screens/FairSplit/FairSplitScreen.tsx`
80. `src/screens/KastAccountLinking/KastAccountLinkingScreen.tsx`

---

## 🔧 Utilities & Helpers

81. `src/utils/debug/networkConfigDiagnostic.ts`
82. `src/utils/network/sendUtils.ts`
83. `src/utils/ui/format/formatUtils.ts`

---

## 🔐 Authentication & Security

84. `src/services/auth/PhantomAuthService.ts`
85. `src/services/security/walletCloudBackupService.ts`

---

## 📦 Shared Services

86. `src/services/sharedWallet/SharedWalletCreation.ts`
87. `src/services/sharedWallet/index.ts`
88. `src/services/split/SplitValidationService.ts`
89. `src/services/core/solanaPay.ts`

---

## 📚 Type Definitions

90. `src/types/global.d.ts`

---

## 🗂️ Legacy/Unused (May Contain Contract Code)

91. `src/OLD_LEGACY/unused/ProductionWalletContext.tsx`

---

## 📊 Summary

### By Category:
- **Core Definitions:** 6 files
- **Transaction Files:** 20 files
- **Wallet Files:** 21 files
- **Configuration:** 9 files
- **Connection/Network:** 5 files
- **Backend/Firebase:** 7 files
- **Tests:** 15 files
- **UI Components:** 3 files
- **Utilities:** 3 files
- **Other Services:** 5 files

### Total: **91 files**

---

## ⭐ Most Critical Files for Audit

**Top Priority (Direct Contract Usage):**

1. `src/services/blockchain/secureTokenUtils.ts` ⭐⭐⭐
2. `src/config/constants/tokens.ts` ⭐⭐⭐
3. `src/config/network/solanaNetworkConfig.ts` ⭐⭐⭐
4. `src/services/blockchain/transaction/sendExternal.ts` ⭐⭐
5. `src/services/blockchain/transaction/sendInternal.ts` ⭐⭐
6. `src/services/blockchain/transaction/TransactionProcessor.ts` ⭐⭐
7. `src/services/blockchain/wallet/solanaAppKitService.ts` ⭐⭐
8. `services/firebase-functions/src/transactionSigningService.js` ⭐⭐
9. `src/services/blockchain/transaction/ConsolidatedTransactionService.ts` ⭐
10. `src/services/blockchain/wallet/linking/signatureLinkService.ts` ⭐

---

## 🔍 Quick Search Commands

```bash
# Find all blockchain service files
find src/services/blockchain -type f \( -name "*.ts" -o -name "*.tsx" \)

# Find contract-related files
grep -r "TOKEN_PROGRAM_ID\|ASSOCIATED_TOKEN_PROGRAM_ID\|SystemProgram" src/ services/ --include="*.ts" --include="*.js" -l

# Find USDC references
grep -r "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\|usdcMintAddress" src/ services/ --include="*.ts" --include="*.js" -l

# Find Solana Web3.js imports
grep -r "@solana/web3.js\|@solana/spl-token" src/ services/ --include="*.ts" --include="*.js" -l
```

---

**Last Updated:** January 2025  
**Total Files:** 91 files  
**Critical Files:** 10 files (marked with ⭐)
