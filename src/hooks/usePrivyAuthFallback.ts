/**
 * Privy Authentication Hook Fallback for WeSplit
 * Provides fallback implementation when Privy is not available
 */

import { logger } from '../services/loggingService';

export const usePrivyAuthFallback = () => {
  logger.warn('Privy is not available, using fallback authentication hook', {}, 'usePrivyAuthFallback');

  return {
    // Authentication state
    ready: true,
    authenticated: false,
    isLoading: false,
    user: null,
    privyUser: null,
    
    // Authentication methods
    login: async (provider?: string) => {
      logger.warn('Privy login called but not available', { provider }, 'usePrivyAuthFallback');
      throw new Error('Privy authentication is not available. Please use traditional authentication methods.');
    },
    logout: async () => {
      logger.warn('Privy logout called but not available', {}, 'usePrivyAuthFallback');
    },
    
    // Wallet management
    wallets: [],
    activeWallet: null,
    createWallet: async () => {
      logger.warn('Privy createWallet called but not available', {}, 'usePrivyAuthFallback');
      throw new Error('Privy wallet creation is not available.');
    },
    exportWallet: async () => {
      logger.warn('Privy exportWallet called but not available', {}, 'usePrivyAuthFallback');
      throw new Error('Privy wallet export is not available.');
    },
    setActiveWallet: async () => {
      logger.warn('Privy setActiveWallet called but not available', {}, 'usePrivyAuthFallback');
      throw new Error('Privy wallet management is not available.');
    },
    
    // User information
    getSocialProfile: () => null,
    getAuthMethod: () => null,
    checkOnboardingStatus: async () => false,
    updateOnboardingStatus: async () => {
      logger.warn('Privy updateOnboardingStatus called but not available', {}, 'usePrivyAuthFallback');
    },
    
    // Privy service
    privyAuthService: null,
  };
};

export default usePrivyAuthFallback;
