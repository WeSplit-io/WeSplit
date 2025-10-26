/**
 * Simplified Wallet Service
 * Clean, focused wallet service without the problematic singleton patterns
 */

import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';
import { walletRecoveryService, WalletRecoveryError } from './walletRecoveryService';
import { getConfig } from '../../../config/unified';

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance?: number;
  usdcBalance?: number;
  isConnected: boolean;
  walletName?: string;
  walletType?: string;
}

export interface UserWalletBalance {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: WalletInfo;
  mnemonic?: string;
  error?: string;
}

export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
  isAvailable: boolean;
  connect(): Promise<WalletInfo>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export interface WalletManagementEvent {
  id?: string;
  userId: string;
  eventType: 'wallet_created' | 'wallet_fixed' | 'wallet_migration' | 'private_key_stored' | 'seed_phrase_stored' | 'wallet_error' | 'status_update';
  eventData: {
    walletAddress?: string;
    previousStatus?: string;
    newStatus?: string;
    errorMessage?: string;
    fixAttempts?: number;
    walletType?: string;
    migrationFrom?: string;
    migrationTo?: string;
  };
  timestamp: string;
  success: boolean;
}

class SimplifiedWalletService {
  private connection: Connection;
  private walletRecoveryCache = new Map<string, WalletCreationResult>();
  private recoveryInProgress = new Set<string>();

  constructor() {
    const config = getConfig();
    this.connection = new Connection(config.blockchain.rpcUrl, 'confirmed');
  }

  /**
   * Wait for ongoing recovery to complete
   */
  private async waitForRecovery(userId: string, maxWaitTime = 10000): Promise<WalletCreationResult | null> {
    const startTime = Date.now();
    
    while (this.recoveryInProgress.has(userId) && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.walletRecoveryCache.get(userId) || null;
  }

  /**
   * Ensure user has a wallet - either recover existing or create new
   */
  async ensureUserWallet(userId: string, expectedWalletAddress?: string): Promise<WalletCreationResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Ensuring user wallet', { userId, expectedWalletAddress }, 'SimplifiedWalletService');

      // Prevent concurrent recovery attempts
      if (this.recoveryInProgress.has(userId)) {
        logger.debug('Recovery already in progress, waiting', { userId }, 'SimplifiedWalletService');
        const cachedResult = await this.waitForRecovery(userId);
        if (cachedResult) {
          return cachedResult;
        }
      }

      this.recoveryInProgress.add(userId);

      try {
        // First, try to recover existing wallet
        const recoveryResult = await walletRecoveryService.recoverWallet(userId);
        
        if (recoveryResult.success && recoveryResult.wallet) {
          logger.info('Wallet recovered successfully', { 
            userId, 
            address: recoveryResult.wallet.address 
          }, 'SimplifiedWalletService');

          const result: WalletCreationResult = {
            success: true,
            wallet: {
              address: recoveryResult.wallet.address,
              publicKey: recoveryResult.wallet.publicKey,
              secretKey: recoveryResult.wallet.privateKey,
              isConnected: true,
              walletName: 'Recovered Wallet',
              walletType: 'recovered'
            }
          };

          this.walletRecoveryCache.set(userId, result);
          return result;
        }

        // Handle specific error cases
        if (recoveryResult.error === WalletRecoveryError.NO_LOCAL_WALLETS) {
          logger.info('No local wallets found, creating new wallet', { userId }, 'SimplifiedWalletService');
          return await this.createNewWallet(userId);
        }

        if (recoveryResult.error === WalletRecoveryError.DATABASE_MISMATCH) {
          logger.warn('Database wallet recovery failed, checking if user action is required', { 
            userId,
            requiresUserAction: recoveryResult.requiresUserAction,
            errorMessage: recoveryResult.errorMessage
          }, 'SimplifiedWalletService');
          
          if (recoveryResult.requiresUserAction) {
            // Database wallet cannot be recovered, user needs to take action
            logger.error('Database wallet recovery requires user action', { 
              userId,
              errorMessage: recoveryResult.errorMessage
            }, 'SimplifiedWalletService');
            
            const errorResult: WalletCreationResult = {
              success: false,
              error: recoveryResult.errorMessage || 'Database wallet cannot be recovered. Please restore from seed phrase.'
            };
            
            this.walletRecoveryCache.set(userId, errorResult);
            return errorResult;
          } else {
            // Try recovery again after mismatch resolution
            const retryResult = await walletRecoveryService.recoverWallet(userId);
            if (retryResult.success && retryResult.wallet) {
              const result: WalletCreationResult = {
                success: true,
                wallet: {
                  address: retryResult.wallet.address,
                  publicKey: retryResult.wallet.publicKey,
                  secretKey: retryResult.wallet.privateKey,
                  isConnected: true,
                  walletName: 'Recovered Wallet',
                  walletType: 'recovered'
                }
              };
              this.walletRecoveryCache.set(userId, result);
              return result;
            }
          }
        }

        // If recovery failed for other reasons, create a new wallet
        logger.info('Wallet recovery failed, creating new wallet', { 
          userId, 
          error: recoveryResult.error,
          errorMessage: recoveryResult.errorMessage
        }, 'SimplifiedWalletService');

        return await this.createNewWallet(userId);

      } finally {
        this.recoveryInProgress.delete(userId);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error ensuring user wallet', { 
        userId, 
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`
      }, 'SimplifiedWalletService');
      
      const errorResult: WalletCreationResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.walletRecoveryCache.set(userId, errorResult);
      return errorResult;
    }
  }

  /**
   * Create a new wallet for the user
   */
  private async createNewWallet(userId: string): Promise<WalletCreationResult> {
    try {
      const createResult = await walletRecoveryService.createAndStoreWallet(userId);
      
      if (createResult.success && createResult.wallet) {
        // Update user's wallet address in database
        try {
          const updateData: any = {
            wallet_address: createResult.wallet.address,
            wallet_public_key: createResult.wallet.publicKey,
            wallet_created_at: new Date().toISOString(),
            wallet_status: 'healthy',
            wallet_type: 'app-generated'
          };
          
          // Only include defined fields to avoid Firebase errors
          const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
          );
          
          await firebaseDataService.user.updateUser(userId, cleanUpdateData);
          
          logger.info('New wallet created and database updated', { 
            userId, 
            walletAddress: createResult.wallet.address 
          }, 'SimplifiedWalletService');
        } catch (updateError) {
          logger.warn('Failed to update user wallet in database', updateError, 'SimplifiedWalletService');
        }

        const result: WalletCreationResult = {
          success: true,
          wallet: {
            address: createResult.wallet.address,
            publicKey: createResult.wallet.publicKey,
            secretKey: createResult.wallet.privateKey,
            isConnected: true,
            walletName: 'App Wallet',
            walletType: 'app-generated'
          }
        };

        this.walletRecoveryCache.set(userId, result);
        return result;
      }

      const errorResult: WalletCreationResult = {
        success: false,
        error: createResult.errorMessage || 'Failed to create wallet'
      };
      
      this.walletRecoveryCache.set(userId, errorResult);
      return errorResult;

    } catch (error) {
      logger.error('Error creating new wallet', error, 'SimplifiedWalletService');
      
      const errorResult: WalletCreationResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.walletRecoveryCache.set(userId, errorResult);
      return errorResult;
    }
  }

  /**
   * Get user wallet balance
   */
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // First try to recover the wallet
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      
      if (!recoveryResult.success || !recoveryResult.wallet) {
        logger.warn('Cannot get balance - wallet recovery failed', { 
          userId, 
          error: recoveryResult.error 
        }, 'SimplifiedWalletService');
        return null;
      }

      return await this.getBalanceForAddress(recoveryResult.wallet.publicKey);
    } catch (error) {
      logger.error('Error getting user wallet balance', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get balance for a specific wallet address
   */
  async getBalanceForAddress(address: string): Promise<UserWalletBalance | null> {
    try {
      const publicKey = new PublicKey(address);
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const config = getConfig();
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(config.blockchain.usdcMintAddress),
          publicKey
        );
        const tokenAccount = await getAccount(this.connection, usdcTokenAddress);
        usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
        logger.debug('USDC token account not found', { address }, 'SimplifiedWalletService');
      }

      // Calculate total USD (assuming 1 USDC = 1 USD)
      const totalUSD = usdcBalance;

      const balance: UserWalletBalance = {
        solBalance: solBalanceFormatted,
        usdcBalance,
        totalUSD,
        address,
        isConnected: true
      };

      logger.debug('Wallet balance retrieved', { 
        address, 
        totalUSD, 
        usdcBalance, 
        solBalance: solBalanceFormatted 
      }, 'SimplifiedWalletService');

      return balance;

    } catch (error) {
      logger.error('Error getting user wallet balance', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(userId: string): Promise<WalletInfo | null> {
    try {
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      
      if (!recoveryResult.success || !recoveryResult.wallet) {
        return null;
      }

      return {
        address: recoveryResult.wallet.address,
        publicKey: recoveryResult.wallet.publicKey,
        secretKey: recoveryResult.wallet.privateKey,
        isConnected: true,
        walletName: 'App Wallet',
        walletType: 'recovered'
      };
    } catch (error) {
      logger.error('Error getting wallet info', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(userId: string): Promise<WalletCreationResult> {
    return this.ensureUserWallet(userId);
  }
}

// Export singleton instance
const simplifiedWalletService = new SimplifiedWalletService();

export { simplifiedWalletService };

// Export the class for type checking
export { SimplifiedWalletService };
