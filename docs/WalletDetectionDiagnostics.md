# Wallet Detection Diagnostics Guide

## Overview
This document provides diagnostic tools and information for troubleshooting wallet detection issues in the WeSplit app.

## Current Detection Methods

### 1. Deep Link Detection
**Method**: `Linking.canOpenURL(scheme)`
**Used For**: iOS and Android wallet detection
**Reliability**: Low - often returns false negatives

### 2. Package Detection
**Method**: Android package name checking
**Used For**: Android-specific wallet detection
**Reliability**: Medium - works but limited to Android

### 3. Mock Detection
**Method**: Hardcoded availability flags
**Used For**: Testing and development
**Reliability**: N/A - not real detection

## Supported Wallet Schemes

### iOS URL Schemes
```javascript
const iOS_SCHEMES = [
  'phantom://',
  'solflare://',
  'slope://',
  'backpack://',
  'glow://',
  'exodus://',
  'okx://',
  'mathwallet://',
  'magiceden://',
  'kraken://',
  'imtoken://',
  'huobi://',
  'gate.io://',
  'coinbase://',
  'coin98://',
  'clover://',
  'bybit://',
  'bravos://',
  'brave://',
  'blocto://',
  'bitget://',
  'binance://',
  'argent://',
  'ud://',
  'tokenpocket://'
];
```

### Android Package Names
```javascript
const ANDROID_PACKAGES = [
  'app.phantom',
  'com.solflare.wallet',
  'com.slope.finance',
  'com.backpack.app',
  'com.glow.app',
  'com.exodus.wallet',
  'com.okx.wallet',
  'com.mathwallet.app',
  'com.magiceden.wallet',
  'com.kraken.wallet',
  'com.imtoken.wallet',
  'com.huobi.wallet',
  'com.gate.wallet',
  'com.coinbase.wallet',
  'com.coin98.wallet',
  'com.clover.wallet',
  'com.bybit.wallet',
  'com.bravos.wallet',
  'com.brave.wallet',
  'com.blocto.wallet',
  'com.bitget.wallet',
  'com.binance.wallet',
  'com.argent.wallet',
  'com.ud.wallet',
  'com.tokenpocket.wallet'
];
```

## Diagnostic Tools

### 1. Wallet Detection Test
```typescript
// Test individual wallet detection
const testWalletDetection = async (walletName: string) => {
  console.log(`Testing ${walletName} detection...`);
  
  try {
    const provider = walletLogoService.getWalletProviderInfo(walletName);
    if (!provider) {
      console.log(`❌ Provider info not found for ${walletName}`);
      return false;
    }
    
    console.log(`Provider info:`, provider);
    
    const isAvailable = await walletLogoService.checkWalletAvailability(walletName);
    console.log(`${walletName} available: ${isAvailable}`);
    
    return isAvailable;
  } catch (error) {
    console.error(`Error testing ${walletName}:`, error);
    return false;
  }
};
```

### 2. Deep Link Test
```typescript
// Test deep link functionality
const testDeepLink = async (scheme: string) => {
  console.log(`Testing deep link: ${scheme}`);
  
  try {
    const canOpen = await Linking.canOpenURL(scheme);
    console.log(`${scheme} can open: ${canOpen}`);
    
    if (canOpen) {
      // Test actual opening (be careful - this will open the app)
      // await Linking.openURL(scheme);
    }
    
    return canOpen;
  } catch (error) {
    console.error(`Error testing deep link ${scheme}:`, error);
    return false;
  }
};
```

### 3. Package Detection Test (Android)
```typescript
// Test Android package detection
const testPackageDetection = async (packageName: string) => {
  if (Platform.OS !== 'android') {
    console.log('Package detection only available on Android');
    return false;
  }
  
  console.log(`Testing package: ${packageName}`);
  
  try {
    const packageScheme = `${packageName}://`;
    const canOpen = await Linking.canOpenURL(packageScheme);
    console.log(`${packageName} package can open: ${canOpen}`);
    
    return canOpen;
  } catch (error) {
    console.error(`Error testing package ${packageName}:`, error);
    return false;
  }
};
```

### 4. Comprehensive Detection Test
```typescript
// Test all detection methods
const runComprehensiveTest = async () => {
  console.log('🔍 Running comprehensive wallet detection test...');
  
  const results = {
    deepLink: {},
    package: {},
    overall: {}
  };
  
  // Test deep links
  for (const scheme of iOS_SCHEMES) {
    const walletName = scheme.replace('://', '');
    results.deepLink[walletName] = await testDeepLink(scheme);
  }
  
  // Test packages (Android only)
  if (Platform.OS === 'android') {
    for (const packageName of ANDROID_PACKAGES) {
      const walletName = packageName.split('.').pop();
      results.package[walletName] = await testPackageDetection(packageName);
    }
  }
  
  // Overall results
  for (const walletName of Object.keys(results.deepLink)) {
    results.overall[walletName] = results.deepLink[walletName] || 
      (Platform.OS === 'android' ? results.package[walletName] : false);
  }
  
  console.log('📊 Detection Results:', results);
  return results;
};
```

## Common Issues and Solutions

### Issue 1: False Negatives in Detection
**Symptoms**: Wallet is installed but shows as "not available"
**Causes**: 
- `Linking.canOpenURL()` limitations
- Incorrect URL schemes
- Android package visibility issues

**Solutions**:
1. Use MWA discovery instead of deep link detection
2. Add multiple detection methods as fallbacks
3. Check Android package visibility configuration

### Issue 2: Deep Links Not Working
**Symptoms**: Deep links fail to open wallet apps
**Causes**:
- Incorrect URL schemes
- Missing intent filters
- App not properly configured

**Solutions**:
1. Verify URL schemes in app configuration
2. Check intent filters in Android manifest
3. Test deep links manually

### Issue 3: Inconsistent Detection Results
**Symptoms**: Detection results vary between devices/OS versions
**Causes**:
- Platform-specific differences
- OS version compatibility issues
- App installation variations

**Solutions**:
1. Implement platform-specific detection logic
2. Add OS version checks
3. Use multiple detection methods

### Issue 4: Wallet Apps Not Opening
**Symptoms**: Deep links don't open wallet apps
**Causes**:
- Incorrect deep link format
- Wallet app not installed
- Permission issues

**Solutions**:
1. Verify deep link format with wallet documentation
2. Check if wallet app is actually installed
3. Test with different deep link formats

## Debugging Steps

### Step 1: Check App Configuration
```bash
# Verify app.config.js has correct schemes
grep -A 20 "LSApplicationQueriesSchemes" app.config.js
grep -A 20 "queries" app.config.js
```

### Step 2: Test Deep Links Manually
```bash
# iOS Simulator
xcrun simctl openurl booted "phantom://"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "phantom://" com.wesplit.app
```

### Step 3: Check Package Visibility (Android)
```bash
# Check if packages are visible
adb shell pm list packages | grep phantom
adb shell pm list packages | grep solflare
```

### Step 4: Test MWA Discovery
```typescript
// Test MWA provider discovery
const testMWADiscovery = async () => {
  try {
    // This would use proper MWA discovery
    const providers = await mwaService.discoverProviders();
    console.log('MWA Providers:', providers);
    return providers;
  } catch (error) {
    console.error('MWA Discovery failed:', error);
    return [];
  }
};
```

## Performance Considerations

### Detection Speed
- Deep link detection: ~100-500ms per wallet
- Package detection: ~50-200ms per package
- MWA discovery: ~200-1000ms (but more reliable)

### Caching Strategy
```typescript
// Cache detection results
const detectionCache = new Map<string, { result: boolean, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedDetection = (walletName: string) => {
  const cached = detectionCache.get(walletName);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }
  return null;
};
```

### Batch Detection
```typescript
// Detect multiple wallets in parallel
const detectMultipleWallets = async (walletNames: string[]) => {
  const promises = walletNames.map(name => 
    walletLogoService.checkWalletAvailability(name)
  );
  
  const results = await Promise.allSettled(promises);
  return results.map((result, index) => ({
    wallet: walletNames[index],
    available: result.status === 'fulfilled' ? result.value : false,
    error: result.status === 'rejected' ? result.reason : null
  }));
};
```

## Testing Checklist

### Pre-Release Testing
- [ ] Test on iOS device with Phantom installed
- [ ] Test on iOS device with Solflare installed
- [ ] Test on Android device with Phantom installed
- [ ] Test on Android device with Solflare installed
- [ ] Test on device with no wallets installed
- [ ] Test on device with multiple wallets installed
- [ ] Test deep link functionality
- [ ] Test package detection (Android)
- [ ] Test error handling
- [ ] Test UI states (loading, error, success)

### Regression Testing
- [ ] Verify existing app-generated wallet still works
- [ ] Verify wallet management screen still functions
- [ ] Verify profile screen navigation still works
- [ ] Verify no breaking changes to existing features

## Monitoring and Analytics

### Key Metrics to Track
1. **Detection Success Rate**: Percentage of successful wallet detections
2. **Connection Success Rate**: Percentage of successful wallet connections
3. **Error Rates**: Frequency of different error types
4. **User Engagement**: How often users attempt wallet connections

### Error Tracking
```typescript
// Track detection errors
const trackDetectionError = (walletName: string, error: Error) => {
  console.error(`Detection error for ${walletName}:`, error);
  
  // Send to analytics service
  analytics.track('wallet_detection_error', {
    wallet: walletName,
    error: error.message,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  });
};
```

## Conclusion

Proper wallet detection requires a multi-layered approach using MWA discovery, deep link detection, and package detection as fallbacks. The current implementation has significant issues that need to be addressed for a functional external wallet connection system.
