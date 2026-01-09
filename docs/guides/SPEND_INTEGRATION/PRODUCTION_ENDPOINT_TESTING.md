# Production Endpoint Testing Guide

**Date**: 2025-01-27  
**Purpose**: Ensure test scripts use the same production endpoints that SPEND team uses

---

## 🎯 Overview

All test scripts have been updated to use **production endpoints by default** to match exactly what the SPEND team will be testing. This ensures:

- ✅ Tests validate the same endpoints SPEND uses
- ✅ Tests catch production issues early
- ✅ Tests match real-world integration scenarios
- ✅ No discrepancies between test and production behavior

---

## 📋 Production Endpoints

### Endpoints Used (Production)

| Endpoint | Path | Method | Purpose |
|----------|------|--------|---------|
| Create Split | `/createSplitFromPayment` | POST | Create split from SPEND order |
| Batch Invite | `/batchInviteParticipants` | POST | Invite multiple participants |
| Pay Share | `/payParticipantShare` | POST | Record participant payment |
| Get Status | `/getSplitStatus` | GET | Get split status |
| Search Users | `/searchKnownUsers` | GET | Search for existing users |
| Match Users | `/matchUsersByEmail` | POST | Match users by email |
| Webhook | `/spendWebhook` | POST | Receive webhooks from SPEND |

### ❌ Test/Mock Endpoints (NOT Used)

- `/testCreateSplitFromPayment` - Mock endpoint (not used in production)
- `/mockSpendWebhook` - Mock webhook endpoint (not used in production)

---

## 🚀 Running Tests

### Default: Production Endpoints

All test scripts use production endpoints by default:

```bash
# Test endpoints script
cd services/firebase-functions
node test-spend-endpoints.js

# Integration test
npm run test:spend

# Full flow test
npm run test:spend:full
```

### Explicitly Use Production Endpoints

```bash
# Set environment variable (optional, already default)
USE_PRODUCTION_ENDPOINTS=true npm run test:spend
```

### Use Test Endpoints (Not Recommended)

Only use test endpoints for development/debugging:

```bash
# Use test endpoints instead
USE_PRODUCTION_ENDPOINTS=false npm run test:spend
```

---

## 🔍 Test Scripts Updated

### 1. `services/firebase-functions/test-spend-endpoints.js`

**Changes**:
- ✅ Uses `/createSplitFromPayment` (production) by default
- ✅ Falls back to test endpoint only if explicitly disabled
- ✅ Shows which endpoint is being used in output
- ✅ Logs production vs test mode clearly

**Usage**:
```bash
cd services/firebase-functions
node test-spend-endpoints.js
```

**Output**:
```
Production Endpoints: ✅ YES (matches SPEND team)
Using PRODUCTION endpoint: /createSplitFromPayment
```

---

### 2. `scripts/test-spend-integration.ts`

**Changes**:
- ✅ Uses `/createSplitFromPayment` (production) by default
- ✅ All other endpoints already use production paths
- ✅ Shows production mode in output

**Usage**:
```bash
npm run test:spend
# or
npx ts-node scripts/test-spend-integration.ts
```

---

### 3. `scripts/test-spend-full-flow.ts`

**Changes**:
- ✅ Uses `/createSplitFromPayment` (production) by default
- ✅ All other endpoints already use production paths
- ✅ Shows production mode in output

**Usage**:
```bash
npm run test:spend:full
# or
npx ts-node scripts/test-spend-full-flow.ts
```

---

## ✅ Verification

### Check Which Endpoints Are Used

All test scripts now show in their output:

```
Production Endpoints: ✅ YES (matches SPEND team)
```

Or if test endpoints are used:

```
Production Endpoints: ❌ NO (using test endpoints)
```

### Verify Production Endpoints

1. **Check test output** - Should show "✅ YES (matches SPEND team)"
2. **Check API calls** - Should use `/createSplitFromPayment` not `/testCreateSplitFromPayment`
3. **Check logs** - Should show "Using PRODUCTION endpoint"

---

## 🔄 Migration from Test Endpoints

If you were previously using test endpoints:

### Before (Old)
```bash
# Used test endpoints
npm run test:spend
```

### After (New)
```bash
# Uses production endpoints by default (matches SPEND team)
npm run test:spend
```

### If You Need Test Endpoints

```bash
# Explicitly disable production endpoints
USE_PRODUCTION_ENDPOINTS=false npm run test:spend
```

---

## 📊 Endpoint Comparison

| Feature | Production Endpoint | Test Endpoint |
|---------|-------------------|---------------|
| Creates real split | ✅ Yes | ❌ No (mock) |
| Stores in Firestore | ✅ Yes | ❌ No |
| Validates data | ✅ Yes | ✅ Yes |
| Returns real split ID | ✅ Yes | ❌ No (mock ID) |
| Matches SPEND team | ✅ Yes | ❌ No |
| Use for testing | ✅ Recommended | ⚠️ Development only |

---

## 🎯 Best Practices

### ✅ DO

- Use production endpoints for integration testing
- Test against production endpoints before deployment
- Match SPEND team's testing approach
- Verify all endpoints work in production mode

### ❌ DON'T

- Don't rely on test endpoints for final validation
- Don't use test endpoints for production readiness checks
- Don't assume test endpoints match production behavior

---

## 🔒 Security Notes

### Production Endpoints

- ✅ Require valid API key
- ✅ Validate all input data
- ✅ Create real data in Firestore
- ✅ Send real webhooks
- ✅ Use production validation logic

### Test Endpoints

- ⚠️ May skip some validation
- ⚠️ Don't create real data
- ⚠️ Return mock responses
- ⚠️ May not match production behavior

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_PRODUCTION_ENDPOINTS` | `true` | Use production endpoints (matches SPEND team) |
| `API_KEY` | (from config) | API key for authentication |
| `BASE_URL` | (production) | Base URL for API calls |
| `USE_EMULATOR` | `false` | Use Firebase emulator |

---

## 🧪 Testing Checklist

Before running tests, verify:

- [ ] Production endpoints are enabled (default)
- [ ] API key is valid and active
- [ ] Base URL points to production
- [ ] Test output shows "✅ YES (matches SPEND team)"
- [ ] All endpoints use production paths

---

## 🚨 Troubleshooting

### Issue: Tests fail with production endpoints

**Solution**: 
1. Verify API key is valid
2. Check network connectivity
3. Ensure endpoints are deployed
4. Check Firestore permissions

### Issue: Want to use test endpoints

**Solution**:
```bash
USE_PRODUCTION_ENDPOINTS=false npm run test:spend
```

### Issue: Not sure which endpoints are used

**Solution**: Check test output for:
```
Production Endpoints: ✅ YES (matches SPEND team)
```

---

## 📚 Related Documentation

- **API Reference**: `docs/guides/SPEND_INTEGRATION/FOR_SPEND/SPEND_API_REFERENCE.md`
- **Test Scripts**: `docs/guides/SPEND_INTEGRATION/TEST_SCRIPTS_UPDATE_SUMMARY.md`
- **Integration Guide**: `docs/guides/SPEND_INTEGRATION/FOR_SPEND/SPEND_INTEGRATION_QUICK_REFERENCE.md`

---

**Last Updated**: 2025-01-27  
**Status**: ✅ **PRODUCTION ENDPOINTS ENABLED BY DEFAULT**
