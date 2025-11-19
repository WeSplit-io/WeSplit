# Participant Invitation Architecture

## Overview
Unified, reusable architecture for inviting participants to both **Splits** and **Shared Wallets**. This eliminates code duplication and ensures consistent behavior across the codebase.

## Architecture

### 1. Service Layer (Business Logic)

#### `SplitParticipantInvitationService`
**Location:** `src/services/splits/SplitParticipantInvitationService.ts`

**Purpose:** Handles all split participant invitation logic

**Key Methods:**
- `inviteParticipants()` - Invites multiple contacts to a split
- `isContactAlreadyParticipant()` - Checks if contact is already a participant
- `filterExistingParticipants()` - Filters out existing participants

**Features:**
- Fetches latest user data for wallet addresses
- Adds participants to split database
- Updates split wallet participants if wallet exists
- Sends invitation notifications
- Handles errors gracefully

#### `ParticipantInvitationService`
**Location:** `src/services/sharedWallet/ParticipantInvitationService.ts`

**Purpose:** Handles all shared wallet participant invitation logic

**Key Methods:**
- `inviteParticipants()` - Invites multiple contacts to a shared wallet
- `isContactAlreadyMember()` - Checks if contact is already a member
- `filterExistingMembers()` - Filters out existing members

**Features:**
- Validates permissions (creator or active member)
- Checks wallet settings (allowMemberInvites, maxMembers)
- Adds members with 'invited' status
- Prevents duplicate members

### 2. UI Layer (User Interface)

#### `ContactsScreen`
**Location:** `src/screens/Contacts/ContactsScreen.tsx`

**Purpose:** Unified contact selection screen for both splits and shared wallets

**Actions Supported:**
- `'split'` - Add participants to a split
- `'sharedWallet'` - Add participants to a shared wallet
- `'send'` - Send money to a contact
- `'request'` - Request money from a contact

**Features:**
- Multi-select mode for splits and shared wallets
- Prevents selection of existing participants/members
- Returns selected contacts via navigation params
- Full-screen display (no cramped modals)

#### `SplitDetailsScreen`
**Location:** `src/screens/SplitDetails/SplitDetailsScreen.tsx`

**Usage:**
- Navigates to `Contacts` screen with `action: 'split'`
- Processes `selectedContacts` from route params
- Uses `SplitParticipantInvitationService` for invitation logic

#### `SharedWalletSettingsScreen`
**Location:** `src/screens/SharedWallet/SharedWalletSettingsScreen.tsx`

**Usage:**
- Navigates to `Contacts` screen with `action: 'sharedWallet'`
- Processes `selectedContacts` from route params
- Uses `ParticipantInvitationService` for invitation logic

## Data Flow

### Split Invitation Flow
```
SplitDetailsScreen
  ↓ (navigate)
ContactsScreen (action: 'split')
  ↓ (user selects contacts)
ContactsScreen (returns selectedContacts)
  ↓ (route params)
SplitDetailsScreen
  ↓ (useEffect processes selectedContacts)
SplitParticipantInvitationService.inviteParticipants()
  ↓
SplitStorageService.addParticipant()
  ↓
SplitWalletManagement.updateSplitWalletParticipants() (if wallet exists)
  ↓
notificationService.sendNotification()
```

### Shared Wallet Invitation Flow
```
SharedWalletSettingsScreen
  ↓ (navigate)
ContactsScreen (action: 'sharedWallet')
  ↓ (user selects contacts)
ContactsScreen (returns selectedContacts)
  ↓ (route params)
SharedWalletSettingsScreen
  ↓ (useEffect processes selectedContacts)
ParticipantInvitationService.inviteParticipants()
  ↓
SharedWalletService.inviteToSharedWallet()
  ↓
Firebase update (sharedWallets collection)
```

## Benefits

### ✅ Code Reusability
- Single `ContactsScreen` for all contact selection needs
- Reusable service classes for business logic
- No duplication of invitation logic

### ✅ Consistency
- Same UX pattern for splits and shared wallets
- Consistent error handling
- Unified notification system

### ✅ Maintainability
- Business logic separated from UI
- Easy to add new invitation features
- Centralized changes affect all flows

### ✅ Better UX
- Full-screen contact selection (no cramped modals)
- Proper search and filtering
- Multi-select support
- Prevents duplicate invitations

## Key Design Decisions

1. **Navigation Pattern**: Both flows navigate to `ContactsScreen` instead of embedding `ContactsList` in modals
2. **Service Layer**: Business logic extracted to reusable services
3. **Route Params**: Selected contacts passed via navigation params for clean data flow
4. **Filtering**: Services handle filtering of existing participants/members
5. **Notifications**: Notification logic included in services for consistency

## Files Modified/Created

### New Files
- `src/services/splits/SplitParticipantInvitationService.ts`
- `src/services/sharedWallet/ParticipantInvitationService.ts`
- `docs/features/PARTICIPANT_INVITATION_ARCHITECTURE.md`

### Modified Files
- `src/screens/Contacts/ContactsScreen.tsx` - Added `sharedWallet` action support
- `src/screens/SplitDetails/SplitDetailsScreen.tsx` - Refactored to use service
- `src/screens/SharedWallet/SharedWalletSettingsScreen.tsx` - Refactored to use navigation pattern
- `src/services/sharedWallet/index.ts` - Implemented `inviteToSharedWallet` method

## Future Enhancements

1. **Batch Notifications**: Optimize notification sending for multiple invitations
2. **Invitation Status Tracking**: Track invitation acceptance/rejection
3. **Invitation Expiry**: Add expiration logic for invitations
4. **Resend Invitations**: Allow resending failed invitations
5. **Invitation Analytics**: Track invitation success rates

