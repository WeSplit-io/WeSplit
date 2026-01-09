# SPEND Integration - Complete Verification Guide

**Date**: 2025-01-27  
**Purpose**: Comprehensive guide to verify split creation, email invitations, deep links, and fallback behaviors

---

## 🎯 Overview

This guide helps you verify that the complete SPEND integration flow works correctly:

1. ✅ **Split Creation**: Splits are created and stored in Firestore
2. ✅ **Email Invitations**: Emails are sent with proper deep links
3. ✅ **Deep Links**: Both app-scheme and universal links work correctly
4. ✅ **Fallback Behaviors**: Web pages work when app is not installed
5. ✅ **End-to-End Flow**: Complete flow from creation to payment

---

## 🚀 Quick Start

### Run Complete Verification

```bash
# Run comprehensive verification
npx ts-node scripts/verify-spend-integration-complete.ts

# Check email delivery (requires Firestore admin access)
npx ts-node scripts/verify-spend-integration-complete.ts --check-emails
```

---

## 📋 Verification Checklist

### 1. Split Creation ✅

**What to Verify**:
- [ ] Split is created successfully via `/createSplitFromPayment`
- [ ] Split exists in Firestore (`splits` collection)
- [ ] Split has correct `externalMetadata` structure
- [ ] Split has `callbackUrl` if provided
- [ ] Split has `treasuryWallet` for merchant gateway mode

**How to Verify**:
```bash
# Run verification script
npx ts-node scripts/verify-spend-integration-complete.ts

# Or manually check via API
curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/getSplitStatus?splitId=YOUR_SPLIT_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Expected Result**:
```
✅ Split created successfully: split_1234567890_abc
✅ Split verified in Firestore
```

---

### 2. Email Invitations ✅

**What to Verify**:
- [ ] Emails are sent to new participants
- [ ] Email contains proper invitation link
- [ ] Invitation link uses correct domain (`wesplit-deeplinks.web.app`)
- [ ] Invitation link is a universal link (works for all users)
- [ ] Pending invitations are created in Firestore

**How to Verify**:

**Option A: Via Verification Script**
```bash
npx ts-node scripts/verify-spend-integration-complete.ts
```

**Option B: Manual API Call**
```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/batchInviteParticipants" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "splitId": "YOUR_SPLIT_ID",
    "inviterId": "CREATOR_USER_ID",
    "inviterName": "Test Creator",
    "participants": [
      {
        "email": "test@example.com",
        "name": "Test User",
        "amountOwed": 50.00
      }
    ],
    "sendNotifications": true
  }'
```

**Option C: Check Firestore**
```javascript
// In Firebase Console or Admin SDK
db.collection('pending_invitations')
  .where('splitId', '==', 'YOUR_SPLIT_ID')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log('Invitation:', doc.data());
      // Check: email, inviteLink, status, expiresAt
    });
  });
```

**Expected Result**:
```
✅ Invitations sent: 3 new users, 0 existing users
✅ Invite links generated: Yes
✅ Invite links with correct domain: 3/3
📧 Sample invite link: https://wesplit-deeplinks.web.app/join-split?invite=...
```

**Email Content Verification**:
- [ ] Email subject: `"[Inviter Name] invited you to split "[Split Title]" on WeSplit"`
- [ ] Email contains "Join Split" button
- [ ] Button links to: `https://wesplit-deeplinks.web.app/join-split?invite=...`
- [ ] Email shows correct amount owed
- [ ] Email shows split title

---

### 3. Deep Link Generation ✅

**What to Verify**:
- [ ] Universal links use correct domain (`wesplit-deeplinks.web.app`)
- [ ] App-scheme links use correct format (`wesplit://`)
- [ ] URLs are properly encoded
- [ ] Deep links work for both view-split and spend-callback

**How to Verify**:

**View Split Deep Links**:
```bash
# Universal link (works for everyone)
https://wesplit-deeplinks.web.app/view-split?splitId=SPLIT_ID&userId=USER_ID

# App-scheme link (app must be installed)
wesplit://view-split?splitId=SPLIT_ID&userId=USER_ID
```

**Spend Callback Deep Links**:
```bash
# Universal link
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=ENCODED_URL&orderId=ORDER_ID&status=success

# App-scheme link
wesplit://spend-callback?callbackUrl=ENCODED_URL&orderId=ORDER_ID&status=success
```

**Invite Links**:
```bash
# Should use: wesplit-deeplinks.web.app
https://wesplit-deeplinks.web.app/join-split?invite=BASE64_ENCODED_DATA
```

**Expected Result**:
```
✅ Universal Link Domain: Uses correct domain
✅ App-Scheme Link: Format correct
✅ Spend Callback Deep Link: Both formats generated
✅ URL Encoding: URLs properly encoded
```

---

### 4. Fallback Behaviors ✅

**What to Verify**:
- [ ] Web pages are accessible (HTTP 200)
- [ ] Web pages redirect to app if installed
- [ ] Web pages show app store links if not installed
- [ ] All deep link routes have web fallbacks

**How to Verify**:

**Test Web Pages**:
```bash
# View split page
curl -I https://wesplit-deeplinks.web.app/view-split?splitId=test123

# Join split page
curl -I https://wesplit-deeplinks.web.app/join-split?invite=test

# Spend callback page
curl -I "https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=spend%3A%2F%2Forder%2F123%2Fsuccess&status=success"
```

**Expected Result**:
```
✅ Web Page Exists (Fallback): 200 OK
✅ Join-Split Page Exists: 200 OK
✅ Spend Callback Page Exists: 200 OK
```

**Manual Testing**:
1. Open link in browser (without app installed)
2. Should see web page with:
   - Split details (for view-split)
   - "Open in WeSplit" button
   - App store download links
3. Click "Open in WeSplit" → Should open app if installed
4. If app not installed → Should redirect to app store

---

### 5. Email Delivery Verification ✅

**What to Verify**:
- [ ] Emails are actually sent (not just queued)
- [ ] Email service is configured correctly
- [ ] Email templates render correctly
- [ ] Links in emails work

**How to Verify**:

**Check Email Service Configuration**:
```bash
# Check Firebase Secrets
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASSWORD
```

**Check Email Logs**:
```bash
# View Firebase Functions logs
firebase functions:log --only batchInviteParticipants

# Look for:
# ✅ Split invitation email sent successfully
# ❌ Error sending split invitation email
```

**Test Email Delivery**:
1. Use a real email address you can access
2. Send invitation via API
3. Check inbox (and spam folder)
4. Verify email content and links

**Expected Email Template**:
- ✅ WeSplit branding (green gradient header)
- ✅ Inviter name
- ✅ Split title
- ✅ Amount owed
- ✅ "Join Split" button (links to universal link)
- ✅ Expiration notice (7 days)

---

## 🔍 Deep Link Verification

### Universal Links (HTTPS)

**Format**:
```
https://wesplit-deeplinks.web.app/{action}?{params}
```

**Actions**:
- `view-split` - View a split
- `join-split` - Join a split from invitation
- `spend-callback` - Return to SPEND app

**Testing**:
```bash
# Test on iOS Simulator
xcrun simctl openurl booted "https://wesplit-deeplinks.web.app/view-split?splitId=test123&userId=test456"

# Test on Android Emulator
adb shell am start -a android.intent.action.VIEW \
  -d "https://wesplit-deeplinks.web.app/view-split?splitId=test123&userId=test456"

# Test in Browser (should show web page)
open "https://wesplit-deeplinks.web.app/view-split?splitId=test123&userId=test456"
```

### App-Scheme Links

**Format**:
```
wesplit://{action}?{params}
```

**Testing**:
```bash
# Test on iOS Simulator
xcrun simctl openurl booted "wesplit://view-split?splitId=test123&userId=test456"

# Test on Android Emulator
adb shell am start -a android.intent.action.VIEW \
  -d "wesplit://view-split?splitId=test123&userId=test456"
```

---

## 📧 Email Invitation Flow

### Complete Flow

```
1. SPEND calls batchInviteParticipants
   ↓
2. WeSplit processes invitations:
   - Existing users → Added directly to split
   - New users → Pending invitation created
   ↓
3. For new users:
   - Generate invite link: https://wesplit-deeplinks.web.app/join-split?invite=...
   - Send email with invite link
   - Store pending invitation in Firestore
   ↓
4. User receives email
   ↓
5. User clicks link:
   - If app installed → Opens in app (universal link)
   - If app not installed → Shows web page → Redirects to app store
   ↓
6. User creates account and joins split
```

### Invite Link Format

**Generated Link**:
```
https://wesplit-deeplinks.web.app/join-split?invite={base64_encoded_data}
```

**Encoded Data Contains**:
```json
{
  "email": "user@example.com",
  "splitId": "split_123",
  "timestamp": 1234567890
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: New User Invitation

**Steps**:
1. Create split via API
2. Invite new user (email not in WeSplit)
3. Check email is sent
4. Click invite link
5. Verify web page loads
6. Verify app opens (if installed)
7. Verify user can join split

**Expected**:
- ✅ Email sent
- ✅ Invite link uses `wesplit-deeplinks.web.app`
- ✅ Web page accessible
- ✅ App opens from link
- ✅ User can join split

---

### Scenario 2: Existing User Invitation

**Steps**:
1. Create split via API
2. Invite existing user (email in WeSplit)
3. Check user is added directly
4. Verify no email sent (or notification sent)

**Expected**:
- ✅ User added directly to split
- ✅ No pending invitation created
- ✅ Push notification sent (if implemented)

---

### Scenario 3: App Not Installed

**Steps**:
1. Open invite link on device without app
2. Verify web page loads
3. Verify app store links shown
4. Install app
5. Open link again
6. Verify app opens

**Expected**:
- ✅ Web page loads
- ✅ App store links visible
- ✅ After install, app opens from link

---

### Scenario 4: Deep Link Callback

**Steps**:
1. Complete payment in WeSplit
2. Verify callback deep link generated
3. Open callback link
4. Verify redirects to SPEND app

**Expected**:
- ✅ Callback deep link generated
- ✅ Link uses correct domain
- ✅ Redirects to SPEND app

---

## 🔒 Security Verification

### URL Validation

**Test Malicious URLs**:
```bash
# Should be rejected
javascript:alert("xss")
data:text/html,<script>alert("xss")</script>
spend://order/123?x=<script>alert(1)</script>
```

**Expected**:
- ✅ All malicious URLs rejected
- ✅ Only safe protocols allowed
- ✅ Script injection blocked

### Email Security

**Verify**:
- [ ] Email links are validated before use
- [ ] No sensitive data in email logs
- [ ] Invite links expire after 7 days
- [ ] Invite links are single-use

---

## 📊 Verification Results

### Successful Verification

```
✅ Split Creation: Pass
✅ Split Verification: Pass
✅ Email Invitations: Pass
✅ Deep Link Generation: Pass
✅ Fallback Behaviors: Pass
✅ Complete Flow: Pass
```

### Common Issues

**Issue**: Deep links not in response
- **Cause**: Split doesn't have `callbackUrl` in `externalMetadata`
- **Fix**: Ensure `callbackUrl` is provided when creating split

**Issue**: Emails not sent
- **Cause**: Email service not configured
- **Fix**: Set `EMAIL_USER` and `EMAIL_PASSWORD` Firebase Secrets

**Issue**: Web pages return 301
- **Cause**: Firebase hosting redirects
- **Fix**: Check `firebase.json` rewrite rules

**Issue**: Invite links use wrong domain
- **Cause**: Old code using `wesplit.io`
- **Fix**: Ensure `generateInviteLinkSync` uses `wesplit-deeplinks.web.app`

---

## 📝 Manual Testing Checklist

### Email Testing

- [ ] Send invitation to real email
- [ ] Check email arrives (inbox and spam)
- [ ] Verify email content is correct
- [ ] Click "Join Split" button
- [ ] Verify link opens correctly

### Deep Link Testing

- [ ] Test universal link in browser (web page loads)
- [ ] Test universal link on device (app opens)
- [ ] Test app-scheme link (app opens)
- [ ] Test callback link (redirects to SPEND)

### Fallback Testing

- [ ] Open link without app installed (web page)
- [ ] Verify app store links work
- [ ] Install app and retry link (app opens)

---

## 🚨 Troubleshooting

### Emails Not Sending

1. **Check Email Service**:
   ```bash
   firebase functions:secrets:access EMAIL_USER
   firebase functions:secrets:access EMAIL_PASSWORD
   ```

2. **Check Logs**:
   ```bash
   firebase functions:log --only batchInviteParticipants
   ```

3. **Verify Transporter**:
   - Check Gmail credentials
   - Verify "Less secure app access" or App Password

### Deep Links Not Working

1. **Check Domain**:
   - Verify `wesplit-deeplinks.web.app` is correct
   - Check `firebase.json` configuration

2. **Check Universal Links**:
   - Verify `apple-app-site-association` file
   - Verify `assetlinks.json` file

3. **Check App Configuration**:
   - Verify `app.config.js` has correct domains
   - Rebuild app after changes

### Web Pages Not Loading

1. **Check Firebase Hosting**:
   ```bash
   firebase hosting:channel:list
   ```

2. **Check Rewrite Rules**:
   - Verify `firebase.json` has correct rewrites
   - Deploy hosting: `firebase deploy --only hosting:deeplinks`

---

## ✅ Success Criteria

All verifications pass when:

- ✅ Splits are created and stored correctly
- ✅ Emails are sent with proper links
- ✅ Deep links use correct domain
- ✅ Web fallback pages work
- ✅ Complete flow works end-to-end
- ✅ Security measures are in place

---

## 📚 Related Documentation

- **API Reference**: `SPEND_API_REFERENCE.md`
- **Deep Link Flow**: `DEEP_LINK_FLOW.md`
- **Security Guide**: `DEEP_LINK_SECURITY_GUIDE.md`
- **Integration Guide**: `SPEND_INTEGRATION_QUICK_REFERENCE.md`

---

**Last Updated**: 2025-01-27  
**Status**: ✅ **VERIFICATION SCRIPT READY**
