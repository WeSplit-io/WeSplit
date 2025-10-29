/**
 * Solana Wallet Service
 * DEPRECATED: Most methods are deprecated in favor of unified wallet services
 * This service is kept for backward compatibility only
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import { logger } from '../../../analytics/loggingService';
import { walletRecoveryService } from '../walletRecoveryService';

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey: string;
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
}

class SolanaWalletService {
  private connection: Connection;
  private keypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  }

  /**
   * Get the singleton instance
   */
  static get instance(): SolanaWalletService {
    if (!_solanaWalletService) {
      _solanaWalletService = new SolanaWalletService();
    }
    return _solanaWalletService;
  }

  /**
   * Create wallet from mnemonic
   * DEPRECATED: Use simplifiedWalletService.ensureUserWallet() instead
   */
  async createWalletFromMnemonic(mnemonic?: string): Promise<WalletCreationResult> {
    try {
      logger.warn('Using deprecated SolanaWalletService.createWalletFromMnemonic()', {}, 'SolanaWalletService');
      logger.info('Redirecting to simplifiedWalletService.ensureUserWallet()', {}, 'SolanaWalletService');

      // This method should not be used for new wallet creation
      // It's kept for backward compatibility only
      if (!mnemonic) {
        return {
          success: false,
          error: 'Mnemonic is required for wallet creation'
        };
      }

      // Basic validation
      const bip39 = await import('bip39');
      if (!bip39.validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Invalid mnemonic phrase'
        };
      }

      // Derive keypair from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const keypair = Keypair.fromSeed(seed.slice(0, 32));

      const wallet: WalletInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Buffer.from(keypair.secretKey).toString('base64')
      };

      this.keypair = keypair;

      logger.info('Wallet created from mnemonic (legacy method)', { 
        address: wallet.address 
      }, 'SolanaWalletService');

      return {
        success: true,
        wallet
      };

    } catch (error) {
      logger.error('Failed to create wallet from mnemonic', error, 'SolanaWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load wallet from secure storage
   * DEPRECATED: Use walletRecoveryService.recoverWallet() instead
   */
  async loadWallet(userId?: string, expectedAddress?: string): Promise<boolean> {
    try {
      logger.warn('Using deprecated SolanaWalletService.loadWallet()', { userId, expectedAddress }, 'SolanaWalletService');
      logger.info('Redirecting to walletRecoveryService.recoverWallet()', { userId }, 'SolanaWalletService');
      
      if (!userId || !expectedAddress) {
        logger.error('Missing required parameters for wallet loading', { userId, expectedAddress }, 'SolanaWalletService');
        return false;
      }

      // Use the proper wallet recovery service instead
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      
      if (recoveryResult.success && recoveryResult.wallet) {
        // Set the keypair from the recovered wallet
        const privateKeyBuffer = Buffer.from(recoveryResult.wallet.privateKey, 'base64');
        this.keypair = Keypair.fromSecretKey(privateKeyBuffer);
        
        logger.info('Wallet loaded via recovery service', { 
          userId, 
          address: recoveryResult.wallet.address,
          expectedAddress 
        }, 'SolanaWalletService');
        
        return true;
      }
      
      logger.error('Failed to load wallet via recovery service', { 
        userId, 
        expectedAddress,
        error: recoveryResult.error 
      }, 'SolanaWalletService');
      
      return false;
    } catch (error) {
      logger.error('Failed to load wallet', error, 'SolanaWalletService');
      return false;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ sol: number; usdc: number }> {
    try {
      if (!this.keypair) {
        throw new Error('No wallet loaded');
      }

      const publicKey = this.keypair.publicKey;
      const solBalance = await this.connection.getBalance(publicKey);
      
      // USDC balance would need to be implemented with SPL token support
      const usdcBalance = 0; // Placeholder

      return {
        sol: solBalance / 1e9, // Convert lamports to SOL
        usdc: usdcBalance
      };
    } catch (error) {
      logger.error('Failed to get balance', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Store wallet securely
   * DEPRECATED: Use simplifiedWalletService instead
   */
  private async storeWalletSecurely(wallet: WalletInfo): Promise<void> {
    try {
      logger.warn('Using deprecated storeWalletSecurely method', { address: wallet.address }, 'SolanaWalletService');
      
      // This method should not be used for new wallet creation
      // It's kept for backward compatibility only
      if (wallet.secretKey) {
        await SecureStore.setItemAsync('wallet_private_key', wallet.secretKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitWalletData'
        });
      }
      
      logger.info('Wallet stored securely (legacy method)', { address: wallet.address }, 'SolanaWalletService');
    } catch (error) {
      logger.error('Failed to store wallet securely', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Store mnemonic securely
   * DEPRECATED: Use simplifiedWalletService instead
   */
  private async storeMnemonicSecurely(mnemonic: string): Promise<void> {
    try {
      logger.warn('Using deprecated storeMnemonicSecurely method', {}, 'SolanaWalletService');
      
      // This method should not be used for new wallet creation
      // It's kept for backward compatibility only
      await SecureStore.setItemAsync('wallet_mnemonic', mnemonic, {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
      
      logger.info('Mnemonic stored securely (legacy method)', {}, 'SolanaWalletService');
    } catch (error) {
      logger.error('Failed to store mnemonic securely', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Get stored private key
   * DEPRECATED: Use walletRecoveryService instead
   */
  private async getStoredPrivateKey(): Promise<string | null> {
    try {
      logger.warn('Using deprecated getStoredPrivateKey method', {}, 'SolanaWalletService');
      
      return await SecureStore.getItemAsync('wallet_private_key', {
        requireAuthentication: false,
        keychainService: 'WeSplitWalletData'
      });
    } catch (error) {
      logger.error('Failed to get stored private key', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Clear wallet from memory and storage
   */
  async clearWallet(): Promise<void> {
    try {
      this.keypair = null;
      await SecureStore.deleteItemAsync('wallet_private_key');
      await SecureStore.deleteItemAsync('wallet_mnemonic');
      
      logger.info('Wallet cleared from memory and storage', {}, 'SolanaWalletService');
    } catch (error) {
      logger.error('Failed to clear wallet', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Load wallet with balance check
   * DEPRECATED: Use simplifiedWalletService.getUserWalletBalance() instead
   */
  async loadWalletWithBalance(userId: string, expectedAddress: string, currency: string): Promise<boolean> {
    try {
      logger.warn('Using deprecated SolanaWalletService.loadWalletWithBalance()', { userId, expectedAddress, currency }, 'SolanaWalletService');
      
      // Use the loadWallet method
      const loaded = await this.loadWallet(userId, expectedAddress);
      if (!loaded) {
        return false;
      }

      // Check if the loaded wallet matches the expected address
      if (this.keypair && this.keypair.publicKey.toBase58() === expectedAddress) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to load wallet with balance', error, 'SolanaWalletService');
      return false;
    }
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _solanaWalletService: SolanaWalletService | null = null;

export const solanaWalletService = SolanaWalletService.instance;
export default solanaWalletService;