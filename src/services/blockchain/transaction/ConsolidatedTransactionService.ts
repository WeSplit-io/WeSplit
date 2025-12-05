/**
 * Consolidated Transaction Service
 * Main service that orchestrates all transaction-related functionality
 * Uses modular components for better maintainability
 */

import { TransactionProcessor } from './TransactionProcessor';
import { PaymentRequestManager } from './PaymentRequestManager';
import { logger } from '../../analytics/loggingService';
import { transactionDeduplicationService } from './TransactionDeduplicationService'; // ✅ CRITICAL: Static import for singleton
import { FeeService, TransactionType } from '../../../config/constants/feeConfig';
import { USDC_CONFIG } from '../../shared/walletConstants';
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

// Import centralized transaction types
import {
  TransactionParams as CentralizedTransactionParams,
  TransactionResult as CentralizedTransactionResult
} from '../../transactions/types';

// Re-export for backward compatibility
export type { CentralizedTransactionParams as TransactionContextParams, CentralizedTransactionResult as ContextTransactionResult };

class ConsolidatedTransactionService {
  private static instance: ConsolidatedTransactionService;
  private transactionProcessor: TransactionProcessor;
  private paymentRequestManager: PaymentRequestManager;

  private constructor() {
    this.transactionProcessor = new TransactionProcessor();
    this.paymentRequestManager = new PaymentRequestManager();
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
  async loadWallet(userId?: string): Promise<boolean> {
    try {
      if (!userId) {
        logger.warn('No userId provided for wallet loading', null, 'ConsolidatedTransactionService');
        return false;
      }

      // Use the walletService to ensure user wallet
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(userId);

      return walletResult.success && !!walletResult.wallet?.secretKey;
    } catch (error) {
      logger.error('Failed to load wallet', { userId, error }, 'ConsolidatedTransactionService');
      return false;
    }
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(userId?: string): Promise<WalletInfo | null> {
    try {
      if (!userId) return null;

      // Use the walletService to get wallet info
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(userId);

      if (walletResult.success && walletResult.wallet) {
        return {
          address: walletResult.wallet.address,
          publicKey: walletResult.wallet.address // Assuming address is the public key
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get wallet info', { userId, error }, 'ConsolidatedTransactionService');
      return null;
    }
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

      // ✅ CRITICAL: Create placeholder promise IMMEDIATELY (before any async operations)
      // This ensures atomic check-and-register
      let resolveTransaction: (result: TransactionResult) => void;
      let rejectTransaction: (error: any) => void;
      
      const placeholderPromise = new Promise<TransactionResult>((resolve, reject) => {
        resolveTransaction = resolve;
        rejectTransaction = reject;
      });
      
      // ✅ CRITICAL: Atomic check-and-register to prevent race conditions
      // This method atomically checks if transaction exists and registers if not
      // This prevents multiple simultaneous calls from all passing the check
      // MUST be called synchronously after import (no await between import and call)
      const { existing: existingPromise, cleanup } = transactionDeduplicationService.checkAndRegisterInFlight(
        params.userId,
        params.to,
        params.amount,
        placeholderPromise
      );
      
      let isNewTransaction = false;
      
      if (existingPromise) {
        logger.warn('⚠️ Duplicate transaction detected (atomic) - returning existing promise', {
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
          // Continue to create new transaction below
        }
      } else {
        // New transaction registered
        isNewTransaction = true;
      }
      
      const transactionPromise = placeholderPromise;

      // Now load wallet and create actual transaction
      // Load the user's wallet
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        cleanup();
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
        cleanup();
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

      // ✅ CRITICAL: Execute actual transaction and resolve placeholder promise
      // This ensures all waiting calls get the same result
      const actualTransactionPromise = this.transactionProcessor.sendUSDCTransaction(params, keypairResult.keypair);
      
      // Execute transaction and resolve/reject placeholder
      actualTransactionPromise
        .then((result) => {
          resolveTransaction!(result);
        })
        .catch((error) => {
          rejectTransaction!(error);
        });

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
        
        // ✅ CRITICAL: Only cleanup on SUCCESS
        // Failed transactions stay in deduplication service to prevent retries
        // This ensures that if a transaction fails, retries within 60s are blocked
        if (isNewTransaction && result.success) {
          cleanup();
        }
      } catch (error) {
        // ✅ CRITICAL: Don't cleanup on error immediately
        // Keep failed transaction in deduplication service to prevent immediate retries
        // This prevents duplicates when transaction fails/times out and user retries
        // Cleanup will happen automatically after timeout (60s) or on success
        logger.warn('Transaction failed - keeping in deduplication service to prevent retries', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount,
          error: error instanceof Error ? error.message : String(error),
          note: 'Transaction will be cleaned up automatically after 60s timeout. Retries within 60s will be blocked.'
        }, 'ConsolidatedTransactionService');
        // Don't cleanup - let it expire naturally (60s timeout) to prevent retries
        throw error;
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
    try {
      logger.debug('Getting wallet balance for user', { userId }, 'ConsolidatedTransactionService');

      const walletAddress = await this.getUserWalletAddress(userId);
      if (!walletAddress) {
        logger.warn('No wallet address found for user', { userId }, 'ConsolidatedTransactionService');
        return { usdc: 0, sol: 0 };
      }

      logger.debug('Retrieved wallet address', { userId, walletAddress }, 'ConsolidatedTransactionService');

      // Use balanceUtils for balance checking
      const { BalanceUtils } = await import('../../shared/balanceUtils');
      const usdcResult = await BalanceUtils.getUsdcBalance(walletAddress, USDC_CONFIG.mintAddress);
      const solBalance = await BalanceUtils.getSolBalance(walletAddress);

      logger.debug('Balance check completed', {
        userId,
        walletAddress,
        usdcBalance: usdcResult.balance,
        solBalance,
        usdcAccountExists: usdcResult.accountExists
      }, 'ConsolidatedTransactionService');

      return {
        usdc: usdcResult.balance,
        sol: solBalance
      };
    } catch (error) {
      logger.error('Failed to get user wallet balance', { userId, error }, 'ConsolidatedTransactionService');
      return { usdc: 0, sol: 0 };
    }
  }

  /**
   * Get USDC balance for a wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
    try {
      logger.debug('ConsolidatedTransactionService.getUsdcBalance called', {
        walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'undefined',
        walletAddressType: typeof walletAddress
      }, 'ConsolidatedTransactionService');

      const { BalanceUtils } = await import('../../shared/balanceUtils');
      const usdcMintAddress = USDC_CONFIG.mintAddress;

      logger.debug('Calling BalanceUtils.getUsdcBalance', {
        walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'undefined',
        usdcMintAddress: usdcMintAddress ? usdcMintAddress.substring(0, 10) + '...' : 'undefined'
      }, 'ConsolidatedTransactionService');

      const result = await BalanceUtils.getUsdcBalance(walletAddress, usdcMintAddress);
      return {
        success: result.accountExists,
        balance: result.balance,
        error: undefined
      };
    } catch (error) {
      logger.error('Failed to get USDC balance', {
        walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'undefined',
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      }, 'ConsolidatedTransactionService');
      return { success: false, balance: 0, error: 'Failed to get balance' };
    }
  }

  /**
   * Check if user has sufficient SOL for gas fees
   */
  async hasSufficientSolForGas(userId: string): Promise<GasCheckResult> {
    try {
      const walletAddress = await this.getUserWalletAddress(userId);
      if (!walletAddress) {
        return { hasSufficient: false, currentSol: 0, requiredSol: 0.001 };
      }

      const { BalanceUtils } = await import('../../shared/balanceUtils');
      const solBalance = await BalanceUtils.getSolBalance(walletAddress);
      const requiredAmount = 0.001; // Minimum SOL for gas

      return {
        hasSufficient: solBalance >= requiredAmount,
        currentSol: solBalance,
        requiredSol: requiredAmount
      };
    } catch (error) {
      logger.error('Failed to check SOL balance for gas', { userId, error }, 'ConsolidatedTransactionService');
      return { hasSufficient: false, currentSol: 0, requiredSol: 0.001 };
    }
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

  // ===== CONTEXT-BASED TRANSACTION METHODS =====
  // (Merged from CentralizedTransactionHandler)

  /**
   * Execute transaction by context type (unified interface)
   */
  async executeTransactionByContext(params: CentralizedTransactionParams): Promise<CentralizedTransactionResult> {
    try {
      logger.info('Executing transaction by context', {
        context: params.context,
        userId: params.userId,
        amount: params.amount,
        currency: params.currency || 'USDC'
      }, 'ConsolidatedTransactionService');

      // Route to appropriate handler based on context
      switch (params.context) {
        case 'send_1to1':
          return this.handleSendTransaction(params as any);

        case 'fair_split_contribution':
          return this.handleFairSplitContribution(params as any);

        case 'fair_split_withdrawal':
          return this.handleFairSplitWithdrawal(params as any);

        case 'degen_split_lock':
          return this.handleDegenSplitLock(params as any);

        case 'spend_split_payment':
          return this.handleSpendSplitPayment(params as any);

        case 'shared_wallet_funding':
          return this.handleSharedWalletFunding(params as any);

        case 'shared_wallet_withdrawal':
          return this.handleSharedWalletWithdrawal(params as any);

        default:
          return {
            success: false,
            error: `Unsupported transaction context: ${(params as any).context}`
          };
      }
    } catch (error) {
      logger.error('Transaction execution failed', {
        context: params.context,
        error: error instanceof Error ? error.message : String(error)
      }, 'ConsolidatedTransactionService');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Handle 1/1 send transactions
   */
  private async handleSendTransaction(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, destinationType, recipientAddress, memo, requestId, isSettlement } = params;

    // Determine transaction type for fees
    const transactionType: TransactionType = isSettlement ? 'settlement' : (requestId ? 'payment_request' : 'send');

    // Calculate fees
    const feeCalculation = FeeService.calculateCompanyFee(amount, transactionType);
    const totalAmount = feeCalculation.totalAmount;

    // Check balance
    const balance = await this.getUserWalletBalance(userId);
    if (balance.usdc < totalAmount) {
      return {
        success: false,
        error: `Insufficient balance: ${balance.usdc.toFixed(6)} USDC available, ${totalAmount.toFixed(6)} USDC required`,
        transactionSignature: '',
        transactionId: '',
        txId: ''
      };
    }

    // Execute transaction based on destination type
    if (destinationType === 'external') {
      // External wallet transfer
      const { externalTransferService } = await import('./sendExternal');
      const result = await externalTransferService.instance.sendExternalTransfer({
        to: recipientAddress,
        amount: amount,
        currency: 'USDC',
        memo: memo || 'External wallet transfer',
        userId: userId,
        priority: 'medium',
        transactionType: 'external_payment',
        // Pass pre-calculated fees to prevent double calculation
        preCalculatedFee: feeCalculation.fee,
        preCalculatedTotal: feeCalculation.totalAmount,
        preCalculatedRecipient: feeCalculation.recipientAmount
      });

      if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature || '',
          transactionId: result.txId || '',
          txId: result.txId || '',
          fee: feeCalculation.fee,
          netAmount: feeCalculation.recipientAmount,
          blockchainFee: result.blockchainFee || 0,
          message: `Successfully sent ${amount.toFixed(6)} USDC to external wallet`
        };
      } else {
        return {
          success: false,
          error: result.error || 'External transfer failed'
        };
      }
    } else {
      // Friend/internal transfer
      const result = await this.sendUSDCTransaction({
        to: recipientAddress,
        amount: amount,
        currency: 'USDC',
        userId: userId,
        memo: memo || (isSettlement ? 'Settlement payment' : 'Payment'),
        priority: 'medium',
        transactionType: transactionType,
        requestId: requestId || null
      });

      if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId,
          fee: feeCalculation.fee,
          netAmount: feeCalculation.recipientAmount,
          blockchainFee: result.companyFee || 0,
          message: `Successfully contributed ${amount.toFixed(6)} USDC to fair split`
        };
      } else {
        return {
          success: false,
          error: result.error || 'Internal transfer failed'
        };
      }
    }
  }

  /**
   * Handle Fair Split contribution (participant payment)
   */
  private async handleFairSplitContribution(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, splitWalletId, splitId, billId, memo } = params;

    // Use internal transfer service for split contributions with company fees
    const result = await this.sendUSDCTransaction({
      to: splitWalletId, // Send to split wallet
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Fair split contribution - ${splitId}`,
      priority: 'medium',
      transactionType: 'split_payment'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId,
          message: `Successfully contributed ${amount.toFixed(6)} USDC to fair split`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Fair split contribution failed'
      };
    }
  }

  /**
   * Handle Fair Split withdrawal (creator withdrawal)
   */
  private async handleFairSplitWithdrawal(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, splitWalletId, splitId, billId, memo } = params;

    // Get user's wallet address for the withdrawal destination
    const userWalletAddress = await this.getUserWalletAddress(userId);
    if (!userWalletAddress) {
      return {
        success: false,
        error: 'User wallet address not found'
      };
    }

    // Use external transfer service for split withdrawals (may have fees)
    const { externalTransferService } = await import('./sendExternal');
    const result = await externalTransferService.instance.sendExternalTransfer({
      to: userWalletAddress, // Send to user's personal wallet
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Fair split withdrawal - ${splitId}`,
      priority: 'medium',
      transactionType: 'withdraw'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature || '',
          transactionId: result.txId || '',
          txId: result.txId || '',
          fee: result.companyFee || 0,
          netAmount: result.netAmount || amount,
          blockchainFee: result.blockchainFee || 0,
          message: `Successfully withdrew ${amount.toFixed(6)} USDC from fair split`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Fair split withdrawal failed'
      };
    }
  }

  /**
   * Handle Degen Split fund locking
   */
  private async handleDegenSplitLock(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, splitWalletId, splitId, billId, memo } = params;

    // Use internal transfer service for degen split funding
    const result = await this.sendUSDCTransaction({
      to: splitWalletId, // Send to split wallet
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Degen split fund locking - ${splitId}`,
      priority: 'medium',
      transactionType: 'split_payment'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId,
          message: `Successfully locked ${amount.toFixed(6)} USDC in degen split`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Degen split lock failed'
      };
    }
  }

  /**
   * Handle Spend Split merchant payment
   */
  private async handleSpendSplitPayment(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, splitId, splitWalletId, merchantAddress, memo } = params;

    if (!merchantAddress) {
      return {
        success: false,
        error: 'Merchant address is required for spend split payments'
      };
    }

    // Use external transfer service for merchant payments
    const { externalTransferService } = await import('./sendExternal');
    const result = await externalTransferService.instance.sendExternalTransfer({
      to: merchantAddress,
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Spend split payment - ${splitId}`,
      priority: 'medium',
      transactionType: 'external_payment'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature || '',
          transactionId: result.txId || '',
          txId: result.txId || '',
          fee: result.companyFee || 0,
          netAmount: result.netAmount || amount,
          blockchainFee: result.blockchainFee || 0,
          message: `Successfully paid ${amount.toFixed(6)} USDC to merchant`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Merchant payment failed'
      };
    }
  }

  /**
   * Handle Shared Wallet funding
   */
  private async handleSharedWalletFunding(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, sharedWalletId, memo } = params;

    // Use internal transfer service for shared wallet funding
    const result = await this.sendUSDCTransaction({
      to: sharedWalletId, // Send to shared wallet
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Shared wallet funding`,
      priority: 'medium',
      transactionType: 'send'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId,
          message: `Successfully funded shared wallet with ${amount.toFixed(6)} USDC`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Shared wallet funding failed'
      };
    }
  }

  /**
   * Handle Shared Wallet withdrawal
   */
  private async handleSharedWalletWithdrawal(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, sharedWalletId, destinationAddress, memo } = params;

    // Use external transfer service for shared wallet withdrawals
    const { externalTransferService } = await import('./sendExternal');
    const result = await externalTransferService.instance.sendExternalTransfer({
      to: destinationAddress,
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Shared wallet withdrawal`,
      priority: 'medium',
      transactionType: 'withdraw'
    });

    if (result.success) {
        return {
          success: true,
          transactionSignature: result.signature || '',
          transactionId: result.txId || '',
          txId: result.txId || '',
          fee: result.companyFee || 0,
          netAmount: result.netAmount || amount,
          blockchainFee: result.blockchainFee || 0,
          message: `Successfully withdrew ${amount.toFixed(6)} USDC from shared wallet`
        };
    } else {
      return {
        success: false,
        error: result.error || 'Shared wallet withdrawal failed'
      };
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
