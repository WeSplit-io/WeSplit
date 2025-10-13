/**
 * Shared Balance Utilities
 * Centralizes balance calculation and formatting logic
 */

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { transactionUtils } from './transactionUtils';
import { logger } from '../loggingService';

export interface BalanceInfo {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

export interface UsdcBalanceResult {
  balance: number;
  accountExists: boolean;
}

export class BalanceUtils {
  /**
   * Get SOL balance for a wallet address
   */
  static async getSolBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await transactionUtils.getConnection().getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Add debugging for very small balances
      if (balance > 0 && solBalance === 0) {
        logger.warn('BalanceUtils: Very small SOL balance detected', {
          publicKey: publicKey.toBase58(),
          balanceLamports: balance,
          solBalance: solBalance,
          note: 'Balance is too small to be represented accurately'
        }, 'BalanceUtils');
      }
      
      logger.debug('BalanceUtils: SOL balance calculation', {
        publicKey: publicKey.toBase58(),
        balanceLamports: balance,
        solBalance: solBalance,
        lamportsPerSol: LAMPORTS_PER_SOL
      }, 'BalanceUtils');
      
      return solBalance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's an API key permission error
      if (errorMessage.includes('API key is not allowed to access blockchain') || 
          errorMessage.includes('403') ||
          errorMessage.includes('json-rpc code: -32052')) {
        logger.error('BalanceUtils: RPC API key permission error - switching to fallback endpoint', {
          publicKey: publicKey.toBase58(),
          error: errorMessage
        }, 'BalanceUtils');
        
        // Try to switch to next RPC endpoint
        try {
          await transactionUtils.switchToNextEndpoint();
          const balance = await transactionUtils.getConnection().getBalance(publicKey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          
          logger.info('BalanceUtils: Successfully retrieved balance using fallback endpoint', {
            publicKey: publicKey.toBase58(),
            solBalance: solBalance
          }, 'BalanceUtils');
          
          return solBalance;
        } catch (fallbackError) {
          logger.error('BalanceUtils: Fallback endpoint also failed', {
            publicKey: publicKey.toBase58(),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }, 'BalanceUtils');
        }
      }
      
      logger.error('BalanceUtils: Failed to get SOL balance', {
        publicKey: publicKey.toBase58(),
        error: errorMessage
      }, 'BalanceUtils');
      return 0;
    }
  }

  /**
   * Get USDC balance for a wallet address
   * Returns 0 if token account doesn't exist (normal for new wallets)
   */
  static async getUsdcBalance(publicKey: PublicKey, usdcMint: PublicKey): Promise<UsdcBalanceResult> {
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
      
      logger.debug('BalanceUtils: USDC token account derivation', {
        publicKey: publicKey.toBase58(),
        usdcMint: usdcMint.toBase58(),
        usdcTokenAccount: usdcTokenAccount.toBase58()
      }, 'BalanceUtils');
      
      const accountInfo = await getAccount(transactionUtils.getConnection(), usdcTokenAccount);
      
      logger.debug('BalanceUtils: USDC balance retrieved successfully', {
        publicKey: publicKey.toBase58(),
        balance: Number(accountInfo.amount) / 1000000,
        rawAmount: accountInfo.amount.toString()
      }, 'BalanceUtils');
      
      return {
        balance: Number(accountInfo.amount) / 1000000, // USDC has 6 decimals
        accountExists: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's an API key permission error
      if (errorMessage.includes('API key is not allowed to access blockchain') || 
          errorMessage.includes('403') ||
          errorMessage.includes('json-rpc code: -32052')) {
        logger.error('BalanceUtils: RPC API key permission error for USDC balance - switching to fallback endpoint', {
          publicKey: publicKey.toBase58(),
          usdcMint: usdcMint.toBase58(),
          error: errorMessage
        }, 'BalanceUtils');
        
        // Try to switch to next RPC endpoint
        try {
          await transactionUtils.switchToNextEndpoint();
          const accountInfo = await getAccount(transactionUtils.getConnection(), usdcTokenAccount);
          
          logger.info('BalanceUtils: Successfully retrieved USDC balance using fallback endpoint', {
            publicKey: publicKey.toBase58(),
            balance: Number(accountInfo.amount) / 1000000
          }, 'BalanceUtils');
          
          return {
            balance: Number(accountInfo.amount) / 1000000,
            accountExists: true
          };
        } catch (fallbackError) {
          logger.error('BalanceUtils: Fallback endpoint also failed for USDC balance', {
            publicKey: publicKey.toBase58(),
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }, 'BalanceUtils');
        }
      }
      
      // Token account doesn't exist, balance is 0 - this is normal for new wallets
      logger.info('BalanceUtils: USDC token account does not exist (normal for new wallets)', {
        publicKey: publicKey.toBase58(),
        usdcMint: usdcMint.toBase58(),
        error: errorMessage
      }, 'BalanceUtils');
      
      return {
        balance: 0,
        accountExists: false
      };
    }
  }

  /**
   * Get complete balance information for a wallet
   */
  static async getCompleteBalance(
    publicKey: PublicKey, 
    usdcMint: PublicKey, 
    solPrice: number = 0 // Default to 0 if price not available
  ): Promise<BalanceInfo> {
    try {
      const [solBalance, usdcResult] = await Promise.all([
        this.getSolBalance(publicKey),
        this.getUsdcBalance(publicKey, usdcMint)
      ]);

      const totalUSD = (solBalance * solPrice) + usdcResult.balance;

      logger.debug('BalanceUtils: Complete balance calculation', {
        publicKey: publicKey.toBase58(),
        solBalance,
        usdcBalance: usdcResult.balance,
        solPrice,
        totalUSD,
        usdcAccountExists: usdcResult.accountExists
      }, 'BalanceUtils');

      return {
        solBalance,
        usdcBalance: usdcResult.balance,
        totalUSD,
        address: publicKey.toBase58(),
        isConnected: true
      };
    } catch (error) {
      logger.error('BalanceUtils: Failed to get complete balance', {
        publicKey: publicKey.toBase58(),
        error: error instanceof Error ? error.message : String(error)
      }, 'BalanceUtils');
      
      return {
        solBalance: 0,
        usdcBalance: 0,
        totalUSD: 0,
        address: publicKey.toBase58(),
        isConnected: false
      };
    }
  }

  /**
   * Format balance for display
   */
  static formatBalance(balance: number, decimals: number = 6): string {
    return balance.toFixed(decimals);
  }

  /**
   * Format SOL balance for display
   */
  static formatSolBalance(balance: number): string {
    return this.formatBalance(balance, 6);
  }

  /**
   * Format USDC balance for display
   */
  static formatUsdcBalance(balance: number): string {
    return this.formatBalance(balance, 2);
  }

  /**
   * Check if balance is sufficient for a transaction
   */
  static hasSufficientBalance(currentBalance: number, requiredAmount: number): boolean {
    return currentBalance >= requiredAmount;
  }

  /**
   * Calculate remaining balance after transaction
   */
  static calculateRemainingBalance(currentBalance: number, transactionAmount: number): number {
    return Math.max(0, currentBalance - transactionAmount);
  }
}

export const balanceUtils = BalanceUtils;
