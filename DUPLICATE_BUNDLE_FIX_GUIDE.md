# Duplicate GoogleUtilities_Privacy.bundle Fix Guide

## Problem Description

The error `Multiple commands produce '…/GoogleUtilities_Privacy.bundle'` occurs when multiple Firebase/GoogleUtilities pods generate the same privacy bundle, causing conflicts during Xcode archive builds.

**UPDATE**: The fix has been updated to handle React Native's privacy manifest aggregation system properly.

## Root Cause

1. **Multiple Firebase Dependencies**: Different Firebase pods (FirebaseAuth, FirebaseCore, etc.) each include GoogleUtilities
2. **Duplicate Bundle Generation**: Each GoogleUtilities instance creates its own `GoogleUtilities_Privacy.bundle`
3. **Xcode Archive Conflict**: During archive builds, Xcode encounters multiple bundles with the same name
4. **React Native Privacy Manifest Aggregation**: React Native needs all `PrivacyInfo.xcprivacy` files for privacy manifest aggregation

## Solution Overview

The fix involves three main components:

1. **Enhanced Podfile post_install script** - Removes duplicate bundle references from Xcode project
2. **Improved cleanup script** - Removes duplicate bundle directories from filesystem (but keeps PrivacyInfo.xcprivacy files)
3. **Test script** - Verifies the fix works correctly

## Step-by-Step Implementation

### Step 1: Enhanced Podfile (Updated)

The `ios/Podfile` has been updated with an enhanced `post_install` script that:

- Tracks all bundle references to identify duplicates
- Removes duplicate `GoogleUtilities_Privacy.bundle` references from build phases
- Cleans up duplicate bundle directories from filesystem
- **IMPORTANT**: Does NOT remove `PrivacyInfo.xcprivacy` files (React Native needs them)
- Handles `Info.plist` duplicates in bundles only

### Step 2: Improved Cleanup Script (Updated)

The `ios/cleanup-duplicate-bundles.sh` script now:

- Uses comprehensive logging with timestamps
- Handles multiple types of duplicate files
- **IMPORTANT**: Keeps ALL `PrivacyInfo.xcprivacy` files for React Native privacy manifest aggregation
- Provides detailed cleanup verification
- Includes error handling and safety checks

### Step 3: Test Script (New)

The `ios/test-archive-build.sh` script:

- Tests the exact failing command
- Provides detailed build output
- Verifies the fix works correctly
- Includes troubleshooting guidance

## How to Apply the Fix

### For Local Development

1. **Clean and reinstall pods**:
   ```bash
   cd ios
   pod deintegrate
   pod cache clean --all
   pod install --repo-update
   ```

2. **Run the cleanup script**:
   ```bash
   ./cleanup-duplicate-bundles.sh
   ```

3. **Test the archive build**:
   ```bash
   ./test-archive-build.sh
   ```

### For EAS Build

The `eas.json` already includes the cleanup script as a prebuild command:

```json
"ios": {
  "prebuildCommand": "cd ios && ./cleanup-duplicate-bundles.sh"
}
```

## Verification Commands

### Test the Exact Failing Command

```bash
cd ios
xcodebuild -workspace WeSplit.xcworkspace -scheme WeSplit -configuration Debug -destination 'generic/platform=iOS' archive
```

### Check for Remaining Duplicates

```bash
cd ios
find Pods -name "GoogleUtilities_Privacy.bundle" -type d
find Pods -name "PrivacyInfo.xcprivacy" -type f
```

## Troubleshooting

### If the Build Still Fails

1. **Check for remaining duplicates**:
   ```bash
   cd ios
   ./cleanup-duplicate-bundles.sh
   ```

2. **Clean and reinstall pods**:
   ```bash
   pod deintegrate
   pod cache clean --all
   pod install --repo-update
   ```

3. **Check Xcode project settings**:
   - Open `WeSplit.xcworkspace`
   - Go to Build Phases → Copy Bundle Resources
   - Ensure `GoogleUtilities_Privacy.bundle` appears only once

### Common Issues

1. **Multiple GoogleUtilities versions**: Check `Podfile.lock` for conflicting versions
2. **Cached build artifacts**: Clean build folder and derived data
3. **Xcode project corruption**: Reset Xcode project settings
4. **React Native privacy manifest aggregation**: Ensure all `PrivacyInfo.xcprivacy` files are preserved

## Prevention

To prevent this issue in the future:

1. **Keep Firebase dependencies updated**
2. **Use consistent pod versions**
3. **Run cleanup script regularly**
4. **Monitor for new duplicate bundle issues**
5. **Never remove PrivacyInfo.xcprivacy files manually**

## Files Modified

- `ios/Podfile` - Enhanced post_install script (updated to preserve PrivacyInfo.xcprivacy files)
- `ios/cleanup-duplicate-bundles.sh` - Improved cleanup logic (updated to preserve PrivacyInfo.xcprivacy files)
- `ios/test-archive-build.sh` - New test script (created)

## Expected Results

After applying the fix:

- ✅ Archive builds complete successfully
- ✅ No duplicate bundle errors
- ✅ EAS Build works correctly
- ✅ Local development builds work
- ✅ React Native privacy manifest aggregation works correctly

## Testing Checklist

- [ ] Pod installation completes without errors
- [ ] Cleanup script runs successfully
- [ ] Archive build completes successfully
- [ ] No duplicate bundle warnings
- [ ] EAS Build passes
- [ ] Local development builds work
- [ ] React Native privacy manifest aggregation works

## Support

If you encounter issues:

1. Check the build logs for specific error messages
2. Run the test script to verify the fix
3. Check for any new Firebase updates that might introduce similar issues
4. Review the troubleshooting section above
5. Ensure PrivacyInfo.xcprivacy files are not being removed 