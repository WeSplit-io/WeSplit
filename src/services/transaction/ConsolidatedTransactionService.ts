/**
 * Consolidated Transaction Service
 * Main service that orchestrates all transaction-related functionality
 * Uses modular components for better maintainability
 */

import { TransactionWalletManager } from './TransactionWalletManager';
import { TransactionProcessor } from './TransactionProcessor';
import { PaymentRequestManager } from './PaymentRequestManager';
import { BalanceManager } from './BalanceManager';
import { logger } from '../core';
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
      const { keypairUtils } = await import('../shared/keypairUtils');
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

      const result = await this.transactionProcessor.sendUSDCTransaction(params, keypairResult.keypair);
      
      logger.info('📋 ConsolidatedTransactionService: Transaction result', {
        success: result.success,
        signature: result.signature,
        error: result.error
      });
      
      // Save transaction to database if successful
      if (result.success && result.signature) {
        try {
          const { firebaseDataService } = await import('../firebaseDataService');
          
          // Find recipient user by wallet address to get their user ID
          const recipientUser = await firebaseDataService.user.getUserByWalletAddress(params.to);
          const recipientUserId = recipientUser ? recipientUser.id.toString() : params.to;
          
          // Create sender transaction record
          const senderTransactionData = {
            id: `${result.signature}_sender`,
            type: 'send' as const,
            amount: params.amount,
            currency: params.currency,
            from_user: params.userId,
            to_user: recipientUserId,
            from_wallet: keypairResult.keypair.publicKey.toBase58(),
            to_wallet: params.to,
            tx_hash: result.signature,
            note: params.memo || 'USDC Transfer',
            status: 'completed' as const,
            group_id: params.groupId || null,
            company_fee: result.companyFee || 0,
            net_amount: result.netAmount || params.amount,
            gas_fee: 0, // Gas fees are covered by the company
            blockchain_network: 'solana',
            confirmation_count: 0,
            block_height: 0
          };
          
          // Create recipient transaction record (only if recipient is a registered user)
          const recipientTransactionData = {
            id: `${result.signature}_recipient`,
            type: 'receive' as const,
            amount: params.amount,
            currency: params.currency,
            from_user: params.userId,
            to_user: recipientUserId,
            from_wallet: keypairResult.keypair.publicKey.toBase58(),
            to_wallet: params.to,
            tx_hash: result.signature,
            note: params.memo || 'USDC Transfer',
            status: 'completed' as const,
            group_id: params.groupId || null,
            company_fee: 0, // Recipient doesn't pay company fees
            net_amount: params.amount, // Recipient gets full amount
            gas_fee: 0, // Gas fees are covered by the company
            blockchain_network: 'solana',
            confirmation_count: 0,
            block_height: 0
          };
          
          // Save both transaction records
          await firebaseDataService.transaction.createTransaction(senderTransactionData);
          
          // Only create recipient transaction if recipient is a registered user
          if (recipientUser) {
            await firebaseDataService.transaction.createTransaction(recipientTransactionData);
            logger.info('✅ Both sender and recipient transactions saved to database', {
              signature: result.signature,
              userId: params.userId,
              recipientUserId: recipientUserId,
              amount: params.amount
            }, 'ConsolidatedTransactionService');
          } else {
            logger.info('✅ Sender transaction saved to database (recipient not registered)', {
              signature: result.signature,
              userId: params.userId,
              amount: params.amount
            }, 'ConsolidatedTransactionService');
          }
          
        } catch (saveError) {
          logger.error('❌ Failed to save transaction to database', saveError, 'ConsolidatedTransactionService');
          // Don't fail the transaction if database save fails
        }

        // Process payment request if this transaction was from a request
        logger.info('🔍 Checking for payment request processing', {
          requestId: params.requestId,
          hasRequestId: !!params.requestId,
          requestIdType: typeof params.requestId
        }, 'ConsolidatedTransactionService');
        
        if (params.requestId) {
          try {
            const { PaymentRequestManager } = await import('./PaymentRequestManager');
            const paymentRequestManager = new PaymentRequestManager();
            
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
              error: requestError
            }, 'ConsolidatedTransactionService');
            
            // Don't fail the transaction if request processing fails, but log for manual cleanup
            logger.warn('⚠️ Manual cleanup may be required for payment request', {
              requestId: params.requestId,
              signature: result.signature
            }, 'ConsolidatedTransactionService');
          }
        }
      }
      
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

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Legacy method for sending USDC transactions
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcTransaction(
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcTransaction method', null, 'ConsolidatedTransactionService');
    
    return this.sendUSDCTransaction({
      to,
      amount,
      currency: 'USDC',
      userId,
      memo
    });
  }

  /**
   * Legacy method for sending USDC to address
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcToAddress(
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcToAddress method', null, 'ConsolidatedTransactionService');
    
    return this.sendUSDCTransaction({
      to,
      amount,
      currency: 'USDC',
      userId,
      memo
    });
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

  /**
   * Legacy method for sending USDC from specific wallet
   * @deprecated Use sendUSDCTransaction instead
   */
  async sendUsdcFromSpecificWallet(
    fromWalletAddress: string,
    to: string,
    amount: number,
    userId: string,
    memo?: string
  ): Promise<TransactionResult> {
    logger.warn('Using deprecated sendUsdcFromSpecificWallet method', null, 'ConsolidatedTransactionService');
    
    // This method would need to be implemented if specific wallet functionality is required
    return {
      signature: '',
      txId: '',
      success: false,
      error: 'sendUsdcFromSpecificWallet is deprecated and not implemented in the new architecture'
    };
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
