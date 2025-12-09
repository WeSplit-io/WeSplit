# Deprecated Send Components

This folder contains deprecated send-related components that have been replaced by the centralized transaction system.

## Deprecated Components

### `SendComponent.tsx`
**Status:** ⚠️ **STILL IN USE** - Used in `SpendSplitScreen.tsx`  
**Replacement:** `CentralizedTransactionModal` or `CentralizedTransactionScreen`  
**Migration:** Should be migrated to use centralized transaction handler

**Location:** `src/components/shared/SendComponent.tsx` (not moved yet - still in use)

### `SendConfirmation.tsx`
**Status:** ⚠️ **STILL IN USE** - Used in `SpendSplitScreen.tsx`  
**Replacement:** `CentralizedTransactionModal` with confirmation flow  
**Migration:** Should be migrated to use centralized transaction handler

**Location:** `src/components/shared/SendConfirmation.tsx` (not moved yet - still in use)

## Migration Plan

1. **Phase 1:** Update `SpendSplitScreen.tsx` to use `CentralizedTransactionModal` instead of `SendComponent`
2. **Phase 2:** Remove `SendComponent` and `SendConfirmation` after migration
3. **Phase 3:** Move deprecated components to this folder

## Notes

- These components are kept for backward compatibility during migration
- All new transaction flows should use `CentralizedTransactionModal` or `CentralizedTransactionScreen`
- The centralized components match the styles from `SpendPaymentModal.tsx` exactly
