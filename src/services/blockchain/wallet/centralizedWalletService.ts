/**
 * Centralized Wallet Creation Service
 * Single source of truth for all wallet creation operations
 * Eliminates duplicate code and ensures consistent wallet creation
 */

import { Keypair } from '@solana/web3.js';
import { walletRecoveryService } from './walletRecoveryService';
import { firebaseDataService } from '../../data';
import { logger } from '../../analytics/loggingService';

export interface CentralizedWalletResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    privateKey: string;
    mnemonic?: string;
  };
  error?: string;
}

export class CentralizedWalletService {
  /**
   * Create a new wallet for a user with proper seed phrase storage
   * This is the ONLY method that should be used for wallet creation
   */
  static async createUserWallet(userId: string): Promise<CentralizedWalletResult> {
    try {
      logger.info('Creating new wallet for user', { userId }, 'CentralizedWalletService');

      // Use the wallet recovery service to create and store wallet
      const result = await walletRecoveryService.createAndStoreWallet(userId);
      
      if (result.success && result.wallet) {
        // Update user's wallet address in database
        try {
          const updateData = {
            wallet_address: result.wallet.address,
            wallet_public_key: result.wallet.publicKey,
            wallet_created_at: new Date().toISOString(),
            wallet_status: 'healthy',
            wallet_has_private_key: true,
            wallet_has_seed_phrase: true,
            wallet_type: 'app-generated'
          };
          
          await firebaseDataService.user.updateUser(userId, updateData);
          
          logger.info('New wallet created and database updated', { 
            userId, 
            walletAddress: result.wallet.address 
          }, 'CentralizedWalletService');
        } catch (updateError) {
          logger.warn('Failed to update user wallet in database', updateError, 'CentralizedWalletService');
        }

        return {
          success: true,
          wallet: {
            address: result.wallet.address,
            publicKey: result.wallet.publicKey,
            privateKey: result.wallet.privateKey
          }
        };
      }

      return {
        success: false,
        error: result.errorMessage || 'Failed to create wallet'
      };

    } catch (error) {
      logger.error('Failed to create user wallet', error, 'CentralizedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get wallet information for a user
   */
  static async getUserWalletInfo(userId: string): Promise<{
    success: boolean;
    wallet?: {
      address: string;
      publicKey: string;
      privateKey: string;
    };
    error?: string;
  }> {
    try {
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      
      if (storedWallets.length > 0) {
        const wallet = storedWallets[0]; // Get the first (primary) wallet
        return {
          success: true,
          wallet: {
            address: wallet.address,
            publicKey: wallet.publicKey,
            privateKey: wallet.privateKey
          }
        };
      }

      return {
        success: false,
        error: 'No wallet found for user'
      };
    } catch (error) {
      logger.error('Failed to get user wallet info', error, 'CentralizedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get seed phrase for a user's wallet
   */
  static async getUserSeedPhrase(userId: string): Promise<{
    success: boolean;
    seedPhrase?: string;
    error?: string;
  }> {
    try {
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      
      if (mnemonic) {
        return {
          success: true,
          seedPhrase: mnemonic
        };
      }

      return {
        success: false,
        error: 'No seed phrase found for user'
      };
    } catch (error) {
      logger.error('Failed to get user seed phrase', error, 'CentralizedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get private key for a user's wallet
   */
  static async getUserPrivateKey(userId: string): Promise<{
    success: boolean;
    privateKey?: string;
    error?: string;
  }> {
    try {
      const walletInfo = await this.getUserWalletInfo(userId);
      
      if (walletInfo.success && walletInfo.wallet) {
        return {
          success: true,
          privateKey: walletInfo.wallet.privateKey
        };
      }

      return {
        success: false,
        error: walletInfo.error || 'No private key found for user'
      };
    } catch (error) {
      logger.error('Failed to get user private key', error, 'CentralizedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const centralizedWalletService = CentralizedWalletService;
