/**
 * Unified Wallet Service
 * Resolves wallet information for both embedded and Phantom wallets
 * Critical for split wallet functionality to work with mixed wallet types
 */

import { logger } from '../../analytics/loggingService';
import { walletService } from './index';
import PhantomSplitWalletService from './phantomSplitWalletService';

export interface UnifiedWalletInfo {
  type: 'embedded' | 'phantom' | 'none';
  address?: string;
  socialProvider?: string;
  splitType?: string;
  // For embedded wallets
  embeddedWalletInfo?: any;
  // For Phantom wallets
  phantomWalletInfo?: any;
}

export interface TransactionContext {
  splitType?: 'degen' | 'spend' | 'fair';
  splitId?: string;
  transactionType?: 'payment' | 'withdrawal' | 'transfer';
}

class UnifiedWalletService {
  private static instance: UnifiedWalletService;

  public static getInstance(): UnifiedWalletService {
    if (!UnifiedWalletService.instance) {
      UnifiedWalletService.instance = new UnifiedWalletService();
    }
    return UnifiedWalletService.instance;
  }

  /**
   * Get unified wallet info for a user in a specific context
   * This is the critical method that resolves wallet information for split operations
   */
  async getWalletForContext(
    userId: string,
    context?: TransactionContext
  ): Promise<UnifiedWalletInfo> {
    try {
      logger.debug('Getting unified wallet info', { userId, context }, 'UnifiedWalletService');

      // If we have split context, check for Phantom wallets first
      if (context?.splitType) {
        const phantomWallet = await this.getPhantomWalletForSplit(userId, context.splitType);
        if (phantomWallet) {
          logger.debug('Found Phantom wallet for split', {
            userId,
            splitType: context.splitType,
            address: phantomWallet.address
          }, 'UnifiedWalletService');

          return phantomWallet;
        }
      }

      // Check for embedded wallet
      const embeddedWallet = await this.getEmbeddedWallet(userId);
      if (embeddedWallet) {
        logger.debug('Found embedded wallet', {
          userId,
          address: embeddedWallet.address
        }, 'UnifiedWalletService');

        return embeddedWallet;
      }

      // No wallet found
      logger.debug('No wallet found for user', { userId, context }, 'UnifiedWalletService');
      return { type: 'none' };

    } catch (error) {
      logger.error('Failed to get unified wallet info', error, 'UnifiedWalletService');
      return { type: 'none' };
    }
  }

  /**
   * Get Phantom wallet for specific split type
   */
  private async getPhantomWalletForSplit(
    userId: string,
    splitType: 'degen' | 'spend' | 'fair'
  ): Promise<UnifiedWalletInfo | null> {
    try {
      const phantomService = PhantomSplitWalletService.getInstance();
      const userPhantomWallets = await phantomService.getUserPhantomWallets(userId);

      const matchingWallet = userPhantomWallets.find(wallet => wallet.splitType === splitType);

      if (matchingWallet) {
        return {
          type: 'phantom',
          address: matchingWallet.phantomWalletAddress,
          socialProvider: matchingWallet.socialProvider,
          splitType: matchingWallet.splitType,
          phantomWalletInfo: matchingWallet
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get Phantom wallet for split', error, 'UnifiedWalletService');
      return null;
    }
  }

  /**
   * Get embedded wallet information
   */
  private async getEmbeddedWallet(userId: string): Promise<UnifiedWalletInfo | null> {
    try {
      const walletInfo = await walletService.getWalletInfo(userId);

      if (walletInfo && walletInfo.address) {
        return {
          type: 'embedded',
          address: walletInfo.address,
          embeddedWalletInfo: walletInfo
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get embedded wallet', error, 'UnifiedWalletService');
      return null;
    }
  }

  /**
   * Create wallet for split participation if needed
   * This handles the "join split" flow where users need wallets
   */
  async ensureWalletForSplit(
    userId: string,
    userName: string,
    userEmail: string,
    splitType: 'degen' | 'spend' | 'fair',
    preferredProvider: 'google' | 'apple' = 'google'
  ): Promise<UnifiedWalletInfo> {
    try {
      // First check if wallet already exists
      const existingWallet = await this.getWalletForContext(userId, { splitType });
      if (existingWallet.type !== 'none') {
        return existingWallet;
      }

      // No wallet found, create Phantom wallet for this split
      logger.info('Creating Phantom wallet for split participation', {
        userId,
        splitType,
        preferredProvider
      }, 'UnifiedWalletService');

      const phantomService = PhantomSplitWalletService.getInstance();
      const walletResult = await phantomService.createSplitWallet(
        userId,
        userName,
        userEmail,
        {
          splitType,
          socialProvider: preferredProvider,
          spendingLimits: PhantomSplitWalletService.getDefaultSpendingLimits(splitType)
        }
      );

      if (walletResult.success) {
        return {
          type: 'phantom',
          address: walletResult.walletAddress,
          socialProvider: preferredProvider,
          splitType,
          phantomWalletInfo: {
            userId,
            name: userName,
            email: userEmail,
            phantomWalletAddress: walletResult.walletAddress,
            socialProvider: preferredProvider,
            splitType,
            joinedAt: Date.now()
          }
        };
      }

      // If Phantom creation fails, try to create embedded wallet as fallback
      logger.warn('Phantom wallet creation failed, attempting embedded wallet fallback', {
        userId,
        splitType,
        error: walletResult.error
      }, 'UnifiedWalletService');

      try {
        const embeddedResult = await walletService.ensureUserWallet(userId);
        if (embeddedResult.success && embeddedResult.wallet) {
          return {
            type: 'embedded',
            address: embeddedResult.wallet.address,
            embeddedWalletInfo: embeddedResult.wallet
          };
        }
      } catch (embeddedError) {
        logger.error('Embedded wallet fallback also failed', embeddedError, 'UnifiedWalletService');
      }

      return { type: 'none' };

    } catch (error) {
      logger.error('Failed to ensure wallet for split', error, 'UnifiedWalletService');
      return { type: 'none' };
    }
  }

  /**
   * Get all wallets for a user across all contexts
   */
  async getAllUserWallets(userId: string): Promise<{
    embedded?: UnifiedWalletInfo;
    phantom: UnifiedWalletInfo[];
  }> {
    try {
      const embedded = await this.getEmbeddedWallet(userId);

      const phantomService = PhantomSplitWalletService.getInstance();
      const phantomWallets = await phantomService.getUserPhantomWallets(userId);

      const phantom: UnifiedWalletInfo[] = phantomWallets.map(wallet => ({
        type: 'phantom' as const,
        address: wallet.phantomWalletAddress,
        socialProvider: wallet.socialProvider,
        splitType: wallet.splitType,
        phantomWalletInfo: wallet
      }));

      return {
        embedded: embedded || undefined,
        phantom
      };
    } catch (error) {
      logger.error('Failed to get all user wallets', error, 'UnifiedWalletService');
      return { phantom: [] };
    }
  }

  /**
   * Validate wallet address format
   */
  static isValidWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get wallet type display name
   */
  static getWalletTypeDisplayName(type: 'embedded' | 'phantom' | 'none'): string {
    switch (type) {
      case 'embedded':
        return 'Personal Wallet';
      case 'phantom':
        return 'Phantom Wallet';
      case 'none':
        return 'No Wallet';
      default:
        return 'Unknown';
    }
  }
}

export default UnifiedWalletService;
export { UnifiedWalletService };
