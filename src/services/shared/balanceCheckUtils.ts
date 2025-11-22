/**
 * Balance Check Utilities
 * Centralized balance checking with fallback logic for all transaction types
 * Provides consistent, reliable balance checking across the application
 */

import { logger } from '../analytics/loggingService';

export interface BalanceCheckResult {
  usdcBalance: number;
  solBalance: number;
  source: 'consolidated' | 'wallet' | 'live' | 'direct';
  isReliable: boolean; // true if from a reliable source with retry logic
}

export interface BalanceCheckOptions {
  useLiveBalance?: boolean;
  walletAddress?: string;
}

/**
 * Get user balance with intelligent fallback strategy
 * 
 * Fallback order:
 * 1. consolidatedTransactionService.getUserWalletBalance() - has retry logic
 * 2. walletService.getUserWalletBalance() - has endpoint rotation retry
 * 3. LiveBalanceService (if useLiveBalance=true) - polling service
 * 4. BalanceUtils.getUsdcBalance() - direct RPC call (last resort)
 * 
 * @param userId - User ID to check balance for
 * @param options - Optional configuration for balance checking
 * @returns BalanceCheckResult with balance and metadata about the source
 */
export async function getUserBalanceWithFallback(
  userId: string,
  options: BalanceCheckOptions = {}
): Promise<BalanceCheckResult> {
  const { useLiveBalance = false, walletAddress } = options;

  // Strategy 1: Try consolidatedTransactionService first (has retry logic)
  try {
    const { consolidatedTransactionService } = await import('../blockchain/transaction/ConsolidatedTransactionService');
    const balance = await consolidatedTransactionService.getUserWalletBalance(userId);
    
    // Only return if we got a balance > 0, or if we got a successful response with 0
    // But if balance is 0, we should still try other methods in case it's a network failure
    if (balance) {
      // If balance > 0, it's definitely reliable
      if (balance.usdc > 0 || balance.sol > 0) {
        logger.info('Balance retrieved from consolidatedTransactionService', {
          userId,
          usdcBalance: balance.usdc,
          solBalance: balance.sol
        }, 'balanceCheckUtils');
        
        return {
          usdcBalance: balance.usdc || 0,
          solBalance: balance.sol || 0,
          source: 'consolidated',
          isReliable: true
        };
      }
      
      // If balance is 0, it might be a network failure, so continue to try other methods
      // Only return 0 if all other methods also fail
      logger.debug('consolidatedTransactionService returned 0 balance, trying other methods', {
        userId
      }, 'balanceCheckUtils');
    }
  } catch (error) {
    logger.warn('consolidatedTransactionService balance check failed, trying fallback', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    }, 'balanceCheckUtils');
  }

  // Strategy 2: Fallback to walletService (has endpoint rotation retry)
  try {
    const { walletService } = await import('../blockchain/wallet');
    const balance = await walletService.getUserWalletBalance(userId);
    
    if (balance) {
      // If balance > 0, it's definitely reliable
      if (balance.usdcBalance > 0 || balance.solBalance > 0) {
        logger.info('Balance retrieved from walletService', {
          userId,
          usdcBalance: balance.usdcBalance,
          solBalance: balance.solBalance
        }, 'balanceCheckUtils');
        
        return {
          usdcBalance: balance.usdcBalance || 0,
          solBalance: balance.solBalance || 0,
          source: 'wallet',
          isReliable: true
        };
      }
      
      // If balance is 0, continue to try other methods
      logger.debug('walletService returned 0 balance, trying other methods', {
        userId
      }, 'balanceCheckUtils');
    }
  } catch (error) {
    logger.warn('walletService balance check failed, trying fallback', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    }, 'balanceCheckUtils');
  }

  // Strategy 3: Try LiveBalanceService if enabled and address provided
  if (useLiveBalance && walletAddress) {
    try {
      const { liveBalanceService } = await import('../blockchain/balance/LiveBalanceService');
      
      // Force an update to get the latest balance
      await liveBalanceService.forceUpdate(walletAddress);
      
      // Check if there's an existing subscription with balance data
      // Note: LiveBalanceService doesn't expose subscriptions directly, so we subscribe temporarily
      let balanceReceived = false;
      let receivedBalance: { usdcBalance: number; solBalance: number } | null = null;
      
      const subscriptionId = liveBalanceService.subscribe(walletAddress, (update) => {
        if (update.usdcBalance !== null && update.usdcBalance !== undefined) {
          receivedBalance = {
            usdcBalance: update.usdcBalance,
            solBalance: update.solBalance || 0
          };
          balanceReceived = true;
          liveBalanceService.unsubscribe(subscriptionId);
        }
      });
      
      // Wait up to 1.5 seconds for balance to arrive
      const maxWait = 1500;
      const startTime = Date.now();
      while (!balanceReceived && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!balanceReceived) {
        liveBalanceService.unsubscribe(subscriptionId);
      }
      
      if (receivedBalance) {
        logger.info('Balance retrieved from LiveBalanceService', {
          userId,
          walletAddress,
          usdcBalance: receivedBalance.usdcBalance,
          solBalance: receivedBalance.solBalance
        }, 'balanceCheckUtils');
        
        return {
          usdcBalance: receivedBalance.usdcBalance,
          solBalance: receivedBalance.solBalance,
          source: 'live',
          isReliable: true // LiveBalanceService is reliable as it polls and eventually succeeds
        };
      }
    } catch (error) {
      logger.warn('LiveBalanceService balance check failed, trying last resort', {
        userId,
        walletAddress,
        error: error instanceof Error ? error.message : String(error)
      }, 'balanceCheckUtils');
    }
  }

  // Strategy 4: Last resort - direct RPC call via BalanceUtils
  if (walletAddress) {
    try {
      const { BalanceUtils } = await import('./balanceUtils');
      const { PublicKey } = await import('@solana/web3.js');
      const { getConfig } = await import('../../config/unified');
      
      const userPublicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
      
      const balanceResult = await BalanceUtils.getUsdcBalance(userPublicKey, usdcMint);
      const solBalance = await BalanceUtils.getSolBalance(userPublicKey);
      
      logger.info('Balance retrieved from direct RPC call (last resort)', {
        userId,
        walletAddress,
        usdcBalance: balanceResult.balance,
        solBalance
      }, 'balanceCheckUtils');
      
      return {
        usdcBalance: balanceResult.balance || 0,
        solBalance: solBalance || 0,
        source: 'direct',
        isReliable: false // Direct RPC calls are less reliable (no retry logic)
      };
    } catch (error) {
      logger.error('All balance check strategies failed', {
        userId,
        walletAddress,
        error: error instanceof Error ? error.message : String(error)
      }, 'balanceCheckUtils');
    }
  }

  // If all strategies fail or return 0, return 0 balance with unreliable flag
  // This allows the transaction to proceed (blockchain will reject if truly insufficient)
  logger.warn('All balance check strategies failed or returned 0, returning unreliable 0 balance', {
    userId,
    walletAddress,
    note: 'Transaction will be allowed to proceed - blockchain will reject if balance is truly insufficient'
  }, 'balanceCheckUtils');
  
  return {
    usdcBalance: 0,
    solBalance: 0,
    source: 'direct',
    isReliable: false
  };
}

