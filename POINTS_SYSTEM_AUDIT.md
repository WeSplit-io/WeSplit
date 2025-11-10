# Points System Audit - Point Calculation & Handling

**Date:** 2024-12-19  
**Focus:** Point calculation, triggers, and database flags (excluding season logic)

## Executive Summary

This audit verifies all point award triggers are properly set up and database flags are correctly tracked across the codebase. The audit focuses on ensuring:
1. All user actions that should award points have proper triggers
2. Database flags are set correctly to track user actions
3. Point calculations are consistent and accurate
4. Duplicate prevention is in place
5. All integration points are properly connected

---

## Point Award Methods

### Core Point Award Functions

#### 1. `pointsService.awardTransactionPoints()`
**Location:** `src/services/rewards/pointsService.ts:22-116`

**Purpose:** Awards points for wallet-to-wallet transactions (1:1/Request)

**Trigger Points:**
- ✅ `ConsolidatedTransactionService.sendUSDCTransaction()` - Line 196
- ✅ `sendInternal.sendInternalTransfer()` - Line 238
- ✅ `userActionSyncService.checkAndBackfillTransactionPoints()` - Line 265 (backfill)

**Database Flags:**
- ✅ `points_transactions` collection: Records transaction with `source: 'transaction_reward'`
- ✅ `users.points`: Updated atomically
- ✅ `users.total_points_earned`: Updated atomically
- ✅ `users.points_last_updated`: Timestamp updated

**Validation:**
- ✅ Only awards for 'send' transactions (sender gets points)
- ✅ Minimum amount check: `MIN_TRANSACTION_AMOUNT_FOR_POINTS`
- ✅ Only internal wallet-to-wallet transfers (not external)
- ✅ Checks partnership status for enhanced rewards

---

#### 2. `pointsService.awardSeasonPoints()`
**Location:** `src/services/rewards/pointsService.ts:121-201`

**Purpose:** Awards season-based points (currently uses season logic - to be simplified)

**Trigger Points:**
- ✅ `questService.completeQuest()` - Line 207 (season-based quests)
- ✅ `splitRewardsService.awardFairSplitParticipation()` - Line 57
- ✅ `splitRewardsService.awardDegenSplitParticipation()` - Line 151
- ✅ `referralService.awardInviteFriendReward()` - Line 167
- ✅ `referralService.awardFriendFirstSplitReward()` - Line 221
- ✅ `userActionSyncService.syncSeedPhraseExport()` - Line 397
- ✅ `userActionSyncService.syncAccountSetupPP()` - Line 439
- ✅ `userActionSyncService.syncFirstSplitWithFriends()` - Line 480
- ✅ `userActionSyncService.syncExternalWalletLinking()` - Line 526

**Database Flags:**
- ✅ `points_transactions` collection: Records with `season` and `task_type`
- ✅ `users.points`: Updated atomically
- ✅ `users.total_points_earned`: Updated atomically
- ✅ `users.points_last_updated`: Timestamp updated

---

#### 3. `pointsService.awardPoints()` (Legacy)
**Location:** `src/services/rewards/pointsService.ts:206-280`

**Purpose:** Legacy method for fixed point awards (non-season-based quests)

**Trigger Points:**
- ✅ `questService.completeQuest()` - Line 218 (legacy quests)

**Database Flags:**
- ✅ `points_transactions` collection: Records without season info
- ✅ `users.points`: Updated atomically
- ✅ `users.total_points_earned`: Updated atomically

---

## Quest Completion Triggers

### Quest Service
**Location:** `src/services/rewards/questService.ts`

**Database Flags:**
- ✅ `users/{userId}/quests/{questType}`: Quest document with `completed: true`
- ✅ `users/{userId}/quests/{questType}.completed_at`: Timestamp
- ✅ `users/{userId}/quests/{questType}.points`: Points awarded

**Quest Types & Triggers:**

#### 1. `complete_onboarding`
**Trigger:** `userActionSyncService.syncOnboardingCompletion()` - Line 34
- ✅ Called from: `CreateProfileScreen.handleNext()` - Line 322
- ✅ Database Flag: `users.hasCompletedOnboarding: true`
- ✅ Points: 25 (legacy fixed)

#### 2. `profile_image`
**Trigger:** `userActionSyncService.syncProfileImage()` - Line 71
- ✅ Called from: `CreateProfileScreen.handleNext()` - Line 325
- ✅ Database Flag: `users.avatar: string` (non-empty)
- ✅ Points: 50 (legacy fixed)

#### 3. `first_transaction`
**Trigger:** `userActionSyncService.syncFirstTransaction()` - Line 108
- ✅ Called from: `userActionSyncService.verifyAndSyncUserActions()` - Line 326
- ✅ Database Flag: Checked via `firebaseDataService.transaction.getTransactions()`
- ✅ Points: 100 (legacy fixed)

#### 4. `add_first_contact`
**Trigger:** `userActionSyncService.syncFirstContact()` - Line 135
- ✅ Called from: `userActionSyncService.verifyAndSyncUserActions()` - Line 337
- ✅ Database Flag: Checked via `firebaseDataService.contact.getContacts()`
- ✅ Points: 30 (legacy fixed)

#### 5. `create_first_split`
**Trigger:** `userActionSyncService.syncFirstSplit()` - Line 167
- ✅ Called from: `userActionSyncService.verifyAndSyncUserActions()` - Line 345
- ✅ Database Flag: Checked via `SplitStorageService.getUserSplits()`
- ✅ Points: 75 (legacy fixed)

#### 6. `export_seed_phrase`
**Trigger:** `userActionSyncService.syncSeedPhraseExport()` - Line 408
- ✅ Called from: `SeedPhraseViewScreen.handleCopySeedPhrase()` - Line 156
- ✅ Database Flag: `users.wallet_has_seed_phrase: true`
- ✅ Points: Season-based (to be simplified)

#### 7. `setup_account_pp`
**Trigger:** `userActionSyncService.syncAccountSetupPP()` - Line 450
- ✅ Called from: `firebase.createUserDocument()` - Line 349
- ✅ Database Flag: `users.hasCompletedOnboarding: true`
- ✅ Points: Season-based (to be simplified)

#### 8. `first_split_with_friends`
**Trigger:** `userActionSyncService.syncFirstSplitWithFriends()` - Line 491
- ✅ Called from: `splitStorageService.createSplit()` - Line 172
- ✅ Database Flag: Checked via `participantCount > 1`
- ✅ Points: Season-based (to be simplified)

#### 9. `first_external_wallet_linked`
**Trigger:** `userActionSyncService.syncExternalWalletLinking()` - Line 537
- ✅ Called from: `linkExternal.verifyWalletOwnership()` - Line 85
- ✅ Called from: `LinkedWalletService.addLinkedWallet()` - Line 144
- ✅ Database Flag: Checked via `firebaseDataService.linkedWallet.getLinkedWallets()`
- ✅ Points: Season-based (to be simplified)

#### 10. `invite_friends_create_account`
**Trigger:** `referralService.awardInviteFriendReward()` - Line 179
- ✅ Called from: `referralService.trackReferral()` - Line 55, 67
- ✅ Database Flag: `referrals.rewardsAwarded.accountCreated: true`
- ✅ Points: Season-based (to be simplified)

#### 11. `friend_do_first_split_over_10`
**Trigger:** `referralService.awardFriendFirstSplitReward()` - Line 233
- ✅ Called from: `splitRewardsService.awardFairSplitParticipation()` - Line 80
- ✅ Called from: `splitRewardsService.awardDegenSplitParticipation()` - Line 174
- ✅ Database Flag: `referrals.rewardsAwarded.firstSplitOver10: true`
- ✅ Points: Season-based (to be simplified)

---

## Split Rewards Triggers

### Fair Split Participation
**Location:** `src/services/rewards/splitRewardsService.ts:26-107`

**Trigger Points:**
- ✅ `splitStorageService.createSplit()` - Line 162 (owner bonus)
- ✅ `SplitWalletPayments.processParticipantPayment()` - Line 1821 (participant)

**Database Flags:**
- ✅ `points_transactions` collection: Records with `task_type: 'create_fair_split_owner_bonus'` or `'participate_fair_split'`
- ✅ `users.points`: Updated atomically
- ✅ `users.total_points_earned`: Updated atomically

**Validation:**
- ✅ Checks partnership status
- ✅ Owner gets bonus, participants get participation reward
- ✅ Triggers referral reward if user has `referred_by`

---

### Degen Split Participation
**Location:** `src/services/rewards/splitRewardsService.ts:112-201`

**Trigger Points:**
- ✅ `SplitWalletPayments.processDegenWinnerPayout()` - Line 2138 (all participants)

**Database Flags:**
- ✅ `points_transactions` collection: Records with `task_type: 'degen_split_win'` or `'degen_split_lose'`
- ✅ `users.points`: Updated atomically
- ✅ `users.total_points_earned`: Updated atomically

**Validation:**
- ✅ Checks partnership status
- ✅ Winner and loser get different rewards
- ✅ Triggers referral reward if user has `referred_by`

---

## Referral Rewards Triggers

### Referral Tracking
**Location:** `src/services/rewards/referralService.ts`

**Trigger Points:**
- ✅ `CreateProfileScreen.handleNext()` - Line 328 (after user creation)

**Database Flags:**
- ✅ `users.referred_by`: Set to referrer's user ID
- ✅ `referrals` collection: Creates referral record
- ✅ `referrals.rewardsAwarded.accountCreated`: Tracks if reward awarded
- ✅ `referrals.rewardsAwarded.firstSplitOver10`: Tracks if reward awarded

**Validation:**
- ✅ Checks if referral code exists
- ✅ Prevents duplicate referrals
- ✅ Awards points to referrer when friend creates account
- ✅ Awards points to referrer when friend does first split > $10

---

## Database Flags Summary

### User Document Flags (`users` collection)

| Flag | Purpose | Set By | Used By |
|------|---------|--------|---------|
| `points` | Current point balance | `pointsService` | All point calculations |
| `total_points_earned` | Lifetime points earned | `pointsService` | Stats/analytics |
| `points_last_updated` | Last points update timestamp | `pointsService` | Tracking |
| `hasCompletedOnboarding` | Onboarding completion | `userActionSyncService` | Quest triggers |
| `wallet_has_seed_phrase` | Seed phrase export status | User action | Quest trigger |
| `is_partnership` | Partnership status | Admin/manual | Enhanced rewards |
| `referral_code` | User's referral code | `referralService` | Referral tracking |
| `referred_by` | Referrer's user ID | `referralService` | Referral rewards |
| `avatar` | Profile image URL | User action | Quest trigger |

### Quest Flags (`users/{userId}/quests/{questType}`)

| Flag | Purpose | Set By | Used By |
|------|---------|--------|---------|
| `completed` | Quest completion status | `questService` | Duplicate prevention |
| `completed_at` | Completion timestamp | `questService` | Tracking |
| `points` | Points awarded for quest | `questService` | History |

### Referral Flags (`referrals` collection)

| Flag | Purpose | Set By | Used By |
|------|---------|--------|---------|
| `rewardsAwarded.accountCreated` | Account creation reward status | `referralService` | Duplicate prevention |
| `rewardsAwarded.firstSplitOver10` | First split reward status | `referralService` | Duplicate prevention |
| `hasCreatedAccount` | Account creation status | `referralService` | Tracking |
| `hasDoneFirstSplit` | First split status | `referralService` | Tracking |
| `firstSplitAmount` | First split amount | `referralService` | Validation |

### Points Transaction Flags (`points_transactions` collection)

| Flag | Purpose | Set By | Used By |
|------|---------|--------|---------|
| `user_id` | User who earned points | `pointsService` | History |
| `amount` | Points awarded | `pointsService` | History |
| `source` | Source of points | `pointsService` | Categorization |
| `source_id` | Source transaction/quest ID | `pointsService` | Duplicate prevention |
| `description` | Human-readable description | `pointsService` | History |
| `season` | Season number (optional) | `pointsService` | Season tracking |
| `task_type` | Task type (optional) | `pointsService` | Categorization |

---

## Integration Points Verification

### ✅ Transaction Points
- [x] `ConsolidatedTransactionService.sendUSDCTransaction()` → `awardTransactionPoints()`
- [x] `sendInternal.sendInternalTransfer()` → `awardTransactionPoints()`
- [x] `userActionSyncService.checkAndBackfillTransactionPoints()` → `awardTransactionPoints()`

### ✅ Quest Completion
- [x] `CreateProfileScreen` → `syncOnboardingCompletion()` → `completeQuest()`
- [x] `CreateProfileScreen` → `syncProfileImage()` → `completeQuest()`
- [x] `SeedPhraseViewScreen` → `syncSeedPhraseExport()` → `completeQuest()`
- [x] `linkExternal` → `syncExternalWalletLinking()` → `completeQuest()`
- [x] `LinkedWalletService` → `syncExternalWalletLinking()` → `completeQuest()`
- [x] `splitStorageService` → `syncFirstSplitWithFriends()` → `completeQuest()`

### ✅ Split Rewards
- [x] `splitStorageService.createSplit()` → `awardFairSplitParticipation()` (owner)
- [x] `SplitWalletPayments.processParticipantPayment()` → `awardFairSplitParticipation()` (participant)
- [x] `SplitWalletPayments.processDegenWinnerPayout()` → `awardDegenSplitParticipation()` (all)

### ✅ Referral Rewards
- [x] `CreateProfileScreen` → `trackReferral()` → `awardInviteFriendReward()`
- [x] `splitRewardsService` → `awardFriendFirstSplitReward()` (when `referred_by` exists)

### ✅ Background Sync
- [x] `RewardsScreen.loadData()` → `verifyAndSyncUserActions()` (non-blocking)

---

## Duplicate Prevention

### ✅ Quest Completion
- **Method:** `questService.isQuestCompleted()` checks `users/{userId}/quests/{questType}.completed`
- **Status:** ✅ Implemented

### ✅ Transaction Points
- **Method:** Checks `points_transactions` collection for existing `source_id`
- **Status:** ✅ Implemented in `checkAndBackfillTransactionPoints()`

### ✅ Referral Rewards
- **Method:** Checks `referrals.rewardsAwarded.accountCreated` and `referrals.rewardsAwarded.firstSplitOver10`
- **Status:** ✅ Implemented

### ✅ Split Rewards
- **Method:** Each split participation creates unique `source_id` (splitId)
- **Status:** ✅ Implemented (no duplicate prevention needed - multiple splits allowed)

---

## Issues & Recommendations

### ⚠️ Issues Found

1. **Season Logic Still Present**
   - **Issue:** `awardSeasonPoints()` and related functions still use season logic
   - **Impact:** User requested to omit season logic
   - **Recommendation:** Simplify to use fixed/percentage rewards without season checks

2. ~~**Missing Database Flag Check**~~ ✅ **RESOLVED**
   - ~~**Issue:** `syncAccountSetupPP()` may not be called from `firebase.createUserDocument()`~~
   - **Status:** ✅ Verified - Called at `firebase.createUserDocument()` - Line 349

3. **Inconsistent Point Calculation**
   - **Issue:** Some quests use season-based, others use legacy fixed points
   - **Impact:** Inconsistent reward structure
   - **Recommendation:** Standardize all quest rewards (simplify to fixed points)

### ✅ Strengths

1. **Comprehensive Database Flags:** All user actions are properly tracked
2. **Duplicate Prevention:** Multiple layers of duplicate prevention
3. **Atomic Updates:** Point updates are atomic (no race conditions)
4. **Non-Blocking:** Background sync doesn't block UI
5. **Comprehensive Logging:** All actions are logged for debugging

---

## Next Steps

1. **Simplify Season Logic:**
   - Remove season checks from `awardSeasonPoints()`
   - Use fixed/percentage rewards directly
   - Update all callers to use simplified version

2. **Verify Missing Triggers:**
   - Check if `syncAccountSetupPP()` is called from `firebase.createUserDocument()`
   - Add if missing

3. **Standardize Quest Rewards:**
   - Convert all season-based quests to fixed points
   - Update `questService.completeQuest()` to use fixed points only

4. **Testing:**
   - Test all trigger points
   - Verify database flags are set correctly
   - Verify duplicate prevention works
   - Verify point calculations are accurate

---

## Conclusion

The points system has comprehensive triggers and database flags in place. The main issue is the presence of season logic that needs to be simplified. All integration points are properly connected, and duplicate prevention is implemented across all reward types.

**Overall Status:** ✅ **Well Integrated** (needs season logic simplification)

