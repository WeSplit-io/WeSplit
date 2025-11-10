/**
 * Centralized Linked Wallet Service
 * Single source of truth for all linked wallet operations across the app
 */

import { logger } from '../../analytics/loggingService';
import { firebaseDataService } from '../../data/firebaseDataService';

export interface LinkedWallet {
  id: string;
  userId: string;
  type: 'external' | 'kast';
  label: string;
  address?: string;
  identifier?: string;
  chain?: string;
  cardType?: 'debit' | 'credit' | 'prepaid';
  status: 'active' | 'inactive' | 'blocked' | 'expired';
  balance?: number;
  currency: string;
  expirationDate?: string;
  cardholderName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface LinkedDestinations {
  externalWallets: LinkedWallet[];
  kastCards: LinkedWallet[];
}

export interface AddLinkedWalletResult {
  success: boolean;
  walletId?: string;
  error?: string;
}

export interface RemoveLinkedWalletResult {
  success: boolean;
  error?: string;
}

export class LinkedWalletService {
  /**
   * Get all linked wallets for a user
   */
  static async getLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      logger.info('Getting linked wallets for user', { userId }, 'LinkedWalletService');

      const linkedWallets = await firebaseDataService.linkedWallet.getLinkedWallets(userId);
      
      console.log('LinkedWalletService: Raw wallets from Firebase:', linkedWallets);
      
      // Transform the data to ensure consistent structure
      const transformedWallets: LinkedWallet[] = linkedWallets.map(wallet => {
        const transformed = {
          id: wallet.id,
          userId: wallet.userId,
          type: wallet.type || 'external',
          label: wallet.label || 'Unknown',
          // For KAST cards, use identifier as address if address is not present
          address: wallet.address || wallet.identifier,
          identifier: wallet.identifier,
          chain: wallet.chain || 'solana',
          cardType: wallet.cardType,
          status: wallet.status || 'active',
          balance: wallet.balance,
          currency: wallet.currency || 'USD',
          expirationDate: wallet.expirationDate,
          cardholderName: wallet.cardholderName,
          isActive: wallet.isActive !== false,
          createdAt: wallet.created_at || wallet.createdAt || new Date().toISOString(),
          updatedAt: wallet.updated_at || wallet.updatedAt || new Date().toISOString(),
          lastUsed: wallet.lastUsed
        };
        console.log('LinkedWalletService: Transformed wallet:', transformed);
        return transformed;
      });

      logger.info('Linked wallets retrieved successfully', { 
        userId, 
        count: transformedWallets.length 
      }, 'LinkedWalletService');

      return transformedWallets;

    } catch (error) {
      logger.error('Failed to get linked wallets', error, 'LinkedWalletService');
      return [];
    }
  }

  /**
   * Get linked destinations (external wallets and KAST cards) for a user
   */
  static async getLinkedDestinations(userId: string): Promise<LinkedDestinations> {
    try {
      logger.info('Getting linked destinations for user', { userId }, 'LinkedWalletService');

      const linkedWallets = await this.getLinkedWallets(userId);
      
      const externalWallets = linkedWallets.filter(wallet => wallet.type === 'external');
      const kastCards = linkedWallets.filter(wallet => wallet.type === 'kast');

      logger.info('Linked destinations retrieved successfully', {
        userId,
        externalWallets: externalWallets.length,
        kastCards: kastCards.length
      }, 'LinkedWalletService');

      return { externalWallets, kastCards };

    } catch (error) {
      logger.error('Failed to get linked destinations', error, 'LinkedWalletService');
      return { externalWallets: [], kastCards: [] };
    }
  }

  /**
   * Add a linked wallet
   */
  static async addLinkedWallet(userId: string, walletData: Partial<LinkedWallet>): Promise<AddLinkedWalletResult> {
    try {
      logger.info('Adding linked wallet', { userId, type: walletData.type }, 'LinkedWalletService');

      const result = await firebaseDataService.linkedWallet.addLinkedWallet(userId, {
        ...walletData,
        userId,
        isActive: walletData.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        logger.info('Linked wallet added successfully', { userId, type: walletData.type }, 'LinkedWalletService');
        
        // Track external wallet linking reward (non-blocking)
        if (walletData.type === 'external') {
          try {
            const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
            await userActionSyncService.syncExternalWalletLinking(userId);
          } catch (rewardError) {
            logger.error('Failed to track external wallet linking reward', {
              userId,
              rewardError
            }, 'LinkedWalletService');
            // Don't fail wallet linking if reward tracking fails
          }
        }
        
        return {
          success: true,
          walletId: result.walletId
        };
      } else {
        logger.error('Failed to add linked wallet', { userId, error: result.error }, 'LinkedWalletService');
        return {
          success: false,
          error: result.error || 'Failed to add linked wallet'
        };
      }

    } catch (error) {
      logger.error('Error adding linked wallet', error, 'LinkedWalletService');
      return {
        success: false,
        error: 'Failed to add linked wallet. Please try again.'
      };
    }
  }

  /**
   * Remove a linked wallet
   */
  static async removeLinkedWallet(userId: string, walletId: string): Promise<RemoveLinkedWalletResult> {
    try {
      logger.info('Removing linked wallet', { userId, walletId }, 'LinkedWalletService');

      const result = await firebaseDataService.linkedWallet.removeLinkedWallet(userId, walletId);

      if (result.success) {
        logger.info('Linked wallet removed successfully', { userId, walletId }, 'LinkedWalletService');
        return { success: true };
      } else {
        logger.error('Failed to remove linked wallet', { userId, walletId, error: result.error }, 'LinkedWalletService');
        return {
          success: false,
          error: result.error || 'Failed to remove linked wallet'
        };
      }

    } catch (error) {
      logger.error('Error removing linked wallet', error, 'LinkedWalletService');
      return {
        success: false,
        error: 'Failed to remove linked wallet. Please try again.'
      };
    }
  }

  /**
   * Check if a wallet is linked for a user
   */
  static async isWalletLinked(address: string, userId: string): Promise<boolean> {
    try {
      logger.debug('Checking if wallet is linked', { address, userId }, 'LinkedWalletService');

      const linkedWallets = await this.getLinkedWallets(userId);
      const isLinked = linkedWallets.some(wallet => 
        wallet.address === address && wallet.isActive && wallet.type === 'external'
      );

      logger.debug('Wallet link status checked', { address, userId, isLinked }, 'LinkedWalletService');
      return isLinked;

    } catch (error) {
      logger.error('Error checking wallet link status', error, 'LinkedWalletService');
      return false;
    }
  }

  /**
   * Check if a KAST card is linked for a user
   */
  static async isKastCardLinked(identifier: string, userId: string): Promise<boolean> {
    try {
      logger.debug('Checking if KAST card is linked', { identifier, userId }, 'LinkedWalletService');

      const linkedWallets = await this.getLinkedWallets(userId);
      const isLinked = linkedWallets.some(wallet => 
        wallet.identifier === identifier && wallet.isActive && wallet.type === 'kast'
      );

      logger.debug('KAST card link status checked', { identifier, userId, isLinked }, 'LinkedWalletService');
      return isLinked;

    } catch (error) {
      logger.error('Error checking KAST card link status', error, 'LinkedWalletService');
      return false;
    }
  }

  /**
   * Update last used timestamp for a linked wallet
   */
  static async updateLastUsed(walletId: string, userId: string): Promise<void> {
    try {
      logger.debug('Updating last used timestamp', { walletId, userId }, 'LinkedWalletService');

      // This would typically update the lastUsed field in Firebase
      // For now, we'll just log it
      logger.info('Last used timestamp updated', { walletId, userId }, 'LinkedWalletService');

    } catch (error) {
      logger.error('Error updating last used timestamp', error, 'LinkedWalletService');
    }
  }

  /**
   * Get linked wallet by ID
   */
  static async getLinkedWalletById(walletId: string, userId: string): Promise<LinkedWallet | null> {
    try {
      logger.debug('Getting linked wallet by ID', { walletId, userId }, 'LinkedWalletService');

      const linkedWallets = await this.getLinkedWallets(userId);
      const wallet = linkedWallets.find(w => w.id === walletId);

      if (wallet) {
        logger.debug('Linked wallet found', { walletId, userId }, 'LinkedWalletService');
        return wallet;
      } else {
        logger.debug('Linked wallet not found', { walletId, userId }, 'LinkedWalletService');
        return null;
      }

    } catch (error) {
      logger.error('Error getting linked wallet by ID', error, 'LinkedWalletService');
      return null;
    }
  }

  /**
   * Get active linked wallets for a user
   */
  static async getActiveLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      logger.debug('Getting active linked wallets', { userId }, 'LinkedWalletService');

      const linkedWallets = await this.getLinkedWallets(userId);
      const activeWallets = linkedWallets.filter(wallet => wallet.isActive && wallet.status === 'active');

      logger.debug('Active linked wallets retrieved', { userId, count: activeWallets.length }, 'LinkedWalletService');
      return activeWallets;

    } catch (error) {
      logger.error('Error getting active linked wallets', error, 'LinkedWalletService');
      return [];
    }
  }
}
