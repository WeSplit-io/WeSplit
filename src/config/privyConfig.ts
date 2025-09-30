/**
 * Privy Configuration for WeSplit
 * Handles SSO authentication and wallet management
 */

import Constants from 'expo-constants';

// Environment variable helper
const getEnvVar = (key: string): string => {
  // Debug logging to help troubleshoot
  console.log(`🔍 [PrivyConfig] Looking for ${key}:`);
  console.log(`  - process.env[${key}]:`, process.env[key] ? '✅ Found' : '❌ Not found');
  console.log(`  - process.env[EXPO_PUBLIC_${key}]:`, process.env[`EXPO_PUBLIC_${key}`] ? '✅ Found' : '❌ Not found');
  console.log(`  - Constants.expoConfig?.extra?.[${key}]:`, Constants.expoConfig?.extra?.[key] ? '✅ Found' : '❌ Not found');
  console.log(`  - Constants.expoConfig?.extra?.[EXPO_PUBLIC_${key}]:`, Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`] ? '✅ Found' : '❌ Not found');
  
  if (process.env[key]) return process.env[key]!;
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  return '';
};

// Privy Configuration
export const PRIVY_CONFIG = {
  // Get Privy App ID from environment variables
  appId: getEnvVar('PRIVY_APP_ID') || getEnvVar('EXPO_PUBLIC_PRIVY_APP_ID'),
  
  // Login methods to enable
  loginMethods: [
    'email',
    'google',
    'apple',
    'twitter',
    'discord',
    'github',
    'linkedin',
    'farcaster',
    'wallet'
  ] as const,
  
  // Appearance configuration
  appearance: {
    theme: 'light' as const,
    accentColor: '#6366f1',
    logo: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a',
  },
  
  // Embedded wallet configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
    requireUserPasswordOnCreate: false,
    noPromptOnSignature: false,
  },
  
  // Legal and privacy
  legal: {
    termsAndConditionsUrl: 'https://wesplit.app/terms',
    privacyPolicyUrl: 'https://wesplit.app/privacy',
  },
  
  // MFA configuration
  mfa: {
    noPromptOnMfaRequired: false,
  },
  
  // Customization
  customization: {
    showWalletLoginFirst: false,
    showWallets: true,
  },
};

// Validate configuration
export const validatePrivyConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!PRIVY_CONFIG.appId) {
    errors.push('PRIVY_APP_ID is required. Please add it to your .env file or app.json extra section.');
  }
  
  if (PRIVY_CONFIG.loginMethods.length < 1) {
    errors.push('At least one login method must be configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log configuration (only in development)
if (__DEV__) {
  const validation = validatePrivyConfig();
  if (validation.isValid) {
    console.log('🔐 Privy Configuration:', {
      appId: PRIVY_CONFIG.appId ? `${PRIVY_CONFIG.appId.substring(0, 10)}...` : 'NOT_SET',
      loginMethods: PRIVY_CONFIG.loginMethods,
      hasEmbeddedWallets: !!PRIVY_CONFIG.embeddedWallets,
    });
  } else {
    console.error('❌ Privy Configuration Errors:', validation.errors);
  }
}

export default PRIVY_CONFIG;
