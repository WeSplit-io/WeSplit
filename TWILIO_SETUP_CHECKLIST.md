eeett
eeeeeqEA# Twilio Account Setup Checklist for Production Phone Authentication

## 🔴 CRITICAL: Complete ALL items below for phone auth to work in production

### 1. Twilio Account Status ✅/❌

#### Account Verification
- [ ] **Account is fully verified** (not trial/restricted)
  - Go to: https://console.twilio.com/us1/account/status
  - Status should show: "Verified" or "Active"
  - Trial accounts have restrictions and may not work in production
  
- [ ] **Account has sufficient credits/balance**
  - Go to: https://console.twilio.com/us1/account/usage
  - Minimum recommended: $10+ balance
  - SMS costs ~$0.0075 per message (varies by country)
  - Check: Account → Billing → Account Balance

#### Account Restrictions
- [ ] **No account restrictions or suspensions**
  - Go to: https://console.twilio.com/us1/account/status
  - Check for any warnings or restrictions
  - Account must be in "Good Standing"

---

### 2. Phone Number Configuration ✅/❌

#### Phone Number Status
- [ ] **Phone number is verified and active**
  - Current number: `+13253092862`
  - Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
  - Verify the number shows as "Active" (green status)
  
- [ ] **Phone number has SMS capability enabled**
  - In phone number settings, verify:
    - ✅ SMS enabled
    - ✅ Voice enabled (if needed)
  - Go to: Phone Number → Configure → Capabilities

#### Phone Number Verification
- [ ] **Phone number is approved for SMS sending**
  - Some numbers require approval for production use
  - Check: Phone Numbers → [Your Number] → Status
  - Should show: "Active" or "Verified"

#### Geographic Restrictions
- [ ] **Phone number can send to target countries**
  - Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
  - Click on your phone number
  - Check "Geographic Permissions"
  - Ensure countries you're sending to are allowed
  - US number (+1) can typically send to most countries

---

### 3. API Credentials ✅/❌

#### Account SID
- [ ] **Account SID is correct**
  - Current: `AC479161e9000547ff424ca49ab4fe2496`
  - Verify at: https://console.twilio.com/us1/account/keys-credentials
  - Should match exactly (case-sensitive)

#### Auth Token
- [ ] **Auth Token is correct and active**
  - Current: `fc6df2060a1a663bb036682edb3aedf9`
  - Verify at: https://console.twilio.com/us1/account/keys-credentials
  - If regenerated, update Firebase secrets

#### API Keys (Optional but Recommended)
- [ ] **API Key created for production use** (optional)
  - Go to: https://console.twilio.com/us1/account/keys-credentials/api-keys
  - Create a new API key for production
  - Use API Key SID + Secret instead of Account SID + Auth Token
  - More secure and allows key rotation

---

### 4. Messaging Service Configuration ✅/❌

#### Messaging Service Setup (Recommended)
- [ ] **Messaging Service created and configured**
  - Go to: https://console.twilio.com/us1/develop/messaging/services
  - Create a Messaging Service (recommended for production)
  - Add your phone number to the service
  - Use Messaging Service SID instead of phone number in code
  - Benefits: Better delivery, analytics, compliance

#### Sender Pool
- [ ] **Phone number added to sender pool** (if using Messaging Service)
  - In Messaging Service → Sender Pool
  - Add phone number: `+13253092862`

---

### 5. Compliance & Verification ✅/❌

#### A2P 10DLC Registration (US Numbers)
- [ ] **A2P 10DLC campaign registered** (if sending to US numbers)
  - Required for US-to-US SMS in production
  - Go to: https://console.twilio.com/us1/develop/sms/a2p-10dlc
  - Register your brand and campaign
  - Approval can take 1-2 weeks
  - Without this, messages may be blocked or filtered

#### Opt-In Compliance
- [ ] **Opt-in mechanism implemented**
  - Users must explicitly opt-in to receive SMS
  - Store opt-in consent in your database
  - Include opt-out instructions in messages

#### Message Content
- [ ] **Message content complies with Twilio policies**
  - Current message: `WeSplit verification code: {code}`
  - Should not contain spam keywords
  - Should clearly identify sender
  - Should include opt-out instructions if required

---

### 6. Firebase Secrets Configuration ✅/❌

#### Secrets Verification
- [ ] **All secrets are set in Firebase**
  ```bash
  firebase functions:secrets:access TWILIO_SID
  firebase functions:secrets:access TWILIO_AUTH_TOKKEN
  firebase functions:secrets:access TWILIO_PHONE_NUMBER
  ```
  - Current values:
    - TWILIO_SID: `AC479161e9000547ff424ca49ab4fe2496`
    - TWILIO_AUTH_TOKKEN: `fc6df2060a1a663bb036682edb3aedf9`
    - TWILIO_PHONE_NUMBER: `+13253092862`

#### Function Binding
- [ ] **Function is bound to secrets**
  - Verified in: `services/firebase-functions/src/phoneFunctions.js:264`
  - Function uses: `functions.runWith({ secrets: [...] })`
  - After setting secrets, function must be redeployed

#### Secret Access
- [ ] **Secrets are accessible in production**
  - Test by checking function logs
  - If secrets are missing, function will fall back to test mode
  - Check logs: `firebase functions:log --only startPhoneAuthentication`

---

### 7. Testing & Verification ✅/❌

#### Test SMS Sending
- [ ] **Test SMS can be sent from Twilio Console**
  - Go to: https://console.twilio.com/us1/develop/sms/try-it-out
  - Send test message to your phone
  - Verify message is received
  - Check message status (should be "Delivered")

#### Test via API
- [ ] **Test SMS via API call**
  ```bash
  curl -X POST https://api.twilio.com/2010-04-01/Accounts/AC479161e9000547ff424ca49ab4fe2496/Messages.json \
    -u "AC479161e9000547ff424ca49ab4fe2496:fc6df2060a1a663bb036682edb3aedf9" \
    -d "From=+13253092862" \
    -d "To=+YOUR_PHONE_NUMBER" \
    -d "Body=Test message"
  ```
  - Replace `YOUR_PHONE_NUMBER` with your test number
  - Should return message SID and status

#### Test Firebase Function
- [ ] **Test Firebase Function directly**
  - Use Firebase Console → Functions → Test
  - Or use Firebase CLI:
    ```bash
    firebase functions:shell
    startPhoneAuthentication({phoneNumber: "+YOUR_PHONE_NUMBER"})
    ```
  - Check logs for errors

---

### 8. Common Twilio Error Codes & Solutions

#### Error 21211: Invalid 'To' Phone Number
- **Cause**: Phone number format is invalid
- **Solution**: Ensure phone number is in E.164 format (+1234567890)
- **Check**: Phone number validation in client code

#### Error 21608: Unsubscribed recipient
- **Cause**: Recipient has opted out
- **Solution**: Remove from opt-out list or use different number

#### Error 21610: Unsubscribed recipient (via STOP)
- **Cause**: User sent STOP to your number
- **Solution**: Remove from opt-out list

#### Error 21614: Unsubscribed recipient (via HELP)
- **Cause**: User sent HELP to your number
- **Solution**: Remove from opt-out list

#### Error 30008: Unknown destination handset
- **Cause**: Phone number doesn't exist or is invalid
- **Solution**: Verify phone number is correct

#### Error 30003: Unreachable destination handset
- **Cause**: Phone is off or out of coverage
- **Solution**: Retry later

#### Error 21214: Invalid 'From' Phone Number
- **Cause**: Phone number not verified or not in your account
- **Solution**: Verify phone number in Twilio Console

#### Error 20003: Authentication Error
- **Cause**: Invalid Account SID or Auth Token
- **Solution**: Verify credentials in Firebase secrets

#### Error 20429: Too Many Requests
- **Cause**: Rate limit exceeded
- **Solution**: Implement rate limiting or upgrade account

---

### 9. Production Readiness Checklist

#### Before Going Live
- [ ] Account is verified (not trial)
- [ ] Account has sufficient balance ($10+ recommended)
- [ ] Phone number is active and SMS-enabled
- [ ] A2P 10DLC registered (if sending to US)
- [ ] Secrets are set in Firebase
- [ ] Function is deployed with secrets bound
- [ ] Test SMS sent successfully
- [ ] Error handling is implemented
- [ ] Monitoring/logging is set up

#### Monitoring
- [ ] Set up Twilio webhooks for delivery status
- [ ] Monitor Firebase Functions logs
- [ ] Set up alerts for failures
- [ ] Track SMS delivery rates

---

### 10. Quick Diagnostic Commands

#### Check Twilio Account Status
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/AC479161e9000547ff424ca49ab4fe2496.json" \
  -u "AC479161e9000547ff424ca49ab4fe2496:fc6df2060a1a663bb036682edb3aedf9"
```

#### Check Phone Number Status
```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/AC479161e9000547ff424ca49ab4fe2496/IncomingPhoneNumbers.json" \
  -u "AC479161e9000547ff424ca49ab4fe2496:fc6df2060a1a663bb036682edb3aedf9"
```

#### Check Firebase Function Logs
```bash
firebase functions:log --only startPhoneAuthentication | tail -50
```

#### Test SMS Sending
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/AC479161e9000547ff424ca49ab4fe2496/Messages.json" \
  -u "AC479161e9000547ff424ca49ab4fe2496:fc6df2060a1a663bb036682edb3aedf9" \
  -d "From=+13253092862" \
  -d "To=+YOUR_PHONE_NUMBER" \
  -d "Body=Test verification code: 123456"
```

---

## 🚨 Most Common Issues in Production

1. **Trial Account Restrictions**
   - Trial accounts can only send to verified numbers
   - Solution: Upgrade to paid account

2. **A2P 10DLC Not Registered** (US numbers)
   - Messages blocked or filtered
   - Solution: Register brand and campaign

3. **Phone Number Not Verified**
   - Number shows as inactive
   - Solution: Verify number in Twilio Console

4. **Insufficient Credits**
   - Account balance too low
   - Solution: Add funds to account

5. **Secrets Not Accessible**
   - Function can't access secrets
   - Solution: Redeploy function after setting secrets

---

## 📞 Twilio Support

If issues persist after completing this checklist:
- Twilio Support: https://support.twilio.com
- Twilio Status: https://status.twilio.com
- Twilio Console: https://console.twilio.com

---

## ✅ Verification Steps

After completing the checklist, verify everything works:

1. **Test from Twilio Console** → Should succeed
2. **Test via API** → Should return message SID
3. **Test via Firebase Function** → Should create session and send SMS
4. **Test from Production App** → Should receive SMS code

If any step fails, check the error code and refer to section 8 above.

