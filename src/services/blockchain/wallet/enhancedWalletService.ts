/**
 * Enhanced Wallet Service
 * Uses WalletValidationService to ensure proper wallet validation and recovery
 * Fixes off-curve wallet issues and ensures consistent wallet behavior
 */

import { logger } from '../../core';
import { walletValidationService } from './walletValidationService';
import { simplifiedWalletService } from './simplifiedWalletService';

export interface EnhancedWalletResult {
  success: boolean;
  wallet?: {
    keypair: any;
    address: string;
    derivationPath: string;
  };
  error?: string;
  recoveryMethod?: string;
}

export class EnhancedWalletService {
  /**
   * Get user wallet with validation and recovery
   */
  static async getUserWalletWithValidation(userId: string): Promise<EnhancedWalletResult> {
    try {
      logger.info('Getting user wallet with validation', { userId }, 'EnhancedWalletService');

      // Step 1: Try to get wallet using existing service
      const existingWallet = await simplifiedWalletService.getWalletInfo(userId);
      if (existingWallet) {
        logger.info('Found existing wallet', { 
          userId, 
          address: existingWallet.address 
        }, 'EnhancedWalletService');

        // Validate the existing wallet
        const validationResult = await walletValidationService.validateAndRepairWallet(
          userId, 
          existingWallet.address
        );

        if (validationResult.success && validationResult.recoveredWallet) {
          return {
            success: true,
            wallet: validationResult.recoveredWallet,
            recoveryMethod: validationResult.recoveryMethod
          };
        } else {
          logger.warn('Existing wallet validation failed, trying recovery', { 
            userId, 
            address: existingWallet.address,
            error: validationResult.error
          }, 'EnhancedWalletService');
        }
      }

      // Step 2: Try comprehensive wallet recovery
      logger.info('Attempting comprehensive wallet recovery', { userId }, 'EnhancedWalletService');
      
      // First, try to ensure user has a wallet
      const walletResult = await simplifiedWalletService.ensureUserWallet(userId);
      if (walletResult.success && walletResult.wallet) {
        const expectedAddress = walletResult.wallet.address;
        
        const recoveryResult = await walletValidationService.validateAndRepairWallet(
          userId, 
          expectedAddress
        );

        if (recoveryResult.success && recoveryResult.recoveredWallet) {
          logger.info('Wallet recovered successfully', { 
            userId, 
            address: recoveryResult.recoveredWallet.address,
            method: recoveryResult.recoveryMethod
          }, 'EnhancedWalletService');
          
          return {
            success: true,
            wallet: recoveryResult.recoveredWallet,
            recoveryMethod: recoveryResult.recoveryMethod
          };
        }
      }

      return {
        success: false,
        error: 'Unable to get or recover user wallet'
      };
    } catch (error) {
      logger.error('Failed to get user wallet with validation', error, 'EnhancedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get wallet balance with validation
   */
  static async getValidatedWalletBalance(
    userId: string,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      // Get validated wallet first
      const walletResult = await this.getUserWalletWithValidation(userId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Failed to get validated wallet'
        };
      }

      // Get balance using validated wallet
      const balanceResult = await walletValidationService.getValidatedWalletBalance(
        walletResult.wallet.address,
        currency
      );

      return balanceResult;
    } catch (error) {
      logger.error('Failed to get validated wallet balance', error, 'EnhancedWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate wallet before transaction
   */
  static async validateWalletForTransaction(
    userId: string,
    amount: number,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ 
    success: boolean; 
    canProceed: boolean; 
    wallet?: any; 
    balance?: number; 
    error?: string 
  }> {
    try {
      logger.info('Validating wallet for transaction', { 
        userId, 
        amount, 
        currency 
      }, 'EnhancedWalletService');

      // Get validated wallet
      const walletResult = await this.getUserWalletWithValidation(userId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          canProceed: false,
          error: walletResult.error || 'Failed to get validated wallet'
        };
      }

      // Get validated balance
      const balanceResult = await this.getValidatedWalletBalance(userId, currency);
      if (!balanceResult.success) {
        return {
          success: false,
          canProceed: false,
          error: balanceResult.error || 'Failed to get wallet balance'
        };
      }

      const balance = balanceResult.balance || 0;
      const canProceed = balance >= amount;

      logger.info('Wallet validation completed', { 
        userId, 
        address: walletResult.wallet.address,
        balance, 
        amount, 
        canProceed,
        recoveryMethod: walletResult.recoveryMethod
      }, 'EnhancedWalletService');

      return {
        success: true,
        canProceed,
        wallet: walletResult.wallet,
        balance,
        error: canProceed ? undefined : `Insufficient ${currency} balance. Required: ${amount}, Available: ${balance}`
      };
    } catch (error) {
      logger.error('Failed to validate wallet for transaction', error, 'EnhancedWalletService');
      return {
        success: false,
        canProceed: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fix wallet issues for a user
   */
  static async fixWalletIssues(userId: string): Promise<{ 
    success: boolean; 
    fixed: boolean; 
    error?: string; 
    details?: string 
  }> {
    try {
      logger.info('Starting wallet issue fix for user', { userId }, 'EnhancedWalletService');

      // Try to get wallet with validation
      const walletResult = await this.getUserWalletWithValidation(userId);
      if (!walletResult.success) {
        return {
          success: false,
          fixed: false,
          error: walletResult.error || 'Failed to get or recover wallet'
        };
      }

      // Check if wallet was recovered (indicating there were issues)
      const wasFixed = walletResult.recoveryMethod !== undefined;
      
      logger.info('Wallet issue fix completed', { 
        userId, 
        address: walletResult.wallet.address,
        wasFixed,
        recoveryMethod: walletResult.recoveryMethod
      }, 'EnhancedWalletService');

      return {
        success: true,
        fixed: wasFixed,
        details: wasFixed ? `Wallet recovered using ${walletResult.recoveryMethod} method` : 'Wallet was already valid'
      };
    } catch (error) {
      logger.error('Failed to fix wallet issues', error, 'EnhancedWalletService');
      return {
        success: false,
        fixed: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const enhancedWalletService = EnhancedWalletService;
