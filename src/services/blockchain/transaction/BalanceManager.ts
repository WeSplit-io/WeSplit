/**
 * Balance Manager
 * Handles wallet balance queries and management
 */

import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '../secureTokenUtils';
import { Connection } from '@solana/web3.js';
import { USDC_CONFIG } from '../../shared/walletConstants';  
import { getConfig } from '../../../config/unified';
import { balanceUtils } from '../../shared/balanceUtils';
import { logger } from '../../analytics/loggingService';
import { WalletBalance, UsdcBalanceResult, GasCheckResult } from './types';

export class BalanceManager {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(getConfig().blockchain.rpcUrl, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
    });
  }

  /**
   * Get user wallet balance
   */
  async getUserWalletBalance(userId: string): Promise<WalletBalance> {
    try {
      logger.info('Fetching user wallet balance', { userId });

      // Get user's wallet address
      const walletAddress = await this.getUserWalletAddress(userId);
      if (!walletAddress) {
        return { usdc: 0, sol: 0 };
      }

      const publicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
      
      // Get SOL price for accurate USD calculation
      let solPrice = 0;
      try {
        const { getCryptoPrice } = await import('../priceService');
        const priceData = await getCryptoPrice('SOL');
        solPrice = priceData?.price_usd || 0;
      } catch (priceError) {
        logger.warn('Failed to fetch SOL price, using 0 for USD calculation', { error: priceError }, 'BalanceManager');
      }
      
      const balance = await balanceUtils.getCompleteBalance(publicKey, usdcMint, solPrice);
      
      return {
        usdc: balance.usdcBalance,
        sol: balance.solBalance
      };

    } catch (error) {
      logger.error('Failed to get user wallet balance', error, 'BalanceManager');
      return { usdc: 0, sol: 0 };
    }
  }

  /**
   * Get USDC balance for a wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
    try {
      logger.info('Fetching USDC balance', { walletAddress });

      const publicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
      
      try {
        const tokenAccount = await getAssociatedTokenAddress(usdcMint, publicKey);
        const account = await getAccount(this.connection, tokenAccount);
        const balance = Number(account.amount) / Math.pow(10, 6); // USDC has 6 decimals

        logger.info('USDC balance fetched successfully', {
          walletAddress,
          balance
        });

        return {
          success: true,
          balance
        };

      } catch (error) {
        // Token account doesn't exist, balance is 0
        logger.info('USDC token account not found, balance is 0', { walletAddress }, 'BalanceManager');
        return {
          success: true,
          balance: 0
        };
      }

    } catch (error) {
      logger.error('Failed to get USDC balance', error, 'BalanceManager');
      return {
        success: false,
        balance: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if user has sufficient SOL for gas fees
   */
  async hasSufficientSolForGas(userId: string): Promise<GasCheckResult> {
    try {
      logger.info('Checking SOL balance for gas fees', { userId });

      const walletAddress = await this.getUserWalletAddress(userId);
      if (!walletAddress) {
        return {
          hasSufficient: false,
          currentSol: 0,
          requiredSol: 0.001 // Minimum SOL for gas
        };
      }

      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      const currentSol = balance / 1_000_000_000; // Convert lamports to SOL
      const requiredSol = 0.001; // Minimum SOL for gas fees

      const hasSufficient = currentSol >= requiredSol;

      logger.info('SOL gas check completed', {
        userId,
        currentSol,
        requiredSol,
        hasSufficient
      });

      return {
        hasSufficient,
        currentSol,
        requiredSol
      };

    } catch (error) {
      logger.error('Failed to check SOL balance for gas', error, 'BalanceManager');
      return {
        hasSufficient: false,
        currentSol: 0,
        requiredSol: 0.001
      };
    }
  }

  /**
   * Get user's wallet address
   */
  private async getUserWalletAddress(userId: string): Promise<string | null> {
    try {
      // Import wallet service dynamically to avoid circular dependencies
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(userId);
      return walletResult.success && walletResult.wallet ? walletResult.wallet.address : null;
    } catch (error) {
      logger.error('Failed to get user wallet address', error, 'BalanceManager');
      return null;
    }
  }
}
