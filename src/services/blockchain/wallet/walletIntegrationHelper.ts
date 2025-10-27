/**
 * Wallet Integration Helper
 * Easy integration examples for fixing wallet issues in existing screens
 */

import { walletIssueFixUtility } from './walletIssueFixUtility';
import { logger } from '../../core';

export class WalletIntegrationHelper {
  /**
   * Example: Fix wallet issues in FairSplitScreen
   * Add this to your handlePayMyShare function
   */
  static async fixWalletForPayment(userId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Fixing wallet for payment', { userId, amount }, 'WalletIntegrationHelper');

      const validationResult = await walletIssueFixUtility.validateWalletBeforeOperation(
        userId,
        'payment',
        amount,
        'USDC'
      );

      if (!validationResult.success || !validationResult.canProceed) {
        if (validationResult.shouldFix) {
          // Show fix dialog to user
          const userAcceptedFix = await walletIssueFixUtility.showWalletFixDialog(userId);
          if (!userAcceptedFix) {
            return false;
          }
        } else {
          // Show error to user
          logger.error('Wallet validation failed', { 
            userId, 
            error: validationResult.error 
          }, 'WalletIntegrationHelper');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error fixing wallet for payment', error, 'WalletIntegrationHelper');
      return false;
    }
  }

  /**
   * Example: Fix wallet issues in SendConfirmationScreen
   * Add this to your checkExistingWallet function
   */
  static async fixWalletForSend(userId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Fixing wallet for send', { userId, amount }, 'WalletIntegrationHelper');

      const validationResult = await walletIssueFixUtility.validateWalletBeforeOperation(
        userId,
        'send',
        amount,
        'USDC'
      );

      if (!validationResult.success || !validationResult.canProceed) {
        if (validationResult.shouldFix) {
          // Show fix dialog to user
          const userAcceptedFix = await walletIssueFixUtility.showWalletFixDialog(userId);
          if (!userAcceptedFix) {
            return false;
          }
        } else {
          // Show error to user
          logger.error('Wallet validation failed for send', { 
            userId, 
            error: validationResult.error 
          }, 'WalletIntegrationHelper');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error fixing wallet for send', error, 'WalletIntegrationHelper');
      return false;
    }
  }

  /**
   * Example: Check wallet health on screen load
   * Add this to your useEffect in any screen that uses wallets
   */
  static async checkWalletHealthOnLoad(userId: string): Promise<void> {
    try {
      logger.info('Checking wallet health on screen load', { userId }, 'WalletIntegrationHelper');

      const healthResult = await walletIssueFixUtility.checkWalletHealth(userId);
      
      if (!healthResult.healthy && healthResult.needsFix) {
        logger.warn('Wallet health issues detected', { 
          userId, 
          issues: healthResult.issues 
        }, 'WalletIntegrationHelper');
        
        // Optionally show a non-blocking notification to user
        // You can implement this based on your UI framework
      }
    } catch (error) {
      logger.error('Error checking wallet health on load', error, 'WalletIntegrationHelper');
    }
  }

  /**
   * Example: Get wallet balance with automatic fix
   * Use this instead of direct balance calls
   */
  static async getWalletBalanceWithAutoFix(
    userId: string,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      return await walletIssueFixUtility.getWalletBalanceWithFix(userId, currency);
    } catch (error) {
      logger.error('Error getting wallet balance with auto fix', error, 'WalletIntegrationHelper');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const walletIntegrationHelper = WalletIntegrationHelper;
