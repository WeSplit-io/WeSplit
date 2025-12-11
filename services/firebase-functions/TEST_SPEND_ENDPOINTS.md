# SPEND API Endpoints Test Suite

Comprehensive test script for all SPEND integration endpoints.

## Quick Start

```bash
# Test against production
npm run test:spend

# Test against emulator
USE_EMULATOR=true npm run test:spend

# Test with custom split ID
TEST_SPLIT_ID=your_split_id npm run test:spend
```

## What It Tests

### 1. Search Known Users (`/searchKnownUsers`)
- ✅ Valid search query
- ✅ Returns discoverable users only
- ✅ Edge cases (short query, missing query, limit capping)

### 2. Match Users By Email (`/matchUsersByEmail`)
- ✅ Cross-references emails with WeSplit database
- ✅ Returns existing users and new users
- ✅ Privacy handling (discoverable flag)

### 3. Batch Invite Participants (`/batchInviteParticipants`)
- ✅ Invites multiple participants
- ✅ Handles existing users (auto-add to split)
- ✅ Handles new users (creates pending invitations)
- ✅ **Email sending** (tests the fix we implemented)
- ✅ Returns proper summary

### 4. Get Split Status (`/getSplitStatus`)
- ✅ Retrieves split status and payment progress
- ✅ Returns participant details
- ✅ Handles non-existent splits gracefully

## Configuration

### Environment Variables

```bash
# API Key (default: uses test key from docs)
API_KEY=wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg

# Base URL (default: production)
BASE_URL=https://us-central1-wesplit-35186.cloudfunctions.net

# Emulator settings
USE_EMULATOR=true
EMULATOR_HOST=localhost
EMULATOR_PORT=5001

# Test data
TEST_SPLIT_ID=split_1234567890_abc
TEST_INVITER_ID=creator_123
TEST_INVITER_NAME=John Doe
```

### Using Emulator

```bash
# Start emulator first
npm run serve

# Then run tests
USE_EMULATOR=true npm run test:spend
```

## Test Flow

1. **Search Known Users** - Tests user search functionality
2. **Match Users By Email** - Tests email cross-referencing
3. **Batch Invite Participants** - Tests invitation flow with email sending
4. **Get Split Status** - Tests status retrieval
5. **Edge Cases** - Tests error handling and validation

## Expected Results

### Successful Test Run

```
╔══════════════════════════════════════════════════════════╗
║   SPEND API Endpoints Test Suite                        ║
╚══════════════════════════════════════════════════════════╝

✅ Search Known Users
   Status: 200
   Found 5 users

✅ Match Users By Email
   Status: 200
   Found 2 existing, 3 new users

✅ Batch Invite Participants
   Status: 200
   Invited 2 new users, 0 existing users

✅ Get Split Status
   Status: 200
   Split status: active

✅ Edge Cases
   ✅ Query too short (should fail)
   ✅ Missing query parameter (should fail)
   ✅ Limit too high (should cap at 50)

╔══════════════════════════════════════════════════════════╗
║   Test Summary                                            ║
╚══════════════════════════════════════════════════════════╝
Total Tests: 5
Passed: 5
Failed: 0
Success Rate: 100.0%

🎉 All tests passed!
```

## Testing Email Sending

The test script specifically tests the email sending functionality we fixed:

1. Creates test participants with unique emails
2. Calls `batchInviteParticipants` with `sendNotifications: true`
3. Verifies that pending invitations are created
4. **Email sending happens automatically** (check Firebase Functions logs)

### Verify Email Sending

```bash
# Check Firebase Functions logs
firebase functions:log --only batchInviteParticipants

# Look for:
# ✅ Split invitation email sent successfully
# messageId: <message-id>
# to: test_user_xxx@example.com
```

## Troubleshooting

### Split Not Found Error

If you see "Split not found" errors:
1. First create a split via `createSplitFromPayment` endpoint
2. Use that split ID in `TEST_SPLIT_ID` environment variable

### Email Not Sending

If emails aren't being sent:
1. Check Firebase Secrets are configured:
   ```bash
   firebase functions:secrets:access EMAIL_USER
   firebase functions:secrets:access EMAIL_PASSWORD
   ```
2. Check Firebase Functions logs for email errors
3. Verify email transporter is working

### Index Error (searchKnownUsers)

If you see Firebase index errors:
1. The test script has fallback logic, so it should still work
2. For better performance, create the composite index:
   - Collection: `users`
   - Fields: `email` (Ascending), `discoverable` (Ascending), `__name__` (Ascending)
   - Link provided in error message

### Authentication Errors

If you see 401 errors:
1. Verify API key is correct
2. Check API key hasn't expired
3. For emulator, authentication is skipped automatically

## Integration with CI/CD

```yaml
# Example GitHub Actions
- name: Test SPEND Endpoints
  run: |
    cd services/firebase-functions
    npm run test:spend
  env:
    API_KEY: ${{ secrets.SPEND_API_KEY }}
    USE_EMULATOR: false
```

## Notes

- Tests use **real API calls** (not mocks)
- Tests create **real data** in Firestore (use test split IDs)
- Email sending requires **Firebase Secrets** to be configured
- Some tests may fail if split doesn't exist (expected behavior)
- All tests are **idempotent** (can run multiple times)
