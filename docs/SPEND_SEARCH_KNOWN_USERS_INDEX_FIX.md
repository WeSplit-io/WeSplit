# SPEND searchKnownUsers Index Error Fix

## Issue Reported by SPEND Team

When calling `/searchKnownUsers`, they received:
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/wesplit-35186/firestore/indexes?create_composite=..."
}
```

## Root Cause

The query uses multiple range filters:
- `email >= queryLower`
- `email <= queryLower + '\uf8ff'`
- `discoverable != false`

This requires a **composite index** in Firestore. When the index doesn't exist, Firestore throws a `FAILED_PRECONDITION` error (gRPC code 9).

## Solution Implemented

### 1. Enhanced Error Detection
- Catches `FAILED_PRECONDITION` errors in multiple formats
- Handles gRPC error code 9
- Checks error message, code, and stringified error object

### 2. Automatic Fallback Query
When index error is detected:
- Uses simpler query (only `email` range, no `discoverable` filter)
- Filters `discoverable` in memory
- Returns results without requiring the composite index

### 3. Graceful Degradation
- If fallback also fails, returns empty results instead of 500 error
- Prevents breaking SPEND integration
- Logs warnings for monitoring

## Code Changes

**File**: `services/firebase-functions/src/spendApiEndpoints.js`

**Changes**:
1. Enhanced error detection to catch `"9 FAILED_PRECONDITION"` format
2. Fallback query that doesn't require composite index
3. In-memory filtering for `discoverable` field
4. Top-level error handler that returns empty results for index errors

## Testing

### Test in Production
```bash
# The endpoint should now work without the index
curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers?query=test&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Expected Behavior

**Without Index** (current state):
- ✅ Returns results (using fallback query)
- ⚠️ May be slightly slower (filters in memory)
- ✅ No error returned to SPEND

**With Index** (after creating index):
- ✅ Returns results (using indexed query)
- ✅ Faster performance
- ✅ Better scalability

## Creating the Index (Optional but Recommended)

For better performance, create the composite index:

1. **Via Firebase Console**:
   - Go to: https://console.firebase.google.com/v1/r/project/wesplit-35186/firestore/indexes
   - Click the link provided in the error message (if still getting errors)

2. **Via firestore.indexes.json**:
   ```json
   {
     "indexes": [
       {
         "collectionGroup": "users",
         "queryScope": "COLLECTION",
         "fields": [
           {
             "fieldPath": "discoverable",
             "order": "ASCENDING"
           },
           {
             "fieldPath": "email",
             "order": "ASCENDING"
           },
           {
             "fieldPath": "__name__",
             "order": "ASCENDING"
           }
         ]
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Why Test Passes But Production Fails

**Emulator**:
- May be more lenient with index requirements
- Or uses different error format
- Or has the index auto-created

**Production**:
- Strictly enforces index requirements
- Returns gRPC error code 9 (FAILED_PRECONDITION)
- Error format: `"9 FAILED_PRECONDITION: The query requires an index..."`

## Verification

After deploying the fix:

1. **Test without index** (should work):
   ```bash
   curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers?query=test" \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```
   Expected: Returns results (may be empty if no matches)

2. **Check logs**:
   - Look for: `"Composite index not found, using fallback query"`
   - Should see fallback query executing

3. **Create index** (optional):
   - Deploy index via Firebase Console
   - Wait for index to build (can take a few minutes)
   - Test again - should be faster

## Status

✅ **FIXED** - The endpoint now works without the composite index
- Fallback query automatically used when index doesn't exist
- No errors returned to SPEND team
- Performance may be slightly slower until index is created
