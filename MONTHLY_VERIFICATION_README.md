# Monthly Verification Bypass Feature

## Overview

The WeSplit app now includes a monthly verification bypass feature that allows users who have already verified their email in the current month to skip the verification code process on subsequent logins.

## How It Works

### 1. Monthly Verification Tracking
- Each user document in Firestore includes a `lastVerifiedAt` timestamp
- This timestamp is updated every time a user successfully verifies their email
- The system checks if the last verification was in the current month

### 2. Verification Bypass Logic
When a user enters their email on the AuthMethodsScreen:

1. **Check Monthly Status**: The system checks if the user has verified this month
2. **Bypass if Eligible**: If verified this month, the user is automatically logged in
3. **Require Verification**: If not verified this month, a verification code is sent

### 3. Implementation Details

#### Frontend (React Native)
- **File**: `src/screens/AuthMethods/AuthMethodsScreen.tsx`
- **Function**: `handleEmailAuth()` checks monthly verification status
- **Service**: `firestoreService.hasVerifiedThisMonth()` performs the check

#### Firebase Services
- **File**: `src/config/firebase.ts`
- **Functions**: 
  - `hasVerifiedThisMonth(email)` - Checks if user verified this month
  - `updateLastVerifiedAt(email)` - Updates verification timestamp

#### Backend Services
- **File**: `backend/services/emailVerificationService.js`
- **File**: `firebase-functions/src/index.js`
- Both update `lastVerifiedAt` when verification is successful

## User Experience

### First Time Users
- Must verify their email with a 4-digit code
- `lastVerifiedAt` timestamp is set upon successful verification

### Returning Users (Same Month)
- Enter email and are automatically logged in
- No verification code required
- `lastVerifiedAt` timestamp is updated

### Returning Users (New Month)
- Must verify their email again with a 4-digit code
- `lastVerifiedAt` timestamp is updated

## Security Considerations

1. **Monthly Reset**: Verification requirement resets each month for security
2. **Timestamp Validation**: Uses server-side timestamps to prevent manipulation
3. **Fallback**: If verification check fails, defaults to requiring verification
4. **Audit Trail**: All verification attempts are logged for debugging

## Development Notes

### Debug Logging
In development mode, the system logs:
- Monthly verification check results
- Last verification date vs current date
- Bypass decisions

### Testing
To test the feature:
1. Verify email with code (sets `lastVerifiedAt`)
2. Try logging in again with same email (should bypass)
3. Wait for new month or manually change `lastVerifiedAt` to test verification requirement

## Configuration

The monthly verification check compares:
- **Month**: `lastVerified.getMonth() === now.getMonth()`
- **Year**: `lastVerified.getFullYear() === now.getFullYear()`

This ensures users must re-verify at least once per month for security. 