# WeSplit Source Code Structure

This document outlines the clean, organized structure of the WeSplit application source code.

## 📁 Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── shared/         # Shared component utilities
│   └── optimized/      # Performance-optimized components
├── config/             # Configuration files and constants
│   └── polyfills/      # Platform-specific polyfills
├── context/            # React Context providers
├── data/               # Mock data and test data
├── features/           # Feature-specific modules
│   ├── qr/            # QR code functionality
│   └── wallet/        # Wallet feature modules
├── funding/            # Funding-related logic
├── hooks/              # Custom React hooks
├── libs/               # Third-party library integrations
│   ├── crypto/        # Cryptographic utilities
│   ├── format/        # Formatting libraries
│   ├── network/       # Network utilities
│   └── validation/    # Validation libraries
├── OLD_LEGACY/         # Deprecated and unused code
│   ├── deprecated_services/    # Deprecated services
│   ├── deprecated_utils/       # Deprecated utilities
│   ├── deprecated_duplicates/  # Duplicate files
│   ├── debug_utils/           # Debug utilities
│   └── [legacy folders]       # Original legacy structure
├── screens/            # Screen components organized by feature
├── services/           # Business logic services
│   ├── auth/          # Authentication services
│   ├── wallet/        # Wallet management services
│   ├── notifications/ # Notification services
│   ├── billing/       # Billing and bill analysis
│   ├── external/      # External service integrations
│   ├── transaction/   # Transaction processing
│   ├── split/         # Split management
│   └── shared/        # Shared service utilities
├── store/              # State management (Redux)
│   ├── slices/        # Redux slices
│   └── migration/     # Store migration utilities
├── theme/              # Design system (colors, typography, spacing)
├── transfer/           # Transfer-related utilities
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── auth/          # Authentication utilities
│   ├── wallet/        # Wallet utilities
│   ├── format/        # Formatting utilities
│   ├── validation/    # Validation utilities
│   └── network/       # Network utilities
├── wallet/             # Wallet-specific logic
├── wallets/            # Wallet provider integrations
└── README.md          # This file
```

## 🎯 Key Principles

### 1. **Separation of Concerns**
- **Services**: Business logic and data management
- **Components**: UI presentation and user interaction
- **Utils**: Pure utility functions
- **Types**: TypeScript definitions
- **Config**: Configuration and constants

### 2. **Feature-Based Organization**
- Screens are organized by feature (e.g., `Dashboard/`, `WalletManagement/`)
- Related components, hooks, and utilities are grouped together
- Each feature has its own folder with clear boundaries

### 3. **Centralized Exports**
- Each major folder has an `index.ts` file for clean imports
- Services and utilities are exported through centralized index files
- Reduces import path complexity

### 4. **Legacy Code Management**
- All deprecated code is moved to `OLD_LEGACY/`
- Organized by type (services, utils, duplicates, debug)
- Clear documentation of what was moved and why

## 📦 Import Patterns

### Services
```typescript
// Import specific service
import { WalletService } from '../services/wallet';

// Import multiple services
import { AuthService, WalletService } from '../services';

// Import with types
import { WalletService, type WalletInfo } from '../services/wallet';
```

### Utils
```typescript
// Import specific utility
import { formatUtils } from '../utils/format';

// Import multiple utilities
import { formatUtils, validationUtils } from '../utils';
```

### Components
```typescript
// Import shared components
import { Container, Button } from '../components/shared';

// Import specific components
import NavBar from '../components/NavBar';
```

## 🔄 Migration Guide

### Moving from Old Structure
1. **Services**: Use the new categorized structure in `services/`
2. **Utils**: Use the new categorized structure in `utils/`
3. **Imports**: Update import paths to use the new index files
4. **Deprecated Code**: Check `OLD_LEGACY/` for moved files

### Adding New Code
1. **Services**: Add to appropriate category folder in `services/`
2. **Utils**: Add to appropriate category folder in `utils/`
3. **Components**: Add to `components/` or feature-specific folder
4. **Types**: Add to `types/` with clear naming

## 🚫 What's in OLD_LEGACY

### Deprecated Services
- `consolidatedTransactionService.ts` - Replaced by modular transaction service
- `fiatCurrencyService.ts` - Format functions moved to utils

### Deprecated Utils
- `currencyUtils.ts` - Use `formatUtils` instead
- `amount.ts` - Use `formatUtils` instead

### Debug Utilities
- `envTest.ts`, `oauthTest.ts`, `runtimeEnvTest.ts`
- `productionDebug.ts`, `oauthDebugger.ts`, `priceManagerDebugger.ts`
- `cameraTest.ts`, `firebaseCheck.ts`

### Duplicates
- `walletApi.ts` - Duplicate of `WalletService.ts`

## ✅ Benefits of New Structure

1. **Easier Navigation**: Clear folder hierarchy makes finding code intuitive
2. **Better Maintainability**: Related code is grouped together
3. **Cleaner Imports**: Centralized exports reduce import complexity
4. **Reduced Duplication**: Duplicate files identified and moved
5. **Clear Separation**: Debug code separated from production code
6. **Future-Proof**: Structure supports growth and new features

## 🔧 Maintenance

- **Regular Cleanup**: Periodically review `OLD_LEGACY/` for files that can be deleted
- **Import Updates**: Update imports when moving files between folders
- **Index Files**: Keep index files updated when adding new exports
- **Documentation**: Update this README when making structural changes
