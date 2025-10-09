# Linked Wallets Implementation

## Overview
This implementation allows users to link multiple external wallets and KAST cards to their accounts, with data stored in Firebase subcollections for proper organization and scalability.

## Key Features

### 1. Firebase Subcollections
- **External Wallets**: Stored in `users/{userId}/externalWallets/` subcollection
- **KAST Cards**: Stored in `users/{userId}/kastCards/` subcollection
- Each document has a unique Firebase document ID for direct access

### 2. Data Structure

#### External Wallet Document
```typescript
{
  id: string;                    // Unique identifier
  label: string;                 // User-friendly name
  address: string;               // Wallet address
  chain: string;                 // Blockchain (default: 'solana')
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
}
```

#### KAST Card Document
```typescript
{
  id: string;                    // Unique identifier
  label: string;                 // User-friendly name
  identifier: string;            // KAST card identifier
  identifierMasked: string;      // Masked for display
  last4: string;                 // Last 4 characters
  address: string;               // Same as identifier (compatibility)
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
}
```

### 3. Service Methods

#### LinkedWalletsService
- `getLinkedDestinations(userId)` - Get all wallets and cards
- `getExternalWallets(userId)` - Get external wallets only
- `getKastCards(userId)` - Get KAST cards only
- `addExternalWallet(userId, walletData)` - Add new external wallet
- `addKastCard(userId, cardData)` - Add new KAST card
- `removeExternalWallet(userId, walletId)` - Remove external wallet
- `removeKastCard(userId, cardId)` - Remove KAST card
- `clearAllLinkedDestinations(userId)` - Clear all linked destinations

### 4. Validation
- **Wallet Addresses**: Validated using existing `validateAddress` function
- **KAST Identifiers**: Validated using existing `validateKastIdentifier` function
- **Duplicate Prevention**: Checks for existing addresses/identifiers before adding

### 5. Sorting and Ordering
- Wallets and cards are ordered by creation date (newest first)
- Uses Firebase `orderBy('createdAt', 'desc')` for consistent sorting

### 6. User Interface

#### LinkedCardsScreen
- Displays all linked wallets and KAST cards
- Add new destinations via modal
- Remove existing destinations with confirmation
- Loading states and error handling

#### AddDestinationSheet
- Toggle between wallet and KAST card types
- Form validation with real-time feedback
- Loading states during save operations
- Form reset after successful addition

### 7. Error Handling
- Comprehensive error logging
- User-friendly error messages
- Graceful fallbacks for failed operations

## Usage Flow

1. **User opens Linked Cards screen**
   - Loads existing wallets and cards from Firebase
   - Displays in sorted order (newest first)

2. **User adds new wallet/card**
   - Opens AddDestinationSheet modal
   - Fills in required information
   - Validates input data
   - Saves to Firebase subcollection
   - Updates UI with new item
   - Resets form for next addition

3. **User removes wallet/card**
   - Confirms removal action
   - Deletes from Firebase subcollection
   - Updates UI to remove item

## Benefits

### Scalability
- Firebase subcollections scale automatically
- No need to manage large arrays in single documents
- Efficient querying and pagination support

### Data Integrity
- Each wallet/card is a separate document
- Atomic operations for add/remove
- Proper validation and duplicate prevention

### User Experience
- Multiple wallets can be added independently
- Form resets after each successful addition
- Clear feedback and error handling
- Sorted display for easy management

## Testing

A demo utility is provided in `src/utils/linkedWalletsDemo.ts` that tests:
- Adding multiple wallets
- Adding KAST cards
- Retrieving and sorting
- Duplicate prevention
- Removal operations
- Error handling

## Security

- All data is stored in Firebase with proper security rules
- User can only access their own linked destinations
- Validation prevents invalid data entry
- Secure document IDs prevent unauthorized access

## Future Enhancements

- Edit existing wallets/cards
- Bulk operations
- Import/export functionality
- Wallet balance checking
- Transaction history per wallet
- Wallet categorization and tagging
