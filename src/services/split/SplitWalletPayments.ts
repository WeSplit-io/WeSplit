/**
 * Split Wallet Payments Service - CLEAN VERSION
 * Handles all payment operations for split wallets with clear separation between fair and degen splits
 * Part of the modularized SplitWalletService
 */

import { logger } from '../core';
import { roundUsdcAmount } from '../../utils/ui/format';
import type { SplitWalletParticipant, SplitWalletResult, PaymentResult } from './types';
// Firebase and BalanceUtils are dynamically imported to reduce bundle size

// Dev-only verbose logging flag for split payments and balance checks.
// This mirrors the split queries hook pattern and prevents large payload
// logs from spamming production.
const ENABLE_VERBOSE_SPLIT_LOGS =
  __DEV__ && (process.env.ENABLE_VERBOSE_SPLIT_LOGS === '1' || process.env.ENABLE_VERBOSE_SPLIT_LOGS === 'true');

// Helper function to verify transaction on blockchain
async function verifyTransactionOnBlockchain(transactionSignature: string): Promise<boolean> {
  try {
    const { transactionUtils } = await import('../shared/transactionUtils');
    const connection = await transactionUtils.getConnection();
    
    const transactionStatus = await connection.getSignatureStatus(transactionSignature, { 
      searchTransactionHistory: true 
    });
    
    if (transactionStatus.value?.confirmationStatus) {
      logger.info('Transaction confirmation status', {
        transactionSignature,
        confirmationStatus: transactionStatus.value.confirmationStatus,
        slot: transactionStatus.value.slot,
        err: transactionStatus.value.err
      }, 'SplitWalletPayments');
      
      return transactionStatus.value.err === null && 
             (transactionStatus.value.confirmationStatus === 'confirmed' || 
              transactionStatus.value.confirmationStatus === 'finalized');
    }
    
    return false;
  } catch (error) {
    logger.warn('Could not verify transaction status', {
      transactionSignature,
      error
    }, 'SplitWalletPayments');
    return false;
  }
}




export class SplitWalletPayments {
  // ===== PRIVATE HELPER METHODS =====

  /**
   * Check user's USDC balance before payment
   * Returns error message if insufficient, null if OK
   */
  private static async checkUserBalance(
    userId: string,
    walletAddress: string,
    amount: number,
    context: string
  ): Promise<string | null> {
      try {
        const { FeeService } = await import('../../config/constants/feeConfig');
        const { getUserBalanceWithFallback } = await import('../shared/balanceCheckUtils');
        
      const roundedAmount = roundUsdcAmount(amount);
      const balanceResult = await getUserBalanceWithFallback(userId, {
          useLiveBalance: true,
        walletAddress: walletAddress
        });
        
        const userUsdcBalance = balanceResult.usdcBalance;
        const { totalAmount: totalPaymentAmount } = FeeService.calculateCompanyFee(roundedAmount, 'split_payment');
      const feeAmount = totalPaymentAmount - roundedAmount;
        
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info(`User USDC balance check for ${context}`, {
          userId,
          walletAddress,
          userUsdcBalance,
          shareAmount: roundedAmount,
          totalPaymentAmount,
          feeAmount,
          source: balanceResult.source,
          isReliable: balanceResult.isReliable
        }, 'SplitWalletPayments');
      }

        if (balanceResult.isReliable && userUsdcBalance < totalPaymentAmount) {
        return `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${feeAmount.toFixed(6)} USDC in fees). Please add USDC to your wallet first.`;
        }
        
        if (!balanceResult.isReliable && userUsdcBalance > 0 && userUsdcBalance < totalPaymentAmount) {
          logger.warn('Balance check unreliable but shows insufficient balance, blocking transaction', {
            userUsdcBalance,
            totalPaymentAmount,
            source: balanceResult.source
          }, 'SplitWalletPayments');
        return `Insufficient USDC balance. You have ${userUsdcBalance.toFixed(6)} USDC but need ${totalPaymentAmount.toFixed(6)} USDC to make this payment (${roundedAmount.toFixed(6)} USDC for your share + ${feeAmount.toFixed(6)} USDC in fees). Please add USDC to your wallet first.`;
        }
        
        if (!balanceResult.isReliable && userUsdcBalance === 0) {
        logger.warn('Balance check unavailable, allowing transaction to proceed', {
          walletAddress,
            source: balanceResult.source
          }, 'SplitWalletPayments');
        }
      
      return null; // OK to proceed
    } catch (error) {
        logger.warn('Failed to check user USDC balance, proceeding with transaction', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        context
      } as any, 'SplitWalletPayments');
      return null; // Continue with transaction - balance check is not critical
    }
      }

  /**
   * Execute split payment transaction
   */
  private static async executePaymentTransaction(params: {
    userId: string;
    context: 'fair_split_contribution' | 'degen_split_lock';
    amount: number;
    splitWalletId: string;
    billId: string;
    memo: string;
  }): Promise<{ success: boolean; transactionSignature?: string; error?: string }> {
    try {
      const { CentralizedTransactionHandler } = await import('../transactions/CentralizedTransactionHandler');
      const transactionResult = await CentralizedTransactionHandler.executeTransaction({
        userId: params.userId,
        context: params.context,
        amount: params.amount,
        currency: 'USDC',
        splitWalletId: params.splitWalletId,
        splitId: params.splitWalletId,
        billId: params.billId,
        memo: params.memo
      });

      if (!transactionResult.success) {
        let userFriendlyError = transactionResult.error || 'Transaction failed';
        
        if (transactionResult.error?.includes('Insufficient USDC balance') ||
            transactionResult.error?.includes('Attempt to debit an account but found no record of a prior credit')) {
          userFriendlyError = 'Insufficient USDC balance. Please add USDC to your wallet before making this payment.';
        } else if (transactionResult.error?.includes('blockhash') ||
                  transactionResult.error?.includes('timeout') ||
                  transactionResult.error?.includes('duplicate')) {
          userFriendlyError = 'Transaction processing error. Please check your transaction history before trying again.';
        }
        
        return {
          success: false,
          error: userFriendlyError,
          transactionSignature: transactionResult.transactionSignature
        };
      }

      return {
        success: true,
        transactionSignature: transactionResult.transactionSignature
      };
    } catch (error) {
      logger.error(`Error executing ${params.context} transaction`, {
        error: error instanceof Error ? error.message : String(error),
        userId: params.userId,
        splitWalletId: params.splitWalletId
      } as any, 'SplitWalletPayments');
            
            return {
              success: false,
        error: error instanceof Error ? error.message : 'Transaction execution failed'
            };
    }
          }

  /**
   * Save payment transaction to database
   */
  private static async savePaymentTransaction(params: {
    userId: string;
    toAddress: string;
    amount: number;
    signature: string;
    memo: string;
    transactionType?: string;
  }): Promise<void> {
      // PERF: Skip post-processing for split flows to avoid OOM; on-chain tx is authoritative.
      const txType = (params.transactionType || 'split_payment') as 'split_payment' | 'split_wallet_withdrawal' | 'external_payment';
      if (txType === 'split_payment' || txType === 'split_wallet_withdrawal') {
        logger.info('Skipping post-processing for split flow (lightweight path)', {
          userId: params.userId,
          signature: params.signature,
          transactionType: txType,
        }, 'SplitWalletPayments');
        return;
      }
      try {
        const { saveTransactionAndAwardPoints } = await import('../shared/transactionPostProcessing');
        const { FeeService } = await import('../../config/constants/feeConfig');
        
      const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(params.amount, txType);
        
        await saveTransactionAndAwardPoints({
        userId: params.userId,
        toAddress: params.toAddress,
        amount: params.amount,
        signature: params.signature,
        transactionType: txType,
          companyFee: companyFee,
          netAmount: recipientAmount,
        memo: params.memo,
          currency: 'USDC'
        });
        
      logger.info('✅ Payment transaction saved and points awarded', {
        signature: params.signature,
        userId: params.userId,
        amount: params.amount
        }, 'SplitWalletPayments');
    } catch (error) {
      logger.error('❌ Failed to save payment transaction', error as any, 'SplitWalletPayments');
        // Don't fail the transaction if database save fails
      }
  }

  // ===== PUBLIC METHODS =====

  // ✅ OPTIMIZATION: Balance cache to prevent redundant RPC calls
  private static balanceCache = new Map<string, { balance: number; timestamp: number }>();
  private static readonly BALANCE_CACHE_TTL = 3000; // 3 seconds cache for split wallets

  /**
   * Verify split wallet balance against blockchain data
   * Works for both fair split and degen split wallets
   * ✅ OPTIMIZED: Uses ConsolidatedTransactionService for caching and deduplication
   */
  static async verifySplitWalletBalance(splitWalletId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Verifying split wallet balance', { splitWalletId }, 'SplitWalletPayments');
      }
      
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;
      const walletAddress = wallet.walletAddress;

      // ✅ OPTIMIZATION: Check cache first to avoid redundant RPC calls
      const cached = this.balanceCache.get(walletAddress);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < this.BALANCE_CACHE_TTL) {
        if (ENABLE_VERBOSE_SPLIT_LOGS) {
          logger.debug('Split wallet balance retrieved from cache', {
            splitWalletId,
            balance: cached.balance,
            cacheAge: now - cached.timestamp
          }, 'SplitWalletPayments');
        }
        return {
          success: true,
          balance: cached.balance
        };
      }

      // ✅ OPTIMIZATION: Use ConsolidatedTransactionService which has its own caching and deduplication
      // This prevents loading solana modules multiple times and reduces memory usage
      const { consolidatedTransactionService } = await import('../blockchain/transaction/ConsolidatedTransactionService');
      const balanceResult = await consolidatedTransactionService.getUsdcBalance(walletAddress);
      
      if (!balanceResult.success) {
        logger.error('Failed to get USDC balance from blockchain', {
          splitWalletId,
          walletAddress,
          error: balanceResult.error
        }, 'SplitWalletPayments');
        return {
          success: false,
          error: balanceResult.error || 'Failed to get USDC balance from blockchain'
        };
      }

      const balance = balanceResult.balance || 0;

      // Cache the result
      this.balanceCache.set(walletAddress, {
        balance,
        timestamp: now
      });

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Split wallet balance verified', {
          splitWalletId,
          balance: balance,
          currency: wallet.currency as 'USDC' | 'SOL',
          fromCache: false
        }, 'SplitWalletPayments');
      }
      
      return {
        success: true,
        balance: balance
      };
    } catch (error) {
      logger.error('Failed to verify split wallet balance', error as any, 'SplitWalletPayments');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }


  /**
   * Process degen split fund locking (participants lock funds but status remains 'locked', not 'paid')
   */
  static async processDegenFundLocking(
    splitWalletId: string,
    participantId: string,
    amount: number,
    transactionSignature?: string
  ): Promise<PaymentResult> {
    const { processDegenFundLocking: handler } = await import('./handlers/ParticipantPaymentHandlers');
    return handler(
          splitWalletId,
        participantId,
      amount,
      transactionSignature,
      (id: string) => this.getSplitWallet(id),
      (userId: string, walletAddress: string, amount: number, context: string) => this.checkUserBalance(userId, walletAddress, amount, context),
      (params: any) => this.executePaymentTransaction(params),
      (params: any) => this.savePaymentTransaction(params)
    );
  }

  /**
   * Process participant payment to split wallet (Fair Split)
   */
  static async processParticipantPayment(
    splitWalletId: string,
    participantId: string,
    amount: number,
    transactionSignature?: string
  ): Promise<PaymentResult> {
    const { processParticipantPayment: handler } = await import('./handlers/ParticipantPaymentHandlers');
    return handler(
          splitWalletId,
          participantId,
      amount,
      transactionSignature,
      (id: string) => this.getSplitWallet(id),
      (userId: string, walletAddress: string, amount: number, context: string) => this.checkUserBalance(userId, walletAddress, amount, context),
      (params: any) => this.executePaymentTransaction(params)
    );
  }

  /**
   * Extract funds from Fair Split wallet (Creator only)
   */
  static async extractFairSplitFunds(
    splitWalletId: string,
    recipientAddress: string,
    creatorId: string,
    description?: string
  ): Promise<PaymentResult> {
    // Use dynamic import to reduce bundle size
    const { extractFairSplitFunds: handler } = await import('./handlers/FairSplitWithdrawalHandler');
    return handler(
        splitWalletId,
        recipientAddress,
        creatorId,
      description,
      (id: string) => this.getSplitWallet(id),
      (id: string) => this.verifySplitWalletBalance(id)
    );
  }

  /**
   * Process degen winner payout
   */
  static async processDegenWinnerPayout(
    splitWalletId: string,
    winnerUserId: string,
    winnerAddress: string,
    totalAmount: number,
    description?: string
  ): Promise<PaymentResult> {
    // Use dynamic import to reduce bundle size
    const { processDegenWinnerPayout: handler } = await import('./handlers/DegenWinnerPayoutHandler');
    return handler(
        splitWalletId,
        winnerUserId,
        winnerAddress,
        totalAmount,
      description,
      (id: string) => this.getSplitWallet(id),
      (id: string, userId: string) => this.getSplitWalletPrivateKeyPrivate(id, userId),
      (id: string) => this.verifySplitWalletBalance(id)
    );
  }

  /**
   * Process degen loser payment - Sends funds directly to external linked card or wallet
   * CRITICAL: Losers withdraw to external cards/wallets (not in-app wallet)
   * Winners withdraw to in-app wallet
   */
  static async processDegenLoserPayment(
    splitWalletId: string,
    loserUserId: string,
    totalAmount: number,
    description?: string,
    cardId?: string,
    _fastMode?: boolean
  ): Promise<PaymentResult> {
    // Use dynamic import to reduce bundle size
    const { processDegenLoserPayment: handler } = await import('./handlers/DegenLoserPaymentHandler');
    return handler(
        splitWalletId,
        loserUserId,
        totalAmount,
        description,
      cardId,
      (id: string) => this.getSplitWallet(id),
      (id: string, userId: string) => this.getSplitWalletPrivateKeyPrivate(id, userId),
      (id: string) => this.verifySplitWalletBalance(id),
      (id: string, participants: any[]) => this.cleanupSharedPrivateKeyIfAllSettled(id, participants)
    );
  }

  /**
   * Pay participant share - wrapper method for backward compatibility
   * This method is called by the FairSplitScreen and delegates to processParticipantPayment
   */
  static async payParticipantShareNEW(
    splitWalletId: string,
    participantId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('🚀 payParticipantShareNEW called - delegating to processParticipantPayment', {
          splitWalletId,
          participantId,
          amount
        }, 'SplitWalletPayments');
      }

      // Delegate to the clean processParticipantPayment method
      return await this.processParticipantPayment(splitWalletId, participantId, amount);
    } catch (error) {
      logger.error('Failed in payParticipantShareNEW', error as any, 'SplitWalletPayments');
        return {
          success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send funds to Cast account
   */
  static async sendToCastAccount(
    splitWalletId: string,
    castAccountAddress: string,
    description?: string
  ): Promise<PaymentResult> {
    const { sendToCastAccount: handler } = await import('./handlers/TransferHandlers');
    return handler(
        splitWalletId,
        castAccountAddress,
      description,
      (id: string) => this.getSplitWallet(id),
      (id: string) => this.verifySplitWalletBalance(id),
      (id: string, creatorId: string) => this.getFairSplitPrivateKeyPrivate(id, creatorId)
    );
  }

  /**
   * Transfer funds to user wallet
   */
  static async transferToUserWallet(
    splitWalletId: string,
    userId: string,
    amount: number
  ): Promise<PaymentResult> {
    const { transferToUserWallet: handler } = await import('./handlers/TransferHandlers');
    return handler(
          splitWalletId,
        userId,
        amount,
      (id: string) => this.getSplitWallet(id),
      (id: string, creatorId: string) => this.getFairSplitPrivateKeyPrivate(id, creatorId)
    );
  }

  // Public helper methods (needed by other services)
  // Use SplitWalletQueries for consistency - it's the canonical implementation
  static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    const { SplitWalletQueries } = await import('./SplitWalletQueries');
    return SplitWalletQueries.getSplitWallet(splitWalletId);
  }

  static async getFairSplitPrivateKey(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    return this.getFairSplitPrivateKeyPrivate(splitWalletId, creatorId);
  }

  private static async cleanupSharedPrivateKeyIfAllSettled(
    splitWalletId: string,
    participants: SplitWalletParticipant[]
  ): Promise<void> {
    const allParticipantsSettled = participants.length > 0 && participants.every(
      participant => participant.status === 'paid'
    );

    if (!allParticipantsSettled) {
      return;
    }

    try {
      const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
      await SplitWalletSecurity.deleteSplitWalletPrivateKeyForAllParticipants(
        splitWalletId,
        participants.map(participant => ({
          userId: participant.userId,
          name: participant.name || 'Participant'
        }))
      );

      logger.info('Shared private key cleaned up after settlement', {
        splitWalletId,
        participantsCount: participants.length
      }, 'SplitWalletPayments');
    } catch (error) {
      logger.warn('Failed to cleanup shared private key after settlement', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletPayments');
    }
  }

  static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    return this.getSplitWalletPrivateKeyPrivate(splitWalletId, requesterId);
  }

  /**
   * Reconcile pending transactions - moves confirmed pending transactions to confirmed status
   */
  static async reconcilePendingTransactions(splitWalletId: string): Promise<void> {
    try {
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {return;}
      const wallet = walletResult.wallet;

      const updatedParticipants = [...wallet.participants];
      let changed = false;

      for (let i = 0; i < updatedParticipants.length; i++) {
        const p = updatedParticipants[i] as any;
        if (p.pendingSignature && typeof p.pendingAmount === 'number' && p.pendingAmount > 0) {
          try {
            const confirmed = await verifyTransactionOnBlockchain(p.pendingSignature);
            if (confirmed) {
              const newAmountPaid = (p.amountPaid || 0) + p.pendingAmount;
              updatedParticipants[i] = {
                ...p,
                amountPaid: newAmountPaid,
                pendingSignature: undefined,
                pendingAmount: undefined,
                pendingSince: undefined,
                status: newAmountPaid >= p.amountOwed ? 'locked' : p.status
              };
              changed = true;
            }
          } catch (_) {
            // ignore, will reconcile later
          }
        }
      }

      if (changed) {
        const docId = wallet.firebaseDocId || splitWalletId;
        await this.updateWalletParticipants(docId, updatedParticipants);
      }
    } catch (_) {
      // best effort; ignore errors
    }
  }

  /**
   * Update wallet participants in database
   */
  private static async updateWalletParticipants(docId: string, participants: SplitWalletParticipant[]): Promise<void> {
    try {
      // Dynamically import Firebase to reduce bundle size
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: participants,
        lastUpdated: new Date().toISOString()
      });
        } catch (error) {
      logger.error('Failed to update wallet participants', error as any, 'SplitWalletPayments');
      throw error;
    }
  }

  // DEPRECATED: These atomic methods have been moved to SplitWalletAtomicUpdates service
  // Keeping for backward compatibility but should be replaced with SplitWalletAtomicUpdates calls

  // Private helper methods (kept for backward compatibility, but getSplitWallet now uses SplitWalletQueries directly)

  private static async getFairSplitPrivateKeyPrivate(splitWalletId: string, creatorId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    const { getFairSplitPrivateKeyPrivate: handler } = await import('./handlers/WalletAccessHandlers');
    return handler(splitWalletId, creatorId);
  }

  private static async getSplitWalletPrivateKeyPrivate(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    const { getSplitWalletPrivateKeyPrivate: handler } = await import('./handlers/WalletAccessHandlers');
    return handler(splitWalletId, requesterId);
  }
}
