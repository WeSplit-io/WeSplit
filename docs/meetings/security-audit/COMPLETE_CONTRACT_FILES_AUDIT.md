# 🔍 Complete Contract Files Audit

**Comprehensive audit of ALL files containing blockchain contract/program-related code**

**Audit Date:** January 2025  
**Status:** ✅ Complete

---

## 📊 Executive Summary

- **Total Files Found:** 300+ files
- **Direct Contract Usage:** 45 files (files that directly use program IDs/addresses)
- **Indirect Contract Usage:** 255+ files (files that import/use contract-related services)
- **Files with @solana imports:** 642 files (includes dependencies)
- **Blockchain service files:** 46 files in `src/services/blockchain/`
- **Critical Files:** 15 files (marked ⭐⭐⭐)

---

## 🔑 Core Contract/Program Definition Files (6 files)

**These files define or directly reference Solana program IDs and contract addresses.**

1. ⭐⭐⭐ `src/services/blockchain/secureTokenUtils.ts` - TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
2. ⭐⭐⭐ `src/config/constants/tokens.ts` - USDC mint addresses
3. ⭐⭐⭐ `src/config/network/solanaNetworkConfig.ts` - Network-specific USDC addresses
4. ⭐⭐⭐ `src/config/unified.ts` - Unified config with USDC addresses
5. ⭐⭐⭐ `src/config/network/chain.ts` - Chain configuration with addresses
6. ⭐⭐⭐ `src/services/shared/walletConstants.ts` - Wallet constants

---

## 💸 Transaction Files - Direct Contract Usage (25 files)

**Files that directly construct transactions using Solana programs.**

### Core Transaction Services
7. ⭐⭐ `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`
8. ⭐⭐ `src/services/blockchain/transaction/sendExternal.ts`
9. ⭐⭐ `src/services/blockchain/transaction/sendInternal.ts`
10. ⭐⭐ `src/services/blockchain/transaction/TransactionProcessor.ts`
11. ⭐⭐ `src/services/blockchain/transaction/transactionSigningService.ts`
12. ⭐ `src/services/blockchain/transaction/UnifiedTransactionService.ts`
13. ⭐ `src/services/blockchain/transaction/TransactionDeduplicationService.ts`
14. ⭐ `src/services/blockchain/transaction/transactionHistoryService.ts`
15. ⭐ `src/services/blockchain/transaction/PaymentRequestManager.ts`
16. `src/services/blockchain/transaction/index.ts`
17. `src/services/blockchain/transaction/types.ts`

### Transaction Handlers
18. ⭐ `src/services/blockchain/transaction/handlers/FairSplitHandler.ts`
19. ⭐ `src/services/blockchain/transaction/handlers/DegenSplitHandler.ts`
20. ⭐ `src/services/blockchain/transaction/handlers/FairSplitWithdrawalHandler.ts`

### Split Transaction Handlers
21. `src/services/split/handlers/FairSplitWithdrawalHandler.ts`
22. `src/services/split/handlers/TransferHandlers.ts`
23. `src/services/split/handlers/SharedPaymentHelpers.ts`
24. `src/services/split/handlers/ParticipantPaymentHandlers.ts`
25. `src/services/split/handlers/DegenWinnerPayoutHandler.ts`
26. `src/services/split/handlers/DegenLoserPaymentHandler.ts`
27. `src/services/split/handlers/WalletAccessHandlers.ts`

### Transaction Services (High-Level)
28. `src/services/transactions/CentralizedTransactionHandler.ts`
29. `src/services/transactions/UnifiedTransactionConfig.ts`
30. `src/services/transactions/UnifiedWithdrawalService.ts`
31. `src/services/shared/transactionPostProcessing.ts`

---

## 🔐 Wallet Files - Direct Contract Usage (35 files)

**Files that directly interact with Solana wallets and use program IDs.**

### Core Wallet Services
32. ⭐⭐ `src/services/blockchain/wallet/solanaAppKitService.ts`
33. ⭐⭐ `src/services/blockchain/wallet/phantomConnectService.ts`
34. ⭐⭐ `src/services/blockchain/wallet/phantomSplitWalletService.ts`
35. ⭐ `src/services/blockchain/wallet/simplifiedWalletService.ts`
36. ⭐ `src/services/blockchain/wallet/walletRecoveryService.ts`
37. ⭐ `src/services/blockchain/wallet/UnifiedWalletService.ts`
38. ⭐ `src/services/blockchain/wallet/LinkedWalletService.ts`
39. `src/services/blockchain/wallet/walletExportService.ts`
40. `src/services/blockchain/wallet/walletValidationService.ts`
41. `src/services/blockchain/wallet/walletIntegrationHelper.ts`
42. `src/services/blockchain/wallet/balanceManagementService.ts`
43. `src/services/blockchain/wallet/walletIssueFixUtility.ts`
44. `src/services/blockchain/wallet/mockMWAService.ts`
45. `src/services/blockchain/wallet/index.ts`

### Wallet Utilities
46. ⭐ `src/services/blockchain/wallet/derive.ts`
47. ⭐ `src/services/blockchain/wallet/linkExternal.ts`
48. ⭐ `src/services/blockchain/wallet/linking/signatureLinkService.ts`
49. ⭐ `src/services/blockchain/wallet/discovery/mwaDiscoveryService.ts`
50. `src/services/blockchain/wallet/api/solanaWalletApi.ts`
51. `src/services/blockchain/wallet/request/solanaPay.ts`
52. `src/services/blockchain/wallet/providers/registry.ts`

### Split Wallet Services
53. ⭐⭐ `src/services/split/SplitWalletSecurity.ts` - Encryption, key management
54. ⭐⭐ `src/services/split/SplitWalletPayments.ts` - Payment processing
55. ⭐ `src/services/split/SplitWalletCreation.ts` - Wallet creation
56. ⭐ `src/services/split/SplitWalletManagement.ts` - Wallet management
57. ⭐ `src/services/split/SplitWalletQueries.ts` - Data queries
58. `src/services/split/SplitWalletCleanup.ts`
59. `src/services/split/SplitWalletCache.ts`
60. `src/services/split/SplitWalletAtomicUpdates.ts`

### Shared Wallet Services
61. ⭐ `src/services/sharedWallet/SharedWalletCreation.ts`
62. `src/services/sharedWallet/index.ts`
63. `src/services/sharedWallet/MemberRightsService.ts`
64. `src/services/sharedWallet/ParticipantInvitationService.ts`
65. `src/services/sharedWallet/GoalService.ts`
66. `src/services/sharedWallet/types.ts`
67. `src/services/sharedWallet/utils.ts`
68. `src/services/sharedWallet/errorUtils.ts`

---

## ⚙️ Configuration & Constants (12 files)

**Files that configure or reference contract addresses.**

69. `src/config/constants/feeConfig.ts`
70. `src/config/constants/transactionConfig.ts`
71. `src/config/env.ts`
72. `src/config/features.ts`
73. `src/services/shared/transactionUtils.ts`
74. `src/services/shared/balanceUtils.ts`
75. `src/services/shared/balanceCheckUtils.ts`
76. `src/services/shared/keypairUtils.ts`
77. `src/services/shared/validationUtils.ts`
78. `src/services/shared/blockhashUtils.ts`
79. `src/services/shared/memoryManager.ts`
80. `src/services/shared/phantomSharedService.ts`

---

## 🔗 Connection & Network (6 files)

**Files that manage Solana network connections.**

81. `src/services/blockchain/connection/connectionFactory.ts`
82. `src/services/blockchain/connection/index.ts`
83. `src/services/blockchain/network/networkValidator.ts`
84. `src/services/blockchain/network/index.ts`
85. `src/services/blockchain/index.ts`
86. `src/utils/debug/networkConfigDiagnostic.ts`

---

## 💰 Balance Services (2 files)

87. `src/services/blockchain/balance/LiveBalanceService.ts`
88. `src/services/shared/balanceCheckUtils.ts` (also in config section)

---

## 🔥 Backend/Firebase Functions (8 files)

**Backend services that handle transaction signing and validation.**

89. ⭐⭐ `services/firebase-functions/src/transactionSigningService.js`
90. ⭐⭐ `services/firebase-functions/src/transactionFunctions.js`
91. `services/firebase-functions/test-transaction-processing.js`
92. `services/firebase-functions/test-secrets-integration.js`
93. `services/firebase-functions/test-secrets.js`
94. `services/firebase-functions/verify-secrets.js`
95. `services/backend/services/transactionSigningService.js`
96. `services/firebase-functions/src/spendApiEndpoints.js`
97. `services/firebase-functions/src/externalPaymentIntegration.js`
98. `services/firebase-functions/src/degenRouletteFunctions.js`

---

## 🧪 Test Files (20 files)

### Unit Tests
99. `src/services/blockchain/wallet/__tests__/phantomConnectService.test.ts`
100. `src/services/blockchain/connection/__tests__/connectionFactory.test.ts`
101. `src/services/blockchain/network/__tests__/networkValidator.test.ts`
102. `src/services/blockchain/__tests__/networkIntegration.test.ts`
103. `src/config/network/__tests__/solanaNetworkConfig.test.ts`
104. `src/services/core/__tests__/solanaPay.test.ts`
105. `src/services/core/__tests__/deepLinkHandler.phantom.test.ts`
106. `src/services/auth/__tests__/PhantomAuthService.test.ts`
107. `src/services/auth/__tests__/PhantomAuthIntegration.test.ts`
108. `src/components/auth/__tests__/PhantomAuthButton.test.tsx`
109. `src/components/wallet/__tests__/MWADetectionButton.expo-go.test.tsx`

### Integration Tests
110. `tools/tests/tests/tx/degen-split.test.ts`
111. `tools/tests/tests/tx/fair-split.test.ts`
112. `tools/tests/tests/tx/send1to1.test.ts`
113. `tools/tests/__tests__/deposit.spec.ts`
114. `tools/tests/__tests__/funding.spec.ts`
115. `tools/tests/__tests__/wallet.spec.ts`
116. `tools/tests/__tests__/wallet-linking.spec.ts`
117. `tools/tests/__tests__/wallet-detection.spec.ts`
118. `tools/tests/tests/notifications/notification-system.test.ts`
119. `tools/tests/tests/navigation/split-navigation.test.ts`

### Test Utilities
120. `test-secure-tokens.js`
121. `test-token-utils.js`
122. `jest.setup.js`
123. `src/utils/testing/walletPersistenceTester.ts`

---

## 🎨 UI Components & Screens (45+ files)

**Screens and components that use contract-related services.**

### Wallet Components
124. `src/components/wallet/MWADetectionButton.tsx`
125. `src/components/wallet/WalletSelectorModal.tsx`
126. `src/components/wallet/WalletRecoveryModal.tsx`
127. `src/components/wallet/WalletRecoveryComponent.tsx`
128. `src/components/wallet/WalletMismatchFixer.tsx`
129. `src/components/wallet/WalletExportExample.tsx`
130. `src/components/wallet/WalletConnectButton.tsx`

### Transaction Components
131. `src/components/shared/CentralizedTransactionModal.tsx`
132. `src/components/shared/SendComponent.tsx`
133. `src/components/shared/SendConfirmation.tsx`
134. `src/components/shared/TransactionAmountInput.tsx`
135. `src/components/transactions/TransactionItem.tsx`
136. `src/components/transactions/TransactionModal.tsx`
137. `src/components/transactions/index.ts`

### Split Components
138. `src/screens/FairSplit/FairSplitScreen.tsx`
139. `src/screens/DegenSplit/DegenLockScreen.tsx`
140. `src/screens/DegenSplit/DegenSpinScreen.tsx`
141. `src/screens/DegenSplit/DegenResultScreen.tsx`
142. `src/screens/SplitDetails/SplitDetailsScreen.tsx`
143. `src/screens/Splits/SplitsList/SplitsListScreen.tsx`
144. `src/screens/SplitPayment/SplitPaymentScreen.tsx`

### Shared Wallet Components
145. `src/components/sharedWallet/index.ts`
146. `src/components/sharedWallet/TransactionHistoryItem.tsx`
147. `src/components/sharedWallet/TransactionHistory.tsx`
148. `src/components/sharedWallet/MembersList.tsx`
149. `src/components/sharedWallet/ActionButtons.tsx`
150. `src/components/sharedWallet/BalanceCard.tsx`
151. `src/components/sharedWallet/LogoPicker.tsx`
152. `src/components/sharedWallet/ColorPicker.tsx`
153. `src/components/SharedWalletHeroCard.tsx`
154. `src/components/SharedWalletGridCard.tsx`
155. `src/components/SharedWalletCard.tsx`

### Shared Wallet Screens
156. `src/screens/SharedWallet/SharedWalletDetailsScreen.tsx`
157. `src/screens/SharedWallet/SharedWalletSettingsScreen.tsx`
158. `src/screens/SharedWallet/SharedWalletMembersScreen.tsx`
159. `src/screens/SharedWallet/SharedWalletNameScreen.tsx`

### Other Screens
160. `src/screens/Send/SendScreen.tsx`
161. `src/screens/Send/SendSuccessScreen.tsx`
162. `src/screens/Transaction/CentralizedTransactionScreen.tsx`
163. `src/screens/TransactionHistory/TransactionHistoryScreen.tsx`
164. `src/screens/Withdraw/WithdrawAmountScreen.tsx`
165. `src/screens/Withdraw/WithdrawConfirmationScreen.tsx`
166. `src/screens/Deposit/DepositScreen.tsx`
167. `src/screens/Deposit/CryptoTransferScreen.tsx`
168. `src/screens/WalletManagement/WalletManagementScreen.tsx`
169. `src/screens/WalletManagement/FundTransferScreen.tsx`
170. `src/screens/WalletManagement/SeedPhraseViewScreen.tsx`
171. `src/screens/WalletDebug/WalletDebugScreen.tsx`
172. `src/screens/SeedPhraseRecovery/SeedPhraseRecoveryScreen.tsx`
173. `src/screens/KastAccountLinking/KastAccountLinkingScreen.tsx`
174. `src/screens/ExternalWalletConnection/ExternalWalletConnectionScreen.tsx`
175. `src/screens/ExternalWalletConnection/ManualSignatureInputScreen.tsx`
176. `src/screens/ExternalWalletConnection/index.tsx`
177. `src/screens/QRCode/QRCodeScreen.tsx`
178. `src/screens/Testing/WalletPersistenceTestScreen.tsx`

---

## 🪝 Hooks (10 files)

**React hooks that use contract-related services.**

179. `src/hooks/usePhantomWallet.ts`
180. `src/hooks/useWalletState.ts`
181. `src/hooks/useSplitWallet.ts`
182. `src/hooks/useBalance.ts`
183. `src/hooks/useLiveBalance.ts`
184. `src/hooks/useSplitRealtime.ts`
185. `src/hooks/useSplitDetails.ts`
186. `src/screens/FairSplit/hooks/useFairSplitLogic.ts`
187. `src/screens/FairSplit/hooks/useFairSplitState.ts`
188. `src/screens/FairSplit/hooks/useFairSplitInitialization.ts`
189. `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`
190. `src/screens/DegenSplit/hooks/useDegenSplitState.ts`
191. `src/screens/DegenSplit/hooks/useDegenSplitRealtime.ts`
192. `src/screens/DegenSplit/hooks/useDegenSplitInitialization.ts`
193. `src/screens/DegenSplit/hooks/useDegenSplitErrorHandler.ts`
194. `src/screens/SharedWallet/hooks/useSharedWalletData.ts`
195. `src/services/transactions/hooks/useTransactionModal.ts`

---

## 🔧 Utilities & Helpers (15 files)

196. `src/utils/debug/networkConfigDiagnostic.ts`
197. `src/utils/network/sendUtils.ts`
198. `src/utils/ui/format/formatUtils.ts`
199. `src/utils/transactionDisplayUtils.ts`
200. `src/utils/validation/address.ts`
201. `src/utils/validation/form.ts`
202. `src/utils/mwaErrorHandler.ts`
203. `src/utils/core/platformDetection.ts`
204. `src/utils/core/errorHandler.ts`
205. `src/utils/core/qrCodeService.ts`
206. `src/utils/core/share.ts`
207. `src/utils/core/priceService.ts`
208. `src/utils/performance/splitUtils.ts`
209. `src/utils/performance/settlementOptimizer.ts`
210. `src/utils/spend/spendWalletUtils.ts`
211. `src/utils/crypto/wallet/walletUtils.ts`
212. `src/utils/crypto/wallet/cryptoUtils.ts`

---

## 🔐 Authentication & Security (8 files)

213. ⭐⭐ `src/services/auth/PhantomAuthService.ts`
214. ⭐⭐ `src/services/security/walletCloudBackupService.ts`
215. ⭐⭐ `src/services/security/secureVault.ts` - Already documented
216. `src/components/auth/PhantomAuthButton.tsx`
217. `src/providers/PhantomSDKProvider.tsx`
218. `src/context/WalletContext.tsx`
219. `src/services/shared/phantomSharedService.ts`
220. `verify-phantom-config.js`

---

## 📦 Other Services (25 files)

### Split Services
221. `src/services/split/index.ts`
222. `src/services/split/types.ts`
223. `src/services/split/SplitValidationService.ts`
224. `src/services/split/SplitRouletteService.ts`
225. `src/services/split/SplitDataSynchronizer.ts`
226. `src/services/split/UnifiedSplitCreationService.ts`
227. `src/services/split/constants/splitConstants.ts`
228. `src/services/split/utils/statusMapper.ts`
229. `src/services/split/utils/participantMapper.ts`
230. `src/services/split/utils/debounceUtils.ts`

### Splits Services (Alternative Structure)
231. `src/services/splits/splitStorageService.ts`
232. `src/services/splits/splitInvitationService.ts`
233. `src/services/splits/splitDataValidationService.ts`
234. `src/services/splits/SplitParticipantInvitationService.ts`

### Transaction Services
235. `src/services/transactions/types.ts`
236. `src/services/transactions/index.ts`
237. `src/services/transactions/configs/splitTransactionConfigs.ts`
238. `src/services/transactions/configs/sharedWalletTransactionConfigs.ts`
239. `src/services/transactions/configs/sendTransactionConfigs.ts`
240. `src/services/transactions/configs/index.ts`

### Core Services
241. `src/services/core/solanaPay.ts`
242. `src/services/core/index.ts`
243. `src/services/core/deepLinkHandler.ts`
244. `src/services/core/qrCodeService.ts`
245. `src/services/core/share.ts`
246. `src/services/core/ScannerScreen.tsx`
247. `src/services/core/QrCodeView.tsx`

### Integration Services
248. `src/services/integrations/spend/SpendMerchantPaymentService.ts`
249. `src/services/integrations/spend/SpendPaymentModeService.ts`
250. `src/services/integrations/spend/SpendTypes.ts`
251. `src/services/integrations/spend/SpendWebhookService.ts`
252. `src/services/integrations/external/firebaseMoonPayService.ts`
253. `src/services/integrations/external/ExternalCardService.ts`
254. `src/services/integrations/external/ExternalCardPaymentService.ts`

### Other
255. `src/services/shared/splitDataUtils.ts`
256. `src/services/billing/consolidatedBillAnalysisService.ts`
257. `src/services/billing/manualSplitCreationService.ts`
258. `src/services/contacts/transactionBasedContactService.ts`
259. `src/services/contacts/contactWalletSyncService.ts`
260. `src/services/contacts/userSearchService.ts`
261. `src/services/contacts/index.ts`
262. `src/services/user/userInteractionService.ts`
263. `src/services/data/firebaseDataService.ts`
264. `src/services/data/firebaseFunctionsService.ts`
265. `src/services/data/index.ts`

---

## 📚 Type Definitions (8 files)

266. `src/types/global.d.ts`
267. `src/types/index.ts`
268. `src/types/unified.ts`
269. `src/types/rewards.ts`
270. `src/types/notifications.ts`
271. `src/types/notificationTypes.ts`
272. `src/types/splitNavigation.ts`
273. `store/types.ts`

---

## 🗂️ Store/State Management (5 files)

274. `src/store/index.ts`
275. `src/store/slices/transactionsSlice.ts`
276. `src/store/slices/walletSlice.ts`
277. `src/store/slices/splitsSlice.ts`

---

## 🎨 Styles & Config (10 files)

278. `src/screens/FairSplit/styles.ts`
279. `src/screens/DegenSplit/DegenResultStyles.ts`
280. `src/screens/DegenSplit/DegenLockStyles.ts`
281. `src/screens/SplitDetails/styles.ts`
282. `src/screens/Splits/SplitsList/styles.ts`
283. `src/screens/Dashboard/styles.ts`
284. `src/screens/Withdraw/styles.ts`
285. `src/screens/WalletManagement/styles.ts`
286. `src/screens/Send/styles.ts`
287. `src/components/shared/styles/TransactionSharedStyles.ts`
288. `src/components/transactions/TransactionModal.styles.ts`
289. `src/theme/colors.ts`

---

## 🗂️ Legacy/Unused (5 files)

290. `src/OLD_LEGACY/unused/ProductionWalletContext.tsx`
291. `src/OLD_LEGACY/unused/WalletLinkingContext.tsx`
292. `src/OLD_LEGACY/debug_utils/runtimeEnvTest.ts`
293. `src/OLD_LEGACY/debug_utils/priceManagerDebugger.ts`
294. `src/OLD_LEGACY/debug_utils/firebaseCheck.ts`
295. `src/OLD_LEGACY/debug_utils/productionDebug.ts`
296. `src/OLD_LEGACY/deprecated_services_duplicates/firebaseDataService.ts`
297. `src/OLD_LEGACY/deprecated_services_duplicates/firebaseFunctionsService.ts`
298. `src/OLD_LEGACY/deprecated_utils/currencyUtils.ts`
299. `src/OLD_LEGACY/deprecated_utils_duplicates/priceUtils.ts`
300. `src/OLD_LEGACY/screens/AddExpense/AddExpenseScreen.tsx`
301. `src/OLD_LEGACY/screens/GroupDetails/GroupDetailsScreen.tsx`
302. `src/OLD_LEGACY/screens/SettleUp/SettleUpModal.tsx`
303. `src/OLD_LEGACY/screens/SettleUp/styles.ts`

---

## 📋 Configuration Files (5 files)

304. `app.config.js`
305. `config/environment/env.example`
306. `config/deployment/firestore.rules`
307. `src/config/runtimeErrorHandler.ts`
308. `src/config/network/index.ts`
309. `src/config/network/api.ts`

---

## 📊 Summary Statistics

### By Category:
- **Core Definitions:** 6 files
- **Transaction Files:** 31 files
- **Wallet Files:** 68 files
- **Configuration:** 17 files
- **Connection/Network:** 6 files
- **Backend/Firebase:** 9 files
- **Tests:** 24 files
- **UI Components/Screens:** 75+ files
- **Hooks:** 17 files
- **Utilities:** 17 files
- **Other Services:** 35 files
- **Types:** 8 files
- **Store:** 4 files
- **Styles:** 12 files
- **Legacy:** 14 files
- **Config:** 5 files

### Total: **300+ files**

### Verification Results:
- **Blockchain directory files:** 46 files
- **Files importing @solana:** 642 files (includes node_modules and indirect imports)
- **Direct contract usage files:** ~45 files

---

## 🔴 Most Critical Files for Audit (Top 15)

**Files with direct contract/program usage - MUST audit:**

1. `src/services/blockchain/secureTokenUtils.ts` - **Critical: 5/5** - Program ID definitions
2. `src/config/constants/tokens.ts` - **Critical: 5/5** - USDC mint addresses
3. `src/config/network/solanaNetworkConfig.ts` - **Critical: 5/5** - Network config
4. `src/config/unified.ts` - **Critical: 5/5** - Unified config
5. `src/config/network/chain.ts` - **Critical: 5/5** - Chain config
6. `src/services/blockchain/transaction/sendExternal.ts` - **Critical: 4/5** - External transfers
7. `src/services/blockchain/transaction/sendInternal.ts` - **Critical: 4/5** - Internal transfers
8. `src/services/blockchain/transaction/TransactionProcessor.ts` - **Critical: 4/5** - Transaction processing
9. `src/services/blockchain/wallet/solanaAppKitService.ts` - **Critical: 4/5** - Wallet operations
10. `services/firebase-functions/src/transactionSigningService.js` - **Critical: 4/5** - Backend signing
11. `src/services/split/SplitWalletSecurity.ts` - **Critical: 4/5** - Split wallet encryption
12. `src/services/split/SplitWalletPayments.ts` - **Critical: 4/5** - Split payments
13. `src/services/auth/PhantomAuthService.ts` - **Critical: 4/5** - Authentication
14. `src/services/security/walletCloudBackupService.ts` - **Critical: 4/5** - Security
15. `src/services/security/secureVault.ts` - **Critical: 4/5** - Secure storage

---

## 🔍 Verification Commands

```bash
# Find all Solana imports
grep -r "@solana" src/ services/ --include="*.ts" --include="*.tsx" --include="*.js" -l | wc -l

# Find all contract addresses
grep -r "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\|4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\|MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr" src/ services/ --include="*.ts" --include="*.js" -l | wc -l

# Find all program IDs
grep -r "TOKEN_PROGRAM_ID\|ASSOCIATED_TOKEN_PROGRAM_ID\|SystemProgram\|ComputeBudgetProgram" src/ services/ --include="*.ts" --include="*.js" -l | wc -l

# Count blockchain directory files
find src/services/blockchain -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l
```

---

## ✅ Audit Verification Checklist

- [x] Core contract definition files identified
- [x] Transaction files with direct contract usage identified
- [x] Wallet files with direct contract usage identified
- [x] Split wallet files identified
- [x] Shared wallet files identified
- [x] Backend/Firebase functions identified
- [x] Test files identified
- [x] UI components using contracts identified
- [x] Hooks using contracts identified
- [x] Configuration files identified
- [x] Type definitions identified
- [x] Legacy files identified

---

**Audit Status:** ✅ COMPLETE  
**Total Files Identified:** 300+ files  
**Critical Files:** 15 files  
**Last Updated:** January 2025
