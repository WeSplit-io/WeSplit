# Asset Data Flow and Display Audit

**Date:** 2024-12-19  
**Scope:** Badges, profile assets, and wallet backgrounds across the app  
**Focus:** Data flow, display locations, and missing references

## Executive Summary

This audit verifies the complete data flow and display of user assets (badges, profile assets, wallet backgrounds) across the entire codebase. It identifies:
1. ✅ All data fetching and transformation points
2. ✅ All current display locations
3. ⚠️ Missing display opportunities
4. ✅ Data flow verification

**Overall Status:** ✅ **Data Flow Complete** | ⚠️ **Display Coverage: 2/10+ locations**

---

## 1. Data Flow Architecture

### 1.1 Database → Service Layer ✅

**Location:** `src/services/data/firebaseDataService.ts`

**Transformer:** `firestoreToUser(doc: DocumentData): User`
- **Line 79:** `badges: doc.data().badges || []`
- **Line 80:** `active_badge: doc.data().active_badge || undefined`
- **Line 81:** `profile_assets: doc.data().profile_assets || []`
- **Line 82:** `active_profile_asset: doc.data().active_profile_asset || undefined`
- **Line 83:** `wallet_backgrounds: doc.data().wallet_backgrounds || []`
- **Line 84:** `active_wallet_background: doc.data().active_wallet_background || undefined`

**Status:** ✅ **Fully Implemented** - All asset fields are fetched from Firestore

---

### 1.2 Service Layer → User Document ✅

**Location:** `src/services/data/firebaseDataService.ts`

**Methods:**
- ✅ `getCurrentUser(userId)` - Line 290
- ✅ `getUserByEmail(email)` - Line 350
- ✅ `getUserByWalletAddress(walletAddress)` - Line 367

**Status:** ✅ **Fully Implemented** - All user fetching methods include asset fields

---

### 1.3 User Document → App Context ✅

**Location:** `src/context/AppContext.tsx`

**Flow:**
```
User Document (Firestore)
  ↓
firebaseDataService.user.getCurrentUser()
  ↓
firestoreToUser() transformer
  ↓
AppContext.state.currentUser
  ↓
All screens/components
```

**Status:** ✅ **Fully Implemented** - Asset fields flow through app context

---

### 1.4 Asset Updates → Database ✅

**Location:** `src/services/rewards/christmasCalendarService.ts`

**Update Methods:**
- ✅ `claimGift()` - Line 226-414
  - Updates `badges[]` and `active_badge` for badge gifts (Line 338-346)
  - Updates `profile_assets[]` and `active_profile_asset` for profile asset gifts (Line 352-358)
  - Updates `wallet_backgrounds[]` and `active_wallet_background` for wallet background gifts (Line 360-367)

**Status:** ✅ **Fully Implemented** - All asset updates use Firestore transactions

---

## 2. Display Components

### 2.1 BadgeDisplay Component ✅

**Location:** `src/components/profile/BadgeDisplay.tsx`

**Props:**
- `badges?: string[]` - Array of badge IDs
- `activeBadge?: string` - Currently active badge ID
- `showAll?: boolean` - Show all badges or just active
- `onBadgePress?: (badgeId: string) => void` - Optional press handler

**Features:**
- ✅ Displays active badge by default
- ✅ Can display all badges if `showAll={true}`
- ✅ Shows badge icon and title
- ✅ Highlights active badge
- ⚠️ Badge info hardcoded (needs config service)

**Status:** ✅ **Fully Implemented** (needs config service)

---

### 2.2 ProfileAssetDisplay Component ✅

**Location:** `src/components/profile/ProfileAssetDisplay.tsx`

**Props:**
- `profileAssets?: string[]` - Array of profile asset IDs
- `activeProfileAsset?: string` - Currently active profile asset ID
- `walletBackgrounds?: string[]` - Array of wallet background asset IDs
- `activeWalletBackground?: string` - Currently active wallet background ID
- `showProfileAsset?: boolean` - Show profile asset
- `showWalletBackground?: boolean` - Show wallet background

**Features:**
- ✅ Displays active profile asset
- ✅ Displays active wallet background
- ✅ Shows asset name and type icon
- ⚠️ Asset info hardcoded (needs config service)

**Status:** ✅ **Fully Implemented** (needs config service)

---

## 3. Current Display Locations

### 3.1 ProfileScreen ✅

**Location:** `src/screens/Settings/Profile/ProfileScreen.tsx`

**Display:**
- **Line 224-230:** BadgeDisplay component
  ```typescript
  {currentUser?.badges && currentUser.badges.length > 0 && (
    <BadgeDisplay
      badges={currentUser.badges}
      activeBadge={currentUser.active_badge}
      showAll={false}
    />
  )}
  ```
- **Line 231-237:** ProfileAssetDisplay component
  ```typescript
  {currentUser?.active_profile_asset && (
    <ProfileAssetDisplay
      profileAssets={currentUser.profile_assets}
      activeProfileAsset={currentUser.active_profile_asset}
      showProfileAsset={true}
    />
  )}
  ```

**Status:** ✅ **Fully Implemented**

---

### 3.2 DashboardScreen ✅

**Location:** `src/screens/Dashboard/DashboardScreen.tsx`

**Display:**
- **Line 830-836:** BadgeDisplay component (in header)
  ```typescript
  {currentUser?.badges && currentUser.badges.length > 0 && (
    <BadgeDisplay
      badges={currentUser.badges}
      activeBadge={currentUser.active_badge}
      showAll={false}
    />
  )}
  ```
- **Line 837-843:** ProfileAssetDisplay component (in header)
  ```typescript
  {currentUser?.active_profile_asset && (
    <ProfileAssetDisplay
      profileAssets={currentUser.profile_assets}
      activeProfileAsset={currentUser.active_profile_asset}
      showProfileAsset={true}
    />
  )}
  ```

**Status:** ✅ **Fully Implemented**

---

## 4. Missing Display Locations

### 4.1 LeaderboardDetailScreen ❌

**Location:** `src/screens/Rewards/LeaderboardDetailScreen.tsx`

**Current Display:**
- ✅ User avatars (Line 152-226)
- ✅ User names (Line 228-236)
- ✅ User points (Line 238)
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Add `BadgeDisplay` next to user names in leaderboard entries
- Add `ProfileAssetDisplay` for top 3 users
- Fetch user data including badges/assets for leaderboard entries

**Priority:** Medium (enhances user differentiation in leaderboard)

---

### 4.2 ContactsList ❌

**Location:** `src/components/ContactsList.tsx`

**Current Display:**
- ✅ User avatars (Line 677-683)
- ✅ User names (Line 685-687)
- ✅ User emails (Line 688-690)
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Add `BadgeDisplay` next to contact names
- Add `ProfileAssetDisplay` for contacts with active assets
- Fetch user data including badges/assets for contacts

**Priority:** Low (contacts may not have badges/assets)

---

### 4.3 Split Screens ❌

**Locations:**
- `src/screens/Splits/SplitsList/SplitsListScreen.tsx`
- `src/screens/SplitDetails/SplitDetailsScreen.tsx`
- `src/screens/FairSplit/components/FairSplitParticipants.tsx`
- `src/screens/DegenSplit/components/DegenSplitParticipants.tsx`

**Current Display:**
- ✅ Participant avatars (Line 419-428 in SplitsListScreen)
- ✅ Participant names
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Add `BadgeDisplay` next to participant names in split lists
- Add `ProfileAssetDisplay` for split creators
- Fetch user data including badges/assets for participants

**Priority:** Medium (enhances user differentiation in splits)

---

### 4.4 Transaction Screens ❌

**Locations:**
- `src/screens/Send/SendAmountScreen.tsx`
- `src/screens/Send/SendConfirmationScreen.tsx`
- `src/screens/Request/RequestAmountScreen.tsx`
- `src/screens/TransactionConfirmation/TransactionConfirmationScreen.tsx`

**Current Display:**
- ✅ Recipient avatars (Line 142-154 in RequestAmountScreen)
- ✅ Recipient names
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Add `BadgeDisplay` next to recipient names
- Add `ProfileAssetDisplay` for recipients with active assets

**Priority:** Low (transaction screens are focused on transaction details)

---

### 4.5 DegenResultScreen ❌

**Location:** `src/screens/DegenSplit/DegenResultScreen.tsx`

**Current Display:**
- ✅ User avatar (Line 476-487)
- ✅ User name
- ✅ Winner/loser status
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Add `BadgeDisplay` below user avatar
- Add `ProfileAssetDisplay` for winner display
- Celebrate badges/assets in result screen

**Priority:** Medium (enhances celebration of results)

---

### 4.6 Avatar Component ❌

**Location:** `src/components/shared/Avatar.tsx`

**Current Display:**
- ✅ User avatar image
- ✅ User initials fallback
- ❌ **Missing:** Badge indicator overlay

**Recommendation:**
- Add optional badge indicator overlay
- Show active badge as small icon overlay
- Make it optional via prop (e.g., `showBadge?: boolean`)

**Priority:** Low (Avatar component is used everywhere, adding badges might clutter)

---

## 5. Data Flow Verification

### 5.1 Database → Transformer ✅

**Flow:**
```
Firestore Document (users/{userId})
  ├─ badges: string[]
  ├─ active_badge: string
  ├─ profile_assets: string[]
  ├─ active_profile_asset: string
  ├─ wallet_backgrounds: string[]
  └─ active_wallet_background: string
  ↓
firestoreToUser() transformer
  ↓
User interface (includes all asset fields)
```

**Status:** ✅ **Verified** - All fields are included in transformer

---

### 5.2 Transformer → App Context ✅

**Flow:**
```
firebaseDataService.user.getCurrentUser(userId)
  ↓
firestoreToUser() transformer
  ↓
AppContext.authenticateUser(user)
  ↓
AppContext.state.currentUser
  ↓
All screens access currentUser.badges, currentUser.active_badge, etc.
```

**Status:** ✅ **Verified** - Asset fields flow through app context

---

### 5.3 App Context → Display Components ✅

**Flow:**
```
AppContext.state.currentUser
  ↓
ProfileScreen / DashboardScreen
  ↓
BadgeDisplay / ProfileAssetDisplay components
  ↓
UI Display
```

**Status:** ✅ **Verified** - Components receive asset data from app context

---

### 5.4 Asset Updates → Database ✅

**Flow:**
```
ChristmasCalendar.claimGift()
  ↓
christmasCalendarService.claimGift()
  ↓
Firestore Transaction:
  ├─ Updates users/{userId}/christmas_calendar/{day}
  ├─ Creates users/{userId}/christmas_calendar_claims/{claimId}
  └─ Updates users/{userId}:
      ├─ badges[] and active_badge (if badge gift)
      ├─ profile_assets[] and active_profile_asset (if profile asset gift)
      └─ wallet_backgrounds[] and active_wallet_background (if wallet background gift)
  ↓
Database updated atomically
```

**Status:** ✅ **Verified** - All asset updates use Firestore transactions

---

## 6. Missing Data Fetching

### 6.1 Leaderboard Entries ❌

**Location:** `src/services/rewards/leaderboardService.ts`

**Current Fetching:**
- ✅ User ID
- ✅ User name
- ✅ User avatar
- ✅ User points
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Fetch user data including badges/assets for leaderboard entries
- Add badges/assets to `LeaderboardEntry` interface
- Update leaderboard service to include asset fields

**Priority:** Medium (needed for badge display in leaderboard)

---

### 6.2 Contact Data ❌

**Location:** `src/services/data/firebaseDataService.ts`

**Current Fetching:**
- ✅ Contact name
- ✅ Contact email
- ✅ Contact avatar
- ✅ Contact wallet address
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Fetch user data including badges/assets for contacts
- Add badges/assets to `UserContact` interface (if contacts are users)
- Update contact fetching to include asset fields

**Priority:** Low (contacts may not be users with badges/assets)

---

### 6.3 Split Participants ❌

**Location:** `src/services/splits/splitStorageService.ts`

**Current Fetching:**
- ✅ Participant ID
- ✅ Participant name
- ✅ Participant avatar
- ✅ Participant wallet address
- ❌ **Missing:** Badges and assets

**Recommendation:**
- Fetch user data including badges/assets for split participants
- Add badges/assets to participant data
- Update split fetching to include asset fields

**Priority:** Medium (needed for badge display in splits)

---

## 7. Component Integration Checklist

### 7.1 Current Integration ✅

- [x] **ProfileScreen** - BadgeDisplay + ProfileAssetDisplay
- [x] **DashboardScreen** - BadgeDisplay + ProfileAssetDisplay
- [x] **Data Fetching** - All asset fields included in transformer
- [x] **Data Updates** - All asset updates use Firestore transactions
- [x] **App Context** - Asset fields flow through app context

### 7.2 Missing Integration ❌

- [ ] **LeaderboardDetailScreen** - BadgeDisplay + ProfileAssetDisplay
- [ ] **ContactsList** - BadgeDisplay + ProfileAssetDisplay
- [ ] **Split Screens** - BadgeDisplay + ProfileAssetDisplay
- [ ] **Transaction Screens** - BadgeDisplay + ProfileAssetDisplay
- [ ] **DegenResultScreen** - BadgeDisplay + ProfileAssetDisplay
- [ ] **Avatar Component** - Badge indicator overlay
- [ ] **Leaderboard Service** - Fetch badges/assets for entries
- [ ] **Contact Service** - Fetch badges/assets for contacts
- [ ] **Split Service** - Fetch badges/assets for participants

---

## 8. Recommendations

### 8.1 High Priority

1. **Create Badge/Asset Config Service**
   - **Issue:** Badge and asset info hardcoded in display components
   - **Impact:** Not easily maintainable
   - **Solution:** Create `badgeConfig.ts` and `assetConfig.ts` similar to `christmasCalendarConfig.ts`
   - **Files to Create:**
     - `src/services/rewards/badgeConfig.ts`
     - `src/services/rewards/assetConfig.ts`
   - **Files to Update:**
     - `src/components/profile/BadgeDisplay.tsx`
     - `src/components/profile/ProfileAssetDisplay.tsx`

### 8.2 Medium Priority

2. **Add Badge Display to Leaderboard**
   - **Issue:** Badges not displayed in leaderboard
   - **Impact:** Users can't differentiate themselves in leaderboard
   - **Solution:** Add `BadgeDisplay` to `LeaderboardDetailScreen.tsx`
   - **Files to Update:**
     - `src/screens/Rewards/LeaderboardDetailScreen.tsx`
     - `src/services/rewards/leaderboardService.ts`
     - `src/types/rewards.ts` (add badges/assets to `LeaderboardEntry`)

3. **Add Badge Display to Split Screens**
   - **Issue:** Badges not displayed in split participant lists
   - **Impact:** Users can't differentiate themselves in splits
   - **Solution:** Add `BadgeDisplay` to split participant components
   - **Files to Update:**
     - `src/screens/Splits/SplitsList/SplitsListScreen.tsx`
     - `src/screens/FairSplit/components/FairSplitParticipants.tsx`
     - `src/screens/DegenSplit/components/DegenSplitParticipants.tsx`
     - `src/services/splits/splitStorageService.ts` (fetch badges/assets)

4. **Add Badge Display to DegenResultScreen**
   - **Issue:** Badges not displayed in result screen
   - **Impact:** Missing celebration of user achievements
   - **Solution:** Add `BadgeDisplay` to result screen
   - **Files to Update:**
     - `src/screens/DegenSplit/DegenResultScreen.tsx`

### 8.3 Low Priority

5. **Add Badge Display to ContactsList**
   - **Issue:** Badges not displayed in contact list
   - **Impact:** Users can't see badges of contacts
   - **Solution:** Add `BadgeDisplay` to contact list items
   - **Files to Update:**
     - `src/components/ContactsList.tsx`
     - `src/services/data/firebaseDataService.ts` (fetch badges/assets for contacts)

6. **Add Badge Indicator to Avatar Component**
   - **Issue:** No badge indicator on avatars
   - **Impact:** Badges not visible in avatar-only displays
   - **Solution:** Add optional badge indicator overlay
   - **Files to Update:**
     - `src/components/shared/Avatar.tsx`

---

## 9. Data Flow Summary

### 9.1 Complete Data Flow ✅

```
Database (Firestore)
  ↓
firebaseDataService.user.getCurrentUser()
  ↓
firestoreToUser() transformer (includes all asset fields)
  ↓
AppContext.state.currentUser
  ↓
ProfileScreen / DashboardScreen
  ↓
BadgeDisplay / ProfileAssetDisplay components
  ↓
UI Display
```

**Status:** ✅ **Fully Functional** for ProfileScreen and DashboardScreen

---

### 9.2 Incomplete Data Flow ❌

```
Database (Firestore)
  ↓
leaderboardService.getLeaderboard()
  ↓
LeaderboardEntry (missing badges/assets)
  ↓
LeaderboardDetailScreen
  ↓
❌ No BadgeDisplay / ProfileAssetDisplay
```

**Status:** ❌ **Missing** - Leaderboard entries don't include badges/assets

---

## 10. Conclusion

### Overall Status: ✅ **Data Flow Complete** | ⚠️ **Display Coverage: 2/10+ locations**

**Strengths:**
- ✅ Complete data flow from database to UI
- ✅ All asset fields included in transformer
- ✅ Asset updates use Firestore transactions
- ✅ Display components fully functional
- ✅ ProfileScreen and DashboardScreen display assets correctly

**Gaps:**
- ❌ Badges/assets not displayed in leaderboard
- ❌ Badges/assets not displayed in split screens
- ❌ Badges/assets not displayed in contact lists
- ❌ Badges/assets not displayed in transaction screens
- ❌ Badge/asset info hardcoded in components (needs config service)
- ❌ Leaderboard/contact/split services don't fetch badges/assets

**Next Steps:**
1. Create badge/asset config service (High Priority)
2. Add badge display to leaderboard (Medium Priority)
3. Add badge display to split screens (Medium Priority)
4. Add badge display to result screen (Medium Priority)
5. Add badge display to contacts (Low Priority)
6. Add badge indicator to avatar component (Low Priority)

---

**Audit Complete** ✅  
**Date:** 2024-12-19  
**Status:** Data Flow Complete, Display Coverage Needs Improvement

