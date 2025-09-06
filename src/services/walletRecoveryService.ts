import { firebaseDataService } from './firebaseDataService';
import { userWalletService } from './userWalletService';

export interface WalletRecoveryResult {
  success: boolean;
  walletAddress?: string;
  walletPublicKey?: string;
  error?: string;
  recovered: boolean;
}

export interface WalletRecoveryOptions {
  userId: string;
  email: string;
  forceRecovery?: boolean;
}

/**
 * Service to handle wallet recovery and prevent wallet address loss
 * This service ensures that existing wallets are preserved during email re-validation
 */
export class WalletRecoveryService {
  private static instance: WalletRecoveryService;

  public static getInstance(): WalletRecoveryService {
    if (!WalletRecoveryService.instance) {
      WalletRecoveryService.instance = new WalletRecoveryService();
    }
    return WalletRecoveryService.instance;
  }

  /**
   * Attempt to recover existing wallet for a user
   * This is called during login/email validation to prevent wallet loss
   */
  async recoverExistingWallet(options: WalletRecoveryOptions): Promise<WalletRecoveryResult> {
    try {
      const { userId, email, forceRecovery = false } = options;
      
      console.log('🔄 WalletRecoveryService: Starting wallet recovery process', { userId, email });

      // Step 1: Check if user already has a wallet in their profile
      const currentUser = await firebaseDataService.user.getCurrentUser(userId);
      
      if (currentUser && currentUser.wallet_address && currentUser.wallet_address.trim() !== '') {
        console.log('✅ WalletRecoveryService: User already has wallet in profile, no recovery needed', { 
          userId, 
          walletAddress: currentUser.wallet_address 
        });
        
        return {
          success: true,
          walletAddress: currentUser.wallet_address,
          walletPublicKey: currentUser.wallet_public_key || currentUser.wallet_address,
          recovered: false // Not recovered, already existed
        };
      }

      // Step 2: Check if there are other user documents with the same email that have wallets
      const usersWithSameEmail = await this.findUsersByEmail(email);
      const usersWithWallets = usersWithSameEmail.filter(user => 
        user.wallet_address && user.wallet_address.trim() !== ''
      );

      if (usersWithWallets.length > 0) {
        // Found existing wallets for this email - recover the most recent one
        const mostRecentWallet = usersWithWallets.sort((a, b) => 
          new Date(b.lastLoginAt || b.created_at).getTime() - 
          new Date(a.lastLoginAt || a.created_at).getTime()
        )[0];

        console.log('✅ WalletRecoveryService: Found existing wallet for email, recovering it', { 
          userId, 
          email,
          recoveredWalletAddress: mostRecentWallet.wallet_address,
          recoveredFromUserId: mostRecentWallet.id
        });

        // Update current user with recovered wallet info
        await firebaseDataService.user.updateUser(userId, {
          wallet_address: mostRecentWallet.wallet_address,
          wallet_public_key: mostRecentWallet.wallet_public_key || mostRecentWallet.wallet_address
        });

        return {
          success: true,
          walletAddress: mostRecentWallet.wallet_address,
          walletPublicKey: mostRecentWallet.wallet_public_key || mostRecentWallet.wallet_address,
          recovered: true
        };
      }

      // Step 3: Check wallet_links collection for linked wallets
      const linkedWallets = await this.findLinkedWalletsByEmail(email);
      
      if (linkedWallets.length > 0) {
        // Found linked wallets - recover the most recent one
        const mostRecentLinkedWallet = linkedWallets.sort((a, b) => 
          new Date(b.linkedAt).getTime() - new Date(a.linkedAt).getTime()
        )[0];

        console.log('✅ WalletRecoveryService: Found linked wallet for email, recovering it', { 
          userId, 
          email,
          recoveredWalletAddress: mostRecentLinkedWallet.walletAddress,
          linkedAt: mostRecentLinkedWallet.linkedAt
        });

        // Update current user with recovered wallet info
        await firebaseDataService.user.updateUser(userId, {
          wallet_address: mostRecentLinkedWallet.walletAddress,
          wallet_public_key: mostRecentLinkedWallet.walletAddress // Use address as public key for external wallets
        });

        return {
          success: true,
          walletAddress: mostRecentLinkedWallet.walletAddress,
          walletPublicKey: mostRecentLinkedWallet.walletAddress,
          recovered: true
        };
      }

      // Step 4: If force recovery is enabled, create a new wallet
      if (forceRecovery) {
        console.log('🔄 WalletRecoveryService: Force recovery enabled, creating new wallet', { userId, email });
        
        const walletResult = await userWalletService.ensureUserWallet(userId);
        
        if (walletResult.success && walletResult.wallet) {
          return {
            success: true,
            walletAddress: walletResult.wallet.address,
            walletPublicKey: walletResult.wallet.publicKey,
            recovered: false // Not recovered, newly created
          };
        } else {
          return {
            success: false,
            error: walletResult.error || 'Failed to create new wallet',
            recovered: false
          };
        }
      }

      // No wallet found and force recovery not enabled
      console.log('ℹ️ WalletRecoveryService: No existing wallet found for email, no recovery attempted', { userId, email });
      
      return {
        success: true,
        recovered: false
      };

    } catch (error) {
      console.error('❌ WalletRecoveryService: Error during wallet recovery', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wallet recovery failed',
        recovered: false
      };
    }
  }

  /**
   * Find all users with the same email address
   */
  private async findUsersByEmail(email: string): Promise<any[]> {
    try {
      // For now, return empty array since we don't have direct database access
      // This would need to be implemented through the firebaseDataService
      console.log('ℹ️ WalletRecoveryService: findUsersByEmail not yet implemented');
      return [];
    } catch (error) {
      console.error('❌ WalletRecoveryService: Error finding users by email', error);
      return [];
    }
  }

  /**
   * Find linked wallets by email
   */
  private async findLinkedWalletsByEmail(email: string): Promise<any[]> {
    try {
      // This would need to be implemented based on your wallet_links collection structure
      // For now, returning empty array
      return [];
    } catch (error) {
      console.error('❌ WalletRecoveryService: Error finding linked wallets by email', error);
      return [];
    }
  }

  /**
   * Check if a user has lost their wallet and needs recovery
   */
  async checkWalletLoss(userId: string, email: string): Promise<boolean> {
    try {
      const currentUser = await firebaseDataService.user.getCurrentUser(userId);
      
      // If user has no wallet, check if they should have one
      if (!currentUser || !currentUser.wallet_address) {
        const usersWithSameEmail = await this.findUsersByEmail(email);
        const usersWithWallets = usersWithSameEmail.filter(user => 
          user.wallet_address && user.wallet_address.trim() !== ''
        );
        
        // If other users with same email have wallets, this user likely lost theirs
        return usersWithSameEmail.length > 0;
      }
      
      return false;
    } catch (error) {
      console.error('❌ WalletRecoveryService: Error checking wallet loss', error);
      return false;
    }
  }
}

export const walletRecoveryService = WalletRecoveryService.getInstance(); 