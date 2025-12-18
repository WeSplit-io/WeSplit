# SPEND Integration - Deployment Checklist

**Date**: 2025-01-27  
**Purpose**: Ensure all changes are deployed and verified before production

---

## 🚀 Pre-Deployment Checklist

### Code Changes ✅

- [x] **Invite Link Domain Updated**
  - File: `services/firebase-functions/src/spendApiEndpoints.js`
  - Change: `generateInviteLinkSync()` now uses `wesplit-deeplinks.web.app`
  - Status: ✅ Code updated, needs deployment

- [x] **Deep Link Domain Updated**
  - All deep links use `wesplit-deeplinks.web.app`
  - Status: ✅ Code updated

- [x] **URL Validation Added**
  - Callback URLs validated for security
  - Status: ✅ Code updated

- [x] **Test Scripts Updated**
  - All test scripts use production endpoints
  - Status: ✅ Code updated

---

## 📦 Deployment Steps

### 1. Deploy Firebase Functions

```bash
cd services/firebase-functions
npm install  # Ensure dependencies are up to date
firebase deploy --only functions
```

**Functions to Deploy**:
- `createSplitFromPayment`
- `batchInviteParticipants`
- `payParticipantShare`
- `getSplitStatus`
- `searchKnownUsers`
- `matchUsersByEmail`
- `spendWebhook`

**Expected Output**:
```
✔  functions[createSplitFromPayment(us-central1)] Successful update operation.
✔  functions[batchInviteParticipants(us-central1)] Successful update operation.
...
```

---

### 2. Verify Deployment

**Check Functions Are Deployed**:
```bash
firebase functions:list
```

**Check Logs**:
```bash
firebase functions:log --only batchInviteParticipants --limit 10
```

---

### 3. Run Verification Script

```bash
npx ts-node scripts/verify-spend-integration-complete.ts
```

**Expected Results**:
- ✅ Split creation works
- ✅ Email invitations sent
- ✅ Invite links use `wesplit-deeplinks.web.app`
- ✅ Deep links work correctly
- ✅ Fallback pages accessible

---

## ✅ Post-Deployment Verification

### 1. Test Split Creation

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 100,
    "currency": "USDC",
    "invoiceId": "TEST-DEPLOY",
    "metadata": {
      "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "orderId": "ORD-DEPLOY-123"
    }
  }'
```

**Verify**:
- [ ] Split created successfully
- [ ] Split ID returned
- [ ] Split exists in Firestore

---

### 2. Test Email Invitations

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/batchInviteParticipants" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "splitId": "SPLIT_ID_FROM_STEP_1",
    "inviterId": "USER_ID_FROM_STEP_1",
    "inviterName": "Test Creator",
    "participants": [
      {
        "email": "your-real-email@example.com",
        "name": "Test User",
        "amountOwed": 50.00
      }
    ],
    "sendNotifications": true
  }'
```

**Verify**:
- [ ] Invitation sent successfully
- [ ] Invite link in response uses `wesplit-deeplinks.web.app`
- [ ] Email received (check inbox)
- [ ] Email link works

---

### 3. Test Deep Links

**View Split Link**:
```
https://wesplit-deeplinks.web.app/view-split?splitId=SPLIT_ID&userId=USER_ID
```

**Test**:
- [ ] Opens in browser (web page)
- [ ] Opens in app (if installed)
- [ ] Shows correct split details

**Join Split Link** (from email):
```
https://wesplit-deeplinks.web.app/join-split?invite=ENCODED_DATA
```

**Test**:
- [ ] Opens in browser (web page)
- [ ] Opens in app (if installed)
- [ ] Allows user to join split

---

### 4. Test Fallback Behaviors

**Without App Installed**:
1. Open invite link in browser
2. Should see web page
3. Should show "Open in WeSplit" button
4. Should show app store links

**With App Installed**:
1. Open invite link
2. Should open app directly
3. Should navigate to split

---

## 🔍 Verification Checklist

### Split Creation ✅

- [ ] Splits created successfully
- [ ] Splits stored in Firestore
- [ ] Split data is correct
- [ ] External metadata stored correctly

### Email Invitations ✅

- [ ] Emails are sent
- [ ] Invite links use `wesplit-deeplinks.web.app`
- [ ] Email content is correct
- [ ] Links in emails work

### Deep Links ✅

- [ ] Universal links use correct domain
- [ ] App-scheme links work
- [ ] URLs are properly encoded
- [ ] All deep link types work

### Fallback Behaviors ✅

- [ ] Web pages are accessible
- [ ] Web pages redirect to app if installed
- [ ] Web pages show app store if not installed
- [ ] All routes have fallbacks

---

## 🚨 Common Issues

### Issue: Invite Links Still Use Old Domain

**Cause**: Functions not deployed yet

**Fix**:
```bash
cd services/firebase-functions
firebase deploy --only functions
```

**Verify**:
- Re-run verification script
- Check invite links in response
- Should use `wesplit-deeplinks.web.app`

---

### Issue: Emails Not Sending

**Cause**: Email service not configured

**Fix**:
```bash
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASSWORD
```

**Verify**:
- Check Firebase Functions logs
- Look for email send confirmations

---

### Issue: Web Pages Return 301

**Cause**: Firebase hosting redirects

**Fix**:
- Check `firebase.json` rewrite rules
- Verify pages are deployed
- Test in browser (301 may be normal)

---

## 📊 Deployment Status

| Component | Code Status | Deployment Status | Verification |
|-----------|-------------|------------------|--------------|
| Invite Links | ✅ Updated | ⏳ Needs Deploy | ⏳ Pending |
| Deep Links | ✅ Updated | ✅ Deployed | ✅ Verified |
| URL Validation | ✅ Updated | ✅ Deployed | ✅ Verified |
| Test Scripts | ✅ Updated | ✅ Ready | ✅ Verified |

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ All functions deployed
- ✅ Invite links use `wesplit-deeplinks.web.app`
- ✅ Emails are sent correctly
- ✅ Deep links work
- ✅ Fallback pages work
- ✅ All tests pass

---

## 📝 Post-Deployment

After deployment:

1. **Run Verification Script**:
   ```bash
   npx ts-node scripts/verify-spend-integration-complete.ts
   ```

2. **Test with Real Email**:
   - Send invitation to your email
   - Verify email received
   - Click link and verify it works

3. **Test on Device**:
   - Test with app installed
   - Test without app installed
   - Verify fallback behaviors

4. **Monitor Logs**:
   ```bash
   firebase functions:log --only batchInviteParticipants
   ```

---

**Last Updated**: 2025-01-27  
**Status**: ⏳ **READY FOR DEPLOYMENT**
