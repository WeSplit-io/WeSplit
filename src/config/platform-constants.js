// Platform Constants polyfill for React Native
// This provides the missing PlatformConstants that some libraries expect

import { Platform } from 'react-native';

// Create a comprehensive PlatformConstants object
const PlatformConstants = {
  // Basic platform info
  platform: Platform.OS,
  version: Platform.Version,
  
  // Android specific constants
  ...(Platform.OS === 'android' && {
    // Android version info
    Release: Platform.Version,
    SDK_INT: Platform.Version,
    
    // Device info
    Brand: 'Android',
    Model: 'Unknown',
    Manufacturer: 'Unknown',
    
    // Screen info
    ScreenWidth: 360,
    ScreenHeight: 640,
    ScreenDensity: 2.0,
    
    // Network info
    NetworkType: 'wifi',
    
    // Locale info
    Locale: 'en_US',
    Country: 'US',
    
    // Timezone
    Timezone: 'UTC',
    
    // Build info
    BuildId: '1.0.0',
    BuildNumber: '1',
    VersionCode: 1,
    
    // Features
    Features: [],
    
    // Permissions
    Permissions: [],
    
    // System UI
    SystemUIVisibility: 0,
    
    // Navigation
    NavigationBarHeight: 0,
    StatusBarHeight: 24,
    
    // Hardware
    HasHardwareKeyboard: false,
    HasSoftKeyboard: true,
    
    // Display
    DisplayMetrics: {
      density: 2.0,
      densityDpi: 320,
      scaledDensity: 2.0,
      widthPixels: 720,
      heightPixels: 1280,
      xdpi: 320,
      ydpi: 320
    }
  }),
  
  // iOS specific constants
  ...(Platform.OS === 'ios' && {
    // iOS version info
    systemVersion: Platform.Version,
    
    // Device info
    model: 'iPhone',
    userInterfaceIdiom: 'phone',
    
    // Screen info
    screenWidth: 375,
    screenHeight: 667,
    screenScale: 2.0,
    
    // Locale info
    locale: 'en_US',
    country: 'US',
    
    // Timezone
    timezone: 'UTC',
    
    // Build info
    buildNumber: '1',
    version: '1.0.0',
    
    // Features
    features: [],
    
    // System UI
    statusBarHeight: 20,
    navigationBarHeight: 0,
    
    // Hardware
    hasHardwareKeyboard: false,
    hasSoftKeyboard: true,
    
    // Display
    displayMetrics: {
      scale: 2.0,
      width: 375,
      height: 667
    }
  }),
  
  // Web specific constants
  ...(Platform.OS === 'web' && {
    // Web browser info
    userAgent: navigator.userAgent,
    
    // Screen info
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenDensity: window.devicePixelRatio,
    
    // Locale info
    locale: navigator.language,
    country: 'US',
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Features
    features: [],
    
    // Display
    displayMetrics: {
      density: window.devicePixelRatio,
      width: window.screen.width,
      height: window.screen.height
    }
  })
};

// Export the PlatformConstants
export default PlatformConstants;

// Also make it available globally for libraries that expect it
if (typeof global !== 'undefined') {
  global.PlatformConstants = PlatformConstants;
}

// Add to Platform object if it doesn't exist
if (Platform && !Platform.constants) {
  Platform.constants = PlatformConstants;
}
