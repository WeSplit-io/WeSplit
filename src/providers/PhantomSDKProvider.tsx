/**
 * Official Phantom React Native SDK Provider
 *
 * Integrates the official @phantom/react-native-sdk into WeSplit
 * Replaces custom authentication and wallet services
 */

import React, { ReactNode } from 'react';
import {
  PhantomProvider,
  darkTheme,
  lightTheme,
  AddressType
} from '@phantom/react-native-sdk';
import { PHANTOM_CONFIG } from '../config/env';

// Validate configuration and provide helpful error messages
const validatePhantomConfiguration = () => {
  const issues = [];

  if (!PHANTOM_CONFIG.appId) {
    issues.push('EXPO_PUBLIC_PHANTOM_APP_ID not set. Get this from Phantom Developer Portal.');
  }

  if (!PHANTOM_CONFIG.appOrigin) {
    issues.push('EXPO_PUBLIC_PHANTOM_APP_ORIGIN not set. Should be your app\'s domain.');
  }

  if (!PHANTOM_CONFIG.redirectUri) {
    issues.push('EXPO_PUBLIC_PHANTOM_REDIRECT_URI not set. Should be your app\'s deep link URL.');
  }

  // Only warn about obviously test IDs
  if (PHANTOM_CONFIG.appId && PHANTOM_CONFIG.appId === 'test-app-id') {
    issues.push('Using placeholder test app ID. Replace with real Phantom Portal app ID.');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

const isPhantomConfigured = () => validatePhantomConfiguration().isValid;

// WeSplit branding
const PHANTOM_BRANDING = {
  appIcon: 'https://wesplit.app/icon.png', // Update with actual icon URL
  appName: 'WeSplit'
};

// Theme configuration (matches WeSplit design)
const wesplitTheme = {
  background: '#0A0B0E', // WeSplit black background
  text: '#FFFFFF',       // White text
  secondary: '#6B7280',  // Gray for secondary elements
  brand: '#10B981',      // WeSplit green
  error: '#EF4444',      // Red for errors
  success: '#22C55E',    // Green for success
  borderRadius: '12px',  // WeSplit border radius
  overlay: 'rgba(0, 0, 0, 0.8)' // Dark overlay
};

interface PhantomSDKProviderProps {
  children: ReactNode;
  theme?: 'dark' | 'light' | 'custom';
  skipPortalCheck?: boolean; // For development testing without portal approval
}

export const PhantomSDKProvider: React.FC<PhantomSDKProviderProps> = ({
  children,
  theme = 'dark',
  skipPortalCheck = false
}) => {
  // Validate configuration
  const configValidation = validatePhantomConfiguration();

  // Render provider if basic config is present (works in both dev and production)
  // In development, skipPortalCheck allows testing even with unapproved app IDs
  // ✅ FIX: In production, always render if basic config is present (don't require skipPortalCheck)
  const hasBasicConfig = PHANTOM_CONFIG.appId && PHANTOM_CONFIG.appOrigin && PHANTOM_CONFIG.redirectUri;
  const shouldRenderProvider = hasBasicConfig || (__DEV__ && skipPortalCheck);
  
  // ✅ DEBUG: Log provider rendering decision in production for troubleshooting
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEBUG_FEATURES === 'true') {
    console.log('🔍 PhantomSDKProvider rendering decision:', {
      hasBasicConfig,
      hasAppId: !!PHANTOM_CONFIG.appId,
      hasAppOrigin: !!PHANTOM_CONFIG.appOrigin,
      hasRedirectUri: !!PHANTOM_CONFIG.redirectUri,
      shouldRenderProvider,
      isDev: __DEV__,
      skipPortalCheck
    });
  }

  if (!shouldRenderProvider) {
    if (__DEV__) {
      console.warn('Phantom SDK missing basic configuration, not rendering provider:', {
        hasAppId: !!PHANTOM_CONFIG.appId,
        hasAppOrigin: !!PHANTOM_CONFIG.appOrigin,
        hasRedirectUri: !!PHANTOM_CONFIG.redirectUri,
        skipPortalCheck,
        isDev: __DEV__
      });
    }
    return <>{children}</>;
  }

  // Log configuration status
  if (__DEV__) {
    console.log('🚀 Rendering PhantomProvider with config:', {
      appId: PHANTOM_CONFIG.appId,
      appOrigin: PHANTOM_CONFIG.appOrigin,
      redirectUri: PHANTOM_CONFIG.redirectUri,
      hasAppId: !!PHANTOM_CONFIG.appId,
      validationPassed: configValidation.isValid,
      skipPortalCheck
    });

    if (!configValidation.isValid) {
      console.warn('⚠️ Phantom configuration issues detected. If you get "check team status" or "not allowed" errors:');
      console.warn('   1. Visit https://phantom.app/developers');
      console.warn(`   2. Find your app with ID: ${PHANTOM_CONFIG.appId || '[Your App ID]'}`);
      console.warn('   3. If your app shows as "Private", contact Phantom support to make it public');
      console.warn('   4. Or use email/phone authentication for immediate development testing');
    }
  }

  // Select theme based on prop
  const selectedTheme = theme === 'dark' ? darkTheme :
                       theme === 'light' ? lightTheme :
                       wesplitTheme;

  // Convert our config format to Phantom SDK format
  const phantomSDKConfig = {
    appId: PHANTOM_CONFIG.appId,
    appOrigin: PHANTOM_CONFIG.appOrigin,
    providers: ['google', 'apple', 'phantom', 'injected'] as const,
    addressTypes: [AddressType.solana],
    authOptions: {
      redirectUrl: PHANTOM_CONFIG.redirectUri
    },
    scheme: 'wesplit'
  };

  if (__DEV__) {
    console.log('🚀 Initializing PhantomProvider with config:', {
      appId: phantomSDKConfig.appId,
      appOrigin: phantomSDKConfig.appOrigin,
      redirectUrl: phantomSDKConfig.authOptions.redirectUrl,
      skipPortalCheck,
      isDev: __DEV__
    });
  }

  return (
    <PhantomProvider
      config={phantomSDKConfig}
      theme={selectedTheme}
      appIcon={PHANTOM_BRANDING.appIcon}
      appName={PHANTOM_BRANDING.appName}
    >
      {children}
    </PhantomProvider>
  );
};

// Export configuration status for components to check
export { isPhantomConfigured };

export default PhantomSDKProvider;
