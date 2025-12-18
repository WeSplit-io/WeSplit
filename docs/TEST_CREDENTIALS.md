# Test Credentials for iOS Team

For testing the email authentication flow without needing to receive actual verification codes, use the following placeholder credentials:

## Test Email
```
test@wesplit.app
```

## Test Verification Code
```
1234
```

## How to Use

1. Enter the test email (`test@wesplit.app`) in the login screen
2. Click "Next"
3. You'll be taken to the verification screen
4. Enter the test code (`1234`)
5. You'll be logged in as a test user

## Notes

- These credentials work in **both development and production** builds
- The test user will be created automatically in Firestore if it doesn't exist
- This bypasses the actual email sending and verification process
- Use this for testing the authentication flow without needing email access
- All test mode operations are logged with 🧪 TEST MODE prefix for debugging

## Production

✅ **Enabled in Production**: These test credentials are enabled in production builds to allow the iOS team to test the authentication flow.