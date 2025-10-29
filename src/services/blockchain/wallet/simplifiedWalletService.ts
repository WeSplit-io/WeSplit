/**
 * Simplified Wallet Service
 * Clean, focused wallet service without the problematic singleton patterns
 */

import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';
import { walletRecoveryService, WalletRecoveryError } from './walletRecoveryService';
import { walletExportService } from './walletExportService';
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
  private balanceCache = new Map<string, { balance: UserWalletBalance; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

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
   * Check if we have a cached wallet result
   */
  private getCachedWallet(userId: string): WalletCreationResult | null {
    const cached = this.walletRecoveryCache.get(userId);
    if (cached) {
      logger.debug('Using cached wallet result', { userId }, 'SimplifiedWalletService');
      return cached;
    }
    return null;
  }

  /**
   * Ensure user has a wallet - either recover existing or create new
   */
  async ensureUserWallet(userId: string, expectedWalletAddress?: string): Promise<WalletCreationResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Ensuring user wallet', { userId, expectedWalletAddress }, 'SimplifiedWalletService');

      // Check cache first - this is the key optimization
      const cachedResult = this.getCachedWallet(userId);
      if (cachedResult) {
        return cachedResult;
      }

      // Prevent concurrent recovery attempts
      if (this.recoveryInProgress.has(userId)) {
        logger.debug('Recovery already in progress, waiting', { userId }, 'SimplifiedWalletService');
        const waitResult = await this.waitForRecovery(userId);
        if (waitResult) {
          return waitResult;
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
      logger.info('Creating new wallet', { userId }, 'SimplifiedWalletService');

      // Generate new wallet using the derive utility
      const { generateWalletFromMnemonic } = await import('./derive');
      const walletResult = generateWalletFromMnemonic();

      const wallet = {
        address: walletResult.address,
        publicKey: walletResult.publicKey,
        privateKey: walletResult.secretKey,
        mnemonic: walletResult.mnemonic
      };

      // Store wallet using recovery service
      const stored = await walletRecoveryService.storeWallet(userId, {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey
      });

      if (!stored) {
        throw new Error('Failed to store new wallet');
      }

      // Store mnemonic
      if (wallet.mnemonic) {
        await walletRecoveryService.storeMnemonic(userId, wallet.mnemonic);
      }

      // Update database
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey,
        wallet_created_at: new Date().toISOString(),
        wallet_status: 'healthy',
        wallet_has_private_key: true,
        wallet_has_seed_phrase: true,
        wallet_type: 'app-generated'
      });

      const result: WalletCreationResult = {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey,
          secretKey: wallet.privateKey,
          isConnected: true,
          walletName: 'App Wallet',
          walletType: 'app-generated'
        },
        mnemonic: wallet.mnemonic
      };

      this.walletRecoveryCache.set(userId, result);
      logger.info('New wallet created successfully', { userId, address: wallet.address }, 'SimplifiedWalletService');
      return result;

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
   * Get user wallet balance with caching
   */
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // Check balance cache first
      const cachedBalance = this.balanceCache.get(userId);
      if (cachedBalance && (Date.now() - cachedBalance.timestamp) < this.CACHE_DURATION) {
        logger.debug('Using cached balance', { userId }, 'SimplifiedWalletService');
        return cachedBalance.balance;
      }

      // Use ensureUserWallet which has its own caching
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        logger.warn('Cannot get balance - wallet recovery failed', { 
          userId, 
          error: walletResult.error 
        }, 'SimplifiedWalletService');
        return null;
      }

      const balance = await this.getBalanceForAddress(walletResult.wallet.address);
      
      // Cache the balance
      if (balance) {
        this.balanceCache.set(userId, { balance, timestamp: Date.now() });
      }
      
      return balance;
    } catch (error) {
      logger.error('Error getting user wallet balance', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Clear cache for a specific user (useful after transactions)
   */
  clearUserCache(userId: string): void {
    this.walletRecoveryCache.delete(userId);
    this.balanceCache.delete(userId);
    logger.debug('Cleared cache for user', { userId }, 'SimplifiedWalletService');
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.walletRecoveryCache.clear();
    this.balanceCache.clear();
    logger.debug('Cleared all caches', {}, 'SimplifiedWalletService');
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

  /**
   * Initialize secure wallet - ensures user has a wallet and returns address info
   */
  async initializeSecureWallet(userId: string): Promise<{ address: string; isNew: boolean }> {
    try {
      logger.info('Initializing secure wallet', { userId }, 'SimplifiedWalletService');
      
      // Check if wallet already exists
      const existingWallet = await this.getWalletInfo(userId);
      if (existingWallet) {
        logger.info('Existing wallet found', { userId, address: existingWallet.address }, 'SimplifiedWalletService');
        return { address: existingWallet.address, isNew: false };
      }

      // Create new wallet
      const walletResult = await this.ensureUserWallet(userId);
      if (walletResult.success && walletResult.wallet) {
        logger.info('New wallet created', { userId, address: walletResult.wallet.address }, 'SimplifiedWalletService');
        return { address: walletResult.wallet.address, isNew: true };
      }

      throw new Error('Failed to create wallet');
    } catch (error) {
      logger.error('Failed to initialize secure wallet', error, 'SimplifiedWalletService');
      throw error;
    }
  }

  /**
   * Get seed phrase for a user's wallet
   */
  async getSeedPhrase(userId: string): Promise<string | null> {
    try {
      logger.info('Retrieving seed phrase', { userId }, 'SimplifiedWalletService');
      
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      if (mnemonic) {
        logger.info('Seed phrase retrieved successfully', { userId }, 'SimplifiedWalletService');
        return mnemonic;
      }

      logger.warn('No seed phrase found for user', { userId }, 'SimplifiedWalletService');
      return null;
    } catch (error) {
      logger.error('Failed to get seed phrase', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get seed phrase for a specific wallet address
   * Delegates to the consolidated wallet export service
   */
  async getSeedPhraseForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      const result = await walletExportService.exportWallet(userId, walletAddress, {
        includeSeedPhrase: true,
        includePrivateKey: false
      });
      
      return result.seedPhrase || null;
    } catch (error) {
      logger.error('Failed to get seed phrase for wallet', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get private key for a user's wallet
   */
  async getPrivateKey(userId: string): Promise<string | null> {
    try {
      logger.info('Retrieving private key', { userId }, 'SimplifiedWalletService');
      
      const walletInfo = await this.getWalletInfo(userId);
      if (walletInfo && walletInfo.secretKey) {
        logger.info('Private key retrieved successfully', { userId }, 'SimplifiedWalletService');
        return walletInfo.secretKey;
      }

      logger.warn('No private key found for user', { userId }, 'SimplifiedWalletService');
      return null;
    } catch (error) {
      logger.error('Failed to get private key', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get private key for a specific wallet address
   * Delegates to the consolidated wallet export service
   */
  async getPrivateKeyForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      const result = await walletExportService.exportWallet(userId, walletAddress, {
        includeSeedPhrase: false,
        includePrivateKey: true
      });
      
      return result.privateKey || null;
    } catch (error) {
      logger.error('Failed to get private key for wallet', error, 'SimplifiedWalletService');
      return null;
    }
  }

  /**
   * Get export instructions for external wallets
   * Delegates to the consolidated wallet export service
   */
  getExportInstructions(): string {
    // Use the consolidated export service for instructions
    return walletExportService.getExportInstructions();
  }
}

// Export singleton instance
const simplifiedWalletService = new SimplifiedWalletService();

export { simplifiedWalletService };

// Export the class for type checking
export { SimplifiedWalletService };
