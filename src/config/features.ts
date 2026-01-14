/**
 * Feature Flags for WeSplit
 *
 * Controls rollout of experimental features per environment
 */

import { PHANTOM_CONFIG, isProduction } from './env';
import { isPhantomConfigured } from '../providers/PhantomSDKProvider';

export interface FeatureFlags {
  // Phantom Integration
  PHANTOM_SDK_ENABLED: boolean;
  PHANTOM_SOCIAL_LOGIN: boolean;
  PHANTOM_SPLIT_WALLETS: boolean;
  PHANTOM_AUTO_CONFIRM: boolean;
  PHANTOM_MULTI_CHAIN: boolean;

  // Shared Wallet Feature
  SHARED_WALLET_ENABLED: boolean;

  // MoonPay Integration (DISABLED in production for App Store compliance)
  MOONPAY_ENABLED: boolean;

  // Other features can be added here
}

// Environment-specific feature flags
const getEnvironmentFeatures = (): FeatureFlags => {
  // Shared wallet is now production-ready and enabled in all environments
  const sharedWalletEnabled = true;

  // Check if Phantom is configured (works in both dev and production)
  const isPhantomConfigValid = isPhantomConfigured();

  // Enable Phantom features based on configuration, not just dev mode
  // In production, features are enabled via environment variables
  
  // MoonPay is DISABLED in production for App Store compliance
  // Guideline 2.1: WeSplit does not provide cryptocurrency exchange services
  // MoonPay integration is disabled to avoid being classified as an exchange
  const moonpayEnabled = !isProduction && (process.env.EXPO_PUBLIC_MOONPAY_ENABLED === 'true');
  
  return {
    PHANTOM_SDK_ENABLED: isPhantomConfigValid,
    PHANTOM_SOCIAL_LOGIN: isPhantomConfigValid && PHANTOM_CONFIG.features.socialLogin,
    PHANTOM_SPLIT_WALLETS: isPhantomConfigValid && PHANTOM_CONFIG.features.splitWallets,
    PHANTOM_AUTO_CONFIRM: PHANTOM_CONFIG.features.autoConfirm,
    PHANTOM_MULTI_CHAIN: PHANTOM_CONFIG.features.multiChain,
    SHARED_WALLET_ENABLED: sharedWalletEnabled, // Enabled in all environments
    MOONPAY_ENABLED: moonpayEnabled, // Disabled in production
  };
};

export const FEATURES: FeatureFlags = getEnvironmentFeatures();

// Utility functions
export const isPhantomEnabled = (): boolean => FEATURES.PHANTOM_SDK_ENABLED;
export const isPhantomSocialLoginEnabled = (): boolean => FEATURES.PHANTOM_SOCIAL_LOGIN;
export const isPhantomSplitWalletsEnabled = (): boolean => FEATURES.PHANTOM_SPLIT_WALLETS;
export const isPhantomAutoConfirmEnabled = (): boolean => FEATURES.PHANTOM_AUTO_CONFIRM;
export const isPhantomMultiChainEnabled = (): boolean => FEATURES.PHANTOM_MULTI_CHAIN;
export const isSharedWalletEnabled = (): boolean => FEATURES.SHARED_WALLET_ENABLED;
export const isMoonPayEnabled = (): boolean => FEATURES.MOONPAY_ENABLED;

// Feature flag overrides (for testing/debugging)
export const overrideFeatureFlag = (flag: keyof FeatureFlags, value: boolean): void => {
  (FEATURES as any)[flag] = value;
};

// Reset to environment defaults
export const resetFeatureFlags = (): void => {
  Object.assign(FEATURES, getEnvironmentFeatures());
};

