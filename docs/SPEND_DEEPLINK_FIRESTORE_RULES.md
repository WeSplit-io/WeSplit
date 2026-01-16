# SPEND Deep Links - Firestore Rules Verification

**Date**: 2025-01-27  
**Status**: ✅ **ALL RULES ALREADY COVERED**

---

## ✅ Summary

**No additional Firestore rules are needed for deep link handling.** All required collections already have proper rules configured.

---

## 🔍 Deep Link Flow Analysis

### 1. `view-split` Deep Link (SPEND → WeSplit)

**Flow**:
1. User clicks link: `wesplit://view-split?splitId=xxx&userId=xxx`
2. App navigates to `SplitDetails` screen
3. `SplitDetails` screen reads from `splits` collection

**Collections Accessed**:
- ✅ `splits` - Read split data
- ✅ `users` - Read user data (if needed)
- ✅ `splitWallets` - Read wallet data (if needed)

**Rules Status**: ✅ **COVERED**
- `splits` collection: `allow read: if request.auth != null;` (line 184)
- `users` collection: `allow read: if request.auth != null;` (line 13)
- `splitWallets` collection: `allow read, write: if request.auth != null;` (line 55)

---

### 2. `join-split` Deep Link (Invitation)

**Flow**:
1. User clicks invitation link: `wesplit://join-split?data=xxx`
2. If not authenticated: Stores invitation in AsyncStorage (local, not Firestore)
3. After authentication: Navigates to `SplitDetails` screen
4. `SplitDetails` screen reads from `splits` collection

**Collections Accessed**:
- ✅ `splits` - Read/update split data when joining
- ✅ `users` - Read user data
- ✅ `pending_invitations` - Read invitation data (if stored in Firestore)

**Rules Status**: ✅ **COVERED**
- `splits` collection: `allow read: if request.auth != null;` and `allow update: if request.auth != null;` (lines 184, 195)
- `users` collection: `allow read: if request.auth != null;` (line 13)
- `pending_invitations` collection: `allow read: if request.auth != null && request.auth.token.email == resource.data.email;` (lines 284-285)

**Note**: The `pendingInvitationService` uses AsyncStorage (local storage), not Firestore, so no Firestore rules are needed for that.

---

### 3. `spend-callback` Deep Link (WeSplit → SPEND)

**Flow**:
1. User completes payment in WeSplit
2. App redirects: `wesplit://spend-callback?callbackUrl=xxx&status=success`
3. App opens callback URL (SPEND app or web)
4. **No Firestore access** - just URL redirect

**Collections Accessed**: None

**Rules Status**: ✅ **N/A** - No Firestore access needed

---

## 📊 Collections Used by Deep Links

| Collection | Deep Link Usage | Current Rules | Status |
|------------|----------------|---------------|--------|
| `splits` | Read/update when viewing/joining splits | ✅ Allows authenticated read/update | ✅ OK |
| `users` | Read user data | ✅ Allows authenticated read | ✅ OK |
| `splitWallets` | Read wallet data | ✅ Allows authenticated read | ✅ OK |
| `pending_invitations` | Read invitation data (if in Firestore) | ✅ Allows read own email | ✅ OK |

---

## 🔐 Key Rules for Deep Links

### Splits Collection (Most Important)

```javascript
match /splits/{splitId} {
  // Allow authenticated users to read splits
  // This is necessary for deep links where user might not be participant yet
  allow read: if request.auth != null;
  
  // Allow authenticated users to update splits
  // This allows users to join splits via deep links
  allow update: if request.auth != null;
}
```

**Why This Works**:
- ✅ Users can read splits even if not yet a participant (needed for `view-split`)
- ✅ Users can update splits to join (needed for `join-split`)
- ✅ Application code enforces participant checks for security

---

## ⚠️ Important Notes

1. **Authentication Required**: Deep links require users to be authenticated to access Firestore. If user is not authenticated:
   - `view-split`: Will prompt for authentication
   - `join-split`: Stores invitation locally, processes after authentication

2. **No Additional Rules Needed**: All deep link operations use existing collections that already have proper rules.

3. **Local Storage**: The `pendingInvitationService` uses AsyncStorage (local device storage), not Firestore, so no Firestore rules are needed for that.

4. **Security**: While rules allow authenticated users to read splits, application code enforces:
   - Participant verification
   - Creator verification
   - Proper access controls

---

## ✅ Verification Checklist

- [x] `splits` collection allows authenticated read (for `view-split`)
- [x] `splits` collection allows authenticated update (for `join-split`)
- [x] `users` collection allows authenticated read
- [x] `splitWallets` collection allows authenticated read
- [x] `pending_invitations` collection allows read own email
- [x] No additional collections needed for deep links
- [x] All deep link flows covered by existing rules

---

## ✅ Conclusion

**No additional Firestore rules are needed for deep link handling.**

All deep link operations use existing collections (`splits`, `users`, `splitWallets`, `pending_invitations`) that already have proper security rules configured.

**Status**: ✅ **VERIFIED - NO ACTION REQUIRED**

---

**Last Updated**: 2025-01-27
