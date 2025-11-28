/**
 * Simplified Wallet Service
 * Clean, focused wallet service without the problematic singleton patterns
 */

import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { logger, safeLogging } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';
import { walletRecoveryService, WalletRecoveryService, WalletRecoveryError } from './walletRecoveryService';
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
  requiresUserAction?: boolean;
  requiresSeedPhraseRestore?: boolean;
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
  private walletRecoveryCache = new Map<string, WalletCreationResult>();
  private recoveryInProgress = new Set<string>();
  private balanceCache = new Map<string, { balance: UserWalletBalance; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Get connection using optimized transaction utils (with endpoint rotation)
   */
  private async getConnection(): Promise<Connection> {
    const { optimizedTransactionUtils } = await import('../../shared/transactionUtilsOptimized');
    return await optimizedTransactionUtils.getConnection();
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
        // Get user email for email-based recovery fallback
        let userEmail: string | undefined;
        try {
          const userData = await firebaseDataService.user.getCurrentUser(userId);
          userEmail = userData?.email;
        } catch (emailError) {
          logger.debug('Failed to get user email for recovery', emailError, 'SimplifiedWalletService');
        }
        
        // First, try to recover existing wallet (with email-based fallback)
        const recoveryResult = await walletRecoveryService.recoverWallet(userId, userEmail);
        
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
          logger.warn('Database wallet recovery failed, attempting comprehensive recovery', { 
            userId,
            requiresUserAction: recoveryResult.requiresUserAction,
            errorMessage: recoveryResult.errorMessage
          }, 'SimplifiedWalletService');
          
          // Try comprehensive recovery as fallback
          try {
            const { firebaseDataService } = await import('../../data/firebaseDataService');
            const userData = await firebaseDataService.user.getCurrentUser(userId);
            
            if (userData?.wallet_address) {
              logger.info('Attempting comprehensive recovery with database address', { 
                userId, 
                expectedAddress: userData.wallet_address 
              }, 'SimplifiedWalletService');
              
              // Use the comprehensive recovery method directly
              const comprehensiveResult = await WalletRecoveryService.performComprehensiveRecovery(userId, userData.wallet_address);
              
              if (comprehensiveResult.success && comprehensiveResult.wallet) {
                const result: WalletCreationResult = {
                  success: true,
                  wallet: {
                    address: comprehensiveResult.wallet.address,
                    publicKey: comprehensiveResult.wallet.publicKey,
                    secretKey: comprehensiveResult.wallet.privateKey,
                    isConnected: true,
                    walletName: 'Recovered Wallet',
                    walletType: 'recovered'
                  }
                };
                this.walletRecoveryCache.set(userId, result);
                return result;
              }
            }
          } catch (comprehensiveError) {
            logger.error('Comprehensive recovery failed', comprehensiveError, 'SimplifiedWalletService');
          }
          
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
          }
        }

        // If recovery failed for other reasons, check if this is a permanent failure
        // where wallet exists in database but was never saved to device
        const userData = await firebaseDataService.user.getCurrentUser(userId);
        const hasDatabaseWallet = !!userData?.wallet_address;
        
        if (hasDatabaseWallet && recoveryResult.error === WalletRecoveryError.DATABASE_MISMATCH) {
          // Wallet exists in database but not on device - this is a lost wallet scenario
          logger.error('Wallet exists in database but credentials were never saved to device', { 
            userId, 
            walletAddress: userData.wallet_address,
            error: recoveryResult.error,
            errorMessage: recoveryResult.errorMessage
          }, 'SimplifiedWalletService');

          return {
            success: false,
            error: recoveryResult.errorMessage || 'Wallet credentials were never saved to this device. You will need to restore from your seed phrase. If you don\'t have your seed phrase, you may need to create a new wallet (this will create a new address and you may lose access to funds in the old wallet).',
            requiresUserAction: true,
            requiresSeedPhraseRestore: true
          };
        }

        // For other errors, try creating a new wallet
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
      logger.info('Storing wallet credentials', { 
        userId, 
        address: wallet.address,
        hasPrivateKey: !!wallet.privateKey,
        hasMnemonic: !!wallet.mnemonic
      }, 'SimplifiedWalletService');
      
      // Get user email for email-based backup storage
      let userEmail: string | undefined;
      try {
        const userData = await firebaseDataService.user.getCurrentUser(userId);
        userEmail = userData?.email;
      } catch (emailError) {
        logger.warn('Failed to get user email for backup storage', emailError, 'SimplifiedWalletService');
      }
      
      const stored = await walletRecoveryService.storeWallet(userId, {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey
      }, userEmail);

      if (!stored) {
        logger.error('Failed to store wallet in SecureStore', {
          userId,
          address: safeLogging.truncateWalletAddress(wallet.address)
        }, 'SimplifiedWalletService');
        throw new Error('Failed to store new wallet');
      }

      logger.info('Wallet stored in SecureStore successfully', { userId, address: wallet.address }, 'SimplifiedWalletService');

      // Store mnemonic
      if (wallet.mnemonic) {
        const mnemonicStored = await walletRecoveryService.storeMnemonic(userId, wallet.mnemonic);
        if (mnemonicStored) {
          logger.info('Mnemonic stored successfully', { userId }, 'SimplifiedWalletService');
        } else {
          logger.warn('Failed to store mnemonic', { userId }, 'SimplifiedWalletService');
        }
      }

      // Clean up any test wallets from AsyncStorage
      await walletRecoveryService.cleanupTestWallets(userId);

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

      logger.info('Database updated with wallet info', { 
        userId, 
        address: wallet.address,
        walletStatus: 'healthy'
      }, 'SimplifiedWalletService');

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
      
      // ✅ CRITICAL: Verify the wallet was stored correctly and can be recovered
      // This ensures credentials persist across app updates
      const verificationResult = await this.verifyWalletStorage(userId, wallet.address);
      if (!verificationResult) {
        logger.error('Wallet verification failed after creation', { userId, address: wallet.address }, 'SimplifiedWalletService');
        
        // Try one more time to store the wallet
        logger.info('Retrying wallet storage after verification failure', { userId, address: wallet.address }, 'SimplifiedWalletService');
        const retryStored = await walletRecoveryService.storeWallet(userId, {
          address: wallet.address,
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey
        }, userEmail);
        
        if (retryStored) {
          const retryVerification = await this.verifyWalletStorage(userId, wallet.address);
          if (!retryVerification) {
        return {
          success: false,
              error: 'Wallet created but verification failed after retry. Please try again.'
            };
          }
        } else {
          return {
            success: false,
            error: 'Wallet created but storage failed. Please try again.'
        };
        }
      }
      
      logger.info('✅ New wallet created and verified successfully', { userId, address: wallet.address }, 'SimplifiedWalletService');
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
      const config = getConfig();
      
      // Check balance cache first
      const cachedBalance = this.balanceCache.get(userId);
      if (cachedBalance && (Date.now() - cachedBalance.timestamp) < this.CACHE_DURATION) {
        logger.debug('Using cached balance', { userId, network: config.blockchain.network }, 'SimplifiedWalletService');
        return cachedBalance.balance;
      }

      // Use ensureUserWallet which has its own caching
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        logger.warn('Cannot get balance - wallet recovery failed', { 
          userId, 
          error: walletResult.error,
          network: config.blockchain.network
        }, 'SimplifiedWalletService');
        return null;
      }

      logger.info('Getting balance for wallet', { 
        userId,
        address: walletResult.wallet.address,
        network: config.blockchain.network,
        rpcUrl: config.blockchain.rpcUrl
      }, 'SimplifiedWalletService');

      const balance = await this.getBalanceForAddress(walletResult.wallet.address);
      
      if (!balance) {
        logger.warn('Balance fetch returned null - possible network mismatch', {
          userId,
          address: walletResult.wallet.address,
          network: config.blockchain.network,
          note: 'Wallet may exist on a different network. Check Solscan to verify network.'
        }, 'SimplifiedWalletService');
      }
      
      // Cache the balance (even if null, to avoid repeated failed attempts)
      if (balance) {
        this.balanceCache.set(userId, { balance, timestamp: Date.now() });
      }
      
      return balance;
    } catch (error) {
      const config = getConfig();
      logger.error('Error getting user wallet balance', { 
        error,
        userId,
        network: config.blockchain.network,
        rpcUrl: config.blockchain.rpcUrl
      }, 'SimplifiedWalletService');
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
      const config = getConfig();
      logger.info('Fetching balance for address', { 
        address, 
        network: config.blockchain.network,
        rpcUrl: config.blockchain.rpcUrl,
        endpointCount: config.blockchain.rpcEndpoints?.length || 0
      }, 'SimplifiedWalletService');
      
      const connection = await this.getConnection();
      const publicKey = new PublicKey(address);
      
      logger.debug('Connection established', { 
        rpcEndpoint: connection.rpcEndpoint,
        commitment: (connection as any).commitment
      }, 'SimplifiedWalletService');
      
      // Get SOL balance with retry logic for rate limits and 404 errors
      let solBalance = 0;
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const currentConnection = attempt === 0 ? connection : await this.getConnection();
          logger.debug('Attempting to get balance', { 
            attempt: attempt + 1, 
            maxRetries,
            endpoint: currentConnection.rpcEndpoint,
            address 
          }, 'SimplifiedWalletService');
          
          solBalance = await currentConnection.getBalance(publicKey);
          
          logger.info('Successfully retrieved SOL balance', { 
            address, 
            solBalance, 
            solBalanceFormatted: solBalance / LAMPORTS_PER_SOL,
            attempt: attempt + 1,
            endpoint: currentConnection.rpcEndpoint
          }, 'SimplifiedWalletService');
          
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = lastError.message;
          const errorString = String(error);
          
          // Check for rate limits, 404, or network errors
          const isRateLimit = errorMessage.includes('429') || 
                             errorMessage.includes('rate limit') || 
                             errorMessage.includes('too many requests');
          const is404 = errorMessage.includes('404') || 
                       errorString.includes('404') ||
                       errorMessage.includes('failed to get balance');
          const isNetworkError = errorMessage.includes('fetch') ||
                               errorMessage.includes('network') ||
                               errorMessage.includes('ECONNREFUSED');
          
          if (isRateLimit || is404 || isNetworkError) {
            if (attempt < maxRetries - 1) {
              // Try rotating endpoint and retrying
              logger.warn('Balance fetch error, rotating endpoint and retrying', { 
                address, 
                attempt: attempt + 1,
                maxRetries,
                error: errorMessage,
                errorType: isRateLimit ? 'rate_limit' : is404 ? '404' : 'network'
              }, 'SimplifiedWalletService');
              
              try {
                const { optimizedTransactionUtils } = await import('../../shared/transactionUtilsOptimized');
                await optimizedTransactionUtils.switchToNextEndpoint();
                // Wait a bit before retry to avoid immediate rate limit
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
              } catch (rotateError) {
                logger.warn('Failed to rotate endpoint', { error: rotateError }, 'SimplifiedWalletService');
              }
              continue; // Retry with next endpoint
            } else {
              // Last attempt failed
              logger.error('Failed to get balance after all retries', { 
                address, 
                attempts: maxRetries,
                error: errorMessage,
                errorString,
                network: config.blockchain.network,
                rpcEndpoints: config.blockchain.rpcEndpoints,
                note: 'Check if wallet exists on the configured network (mainnet vs devnet)'
              }, 'SimplifiedWalletService');
              
              // Don't throw - return null so UI can handle gracefully
              // The wallet might exist on a different network than configured
              return null;
            }
          } else {
            // Not a retryable error, throw immediately
            throw error;
          }
        }
      }
      
      if (lastError && solBalance === 0) {
        // If we still have an error and balance is 0, it might be a real 0 balance
        // But log it for debugging
        logger.warn('Balance fetch completed with 0, may be actual balance or error', { 
          address,
          error: lastError.message 
        }, 'SimplifiedWalletService');
      }
      
      const solBalanceFormatted = solBalance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const config = getConfig();
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(config.blockchain.usdcMintAddress),
          publicKey
        );
        const tokenAccount = await getAccount(connection, usdcTokenAddress);
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
   * Emergency recovery for lost funds - attempts to recover original wallet
   */
  async emergencyFundRecovery(userId: string, originalAddress: string): Promise<WalletCreationResult> {
    try {
      logger.error('🚨 EMERGENCY FUND RECOVERY REQUESTED', { 
        userId, 
        originalAddress,
        warning: 'Attempting to recover lost funds'
      }, 'SimplifiedWalletService');
      
      const result = await WalletRecoveryService.emergencyFundRecovery(userId, originalAddress);
      
      if (result.success && result.wallet) {
        const walletResult: WalletCreationResult = {
          success: true,
          wallet: {
            address: result.wallet.address,
            publicKey: result.wallet.publicKey,
            secretKey: result.wallet.privateKey,
            isConnected: true,
            walletName: 'Recovered Original Wallet',
            walletType: 'emergency_recovered'
          }
        };
        
        this.walletRecoveryCache.set(userId, walletResult);
        logger.info('✅ EMERGENCY RECOVERY SUCCESSFUL - Funds recovered!', { 
          userId, 
          address: result.wallet.address,
          originalAddress
        }, 'SimplifiedWalletService');
        
        return walletResult;
      } else {
        logger.error('❌ EMERGENCY RECOVERY FAILED', { 
          userId, 
          originalAddress,
          error: result.errorMessage
        }, 'SimplifiedWalletService');
        
        return {
          success: false,
          error: result.errorMessage || 'Emergency recovery failed - funds may be permanently lost'
        };
      }
    } catch (error) {
      logger.error('Emergency fund recovery error', error, 'SimplifiedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during emergency recovery'
      };
    }
  }

  /**
   * Restore wallet from seed phrase when recovery failed
   */
  async restoreWalletFromSeedPhrase(userId: string, seedPhrase: string, expectedAddress?: string): Promise<WalletCreationResult> {
    try {
      logger.info('Restoring wallet from seed phrase', { userId, expectedAddress }, 'SimplifiedWalletService');
      
      const result = await walletRecoveryService.restoreWalletFromSeedPhrase(userId, seedPhrase, expectedAddress);
      
      if (result.success && result.wallet) {
        const walletResult: WalletCreationResult = {
          success: true,
          wallet: {
            address: result.wallet.address,
            publicKey: result.wallet.publicKey,
            secretKey: result.wallet.privateKey,
            isConnected: true,
            walletName: 'Restored Wallet',
            walletType: 'restored'
          }
        };
        
        this.walletRecoveryCache.set(userId, walletResult);
        logger.info('Wallet restored from seed phrase successfully', { 
          userId, 
          address: result.wallet.address 
        }, 'SimplifiedWalletService');
        
        return walletResult;
      } else {
        return {
          success: false,
          error: result.errorMessage || 'Failed to restore wallet from seed phrase'
        };
      }
    } catch (error) {
      logger.error('Error restoring wallet from seed phrase', error, 'SimplifiedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Recover wallet from address (used during authentication)
   */
  async recoverWalletFromAddress(userId: string, expectedAddress: string): Promise<WalletCreationResult> {
    try {
      logger.info('Recovering wallet from address', { userId, expectedAddress }, 'SimplifiedWalletService');
      
      // Use the comprehensive recovery method
      const recoveryResult = await WalletRecoveryService.performComprehensiveRecovery(userId, expectedAddress);
      
      if (recoveryResult.success && recoveryResult.wallet) {
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
        logger.info('Wallet recovered from address successfully', { 
          userId, 
          address: recoveryResult.wallet.address 
        }, 'SimplifiedWalletService');
        
        return result;
      } else {
        logger.warn('Failed to recover wallet from address', { 
          userId, 
          expectedAddress,
          error: recoveryResult.errorMessage
        }, 'SimplifiedWalletService');
        
        return {
          success: false,
          error: recoveryResult.errorMessage || 'Failed to recover wallet'
        };
      }
    } catch (error) {
      logger.error('Error recovering wallet from address', error, 'SimplifiedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify that wallet was stored correctly
   */
  private async verifyWalletStorage(userId: string, expectedAddress: string): Promise<boolean> {
    try {
      logger.debug('Verifying wallet storage', { userId, expectedAddress }, 'SimplifiedWalletService');
      
      // Try to recover the wallet we just created
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      
      if (recoveryResult.success && recoveryResult.wallet) {
        const matches = recoveryResult.wallet.address === expectedAddress;
        logger.debug('Wallet verification result', { 
          userId, 
          expectedAddress, 
          recoveredAddress: recoveryResult.wallet.address,
          matches
        }, 'SimplifiedWalletService');
        return matches;
      }
      
      logger.warn('Wallet verification failed - could not recover wallet', { userId, expectedAddress }, 'SimplifiedWalletService');
      return false;
    } catch (error) {
      logger.error('Error verifying wallet storage', error, 'SimplifiedWalletService');
      return false;
    }
  }

  /**
   * Check if user has a wallet stored on this device
   */
  async hasWalletOnDevice(userId: string): Promise<boolean> {
    try {
      logger.debug('Checking if user has wallet on device', { userId }, 'SimplifiedWalletService');
      
      // Try to get stored wallets
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      
      if (storedWallets.length > 0) {
        logger.debug('Found stored wallets on device', { 
          userId, 
          count: storedWallets.length,
          addresses: storedWallets.map(w => w.address)
        }, 'SimplifiedWalletService');
        return true;
      }
      
      // Check for mnemonic
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      if (mnemonic) {
        logger.debug('Found mnemonic on device', { userId }, 'SimplifiedWalletService');
        return true;
      }
      
      logger.debug('No wallet found on device', { userId }, 'SimplifiedWalletService');
      return false;
    } catch (error) {
      logger.error('Error checking wallet on device', error, 'SimplifiedWalletService');
      return false;
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
