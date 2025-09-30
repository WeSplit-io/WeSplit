/**
 * Privy Authentication Hook for WeSplit
 * Integrates Privy authentication with existing app state
 */

import { useEffect, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';
import { logger } from '../services/loggingService';
import usePrivyAuthFallback from './usePrivyAuthFallback';
import { privyAuthService } from '../services/privyAuthService';

export const usePrivyAuth = () => {
  const { authenticateUser, logoutUser, currentUser } = useApp();
  const [isPrivyAvailable, setIsPrivyAvailable] = useState(false);
  const [privyHooks, setPrivyHooks] = useState<any>(null);

  // Temporarily disable Privy hooks loading to prevent bundling errors
  useEffect(() => {
    console.log('⚠️ [usePrivyAuth] Privy hooks loading temporarily disabled for testing');
    setIsPrivyAvailable(false);
    
    // const loadPrivyHooks = async () => {
    //   try {
    //     console.log('🔄 [usePrivyAuth] Loading Privy hooks...');
    //     const privyModule = await import('@privy-io/react-auth');
    //     console.log('📦 [usePrivyAuth] Privy module keys:', Object.keys(privyModule));
    //     console.log('📦 [usePrivyAuth] Privy module default:', privyModule.default);
    //     
    //     // Try to extract hooks from different export patterns
    //     let hooks = null;
    //     
    //     // Pattern 1: Direct named exports (version 1.7.0)
    //     if (privyModule.usePrivy && privyModule.useLogin && privyModule.useLogout) {
    //       console.log('✅ [usePrivyAuth] Found hooks as named exports');
    //       hooks = {
    //         usePrivyBase: privyModule.usePrivy,
    //         useLoginBase: privyModule.useLogin,
    //         useLogoutBase: privyModule.useLogout,
    //         useWallets: privyModule.useWallets,
    //         useCreateWallet: privyModule.useCreateWallet,
    //         useExportWallet: privyModule.useExportWallet,
    //         useSetActiveWallet: privyModule.useSetActiveWallet,
    //         useWallet: privyModule.useWallet
    //       };
    //     }
    //     // Pattern 2: Default export with hooks
    //     else if (privyModule.default && privyModule.default.usePrivy) {
    //       console.log('✅ [usePrivyAuth] Found hooks in default export');
    //       hooks = {
    //         usePrivyBase: privyModule.default.usePrivy,
    //         useLoginBase: privyModule.default.useLogin,
    //         useLogoutBase: privyModule.default.useLogout,
    //         useWallets: privyModule.default.useWallets,
    //         useCreateWallet: privyModule.default.useCreateWallet,
    //         useExportWallet: privyModule.default.useExportWallet,
    //         useSetActiveWallet: privyModule.default.useSetActiveWallet,
    //         useWallet: privyModule.default.useWallet
    //       };
    //     }
    //     // Pattern 3: Default export is the hooks object
    //     else if (privyModule.default && typeof privyModule.default === 'object') {
    //       console.log('✅ [usePrivyAuth] Default export is hooks object');
    //       hooks = {
    //         usePrivyBase: privyModule.default.usePrivy,
    //         useLoginBase: privyModule.default.useLogin,
    //         useLogoutBase: privyModule.default.useLogout,
    //         useWallets: privyModule.default.useWallets,
    //         useCreateWallet: privyModule.default.useCreateWallet,
    //         useExportWallet: privyModule.default.useExportWallet,
    //         useSetActiveWallet: privyModule.default.useSetActiveWallet,
    //         useWallet: privyModule.default.useWallet
    //       };
    //     }
    //     
    //     if (hooks && hooks.usePrivyBase) {
    //       setPrivyHooks(hooks);
    //       setIsPrivyAvailable(true);
    //       logger.info('Privy hooks loaded successfully', {}, 'usePrivyAuth');
    //       console.log('✅ [usePrivyAuth] Hooks set successfully');
    //     } else {
    //       console.log('❌ [usePrivyAuth] No valid hooks found');
    //       throw new Error('No valid Privy hooks found in module');
    //     }
    //   } catch (error) {
    //     console.error('❌ [usePrivyAuth] Failed to load Privy hooks:', error);
    //     logger.warn('Failed to load Privy hooks, using fallback', { error: error instanceof Error ? error.message : 'Unknown error' }, 'usePrivyAuth');
    //     setIsPrivyAvailable(false);
    //   }
    // };

    // loadPrivyHooks();
  }, []);

  // Use fallback if Privy is not available
  if (!isPrivyAvailable || !privyHooks) {
    return usePrivyAuthFallback();
  }

  // Use actual Privy hooks with safety checks
  let ready = false;
  let authenticated = false;
  let privyUser = null;
  let privyLoading = false;
  let privyLogin = null;
  let privyLogout = null;
  let wallets = [];
  let createWallet = null;
  let exportWallet = null;
  let setActiveWallet = null;
  let activeWallet = null;

  try {
    if (privyHooks.usePrivyBase && typeof privyHooks.usePrivyBase === 'function') {
      const privyResult = privyHooks.usePrivyBase();
      ready = privyResult.ready || false;
      authenticated = privyResult.authenticated || false;
      privyUser = privyResult.user || null;
      privyLoading = privyResult.isLoading || false;
    }
    
    if (privyHooks.useLoginBase && typeof privyHooks.useLoginBase === 'function') {
      const loginResult = privyHooks.useLoginBase();
      privyLogin = loginResult.login || null;
    }
    
    if (privyHooks.useLogoutBase && typeof privyHooks.useLogoutBase === 'function') {
      const logoutResult = privyHooks.useLogoutBase();
      privyLogout = logoutResult.logout || null;
    }
    
    if (privyHooks.useWallets && typeof privyHooks.useWallets === 'function') {
      const walletsResult = privyHooks.useWallets();
      wallets = walletsResult.wallets || [];
    }
    
    if (privyHooks.useCreateWallet && typeof privyHooks.useCreateWallet === 'function') {
      const createResult = privyHooks.useCreateWallet();
      createWallet = createResult.createWallet || null;
    }
    
    if (privyHooks.useExportWallet && typeof privyHooks.useExportWallet === 'function') {
      const exportResult = privyHooks.useExportWallet();
      exportWallet = exportResult.exportWallet || null;
    }
    
    if (privyHooks.useSetActiveWallet && typeof privyHooks.useSetActiveWallet === 'function') {
      const setActiveResult = privyHooks.useSetActiveWallet();
      setActiveWallet = setActiveResult.setActiveWallet || null;
    }
    
    if (privyHooks.useWallet && typeof privyHooks.useWallet === 'function') {
      const walletResult = privyHooks.useWallet();
      activeWallet = walletResult.wallet || null;
    }
  } catch (error) {
    console.error('❌ [usePrivyAuth] Error calling Privy hooks:', error);
    // Fall back to fallback implementation
    return usePrivyAuthFallback();
  }

  // Handle Privy authentication state changes
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (!ready) return;
      
      if (authenticated && privyUser && !currentUser) {
        // User authenticated with Privy but not in app state
        logger.info('Privy user authenticated, syncing with app state', {
          privyUserId: privyUser.id,
          email: privyUser.email?.address
        }, 'usePrivyAuth');
        
        try {
          const authResult = await privyAuthService.authenticateWithPrivy(privyUser);
          
          if (authResult.success && authResult.user) {
            const authMethod = privyAuthService.getAuthMethod(privyUser);
            await authenticateUser(authResult.user, authMethod as any);
            
            logger.info('Successfully synced Privy user with app state', {
              userId: authResult.user.id,
              email: authResult.user.email,
              hasWallet: !!authResult.user.wallet_address
            }, 'usePrivyAuth');
          } else {
            logger.error('Failed to sync Privy user with app state', {
              error: authResult.error
            }, 'usePrivyAuth');
          }
        } catch (error) {
          logger.error('Error syncing Privy user with app state', error, 'usePrivyAuth');
        }
      } else if (!authenticated && currentUser) {
        // User logged out from Privy but still in app state
        logger.info('Privy user logged out, clearing app state', {}, 'usePrivyAuth');
        logoutUser();
        privyAuthService.clearCurrentUser();
      }
    };

    handleAuthStateChange();
  }, [ready, authenticated, privyUser, currentUser, authenticateUser, logoutUser]);

  // Login function that uses Privy
  const login = useCallback(async (loginMethod?: string) => {
    try {
      logger.info('Initiating Privy login', { loginMethod }, 'usePrivyAuth');
      
      if (loginMethod) {
        // Login with specific method
        await privyLogin(loginMethod as any);
      } else {
        // Login with default method
        await privyLogin();
      }
    } catch (error) {
      logger.error('Privy login failed', error, 'usePrivyAuth');
      throw error;
    }
  }, [privyLogin]);

  // Logout function that uses Privy
  const logout = useCallback(async () => {
    try {
      logger.info('Initiating Privy logout', {}, 'usePrivyAuth');
      
      // Clear app state first
      logoutUser();
      privyAuthService.clearCurrentUser();
      
      // Then logout from Privy
      await privyLogout();
    } catch (error) {
      logger.error('Privy logout failed', error, 'usePrivyAuth');
      throw error;
    }
  }, [privyLogout, logoutUser]);

  // Create wallet function
  const createUserWallet = useCallback(async () => {
    try {
      if (!authenticated || !privyUser) {
        throw new Error('User not authenticated');
      }
      
      logger.info('Creating wallet for Privy user', { userId: privyUser.id }, 'usePrivyAuth');
      
      await createWallet();
      
      logger.info('Successfully created wallet for Privy user', {}, 'usePrivyAuth');
    } catch (error) {
      logger.error('Failed to create wallet for Privy user', error, 'usePrivyAuth');
      throw error;
    }
  }, [authenticated, privyUser, createWallet]);

  // Export wallet function
  const exportUserWallet = useCallback(async () => {
    try {
      if (!activeWallet) {
        throw new Error('No active wallet to export');
      }
      
      logger.info('Exporting wallet for Privy user', { walletAddress: activeWallet.address }, 'usePrivyAuth');
      
      const exportResult = await exportWallet(activeWallet.address);
      
      logger.info('Successfully exported wallet for Privy user', {}, 'usePrivyAuth');
      
      return exportResult;
    } catch (error) {
      logger.error('Failed to export wallet for Privy user', error, 'usePrivyAuth');
      throw error;
    }
  }, [activeWallet, exportWallet]);

  // Set active wallet function
  const setUserActiveWallet = useCallback(async (walletAddress: string) => {
    try {
      logger.info('Setting active wallet for Privy user', { walletAddress }, 'usePrivyAuth');
      
      await setActiveWallet(walletAddress);
      
      logger.info('Successfully set active wallet for Privy user', {}, 'usePrivyAuth');
    } catch (error) {
      logger.error('Failed to set active wallet for Privy user', error, 'usePrivyAuth');
      throw error;
    }
  }, [setActiveWallet]);

  // Get user's social profile
  const getSocialProfile = useCallback(() => {
    if (!privyUser) return null;
    
    return privyAuthService.getSocialProfile(privyUser);
  }, [privyUser]);

  // Get authentication method
  const getAuthMethod = useCallback(() => {
    if (!privyUser) return null;
    
    return privyAuthService.getAuthMethod(privyUser);
  }, [privyUser]);

  // Check if user has completed onboarding
  const checkOnboardingStatus = useCallback(async () => {
    if (!currentUser) return false;
    
    return await privyAuthService.checkOnboardingStatus(currentUser.id);
  }, [currentUser]);

  // Update onboarding status
  const updateOnboardingStatus = useCallback(async (completed: boolean) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    await privyAuthService.updateOnboardingStatus(currentUser.id, completed);
  }, [currentUser]);

  return {
    // Authentication state
    ready,
    authenticated,
    isLoading: privyLoading,
    user: currentUser,
    privyUser,
    
    // Authentication methods
    login,
    logout,
    
    // Wallet management
    wallets,
    activeWallet,
    createWallet: createUserWallet,
    exportWallet: exportUserWallet,
    setActiveWallet: setUserActiveWallet,
    
    // User information
    getSocialProfile,
    getAuthMethod,
    checkOnboardingStatus,
    updateOnboardingStatus,
    
    // Privy service
    privyAuthService,
  };
};

export default usePrivyAuth;
