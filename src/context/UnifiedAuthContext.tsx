/**
 * Unified Authentication Context
 * Provides unified authentication state for both Firebase and Phantom users
 * Handles wallet resolution and authentication flows
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { logger } from '../services/analytics/loggingService';
import { UnifiedWalletService } from '../services/blockchain/wallet/UnifiedWalletService';
import PhantomAuthService, { PhantomUser } from '../services/auth/PhantomAuthService';

export interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  authType: 'firebase' | 'phantom';
  // Firebase user data (if applicable)
  firebaseUser?: FirebaseUser;
  // Phantom user data (if applicable)
  phantomUser?: PhantomUser;
  // Unified wallet info
  wallets?: {
    embedded?: any;
    phantom: any[];
  };
}

export interface UnifiedAuthContextType {
  // Current user state
  currentUser: UnifiedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Authentication methods
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signInWithPhantom: (provider: 'google' | 'apple') => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;

  // Wallet methods
  getUserWallet: (context?: { splitType?: string }) => Promise<any>;
  ensureWalletForSplit: (
    splitType: 'degen' | 'spend' | 'fair',
    preferredProvider?: 'google' | 'apple'
  ) => Promise<{ success: boolean; wallet?: any; error?: string }>;

  // Utility methods
  refreshUser: () => Promise<void>;
  hasWallet: (type?: 'embedded' | 'phantom') => boolean;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export const UnifiedAuthProvider: React.FC<UnifiedAuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const unifiedWalletService = UnifiedWalletService.getInstance();
  const phantomAuth = PhantomAuthService.getInstance();

  // Initialize auth services
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Initialize Phantom auth
        await phantomAuth.initialize();

        // Check for existing authenticated user
        await refreshUser();

      } catch (error) {
        logger.error('Failed to initialize unified auth', error, 'UnifiedAuthProvider');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Refresh current user state from all auth services
   */
  const refreshUser = async (): Promise<void> => {
    try {
      // Check Phantom auth first (preferred for new users)
      const phantomUser = phantomAuth.getCurrentUser();
      if (phantomUser) {
        const wallets = await unifiedWalletService.getAllUserWallets(phantomUser.id);
        const unifiedUser: UnifiedUser = {
          id: phantomUser.id,
          name: phantomUser.name,
          email: phantomUser.email,
          avatar: phantomUser.avatar,
          authType: 'phantom',
          phantomUser,
          wallets
        };
        setCurrentUser(unifiedUser);
        return;
      }

      // Check Firebase auth as fallback
      // (Would need to import and check firebase auth state)
      // For now, set to null if no Phantom user
      setCurrentUser(null);

    } catch (error) {
      logger.error('Failed to refresh user', error, 'UnifiedAuthProvider');
      setCurrentUser(null);
    }
  };

  /**
   * Sign in with Google (Firebase)
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would use existing Firebase Google auth
      // Implementation would mirror existing auth service

      logger.info('Firebase Google sign in not yet implemented', null, 'UnifiedAuthProvider');
      return { success: false, error: 'Firebase Google auth not implemented' };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google sign in failed'
      };
    }
  };

  /**
   * Sign in with Apple (Firebase)
   */
  const signInWithApple = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // This would use existing Firebase Apple auth
      logger.info('Firebase Apple sign in not yet implemented', null, 'UnifiedAuthProvider');
      return { success: false, error: 'Firebase Apple auth not implemented' };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Apple sign in failed'
      };
    }
  };

  /**
   * Sign in with Phantom social login
   */
  const signInWithPhantom = async (
    provider: 'google' | 'apple'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const result = await phantomAuth.signInWithSocial(provider);

      if (result.success && result.user) {
        await refreshUser();
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Phantom sign in failed'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Phantom sign in failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out from all auth services
   */
  const signOut = async (): Promise<void> => {
    try {
      await phantomAuth.signOut();
      // Also sign out from Firebase if needed

      setCurrentUser(null);
      logger.info('User signed out from unified auth', null, 'UnifiedAuthProvider');

    } catch (error) {
      logger.error('Failed to sign out', error, 'UnifiedAuthProvider');
    }
  };

  /**
   * Get user wallet for specific context
   */
  const getUserWallet = async (context?: { splitType?: string }): Promise<any> => {
    if (!currentUser) {
      return null;
    }

    try {
      return await unifiedWalletService.getWalletForContext(
        currentUser.id,
        context
      );
    } catch (error) {
      logger.error('Failed to get user wallet', error, 'UnifiedAuthProvider');
      return null;
    }
  };

  /**
   * Ensure user has wallet for split participation
   */
  const ensureWalletForSplit = async (
    splitType: 'degen' | 'spend' | 'fair',
    preferredProvider: 'google' | 'apple' = 'google'
  ): Promise<{ success: boolean; wallet?: any; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const walletInfo = await unifiedWalletService.ensureWalletForSplit(
        currentUser.id,
        currentUser.name,
        currentUser.email,
        splitType,
        preferredProvider
      );

      if (walletInfo.type !== 'none') {
        // Refresh user wallets
        await refreshUser();
        return { success: true, wallet: walletInfo };
      }

      return { success: false, error: 'Failed to create wallet for split' };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wallet creation failed'
      };
    }
  };

  /**
   * Check if user has specific wallet type
   */
  const hasWallet = (type?: 'embedded' | 'phantom'): boolean => {
    if (!currentUser?.wallets) {
      return false;
    }

    if (!type) {
      return currentUser.wallets.embedded !== undefined || currentUser.wallets.phantom.length > 0;
    }

    if (type === 'embedded') {
      return currentUser.wallets.embedded !== undefined;
    }

    if (type === 'phantom') {
      return currentUser.wallets.phantom.length > 0;
    }

    return false;
  };

  const contextValue: UnifiedAuthContextType = {
    currentUser,
    isLoading,
    isAuthenticated: currentUser !== null,
    signInWithGoogle,
    signInWithApple,
    signInWithPhantom,
    signOut,
    getUserWallet,
    ensureWalletForSplit,
    refreshUser,
    hasWallet
  };

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};

/**
 * Hook to use unified authentication
 */
export const useUnifiedAuth = (): UnifiedAuthContextType => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

export default UnifiedAuthContext;
