# Shared Wallet Navigation Flow

## ✅ Complete Navigation Flow

### 1. **NavBar Center Button → CreateChoiceModal**
- **Location**: Bottom navigation bar, center button
- **Action**: Click center button (Split icon)
- **Result**: Opens `CreateChoiceModal` with two options:
  - "Create Split" → Navigate to `BillCamera`
  - "Create Shared Wallet" → Navigate to `CreateSharedWallet`

### 2. **CreateChoiceModal → CreateSharedWallet**
- **User selects**: "Create Shared Wallet"
- **Navigation**: `navigation.navigate('CreateSharedWallet')`
- **Modal closes**: Automatically after selection

### 3. **CreateSharedWallet → Form Completion**
- **User fills**: Wallet name, description, adds members
- **On submit**: Creates wallet via `SharedWalletService.createSharedWallet()`
- **On success**: 
  - Navigates to `SplitsList` with `activeTab: 'sharedWallets'` param
  - Uses `navigation.replace()` to prevent back navigation to creation screen
  - Shows success alert after navigation

### 4. **SplitsListScreen → Shared Wallets Tab**
- **Route params**: Accepts `activeTab` param to set initial tab
- **Tab switching**: User can switch between "Splits" and "Shared Wallets"
- **Empty state**: Shows "Create Shared Wallet" button (not split)
- **List display**: Shows `SharedWalletCard` components for each wallet

### 5. **Empty State → Create Shared Wallet**
- **Location**: When `sharedWallets.length === 0` and `activeTab === 'sharedWallets'`
- **Button**: "Create Shared Wallet"
- **Action**: Calls `handleCreateSharedWallet()` → Navigates to `CreateSharedWallet`

## 🔄 Complete User Journey

```
1. User clicks center button in NavBar
   ↓
2. CreateChoiceModal opens
   ↓
3. User selects "Create Shared Wallet"
   ↓
4. Modal closes, navigates to CreateSharedWallet screen
   ↓
5. User fills form and submits
   ↓
6. Wallet created successfully
   ↓
7. Navigate to SplitsList with sharedWallets tab active
   ↓
8. User sees new wallet in list
```

## 📋 Key Implementation Details

### Route Params Handling
```typescript
// SplitsListScreen accepts route params
const routeParams = route?.params || {};
const initialTab = routeParams.activeTab as 'splits' | 'sharedWallets' | undefined;

// CreateSharedWallet navigates with params
navigation.replace('SplitsList', { activeTab: 'sharedWallets' });
```

### Empty State Button
```typescript
// Empty state button correctly uses handleCreateSharedWallet
<Button
  title="Create Shared Wallet"
  onPress={handleCreateSharedWallet}  // ✅ Correct handler
  variant="primary"
  size="large"
/>
```

### Tab State Management
```typescript
// Initial tab from route params
const [activeTab, setActiveTab] = useState<'splits' | 'sharedWallets'>(
  initialTab || 'splits'
);

// Update tab when route params change
useEffect(() => {
  if (initialTab && initialTab !== activeTab) {
    setActiveTab(initialTab);
  }
}, [initialTab, activeTab]);
```

## ✅ Verification Checklist

- [x] NavBar center button opens CreateChoiceModal
- [x] CreateChoiceModal has "Create Shared Wallet" option
- [x] CreateSharedWallet screen is accessible
- [x] Navigation returns to SplitsList with sharedWallets tab active
- [x] Empty state button creates shared wallet (not split)
- [x] Tab switching works correctly
- [x] Route params properly set active tab
- [x] Loading states show during wallet creation
- [x] Success feedback after creation
- [x] Error handling for failed creation

## 🎯 Best Practices Applied

1. **Navigation**: Uses `replace()` instead of `navigate()` to prevent back navigation to creation screen
2. **Route Params**: Properly passes and handles route params for tab state
3. **User Feedback**: Shows success alert after navigation
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Loading States**: Shows loading indicators during async operations
6. **Empty States**: Clear CTAs in empty states
7. **Consistent UX**: Follows existing app patterns and design system

