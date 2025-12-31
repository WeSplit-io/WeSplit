# Twilio Quick Fix Guide - "Failed to start phone auth" Error

## 🚨 Immediate Action Items

### Step 1: Verify Twilio Account Status
1. Go to: https://console.twilio.com/us1/account/status
2. Check:
   - ✅ Account Status: Should be "Active" or "Verified"
   - ✅ Account Type: Should NOT be "Trial" (trial accounts have restrictions)
   - ✅ Account Balance: Should have at least $10

**If account is Trial:**
- Upgrade to paid account at: https://console.twilio.com/us1/account/billing/upgrade

### Step 2: Verify Phone Number Configuration
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Find your number: `+13253092862`
3. Check:
   - ✅ Status: Should be "Active" or "In-use"
   - ✅ SMS Capability: Must be enabled
   - ✅ Voice Capability: Should be enabled

**If phone number is not active:**
- Click on the number → Configure → Enable SMS

### Step 3: Test Twilio Configuration
Run the diagnostic script:
```bash
cd /Users/charlesvincent/Desktop/GitHub/WeSplit
npm install twilio  # If not already installed
node scripts/test-twilio-config.js +YOUR_PHONE_NUMBER
```

This will test:
- Account status
- Phone number configuration
- SMS sending capability

### Step 4: Check Firebase Function Logs
```bash
firebase functions:log --only startPhoneAuthentication | tail -20
```

Look for:
- ❌ Twilio error codes (see error code reference below)
- ❌ "Invalid 'To' Phone Number" (phone format issue)
- ❌ "Authentication Error" (credentials issue)
- ❌ "Unsubscribed recipient" (opt-out issue)

### Step 5: Verify Secrets Are Accessible
```bash
firebase functions:secrets:access TWILIO_SID
firebase functions:secrets:access TWILIO_AUTH_TOKKEN
firebase functions:secrets:access TWILIO_PHONE_NUMBER
```

All should return values (not empty).

### Step 6: Redeploy Function (if secrets were updated)
```bash
cd services/firebase-functions
firebase deploy --only functions:startPhoneAuthentication
```

---

## 🔍 Common Twilio Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| **21211** | Invalid 'To' Phone Number | Ensure phone number is in E.164 format (+1234567890) |
| **21214** | Invalid 'From' Phone Number | Verify phone number in Twilio Console |
| **20003** | Authentication Error | Check Account SID and Auth Token |
| **21608/21610/21614** | Unsubscribed recipient | Remove from opt-out list in Twilio Console |
| **30008** | Unknown destination | Phone number doesn't exist |
| **30003** | Unreachable destination | Phone is off or out of coverage |
| **20429** | Too Many Requests | Rate limit exceeded - wait and retry |

---

## ✅ Twilio Account Checklist (Must Complete All)

### Account Requirements
- [ ] Account is **verified** (not trial/restricted)
- [ ] Account has **sufficient balance** ($10+ recommended)
- [ ] Account is in **"Good Standing"** (no restrictions)

### Phone Number Requirements
- [ ] Phone number `+13253092862` is **active**
- [ ] Phone number has **SMS capability enabled**
- [ ] Phone number is **verified** in Twilio Console

### API Credentials
- [ ] Account SID is correct: `AC479161e9000547ff424ca49ab4fe2496`
- [ ] Auth Token is correct: `fc6df2060a1a663bb036682edb3aedf9`
- [ ] Phone Number is correct: `+13253092862`

### Firebase Configuration
- [ ] All secrets are set in Firebase
- [ ] Function is deployed with secrets bound
- [ ] Function logs show no authentication errors

### A2P 10DLC (US Numbers Only)
- [ ] Brand registered (if sending to US numbers)
- [ ] Campaign registered (if sending to US numbers)
- [ ] Approval status: Approved

**Note:** A2P 10DLC registration can take 1-2 weeks. Without it, messages to US numbers may be blocked.

---

## 🧪 Testing Steps

### 1. Test from Twilio Console
1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out
2. Send test message to your phone
3. Verify message is received

### 2. Test via API
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/AC479161e9000547ff424ca49ab4fe2496/Messages.json" \
  -u "AC479161e9000547ff424ca49ab4fe2496:fc6df2060a1a663bb036682edb3aedf9" \
  -d "From=+13253092862" \
  -d "To=+YOUR_PHONE_NUMBER" \
  -d "Body=Test verification code: 123456"
```

### 3. Test via Firebase Function
```bash
firebase functions:shell
startPhoneAuthentication({phoneNumber: "+YOUR_PHONE_NUMBER"})
```

---

## 📋 Most Likely Issues

### Issue #1: Trial Account Restrictions
**Symptoms:** Works in dev, fails in production
**Solution:** Upgrade to paid account

### Issue #2: A2P 10DLC Not Registered (US Numbers)
**Symptoms:** Messages blocked or filtered
**Solution:** Register brand and campaign (takes 1-2 weeks)

### Issue #3: Phone Number Not Verified
**Symptoms:** "Invalid 'From' Phone Number" error
**Solution:** Verify phone number in Twilio Console

### Issue #4: Insufficient Credits
**Symptoms:** Messages fail to send
**Solution:** Add funds to Twilio account

### Issue #5: Secrets Not Accessible
**Symptoms:** Function falls back to test mode
**Solution:** Redeploy function after setting secrets

---

## 🆘 If Still Not Working

1. **Check Firebase Function Logs:**
   ```bash
   firebase functions:log --only startPhoneAuthentication | grep -i error
   ```

2. **Run Diagnostic Script:**
   ```bash
   node scripts/test-twilio-config.js +YOUR_PHONE_NUMBER
   ```

3. **Check Twilio Console:**
   - Go to: https://console.twilio.com/us1/monitor/logs/sms
   - Look for failed message attempts
   - Check error codes and messages

4. **Contact Twilio Support:**
   - If account/phone number issues persist
   - Support: https://support.twilio.com

---

## 📝 Notes

- **Trial accounts** can only send to verified phone numbers
- **A2P 10DLC** is required for US-to-US SMS in production
- **Phone number format** must be E.164: +1234567890
- **Secrets must be redeployed** after updating Firebase secrets

---

## ✅ Verification

After completing all steps, verify:
1. ✅ Test SMS from Twilio Console → Success
2. ✅ Test SMS via API → Success  
3. ✅ Test SMS via Firebase Function → Success
4. ✅ Test from Production App → Success

If all tests pass, phone auth should work in production!

