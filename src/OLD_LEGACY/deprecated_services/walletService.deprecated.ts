/**
 * Wallet Service
 * Main wallet service interface and types
 */

import { solanaWalletService } from '../../OLD_LEGACY/deprecated_services/solanaWallet.deprecated';
import { logger } from '../../services/analytics/loggingService';

// Re-export types from solanaWallet
export type { WalletInfo, UserWalletBalance } from './solanaWallet';

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

// Main wallet service - delegates to solanaWalletService
export const walletService = {
  // User wallet management
  async createWallet(userId: string): Promise<WalletCreationResult> {
    try {
      const result = await solanaWalletService.instance.instance.createWalletFromMnemonic();
      return {
        success: true,
        wallet: result.wallet,
        mnemonic: result.mnemonic
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  },

  async ensureUserWallet(userId: string): Promise<WalletCreationResult> {
    try {
      const wallet = await solanaWalletService.instance.getWalletInfo();
      if (wallet) {
        return { success: true, wallet: wallet as WalletInfo };
      }
      return await this.createWallet(userId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure user wallet'
      };
    }
  },

  async getUserWallet(userId: string) {
    return await solanaWalletService.instance.instance.getWalletInfo();
  },

  async getUserWalletBalance(userId: string) {
    const balance = await solanaWalletService.instance.instance.getBalance();
    return {
      solBalance: balance.sol,
      usdcBalance: balance.usdc,
      totalUSD: balance.sol + balance.usdc, // Simplified calculation
      address: '',
      isConnected: true
    };
  },

  // Wallet connection
  async connectToProvider(providerName: string) {
    // This would need to be implemented based on the actual provider
    throw new Error('Provider connection not implemented');
  },

  async disconnectFromProvider() {
    // This would need to be implemented
    throw new Error('Provider disconnection not implemented');
  },

  // Wallet info
  getCurrentWallet() {
    return solanaWalletService.instance.instance.getWalletInfo();
  },

  isConnected() {
    return solanaWalletService.instance.getWalletInfo() !== null;
  },

  // Export/Import
  async exportWallet(userId: string) {
    const mnemonic = await solanaWalletService.instance.exportMnemonic();
    return {
      success: true,
      data: { mnemonic: mnemonic.data || '' }
    };
  },

  async importWallet(seedPhrase: string, path?: string) {
    const result = await solanaWalletService.instance.importWallet(seedPhrase);
    return result.wallet;
  },

  // Additional methods for AuthService compatibility
  async hasWalletOnDevice(userId: string): Promise<boolean> {
    try {
      const wallet = await solanaWalletService.instance.getWalletInfo();
      return wallet !== null;
    } catch (error) {
      return false;
    }
  },

  async recoverWalletFromAddress(userId: string, walletAddress: string): Promise<WalletCreationResult> {
    try {
      // This is a simplified implementation - in a real app, you'd need to implement
      // proper wallet recovery from address, which typically requires the user to provide
      // their seed phrase or private key
      logger.warn('Wallet recovery from address not fully implemented', { userId, walletAddress }, 'WalletService');
      return {
        success: false,
        error: 'Wallet recovery from address requires user to provide seed phrase'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to recover wallet'
      };
    }
  }
};

export default walletService;