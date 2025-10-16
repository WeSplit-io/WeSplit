/**
 * Unified Wallet Service for WeSplit
 * Consolidates all wallet functionality into a single, comprehensive service
 * Replaces: consolidatedWalletService, userWalletService, walletManagementService, 
 *          walletRecoveryService, walletBackupService, walletLinkingService,
 *          secureStorageService, secureSeedPhraseService, bip39WalletService,
 *          phantomWalletLinkingService, linkedWalletsService, multiSigService,
 *          legacyWalletRecoveryService, phoneWalletAnalysisService,
 *          splitWalletMigrationService, walletLogoService, walletErrorHandler
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import * as bip39 from 'bip39';
import * as ed25519HdKey from 'ed25519-hd-key';
import * as SecureStore from 'expo-secure-store';
import { logger } from './loggingService';
import { firebaseDataService } from './firebaseDataService';
import { transactionUtils } from './shared/transactionUtils';
import { balanceUtils } from './shared/balanceUtils';
import { getConfig } from '../config/unified';
import { keypairUtils } from './shared/keypairUtils';
import { validationUtils } from './shared/validationUtils';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RPC_CONFIG, USDC_CONFIG, WALLET_CONFIG } from './shared/walletConstants';
import { WalletInfo, UserWalletBalance } from '../types/unified';

// Re-export types for backward compatibility
export type { WalletInfo, UserWalletBalance };

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

export interface WalletStatusReport {
  userId: string;
  walletAddress: string;
  status: 'healthy' | 'needs_fix' | 'no_wallet' | 'fixing' | 'error';
  hasPrivateKey: boolean;
  hasSeedPhrase: boolean;
  walletType: 'app-generated' | 'external' | 'migrated';
  lastChecked: string;
  issues: string[];
  recommendations: string[];
}

export interface WalletLink {
  id: string;
  userId: string;
  walletAddress: string;
  walletType: 'phantom' | 'solflare' | 'backpack' | 'external';
  isActive: boolean;
  linkedAt: string;
  lastUsed: string;
}

class WalletService {
  private static instance: WalletService;
  private currentWallet: WalletInfo | null = null;
  private lastBalanceCall: { [userId: string]: number } = {};
  private lastSuccessfulBalance: { [userId: string]: UserWalletBalance } = {};
  private readonly BALANCE_CALL_DEBOUNCE_MS = WALLET_CONFIG.balanceCallDebounce;
  private walletCreationPromises: { [userId: string]: Promise<WalletCreationResult> } = {};
  private restoredWallets: { [userId: string]: { wallet: any; timestamp: number } } = {};
  private readonly WALLET_CACHE_DURATION_MS = 30000; // 30 seconds

  private constructor() {
    logger.info('WalletService initialized', {}, 'WalletService');
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: string): Promise<WalletCreationResult> {
    try {
      // Check if wallet creation is already in progress
      const existingPromise = this.walletCreationPromises[userId];
      if (existingPromise) {
        return await existingPromise;
      }

      this.walletCreationPromises[userId] = this.performWalletCreation(userId);
      const result = await this.walletCreationPromises[userId];
      delete this.walletCreationPromises[userId];

      return result;
    } catch (error) {
      delete this.walletCreationPromises[userId];
      logger.error('Failed to create wallet', error, 'WalletService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create wallet' 
      };
    }
  }

  /**
   * Perform the actual wallet creation
   */
  private async performWalletCreation(userId: string): Promise<WalletCreationResult> {
    try {
      // Check if wallet already exists for this user
      const existingWallet = await this.getUserWallet(userId);
      if (existingWallet) {
        logger.info('Wallet already exists for user, returning existing wallet', { userId, address: existingWallet.address }, 'WalletService');
        return {
          success: true,
          wallet: existingWallet
        };
      }

      logger.info('Creating new wallet for user', { userId }, 'WalletService');

      // Generate mnemonic
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive keypair
      const derivedSeed = ed25519HdKey.derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);

      const walletInfo: WalletInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: keypairUtils.keypairToBase64(keypair),
        walletName: 'App Generated Wallet',
        walletType: 'app-generated',
        isConnected: true
      };

      // Store wallet securely
      await this.storeWalletSecurely(userId, walletInfo, mnemonic);

      // Log wallet creation event
      await this.logWalletEvent({
        userId,
        eventType: 'wallet_created',
        eventData: {
          walletAddress: walletInfo.address,
          walletType: 'app-generated'
        },
        timestamp: new Date().toISOString(),
        success: true
      });

      logger.info('Wallet created successfully', {
        userId,
        address: walletInfo.address
      }, 'WalletService');

      return {
        success: true,
        wallet: walletInfo,
        mnemonic
      };
    } catch (error) {
      logger.error('Failed to perform wallet creation', error, 'WalletService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create wallet' 
      };
    }
  }

  /**
   * Ensure user has a wallet (create if doesn't exist)
   */
  async ensureUserWallet(userId: string): Promise<WalletCreationResult> {
    try {
      // Check if user already has a wallet
      const existingWallet = await this.getUserWallet(userId);
      if (existingWallet) {
        return {
          success: true,
          wallet: existingWallet
        };
      }

      // Create new wallet
      return await this.createWallet(userId);
    } catch (error) {
      logger.error('Failed to ensure user wallet', error, 'WalletService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to ensure user wallet' 
      };
    }
  }

  /**
   * Get user's wallet information
   */
  async getUserWallet(userId: string): Promise<WalletInfo | null> {
    try {
      // Check cache first
      const cached = this.getCachedWallet(userId);
      if (cached) {
        return cached;
      }

      // Try to restore from secure storage
      const walletData = await this.restoreWalletFromStorage(userId);
      if (walletData) {
        this.cacheWallet(userId, walletData);
        return walletData;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get user wallet', error, 'WalletService');
      return null;
    }
  }

  /**
   * Check if wallet exists on device (in secure storage - both old and new formats)
   */
  async hasWalletOnDevice(userId: string): Promise<boolean> {
    try {
      logger.info('Checking if wallet exists on device', { userId }, 'WalletService');
      
      // Get user's expected wallet address
      const expectedWalletAddress = await this.getUserExpectedWalletAddress(userId);
      
      // For users with expected wallet address, prioritize old format
      if (expectedWalletAddress) {
        const hasOldFormat = await this.hasOldFormatWallet(userId);
        if (hasOldFormat) {
          logger.info('Found old format wallet for user with expected address', { userId }, 'WalletService');
          return true;
        }
      }
      
      // Check new format
      const hasNewFormat = await this.hasNewFormatWallet(userId);
      if (hasNewFormat) {
        logger.info('Found new format wallet', { userId }, 'WalletService');
        return true;
      }
      
      // Check old format (fallback)
      const hasOldFormat = await this.hasOldFormatWallet(userId);
      if (hasOldFormat) {
        logger.info('Found old format wallet (fallback)', { userId }, 'WalletService');
        return true;
      }
      
      logger.info('No wallet found in any format', { userId }, 'WalletService');
      return false;
    } catch (error) {
      logger.error('Failed to check if wallet exists on device', error, 'WalletService');
      return false;
    }
  }

  /**
   * Check if user has old format wallet
   */
  private async hasOldFormatWallet(userId: string): Promise<boolean> {
    try {
      const [oldPrivateKey, oldSeedPhrase] = await Promise.all([
        this.getOldFormatSecureData(`private_key_${userId}`),
        this.getOldFormatSecureData(`seed_phrase_${userId}`)
      ]);
      return !!(oldPrivateKey || oldSeedPhrase);
    } catch (error) {
      logger.error('Failed to check old format wallet', error, 'WalletService');
      return false;
    }
  }

  /**
   * Check if user has new format wallet
   */
  private async hasNewFormatWallet(userId: string): Promise<boolean> {
    try {
      const walletData = await this.getSecureData(`wallet_${userId}`);
      return !!walletData;
    } catch (error) {
      logger.error('Failed to check new format wallet', error, 'WalletService');
      return false;
    }
  }

  /**
   * Check if user has both old and new format wallets
   */
  async hasBothFormatWallets(userId: string): Promise<{ 
    hasOldFormat: boolean; 
    hasNewFormat: boolean; 
    oldFormatAddress?: string; 
    newFormatAddress?: string; 
    conflict: boolean;
  }> {
    try {
      // Check both formats in parallel
      const [hasNewFormat, hasOldFormat, newFormatWallet, oldFormatWallet] = await Promise.all([
        this.hasNewFormatWallet(userId),
        this.hasOldFormatWallet(userId),
        this.getNewFormatWallet(userId),
        this.tryRestoreFromOldFormat(userId)
      ]);
      
      const newFormatAddress = newFormatWallet?.address;
      const oldFormatAddress = oldFormatWallet?.address;
      const conflict = hasOldFormat && hasNewFormat && oldFormatAddress !== newFormatAddress;
      
      logger.info('Wallet format check result', { 
        userId, 
        hasOldFormat, 
        hasNewFormat, 
        oldFormatAddress, 
        newFormatAddress, 
        conflict 
      }, 'WalletService');
      
      return {
        hasOldFormat,
        hasNewFormat,
        oldFormatAddress,
        newFormatAddress,
        conflict
      };
    } catch (error) {
      logger.error('Failed to check wallet formats', error, 'WalletService');
      return {
        hasOldFormat: false,
        hasNewFormat: false,
        conflict: false
      };
    }
  }

  /**
   * Force use of old format wallet (for users who have both old and new format wallets)
   */
  async forceUseOldFormatWallet(userId: string): Promise<{ success: boolean; wallet?: WalletInfo; error?: string }> {
    try {
      logger.info('Forcing use of old format wallet', { userId }, 'WalletService');
      
      const oldFormatWallet = await this.tryRestoreFromOldFormat(userId);
      if (!oldFormatWallet) {
        return { success: false, error: 'No old format wallet found' };
      }
      
      // Set as active wallet
      this.setActiveWallet(userId, oldFormatWallet);
      
      logger.info('Successfully forced use of old format wallet', { 
        userId, 
        address: oldFormatWallet.address 
      }, 'WalletService');
      
      return { success: true, wallet: oldFormatWallet };
    } catch (error) {
      logger.error('Failed to force use of old format wallet', error, 'WalletService');
      return { success: false, error: 'Failed to force use of old format wallet' };
    }
  }

  /**
   * Set wallet as active and cache it
   */
  private setActiveWallet(userId: string, wallet: WalletInfo): void {
    this.cacheWallet(userId, wallet);
    this.currentWallet = wallet;
  }

  /**
   * Attempt to recover wallet from address (when user has address in database but no wallet on device)
   */
  async recoverWalletFromAddress(userId: string, walletAddress: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Attempting wallet recovery from address', { userId, walletAddress }, 'WalletService');
      
      // Try to restore from old format first
      const oldFormatWallet = await this.tryRestoreFromOldFormat(userId);
      if (oldFormatWallet?.address === walletAddress) {
        this.setActiveWallet(userId, oldFormatWallet);
        logger.info('✅ Recovered wallet from old format', { userId, address: oldFormatWallet.address }, 'WalletService');
        return { success: true };
      }

      // Try to restore from seed phrase (both formats)
      const seedPhrase = await this.getSeedPhrase(userId);
      if (seedPhrase) {
        const wallet = await this.importWalletFromMnemonic(seedPhrase);
        if (wallet?.address === walletAddress) {
          this.setActiveWallet(userId, wallet);
          logger.info('✅ Recovered wallet from seed phrase', { userId, address: wallet.address }, 'WalletService');
          return { success: true };
        }
      }

      // Try alternative derivation paths
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      if (oldSeedPhrase && bip39.validateMnemonic(oldSeedPhrase)) {
        const alternativeWallet = await this.tryAlternativeDerivationFromOldSeedPhrase(userId);
        if (alternativeWallet?.address === walletAddress) {
          this.setActiveWallet(userId, alternativeWallet);
          logger.info('✅ Recovered wallet with alternative derivation', { userId, address: alternativeWallet.address }, 'WalletService');
          return { success: true };
        }
      }

      logger.warn('Failed to recover wallet from address - no matching wallet found', { userId, walletAddress }, 'WalletService');
      return { success: false, error: 'Wallet recovery from address requires manual intervention. Please restore from seed phrase.' };
    } catch (error) {
      logger.error('Failed to recover wallet from address', error, 'WalletService');
      return { success: false, error: 'Failed to recover wallet from address' };
    }
  }

  /**
   * Get user's wallet balance
   */
  async getUserWalletBalance(userId: string): Promise<UserWalletBalance> {
    try {
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return {
          solBalance: 0,
          usdcBalance: 0,
          totalUSD: 0,
          address: '',
          isConnected: false
        };
      }

      // Check rate limiting
      const now = Date.now();
      const lastCall = this.lastBalanceCall[userId];
      if (lastCall && (now - lastCall) < this.BALANCE_CALL_DEBOUNCE_MS) {
        const cached = this.lastSuccessfulBalance[userId];
        if (cached) {
          logger.info('Using cached balance due to rate limiting', { userId }, 'WalletService');
          return cached;
        }
      }

      // Get fresh balance
      const publicKey = new PublicKey(wallet.address);
      const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
      
      // Debug network configuration
      logger.debug('WalletService: Network configuration', {
        network: getConfig().blockchain.network,
        usdcMintAddress: USDC_CONFIG.mintAddress,
        walletAddress: wallet.address
      }, 'WalletService');
      
      // Get SOL price for accurate USD calculation
      let solPrice = 0;
      try {
        const { getCryptoPrice } = await import('./priceService');
        const priceData = await getCryptoPrice('SOL');
        solPrice = priceData?.price_usd || 0;
        
        if (solPrice === 0) {
          logger.warn('SOL price is 0, this may indicate a price service issue', { priceData }, 'WalletService');
        }
      } catch (priceError) {
        logger.warn('Failed to fetch SOL price, using 0 for USD calculation', { error: priceError }, 'WalletService');
        // Consider using a cached price or fallback price here if available
      }
      
      const balance = await balanceUtils.getCompleteBalance(publicKey, usdcMint, solPrice);
      
      const result: UserWalletBalance = {
        solBalance: balance.solBalance,
        usdcBalance: balance.usdcBalance,
        totalUSD: balance.totalUSD,
        address: balance.address,
        isConnected: balance.isConnected
      };

      // Cache the result
      this.lastBalanceCall[userId] = now;
      this.lastSuccessfulBalance[userId] = result;

      logger.info('Wallet balance retrieved', {
        userId,
        address: wallet.address,
        solBalance: result.solBalance,
        usdcBalance: result.usdcBalance,
        totalUSD: result.totalUSD,
        solPrice
      }, 'WalletService');

      return result;
    } catch (error) {
      logger.error('Failed to get wallet balance', error, 'WalletService');
      
      // Return cached balance if available
      const cached = this.lastSuccessfulBalance[userId];
      if (cached) {
        logger.info('Returning cached balance due to error', { userId }, 'WalletService');
        return cached;
      }

      return {
        solBalance: 0,
        usdcBalance: 0,
        totalUSD: 0,
        address: '',
        isConnected: false
      };
    }
  }

  /**
   * Store wallet securely
   */
  private async storeWalletSecurely(userId: string, wallet: WalletInfo, mnemonic?: string): Promise<void> {
    try {
      // Store private key
      await this.storeSecureData(`wallet_${userId}`, {
        address: wallet.address,
        publicKey: wallet.publicKey,
        secretKey: wallet.secretKey,
        walletType: wallet.walletType
      });

      // Store mnemonic if provided
      if (mnemonic) {
        await this.storeSecureData(`mnemonic_${userId}`, { mnemonic });
      }

      logger.info('Wallet stored securely', { userId, address: wallet.address }, 'WalletService');
    } catch (error) {
      logger.error('Failed to store wallet securely', error, 'WalletService');
      throw error;
    }
  }

  /**
   * Restore wallet from secure storage (with old format compatibility)
   * Prioritizes old format for existing users to preserve their funds
   */
  private async restoreWalletFromStorage(userId: string): Promise<WalletInfo | null> {
    try {
      logger.info('Starting wallet restoration process', { userId }, 'WalletService');

      // Get user's expected wallet address from database
      const expectedWalletAddress = await this.getUserExpectedWalletAddress(userId);
      
      // Strategy 1: For users with expected wallet address, prioritize old format
      if (expectedWalletAddress) {
        const oldFormatWallet = await this.tryRestoreFromOldFormat(userId);
        if (oldFormatWallet?.address === expectedWalletAddress) {
          logger.info('✅ Restored matching wallet from old format', { userId, address: oldFormatWallet.address }, 'WalletService');
          return oldFormatWallet;
        }
        
        // If old format doesn't match, try new format
        const newFormatWallet = await this.getNewFormatWallet(userId);
        if (newFormatWallet?.address === expectedWalletAddress) {
          logger.info('✅ Restored matching wallet from new format', { userId, address: newFormatWallet.address }, 'WalletService');
          return newFormatWallet;
        }
        
        // Log mismatch for debugging
        if (oldFormatWallet || newFormatWallet) {
          logger.warn('Wallet address mismatch detected', { 
            userId, 
            expectedAddress: expectedWalletAddress,
            oldFormatAddress: oldFormatWallet?.address,
            newFormatAddress: newFormatWallet?.address
          }, 'WalletService');
        }
      }

      // Strategy 2: Fallback - try both formats for users without expected address
      const newFormatWallet = await this.getNewFormatWallet(userId);
      if (newFormatWallet) {
        logger.info('✅ Restored wallet from new format (fallback)', { userId, address: newFormatWallet.address }, 'WalletService');
        return newFormatWallet;
      }

      const oldFormatWallet = await this.tryRestoreFromOldFormat(userId);
      if (oldFormatWallet) {
        logger.info('✅ Restored wallet from old format (fallback)', { userId, address: oldFormatWallet.address }, 'WalletService');
        return oldFormatWallet;
      }

      logger.warn('No wallet found in any format', { userId }, 'WalletService');
      return null;
    } catch (error) {
      logger.error('Failed to restore wallet from storage', error, 'WalletService');
      return null;
    }
  }

  /**
   * Get user's expected wallet address from database
   */
  private async getUserExpectedWalletAddress(userId: string): Promise<string | null> {
    try {
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      return userData?.wallet_address || null;
    } catch (error) {
      logger.warn('Failed to get user data from database', { userId, error }, 'WalletService');
      return null;
    }
  }

  /**
   * Get wallet from new format storage
   */
  private async getNewFormatWallet(userId: string): Promise<WalletInfo | null> {
    try {
      const walletData = await this.getSecureData(`wallet_${userId}`);
      if (!walletData) return null;

      return {
        address: walletData.address,
        publicKey: walletData.publicKey,
        secretKey: walletData.secretKey,
        walletType: walletData.walletType || 'app-generated',
        isConnected: true
      };
    } catch (error) {
      logger.error('Failed to get new format wallet', error, 'WalletService');
      return null;
    }
  }

  /**
   * Try to restore wallet from old format storage
   */
  private async tryRestoreFromOldFormat(userId: string): Promise<WalletInfo | null> {
    try {
      logger.info('Attempting to restore wallet from old format', { userId }, 'WalletService');

      // Try restoration strategies in order of preference
      const strategies = [
        { name: 'private key', method: () => this.tryRestoreFromOldPrivateKey(userId) },
        { name: 'seed phrase', method: () => this.tryRestoreFromOldSeedPhrase(userId) },
        { name: 'alternative derivation', method: () => this.tryAlternativeDerivationFromOldSeedPhrase(userId) }
      ];

      for (const strategy of strategies) {
        try {
          const result = await strategy.method();
          if (result) {
            logger.info(`✅ Restored wallet from old format using ${strategy.name}`, { 
              userId, 
              address: result.address,
              strategy: strategy.name 
            }, 'WalletService');
            return result;
          }
        } catch (error) {
          logger.warn(`Failed to restore using ${strategy.name}`, { userId, error }, 'WalletService');
        }
      }

      logger.warn('All old format restoration strategies failed', { userId }, 'WalletService');
      return null;
    } catch (error) {
      logger.error('Error restoring wallet from old format', error, 'WalletService');
      return null;
    }
  }

  /**
   * Try to restore wallet from old private key format
   */
  private async tryRestoreFromOldPrivateKey(userId: string): Promise<WalletInfo | null> {
    try {
      const oldPrivateKey = await this.getOldFormatSecureData(`private_key_${userId}`);
      if (!oldPrivateKey) {
        return null;
      }

      logger.info('Found old format private key, attempting restoration', { userId }, 'WalletService');
      
      // Create keypair from old format private key (JSON array format)
      const keypair = keypairUtils.createKeypairFromSecretKey(oldPrivateKey);
      
      const walletInfo: WalletInfo = {
        address: keypair.keypair.publicKey.toBase58(),
        publicKey: keypair.keypair.publicKey.toBase58(),
        secretKey: keypairUtils.keypairToBase64(keypair.keypair),
        walletType: 'app-generated',
        isConnected: true
      };

      // Migrate to new format
      await this.migrateOldFormatToNew(userId, walletInfo, null);
      
      logger.info('Successfully restored wallet from old private key', { 
        userId, 
        address: walletInfo.address 
      }, 'WalletService');
      
      return walletInfo;
    } catch (error) {
      logger.warn('Failed to restore from old private key', { userId, error }, 'WalletService');
      return null;
    }
  }

  /**
   * Try to restore wallet from old seed phrase format
   */
  private async tryRestoreFromOldSeedPhrase(userId: string): Promise<WalletInfo | null> {
    try {
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      if (!oldSeedPhrase || !bip39.validateMnemonic(oldSeedPhrase)) {
        return null;
      }

      logger.info('Found old format seed phrase, attempting restoration', { userId }, 'WalletService');
      
      // Import wallet from old seed phrase using standard derivation path
      const wallet = await this.importWalletFromMnemonic(oldSeedPhrase);
      
      if (wallet) {
        // Migrate to new format
        await this.migrateOldFormatToNew(userId, wallet, oldSeedPhrase);
        
        logger.info('Successfully restored wallet from old seed phrase', { 
          userId, 
          address: wallet.address 
        }, 'WalletService');
        
        return wallet;
      }

      return null;
    } catch (error) {
      logger.warn('Failed to restore from old seed phrase', { userId, error }, 'WalletService');
      return null;
    }
  }

  /**
   * Try alternative derivation paths from old seed phrase
   */
  private async tryAlternativeDerivationFromOldSeedPhrase(userId: string): Promise<WalletInfo | null> {
    try {
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      if (!oldSeedPhrase || !bip39.validateMnemonic(oldSeedPhrase)) {
        return null;
      }

      logger.info('Trying alternative derivation paths from old seed phrase', { userId }, 'WalletService');
      
      // Try different derivation paths
      const alternativePaths = [
        "m/44'/501'/0'/0'",  // Standard Solana path
        "m/44'/501'/0'",     // Alternative path
        "m/44'/501'",        // Another alternative
      ];

      for (const path of alternativePaths) {
        try {
          const wallet = await this.importWalletFromMnemonic(oldSeedPhrase, path);
          if (wallet) {
            // Migrate to new format
            await this.migrateOldFormatToNew(userId, wallet, oldSeedPhrase);
            
            logger.info('Successfully restored wallet with alternative derivation path', { 
              userId, 
              address: wallet.address,
              derivationPath: path
            }, 'WalletService');
            
            return wallet;
          }
        } catch (pathError) {
          logger.warn('Alternative derivation path failed', { userId, path, error: pathError }, 'WalletService');
        }
      }

      return null;
    } catch (error) {
      logger.warn('Failed to try alternative derivation paths', { userId, error }, 'WalletService');
      return null;
    }
  }

  /**
   * Import wallet from mnemonic with optional derivation path
   */
  private async importWalletFromMnemonic(mnemonic: string, derivationPath?: string): Promise<WalletInfo | null> {
    try {
      // Convert mnemonic to seed
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Use provided derivation path or default Solana path
      const path = derivationPath || "m/44'/501'/0'/0'";
      
      // Derive key using the specified path
      const derivedSeed = ed25519HdKey.derivePath(path, seed.toString('hex')).key;
      
      // Create keypair from derived seed
      const keypair = Keypair.fromSeed(derivedSeed);
      
      return {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: keypairUtils.keypairToBase64(keypair),
        walletName: 'Restored Wallet',
        walletType: 'app-generated',
        isConnected: true
      };
    } catch (error) {
      logger.error('Failed to import wallet from mnemonic', error, 'WalletService');
      return null;
    }
  }

  /**
   * Migrate old format data to new format
   */
  private async migrateOldFormatToNew(userId: string, wallet: WalletInfo, seedPhrase?: string | null): Promise<void> {
    try {
      logger.info('Migrating old format data to new format', { userId, address: wallet.address }, 'WalletService');

      // Store in new format
      await this.storeWalletSecurely(userId, wallet, seedPhrase || undefined);

      // Log migration event
      await this.logWalletEvent({
        userId,
        eventType: 'wallet_migration',
        eventData: {
          walletAddress: wallet.address,
          migrationFrom: 'old_format',
          migrationTo: 'new_format',
          walletType: 'app-generated'
        },
        timestamp: new Date().toISOString(),
        success: true
      });

      logger.info('Successfully migrated old format data to new format', { userId }, 'WalletService');
    } catch (error) {
      logger.error('Failed to migrate old format data to new format', error, 'WalletService');
      throw error;
    }
  }

  /**
   * Get cached wallet
   */
  private getCachedWallet(userId: string): WalletInfo | null {
    const cached = this.restoredWallets[userId];
    if (cached && (Date.now() - cached.timestamp) < this.WALLET_CACHE_DURATION_MS) {
      logger.info('Using cached wallet', { userId }, 'WalletService');
      return cached.wallet;
    }
    return null;
  }

  /**
   * Cache wallet
   */
  private cacheWallet(userId: string, wallet: WalletInfo): void {
    this.restoredWallets[userId] = {
      wallet,
      timestamp: Date.now()
    };
  }

  /**
   * Clear wallet data for user
   */
  async clearWalletDataForUser(userId: string): Promise<void> {
    try {
      // Clear secure storage
      await this.removeSecureData(`wallet_${userId}`);
      await this.removeSecureData(`mnemonic_${userId}`);

      // Clear caches
      delete this.lastBalanceCall[userId];
      delete this.lastSuccessfulBalance[userId];
      delete this.restoredWallets[userId];
      delete this.walletCreationPromises[userId];

      logger.info('Wallet data cleared for user', { userId }, 'WalletService');
    } catch (error) {
      logger.error('Failed to clear wallet data', error, 'WalletService');
      throw error;
    }
  }

  /**
   * Clear balance cache
   */
  clearBalanceCache(userId: string): void {
    delete this.lastBalanceCall[userId];
    delete this.lastSuccessfulBalance[userId];
    logger.info('Balance cache cleared', { userId }, 'WalletService');
  }

  /**
   * Get wallet status report
   */
  async getWalletStatusReport(userId: string): Promise<WalletStatusReport> {
    try {
      const wallet = await this.getUserWallet(userId);
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (!wallet) {
        return {
          userId,
          walletAddress: '',
          status: 'no_wallet',
          hasPrivateKey: false,
          hasSeedPhrase: false,
          walletType: 'app-generated',
          lastChecked: new Date().toISOString(),
          issues: ['No wallet found'],
          recommendations: ['Create a new wallet']
        };
      }

      const hasPrivateKey = !!wallet.secretKey;
      const hasSeedPhrase = !!(await this.getSecureData(`mnemonic_${userId}`));

      if (!hasPrivateKey) {
        issues.push('Private key not found');
        recommendations.push('Restore wallet from seed phrase');
      }

      if (!hasSeedPhrase) {
        issues.push('Seed phrase not found');
        recommendations.push('Backup wallet with seed phrase');
      }

      const status = issues.length === 0 ? 'healthy' : 'needs_fix';

      return {
        userId,
        walletAddress: wallet.address,
        status,
        hasPrivateKey,
        hasSeedPhrase,
        walletType: wallet.walletType || 'app-generated',
        lastChecked: new Date().toISOString(),
        issues,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get wallet status report', error, 'WalletService');
      return {
        userId,
        walletAddress: '',
        status: 'error',
        hasPrivateKey: false,
        hasSeedPhrase: false,
        walletType: 'app-generated',
        lastChecked: new Date().toISOString(),
        issues: ['Failed to check wallet status'],
        recommendations: ['Contact support']
      };
    }
  }

  /**
   * Log wallet management event
   */
  private async logWalletEvent(event: WalletManagementEvent): Promise<void> {
    try {
      await addDoc(collection(db, 'wallet_management_events'), {
        ...event,
        created_at: serverTimestamp()
      });
    } catch (error) {
      logger.error('Failed to log wallet event', error, 'WalletService');
      // Don't throw - this is not critical
    }
  }

  /**
   * Secure storage methods (simplified - in real app would use proper secure storage)
   */
  public async storeSecureData(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await SecureStore.setItemAsync(key, jsonData, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      logger.info('Secure data stored successfully', { key }, 'WalletService');
    } catch (error) {
      logger.error('Failed to store secure data', error, 'WalletService');
      throw error;
    }
  }

  public async getSecureData(key: string): Promise<any> {
    try {
      const jsonData = await SecureStore.getItemAsync(key, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      if (!jsonData) {
        return null;
      }
      return JSON.parse(jsonData);
    } catch (error) {
      logger.error('Failed to get secure data', error, 'WalletService');
      return null;
    }
  }

  private async removeSecureData(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      logger.info('Secure data removed successfully', { key }, 'WalletService');
    } catch (error) {
      logger.error('Failed to remove secure data', error, 'WalletService');
      throw error;
    }
  }

  /**
   * OLD FORMAT STORAGE METHODS (AsyncStorage with custom encryption)
   * These methods handle the old storage format for compatibility
   */

  /**
   * Get data from old format storage (AsyncStorage with custom encryption)
   */
  private async getOldFormatSecureData(key: string): Promise<string | null> {
    try {
      // Import AsyncStorage dynamically to avoid issues if not available
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      
      const stored = await AsyncStorage.default.getItem(`secure_${key}`);
      if (!stored) {
        return null;
      }

      const secureData = JSON.parse(stored);
      const decrypted = await this.decryptOldFormat(secureData.encrypted, secureData.iv);
      
      return decrypted;
    } catch (error) {
      logger.warn(`Failed to retrieve old format data for key: ${key}`, error, 'WalletService');
      return null;
    }
  }

  /**
   * Store data in old format storage (AsyncStorage with custom encryption)
   */
  private async storeOldFormatSecureData(key: string, data: string): Promise<void> {
    try {
      // Import AsyncStorage dynamically to avoid issues if not available
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      
      const { encrypted, iv } = await this.encryptOldFormat(data);
      
      const secureData = {
        encrypted,
        iv,
        timestamp: Date.now()
      };

      await AsyncStorage.default.setItem(`secure_${key}`, JSON.stringify(secureData));
      logger.info(`Old format secure data stored for key: ${key}`, null, 'WalletService');
    } catch (error) {
      logger.error(`Failed to store old format secure data for key: ${key}`, error, 'WalletService');
      throw error;
    }
  }

  /**
   * Encrypt data using old format (simple base64 encoding with timestamp)
   */
  private async encryptOldFormat(data: string): Promise<{ encrypted: string; iv: string }> {
    try {
      // Simple base64 encoding with timestamp (same as old system)
      const encrypted = btoa(`ENCRYPTED:${data}:${Date.now()}`);
      const iv = btoa(`IV:${Math.random().toString(36)}:${Date.now()}`);
      
      return { encrypted, iv };
    } catch (error) {
      logger.error('Old format encryption failed', error, 'WalletService');
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using old format (simple base64 decoding)
   */
  private async decryptOldFormat(encrypted: string, iv: string): Promise<string> {
    try {
      // Simple base64 decoding (same as old system)
      const decoded = atob(encrypted);
      const parts = decoded.split(':');
      
      if (parts[0] !== 'ENCRYPTED' || parts.length < 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      return parts[1];
    } catch (error) {
      logger.error('Old format decryption failed', error, 'WalletService');
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Get available wallet providers (for external wallet connections)
   */
  async getAvailableProviders(): Promise<WalletProvider[]> {
    try {
      const { solanaAppKitService } = await import('./solanaAppKitService');
      return await solanaAppKitService.getAvailableProviders();
    } catch (error) {
      logger.error('Failed to get available providers', error, 'WalletService');
      return [];
    }
  }

  /**
   * Connect to external wallet provider
   */
  async connectToProvider(providerName: string): Promise<WalletInfo> {
    try {
      const { solanaAppKitService } = await import('./solanaAppKitService');
      const wallet = await solanaAppKitService.connectToProvider(providerName);
      
      if (wallet && wallet.address) {
        this.currentWallet = {
          address: wallet.address,
          publicKey: wallet.publicKey,
          secretKey: wallet.secretKey,
          walletName: wallet.walletName || 'External Wallet',
          walletType: 'external',
          isConnected: true
        };
        
        logger.info('Connected to external wallet provider', { providerName, address: wallet.address }, 'WalletService');
        return this.currentWallet;
      } else {
        throw new Error('Failed to connect to external wallet provider');
      }
    } catch (error) {
      logger.error('Failed to connect to external wallet provider', error, 'WalletService');
      throw error;
    }
  }

  /**
   * Disconnect from external wallet
   */
  async disconnectFromProvider(): Promise<void> {
    this.currentWallet = null;
    logger.info('Disconnected from external wallet', {}, 'WalletService');
  }

  /**
   * Get current wallet
   */
  getCurrentWallet(): WalletInfo | null {
    return this.currentWallet;
  }

  /**
   * Set current wallet
   */
  setCurrentWallet(wallet: WalletInfo): void {
    this.currentWallet = wallet;
  }

  /**
   * Get wallet info (for compatibility with old consolidatedWalletService)
   */
  async getWalletInfo(): Promise<{ wallet?: WalletInfo; balance?: number }> {
    const wallet = this.currentWallet;
    if (!wallet) {
      return {};
    }
    
    const balance = await this.getUserWalletBalance(wallet.address);
    return {
      wallet,
      balance: balance.totalUSD
    };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.currentWallet !== null;
  }

  /**
   * Import wallet from seed phrase
   */
  async importWallet(seedPhrase: string, path?: string): Promise<WalletInfo> {
    try {
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      const derivedSeed = ed25519HdKey.derivePath(path || "m/44'/501'/0'/0'", seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);

      const walletInfo: WalletInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: keypairUtils.keypairToBase64(keypair),
        walletName: 'Imported Wallet',
        walletType: 'external',
        isConnected: true
      };

      this.currentWallet = walletInfo;
      return walletInfo;
    } catch (error) {
      logger.error('Failed to import wallet', error, 'WalletService');
      throw new Error('Failed to import wallet from seed phrase');
    }
  }

  /**
   * Create wallet (for compatibility - no userId)
   */
  async createWalletForProvider(): Promise<WalletInfo> {
    const keypair = Keypair.generate();
    const walletInfo: WalletInfo = {
      address: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBase58(),
      secretKey: keypairUtils.keypairToBase64(keypair),
      walletName: 'Generated Wallet',
      walletType: 'app-generated',
      isConnected: true
    };

    this.currentWallet = walletInfo;
    return walletInfo;
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.currentWallet = null;
    logger.info('Wallet disconnected', {}, 'WalletService');
  }

  /**
   * Export wallet data (secure implementation)
   */
  async exportWallet(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return { success: false, error: 'No wallet found' };
      }

      // Get the mnemonic if available
      const mnemonicData = await this.getSecureData(`mnemonic_${userId}`);
      const mnemonic = mnemonicData?.mnemonic;

      return {
        success: true,
        data: {
          address: wallet.address,
          publicKey: wallet.publicKey,
          walletType: wallet.walletType,
          mnemonic: mnemonic || null, // Only include if available
          // Note: Private keys are not exported for security reasons
        }
      };
    } catch (error) {
      logger.error('Failed to export wallet', error, 'WalletService');
      return { success: false, error: 'Failed to export wallet' };
    }
  }

  /**
   * Get wallet info for specific user
   */
  async getWalletInfoForUser(userId: string): Promise<{ success: boolean; wallet?: WalletInfo; error?: string }> {
    try {
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        return { success: false, error: 'No wallet found' };
      }

      return { success: true, wallet };
    } catch (error) {
      logger.error('Failed to get wallet info', error, 'WalletService');
      return { success: false, error: 'Failed to get wallet info' };
    }
  }

  /**
   * Fix wallet mismatch by recreating wallet with proper derivation
   */
  async fixWalletMismatch(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Fixing wallet mismatch', { userId }, 'WalletService');
      
      // Get current user data from Firebase
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      if (!userData) {
        return { success: false, error: 'User not found' };
      }

      // Check if user has a stored mnemonic
      const mnemonicData = await this.getSecureData(`mnemonic_${userId}`);
      if (!mnemonicData?.mnemonic) {
        return { success: false, error: 'No mnemonic found for wallet recovery' };
      }

      // Recreate wallet with proper derivation
      const walletResult = await this.createWallet(userId);
      if (!walletResult.success) {
        return { success: false, error: walletResult.error || 'Failed to recreate wallet' };
      }

      // Update user data in Firebase
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: walletResult.wallet?.address,
        wallet_public_key: walletResult.wallet?.publicKey
      });

      logger.info('Wallet mismatch fixed successfully', { userId, newAddress: walletResult.wallet?.address }, 'WalletService');
      return { success: true };
    } catch (error) {
      logger.error('Failed to fix wallet mismatch', error, 'WalletService');
      return { success: false, error: 'Failed to fix wallet mismatch' };
    }
  }

  /**
   * Comprehensive wallet recovery for users with address mismatches
   */
  async recoverWalletForUser(userId: string, expectedAddress: string): Promise<{ success: boolean; wallet?: WalletInfo; error?: string }> {
    try {
      logger.info('Starting comprehensive wallet recovery for user', { userId, expectedAddress }, 'WalletService');
      
      // Get all possible seed phrases
      const seedPhrase = await this.getSeedPhrase(userId);
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      
      const allSeedPhrases = [seedPhrase, oldSeedPhrase].filter(Boolean);
      
      if (allSeedPhrases.length === 0) {
        return { success: false, error: 'No seed phrases found for wallet recovery' };
      }
      
      // Comprehensive list of derivation paths to try
      const derivationPaths = [
        "m/44'/501'/0'/0'",    // Standard BIP44 Solana
        "m/44'/501'/0'",       // Alternative
        "m/44'/501'/0'/0'/0'", // Extended
        "m/44'/501'/1'/0'",    // Account 1
        "m/44'/501'/0'/1'",    // Change 1
        "m/44'/501'/0'/0'/1'", // Extended change
        "m/44'/501'/0'/0'/2'", // Extended change 2
        "m/44'/501'/0'/2'",    // Change 2
        "m/44'/501'/2'/0'",    // Account 2
        "m/44'/501'/0'/0'/3'", // Extended change 3
        "m/44'/501'/0'/3'",    // Change 3
        "m/44'/501'/3'/0'",    // Account 3
        "m/44'/501'",          // Base path
        "m/44'/501'/0'/0'/0'/0'", // Very extended
        "m/44'/501'/0'/0'/0'/1'", // Very extended 1
        "m/44'/501'/0'/0'/0'/2'", // Very extended 2
      ];
      
      // Try each seed phrase with each derivation path
      for (const phrase of allSeedPhrases) {
        if (!phrase) continue; // Skip null/undefined phrases
        
        for (const path of derivationPaths) {
          try {
            logger.info('Trying wallet recovery', { 
              userId, 
              expectedAddress, 
              derivationPath: path,
              seedPhrasePreview: phrase.substring(0, 20) + '...'
            }, 'WalletService');
            
            const wallet = await this.importWalletFromMnemonic(phrase, path);
            if (wallet && wallet.address === expectedAddress) {
              logger.info('✅ Wallet recovered successfully', { 
                userId, 
                expectedAddress,
                derivationPath: path,
                actualAddress: wallet.address
              }, 'WalletService');
              
              // Store the recovered wallet in the correct format
              await this.storeWalletSecurely(userId, wallet, phrase);
              
              return { success: true, wallet };
            }
          } catch (error) {
            // Continue to next path
            logger.debug('Derivation path failed', { path, error }, 'WalletService');
          }
        }
      }
      
      logger.error('Wallet recovery failed - no matching wallet found', { userId, expectedAddress }, 'WalletService');
      return { success: false, error: 'No matching wallet found with any derivation path' };
    } catch (error) {
      logger.error('Wallet recovery failed', error, 'WalletService');
      return { success: false, error: 'Wallet recovery failed' };
    }
  }

  /**
   * Store wallet securely (public method for external use)
   */
  async storeWalletSecurelyPublic(userId: string, wallet: WalletInfo): Promise<void> {
    await this.storeWalletSecurely(userId, wallet);
  }

  /**
   * Multi-signature wallet functionality
   */
  async getUserMultiSigWallets(userId: string): Promise<any[]> {
    try {
      // Get multi-sig wallets from Firebase
      const multiSigWallets = await firebaseDataService.multiSig.getUserMultiSigWallets(userId);
      return multiSigWallets || [];
    } catch (error) {
      logger.error('Failed to get multi-sig wallets', error, 'WalletService');
      return [];
    }
  }

  async createMultiSigWallet(userId: string, walletData: any): Promise<{ success: boolean; wallet?: any; error?: string }> {
    try {
      const result = await firebaseDataService.multiSig.createMultiSigWallet(userId, walletData);
      return result;
    } catch (error) {
      logger.error('Failed to create multi-sig wallet', error, 'WalletService');
      return { success: false, error: 'Failed to create multi-sig wallet' };
    }
  }

  async approveMultiSigTransaction(transactionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await firebaseDataService.multiSig.approveMultiSigTransaction(transactionId, userId);
      return result;
    } catch (error) {
      logger.error('Failed to approve multi-sig transaction', error, 'WalletService');
      return { success: false, error: 'Failed to approve multi-sig transaction' };
    }
  }

  async rejectMultiSigTransaction(transactionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await firebaseDataService.multiSig.rejectMultiSigTransaction(transactionId, userId);
      return result;
    } catch (error) {
      logger.error('Failed to reject multi-sig transaction', error, 'WalletService');
      return { success: false, error: 'Failed to reject multi-sig transaction' };
    }
  }

  /**
   * Seed phrase functionality (with old format compatibility)
   */
  async getSeedPhrase(userId: string): Promise<string | null> {
    try {
      // First try new format
      const mnemonicData = await this.getSecureData(`mnemonic_${userId}`);
      if (mnemonicData?.mnemonic) {
        return mnemonicData.mnemonic;
      }

      // Try old format
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      if (oldSeedPhrase) {
        logger.info('Retrieved seed phrase from old format', { userId }, 'WalletService');
        return oldSeedPhrase;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get seed phrase', error, 'WalletService');
      return null;
    }
  }

  /**
   * COMPATIBILITY METHODS FOR OLD STORAGE FORMAT
   * These methods ensure existing users can retrieve their wallet data
   */

  /**
   * Get private key (compatibility with old secureStorageService)
   */
  async getPrivateKey(userId: string): Promise<string | null> {
    try {
      // First try new format
      const walletData = await this.getSecureData(`wallet_${userId}`);
      if (walletData?.secretKey) {
        return walletData.secretKey;
      }

      // Try old format with AsyncStorage
      const oldPrivateKey = await this.getOldFormatSecureData(`private_key_${userId}`);
      if (oldPrivateKey) {
        logger.info('Retrieved private key from old format', { userId }, 'WalletService');
        return oldPrivateKey;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get private key', error, 'WalletService');
      return null;
    }
  }

  /**
   * Store private key (compatibility with old secureStorageService)
   */
  async storePrivateKey(userId: string, privateKey: string): Promise<void> {
    try {
      // Store in new format
      const walletData = await this.getSecureData(`wallet_${userId}`);
      if (walletData) {
        walletData.secretKey = privateKey;
        await this.storeSecureData(`wallet_${userId}`, walletData);
      } else {
        // Create new wallet data entry
        await this.storeSecureData(`wallet_${userId}`, {
          secretKey: privateKey,
          walletType: 'app-generated'
        });
      }

      // Also store in old format for compatibility
      await this.storeOldFormatSecureData(`private_key_${userId}`, privateKey);
      
      logger.info('Private key stored in both formats', { userId }, 'WalletService');
    } catch (error) {
      logger.error('Failed to store private key', error, 'WalletService');
      throw error;
    }
  }

  /**
   * Get seed phrase (compatibility with old secureStorageService)
   */
  async getSeedPhraseCompatible(userId: string): Promise<string | null> {
    try {
      // First try new format
      const mnemonicData = await this.getSecureData(`mnemonic_${userId}`);
      if (mnemonicData?.mnemonic) {
        return mnemonicData.mnemonic;
      }

      // Try old format with AsyncStorage
      const oldSeedPhrase = await this.getOldFormatSecureData(`seed_phrase_${userId}`);
      if (oldSeedPhrase) {
        logger.info('Retrieved seed phrase from old format', { userId }, 'WalletService');
        return oldSeedPhrase;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get seed phrase', error, 'WalletService');
      return null;
    }
  }

  /**
   * Store seed phrase (compatibility with old secureStorageService)
   */
  async storeSeedPhrase(userId: string, seedPhrase: string): Promise<void> {
    try {
      // Store in new format
      await this.storeSecureData(`mnemonic_${userId}`, { mnemonic: seedPhrase });

      // Also store in old format for compatibility
      await this.storeOldFormatSecureData(`seed_phrase_${userId}`, seedPhrase);
      
      logger.info('Seed phrase stored in both formats', { userId }, 'WalletService');
    } catch (error) {
      logger.error('Failed to store seed phrase', error, 'WalletService');
      throw error;
    }
  }

  async initializeSecureWallet(userId: string): Promise<{ address: string; isNew: boolean }> {
    try {
      // Check if wallet already exists
      const existingWallet = await this.getUserWallet(userId);
      if (existingWallet) {
        return { address: existingWallet.address, isNew: false };
      }

      // Create new wallet
      const walletResult = await this.createWallet(userId);
      if (walletResult.success && walletResult.wallet) {
        return { address: walletResult.wallet.address, isNew: true };
      }

      throw new Error('Failed to create wallet');
    } catch (error) {
      logger.error('Failed to initialize secure wallet', error, 'WalletService');
      throw error;
    }
  }

  getExportInstructions(): string {
    return `To export your wallet to external applications:

1. Copy your seed phrase (12 or 24 words)
2. Open your external wallet app (Phantom, Solflare, etc.)
3. Choose "Import Wallet" or "Restore Wallet"
4. Enter your seed phrase when prompted
5. Your wallet will be restored with the same address

⚠️ Keep your seed phrase secure and never share it with anyone.`;
  }

  /**
   * Linked wallet functionality
   */
  async getLinkedWallets(userId: string): Promise<any[]> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      return await LinkedWalletService.getLinkedWallets(userId);
    } catch (error) {
      logger.error('Failed to get linked wallets', error, 'WalletService');
      return [];
    }
  }

  async getLinkedDestinations(userId: string): Promise<{ externalWallets: any[]; kastCards: any[] }> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      return await LinkedWalletService.getLinkedDestinations(userId);
    } catch (error) {
      logger.error('Failed to get linked destinations', error, 'WalletService');
      return { externalWallets: [], kastCards: [] };
    }
  }

  async addExternalWallet(userId: string, walletData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      const result = await LinkedWalletService.addLinkedWallet(userId, { ...walletData, type: 'external' });
      return result;
    } catch (error) {
      logger.error('Failed to add external wallet', error, 'WalletService');
      return { success: false, error: 'Failed to add external wallet' };
    }
  }

  async addKastCard(userId: string, cardData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      const result = await LinkedWalletService.addLinkedWallet(userId, { ...cardData, type: 'kast' });
      return result;
    } catch (error) {
      logger.error('Failed to add Kast card', error, 'WalletService');
      return { success: false, error: 'Failed to add Kast card' };
    }
  }

  async removeExternalWallet(userId: string, walletId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      const result = await LinkedWalletService.removeLinkedWallet(userId, walletId);
      return result;
    } catch (error) {
      logger.error('Failed to remove external wallet', error, 'WalletService');
      return { success: false, error: 'Failed to remove external wallet' };
    }
  }

  async removeKastCard(userId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      const result = await LinkedWalletService.removeLinkedWallet(userId, cardId);
      return result;
    } catch (error) {
      logger.error('Failed to remove Kast card', error, 'WalletService');
      return { success: false, error: 'Failed to remove Kast card' };
    }
  }
}

// Export singleton instance
export const walletService = WalletService.getInstance();
export default walletService;
