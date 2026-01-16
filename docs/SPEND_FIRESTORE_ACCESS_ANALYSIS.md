# SPEND Endpoints - Firestore Access Analysis

**Date**: 2025-01-27  
**Purpose**: Verify SPEND team endpoints have proper Firestore access for all operations

---

## 🔍 Executive Summary

✅ **All SPEND endpoints use Firebase Admin SDK** - This means they **bypass Firestore security rules** and have full access to all collections. However, we should still define rules for:
- Defense in depth
- Documentation purposes
- Protection if client SDK is accidentally used

---

## 📊 Collections Accessed by SPEND Endpoints

### Core Collections (Already Have Rules)

| Collection | Endpoint Usage | Current Rules | Status |
|------------|---------------|----------------|--------|
| `users` | Read/Write - Find users by email, create new users | ✅ Has rules | ✅ OK |
| `splits` | Read/Write - Create splits, update participants, check status | ✅ Has rules | ✅ OK |

### Missing Collections (Need Rules Added)

| Collection | Endpoint Usage | Current Rules | Status |
|------------|---------------|----------------|--------|
| `apiKeys` | Read - Validate API keys, update usage stats | ❌ No rules | ⚠️ **NEEDS RULES** |
| `pending_invitations` | Write - Store pending invites for new users | ❌ No rules | ⚠️ **NEEDS RULES** |
| `invite_batches` | Write - Log analytics for email matching | ❌ No rules | ⚠️ **NEEDS RULES** |
| `webhook_logs` | Write - Log outgoing webhooks to SPEND | ❌ No rules | ⚠️ **NEEDS RULES** |
| `spend_webhook_received` | Write - Log incoming webhooks from SPEND | ❌ No rules | ⚠️ **NEEDS RULES** |
| `spend_webhook_logs` | Write - Log webhook attempts | ❌ No rules | ⚠️ **NEEDS RULES** |
| `linkedWallets` | Write - Link external wallets from SPEND | ❌ No rules | ⚠️ **NEEDS RULES** |
| `rateLimits` | Read/Write - Rate limiting for API calls | ❌ No rules | ⚠️ **NEEDS RULES** |

---

## 🔐 Endpoint-by-Endpoint Analysis

### 1. `POST /createSplitFromPayment`
**Collections Accessed**:
- ✅ `apiKeys` - Validate API key
- ✅ `users` - Find/create user
- ✅ `linkedWallets` - Link external wallet
- ✅ `splits` - Create split document

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works, but `apiKeys` and `linkedWallets` should have rules

---

### 2. `POST /matchUsersByEmail`
**Collections Accessed**:
- ✅ `users` - Query users by email
- ✅ `invite_batches` - Log analytics

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works, but `invite_batches` should have rules

---

### 3. `POST /batchInviteParticipants`
**Collections Accessed**:
- ✅ `splits` - Read/update split
- ✅ `users` - Find/create users
- ✅ `pending_invitations` - Create pending invites

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works, but `pending_invitations` should have rules

---

### 4. `POST /inviteParticipantsToSplit`
**Collections Accessed**:
- ✅ `splits` - Read/update split
- ✅ `users` - Find/create users

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works

---

### 5. `POST /payParticipantShare`
**Collections Accessed**:
- ✅ `splits` - Read/update split (update participant payment)

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works

---

### 6. `GET /getSplitStatus`
**Collections Accessed**:
- ✅ `splits` - Read split document

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works

---

### 7. `GET /searchKnownUsers`
**Collections Accessed**:
- ✅ `users` - Search users by email/name/wallet

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works

---

### 8. `POST /spendWebhook`
**Collections Accessed**:
- ✅ `splits` - Read/update split (update order status)
- ✅ `spend_webhook_received` - Log incoming webhook

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works, but `spend_webhook_received` should have rules

---

### 9. Webhook Logging (Internal)
**Collections Accessed**:
- ✅ `webhook_logs` - Log outgoing webhooks
- ✅ `spend_webhook_logs` - Log webhook attempts

**Access Type**: Admin SDK (bypasses rules)  
**Status**: ✅ Works, but both should have rules

---

## ⚠️ Security Recommendations

### Collections That Need Rules Added

All these collections are **server-side only** and should be **restricted to admin access**:

1. **`apiKeys`** - Should be admin-only (read/write)
2. **`pending_invitations`** - Should be admin-only (write), or allow read for specific users
3. **`invite_batches`** - Should be admin-only (write)
4. **`webhook_logs`** - Should be admin-only (write)
5. **`spend_webhook_received`** - Should be admin-only (write)
6. **`spend_webhook_logs`** - Should be admin-only (write)
7. **`linkedWallets`** - Should allow users to read their own, admin to write
8. **`rateLimits`** - Should be admin-only (read/write)

---

## ✅ Current Status

### What Works Now
- ✅ All SPEND endpoints function correctly (using Admin SDK)
- ✅ All core collections (`users`, `splits`) have proper rules
- ✅ No access issues for SPEND team operations

### What Should Be Added
- ⚠️ Rules for server-side collections (defense in depth)
- ⚠️ Rules for logging/analytics collections
- ⚠️ Rules for API key management collection

---

## 🔒 Recommended Firestore Rules Additions

See the updated `firestore.rules` file for the complete rules. Key additions:

1. **`apiKeys`** - Admin-only access
2. **`pending_invitations`** - Admin write, user read (for their own invites)
3. **`invite_batches`** - Admin-only write
4. **`webhook_logs`** - Admin-only write
5. **`spend_webhook_received`** - Admin-only write
6. **`spend_webhook_logs`** - Admin-only write
7. **`linkedWallets`** - User read own, admin write
8. **`rateLimits`** - Admin-only access

---

## 📝 Notes

1. **Admin SDK Bypass**: All SPEND endpoints use `admin.firestore()` which bypasses security rules. This is correct for server-side functions.

2. **Defense in Depth**: Even though Admin SDK bypasses rules, we should still define rules to:
   - Protect against accidental client SDK usage
   - Document expected access patterns
   - Provide additional security layer

3. **No Breaking Changes**: Adding these rules won't break existing functionality since Admin SDK bypasses them.

4. **Client Access**: If any client code needs to access these collections, they would need proper authentication and rules would apply.

---

## ✅ Conclusion

**SPEND team endpoints have full access to all required data** via Firebase Admin SDK. The recommended rule additions are for defense in depth and won't affect current functionality.

**Action Items**:
1. ✅ Verify all collections are accessible (DONE - Admin SDK bypasses rules)
2. ⚠️ Add rules for missing collections (RECOMMENDED - for security best practices)
3. ✅ Document access patterns (DONE - this document)

---

**Last Updated**: 2025-01-27
