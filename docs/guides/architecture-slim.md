# WeSplit Slim Architecture

## Overview

This document defines the new slim architecture for the WeSplit codebase, designed to eliminate duplication, improve maintainability, and establish clear module boundaries.

## 🏗️ Architecture Principles

### 1. Feature-Based Organization
- Group related functionality by business domain
- Each feature is self-contained with its own API, hooks, UI, and models
- Clear separation of concerns

### 2. Shared Utilities
- Cross-cutting concerns in `libs/`
- No business logic in shared utilities
- Pure functions with clear interfaces

### 3. Strict Module Boundaries
- No direct feature-to-feature imports
- Configuration only through `config/`
- UI components only from `theme/` and `libs/format`

### 4. Single Source of Truth
- One canonical implementation per concern
- No duplicate services or utilities
- Clear ownership of each module

## 📁 Directory Structure

```
src/
├── app/                          # Application shell
│   ├── screens/                  # Screen components only
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Wallet/
│   │   ├── Payments/
│   │   └── Profile/
│   ├── navigation/               # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   └── index.ts                  # App entry point
│
├── components/                   # Presentational components
│   ├── ui/                       # Shared UI primitives
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── forms/                    # Form components
│   │   ├── FormField/
│   │   ├── FormValidation/
│   │   └── index.ts
│   └── index.ts
│
├── features/                     # Business feature modules
│   ├── auth/                     # Authentication feature
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useLogin.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── LoginForm/
│   │   │   ├── SignupForm/
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── authTypes.ts
│   │   │   ├── authState.ts
│   │   │   └── index.ts
│   │   └── index.ts              # Public API
│   │
│   ├── wallet/                   # Wallet management feature
│   │   ├── api/
│   │   │   ├── walletApi.ts
│   │   │   ├── transactionApi.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useWallet.ts
│   │   │   ├── useTransactions.ts
│   │   │   ├── useBalance.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── WalletCard/
│   │   │   ├── TransactionList/
│   │   │   ├── BalanceDisplay/
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── walletTypes.ts
│   │   │   ├── walletState.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── payments/                 # Payment processing feature
│   │   ├── api/
│   │   │   ├── paymentApi.ts
│   │   │   ├── moonpayApi.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── usePayments.ts
│   │   │   ├── useMoonPay.ts
│   │   │   ├── useSend.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── PaymentForm/
│   │   │   ├── MoonPayWidget/
│   │   │   ├── SendModal/
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── paymentTypes.ts
│   │   │   ├── paymentState.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── profile/                  # User profile feature
│   │   ├── api/
│   │   │   ├── profileApi.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useProfile.ts
│   │   │   ├── useSettings.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── ProfileCard/
│   │   │   ├── SettingsForm/
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── profileTypes.ts
│   │   │   ├── profileState.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   └── index.ts                  # Feature exports
│
├── libs/                         # Cross-cutting utilities
│   ├── format/                   # Formatting utilities
│   │   ├── number.ts             # Number formatting
│   │   ├── amount.ts             # Currency/amount formatting
│   │   ├── date.ts               # Date formatting
│   │   └── index.ts
│   ├── validation/               # Validation utilities
│   │   ├── address.ts            # Address validation
│   │   ├── form.ts               # Form validation
│   │   ├── crypto.ts             # Cryptographic validation
│   │   └── index.ts
│   ├── network/                  # Network utilities
│   │   ├── retry.ts              # Retry logic
│   │   ├── error.ts              # Error handling
│   │   ├── timeout.ts            # Timeout handling
│   │   └── index.ts
│   ├── crypto/                   # Cryptographic utilities
│   │   ├── encryption.ts         # Encryption/decryption
│   │   ├── hashing.ts            # Hashing utilities
│   │   ├── signing.ts            # Digital signing
│   │   └── index.ts
│   └── index.ts
│
├── config/                       # Configuration
│   ├── env.ts                    # Environment variables
│   ├── chain.ts                  # Blockchain configuration
│   ├── api.ts                    # API endpoints
│   ├── firebase.ts               # Firebase configuration
│   └── index.ts
│
├── theme/                        # Design system
│   ├── tokens.ts                 # Design tokens
│   ├── colors.ts                 # Color palette
│   ├── typography.ts             # Typography scale
│   ├── spacing.ts                # Spacing scale
│   ├── components.ts             # Component variants
│   └── index.ts
│
├── storage/                      # Data persistence
│   ├── secure.ts                 # Secure storage
│   ├── cache.ts                  # Caching utilities
│   ├── persistence.ts            # Data persistence
│   └── index.ts
│
├── test/                         # Test utilities
│   ├── mocks/                    # Mock implementations
│   ├── fixtures/                 # Test data
│   ├── utils/                    # Test utilities
│   └── index.ts
│
└── index.ts                      # Root exports
```

## 🔒 Module Boundary Rules

### 1. Import Restrictions

#### Feature Modules
```typescript
// ✅ ALLOWED: Feature internal imports
import { useAuth } from './hooks/useAuth';
import { authApi } from './api/authApi';

// ✅ ALLOWED: Shared library imports
import { formatAmount } from '@libs/format';
import { validateAddress } from '@libs/validation';

// ✅ ALLOWED: Configuration imports
import { API_CONFIG } from '@config/api';

// ❌ FORBIDDEN: Direct feature-to-feature imports
import { useWallet } from '@features/wallet'; // Use public API instead
```

#### Shared Libraries
```typescript
// ✅ ALLOWED: Pure utility imports
import { formatAmount } from './amount';
import { validateAddress } from '../validation/address';

// ❌ FORBIDDEN: Business logic imports
import { authService } from '@features/auth'; // No business logic in libs
```

#### UI Components
```typescript
// ✅ ALLOWED: Theme and formatting imports
import { colors, spacing } from '@theme';
import { formatAmount } from '@libs/format';

// ❌ FORBIDDEN: Business logic imports
import { useWallet } from '@features/wallet'; // Use props instead
```

### 2. Public APIs

Each feature must expose a clean public API through its `index.ts`:

```typescript
// features/wallet/index.ts
export { useWallet, useBalance, useTransactions } from './hooks';
export { WalletCard, TransactionList, BalanceDisplay } from './ui';
export type { WalletInfo, Transaction, Balance } from './model';
```

### 3. Configuration Access

All configuration must go through the `config/` module:

```typescript
// ✅ ALLOWED
import { API_CONFIG } from '@config/api';
import { CHAIN_CONFIG } from '@config/chain';

// ❌ FORBIDDEN
import { API_URL } from '../config/api'; // Use @config alias
```

## 🎯 Migration Strategy

### Phase 1: Create New Structure
1. Create new directory structure
2. Set up path aliases in `tsconfig.json`
3. Create barrel exports

### Phase 2: Migrate Core Features
1. **Wallet Feature**: Move wallet-related code to `features/wallet/`
2. **Payments Feature**: Move payment processing to `features/payments/`
3. **Auth Feature**: Move authentication to `features/auth/`

### Phase 3: Consolidate Utilities
1. **Format Utilities**: Move to `libs/format/`
2. **Validation Utilities**: Move to `libs/validation/`
3. **Network Utilities**: Move to `libs/network/`

### Phase 4: Update Imports
1. Update all imports to use new paths
2. Remove duplicate implementations
3. Update tests

### Phase 5: Clean Up
1. Remove unused files
2. Update documentation
3. Verify functionality

## 📊 Benefits

### Code Organization
- **Clear separation**: Each feature is self-contained
- **Reduced coupling**: Features don't directly depend on each other
- **Easier testing**: Isolated feature modules

### Maintainability
- **Single source of truth**: No duplicate implementations
- **Clear ownership**: Each module has a clear purpose
- **Easier refactoring**: Changes are localized to specific features

### Performance
- **Better tree shaking**: Unused features can be eliminated
- **Smaller bundles**: No duplicate code
- **Faster builds**: Clearer dependency graph

### Developer Experience
- **Intuitive structure**: Easy to find related code
- **Clear boundaries**: No confusion about where code belongs
- **Better tooling**: IDE can provide better autocomplete and navigation

## 🔧 Tooling Support

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@app/*": ["app/*"],
      "@components/*": ["components/*"],
      "@features/*": ["features/*"],
      "@libs/*": ["libs/*"],
      "@config/*": ["config/*"],
      "@theme/*": ["theme/*"],
      "@storage/*": ["storage/*"]
    }
  }
}
```

### ESLint Rules
```json
{
  "rules": {
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./features/*/api/**",
            "from": "./features/*/ui/**",
            "message": "UI components cannot import from API layer"
          },
          {
            "target": "./libs/**",
            "from": "./features/**",
            "message": "Shared libraries cannot import from features"
          }
        ]
      }
    ]
  }
}
```

### Metro Configuration
```javascript
module.exports = {
  resolver: {
    alias: {
      '@app': './src/app',
      '@components': './src/components',
      '@features': './src/features',
      '@libs': './src/libs',
      '@config': './src/config',
      '@theme': './src/theme',
      '@storage': './src/storage'
    }
  }
};
```

## 📈 Success Metrics

### Code Quality
- **Cyclomatic complexity**: Reduced by 30%
- **Code duplication**: Reduced by 90%
- **Import depth**: Maximum 3 levels

### Performance
- **Bundle size**: Reduced by 15-20%
- **Build time**: Improved by 25%
- **Tree shaking**: 95% of unused code eliminated

### Developer Experience
- **Time to find code**: Reduced by 50%
- **Onboarding time**: Reduced by 40%
- **Bug resolution time**: Reduced by 30%

## 🚀 Implementation Checklist

### Setup
- [ ] Create new directory structure
- [ ] Set up path aliases
- [ ] Configure ESLint rules
- [ ] Update Metro configuration

### Migration
- [ ] Migrate wallet feature
- [ ] Migrate payments feature
- [ ] Migrate auth feature
- [ ] Migrate profile feature

### Consolidation
- [ ] Consolidate format utilities
- [ ] Consolidate validation utilities
- [ ] Consolidate network utilities
- [ ] Consolidate crypto utilities

### Cleanup
- [ ] Remove duplicate files
- [ ] Update all imports
- [ ] Update tests
- [ ] Update documentation

### Verification
- [ ] Run all tests
- [ ] Verify functionality
- [ ] Check bundle size
- [ ] Validate architecture rules

---

**Status**: Ready for implementation
**Priority**: High (foundation for all future development)
**Estimated effort**: 2-3 weeks for full implementation
