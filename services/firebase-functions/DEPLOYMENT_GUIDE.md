# Firebase Functions Deployment Guide

This guide will help you deploy the Firebase Functions for WeSplit email verification.

## Prerequisites

1. **Firebase CLI**: Install Firebase CLI globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: Make sure you have a Firebase project set up

3. **Node.js**: Version 18 or higher

## Setup Steps

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase in your project (if not already done)

```bash
cd ..  # Go back to project root
firebase init
```

Select:
- Functions
- Use existing project
- Choose your Firebase project
- TypeScript: Yes
- ESLint: Yes
- Install dependencies: Yes

### 3. Configure Email Service

You need to set up email credentials for sending verification emails.

#### Option A: Gmail (Recommended for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"

3. **Set Firebase config**:
   ```bash
   firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
   ```

#### Option B: Other Email Services

For production, consider using:
- **SendGrid**
- **Mailgun**
- **Amazon SES**

Update the email configuration in `src/index.ts` accordingly.

### 4. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:sendVerificationEmail,functions:verifyCode
```

### 5. Verify Deployment

Check the Firebase Console:
1. Go to Functions section
2. Verify all functions are deployed and active
3. Check logs for any errors

## Available Functions

### 1. `sendVerificationEmail`
- **Type**: HTTP Callable
- **Purpose**: Sends verification code via email
- **Rate Limiting**: 1 request per minute per email
- **Input**: `{ email: string, code: string }`
- **Output**: `{ success: boolean, message: string }`

### 2. `verifyCode`
- **Type**: HTTP Callable
- **Purpose**: Verifies code and creates/authenticates user
- **Input**: `{ email: string, code: string }`
- **Output**: `{ success: boolean, user: object, customToken: string }`

### 3. `onVerificationCodeCreated`
- **Type**: Firestore Trigger
- **Purpose**: Automatically sends email when code is created
- **Trigger**: When document is created in `verificationCodes` collection

### 4. `cleanupExpiredCodes`
- **Type**: Scheduled Function
- **Purpose**: Cleans up expired verification codes
- **Schedule**: Every hour

### 5. `cleanupRateLimits`
- **Type**: Scheduled Function
- **Purpose**: Cleans up old rate limit records
- **Schedule**: Every 24 hours

## Environment Configuration

### Required Environment Variables

Set these in Firebase Console or via CLI:

```bash
# Email configuration
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"

# Optional: Custom domain for emails
firebase functions:config:set email.domain="wesplit.app"
```

### View Current Config

```bash
firebase functions:config:get
```

## Testing Functions

### 1. Test Email Sending

```bash
# Test the sendVerificationEmail function
curl -X POST "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/sendVerificationEmail" \
  -H "Content-Type: application/json" \
  -d '{"data": {"email": "test@example.com", "code": "1234"}}'
```

### 2. Test Code Verification

```bash
# Test the verifyCode function
curl -X POST "https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/verifyCode" \
  -H "Content-Type: application/json" \
  -d '{"data": {"email": "test@example.com", "code": "1234"}}'
```

## Monitoring and Logs

### View Function Logs

```bash
# View all function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendVerificationEmail
```

### Monitor in Firebase Console

1. Go to Functions section
2. Click on a function
3. View metrics, logs, and performance

## Troubleshooting

### Common Issues

1. **Email not sending**:
   - Check email credentials
   - Verify Gmail app password is correct
   - Check function logs for errors

2. **Rate limiting errors**:
   - Wait 1 minute between requests
   - Check rate limit collection in Firestore

3. **Code verification fails**:
   - Check if code exists in Firestore
   - Verify code hasn't expired
   - Check function logs

4. **Deployment fails**:
   - Ensure Node.js version is 18+
   - Check TypeScript compilation
   - Verify Firebase project permissions

### Debug Mode

Enable debug logging by checking function logs:

```bash
firebase functions:log --only sendVerificationEmail --limit 50
```

## Security Considerations

1. **Rate Limiting**: Functions include rate limiting to prevent abuse
2. **Input Validation**: All inputs are validated
3. **Error Handling**: Proper error messages without exposing internals
4. **Token Security**: Custom tokens are generated for authentication

## Cost Optimization

1. **Cold Starts**: Functions may have cold starts on first invocation
2. **Memory Usage**: Functions use minimal memory
3. **Execution Time**: Functions are optimized for quick execution
4. **Scheduled Functions**: Cleanup functions run on schedule to manage costs

## Production Checklist

- [ ] Email service configured
- [ ] Functions deployed successfully
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Logs monitored
- [ ] Security rules updated
- [ ] Frontend integration tested
- [ ] Backup email service configured (optional)

## Support

For issues:
1. Check Firebase Console logs
2. Review function metrics
3. Test with curl commands
4. Check Firebase documentation 