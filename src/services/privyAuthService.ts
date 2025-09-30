/**
 * Privy Authentication Service for WeSplit
 * Integrates Privy SSO with existing authentication system
 * Provides enhanced SSO capabilities while maintaining compatibility
 */

import { 
  PrivyProvider, 
  usePrivy, 
  useLogin, 
  useLogout, 
  useWallets,
  useCreateWallet,
  useExportWallet,
  useSetActiveWallet,
  useWallet,
  PrivyUser,
  WalletWithMetadata
} from '@privy-io/react-auth';
import { logger } from './loggingService';
import { unifiedUserService } from './unifiedUserService';
import { userWalletService } from './userWalletService';
import { AppUser } from './simplifiedAuthService';

// Types for Privy integration
export interface PrivyAuthResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  isNewUser?: boolean;
}

export interface PrivyWalletInfo {
  address: string;
  walletType: 'privy' | 'external';
  chainType: 'ethereum' | 'solana';
  isActive: boolean;
}

class PrivyAuthService {
  private static instance: PrivyAuthService;
  private currentUser: AppUser | null = null;

  private constructor() {
    logger.info('PrivyAuthService initialized', {}, 'PrivyAuth');
  }

  public static getInstance(): PrivyAuthService {
    if (!PrivyAuthService.instance) {
      PrivyAuthService.instance = new PrivyAuthService();
    }
    return PrivyAuthService.instance;
  }

  /**
   * Authenticate user with Privy
   * This method handles the complete authentication flow including wallet creation
   */
  async authenticateWithPrivy(privyUser: PrivyUser): Promise<PrivyAuthResult> {
    try {
      logger.info('PrivyAuthService: Authenticating user with Privy', { 
        userId: privyUser.id,
        email: privyUser.email?.address,
        hasWallet: !!privyUser.wallet
      }, 'PrivyAuth');

      // Step 1: Create or get user using unified service
      const userResult = await unifiedUserService.createOrGetUser({
        email: privyUser.email?.address || '',
        name: privyUser.email?.address?.split('@')[0] || 'Privy User',
        avatar: privyUser.google?.picture || privyUser.twitter?.profileImageUrl || '',
        walletAddress: privyUser.wallet?.address || '',
        walletPublicKey: privyUser.wallet?.address || ''
      });

      if (!userResult.success || !userResult.user) {
        throw new Error(userResult.error || 'Failed to create/get user');
      }

      // Step 2: Handle wallet creation/restoration
      let walletAddress = '';
      let walletPublicKey = '';

      if (privyUser.wallet?.address) {
        // User has a Privy embedded wallet
        walletAddress = privyUser.wallet.address;
        walletPublicKey = privyUser.wallet.address;
        
        logger.info('PrivyAuthService: User has Privy embedded wallet', { 
          address: walletAddress 
        }, 'PrivyAuth');
      } else {
        // User doesn't have a wallet, ensure they get one
        logger.info('PrivyAuthService: User has no wallet, ensuring wallet creation', {}, 'PrivyAuth');
        
        const walletResult = await userWalletService.ensureUserWallet(userResult.user.id.toString());
        
        if (walletResult.success && walletResult.wallet) {
          walletAddress = walletResult.wallet.address;
          walletPublicKey = walletResult.wallet.publicKey || walletResult.wallet.address;
          
          logger.info('PrivyAuthService: Created/restored app wallet for user', { 
            address: walletAddress 
          }, 'PrivyAuth');
        } else {
          logger.warn('PrivyAuthService: Failed to ensure wallet, continuing without wallet', { 
            error: walletResult.error 
          }, 'PrivyAuth');
        }
      }

      // Step 3: Create AppUser object
      const appUser: AppUser = {
        id: userResult.user.id.toString(),
        name: userResult.user.name,
        email: userResult.user.email,
        wallet_address: walletAddress,
        wallet_public_key: walletPublicKey,
        avatar: userResult.user.avatar,
        created_at: userResult.user.created_at,
        emailVerified: privyUser.email?.verified || false,
        lastLoginAt: new Date().toISOString(),
        hasCompletedOnboarding: userResult.user.hasCompletedOnboarding || false
      };

      this.currentUser = appUser;

      logger.info('PrivyAuthService: Authentication completed successfully', {
        userId: appUser.id,
        email: appUser.email,
        hasWallet: !!appUser.wallet_address,
        walletAddress: appUser.wallet_address
      }, 'PrivyAuth');

      return {
        success: true,
        user: appUser,
        isNewUser: userResult.isNewUser
      };

    } catch (error) {
      logger.error('PrivyAuthService: Authentication failed', error, 'PrivyAuth');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  /**
   * Clear current user (for logout)
   */
  clearCurrentUser(): void {
    this.currentUser = null;
    logger.info('PrivyAuthService: Cleared current user', {}, 'PrivyAuth');
  }

  /**
   * Get user's wallet information from Privy
   */
  async getUserWalletInfo(privyUser: PrivyUser): Promise<PrivyWalletInfo | null> {
    try {
      if (!privyUser.wallet?.address) {
        return null;
      }

      return {
        address: privyUser.wallet.address,
        walletType: 'privy',
        chainType: 'ethereum', // Privy primarily supports Ethereum
        isActive: true
      };
    } catch (error) {
      logger.error('PrivyAuthService: Failed to get wallet info', error, 'PrivyAuth');
      return null;
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async checkOnboardingStatus(userId: string): Promise<boolean> {
    try {
      const user = await unifiedUserService.getUser(userId);
      return user?.hasCompletedOnboarding || false;
    } catch (error) {
      logger.error('PrivyAuthService: Failed to check onboarding status', error, 'PrivyAuth');
      return false;
    }
  }

  /**
   * Update user's onboarding status
   */
  async updateOnboardingStatus(userId: string, completed: boolean): Promise<void> {
    try {
      await unifiedUserService.updateUser(userId, {
        hasCompletedOnboarding: completed
      });
      
      if (this.currentUser) {
        this.currentUser.hasCompletedOnboarding = completed;
      }
      
      logger.info('PrivyAuthService: Updated onboarding status', { 
        userId, 
        completed 
      }, 'PrivyAuth');
    } catch (error) {
      logger.error('PrivyAuthService: Failed to update onboarding status', error, 'PrivyAuth');
      throw error;
    }
  }

  /**
   * Get authentication method from Privy user
   */
  getAuthMethod(privyUser: PrivyUser): string {
    if (privyUser.google) return 'google';
    if (privyUser.apple) return 'apple';
    if (privyUser.twitter) return 'twitter';
    if (privyUser.discord) return 'discord';
    if (privyUser.github) return 'github';
    if (privyUser.linkedin) return 'linkedin';
    if (privyUser.farcaster) return 'farcaster';
    if (privyUser.wallet) return 'wallet';
    if (privyUser.email) return 'email';
    return 'unknown';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get user's social profile information
   */
  getSocialProfile(privyUser: PrivyUser): {
    name?: string;
    avatar?: string;
    provider: string;
  } {
    if (privyUser.google) {
      return {
        name: privyUser.google.name,
        avatar: privyUser.google.picture,
        provider: 'google'
      };
    }
    
    if (privyUser.twitter) {
      return {
        name: privyUser.twitter.name,
        avatar: privyUser.twitter.profileImageUrl,
        provider: 'twitter'
      };
    }
    
    if (privyUser.apple) {
      return {
        name: privyUser.apple.name,
        avatar: undefined,
        provider: 'apple'
      };
    }
    
    if (privyUser.discord) {
      return {
        name: privyUser.discord.name,
        avatar: privyUser.discord.profileImageUrl,
        provider: 'discord'
      };
    }
    
    if (privyUser.github) {
      return {
        name: privyUser.github.name,
        avatar: privyUser.github.profileImageUrl,
        provider: 'github'
      };
    }
    
    if (privyUser.linkedin) {
      return {
        name: privyUser.linkedin.name,
        avatar: privyUser.linkedin.profileImageUrl,
        provider: 'linkedin'
      };
    }
    
    if (privyUser.farcaster) {
      return {
        name: privyUser.farcaster.displayName,
        avatar: privyUser.farcaster.profileImage,
        provider: 'farcaster'
      };
    }
    
    return {
      name: privyUser.email?.address?.split('@')[0] || 'User',
      avatar: undefined,
      provider: 'email'
    };
  }
}

// Export singleton instance
export const privyAuthService = PrivyAuthService.getInstance();
