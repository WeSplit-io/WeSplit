/**
 * Feature Flags for WeSplit
 *
 * Controls rollout of experimental features per environment
 */

import { PHANTOM_CONFIG } from './env';
import { isPhantomConfigured } from '../providers/PhantomSDKProvider';

export interface FeatureFlags {
  // Phantom Integration
  PHANTOM_SDK_ENABLED: boolean;
  PHANTOM_SOCIAL_LOGIN: boolean;
  PHANTOM_SPLIT_WALLETS: boolean;
  PHANTOM_AUTO_CONFIRM: boolean;
  PHANTOM_MULTI_CHAIN: boolean;

  // Other features can be added here
}

// Environment-specific feature flags
const getEnvironmentFeatures = (): FeatureFlags => {
  // In production, disable experimental features by default
  if (!__DEV__) {
    return {
      PHANTOM_SDK_ENABLED: false,
      PHANTOM_SOCIAL_LOGIN: false,
      PHANTOM_SPLIT_WALLETS: false,
      PHANTOM_AUTO_CONFIRM: false,
      PHANTOM_MULTI_CHAIN: false,
    };
  }

  // In development/staging, enable based on env config
  return {
    PHANTOM_SDK_ENABLED: isPhantomConfigured(),
    PHANTOM_SOCIAL_LOGIN: isPhantomConfigured() && PHANTOM_CONFIG.features.socialLogin,
    PHANTOM_SPLIT_WALLETS: isPhantomConfigured() && PHANTOM_CONFIG.features.splitWallets,
    PHANTOM_AUTO_CONFIRM: PHANTOM_CONFIG.features.autoConfirm,
    PHANTOM_MULTI_CHAIN: PHANTOM_CONFIG.features.multiChain,
  };
};

export const FEATURES: FeatureFlags = getEnvironmentFeatures();

// Utility functions
export const isPhantomEnabled = (): boolean => FEATURES.PHANTOM_SDK_ENABLED;
export const isPhantomSocialLoginEnabled = (): boolean => FEATURES.PHANTOM_SOCIAL_LOGIN;
export const isPhantomSplitWalletsEnabled = (): boolean => FEATURES.PHANTOM_SPLIT_WALLETS;
export const isPhantomAutoConfirmEnabled = (): boolean => FEATURES.PHANTOM_AUTO_CONFIRM;
export const isPhantomMultiChainEnabled = (): boolean => FEATURES.PHANTOM_MULTI_CHAIN;

// Feature flag overrides (for testing/debugging)
export const overrideFeatureFlag = (flag: keyof FeatureFlags, value: boolean): void => {
  (FEATURES as any)[flag] = value;
};

// Reset to environment defaults
export const resetFeatureFlags = (): void => {
  Object.assign(FEATURES, getEnvironmentFeatures());
};

