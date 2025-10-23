# OLD_LEGACY - Legacy Code Archive

This folder contains legacy code that has been replaced by newer implementations or is no longer used in the active codebase. This includes deprecated services, duplicate files, and old group/expense logic that has been replaced by the new bills and splits system.

## 📁 Folder Structure

```
src/OLD_LEGACY/
├── screens/                    # Legacy group-related screens
│   ├── GroupsList/
│   ├── GroupDetails/
│   ├── GroupSettings/
│   ├── GroupCreated/
│   ├── AddExpense/
│   ├── Balance/
│   ├── AddMembers/
│   ├── CreateGroup/
│   └── SettleUp/
├── components/                 # Legacy group-related components
│   ├── GroupCard.tsx
│   ├── GroupCard.styles.ts
│   └── ExpenseItem.tsx
├── services/                   # Legacy group-related services
│   └── balanceCalculator.ts
├── deprecated_services/        # Deprecated service implementations
│   ├── solanaWallet.deprecated.ts
│   └── walletService.deprecated.ts
├── deprecated_services_duplicates/  # Duplicate services moved to legacy
│   ├── notificationService.ts
│   ├── firebaseDataService.ts
│   └── firebaseFunctionsService.ts
├── deprecated_utils_duplicates/     # Duplicate utility files
│   └── priceUtils.ts
├── root_level_services/        # Services that were at root level
│   └── WalletService.ts
├── store/                     # Legacy store slices
│   ├── groupsSlice.ts
│   └── expensesSlice.ts
├── debug_utils/               # Debug utilities
├── deprecated_duplicates/     # Other deprecated duplicates
├── unused/                    # Unused files
└── README.md                  # This file
```

## 🚫 What Was Removed

### Recent Cleanup (2024)
- **Deprecated Services**: `solanaWallet.deprecated.ts`, `walletService.deprecated.ts`
- **Duplicate Services**: Root-level `notificationService.ts`, `firebaseDataService.ts`, `firebaseFunctionsService.ts`
- **Duplicate Utils**: Root-level `priceUtils.ts`
- **Root-level Services**: `WalletService.ts` (moved to proper structure)

### Legacy Group/Expense System
- **GroupsList** - List of user groups
- **GroupDetails** - Individual group details and management
- **GroupSettings** - Group configuration and settings
- **GroupCreated** - Group creation success screen
- **AddExpense** - Add expenses to groups
- **Balance** - Group balance and settlement
- **AddMembers** - Add members to groups
- **CreateGroup** - Create new groups
- **SettleUp** - Group settlement modal

### Components
- **GroupCard** - Group display card component
- **ExpenseItem** - Individual expense item component

### Services
- **balanceCalculator** - Group balance calculation utilities

### Store Slices
- **groupsSlice** - Group state management
- **expensesSlice** - Expense state management

## ✅ What Remains Active

The following components were **NOT** moved to legacy because they are still used in the current app:

- **GroupIcon** - Used for displaying category icons in splits (not group-specific)
- **BalanceRow** - Used for displaying balance information (generic component)

## 🔄 Migration Notes

The group/expense/item logic has been completely replaced with:
- **Bills and Splits** - New bill splitting functionality
- **P2P Transfers** - Direct peer-to-peer transactions
- **Unified Notifications** - Clean notification system for splits and payments

## 📝 Usage

This legacy code should **NOT** be imported or used in the active codebase. It is kept for:
- Historical reference
- Potential future reuse
- Migration documentation
- Debugging purposes

If you need to reference this code, please do so by reading the files directly rather than importing them.