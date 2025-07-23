# 30-Day Verification Bypass Feature

## Overview

The WeSplit app now includes a 30-day verification bypass feature that allows users who have already verified their email within the last 30 days to skip the verification code process on subsequent logins.

## How It Works

### 1. 30-Day Verification Tracking
- Each user document in Firestore includes a `lastVerifiedAt` timestamp
- This timestamp is updated every time a user successfully verifies their email
- The system checks if the last verification was within the last 30 days

### 2. Verification Bypass Logic
When a user enters their email on the AuthMethodsScreen:

1. **Check 30-Day Status**: The system checks if the user has verified within the last 30 days
2. **Bypass if Eligible**: If verified within 30 days, the user is automatically logged in
3. **Require Verification**: If not verified within 30 days, a verification code is sent

### 3. Implementation Details

#### Frontend (React Native)
- **File**: `src/screens/AuthMethods/AuthMethodsScreen.tsx`
- **Function**: `handleEmailAuth()` checks 30-day verification status
- **Service**: `firestoreService.hasVerifiedWithin30Days()` performs the check

#### Firebase Services
- **File**: `src/config/firebase.ts`
- **Functions**: 
  - `hasVerifiedWithin30Days(email)` - Checks if user verified within 30 days
  - `updateLastVerifiedAt(email)` - Updates verification timestamp

#### Backend Services
- **File**: `backend/services/emailVerificationService.js`
- **File**: `firebase-functions/src/index.js`
- Both update `lastVerifiedAt` when verification is successful

## User Experience

### First Time Users
- Must verify their email with a 4-digit code
- `lastVerifiedAt` timestamp is set upon successful verification

### Returning Users (Within 30 Days)
- Enter email and are automatically logged in
- No verification code required
- `lastVerifiedAt` timestamp is updated

### Returning Users (After 30 Days)
- Must verify their email again with a 4-digit code
- `lastVerifiedAt` timestamp is updated after verification

## Onboarding Completion

### Permanent Onboarding Status
- Once a user completes onboarding, `hasCompletedOnboarding` is set to `true`
- This status is **permanent** and never resets
- Users who completed onboarding will never have to go through it again

### User Flow
- **New Users**: Complete onboarding once, then skip it forever
- **Returning Users**: Go directly to Dashboard if onboarding was completed

## Security Considerations

### Verification Code Security
- 4-digit codes are generated securely
- Codes expire after 10 minutes
- Rate limiting prevents abuse
- Codes are stored securely in Firestore

### User Data Protection
- Email addresses are stored securely
- Verification timestamps are tracked for security
- Onboarding completion status is permanent for user experience

## Technical Implementation

### Database Schema
```javascript
{
  id: "user_id",
  email: "user@example.com",
  name: "User Name",
  wallet_address: "wallet_address",
  wallet_public_key: "public_key",
  created_at: "2025-01-21T10:00:00Z",
  avatar: "avatar_url",
  emailVerified: true,
  lastLoginAt: "2025-01-21T10:00:00Z",
  lastVerifiedAt: "2025-01-21T10:00:00Z", // 30-day verification tracking
  hasCompletedOnboarding: true // Permanent onboarding status
}
```

### Key Functions
- `hasVerifiedWithin30Days(email)` - Check if user verified within 30 days
- `updateLastVerifiedAt(email)` - Update verification timestamp
- `markOnboardingCompleted()` - Permanently mark onboarding as complete

## Benefits

1. **Improved User Experience**: Users don't need to verify every month
2. **Reduced Friction**: 30-day verification period balances security and convenience
3. **Permanent Onboarding**: Users never have to repeat the onboarding process
4. **Security**: Still requires verification after 30 days for security
5. **Flexibility**: Easy to adjust the verification period if needed 