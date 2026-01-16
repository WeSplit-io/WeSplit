# SPEND Invitation Flow - Verification & Issues

**Date**: 2025-01-27  
**Status**: ⚠️ **ISSUES FOUND - FIXES NEEDED**

---

## 🔍 Issues Identified

### 1. ⚠️ **CRITICAL: Invite Link Data Structure Mismatch**

**Problem**: SPEND endpoint generates invite links with minimal data, but app expects full invitation object.

**SPEND Generates** (`generateInviteLinkSync`):
```javascript
{
  email: email,
  splitId: splitId || null,
  timestamp: Date.now()
}
```

**App Expects** (`PendingInvitation` interface):
```typescript
{
  type: 'split_invitation',
  splitId: string,
  billName: string,
  totalAmount: number,
  currency: string,
  creatorId: string,
  creatorName?: string,
  timestamp: string,
  expiresAt?: string,
  splitType?: 'fair' | 'degen' | 'spend'
}
```

**Impact**: 
- ❌ App cannot parse invitation data correctly
- ❌ Missing required fields (`type`, `billName`, `creatorId`, etc.)
- ❌ Users cannot join splits via email invitations

---

### 2. ⚠️ **Email Configuration Dependency**

**Problem**: Email sending requires Firebase Secrets to be configured.

**Required Secrets**:
- `EMAIL_USER` - Gmail address
- `EMAIL_PASSWORD` - Gmail app password

**Current Behavior**:
- If secrets not set: Email sending fails silently
- Logs warning but continues (doesn't fail invitation)
- Users don't receive emails

**Impact**:
- ⚠️ Emails may not be sent if secrets not configured
- ⚠️ No error returned to SPEND team
- ⚠️ Invitations still created but users not notified

---

### 3. ⚠️ **Invite Link Parameter Mismatch**

**Problem**: SPEND uses `invite` parameter, but app deep link handler expects `data` parameter.

**SPEND Generates**:
```
https://wesplit-deeplinks.web.app/join-split?invite=base64encoded
```

**HTML Page**:
- ✅ Can parse `invite` parameter
- ✅ Converts to `data` parameter for app-scheme links
- ⚠️ But data structure doesn't match app expectations

**App Deep Link Handler**:
- ✅ Expects `data` parameter
- ❌ Expects full `PendingInvitation` object
- ❌ Current invite data doesn't match

---

## ✅ What's Working

1. ✅ Email template is well-designed
2. ✅ Email sending function is implemented
3. ✅ HTML page can parse `invite` parameter
4. ✅ Deep link handler can process `join-split` action
5. ✅ Pending invitations are stored in Firestore
6. ✅ Invite links are generated with proper format

---

## 🔧 Required Fixes

### Fix 1: Update Invite Link Generation

**File**: `services/firebase-functions/src/spendApiEndpoints.js`

**Current** (line 1061-1069):
```javascript
function generateInviteLinkSync(email, splitId) {
  const inviteData = {
    email: email,
    splitId: splitId || null,
    timestamp: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(inviteData)).toString('base64url');
  return `https://wesplit-deeplinks.web.app/join-split?invite=${encoded}`;
}
```

**Should Be**:
```javascript
function generateInviteLinkSync(email, splitId, splitData, inviterId, inviterName) {
  const inviteData = {
    type: 'split_invitation',
    splitId: splitId || null,
    billName: splitData?.title || 'Split',
    totalAmount: splitData?.totalAmount || 0,
    currency: splitData?.currency || 'USDC',
    creatorId: inviterId || splitData?.creatorId || '',
    creatorName: inviterName || splitData?.creatorName || 'Someone',
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: splitData?.splitType || 'spend'
  };
  const encoded = Buffer.from(JSON.stringify(inviteData)).toString('base64url');
  return `https://wesplit-deeplinks.web.app/join-split?invite=${encoded}`;
}
```

---

### Fix 2: Update Invite Link Generation Calls

**File**: `services/firebase-functions/src/spendApiEndpoints.js`

**Location**: Line 1356 in `batchInviteParticipants`

**Current**:
```javascript
const inviteLink = generateInviteLinkSync(email, splitId);
```

**Should Be**:
```javascript
const inviteLink = generateInviteLinkSync(
  email, 
  splitId, 
  splitData, 
  inviterId, 
  inviterName
);
```

---

### Fix 3: Verify Email Configuration

**Action Required**: Ensure Firebase Secrets are set:

```bash
# Check if secrets are set
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASSWORD

# If not set, configure them:
echo 'your-email@gmail.com' | firebase functions:secrets:set EMAIL_USER
echo 'your-app-password' | firebase functions:secrets:set EMAIL_PASSWORD
```

---

### Fix 4: Update HTML Page to Handle Full Invitation Data

**File**: `public/join-split/index.html`

**Current**: Parses `invite` parameter and converts to `data` parameter

**Status**: ✅ Already works, but needs full invitation data from SPEND

---

## 📊 Flow Verification

### Current Flow (BROKEN)

1. SPEND calls `/batchInviteParticipants`
2. Endpoint generates invite link with minimal data ❌
3. Email sent with invite link ✅ (if email configured)
4. User clicks link → HTML page parses `invite` parameter ✅
5. HTML converts to app-scheme link with `data` parameter ✅
6. App receives deep link ❌ **FAILS** - data structure doesn't match

### Fixed Flow (AFTER FIXES)

1. SPEND calls `/batchInviteParticipants`
2. Endpoint generates invite link with full invitation data ✅
3. Email sent with invite link ✅ (if email configured)
4. User clicks link → HTML page parses `invite` parameter ✅
5. HTML converts to app-scheme link with `data` parameter ✅
6. App receives deep link ✅ **WORKS** - data structure matches

---

## 🧪 Testing Checklist

### Email Sending
- [ ] Verify `EMAIL_USER` secret is set
- [ ] Verify `EMAIL_PASSWORD` secret is set
- [ ] Test email sending with test endpoint
- [ ] Verify emails are received
- [ ] Check email template renders correctly

### Invite Links
- [ ] Verify invite link contains all required fields
- [ ] Test invite link parsing in HTML page
- [ ] Test deep link handling in app
- [ ] Verify user can join split via invitation

### End-to-End Flow
- [ ] SPEND creates split
- [ ] SPEND invites participants
- [ ] Participants receive emails
- [ ] Participants click invite link
- [ ] App opens and user joins split

---

## ⚠️ Critical Actions Required

1. **URGENT**: Fix invite link data structure (Fix 1 & 2)
2. **URGENT**: Verify email configuration (Fix 3)
3. **IMPORTANT**: Test end-to-end flow after fixes
4. **RECOMMENDED**: Add error handling for email failures

---

## 📝 Notes

- Email sending failures are logged but don't fail the invitation
- This is intentional (graceful degradation)
- But SPEND team should be aware if emails aren't being sent
- Consider adding email status to API response

---

**Last Updated**: 2025-01-27  
**Status**: ⚠️ **FIXES REQUIRED BEFORE PRODUCTION**
