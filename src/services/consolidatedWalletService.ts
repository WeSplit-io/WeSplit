/**
 * Consolidated Wallet Service for WeSplit
 * Provides a unified interface for wallet operations across the app
 * Handles both app-generated and external wallet connections
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import * as bip39 from 'bip39';
import * as ed25519HdKey from 'ed25519-hd-key';
import { logger } from './loggingService';

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance?: number;
  walletName?: string;
  walletType?: 'app-generated' | 'external';
}

export interface WalletCreationResult {
  success: boolean;
  wallet?: WalletInfo;
  error?: string;
}

export interface TransactionParams {
  to: string;
  amount: number;
  currency: string;
  memo?: string;
  groupId?: string;
}

export interface TransactionResult {
  signature: string;
  txId: string;
}

class ConsolidatedWalletService {
  private static instance: ConsolidatedWalletService;
  private currentWallet: WalletInfo | null = null;

  private constructor() {}

  public static getInstance(): ConsolidatedWalletService {
    if (!ConsolidatedWalletService.instance) {
      ConsolidatedWalletService.instance = new ConsolidatedWalletService();
    }
    return ConsolidatedWalletService.instance;
  }

  /**
   * Import wallet from mnemonic phrase
   */
  async importWallet(mnemonic: string, derivationPath?: string): Promise<WalletInfo> {
    try {
      logger.info('ConsolidatedWalletService: Importing wallet from mnemonic', { 
        hasMnemonic: !!mnemonic,
        derivationPath: derivationPath || 'default'
      }, 'ConsolidatedWalletService');

      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Convert mnemonic to seed
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Use provided derivation path or default Solana path
      const path = derivationPath || "m/44'/501'/0'/0'";
      
      // Derive key using the specified path
      const derivedSeed = ed25519HdKey.derivePath(path, seed.toString('hex')).key;
      
      // Create keypair from derived seed
      const keypair = Keypair.fromSeed(derivedSeed);
      
      const walletInfo: WalletInfo = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Buffer.from(keypair.secretKey).toString('base64'),
        walletName: 'Imported Wallet',
        walletType: 'app-generated'
      };

      this.currentWallet = walletInfo;

      logger.info('ConsolidatedWalletService: Successfully imported wallet', {
        address: walletInfo.address,
        derivationPath: path
      }, 'ConsolidatedWalletService');

      return walletInfo;
    } catch (error) {
      logger.error('ConsolidatedWalletService: Failed to import wallet', error, 'ConsolidatedWalletService');
      throw error;
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<WalletInfo> {
    try {
      logger.info('ConsolidatedWalletService: Creating new wallet', {}, 'ConsolidatedWalletService');

      // Generate new mnemonic
      const mnemonic = bip39.generateMnemonic(128); // 12 words
      
      // Import the generated mnemonic
      const walletInfo = await this.importWallet(mnemonic);
      walletInfo.walletName = 'New Wallet';

      logger.info('ConsolidatedWalletService: Successfully created new wallet', {
        address: walletInfo.address
      }, 'ConsolidatedWalletService');

      return walletInfo;
    } catch (error) {
      logger.error('ConsolidatedWalletService: Failed to create wallet', error, 'ConsolidatedWalletService');
      throw error;
    }
  }

  /**
   * Get current wallet info
   */
  async getWalletInfo(): Promise<WalletInfo> {
    if (!this.currentWallet) {
      throw new Error('No wallet loaded');
    }
    return this.currentWallet;
  }

  /**
   * Connect to external wallet provider
   */
  async connectToProvider(providerKey: string): Promise<{
    success: boolean;
    walletAddress?: string;
    balance?: number;
    walletName?: string;
    error?: string;
  }> {
    try {
      logger.info('ConsolidatedWalletService: Connecting to external provider', { providerKey }, 'ConsolidatedWalletService');

      // For now, return a mock response since external wallet integration
      // would require specific provider implementations
      return {
        success: false,
        error: 'External wallet providers not yet implemented'
      };
    } catch (error) {
      logger.error('ConsolidatedWalletService: Failed to connect to provider', error, 'ConsolidatedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available wallet providers
   */
  getAvailableProviders(): any[] {
    // Return empty array for now since external providers aren't implemented
    return [];
  }

  /**
   * Disconnect current wallet
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('ConsolidatedWalletService: Disconnecting wallet', {}, 'ConsolidatedWalletService');
      this.currentWallet = null;
    } catch (error) {
      logger.error('ConsolidatedWalletService: Failed to disconnect wallet', error, 'ConsolidatedWalletService');
      throw error;
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.currentWallet !== null;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.currentWallet?.address || null;
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string | null {
    return this.currentWallet?.publicKey || null;
  }

  /**
   * Get wallet secret key (for signing transactions)
   */
  getSecretKey(): string | null {
    return this.currentWallet?.secretKey || null;
  }
}

// Export singleton instance
export const consolidatedWalletService = ConsolidatedWalletService.getInstance();
