# 🔐 **Verification Flow Test Guide**

## **Overview**

This document provides a comprehensive testing guide to verify that the email verification process now properly preserves existing usernames and wallets, and that users are not forced to create new profiles unnecessarily.

## **🧪 Test Scenarios**

### **Test Scenario 1: Existing User with Username and Wallet**

**Objective**: Verify that existing users keep their usernames and wallets during email re-validation.

**Steps**:
1. **Prerequisites**: Ensure you have a user in the database with:
   - Email: `test@example.com`
   - Username: `TestUser`
   - Wallet: `existing_wallet_address`
   - `hasCompletedOnboarding: true`

2. **Test Flow**:
   ```
   User enters email → Receives verification code → Enters code → 
   System verifies → Preserves existing data → Goes to Dashboard
   ```

3. **Expected Results**:
   - ✅ User keeps existing username: `TestUser`
   - ✅ User keeps existing wallet: `existing_wallet_address`
   - ✅ User goes directly to Dashboard (no profile creation)
   - ✅ No new wallet is created
   - ✅ No new username is requested

4. **Logs to Check**:
   ```
   ✅ User already has existing wallet, preserving it
   ✅ User already has existing username, preserving it
   ✅ User already has name, navigating to Dashboard: TestUser
   ```

### **Test Scenario 2: Existing User without Wallet**

**Objective**: Verify that existing users without wallets get wallets created but keep their usernames.

**Steps**:
1. **Prerequisites**: Ensure you have a user in the database with:
   - Email: `test2@example.com`
   - Username: `TestUser2`
   - Wallet: `""` (empty)
   - `hasCompletedOnboarding: true`

2. **Test Flow**:
   ```
   User enters email → Receives verification code → Enters code → 
   System verifies → Preserves username → Creates wallet → Goes to Dashboard
   ```

3. **Expected Results**:
   - ✅ User keeps existing username: `TestUser2`
   - ✅ User gets new wallet created
   - ✅ User goes directly to Dashboard (no profile creation)
   - ✅ No new username is requested

4. **Logs to Check**:
   ```
   ✅ User already has existing username, preserving it
   🔄 User has no wallet, creating new one
   ✅ User already has name, navigating to Dashboard: TestUser2
   ```

### **Test Scenario 3: New User without Username or Wallet**

**Objective**: Verify that truly new users go through the profile creation flow.

**Steps**:
1. **Prerequisites**: Use a completely new email address that doesn't exist in the database.

2. **Test Flow**:
   ```
   User enters new email → Receives verification code → Enters code → 
   System verifies → Creates new user → No username → Goes to CreateProfile
   ```

3. **Expected Results**:
   - ✅ New user document is created
   - ✅ New wallet is created
   - ✅ User is redirected to CreateProfile screen
   - ✅ User can set their username

4. **Logs to Check**:
   ```
   🆕 Creating new user since not found in Firestore
   🔄 User needs to create profile (no name), navigating to CreateProfile
   ```

## **🔍 Debugging Steps**

### **Step 1: Check Database State**

Before testing, verify the current state of your test users:

```sql
-- Check if user exists and has data
SELECT id, email, name, wallet_address, hasCompletedOnboarding 
FROM users 
WHERE email = 'test@example.com';
```

### **Step 2: Monitor Firebase Functions Logs**

Check the Firebase Functions logs for proper data preservation:

```bash
# Look for these log messages:
✅ User already exists with wallet: existing_wallet_address, name: TestUser, onboarding: true
✅ Code verified successfully for test@example.com. Wallet preserved: existing_wallet_address, Name preserved: TestUser, Onboarding: true
```

### **Step 3: Monitor Frontend Logs**

Check the frontend console for proper user data handling:

```javascript
// Look for these log messages:
🔍 Verification: User data analysis: { name: "TestUser", nameLength: 8, trimmedName: "TestUser", needsProfile: false, hasCompletedOnboarding: true }
✅ User already has name, navigating to Dashboard: TestUser
```

### **Step 4: Verify API Response**

Check that the verification API returns the correct user data structure:

```json
{
  "success": true,
  "message": "Code verified successfully",
  "user": {
    "id": "firebase_uid",
    "email": "test@example.com",
    "name": "TestUser",
    "walletAddress": "existing_wallet_address",
    "walletPublicKey": "existing_wallet_public_key",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "avatar": "",
    "hasCompletedOnboarding": true
  },
  "customToken": "eyJ..."
}
```

## **🐛 Common Issues and Fixes**

### **Issue 1: User Still Goes to Profile Creation**

**Symptoms**: User with existing username is redirected to CreateProfile screen.

**Possible Causes**:
1. **API Response Missing Username**: Check if `user.name` is empty in the API response
2. **Frontend Logic Error**: Check if `needsProfile` calculation is correct
3. **Database Data Loss**: Verify username wasn't overwritten during verification

**Debugging**:
```javascript
// Add this logging to VerificationScreen.tsx
console.log('🔍 API Response:', authResponse);
console.log('🔍 Transformed User:', transformedUser);
console.log('🔍 Needs Profile Check:', {
  name: transformedUser.name,
  nameLength: transformedUser.name?.length,
  trimmedName: transformedUser.name?.trim(),
  needsProfile: !transformedUser.name || transformedUser.name.trim() === ''
});
```

### **Issue 2: Username Gets Overwritten**

**Symptoms**: User's existing username is replaced with empty string or new value.

**Possible Causes**:
1. **Firebase Functions Not Preserving Data**: Check if existing data is being read correctly
2. **Database Update Logic Error**: Verify that `merge: true` is used
3. **Missing Data Preservation**: Check if all fields are being preserved

**Debugging**:
```javascript
// Add this logging to Firebase Functions
console.log('🔍 Existing User Data:', existingData);
console.log('🔍 Preserved Values:', {
  name: existingName,
  wallet: existingWalletAddress,
  onboarding: hasCompletedOnboarding
});
```

### **Issue 3: Wallet Gets Recreated**

**Symptoms**: User gets a new wallet address instead of keeping the existing one.

**Possible Causes**:
1. **Wallet Service Logic Error**: Check if `ensureUserWallet` is being called unnecessarily
2. **Missing Wallet Check**: Verify that existing wallets are detected properly
3. **Database Field Mismatch**: Check if wallet fields are being read correctly

**Debugging**:
```javascript
// Add this logging to UserWalletService
console.log('🔍 User Data Check:', {
  userId,
  hasWallet: !!user?.wallet_address,
  walletAddress: user?.wallet_address
});
```

## **✅ Success Criteria**

The verification flow is working correctly when:

1. **Existing Users with Usernames**:
   - ✅ Keep their usernames
   - ✅ Keep their wallets (if they have them)
   - ✅ Go directly to Dashboard
   - ✅ No profile creation required

2. **Existing Users without Wallets**:
   - ✅ Keep their usernames
   - ✅ Get new wallets created
   - ✅ Go directly to Dashboard
   - ✅ No profile creation required

3. **New Users**:
   - ✅ Get new user documents created
   - ✅ Get new wallets created
   - ✅ Go to CreateProfile screen
   - ✅ Can set their usernames

4. **Data Preservation**:
   - ✅ No existing usernames are overwritten
   - ✅ No existing wallets are lost
   - ✅ No existing onboarding status is lost

## **🚀 Next Steps After Testing**

1. **Monitor Production Logs**: Watch for any verification-related errors
2. **User Feedback**: Collect feedback from users about the verification experience
3. **Performance Monitoring**: Track verification success rates and completion times
4. **Security Review**: Ensure verification codes are properly expired and marked as used

## **📚 Related Documentation**

- [WALLET_ADDRESS_PRESERVATION_FIXES.md](./WALLET_ADDRESS_PRESERVATION_FIXES.md)
- [EXTERNAL_WALLET_FIXES_README.md](./EXTERNAL_WALLET_FIXES_README.md)
- [AUTHENTICATION_README.md](./AUTHENTICATION_README.md) 