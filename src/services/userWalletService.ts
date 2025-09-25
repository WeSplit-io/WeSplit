/**
 * Simplified User Wallet Service for WeSplit
 * Clean, focused wallet management for app-generated wallets
 * Uses Helius RPCs and company-specific fees for transfers
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { firebaseDataService } from './firebaseDataService';
import { consolidatedWalletService } from './consolidatedWalletService';
import { secureStorageService } from './secureStorageService';
import { walletManagementService } from './walletManagementService';
import { logger } from './loggingService';
import * as bip39 from 'bip39';

// Import shared constants
import { RPC_CONFIG, USDC_CONFIG, WALLET_CONFIG } from './shared/walletConstants';

// Use shared constants
const RPC_ENDPOINT = RPC_CONFIG.endpoint;
const USDC_MINT_ADDRESS = USDC_CONFIG.mintAddress;

console.log('🌐 UserWalletService: Using network:', RPC_CONFIG.network);
console.log('🌐 UserWalletService: RPC endpoint:', RPC_ENDPOINT);
console.log('🌐 UserWalletService: USDC mint address:', USDC_MINT_ADDRESS);

export interface UserWalletBalance {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
    secretKey?: string;
  };
  error?: string;
}

export class UserWalletService {
  private connection: Connection;
  private lastBalanceCall: { [userId: string]: number } = {};
  private lastSuccessfulBalance: { [userId: string]: UserWalletBalance } = {};
  private readonly BALANCE_CALL_DEBOUNCE_MS = WALLET_CONFIG.balanceCallDebounce;
  
  // Prevent multiple wallet creation calls for the same user
  private walletCreationPromises: { [userId: string]: Promise<WalletCreationResult> } = {};

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
  }

  /**
   * Main method: Ensure user has a working wallet
   * This is the ONLY method that should be called for wallet management
   * CRITICAL: This method preserves existing wallets and only creates new ones when absolutely necessary
   * SYNCHRONIZED: Prevents multiple wallet creation calls for the same user
   */
  async ensureUserWallet(userId: string): Promise<WalletCreationResult> {
    // Check if there's already a wallet creation in progress for this user
    if (this.walletCreationPromises[userId] !== undefined) {
      logger.info('UserWalletService: Wallet creation already in progress, waiting for completion', { userId }, 'UserWalletService');
      return await this.walletCreationPromises[userId];
    }

    // Create a new promise for wallet creation
    const walletCreationPromise = this._ensureUserWalletInternal(userId);
    this.walletCreationPromises[userId] = walletCreationPromise;

    try {
      const result = await walletCreationPromise;
      return result;
    } finally {
      // Clean up the promise after completion
      delete this.walletCreationPromises[userId];
    }
  }

  /**
   * Internal method that actually performs the wallet creation/restoration
   */
  private async _ensureUserWalletInternal(userId: string): Promise<WalletCreationResult> {
    try {
      logger.info('UserWalletService: Ensuring wallet for user', { userId }, 'UserWalletService');

      // Get current user data
      let user;
      try {
        user = await firebaseDataService.user.getCurrentUser(userId);
        logger.info('Found user document', { userId }, 'UserWalletService');
      } catch (userError) {
        if (userError instanceof Error && userError.message.includes('User not found')) {
          logger.error('User document not found in Firestore', { userId, error: userError.message }, 'UserWalletService');
          return {
            success: false,
            error: 'User document not found in Firestore'
          };
        } else {
          throw userError;
        }
      }

      // Check if user already has a wallet address in Firebase
      const existingWalletAddress = user?.wallet_address;
      const hasValidWalletAddress = existingWalletAddress && 
                                   existingWalletAddress.trim() !== '' && 
                                   existingWalletAddress !== '11111111111111111111111111111111';
      
      logger.info('UserWalletService: Checking existing wallet', {
          userId, 
          existingWalletAddress,
        hasValidWalletAddress,
        walletPublicKey: user?.wallet_public_key
        }, 'UserWalletService');
        
      // If user has a valid wallet address in Firebase, try to restore it
      if (hasValidWalletAddress) {
        logger.info('UserWalletService: User has wallet address in Firebase, attempting to restore', {
          userId,
          walletAddress: existingWalletAddress
        }, 'UserWalletService');
        
        // Try to restore the wallet from seed phrase or private key
        const restoreResult = await this.restoreExistingWallet(userId, existingWalletAddress);
        
        if (restoreResult.success) {
          logger.info('UserWalletService: Successfully restored existing wallet', {
          userId, 
            walletAddress: existingWalletAddress
        }, 'UserWalletService');
        
          return {
            success: true,
            wallet: {
              address: existingWalletAddress,
              publicKey: user.wallet_public_key || existingWalletAddress
            }
          };
        } else {
          logger.warn('UserWalletService: Failed to restore existing wallet, will create new one', {
            userId, 
            walletAddress: existingWalletAddress,
            error: restoreResult.error
          }, 'UserWalletService');
        }
      }

      // User doesn't have a working wallet, create one
      logger.info('UserWalletService: Creating new wallet for user', { 
        userId: userId, 
        existingWalletAddress: existingWalletAddress || 'none'
      }, 'UserWalletService');

      const walletResult = await this.createWalletForUser(userId);
      
      if (walletResult.success && walletResult.wallet) {
        // Request airdrop in background for development
        if (process.env.NODE_ENV !== 'production') {
          this.requestAirdrop(walletResult.wallet.address)
            .then(() => {
              logger.info('Background airdrop successful: 1 SOL added to wallet', null, 'UserWalletService');
            })
            .catch((airdropError) => {
              logger.warn('Background airdrop failed (this is normal)', airdropError, 'UserWalletService');
            });
        }
      }

      return walletResult;
    } catch (error) {
      logger.error('Error ensuring user wallet', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure user wallet'
      };
    }
  }

  /**
   * Restore existing wallet for a user
   * This method tries to restore the wallet from stored seed phrase or private key
   */
  private async restoreExistingWallet(userId: string, walletAddress: string): Promise<WalletCreationResult> {
    try {
      logger.info('UserWalletService: Attempting to restore existing wallet', { 
        userId, 
        walletAddress 
      }, 'UserWalletService');
      
      // First, check if private key already exists in secure storage
      try {
        const existingPrivateKey = await secureStorageService.getPrivateKey(userId);
        if (existingPrivateKey) {
          logger.info('UserWalletService: Found existing private key in secure storage', { userId }, 'UserWalletService');
          
          // Verify the private key matches the wallet address
          try {
            const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(existingPrivateKey)));
            if (keypair.publicKey.toBase58() === walletAddress) {
              logger.info('UserWalletService: Private key matches wallet address, wallet restored', { 
            userId, 
                walletAddress 
      }, 'UserWalletService');

      return {
        success: true,
        wallet: {
                  address: walletAddress,
                  publicKey: walletAddress,
                  secretKey: existingPrivateKey
                }
              };
            } else {
              logger.warn('UserWalletService: Private key does not match wallet address', {
                userId,
                expectedAddress: walletAddress,
                actualAddress: keypair.publicKey.toBase58()
              }, 'UserWalletService');
            }
          } catch (keyError) {
            logger.warn('UserWalletService: Failed to parse existing private key', { userId, error: keyError }, 'UserWalletService');
          }
        }
      } catch (error) {
        logger.warn('UserWalletService: Failed to check for existing private key', { userId, error }, 'UserWalletService');
      }

      // If no private key found, try to restore from seed phrase
      try {
        const seedPhrase = await secureStorageService.getSeedPhrase(userId);
        if (seedPhrase && bip39.validateMnemonic(seedPhrase)) {
          logger.info('UserWalletService: Found valid seed phrase, attempting to restore wallet', { userId }, 'UserWalletService');
          
          // Import wallet from seed phrase
          const wallet = await consolidatedWalletService.importWallet(seedPhrase);
          
          if (wallet && wallet.address === walletAddress) {
            logger.info('UserWalletService: Successfully restored wallet from seed phrase', { 
              userId, 
              walletAddress 
      }, 'UserWalletService');
      
            // Store the private key for future use
      if (wallet.secretKey) {
        try {
          const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
                logger.info('UserWalletService: Stored private key from restored wallet', { userId }, 'UserWalletService');
        } catch (keyStorageError) {
                logger.warn('UserWalletService: Failed to store private key from restored wallet', { userId, error: keyStorageError }, 'UserWalletService');
              }
            }
            
            return {
              success: true,
              wallet: {
                address: walletAddress,
                publicKey: wallet.publicKey || walletAddress,
                secretKey: wallet.secretKey
              }
            };
          } else {
            logger.warn('UserWalletService: Seed phrase does not match wallet address', {
          userId, 
              expectedAddress: walletAddress,
              actualAddress: wallet?.address
        }, 'UserWalletService');
          }
        } else {
          logger.warn('UserWalletService: No valid seed phrase found', { userId }, 'UserWalletService');
        }
      } catch (error) {
        logger.warn('UserWalletService: Failed to restore from seed phrase', { userId, error }, 'UserWalletService');
      }

      // If we get here, we couldn't restore the wallet
      logger.warn('UserWalletService: Could not restore existing wallet, attempting to fix mismatch', { 
        userId,
        walletAddress 
      }, 'UserWalletService');

      // Try to fix the wallet mismatch
      return await this.fixWalletMismatch(userId);

    } catch (error) {
      logger.error('UserWalletService: Error restoring existing wallet', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore existing wallet'
      };
    }
  }

  /**
   * Create a new wallet for a user
   * Uses BIP39 mnemonic for compatibility with external wallets
   * CRITICAL: This method should only be called when no wallet exists
   */
  private async createWalletForUser(userId: string): Promise<WalletCreationResult> {
    try {
      logger.info('Creating new BIP39-based wallet for user', { userId }, 'UserWalletService');
      
      // Double-check that user doesn't already have a wallet
      const user = await firebaseDataService.user.getCurrentUser(userId);
      if (user?.wallet_address && user.wallet_address.trim() !== '' && user.wallet_address !== '11111111111111111111111111111111') {
        logger.warn('UserWalletService: User already has a wallet, aborting creation', { 
          userId, 
          existingWalletAddress: user.wallet_address 
        }, 'UserWalletService');
        
        return {
          success: true,
          wallet: {
            address: user.wallet_address,
            publicKey: user.wallet_public_key || user.wallet_address
          }
        };
      }
      
      // Generate a cryptographically secure mnemonic (12 words)
      const mnemonic = bip39.generateMnemonic(128);
      
      // Validate the generated mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic is invalid');
      }
      
      // Derive wallet from the mnemonic using consolidated service
      const result = await consolidatedWalletService.importWallet(mnemonic);
      const wallet = result;

      if (!wallet || !wallet.address) {
        throw new Error('Wallet creation failed - no address generated from mnemonic');
      }

      // Update user document with wallet info
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: wallet.address,
        wallet_public_key: wallet.publicKey || wallet.address
      });

      // Track wallet creation in Firebase
      await walletManagementService.trackWalletCreation(userId, wallet.address, 'app-generated');

      // Store private key in secure storage for transaction signing
      if (wallet.secretKey) {
        try {
          const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
          await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          
          await walletManagementService.trackPrivateKeyStorage(userId, true);
          
          logger.info('Private key stored securely for user', { 
            userId, 
            walletAddress: wallet.address 
          }, 'UserWalletService');
        } catch (keyStorageError) {
          logger.error('Failed to store private key for user', keyStorageError, 'UserWalletService');
        }
      }

      // Store the mnemonic that was used to generate this wallet
      try {
        await secureStorageService.storeSeedPhrase(userId, mnemonic);
        await walletManagementService.trackSeedPhraseStorage(userId, true);
        
        logger.info('Seed phrase stored securely for user', { 
          userId, 
          walletAddress: wallet.address 
        }, 'UserWalletService');
      } catch (seedError) {
        logger.warn('Failed to store seed phrase for user', seedError, 'UserWalletService');
      }

      logger.info('Wallet creation completed successfully', {
        userId,
        walletAddress: wallet.address,
        hasPrivateKey: !!wallet.secretKey,
        hasSeedPhrase: true
      }, 'UserWalletService');

      return {
        success: true,
        wallet: {
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.address,
          secretKey: wallet.secretKey
        }
      };
    } catch (error) {
      logger.error('Error creating wallet for user', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  }

  /**
   * Get user's wallet balance
   * Includes rate limiting protection and caching
   */
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // Check debounce - prevent rapid successive calls
      const now = Date.now();
      const lastCall = this.lastBalanceCall[userId] || 0;
      const hasRecentSuccessfulCall = this.lastSuccessfulBalance[userId] && (now - lastCall < this.BALANCE_CALL_DEBOUNCE_MS);
      
      if (hasRecentSuccessfulCall) {
        console.log('🔄 UserWalletService: Debouncing balance call for user (returning cached):', userId);
        return this.lastSuccessfulBalance[userId];
      }
      
      // Update last call time
      this.lastBalanceCall[userId] = now;
      
      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        logger.error('Failed to ensure wallet for balance check', { 
          userId, 
          success: walletResult.success, 
          error: walletResult.error 
        }, 'UserWalletService');
        return null;
      }

      const walletAddress = walletResult.wallet.address;

      // Get SOL balance with rate limiting protection
      let solBalanceInSol = 0;
      try {
        const publicKey = new PublicKey(walletAddress);
        const solBalance = await this.connection.getBalance(publicKey);
        solBalanceInSol = solBalance / LAMPORTS_PER_SOL;
        
        logger.info('SOL balance fetched successfully', { 
          walletAddress, 
          solBalanceLamports: solBalance,
          solBalanceSOL: solBalanceInSol
        }, 'UserWalletService');
      } catch (error) {
        logger.error('Error fetching SOL balance', error, 'UserWalletService');
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limited when fetching SOL balance, using cached value');
          return {
            solBalance: 0,
            usdcBalance: 0,
            totalUSD: 0,
            address: walletAddress,
            isConnected: true
          };
        }
        throw error;
      }

      // Get USDC balance with rate limiting protection
      let usdcBalance = 0;
      try {
        const usdcMint = new PublicKey(USDC_MINT_ADDRESS);
        const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(walletAddress));
        
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
        
        logger.info('USDC balance fetched successfully', { 
          walletAddress, 
          usdcBalanceRaw: accountInfo.amount.toString(),
          usdcBalance: usdcBalance
        }, 'UserWalletService');
      } catch (error) {
        logger.warn('USDC balance fetch failed (token account may not exist)', error, 'UserWalletService');
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limited when fetching USDC balance, using 0');
          usdcBalance = 0;
        } else if (error instanceof Error && error.message.includes('TokenAccountNotFoundError')) {
          console.log('💰 UserWalletService: USDC token account not found for wallet (normal for new wallets)');
          usdcBalance = 0;
        } else {
          console.warn('Error fetching USDC balance:', error);
          usdcBalance = 0;
        }
      }

      // Calculate total USD value (simplified conversion)
      const solToUSD = 200; // Approximate SOL to USD rate
      const totalUSD = (solBalanceInSol * solToUSD) + usdcBalance;

      const balance = {
        solBalance: solBalanceInSol,
        usdcBalance,
        totalUSD: totalUSD || 0,
        address: walletAddress,
        isConnected: true
      };

      logger.info('Balance calculation completed', { 
        userId,
        walletAddress,
        solBalance: solBalanceInSol,
        usdcBalance: usdcBalance,
        totalUSD: totalUSD,
        solToUSDRate: solToUSD
      }, 'UserWalletService');

      // Cache the successful balance
      this.lastSuccessfulBalance[userId] = balance;
      
      return balance;

    } catch (error) {
      // Handle rate limiting at the top level
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Rate limited when fetching wallet balance');
        return {
          solBalance: 0,
          usdcBalance: 0,
          totalUSD: 0,
          address: '',
          isConnected: false
        };
      }
      console.error('Error fetching user wallet balance:', error);
      return null;
    }
  }

  /**
   * Request airdrop for development
   */
  private async requestAirdrop(walletAddress: string, amount: number = 1): Promise<void> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const signature = await this.connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
      await this.connection.confirmTransaction(signature);
      
      logger.info('Airdrop successful', { signature }, 'UserWalletService');
                  } catch (error) {
      logger.warn('Airdrop failed (this is normal in production)', error, 'UserWalletService');
      throw error;
    }
  }

  /**
   * Clear balance cache for a user
   */
  async clearBalanceCache(userId: string): Promise<void> {
    try {
      delete this.lastSuccessfulBalance[userId];
      delete this.lastBalanceCall[userId];
      
      logger.info('Balance cache cleared for user', { userId }, 'UserWalletService');
    } catch (error) {
      logger.error('Failed to clear balance cache', error, 'UserWalletService');
    }
  }

  /**
   * Force refresh balance from blockchain (bypasses cache)
   */
  async forceRefreshBalance(userId: string): Promise<UserWalletBalance | null> {
    try {
      // Clear cache first
      await this.clearBalanceCache(userId);
      
      // Get fresh balance
      const balance = await this.getUserWalletBalance(userId);
      
      logger.info('Balance force refreshed for user', { 
        userId, 
        balance: balance ? `${balance.usdcBalance} USDC, ${balance.solBalance} SOL` : 'null'
      }, 'UserWalletService');
      
      return balance;
    } catch (error) {
      logger.error('Failed to force refresh balance', error, 'UserWalletService');
      return null;
    }
  }

  /**
   * Clear all balance cache (used during app reset)
   */
  clearAllBalanceCache(): void {
    try {
      if (__DEV__) { console.log('🔄 UserWalletService: Clearing all balance cache'); }
      
      this.lastBalanceCall = {};
      this.lastSuccessfulBalance = {};
      
      if (__DEV__) { console.log('✅ UserWalletService: All balance cache cleared'); }
    } catch (error) {
      console.error('❌ Error clearing all balance cache:', error);
    }
  }

  /**
   * Clear wallet creation state for a user (used when user logs out)
   */
  clearWalletCreationState(userId: string): void {
    try {
      if (this.walletCreationPromises[userId] !== undefined) {
        delete this.walletCreationPromises[userId];
        logger.info('UserWalletService: Cleared wallet creation state for user', { userId }, 'UserWalletService');
      }
    } catch (error) {
      logger.error('UserWalletService: Error clearing wallet creation state', { userId, error }, 'UserWalletService');
    }
  }

  /**
   * Clear all wallet data for a user (used when switching users)
   * This ensures each user gets their own wallet
   */
  async clearWalletDataForUser(userId: string): Promise<void> {
    try {
      logger.info('UserWalletService: Clearing wallet data for user', { userId }, 'UserWalletService');

      // Clear wallet creation state
      this.clearWalletCreationState(userId);

      // Clear balance cache
      this.clearBalanceCache(userId);

      // Clear secure storage wallet data
      await secureStorageService.clearWalletDataForUser(userId);

      logger.info('UserWalletService: Successfully cleared wallet data for user', { userId }, 'UserWalletService');
    } catch (error) {
      logger.error('UserWalletService: Error clearing wallet data for user', { userId, error }, 'UserWalletService');
      throw error;
    }
  }

  /**
   * Fix wallet mismatch issue for a user
   * This method resolves the situation where Firebase has one wallet address but secure storage has different credentials
   */
  async fixWalletMismatch(userId: string): Promise<WalletCreationResult> {
    try {
      logger.info('UserWalletService: Fixing wallet mismatch for user', { userId }, 'UserWalletService');

      // Get current user data
      const user = await firebaseDataService.user.getCurrentUser(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const firebaseWalletAddress = user.wallet_address;
      
      // Check what we have in secure storage
      let privateKey: string | null = null;
      let seedPhrase: string | null = null;
      
      try {
        privateKey = await secureStorageService.getPrivateKey(userId);
      } catch (error) {
        logger.warn('UserWalletService: No private key found in secure storage', { userId }, 'UserWalletService');
      }
      
      try {
        seedPhrase = await secureStorageService.getSeedPhrase(userId);
      } catch (error) {
        logger.warn('UserWalletService: No seed phrase found in secure storage', { userId }, 'UserWalletService');
      }

      // If we have a seed phrase, use it to determine the correct wallet
      if (seedPhrase && bip39.validateMnemonic(seedPhrase)) {
        logger.info('UserWalletService: Using seed phrase to determine correct wallet', { userId }, 'UserWalletService');
        
        const wallet = await consolidatedWalletService.importWallet(seedPhrase);
        if (wallet && wallet.address) {
          // Update Firebase with the correct wallet address
        await firebaseDataService.user.updateUser(userId, {
            wallet_address: wallet.address,
            wallet_public_key: wallet.publicKey || wallet.address
          });
          
          // Store the private key if we don't have it
          if (!privateKey && wallet.secretKey) {
            const secretKeyArray = Array.from(new Uint8Array(Buffer.from(wallet.secretKey, 'base64')));
            await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
          }
          
          logger.info('UserWalletService: Fixed wallet mismatch using seed phrase', { 
          userId, 
            correctWalletAddress: wallet.address 
        }, 'UserWalletService');
        
          return {
            success: true,
            wallet: {
              address: wallet.address,
              publicKey: wallet.publicKey || wallet.address,
              secretKey: wallet.secretKey
            }
          };
        }
      }

      // If we have a private key, use it to determine the correct wallet
      if (privateKey) {
        try {
          const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)));
          const correctAddress = keypair.publicKey.toBase58();
          
          // Update Firebase with the correct wallet address
          await firebaseDataService.user.updateUser(userId, {
            wallet_address: correctAddress,
            wallet_public_key: correctAddress
          });
          
          logger.info('UserWalletService: Fixed wallet mismatch using private key', { 
            userId, 
            correctWalletAddress: correctAddress 
          }, 'UserWalletService');
          
          return {
            success: true,
            wallet: {
              address: correctAddress,
              publicKey: correctAddress,
              secretKey: privateKey
            }
          };
        } catch (error) {
          logger.warn('UserWalletService: Failed to parse private key', { userId, error }, 'UserWalletService');
        }
      }

      // If we can't fix the mismatch, create a new wallet
      logger.warn('UserWalletService: Cannot fix wallet mismatch, creating new wallet', { userId }, 'UserWalletService');
      
      // Clear the mismatched data
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: '',
        wallet_public_key: ''
      });
      
      // Create a new wallet
      return await this.createWalletForUser(userId);

    } catch (error) {
      logger.error('UserWalletService: Error fixing wallet mismatch', error, 'UserWalletService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fix wallet mismatch'
      };
    }
  }

  /**
   * Export wallet information for user (seed phrase and private key)
   * This allows users to backup their wallet or export it to external wallets
   */
  async exportWallet(userId: string): Promise<{
    success: boolean;
    walletAddress?: string;
    seedPhrase?: string;
    privateKey?: string;
    error?: string;
  }> {
    try {
      logger.info('UserWalletService: Exporting wallet for user', { userId }, 'UserWalletService');

      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Failed to ensure user wallet'
        };
      }

      const walletAddress = walletResult.wallet.address;

      // Get seed phrase from secure storage
      let seedPhrase: string | null = null;
      try {
        seedPhrase = await secureStorageService.getSeedPhrase(userId);
        if (!seedPhrase) {
          logger.warn('UserWalletService: No seed phrase found for wallet export', { userId }, 'UserWalletService');
      }
    } catch (error) {
        logger.warn('UserWalletService: Failed to get seed phrase for export', { userId, error }, 'UserWalletService');
      }

      // Get private key from secure storage
      let privateKey: string | null = null;
      try {
        const privateKeyData = await secureStorageService.getPrivateKey(userId);
        if (privateKeyData) {
          // Convert from JSON array format to base64
          const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKeyData)));
          privateKey = Buffer.from(keypair.secretKey).toString('base64');
        } else {
          logger.warn('UserWalletService: No private key found for wallet export', { userId }, 'UserWalletService');
        }
      } catch (error) {
        logger.warn('UserWalletService: Failed to get private key for export', { userId, error }, 'UserWalletService');
      }

      if (!seedPhrase && !privateKey) {
        return {
          success: false,
          error: 'No wallet credentials found. Please contact support.'
        };
      }

      logger.info('UserWalletService: Successfully exported wallet', {
        userId,
        walletAddress,
        hasSeedPhrase: !!seedPhrase,
        hasPrivateKey: !!privateKey
      }, 'UserWalletService');

      return {
        success: true,
        walletAddress,
        seedPhrase: seedPhrase || undefined,
        privateKey: privateKey || undefined
      };

    } catch (error) {
      logger.error('UserWalletService: Error exporting wallet', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export wallet'
      };
    }
  }

  /**
   * Get wallet information for display purposes
   * Returns wallet address and balance without exposing sensitive data
   */
  async getWalletInfo(userId: string): Promise<{
    success: boolean;
    walletAddress?: string;
    balance?: UserWalletBalance;
    error?: string;
  }> {
    try {
      logger.info('UserWalletService: Getting wallet info for user', { userId }, 'UserWalletService');

      // First ensure user has a wallet
      const walletResult = await this.ensureUserWallet(userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Failed to ensure user wallet'
        };
      }

      // Get wallet balance
      const balance = await this.getUserWalletBalance(userId);
      
      return {
        success: true,
        walletAddress: walletResult.wallet.address,
        balance: balance || undefined
      };
      
    } catch (error) {
      logger.error('UserWalletService: Error getting wallet info', error, 'UserWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get wallet info'
      };
    }
  }
}

// Create singleton instance
export const userWalletService = new UserWalletService(); 