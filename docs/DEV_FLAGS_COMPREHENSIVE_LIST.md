# Comprehensive List of Development-Only Features and Logic

This document lists all code paths, features, and logic that are only available when `__DEV__` is `true` or in development mode.

## Table of Contents
1. [Feature Flags](#feature-flags)
2. [Shared Wallet Features](#shared-wallet-features)
3. [Debug Screens & Components](#debug-screens--components)
4. [Logging & Console Output](#logging--console-output)
5. [Redux DevTools](#redux-devtools)
6. [Test Data & Mock Services](#test-data--mock-services)
7. [Phone Authentication Test Numbers](#phone-authentication-test-numbers)
8. [UI Components & Screens](#ui-components--screens)
9. [Network Configuration](#network-configuration)
10. [Error Handling](#error-handling)
11. [Performance Monitoring](#performance-monitoring)

---

## Feature Flags

### Location: `src/config/features.ts`

**All Phantom SDK features are DEV-only:**
- `PHANTOM_SDK_ENABLED` - Disabled in production
- `PHANTOM_SOCIAL_LOGIN` - Disabled in production
- `PHANTOM_SPLIT_WALLETS` - Disabled in production
- `PHANTOM_AUTO_CONFIRM` - Disabled in production
- `PHANTOM_MULTI_CHAIN` - Disabled in production
- `SHARED_WALLET_ENABLED` - Enabled only in dev mode

**Code:**
```typescript
if (!__DEV__) {
  return {
    PHANTOM_SDK_ENABLED: false,
    PHANTOM_SOCIAL_LOGIN: false,
    PHANTOM_SPLIT_WALLETS: false,
    PHANTOM_AUTO_CONFIRM: false,
    PHANTOM_MULTI_CHAIN: false,
    SHARED_WALLET_ENABLED: false,
  };
}
```

---

## Shared Wallet Features

### 1. Shared Wallet Creation
**Location:** `src/services/sharedWallet/SharedWalletCreation.ts:106`
- **DEV-only:** Shared wallet creation is blocked in production
- Returns error: "Shared wallet creation is only available in development mode"

### 2. Shared Wallet Funding
**Location:** `src/services/blockchain/transaction/ConsolidatedTransactionService.ts:730`
- **DEV-only:** Shared wallet funding operations blocked in production
- Returns error: "Shared wallet funding is only available in development mode"

### 3. Shared Wallet Withdrawal
**Location:** `src/services/blockchain/transaction/ConsolidatedTransactionService.ts:740`
- **DEV-only:** Shared wallet withdrawal operations blocked in production
- Returns error: "Shared wallet withdrawal is only available in development mode"

### 4. Shared Wallet List UI
**Location:** `src/screens/splits/SplitsList/SplitsListScreen.tsx:1393`
- **DEV-only:** Shared wallets list section only visible when `__DEV__` is true

---

## Debug Screens & Components

### 1. Wallet Debug Screen
**Location:** `src/screens/WalletDebug/WalletDebugScreen.tsx`
- Full diagnostic screen for wallet detection and linking
- Provides testing capabilities for wallet providers
- Includes discovery controls, statistics, and testing tools

### 2. Dev Asset Preview Screen
**Location:** `src/screens/Rewards/DevAssetPreviewScreen.tsx`
- Development-only screen to preview and apply profile borders, wallet backgrounds, and badges
- Allows testing of reward assets

### 3. Auth Debug Screen
**Location:** `src/screens/Debug/AuthDebugScreen.tsx`
- Debug screen for authentication testing
- Available in development builds

### 4. Wallet Persistence Test Screen
**Location:** `src/screens/Testing/WalletPersistenceTestScreen.tsx`
- Only loaded when `__DEV__` is true
- **Code:** `App.tsx:85-91`
```typescript
if (__DEV__) {
  try {
    WalletPersistenceTestScreen = require('./src/screens/Testing/WalletPersistenceTestScreen').default;
  } catch (e) {
    // Screen not available
  }
}
```

### 5. Production Auth Debugger Component
**Location:** `src/components/auth/ProductionAuthDebugger.tsx`
- Debug component for production auth testing
- Shows environment variables, Firebase config, and test results

### 6. Auth Debug Component
**Location:** `src/components/auth/AuthDebug.tsx`
- Debug utilities for authentication

### 7. Env Test Component
**Location:** `src/components/debug/EnvTestComponent.tsx`
- Component for testing environment variables

### 8. Phantom Auth Button
**Location:** `src/components/auth/PhantomAuthButton.tsx:141`
- **DEV-only:** Component returns `null` in production
```typescript
if (!__DEV__) {
  return null;
}
```

---

## Logging & Console Output

### 1. Logging Service
**Location:** `src/services/analytics/loggingService.ts`
- **Console output:** Only logs to console when `__DEV__` is true (line 115)
- **Log level:** Defaults to 'debug' in dev, 'warn' in production (line 34)
- **Verbose sources:** Silenced in production for DEBUG/INFO logs (line 84)

### 2. Split Realtime Service Logging
**Location:** `src/services/splits/splitRealtimeService.ts:82, 90, 116`
- Multiple `console.log` statements wrapped in `if (__DEV__)`

### 3. Splits List Screen Logging
**Location:** `src/screens/splits/SplitsList/SplitsListScreen.tsx`
- Multiple debug logs at lines: 241, 335, 415, 480, 485, 498, 664

### 4. Split Details Screen Logging
**Location:** `src/screens/SplitDetails/SplitDetailsScreen.tsx`
- Extensive debug logging throughout (lines: 129, 175, 190, 214, 227, 270, 284, 290, 298, 304, 310, 316, 322, 329, 342, 348, 357, 363, 369, 375, etc.)

### 5. Dashboard Screen Logging
**Location:** `src/screens/Dashboard/DashboardScreen.tsx`
- Multiple debug logs wrapped in `__DEV__` checks

### 6. Manual Bill Creation Logging
**Location:** `src/screens/Billing/ManualBillCreation/ManualBillCreationScreen.tsx:532`
- Debug log for navigation wrapped in `__DEV__`

---

## Redux DevTools

### Location: `src/store/index.ts:199`
- **DEV-only:** Redux DevTools only enabled when `__DEV__` is true
```typescript
enabled: __DEV__,
```

---

## Test Data & Mock Services

### 1. Mockup Data Service
**Location:** `src/services/data/mockupData.ts`
- Provides consistent mockup data for testing
- Used throughout the app for fallback data

### 2. Mock MWA Service
**Location:** `src/services/blockchain/wallet/mockMWAService.ts`
- Mock implementation for Multi-Wallet Account service
- Includes `resetMockData()` method for testing

### 3. Spend Mock Data
**Location:** `src/services/integrations/spend/SpendMockData.ts`
- Mock data structures for SPEND integration testing
- **Note:** Production code does NOT use mock data

### 4. Fallback Data Service
**Location:** `src/utils/performance/fallbackDataService.ts`
- Uses MockupDataService for consistent fallback values
- Only for development/testing

### 5. Platform Detection Mock Data
**Location:** `src/utils/core/platformDetection.ts:216`
- `enableMockData: platformInfo.isExpoGo` - Mock data enabled in Expo Go

### 6. Unified Config Mock Data
**Location:** `src/config/unified.ts:430`
- `enableMockData: extra.ENABLE_MOCK_DATA === 'true' || isDevelopment`

---

## Phone Authentication Test Numbers

### Location: `src/screens/AuthMethods/AuthMethodsScreen.tsx:418`
- **DEV-only error message** shows test phone numbers:
  - `+15551234567`
  - `+15559876543`
  - `+15551111111`
- Production shows generic error message instead

### Firebase Functions Test Codes
**Location:** `services/firebase-functions/src/phoneFunctions.js:353, 654`
- Test codes logged for development testing

---

## UI Components & Screens

### 1. Withdraw Amount Screen Dev Testing
**Location:** `src/screens/Withdraw/WithdrawAmountScreen.tsx:318`
- Dev testing section with quick amount buttons ($10, $50, $100)
- Test address buttons
- Only visible when `__DEV__` is true and `false && __DEV__` (currently disabled)

### 2. Phantom SDK Provider
**Location:** `src/providers/PhantomSDKProvider.tsx:105`
- `skipPortalCheck={__DEV__}` - Skips portal check in development

---

## Network Configuration

### 1. Network Override
**Location:** `src/config/network/__tests__/solanaNetworkConfig.test.ts`
- Network override functionality throws error in production builds
- Only available in development

### 2. Platform Detection
**Location:** `src/utils/core/platformDetection.ts`
- Development-specific platform detection logic

---

## Error Handling

### 1. Runtime Error Handler
**Location:** `src/config/runtimeErrorHandler.ts`
- WebSocket error filtering
- Console.error interception for development debugging

### 2. Console Error Filtering
**Location:** `src/config/runtimeErrorHandler.ts:90`
- Filters WebSocket errors in development
- Suppresses non-critical errors from Solana SDK

---

## Performance Monitoring

### 1. Performance Monitor Hook
**Location:** `src/hooks/usePerformanceMonitor.ts`
- Performance monitoring utilities
- Likely includes development-only features

---

## Additional Development-Only Code Patterns

### 1. Console.log Statements
Found **734 console.log/warn/error/debug** statements across **125 files** in `src/`
- Many wrapped in `__DEV__` checks
- Some may need review for production safety

### 2. Test Utilities
- `src/utils/testAvatarUploadService.ts`
- `src/utils/testAvatarService.ts`
- `src/utils/testAvatarServiceFunctionality.ts`
- `src/utils/testFirebaseAvatarUpload.ts`

### 3. Legacy Debug Utils
- `src/OLD_LEGACY/debug_utils/oauthTest.ts`
- `src/OLD_LEGACY/debug_utils/firebaseCheck.ts`
- `src/OLD_LEGACY/debug_utils/productionDebug.ts`
- `src/OLD_LEGACY/debug_utils/oauthDebugger.ts`
- `src/OLD_LEGACY/debug_utils/envTest.ts`
- `src/OLD_LEGACY/debug_utils/runtimeEnvTest.ts`
- `src/OLD_LEGACY/debug_utils/priceManagerDebugger.ts`

---

## Security Considerations

### ⚠️ Critical DEV-Only Features That Should NOT Be in Production:

1. **Shared Wallet Operations** - Blocked in production ✅
2. **Phantom SDK Features** - Disabled in production ✅
3. **Debug Screens** - Should not be accessible in production
4. **Test Phone Numbers** - Should not be shown to users in production ✅
5. **Mock Data Services** - Should not be used in production
6. **Redux DevTools** - Disabled in production ✅
7. **Verbose Logging** - Reduced in production ✅

### ✅ Safely Protected:
- Shared wallet creation/funding/withdrawal - Returns errors in production
- Phantom features - Disabled via feature flags
- Redux DevTools - Disabled in production
- Logging verbosity - Reduced in production
- Test phone numbers - Hidden in production error messages

### ⚠️ Needs Review:
- Console.log statements (734 found) - Some may leak in production
- Mock data services - Ensure not used in production code paths
- Debug screens - Ensure not accessible via navigation in production builds

---

## Recommendations

1. **Audit console.log statements** - Ensure all are wrapped in `__DEV__` checks or use the logging service
2. **Remove or gate debug screens** - Ensure debug screens cannot be accessed in production builds
3. **Review mock data usage** - Ensure production code paths never use mock data
4. **Add build-time checks** - Consider adding build-time validation to ensure DEV-only code is not included in production builds
5. **Documentation** - Keep this list updated as new DEV-only features are added

---

## Summary Statistics

- **Total files with `__DEV__` checks:** 91 files
- **Total console.log statements:** 734 across 125 files
- **DEV-only screens:** 8+ screens
- **DEV-only features:** 6 major feature categories
- **Mock data services:** 5+ services
- **Test utilities:** 10+ utility files

---

*Last Updated: 2025-12-11*
*Generated from comprehensive codebase search*
