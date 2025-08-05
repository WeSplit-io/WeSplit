# ReactCommon Module Redefinition Fix Guide

## Problem
The iOS build is failing with multiple ReactCommon module redefinition errors:
- Redefinition of module 'ReactCommon' (in target 'React-RCTAppDelegate' from project 'Pods')
- Could not build module 'TargetConditionals' (in target 'React-RCTAppDelegate' from project 'Pods')
- Could not build module 'DarwinFoundation' (in target 'React-RCTAppDelegate' from project 'Pods')

## Root Cause
This is a common issue with React Native 0.76.9 and Expo SDK 52 when using modular headers globally. The problem occurs because:

1. **Global modular headers** (`use_modular_headers!`) cause conflicts with React Native's internal modules
2. **Firebase integration** adds additional complexity to the module system
3. **CocoaPods cache** may contain conflicting module definitions

## Solution Applied

### 1. Updated Podfile Configuration
- **Removed global `use_modular_headers!`** - This was the main cause of the ReactCommon redefinition errors
- **Added specific modular headers** only for Firebase pods that need them
- **Enhanced post-install script** with specific fixes for React Native targets

### 2. Key Changes Made

#### Podfile Changes:
```ruby
# REMOVED: use_modular_headers! (global)
# ADDED: Specific modular headers only for Firebase
pod 'FirebaseAuth', :modular_headers => true, :inhibit_warnings => true
pod 'FirebaseCore', :modular_headers => true, :inhibit_warnings => true
pod 'FirebaseCoreInternal', :modular_headers => false
```

#### React Native Target Fixes:
```ruby
# CRITICAL: Fix for ReactCommon module redefinition errors
if target.name.include?('React') || target.name.include?('RCT')
  config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
  config.build_settings['DEFINES_MODULE'] = 'YES'
  config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
  config.build_settings['CLANG_WARN_DOCUMENTATION_COMMENTS'] = 'NO'
  config.build_settings['GCC_WARN_64_TO_32_BIT_CONVERSION'] = 'NO'
  config.build_settings['GCC_WARN_UNUSED_FUNCTION'] = 'NO'
  config.build_settings['GCC_WARN_UNUSED_VARIABLE'] = 'NO'
end
```

### 3. Cleanup Script
Created `ios/cleanup-react-common.sh` that:
- Cleans CocoaPods cache
- Removes build artifacts
- Cleans Metro and Expo caches
- Reinstalls pods with proper configuration

### 4. Updated EAS Configuration
All iOS builds now use the cleanup script as prebuild command:
```json
"ios": {
  "prebuildCommand": "cd ios && ./cleanup-react-common.sh"
}
```

## How to Fix

### Option 1: Use the Cleanup Script (Recommended)
```bash
# Run the comprehensive cleanup
npm run fix-react-common

# Then build
eas build --platform ios --profile development-fixed
```

### Option 2: Manual Cleanup
```bash
# Clean everything
npm run clean-all

# Reinstall pods
cd ios
pod deintegrate
pod cache clean --all
pod install --repo-update

# Build
eas build --platform ios --profile development-fixed
```

### Option 3: Local Development
```bash
# For local iOS development
npm run build-ios-fixed
```

## Verification Steps

1. **Check Podfile** - Ensure `use_modular_headers!` is commented out
2. **Verify cleanup script** - Run `./ios/cleanup-react-common.sh`
3. **Check EAS config** - Ensure all profiles use the cleanup script
4. **Test build** - Try building with `eas build --platform ios --profile development-fixed`

## Expected Results

After applying these fixes:
- ✅ No more ReactCommon redefinition errors
- ✅ No more TargetConditionals build failures
- ✅ No more DarwinFoundation module issues
- ✅ Successful iOS builds on EAS

## Troubleshooting

### If issues persist:
1. **Clear all caches**: `npm run clean-all`
2. **Update EAS CLI**: `npm install -g @expo/eas-cli@latest`
3. **Check React Native version**: Ensure compatibility with Expo SDK 52
4. **Verify Firebase configuration**: Check that Firebase pods are properly configured

### Common Issues:
- **Permission errors**: The cleanup script may show permission warnings for file operations - this is expected and safe to ignore
- **Cache issues**: If problems persist, try clearing all caches manually
- **Version conflicts**: Ensure all dependencies are compatible with React Native 0.76.9

## Files Modified

1. `ios/Podfile` - Removed global modular headers, added React Native specific fixes
2. `ios/cleanup-react-common.sh` - New comprehensive cleanup script
3. `eas.json` - Updated all iOS profiles to use cleanup script
4. `package.json` - Added new scripts for ReactCommon fixes

## Next Steps

1. Run the cleanup script: `npm run fix-react-common`
2. Try building: `eas build --platform ios --profile development-fixed`
3. If successful, test other build profiles
4. Update documentation if needed

This fix addresses the core issue of ReactCommon module redefinition while maintaining Firebase functionality and React Native compatibility. 