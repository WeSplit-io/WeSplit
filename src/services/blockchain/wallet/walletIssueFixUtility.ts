/**
 * Wallet Issue Fix Utility
 * Utility functions to fix off-curve wallet issues in existing code
 * Can be called from screens or services to resolve wallet problems
 */

import { logger } from '../../core';
import { walletRecoveryService } from './walletRecoveryService';
import { walletService } from './simplifiedWalletService';
import { Alert } from 'react-native';

export interface WalletFixResult {
  success: boolean;
  fixed: boolean;
  error?: string;
  details?: string;
}

export class WalletIssueFixUtility {
  /**
   * Fix wallet issues for the current user
   * Call this when you encounter wallet problems
   */
  static async fixCurrentUserWallet(userId: string): Promise<WalletFixResult> {
    try {
      logger.info('Starting wallet fix for current user', { userId }, 'WalletIssueFixUtility');

      // Use wallet recovery service to fix wallet issues
      const result = await walletRecoveryService.recoverWallet(userId);
      
      if (result.success && result.wallet) {
        logger.info('Wallet recovered successfully', { 
          userId, 
          address: result.wallet.address
        }, 'WalletIssueFixUtility');
        
        return {
          success: true,
          fixed: true,
          details: `Wallet recovered: ${result.wallet.address}`
        };
      } else {
        logger.error('Failed to recover wallet', { 
          userId, 
          error: result.error 
        }, 'WalletIssueFixUtility');
        
        return {
          success: false,
          fixed: false,
          error: result.error || 'Failed to recover wallet'
        };
      }
    } catch (error) {
      logger.error('Error fixing wallet issues', error, 'WalletIssueFixUtility');
      return {
        success: false,
        fixed: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate wallet before performing operations
   * Use this before any wallet-dependent operations
   */
  static async validateWalletBeforeOperation(
    userId: string,
    operation: string,
    amount?: number,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ 
    success: boolean; 
    canProceed: boolean; 
    error?: string; 
    shouldFix?: boolean 
  }> {
    try {
      logger.info('Validating wallet before operation', { 
        userId, 
        operation, 
        amount, 
        currency 
      }, 'WalletIssueFixUtility');

      // Try to get wallet info first
      const walletResult = await walletService.getWalletInfo(userId);
      
      if (!walletResult) {
        // If no wallet found, try to recover
        logger.warn('No wallet found, attempting recovery', { userId }, 'WalletIssueFixUtility');
        
        const fixResult = await this.fixCurrentUserWallet(userId);
        
        if (fixResult.success && fixResult.fixed) {
          return {
            success: true,
            canProceed: true,
            shouldFix: true
          };
        } else {
          return {
            success: false,
            canProceed: false,
            error: fixResult.error || 'No wallet found',
            shouldFix: false
          };
        }
      }

      // Wallet exists, check if it's valid
      if (!walletResult.address || !walletResult.publicKey) {
        logger.warn('Invalid wallet data, attempting recovery', { userId }, 'WalletIssueFixUtility');
        
        const fixResult = await this.fixCurrentUserWallet(userId);
        
        if (fixResult.success && fixResult.fixed) {
          return {
            success: true,
            canProceed: true,
            shouldFix: true
          };
        } else {
          return {
            success: false,
            canProceed: false,
            error: fixResult.error || 'Invalid wallet data',
            shouldFix: false
          };
        }
      }

      return {
        success: true,
        canProceed: true,
        shouldFix: false
      };
    } catch (error) {
      logger.error('Error validating wallet before operation', error, 'WalletIssueFixUtility');
      return {
        success: false,
        canProceed: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        shouldFix: false
      };
    }
  }

  /**
   * Show user-friendly wallet fix dialog
   */
  static async showWalletFixDialog(userId: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Wallet Issue Detected',
        'We detected an issue with your wallet. This can happen when wallet credentials are corrupted or when using an incompatible wallet format. Would you like us to fix this automatically?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Fix Wallet',
            onPress: async () => {
              try {
                const result = await this.fixCurrentUserWallet(userId);
                
                if (result.success && result.fixed) {
                  Alert.alert(
                    'Wallet Fixed',
                    'Your wallet has been successfully fixed! You can now use it normally.',
                    [{ text: 'OK', onPress: () => resolve(true) }]
                  );
                } else if (result.success && !result.fixed) {
                  Alert.alert(
                    'No Issues Found',
                    'Your wallet appears to be working correctly. The issue might be temporary.',
                    [{ text: 'OK', onPress: () => resolve(true) }]
                  );
                } else {
                  Alert.alert(
                    'Fix Failed',
                    `We couldn't fix your wallet automatically. Please contact support. Error: ${result.error}`,
                    [{ text: 'OK', onPress: () => resolve(false) }]
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Fix Failed',
                  'An error occurred while fixing your wallet. Please contact support.',
                  [{ text: 'OK', onPress: () => resolve(false) }]
                );
              }
            }
          }
        ]
      );
    });
  }

  /**
   * Get wallet balance with automatic fix if needed
   */
  static async getWalletBalanceWithFix(
    userId: string,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      logger.info('Getting wallet balance with automatic fix', { 
        userId, 
        currency 
      }, 'WalletIssueFixUtility');

      // First try to get balance normally
      const balanceResult = await walletService.getUserWalletBalance(userId);
      
      if (balanceResult) {
        return {
          success: true,
          balance: currency === 'USDC' ? balanceResult.usdcBalance : balanceResult.solBalance
        };
      }

      // If that failed, try to fix the wallet
      logger.warn('Balance check failed, attempting wallet fix', { 
        userId 
      }, 'WalletIssueFixUtility');
      
      const fixResult = await this.fixCurrentUserWallet(userId);
      
      if (fixResult.success && fixResult.fixed) {
        // Retry balance check after fix
        const retryResult = await walletService.getUserWalletBalance(userId);
        if (retryResult) {
          return {
            success: true,
            balance: currency === 'USDC' ? retryResult.usdcBalance : retryResult.solBalance
          };
        }
      }
      
      return {
        success: false,
        error: fixResult.error || 'Failed to get wallet balance'
      };
    } catch (error) {
      logger.error('Error getting wallet balance with fix', error, 'WalletIssueFixUtility');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if wallet needs fixing
   */
  static async checkWalletHealth(userId: string): Promise<{ 
    healthy: boolean; 
    issues: string[]; 
    needsFix: boolean 
  }> {
    try {
      logger.info('Checking wallet health', { userId }, 'WalletIssueFixUtility');

      const issues: string[] = [];
      let needsFix = false;

      // Check if we can get wallet info
      const walletResult = await walletService.getWalletInfo(userId);
      if (!walletResult) {
        issues.push('Cannot access wallet');
        needsFix = true;
      }

      // Check if we can get balance
      const balanceResult = await walletService.getUserWalletBalance(userId);
      if (!balanceResult) {
        issues.push('Cannot get wallet balance');
        needsFix = true;
      }

      const healthy = issues.length === 0;

      logger.info('Wallet health check completed', { 
        userId, 
        healthy, 
        issuesCount: issues.length, 
        needsFix 
      }, 'WalletIssueFixUtility');

      return {
        healthy,
        issues,
        needsFix
      };
    } catch (error) {
      logger.error('Error checking wallet health', error, 'WalletIssueFixUtility');
      return {
        healthy: false,
        issues: ['Health check failed'],
        needsFix: true
      };
    }
  }
}

export const walletIssueFixUtility = WalletIssueFixUtility;
