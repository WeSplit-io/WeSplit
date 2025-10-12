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
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('BalanceUtils: Failed to get SOL balance', {
        publicKey: publicKey.toBase58(),
        error: error instanceof Error ? error.message : String(error)
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
      const accountInfo = await getAccount(transactionUtils.getConnection(), usdcTokenAccount);
      
      return {
        balance: Number(accountInfo.amount) / 1000000, // USDC has 6 decimals
        accountExists: true
      };
    } catch (error) {
      // Token account doesn't exist, balance is 0 - this is normal for new wallets
      logger.info('BalanceUtils: USDC token account does not exist (normal for new wallets)', {
        publicKey: publicKey.toBase58(),
        usdcMint: usdcMint.toBase58()
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
