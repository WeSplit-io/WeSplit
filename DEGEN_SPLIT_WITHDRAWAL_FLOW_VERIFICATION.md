# Degen Split Withdrawal Flow Verification

## ✅ Winner Withdrawal Flow (In-App Wallet)

### Flow Path:
1. **UI Layer** (`DegenResultScreen.tsx`)
   - Button: "Claim" button (only shown if `isWinner === true`)
   - Handler: `handleClaimFunds()`
   - Calls: `degenLogic.handleClaimFunds(currentUser, splitWallet, totalAmount, callback)`

2. **Hook Layer** (`useDegenSplitLogic.ts`)
   - Function: `handleClaimFunds()`
   - Validates: User hasn't already claimed (`canUserClaimFunds`)
   - Calls: `SplitWalletService.processDegenWinnerPayout()`
   - Parameters:
     - `splitWallet.id`
     - `currentUser.id.toString()`
     - `currentUser.wallet_address || ''` ✅ **IN-APP WALLET ADDRESS**
     - `totalAmount`
     - `'Degen Split Winner Payout'`

3. **Service Wrapper** (`index.ts`)
   - Function: `SplitWalletService.processDegenWinnerPayout()`
   - Delegates to: `SplitWalletPayments.processDegenWinnerPayout()`
   - Parameters passed correctly: `(splitWalletId, winnerUserId, winnerAddress, totalAmount, description)`

4. **Payment Logic** (`SplitWalletPayments.ts`)
   - Function: `processDegenWinnerPayout()`
   - **Validations:**
     - ✅ Checks `wallet.degenLoser` exists
     - ✅ **Rejects if `loserInfo.userId === winnerUserId`** (prevents loser from claiming)
     - ✅ Validates user is a participant
     - ✅ Checks if already paid (prevents duplicate withdrawals)
   - **Amount Calculation:**
     - ✅ Calculates `actualTotalAmount` from all participants' locked funds
   - **Transaction:**
     - ✅ Sends to `winnerAddress` (which is `currentUser.wallet_address` - **IN-APP WALLET**)
     - ✅ Amount: `actualTotalAmount` (total from all participants)
   - **Status Update:**
     - ✅ Sets participant status to `'paid'`

---

## ✅ Loser Withdrawal Flow (External Card/Wallet)

### Flow Path:
1. **UI Layer** (`DegenResultScreen.tsx`)
   - Button: "Transfer to External Card" button (only shown if `isLoser === true`)
   - Handler: `handleExternalPayment()`
   - Calls: `SplitWalletService.processDegenLoserPayment()`
   - Parameters:
     - `splitWallet.id`
     - `currentUser.id.toString()`
     - `'kast-card'` (paymentMethod - ignored by implementation)
     - `totalAmount` (used as fallback, actual amount calculated from participant data)
     - `'Degen Split Loser Payment (KAST Card)'`

2. **Service Wrapper** (`index.ts`)
   - Function: `SplitWalletService.processDegenLoserPayment()`
   - **Note:** `paymentMethod` parameter is ignored (legacy parameter)
   - Delegates to: `SplitWalletPayments.processDegenLoserPayment()`
   - Parameters: `(splitWalletId, loserUserId, totalAmount, description, cardId)`

3. **Payment Logic** (`SplitWalletPayments.ts`)
   - Function: `processDegenLoserPayment()`
   - **Validations:**
     - ✅ Checks `wallet.degenLoser` exists
     - ✅ **Rejects if `loserInfo.userId !== loserUserId`** (prevents winners from using loser flow)
     - ✅ Validates user is a participant
     - ✅ Checks if already paid (prevents duplicate withdrawals)
   - **Amount Calculation:**
     - ✅ Calculates `loserLockedAmount` from `loserParticipant.amountPaid` (their own locked amount)
   - **Destination Selection:**
     - ✅ If `cardId` provided: Uses that specific KAST card
     - ✅ Else: Gets linked destinations via `LinkedWalletService.getLinkedDestinations()`
     - ✅ **Preference:** KAST cards first, then external wallets
     - ✅ **Fallback:** External wallet if no KAST cards available
   - **Transaction:**
     - ✅ Sends to `destinationAddress` (external card/wallet address)
     - ✅ **NOT** to in-app wallet
     - ✅ Amount: `loserLockedAmount` (their own contribution, not total)
   - **Status Update:**
     - ✅ Sets participant status to `'paid'`

---

## ✅ Winner/Loser Detection Logic

### In `DegenResultScreen.tsx`:
```typescript
const loserUserId = currentSplitWallet?.degenLoser?.userId || 
                    degenState.splitWallet?.degenLoser?.userId ||
                    currentSplitWallet?.degenWinner?.userId || // Fallback
                    degenState.splitWallet?.degenWinner?.userId ||
                    selectedParticipant?.userId || 
                    selectedParticipant?.id;

const isLoser = currentUser && loserUserId && 
  loserUserId === currentUser.id.toString();
const isWinner = !isLoser && !!loserUserId; // If there's a loser and you're not it, you're a winner
```

### Button Visibility:
- **Winner:** Shows "Claim" button → calls `handleClaimFunds()`
- **Loser:** Shows "Transfer to External Card" button → calls `handleExternalPayment()`

---

## ✅ Validation Summary

### Winner Payout Validations:
1. ✅ User is NOT the loser (`loserInfo.userId !== winnerUserId`)
2. ✅ User is a participant
3. ✅ User hasn't already claimed (`status !== 'paid'`)
4. ✅ Sends to in-app wallet (`currentUser.wallet_address`)
5. ✅ Amount: Total from all participants

### Loser Payment Validations:
1. ✅ User IS the loser (`loserInfo.userId === loserUserId`)
2. ✅ User is a participant
3. ✅ User hasn't already transferred (`status !== 'paid'`)
4. ✅ External destination exists (KAST card or external wallet)
5. ✅ Sends to external card/wallet (NOT in-app wallet)
6. ✅ Amount: Loser's own locked amount (not total)

---

## ✅ Conclusion

**Both methods work correctly and call the right logic:**

1. **Winner withdrawal:**
   - ✅ Correctly validates user is NOT the loser
   - ✅ Sends to in-app wallet (`currentUser.wallet_address`)
   - ✅ Amount: Total from all participants

2. **Loser withdrawal:**
   - ✅ Correctly validates user IS the loser
   - ✅ Sends to external card/wallet (prefers KAST cards, fallback to external wallets)
   - ✅ Amount: Loser's own locked amount

**All validations are in place to prevent:**
- Losers from claiming winner payout
- Winners from using loser payment flow
- Duplicate withdrawals
- Wrong destination addresses
- Wrong amounts

