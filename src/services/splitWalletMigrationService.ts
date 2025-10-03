/**
 * Split Wallet Migration Service
 * Handles migration of existing split wallets with inconsistent amounts
 */

import { logger } from './loggingService';
import { MockupDataService } from '../data/mockupData';
import { SplitWalletService } from './splitWalletService';

export interface SplitWalletMigrationResult {
  success: boolean;
  migrated: boolean;
  oldAmount: number;
  newAmount: number;
  walletId: string;
  error?: string;
}

export class SplitWalletMigrationService {
  /**
   * Check if a split wallet needs migration due to amount inconsistency
   */
  static needsMigration(wallet: any): boolean {
    if (!wallet || !wallet.totalAmount) {
      return false;
    }
    
    const expectedAmount = MockupDataService.getBillAmount();
    return Math.abs(wallet.totalAmount - expectedAmount) > 0.01;
  }

  /**
   * Migrate a split wallet to use the unified mockup data amount
   */
  static async migrateSplitWallet(wallet: any): Promise<SplitWalletMigrationResult> {
    try {
      if (!wallet || !wallet.id) {
        return {
          success: false,
          migrated: false,
          oldAmount: 0,
          newAmount: 0,
          walletId: 'unknown',
          error: 'Invalid wallet data'
        };
      }

      const expectedAmount = MockupDataService.getBillAmount();
      const oldAmount = wallet.totalAmount || 0;
      
      // Check if migration is needed
      if (!this.needsMigration(wallet)) {
        return {
          success: true,
          migrated: false,
          oldAmount,
          newAmount: expectedAmount,
          walletId: wallet.id
        };
      }

      logger.info('Starting split wallet migration', {
        walletId: wallet.id,
        oldAmount,
        expectedAmount,
        billId: wallet.billId
      }, 'SplitWalletMigrationService');

      // Update the split wallet with the correct amount
      const updateResult = await SplitWalletService.updateSplitWalletAmount(
        wallet.id,
        expectedAmount,
        'USDC'
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update split wallet amount');
      }
      
      logger.info('Split wallet migration completed', {
        walletId: wallet.id,
        oldAmount,
        newAmount: expectedAmount,
        billId: wallet.billId
      }, 'SplitWalletMigrationService');

      return {
        success: true,
        migrated: true,
        oldAmount,
        newAmount: expectedAmount,
        walletId: wallet.id
      };

    } catch (error) {
      logger.error('Error during split wallet migration', error, 'SplitWalletMigrationService');
      
      return {
        success: false,
        migrated: false,
        oldAmount: wallet?.totalAmount || 0,
        newAmount: MockupDataService.getBillAmount(),
        walletId: wallet?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get migration recommendations for a split wallet
   */
  static getMigrationRecommendations(wallet: any): {
    needsMigration: boolean;
    currentAmount: number;
    expectedAmount: number;
    difference: number;
    recommendation: string;
  } {
    const expectedAmount = MockupDataService.getBillAmount();
    const currentAmount = wallet?.totalAmount || 0;
    const difference = Math.abs(currentAmount - expectedAmount);
    const needsMigration = difference > 0.01;

    let recommendation = '';
    if (!needsMigration) {
      recommendation = 'No migration needed - wallet amount is consistent';
    } else if (currentAmount < expectedAmount) {
      recommendation = `Wallet amount (${currentAmount}) is less than expected (${expectedAmount}). Consider updating to match bill amount.`;
    } else {
      recommendation = `Wallet amount (${currentAmount}) is more than expected (${expectedAmount}). Consider updating to match bill amount.`;
    }

    return {
      needsMigration,
      currentAmount,
      expectedAmount,
      difference,
      recommendation
    };
  }

  /**
   * Validate all split wallets for a user and return migration status
   */
  static async validateUserSplitWallets(userId: string): Promise<{
    totalWallets: number;
    needsMigration: number;
    recommendations: Array<{
      walletId: string;
      currentAmount: number;
      expectedAmount: number;
      recommendation: string;
    }>;
  }> {
    try {
      // In a real implementation, you would fetch all wallets for the user
      // For now, we'll return a placeholder response
      
      logger.info('Validating split wallets for user', { userId }, 'SplitWalletMigrationService');
      
      return {
        totalWallets: 0,
        needsMigration: 0,
        recommendations: []
      };

    } catch (error) {
      logger.error('Error validating user split wallets', error, 'SplitWalletMigrationService');
      
      return {
        totalWallets: 0,
        needsMigration: 0,
        recommendations: []
      };
    }
  }
}

export default SplitWalletMigrationService;
