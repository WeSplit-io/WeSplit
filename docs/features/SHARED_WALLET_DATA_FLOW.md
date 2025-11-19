# Shared Wallet Data Flow & Best Practices

## Overview
This document outlines the complete data flow for the shared wallet feature, ensuring proper integration between card linking, funding, and withdrawal operations.

## Data Flow Architecture

### 1. Card Linking Flow

#### Flow A: Link Existing Card (via Modal)
```
SharedWalletDetailsScreen
  └─> User clicks "Link Card" button
      └─> Opens LinkCardModal
          └─> Shows list of available cards (from LinkedWalletService)
              └─> User selects card
                  └─> SharedWalletService.linkCardToSharedWallet()
                      └─> Updates Firestore: adds cardId to member.linkedCards[]
                          └─> Reloads wallet data
                              └─> Card appears in "Your Linked Cards" section
```

#### Flow B: Add New Card (via LinkedCards Screen)
```
SharedWalletDetailsScreen
  └─> User clicks "Add Card" (when no cards available)
      └─> Navigates to LinkedCardsScreen with returnRoute params
          └─> User adds new card via AddDestinationSheet
              └─> LinkedWalletService.addLinkedWallet()
                  └─> Card saved to user's linked wallets
                      └─> Navigation back to SharedWalletDetailsScreen
                          └─> Passes newlyAddedCard in route params
                              └─> Auto-linking useEffect detects newlyAddedCard
                                  └─> SharedWalletService.linkCardToSharedWallet()
                                      └─> Card automatically linked to shared wallet
                                          └─> Success alert shown
```

### 2. Top-Up Flow

```
SharedWalletDetailsScreen
  └─> User clicks "Top Up" button
      └─> Opens TopUpModal
          └─> User enters amount and selects source
              ├─> Option A: In-App Wallet
              │   └─> SharedWalletService.fundSharedWallet()
              │       └─> SharedWalletFunding.fundSharedWallet()
              │           ├─> Validates user is member
              │           ├─> Gets app wallet private key
              │           ├─> Executes USDC transfer (Solana transaction)
              │           ├─> Updates wallet.totalBalance
              │           ├─> Updates member.totalContributed
              │           └─> Records transaction in sharedWalletTransactions
              │
              └─> Option B: MoonPay
                  └─> Navigates to DepositScreen with targetWallet
                      └─> MoonPay widget opens
                          └─> User completes payment
                              └─> Funds arrive at shared wallet address
                                  └─> onSuccess callback triggers
                                      └─> Reloads wallet data
```

### 3. Withdrawal Flow

```
SharedWalletDetailsScreen
  └─> User clicks "Withdraw" button
      └─> Opens WithdrawModal
          └─> User selects card (if multiple available)
              └─> User enters amount
                  └─> Validates:
                      ├─> Amount > 0
                      ├─> Amount <= wallet.totalBalance
                      └─> Amount <= userAvailableBalance
                      └─> SharedWalletService.withdrawFromSharedWallet()
                          └─> SharedWalletWithdrawal.withdrawFromSharedWallet()
                              ├─> Validates user is member
                              ├─> Checks user available balance
                              ├─> Gets card info from ExternalCardService
                              ├─> Gets shared wallet private key (via SplitWalletSecurity)
                              ├─> Executes USDC transfer to card address
                              ├─> Updates wallet.totalBalance
                              ├─> Updates member.totalWithdrawn
                              └─> Records transaction in sharedWalletTransactions
```

## Data Synchronization

### Auto-Reload Mechanisms

1. **useFocusEffect**: Reloads wallet and cards when screen comes into focus
   - Triggered when returning from LinkedCards screen
   - Ensures fresh data after card operations

2. **Route Params**: Handles newly added cards
   - `newlyAddedCard` param triggers auto-linking
   - Prevents duplicate linking attempts

3. **Post-Operation Reloads**: All operations reload data after completion
   - Top-up: Reloads wallet to show updated balance
   - Withdrawal: Reloads wallet to show updated balance
   - Card linking: Reloads wallet and cards list

## Best Practices Applied

### 1. Single Source of Truth
- **Firestore**: All shared wallet data stored in `sharedWallets` collection
- **Linked Cards**: Stored in user's `linkedWallets` collection
- **Transactions**: Recorded in `sharedWalletTransactions` collection

### 2. Service Layer Separation
- **SharedWalletService**: Orchestrator service (index.ts)
- **SharedWalletFunding**: Handles all funding operations
- **SharedWalletWithdrawal**: Handles all withdrawal operations
- **SharedWalletCreation**: Handles wallet creation
- **SplitWalletSecurity**: Reused for private key encryption/decryption

### 3. Error Handling
- All service methods return `{ success: boolean, error?: string }`
- UI shows user-friendly error messages
- Errors logged for debugging

### 4. Data Validation
- **Top-up**: Validates amount, source availability, user membership
- **Withdrawal**: Validates amount, balance, user balance, card availability
- **Card Linking**: Validates user membership, card existence

### 5. State Management
- **Local State**: UI state (modals, loading, form inputs)
- **Service Calls**: Async operations with proper loading states
- **Data Refresh**: Automatic reloads after operations

### 6. Navigation Flow
- **Return Routes**: Proper handling of returnRoute/returnParams
- **Auto-linking**: Seamless card linking after adding new card
- **Deep Linking**: Support for walletId in route params

## Code Quality

### Performance Optimizations
- **useCallback**: Memoized functions to prevent unnecessary re-renders
- **useMemo**: Computed values cached (userLinkedCards, userBalance)
- **Lazy Loading**: Services loaded on-demand via dynamic imports

### Type Safety
- **TypeScript**: Full type coverage for all interfaces
- **Type Guards**: Proper null/undefined checks
- **Interface Definitions**: Clear contracts between components

### Code Organization
- **Modular Services**: Each service has single responsibility
- **Reusable Components**: Shared UI components (Modal, Button, Input)
- **Consistent Patterns**: Similar operations follow same patterns

## Testing Checklist

### Card Linking
- [ ] Link existing card via modal
- [ ] Add new card and auto-link
- [ ] Unlink card
- [ ] Handle no cards available state
- [ ] Handle all cards already linked state

### Top-Up
- [ ] Top-up from in-app wallet
- [ ] Top-up via MoonPay
- [ ] Validate insufficient balance
- [ ] Validate invalid amount
- [ ] Verify balance updates correctly

### Withdrawal
- [ ] Withdraw to linked card
- [ ] Validate insufficient balance
- [ ] Validate amount exceeds user balance
- [ ] Verify balance updates correctly
- [ ] Verify member withdrawal tracking

### Data Flow
- [ ] Verify auto-reload on focus
- [ ] Verify data sync after operations
- [ ] Verify proper error handling
- [ ] Verify loading states

## Future Enhancements

1. **Real-time Updates**: Firestore listeners for live balance updates
2. **Transaction History**: Display transaction list in details screen
3. **Member Management**: Invite/remove members functionality
4. **Settings**: Wallet settings management
5. **Notifications**: Push notifications for transactions

