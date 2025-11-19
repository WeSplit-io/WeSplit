# Shared Wallet Feature - UI/UX Integration Plan

## 📍 Navigation Integration Points

### 1. **Main Navigation Bar (Bottom Tab Bar) - UPDATED APPROACH**
Currently has: Home, Pools (SplitsList), Split (BillCamera), Rewards, Contacts

**✅ IMPLEMENTED APPROACH:**
- **Center Button (Split)**: Opens a Modal with choice between:
  - "Create Split" → Navigate to BillCamera (existing flow)
  - "Create Shared Wallet" → Navigate to CreateSharedWallet (new flow)
- **Pools Tab (SplitsList)**: Enhanced with Tabs component at top:
  - Tab 1: "Splits" → Shows existing splits with filters (All, Active, Closed)
  - Tab 2: "Shared Wallets" → Shows shared wallets list
- **Filter Tabs**: Only visible when "Splits" tab is active

**Benefits**:
- ✅ Keeps NavBar clean (no new tab needed)
- ✅ Natural discovery through center button
- ✅ Unified view in Pools tab
- ✅ Clear separation between Splits and Shared Wallets

---

## 🎨 Screen Structure

### Screen Hierarchy
```
SharedWalletsList (Main List)
  ├── SharedWalletDetails (View/Manage)
  │   ├── SharedWalletFunding (Add Funds)
  │   │   ├── FundFromInAppWallet
  │   │   ├── FundFromExternalWallet
  │   │   └── FundViaMoonPay
  │   ├── SharedWalletInvite (Invite Users)
  │   ├── SharedWalletSettings (Settings)
  │   └── SharedWalletTransactions (Transaction History)
  └── CreateSharedWallet (Create New)
```

---

## 📱 Screen Details

### 1. **SplitsList Screen** (Enhanced with Tabs)
**Location**: Pools tab in NavBar

**Layout**:
```
┌─────────────────────────────────┐
│  Pools                    [+ New] │ ← Header with create button
├─────────────────────────────────┤
│  [Tabs: Splits | Shared Wallets] │ ← NEW: Top-level tabs
├─────────────────────────────────┤
│  [Filter: All | Active | Closed] │ ← Only shown when "Splits" tab active
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ Split/Shared Wallet Cards  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Shared Wallets View** (when "Shared Wallets" tab active):
```
┌─────────────────────────────────┐
│  Pools                    [+ New] │
├─────────────────────────────────┤
│  [Tabs: Splits | Shared Wallets] │ ← "Shared Wallets" selected
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ 🏠 Apartment Rent          │  │ ← Shared Wallet Card
│  │ $1,250.00 USDC            │  │
│  │ 👥 3 members              │  │
│  │ You: $416.67              │  │
│  │ [View Details →]          │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```
│  ┌───────────────────────────┐  │
│  │ 🏠 Apartment Rent          │  │ ← Wallet Card
│  │ $1,250.00 USDC            │  │
│  │ 👥 3 members              │  │
│  │ You: $416.67              │  │
│  │ [View Details →]          │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 🎉 Party Fund              │  │
│  │ $500.00 USDC              │  │
│  │ 👥 5 members              │  │
│  │ You: $100.00              │  │
│  │ [View Details →]          │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Features**:
- List of all shared wallets user is part of
- Filter: All / My Wallets (created by me) / Shared With Me
- Each card shows: Name, Total Balance, Member Count, User's Share
- Pull to refresh
- Empty state with "Create Shared Wallet" CTA

---

### 2. **CreateChoiceModal** (NEW - Entry Point)
**Location**: Opens when center button (Split) in NavBar is clicked

**Layout**:
```
┌─────────────────────────────────┐
│  ──── (Handle)                  │
├─────────────────────────────────┤
│  Create New                     │
│  Choose what you want to create │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ 📄 Create Split           │  │
│  │    Split a bill with      │  │
│  │    friends                │  │
│  │    [Select →]             │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 💰 Create Shared Wallet    │  │
│  │    Shared account for     │  │
│  │    ongoing expenses       │  │
│  │    [Select →]             │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Flow**:
- User clicks center button → Modal opens
- User selects option → Modal closes → Navigate to appropriate screen

### 3. **CreateSharedWallet Screen**
**Entry Point**: Selected from CreateChoiceModal

**Layout**:
```
┌─────────────────────────────────┐
│  ← Create Shared Wallet         │
├─────────────────────────────────┤
│                                  │
│  Wallet Name                     │
│  [________________]              │
│                                  │
│  Description (Optional)          │
│  [________________]              │
│  [________________]              │
│                                  │
│  Initial Members                │
│  ┌───────────────────────────┐  │
│  │ 👤 You (Creator)          │  │
│  │ 👤 John Doe        [×]    │  │
│  │ 👤 Jane Smith      [×]    │  │
│  └───────────────────────────┘  │
│  [+ Add Members]                 │
│                                  │
│  [Create Shared Wallet]          │
└─────────────────────────────────┘
```

**Flow**:
1. Enter wallet name
2. (Optional) Add description
3. Add initial members (from contacts)
4. Create wallet → Navigate to SharedWalletDetails

---

### 3. **SharedWalletDetails Screen** (Main Management)
**Layout**:
```
┌─────────────────────────────────┐
│  ← Apartment Rent        [⚙️]   │ ← Settings icon
├─────────────────────────────────┤
│                                  │
│  Total Balance                   │
│  $1,250.00 USDC                 │
│                                  │
│  Your Share                      │
│  $416.67 USDC                   │
│                                  │
│  ┌───────────────────────────┐  │
│  │ [+ Add Funds]             │  │ ← Primary action
│  └───────────────────────────┘  │
│                                  │
│  Members (3)                     │
│  ┌───────────────────────────┐  │
│  │ 👤 You (Creator)          │  │
│  │    $416.67               │  │
│  │ 👤 John Doe               │  │
│  │    $416.67               │  │
│  │ 👤 Jane Smith             │  │
│  │    $416.67               │  │
│  └───────────────────────────┘  │
│  [+ Invite Members]              │
│                                  │
│  Recent Activity                 │
│  ┌───────────────────────────┐  │
│  │ 💰 You added $100.00      │  │
│  │   2 hours ago             │  │
│  │ 💸 John paid $50.00       │  │
│  │   1 day ago               │  │
│  └───────────────────────────┘  │
│                                  │
│  [View All Transactions]          │
└─────────────────────────────────┘
```

**Features**:
- View total balance and user's share
- Add funds button (primary action)
- Member list with individual contributions
- Invite members
- Recent transactions
- Settings (for creator only)

---

### 4. **SharedWalletFunding Screen** (Add Funds)
**Layout**:
```
┌─────────────────────────────────┐
│  ← Add Funds to Apartment Rent  │
├─────────────────────────────────┤
│                                  │
│  Amount                          │
│  $[_____.__] USDC               │
│                                  │
│  Fund From                       │
│  ┌───────────────────────────┐  │
│  │ 💰 In-App Wallet          │  │
│  │    Balance: $500.00       │  │
│  │    [Select →]             │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 🔗 External Wallet        │  │
│  │    Phantom, Solflare...  │  │
│  │    [Select →]             │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 💳 Credit/Debit Card      │  │
│  │    Via MoonPay            │  │
│  │    [Select →]             │  │
│  └───────────────────────────┘  │
│                                  │
│  [Continue]                      │
└─────────────────────────────────┘
```

**Flow**:
1. Enter amount
2. Select funding source
3. Navigate to specific funding screen
4. Complete transaction
5. Return to SharedWalletDetails with success message

---

### 5. **SharedWalletInvite Screen**
**Layout**:
```
┌─────────────────────────────────┐
│  ← Invite to Apartment Rent     │
├─────────────────────────────────┤
│                                  │
│  Current Members (3)             │
│  ┌───────────────────────────┐  │
│  │ 👤 You                    │  │
│  │ 👤 John Doe               │  │
│  │ 👤 Jane Smith             │  │
│  └───────────────────────────┘  │
│                                  │
│  Invite New Members              │
│  ┌───────────────────────────┐  │
│  │ 🔍 Search contacts...      │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 👤 Mike Johnson    [+ Add]│  │
│  │ 👤 Sarah Wilson   [+ Add] │  │
│  └───────────────────────────┘  │
│                                  │
│  [Send Invitations]              │
└─────────────────────────────────┘
```

---

## 🎯 Entry Points Summary

### Primary Entry Points:
1. **NavBar Tab**: "Shared Wallets" (new tab)
2. **Dashboard Action**: "Shared Wallet" button in action grid
3. **SplitsList**: Optional filter/toggle (if not separate tab)

### Secondary Entry Points:
- Profile/Settings: "My Shared Wallets" section
- Transaction History: Link to shared wallet if transaction is from shared wallet

---

## 🔄 User Flows

### Flow 1: Create & Fund Shared Wallet
```
Dashboard → [+ Shared Wallet] 
  → CreateSharedWallet 
  → SharedWalletDetails 
  → [+ Add Funds] 
  → SharedWalletFunding 
  → [Select: In-App Wallet] 
  → Confirmation 
  → Success → Back to SharedWalletDetails
```

### Flow 2: Invite & Top Up
```
SharedWalletsList → [Select Wallet] 
  → SharedWalletDetails 
  → [+ Invite Members] 
  → SharedWalletInvite 
  → [Send Invitations] 
  → Back to SharedWalletDetails 
  → [+ Add Funds] 
  → [Select: MoonPay] 
  → MoonPay Flow 
  → Success
```

### Flow 3: Use Funds on Linked Card
```
SharedWalletDetails 
  → [Use Funds] 
  → Select Linked Card 
  → Enter Amount 
  → Confirm Transfer 
  → Success
```

---

## 🎨 Design Considerations

### Visual Differentiation from Splits:
- **Color**: Use different accent color (e.g., blue/purple vs green for splits)
- **Icon**: Wallet/Users icon vs Split icon
- **Card Style**: Slightly different card design to distinguish

### Consistency:
- Use same design system (colors, spacing, typography)
- Follow existing patterns from SplitsList
- Use same components (Avatar, Button, Modal, etc.)

---

## 📋 Implementation Checklist

### Phase 1: Navigation & List
- [ ] Add "Shared Wallets" to NavBar
- [ ] Create SharedWalletsList screen
- [ ] Add route to App.tsx
- [ ] Create empty state component
- [ ] Add filter functionality

### Phase 2: Creation Flow
- [ ] Create CreateSharedWallet screen
- [ ] Integrate contact picker
- [ ] Add wallet creation logic
- [ ] Add navigation flow

### Phase 3: Details & Management
- [ ] Create SharedWalletDetails screen
- [ ] Add member list component
- [ ] Add transaction history
- [ ] Add settings screen

### Phase 4: Funding
- [ ] Create SharedWalletFunding screen
- [ ] Integrate in-app wallet funding
- [ ] Integrate external wallet funding
- [ ] Integrate MoonPay funding

### Phase 5: Invitations
- [ ] Create SharedWalletInvite screen
- [ ] Add invitation service
- [ ] Add notification system

### Phase 6: Card Integration
- [ ] Add "Use Funds" flow
- [ ] Integrate with LinkedWalletService
- [ ] Add transfer to card functionality

---

## 🚀 Implementation Status

### ✅ Completed:
1. **CreateChoiceModal Component** - Created modal for choosing between Split and Shared Wallet
2. **NavBar Integration** - Center button now opens modal instead of direct navigation
3. **SplitsListScreen Tabs** - Added top-level tabs (Splits | Shared Wallets)
4. **Conditional Filters** - Filter tabs only show when "Splits" tab is active
5. **Shared Wallet Types** - Complete type definitions (`src/services/sharedWallet/types.ts`)
6. **SharedWalletCreation Service** - Wallet creation with validation and error handling
7. **SharedWalletService** - Main orchestrator with lazy loading
8. **Secure Private Key Storage** - Reuses Degen Split encryption system
9. **Architecture Documentation** - Comprehensive README with data flow diagrams
10. **Best Practices** - Separation of concerns, type safety, error handling, logging

### 🔄 Next Steps:
1. **Create CreateSharedWallet Screen** - UI screen for creating new shared wallet
2. **Set up navigation routes** in App.tsx (CreateSharedWallet, SharedWalletDetails, etc.)
3. **Implement Shared Wallets List** - Replace empty state with actual list rendering
4. **Add funding flows** - In-app wallet, external wallet, MoonPay integration
5. **Implement invitation system** - Invite users to shared wallets
6. **Add withdrawal functionality** - Withdraw to linked cards or personal wallets

---

## 📝 Notes

- Shared wallets are **persistent** (unlike splits which are bill-based)
- Users can be in **multiple shared wallets**
- Each wallet has a **shared private key** (like Degen Split, but more secure)
- All members can **view balance** and **add funds**
- Only creator can **invite/remove members** (or make it democratic?)
- Funds can be used on **any linked card** of any member

