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

// Configuration based on Phantom Portal setup
const PHANTOM_CONFIG = {
  // Get from Phantom Portal after app registration and approval
  // NOTE: If you get "check team status" error, your app needs Phantom approval
  appId: process.env.EXPO_PUBLIC_PHANTOM_APP_ID,
  appOrigin: process.env.EXPO_PUBLIC_PHANTOM_APP_ORIGIN,

  // Supported providers for authentication
  providers: ['google', 'apple', 'phantom', 'injected'] as const,

  // Supported blockchain address types
  addressTypes: [AddressType.solana],

  // Authentication options
  authOptions: {
    redirectUrl: process.env.EXPO_PUBLIC_PHANTOM_REDIRECT_URI || 'wesplit://auth/phantom-callback'
  },

  // Custom URL scheme for the app
  scheme: 'wesplit'
};

// Validate configuration and provide helpful error messages
const validatePhantomConfiguration = () => {
  const issues = [];

  if (!PHANTOM_CONFIG.appId) {
    issues.push('EXPO_PUBLIC_PHANTOM_APP_ID not set. Get this from Phantom Developer Portal.');
  }

  if (!PHANTOM_CONFIG.appOrigin) {
    issues.push('EXPO_PUBLIC_PHANTOM_APP_ORIGIN not set. Should be your app\'s domain.');
  }

  if (!PHANTOM_CONFIG.authOptions?.redirectUrl) {
    issues.push('EXPO_PUBLIC_PHANTOM_REDIRECT_URI not set. Should be your app\'s deep link URL.');
  }

  if (PHANTOM_CONFIG.appId && PHANTOM_CONFIG.appId.includes('test-app-id')) {
    issues.push('Using test app ID. Replace with real Phantom Portal app ID.');
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
  // If Phantom is not configured, render children without provider
  const configValidation = validatePhantomConfiguration();
  if (!configValidation.isValid && !skipPortalCheck) {
    if (__DEV__) {
      console.warn('Phantom SDK configuration issues:', configValidation.issues);
      console.warn('For "check team status" error: Your app needs Phantom Portal approval. Visit https://phantom.app/developers');
      console.warn('For development testing, set skipPortalCheck=true in PhantomSDKProvider');
    }
    return <>{children}</>;
  }

  // Warn about portal issues even in skip mode
  if (!configValidation.isValid && skipPortalCheck && __DEV__) {
    console.warn('Phantom SDK has configuration issues but skipping portal check for development:', configValidation.issues);
  }

  // Select theme based on prop
  const selectedTheme = theme === 'dark' ? darkTheme :
                       theme === 'light' ? lightTheme :
                       wesplitTheme;

  return (
    <PhantomProvider
      config={PHANTOM_CONFIG}
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
