/**
 * Consolidated Transaction Service
 * Main service that orchestrates all transaction-related functionality
 * Uses modular components for better maintainability
 */

import { TransactionWalletManager } from './TransactionWalletManager';
import { TransactionProcessor } from './TransactionProcessor';
import { PaymentRequestManager } from './PaymentRequestManager';
import { BalanceManager } from './BalanceManager';
import { logger } from '../../analytics/loggingService';
import { 
  TransactionParams, 
  TransactionResult, 
  PaymentRequest, 
  PaymentRequestResult,
  WalletInfo,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';

class ConsolidatedTransactionService {
  private static instance: ConsolidatedTransactionService;
  private walletManager: TransactionWalletManager;
  private transactionProcessor: TransactionProcessor;
  private paymentRequestManager: PaymentRequestManager;
  private balanceManager: BalanceManager;

  private constructor() {
    this.walletManager = new TransactionWalletManager();
    this.transactionProcessor = new TransactionProcessor();
    this.paymentRequestManager = new PaymentRequestManager();
    this.balanceManager = new BalanceManager();
  }

  public static getInstance(): ConsolidatedTransactionService {
    if (!ConsolidatedTransactionService.instance) {
      ConsolidatedTransactionService.instance = new ConsolidatedTransactionService();
    }
    return ConsolidatedTransactionService.instance;
  }

  // ===== WALLET MANAGEMENT METHODS =====

  /**
   * Load wallet from secure storage
   */
  async loadWallet(): Promise<boolean> {
    return this.walletManager.loadWallet();
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    return this.walletManager.getWalletInfo();
  }

  // ===== TRANSACTION METHODS =====

  /**
   * Send SOL transaction (not supported)
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    return this.transactionProcessor.sendSolTransaction(params);
  }

  /**
   * Send USDC transaction
   */
  async sendUSDCTransaction(params: TransactionParams): Promise<TransactionResult> {
    try {
      // Ensure we have a userId
      if (!params.userId) {
        return {
          signature: '',
          txId: '',
          success: false,
          error: 'User ID is required for transaction'
        };
      }

      // ✅ CRITICAL: Check for duplicate in-flight transaction before proceeding
      // This prevents multiple simultaneous transactions with the same parameters
      const { transactionDeduplicationService } = await import('./TransactionDeduplicationService');
      const existingPromise = transactionDeduplicationService.checkInFlight(
        params.userId,
        params.to,
        params.amount
      );
      
      if (existingPromise) {
        logger.warn('⚠️ Duplicate transaction detected - returning existing promise', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount
        }, 'ConsolidatedTransactionService');
        
        // Wait for existing transaction to complete
        try {
          const existingResult = await existingPromise;
          return existingResult;
        } catch (existingError) {
          // If existing transaction failed, allow new attempt
          logger.warn('Existing transaction failed, allowing new attempt', {
            error: existingError instanceof Error ? existingError.message : String(existingError)
          }, 'ConsolidatedTransactionService');
        }
      }

      // Load the user's wallet
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          signature: '',
          txId: '',
          success: false,
          error: walletResult.error || 'Failed to load user wallet'
        };
      }

      // Create keypair from the wallet
      const { keypairUtils } = await import('../../shared/keypairUtils');
      const keypairResult = keypairUtils.createKeypairFromSecretKey(walletResult.wallet.secretKey!);
      
      if (!keypairResult.success || !keypairResult.keypair) {
        logger.error('Failed to create keypair from wallet', { 
          success: keypairResult.success,
          error: keypairResult.error 
        }, 'ConsolidatedTransactionService');
        return {
          signature: '',
          txId: '',
          success: false,
          error: 'Failed to create keypair from wallet'
        };
      }

      logger.info('🔑 ConsolidatedTransactionService: Keypair created successfully', {
        publicKey: keypairResult.keypair.publicKey.toBase58(),
        userId: params.userId
      });

      // ✅ CRITICAL: Wrap transaction in deduplication service
      // Register transaction as in-flight and get cleanup function
      const transactionPromise = this.transactionProcessor.sendUSDCTransaction(params, keypairResult.keypair);
      const cleanup = transactionDeduplicationService.registerInFlight(
        params.userId,
        params.to,
        params.amount,
        transactionPromise
      );

      // Execute transaction with cleanup on completion
      let result: TransactionResult;
      try {
        result = await transactionPromise;
        
        // Update deduplication service with signature if successful
        if (result.success && result.signature) {
          transactionDeduplicationService.updateTransactionSignature(
            params.userId,
            params.to,
            params.amount,
            result.signature
          );
        }
      } finally {
        // Always cleanup, even on error
        cleanup();
      }
      
      logger.info('📋 ConsolidatedTransactionService: Transaction result', {
        success: result.success,
        signature: result.signature,
        error: result.error
      });
      
      // Save transaction and award points using centralized helper
      if (result.success && result.signature) {
        try {
          const { saveTransactionAndAwardPoints } = await import('../../shared/transactionPostProcessing');
          const { FeeService } = await import('../../../config/constants/feeConfig');
          
          // Calculate company fee for transaction
          const transactionType = params.transactionType || 'send';
          const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);
          
          await saveTransactionAndAwardPoints({
            userId: params.userId,
            toAddress: params.to,
            amount: params.amount,
            signature: result.signature,
            transactionType: transactionType,
            companyFee: companyFee,
            netAmount: recipientAmount,
            memo: params.memo,
            groupId: params.groupId,
            currency: params.currency
          });
          
          logger.info('✅ Transaction post-processing completed', {
            signature: result.signature,
            userId: params.userId,
            transactionType
          }, 'ConsolidatedTransactionService');
        } catch (postProcessingError) {
          logger.error('❌ Error in transaction post-processing', postProcessingError, 'ConsolidatedTransactionService');
          // Don't fail the transaction if post-processing fails
        }

        // Process payment request if this transaction was from a request
        if (params.requestId) {
          try {
            logger.info('🔍 Checking for payment request processing', {
              requestId: params.requestId,
              hasRequestId: !!params.requestId,
              requestIdType: typeof params.requestId
            }, 'ConsolidatedTransactionService');
            
            const { PaymentRequestManager } = await import('./PaymentRequestManager');
            const paymentRequestManager = new PaymentRequestManager();
            
            // Get payment request details before processing (for settlement notifications)
            const requestDetails = await paymentRequestManager.getPaymentRequest(params.requestId);
            
            const requestResult = await paymentRequestManager.processPaymentRequest(
              params.requestId,
              result.signature!,
              'completed'
            );
            
            if (requestResult.success) {
              logger.info('✅ Payment request deleted after successful completion', {
                requestId: params.requestId,
                signature: result.signature,
                transactionId: result.signature
              }, 'ConsolidatedTransactionService');

              // Send personalized settlement notifications to both users (non-blocking)
              // Don't await - run in background to avoid blocking transaction
              if (requestDetails) {
                const { notificationService } = await import('../../notifications/notificationService');
                notificationService.instance.sendPaymentRequestCompletionNotifications(
                  params.requestId,
                  requestDetails.senderId,
                  requestDetails.senderName || 'Unknown User',
                  requestDetails.recipientId,
                  requestDetails.recipientName || 'Unknown User',
                  requestDetails.amount,
                  requestDetails.currency,
                  result.signature
                ).then(() => {
                  logger.info('✅ Settlement notifications sent successfully', {
                    requestId: params.requestId,
                    senderId: requestDetails.senderId,
                    recipientId: requestDetails.recipientId
                  }, 'ConsolidatedTransactionService');
                }).catch(notificationError => {
                  logger.error('❌ Failed to send settlement notifications (non-blocking)', {
                    requestId: params.requestId,
                    error: notificationError
                  }, 'ConsolidatedTransactionService');
                  // Don't fail the transaction if notifications fail
                });
              }
            } else {
              logger.error('❌ Payment request processing failed', {
                requestId: params.requestId,
                signature: result.signature,
                error: requestResult.error
              }, 'ConsolidatedTransactionService');
              
              // Try to mark as failed instead of deleting
              try {
                await paymentRequestManager.processPaymentRequest(
                  params.requestId,
                  result.signature!,
                  'failed'
                );
                logger.info('✅ Payment request marked as failed after processing error', {
                  requestId: params.requestId
                }, 'ConsolidatedTransactionService');
              } catch (fallbackError) {
                logger.error('❌ Failed to mark payment request as failed', fallbackError, 'ConsolidatedTransactionService');
              }
            }
          } catch (requestError) {
            logger.error('❌ Failed to process payment request', {
              requestId: params.requestId,
              signature: result.signature,
              error: requestError instanceof Error ? requestError.message : String(requestError)
            }, 'ConsolidatedTransactionService');
            
            // Don't fail the transaction if request processing fails, but log for manual cleanup
            logger.warn('⚠️ Manual cleanup may be required for payment request', {
              requestId: params.requestId,
              signature: result.signature
            }, 'ConsolidatedTransactionService');
            // Don't fail transaction - payment request processing is non-critical
          }
        }
      }
      
      // Always return the result from TransactionProcessor - it already handles success/failure
      // Even if verification fails, if we got a signature, the transaction was accepted by the network
      return result;
    } catch (error) {
      logger.error('Failed to send USDC transaction', error, 'ConsolidatedTransactionService');
      
      // If transaction failed and there was a request, mark it as failed
      if (params.requestId) {
        try {
          const { PaymentRequestManager } = await import('./PaymentRequestManager');
          const paymentRequestManager = new PaymentRequestManager();
          
          await paymentRequestManager.processPaymentRequest(
            params.requestId,
            '',
            'failed'
          );
          
          logger.info('✅ Payment request marked as failed', {
            requestId: params.requestId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'ConsolidatedTransactionService');
        } catch (requestError) {
          logger.error('❌ Failed to update payment request status', requestError, 'ConsolidatedTransactionService');
        }
      }
      
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    return this.transactionProcessor.getTransactionFeeEstimate(amount, currency, priority);
  }

  // ===== PAYMENT REQUEST METHODS =====

  /**
   * Create a new payment request
   */
  async createPaymentRequest(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    description?: string,
    groupId?: string
  ): Promise<PaymentRequestResult> {
    return this.paymentRequestManager.createPaymentRequest(
      senderId,
      recipientId,
      amount,
      currency,
      description,
      groupId
    );
  }

  /**
   * Process a payment request
   */
  async processPaymentRequest(
    requestId: string,
    transactionId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<PaymentRequestResult> {
    return this.paymentRequestManager.processPaymentRequest(requestId, transactionId, status);
  }

  /**
   * Get payment requests for a user
   */
  async getPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    return this.paymentRequestManager.getPaymentRequests(userId);
  }

  /**
   * Cleanup orphaned payment requests for a user
   */
  async cleanupOrphanedPaymentRequests(userId: string): Promise<{ cleaned: number; errors: string[] }> {
    return this.paymentRequestManager.cleanupOrphanedRequests(userId);
  }

  // ===== BALANCE METHODS =====

  /**
   * Get user wallet balance
   */
  async getUserWalletBalance(userId: string): Promise<WalletBalance> {
    return this.balanceManager.getUserWalletBalance(userId);
  }

  /**
   * Get USDC balance for a wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
    return this.balanceManager.getUsdcBalance(walletAddress);
  }

  /**
   * Check if user has sufficient SOL for gas fees
   */
  async hasSufficientSolForGas(userId: string): Promise<GasCheckResult> {
    return this.balanceManager.hasSufficientSolForGas(userId);
  }

  /**
   * Get user wallet address by userId
   */
  async getUserWalletAddress(userId: string): Promise<string | null> {
    try {
      // Use the proper WalletService method to get user's wallet address
      const { simplifiedWalletService } = await import('../wallet/simplifiedWalletService');
      const walletInfo = await simplifiedWalletService.getWalletInfo(userId);
      
      if (walletInfo) {
        return walletInfo.address;
      }
      
      logger.warn('No wallet found for user', { userId }, 'ConsolidatedTransactionService');
      return null;
    } catch (error) {
      logger.error('Failed to get user wallet address', { userId, error }, 'ConsolidatedTransactionService');
      return null;
    }
  }
}

// Export singleton instance
export const consolidatedTransactionService = ConsolidatedTransactionService.getInstance();

// Export types for backward compatibility
export type {
  TransactionParams,
  TransactionResult,
  PaymentRequest,
  PaymentRequestResult,
  WalletInfo,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';
