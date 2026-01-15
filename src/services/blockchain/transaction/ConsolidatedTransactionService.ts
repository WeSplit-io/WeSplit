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

      // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
      const { simplifiedWalletService } = await import('../wallet/simplifiedWalletService');
      const walletResult = await simplifiedWalletService.ensureUserWallet(userId);

      return walletResult.success && !!((walletResult.wallet as any)?.privateKey || walletResult.wallet?.secretKey);
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

      // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
      const { simplifiedWalletService } = await import('../wallet/simplifiedWalletService');
      const walletInfo = await simplifiedWalletService.getWalletInfo(userId);

      if (walletInfo) {
        return {
          address: walletInfo.address,
          publicKey: walletInfo.publicKey || walletInfo.address
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
      // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
      // This prevents OOM crashes when doing multiple transactions in sequence
      const { simplifiedWalletService } = await import('../wallet/simplifiedWalletService');
      const walletResult = await simplifiedWalletService.ensureUserWallet(params.userId);
      
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
      // ✅ Use privateKey (simplifiedWalletService) or secretKey (legacy) for compatibility
      const { keypairUtils } = await import('../../shared/keypairUtils');
      const secretKey = (walletResult.wallet as any)?.privateKey || walletResult.wallet?.secretKey;
      if (!secretKey) {
        cleanup();
        return {
          signature: '',
          txId: '',
          success: false,
          error: 'Wallet secret key not available'
        };
      }
      const keypairResult = keypairUtils.createKeypairFromSecretKey(secretKey);
      
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
      
      // ✅ MEMORY OPTIMIZATION: Extract keypair and let walletResult go out of scope naturally
      // The walletResult will be garbage collected when the function scope ends
      const keypair = keypairResult.keypair;

      logger.info('🔑 ConsolidatedTransactionService: Keypair created successfully', {
        publicKey: keypair.publicKey.toBase58(),
        userId: params.userId
      });

      // ✅ CRITICAL: Execute actual transaction and resolve placeholder promise
      // This ensures all waiting calls get the same result
      const actualTransactionPromise = this.transactionProcessor.sendUSDCTransaction(params, keypair);
      
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
          // ✅ MEMORY OPTIMIZATION: Variables will go out of scope naturally after function completes
          // This helps prevent memory buildup when doing multiple transactions in sequence
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
        // ✅ CRITICAL: For split payments, completely skip post-processing to prevent OOM crashes
        // The participant status update in FairSplitHandler is more critical and must complete first
        // DO NOT import transactionPostProcessing for split flows - the import itself loads 675 modules!
        const isSplitPayment = params.transactionType === 'split_payment' || 
                               params.transactionType === 'split_wallet_withdrawal';
        
        if (isSplitPayment) {
          // ✅ MEMORY OPTIMIZATION: Skip post-processing entirely for split flows
          // The import of transactionPostProcessing loads 675 modules which causes OOM
          // On-chain transaction is authoritative, database updates happen via handlers
          logger.info('Skipping post-processing for split flow (prevents OOM)', {
            transactionType: params.transactionType,
            signature: result.signature,
            userId: params.userId,
            note: 'On-chain transaction is authoritative. Database updates handled by split handlers. No heavy imports triggered.'
          }, 'ConsolidatedTransactionService');
          
          // ✅ MEMORY OPTIMIZATION: Variables will go out of scope naturally after function completes
          // This helps prevent memory buildup when doing multiple transactions in sequence
          // Do nothing - skip entirely to prevent loading 675 modules
        } else {
          // For non-split payments, process normally (blocking)
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
              groupId: params.groupId || undefined,
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

  // Balance cache to prevent excessive RPC calls
  private balanceCache = new Map<string, { balance: number; timestamp: number }>();
  private readonly BALANCE_CACHE_TTL = 5000; // 5 seconds cache
  private balanceDeduplicator = new Map<string, Promise<UsdcBalanceResult>>();

  /**
   * Get USDC balance for a wallet address (with caching and deduplication)
   */
  async getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
    // CRITICAL: Deduplicate simultaneous calls for same address
    if (this.balanceDeduplicator.has(walletAddress)) {
      return this.balanceDeduplicator.get(walletAddress)!;
    }

    // Check cache first
    const cached = this.balanceCache.get(walletAddress);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < this.BALANCE_CACHE_TTL) {
      logger.debug('Balance retrieved from cache', {
        walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'undefined',
        balance: cached.balance
      }, 'ConsolidatedTransactionService');
      return {
        success: true,
        balance: cached.balance,
        error: undefined
      };
    }

    const balancePromise = this._getUsdcBalance(walletAddress)
      .finally(() => {
        // Clean up deduplicator after call completes
        this.balanceDeduplicator.delete(walletAddress);
      });

    this.balanceDeduplicator.set(walletAddress, balancePromise);
    return balancePromise;
  }

  /**
   * Internal method to get USDC balance (without deduplication)
   */
  private async _getUsdcBalance(walletAddress: string): Promise<UsdcBalanceResult> {
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
      
      // Cache the result
      if (result.accountExists) {
        this.balanceCache.set(walletAddress, {
          balance: result.balance,
          timestamp: Date.now()
        });
      }
      
      return {
        success: result.accountExists,
        balance: result.balance,
        error: undefined
      };
    } catch (error) {
      logger.error('Failed to get USDC balance', {
        walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'undefined',
        error: error instanceof Error ? error.message : String(error),
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
      // ✅ FIX: First try to get wallet address directly from user document (faster, more reliable)
      // This is the most direct way to get the user's in-app wallet address
      const { firebaseDataService } = await import('../../data/firebaseDataService');
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      
      if (userData?.wallet_address) {
        logger.info('Retrieved wallet address from user document', {
          userId,
          address: userData.wallet_address,
          walletType: userData.wallet_type || 'app'
        }, 'ConsolidatedTransactionService');
        return userData.wallet_address;
      }
      
      // Fallback to wallet service if not in user document
      logger.info('Wallet address not in user document, trying wallet service', { userId }, 'ConsolidatedTransactionService');
      const { simplifiedWalletService } = await import('../wallet/simplifiedWalletService');
      const walletInfo = await simplifiedWalletService.getWalletInfo(userId);
      
      if (walletInfo) {
        logger.info('Retrieved wallet address from wallet service', {
          userId,
          address: walletInfo.address
        }, 'ConsolidatedTransactionService');
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

        case 'fair_split_contribution': {
          const { handleFairSplitContribution } = await import('./handlers/FairSplitHandler');
          return handleFairSplitContribution(params as any, (p: any) => this.sendUSDCTransaction(p));
        }

        case 'fair_split_withdrawal': {
          const { handleFairSplitWithdrawal } = await import('./handlers/FairSplitWithdrawalHandler');
          return handleFairSplitWithdrawal(params as any, (userId: string) => this.getUserWalletAddress(userId));
        }

        case 'degen_split_lock': {
          const { handleDegenSplitLock } = await import('./handlers/DegenSplitHandler');
          return handleDegenSplitLock(params as any, (p: any) => this.sendUSDCTransaction(p));
        }

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
          message: `Successfully sent ${amount.toFixed(6)} USDC`
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
   * Handle Fair Split withdrawal (creator withdrawal)
   * ✅ REMOVED: This method was duplicate code - actual implementation is in handlers/FairSplitWithdrawalHandler.ts
   * The handler is called via executeTransactionByContext() which routes to the handler file
   * This private method was never called and has been removed to reduce code duplication and memory usage
   * 
   * The actual withdrawal flow:
   * UnifiedWithdrawalService.withdraw() 
   *   → ConsolidatedTransactionService.executeTransactionByContext('fair_split_withdrawal')
   *     → handlers/FairSplitWithdrawalHandler.handleFairSplitWithdrawal()
   */


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

    try {
      // Validate parameters
      if (!sharedWalletId || !userId || !amount || amount <= 0) {
        return {
          success: false,
          error: 'Invalid funding parameters'
        };
      }

      // Get shared wallet
      const { SharedWalletService } = await import('../../sharedWallet');
      const walletResult = await SharedWalletService.getSharedWallet(sharedWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Shared wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Verify user is an active member
      const userMember = wallet.members?.find((m) => m.userId === userId);
      if (!userMember || userMember.status !== 'active') {
        return {
          success: false,
          error: 'You must be an active member to fund this wallet'
        };
      }

      // Check member permissions
      const { MemberRightsService } = await import('../../sharedWallet/MemberRightsService');
      if (!MemberRightsService.canPerformAction(userMember, wallet, 'fund')) {
        return {
          success: false,
          error: 'You do not have permission to add funds to this wallet'
        };
      }

      // Execute blockchain transaction using unified sendUSDCTransaction (same as fair split/degen split)
      logger.info('Shared wallet funding transaction', {
        sharedWalletId,
        walletAddress: wallet.walletAddress,
        amount,
        userId
      }, 'ConsolidatedTransactionService');

      // Use sendUSDCTransaction for consistency with fair split/degen split funding
      // transactionType: 'deposit' ensures no fees are charged for shared wallet funding
      const result = await this.sendUSDCTransaction({
        to: wallet.walletAddress, // Send to shared wallet address
        amount: amount,
        currency: 'USDC',
        memo: memo || `Shared wallet funding`,
        userId: userId,
        priority: 'medium',
        transactionType: 'deposit' // Use deposit type for funding (no fees)
      });

      logger.info('External transfer result', {
        success: result.success,
        hasSignature: !!result.signature,
        signature: result.signature,
        error: result.error
      }, 'ConsolidatedTransactionService');

      if (!result.success) {
        // If we have a signature, the transaction might have succeeded despite verification failure
        // Let's verify the transaction on-chain before giving up
        if (result.signature) {
          logger.warn('External transfer returned failure but has signature - verifying on-chain', {
            signature: result.signature,
            sharedWalletId,
            amount,
            originalError: result.error
          }, 'ConsolidatedTransactionService');

          try {
            // First, check the recipient balance to see if funds actually arrived
            const recipientBalanceBefore = await this.getUsdcBalance(wallet.walletAddress);
            logger.info('Checking recipient balance before on-chain verification', {
              sharedWalletId,
              walletAddress: wallet.walletAddress,
              currentBalance: recipientBalanceBefore.balance,
              expectedIncrease: amount
            }, 'ConsolidatedTransactionService');

            // Use network-aware timeout values aligned with Firebase Functions
            // Firebase Functions uses: maxAttempts: 15, verificationDelay: 2000ms
            // Use more attempts for devnet (20) vs mainnet (10) for better reliability
            const { getEnvVar } = await import('../../../utils/core/environmentUtils');
            const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK') || getEnvVar('EXPO_PUBLIC_DEV_NETWORK') || '';
            const buildProfile = getEnvVar('EAS_BUILD_PROFILE');
            const appEnv = getEnvVar('APP_ENV');
            const isProduction = buildProfile === 'production' || 
                                appEnv === 'production' ||
                                process.env.NODE_ENV === 'production' ||
                                !__DEV__;
            const isMainnet = isProduction || networkEnv.toLowerCase() === 'mainnet' || getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
            
            // Align with Firebase Functions: 15 attempts for mainnet, 20 for devnet
            const maxAttempts = isMainnet ? 10 : 20;
            const baseDelayMs = 2000;
            
            const { verifyTransactionOnBlockchain } = await import('../../shared/transactionUtils');
            const verificationResult = await verifyTransactionOnBlockchain(result.signature, {
              maxAttempts,
              baseDelayMs
            });

            if (verificationResult.success) {
              logger.info('Transaction verified as successful on-chain despite initial failure', {
                signature: result.signature,
                sharedWalletId,
                amount
              }, 'ConsolidatedTransactionService');

              // Transaction actually succeeded - proceed with balance update
            } else {
              logger.error('Transaction verification failed on-chain', {
                signature: result.signature,
                verificationError: verificationResult.error,
                sharedWalletId,
                amount
              }, 'ConsolidatedTransactionService');

              return {
                success: false,
                error: `Transaction verification failed: ${verificationResult.error}`
              };
            }
          } catch (verificationError) {
            logger.error('Failed to verify transaction on-chain', {
              signature: result.signature,
              error: verificationError instanceof Error ? verificationError.message : String(verificationError),
              sharedWalletId,
              amount
            }, 'ConsolidatedTransactionService');

            // If we can't verify but have a signature, give user benefit of doubt but warn
            // This prevents users from losing funds due to verification timeouts
            logger.warn('Proceeding with balance update despite verification failure - user may have lost funds', {
              signature: result.signature,
              sharedWalletId,
              amount,
              originalError: result.error
            }, 'ConsolidatedTransactionService');

            // For shared wallet funding, if we have a signature but verification failed,
            // we'll proceed with the balance update but log extensively for monitoring
          }
        } else {
          // No signature means transaction definitely failed
          return {
            success: false,
            error: result.error || 'Shared wallet funding failed'
          };
        }
      }

      if (!result.signature) {
        return {
          success: false,
          error: 'Transaction completed but no signature returned'
        };
      }

      // Update shared wallet balance and member contribution using Firestore transaction for atomicity
      const { db } = await import('../../../config/firebase/firebase');
      const { doc, runTransaction, addDoc, collection, serverTimestamp } = await import('firebase/firestore');

      // Get wallet document ID - fetch it if not already in wallet object
      let walletDocId = wallet.firebaseDocId;
      if (!walletDocId) {
        // Fetch wallet document to get the Firebase document ID
        const { getSharedWalletDocById } = await import('../../sharedWallet/utils');
        const walletDocResult = await getSharedWalletDocById(sharedWalletId);
        if (!walletDocResult) {
          logger.error('Wallet document ID not found', { sharedWalletId }, 'ConsolidatedTransactionService');
          return {
            success: false,
            error: 'Failed to find wallet document'
          };
        }
        walletDocId = walletDocResult.walletDocId;
      }

      // Use Firestore transaction to ensure atomic balance updates
      const walletRef = doc(db, 'sharedWallets', walletDocId);
      // Calculate expected new balance (will be recalculated in transaction with actual current balance)
      const expectedNewBalance = (wallet.totalBalance || 0) + amount;
      let newBalance: number = expectedNewBalance;

      try {
        await runTransaction(db, async (transaction) => {
          const walletDoc = await transaction.get(walletRef);

          if (!walletDoc.exists()) {
            throw new Error('Shared wallet document not found');
          }

          const currentWallet = walletDoc.data();
          const currentBalance = currentWallet.totalBalance || 0;
          newBalance = currentBalance + amount;

          // Update member contribution
          const currentMembers = currentWallet.members || [];
          const updatedMembers = currentMembers.map((m: any) => {
            if (m.userId === userId) {
              return {
                ...m,
                totalContributed: (m.totalContributed || 0) + amount,
              };
            }
            return m;
          });

          transaction.update(walletRef, {
            totalBalance: newBalance,
            members: updatedMembers,
            updatedAt: serverTimestamp(),
          });
        });
        
        logger.info('Shared wallet balance updated successfully after funding', {
          sharedWalletId,
          userId,
          amount,
          newBalance,
          oldBalance: wallet.totalBalance
        }, 'ConsolidatedTransactionService');
      } catch (transactionError) {
        const errorMessage = transactionError instanceof Error ? transactionError.message : String(transactionError);
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        
        logger.error('Failed to update shared wallet balance atomically', {
          sharedWalletId,
          userId,
          amount,
          error: errorMessage,
          isPermissionError,
          note: isPermissionError 
            ? 'Permission error - transaction succeeded on blockchain but balance update failed. Balance may be out of sync.'
            : 'Transaction succeeded on blockchain but balance update failed.'
        }, 'ConsolidatedTransactionService');

        // ✅ FIX: Don't fail the transaction if it's a permission error - transaction already succeeded on blockchain
        // The balance will be synced from on-chain on next read
        if (isPermissionError) {
          logger.warn('⚠️ Balance update failed due to permissions - transaction succeeded on blockchain', {
            sharedWalletId,
            userId,
            amount,
            note: 'Balance will be synced from on-chain data on next wallet load'
          }, 'ConsolidatedTransactionService');
          // Continue - transaction succeeded, just balance update failed
          // Calculate newBalance manually for use below
          newBalance = (wallet.totalBalance || 0) + amount;
        } else {
          // For other errors, still return error but log that transaction succeeded
          return {
            success: false,
            error: `Transaction succeeded on blockchain but failed to update balance: ${errorMessage}`
          };
        }
      }

      // Wallet balance and member contribution already updated in the transaction above
      // No need for duplicate updateDoc call

      // Record transaction
      const { generateUniqueId } = await import('../../sharedWallet/utils');
      const transactionData = {
        id: generateUniqueId('tx'),
        sharedWalletId: sharedWalletId,
        type: 'funding',
        userId: userId,
        userName: wallet.members.find((m) => m.userId === userId)?.name || 'Unknown',
        amount: amount,
        currency: wallet.currency || 'USDC',
        transactionSignature: result.signature,
        status: 'confirmed',
        memo: memo,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        source: 'in-app-wallet',
      };

      // ✅ FIX: Save transaction with error handling for permissions
      try {
        await addDoc(collection(db, 'sharedWalletTransactions'), transactionData);
        logger.info('Shared wallet funding transaction saved to Firestore', {
          signature: result.signature,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
      } catch (saveError) {
        // Log error but don't fail the transaction - it already succeeded on blockchain
        logger.error('Failed to save shared wallet funding transaction to Firestore', {
          error: saveError instanceof Error ? saveError.message : String(saveError),
          signature: result.signature,
          sharedWalletId,
          userId,
          note: 'Transaction succeeded on blockchain but failed to save to Firestore. Balance was updated but transaction record is missing.'
        }, 'ConsolidatedTransactionService');
        // Don't throw - transaction succeeded, just logging failed
      }

      // Check if goal was reached
      const { GoalService } = await import('../../sharedWallet/GoalService');
      const goalCheck = await GoalService.checkAndMarkGoalReached(sharedWalletId, newBalance);
      
      // ✅ FIX: Send notifications to all wallet members (except the funder)
      try {
        const { notificationService } = await import('../../notifications/notificationService');
        const funderMember = wallet.members?.find(m => m.userId === userId);
        const funderName = funderMember?.name || 'A member';
        
        // Notify all active members except the funder
        const membersToNotify = wallet.members?.filter(m => 
          m.userId !== userId && 
          m.status === 'active'
        ) || [];
        
        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Shared Wallet Funded',
              `${funderName} added ${amount.toFixed(6)} ${wallet.currency || 'USDC'} to "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_funding',
              {
                sharedWalletId: sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                amount: amount,
                currency: wallet.currency || 'USDC',
                funderId: userId,
                funderName: funderName,
                newBalance: newBalance,
                transactionSignature: result.signature,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send funding notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'ConsolidatedTransactionService');
          }
        }
        
        // If goal was reached, send special notification
        if (goalCheck.goalReached && goalCheck.shouldNotify) {
          for (const member of wallet.members?.filter(m => m.status === 'active') || []) {
            try {
              await notificationService.instance.sendNotification(
                member.userId,
                '🎉 Goal Reached!',
                `The shared wallet "${wallet.name || 'Shared Wallet'}" has reached its goal of ${wallet.settings?.goalAmount} ${wallet.currency || 'USDC'}!`,
                'shared_wallet_goal_reached',
                {
                  sharedWalletId: sharedWalletId,
                  walletName: wallet.name || 'Shared Wallet',
                  goalAmount: wallet.settings?.goalAmount,
                  currentBalance: newBalance,
                  currency: wallet.currency || 'USDC',
                }
              );
            } catch (notifError) {
              logger.warn('Failed to send goal reached notification', {
                memberId: member.userId,
                error: notifError instanceof Error ? notifError.message : String(notifError)
              }, 'ConsolidatedTransactionService');
            }
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send funding notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'ConsolidatedTransactionService');
        // Don't fail the transaction if notifications fail
      }

        return {
          success: true,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId,
          message: goalCheck.goalReached 
            ? `🎉 Goal reached! Successfully funded shared wallet with ${amount.toFixed(6)} USDC`
            : `Successfully funded shared wallet with ${amount.toFixed(6)} USDC`
        };
    } catch (error) {
      logger.error('Shared wallet funding failed', error, 'ConsolidatedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle Shared Wallet withdrawal
   */
  private async handleSharedWalletWithdrawal(params: any): Promise<CentralizedTransactionResult> {
    const { userId, amount, sharedWalletId, destinationAddress, memo } = params;

    try {
      // Validate parameters
      if (!sharedWalletId || !userId || !amount || amount <= 0) {
        return {
          success: false,
          error: 'Invalid withdrawal parameters'
        };
      }

      // Get destination address if not provided (should be user's personal wallet)
      // Validate that destinationAddress is a valid Solana address (not a wallet ID or other identifier)
      const solanaAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      let finalDestinationAddress = destinationAddress;
      
      // If destinationAddress is provided but doesn't look like a valid Solana address, ignore it
      if (finalDestinationAddress && !solanaAddressPattern.test(finalDestinationAddress)) {
        logger.warn('Invalid destination address format, falling back to user wallet address', {
          providedAddress: finalDestinationAddress,
          userId,
          sharedWalletId
        }, 'ConsolidatedTransactionService');
        finalDestinationAddress = undefined; // Force fallback to user wallet
      }
      
      if (!finalDestinationAddress) {
        finalDestinationAddress = await this.getUserWalletAddress(userId);
        if (!finalDestinationAddress) {
          return {
            success: false,
            error: 'User wallet address not found. Please ensure your wallet is initialized.'
          };
        }
        logger.info('Retrieved user wallet address for withdrawal', {
          userId,
          address: finalDestinationAddress
        }, 'ConsolidatedTransactionService');
      }

      // Get shared wallet
      const { SharedWalletService } = await import('../../sharedWallet');
      const walletResult = await SharedWalletService.getSharedWallet(sharedWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Shared wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Verify user is an active member
      const userMember = wallet.members?.find((m) => m.userId === userId);
      if (!userMember) {
        return {
          success: false,
          error: 'You are not a member of this shared wallet. If you were recently invited, please accept the invitation first.'
        };
      }

      if (userMember.status !== 'active') {
        if (userMember.status === 'invited') {
          return {
            success: false,
            error: 'You need to accept the invitation to this shared wallet before you can withdraw funds. Please check your notifications or the wallet details page.'
          };
        } else if (userMember.status === 'removed') {
          return {
            success: false,
            error: 'You have been removed from this shared wallet and can no longer withdraw funds. Please contact the wallet creator if you believe this is an error.'
          };
        } else {
          return {
            success: false,
            error: `Your account status is "${userMember.status}". You must be an active member to withdraw funds. Please contact the wallet creator if you need assistance.`
          };
        }
      }

      // Check member permissions
      const { MemberRightsService } = await import('../../sharedWallet/MemberRightsService');
      const canWithdrawCheck = MemberRightsService.canWithdrawAmount(userMember, wallet, amount);
      if (!canWithdrawCheck.allowed) {
        return {
          success: false,
          error: canWithdrawCheck.reason || 'You do not have permission to withdraw funds from this shared wallet. Please contact the wallet creator to request withdrawal permissions.'
        };
      }

      // Check if approval is required
      if (wallet.settings?.requireApprovalForWithdrawals && wallet.creatorId !== userId) {
        // TODO: Implement approval workflow
        // For now, return error
        return {
          success: false,
          error: 'Withdrawal requires creator approval. This feature is coming soon.'
        };
      }

      // Check user's available balance
      // ✅ FIX: Use let instead of const to allow adjustment for recent funding transactions
      let userContributed = userMember.totalContributed || 0;
      const userWithdrawn = userMember.totalWithdrawn || 0;
      let userAvailableBalance = userContributed - userWithdrawn;

      // ✅ FIX: Check for recent funding transactions if balance seems insufficient
      // This handles the race condition where funding transaction completed but Firestore update hasn't propagated
      if (amount > userAvailableBalance) {
        logger.info('Balance check failed, checking for recent funding transactions', {
          sharedWalletId,
          userId,
          amount,
          userContributed,
          userWithdrawn,
          userAvailableBalance
        }, 'ConsolidatedTransactionService');

        try {
          // Check for recent funding transactions by this user (within last 30 seconds)
          const { db } = await import('../../../config/firebase/firebase');
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          
          // ✅ OPTIMIZATION: Query without orderBy to avoid composite index requirement
          // We'll filter and sort in memory instead
          const recentFundingQuery = query(
            collection(db, 'sharedWalletTransactions'),
            where('sharedWalletId', '==', sharedWalletId),
            where('userId', '==', userId),
            where('type', '==', 'funding'),
            where('status', '==', 'confirmed')
          );

          const recentFundingSnapshot = await getDocs(recentFundingQuery);
          let recentFundingTotal = 0;
          const thirtySecondsAgo = Date.now() - 30000;
          
          // Filter and sort in memory to avoid index requirements
          const recentTransactions = recentFundingSnapshot.docs
            .map(doc => {
              const txData = doc.data();
              const createdAt = txData.createdAt?.toDate ? txData.createdAt.toDate() : new Date(txData.createdAt);
              return {
                amount: txData.amount || 0,
                createdAt: createdAt.getTime()
              };
            })
            .filter(tx => tx.createdAt > thirtySecondsAgo)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5); // Limit to 5 most recent
          
          recentFundingTotal = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

          // If we found recent funding, add it to the available balance
          if (recentFundingTotal > 0) {
            logger.info('Found recent funding transactions, adjusting available balance', {
              sharedWalletId,
              userId,
              recentFundingTotal,
              originalBalance: userAvailableBalance,
              adjustedBalance: userAvailableBalance + recentFundingTotal
            }, 'ConsolidatedTransactionService');

            userAvailableBalance += recentFundingTotal;
            userContributed += recentFundingTotal;
          }
        } catch (recentTxError) {
          logger.warn('Failed to check recent funding transactions', {
            error: recentTxError instanceof Error ? recentTxError.message : String(recentTxError),
            sharedWalletId,
            userId
          }, 'ConsolidatedTransactionService');
          // Continue with original balance check - don't fail the withdrawal if this check fails
        }
      }

      if (amount > userAvailableBalance) {
        // ✅ FIX: Provide more helpful error messages explaining WHY they can't withdraw
        let errorMessage: string;
        
        if (userAvailableBalance <= 0) {
          if (userContributed === 0 && userWithdrawn === 0) {
            errorMessage = `You haven't contributed any funds to this shared wallet yet. You can only withdraw funds that you've contributed. The wallet shows ${wallet.totalBalance.toFixed(6)} ${wallet.currency || 'USDC'} total, but this includes contributions from other members. To withdraw funds, you need to contribute first.`;
          } else if (userContributed > 0 && userWithdrawn >= userContributed) {
            errorMessage = `You've already withdrawn all of your contributions (${userContributed.toFixed(6)} ${wallet.currency || 'USDC'}). You can only withdraw funds that you've personally contributed to the shared wallet.`;
          } else {
            errorMessage = `You don't have any available balance to withdraw. Your contributions: ${userContributed.toFixed(6)} ${wallet.currency || 'USDC'}, Already withdrawn: ${userWithdrawn.toFixed(6)} ${wallet.currency || 'USDC'}.`;
          }
        } else {
          errorMessage = `Insufficient balance. You can withdraw up to ${userAvailableBalance.toFixed(6)} ${wallet.currency || 'USDC'} (your contributions: ${userContributed.toFixed(6)}, already withdrawn: ${userWithdrawn.toFixed(6)}). You're trying to withdraw ${amount.toFixed(6)} ${wallet.currency || 'USDC'}. If you just funded the wallet, please wait a few seconds and try again.`;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      // Check shared wallet has enough balance
      if (amount > wallet.totalBalance) {
        return {
          success: false,
          error: 'Insufficient balance in shared wallet'
        };
      }

      // CRITICAL: Verify user has access to the private key BEFORE attempting withdrawal
      // This ensures the user is in the participants list for the encrypted private key document
      // The getSharedWalletPrivateKey call below will also verify this, but we want to fail fast
      // with a clear error message if access is missing
      logger.info('Verifying private key access for withdrawal', {
        sharedWalletId,
        userId,
        userStatus: userMember.status,
        userRole: userMember.role
      }, 'ConsolidatedTransactionService');

      // Get shared wallet private key
      // This internally verifies the user is in the participants list in the private key document
      // If the user is not a participant, getSharedWalletPrivateKey will return an error
      const privateKeyResult = await SharedWalletService.getSharedWalletPrivateKey(sharedWalletId, userId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        logger.error('Failed to get shared wallet private key', {
          error: privateKeyResult.error,
          sharedWalletId,
          userId,
          userStatus: userMember.status,
          userRole: userMember.role,
          note: 'This may indicate the user is not in the private key participants list. Ensure inviteToSharedWallet properly grants access.'
        }, 'ConsolidatedTransactionService');
        
        // Provide a more helpful error message if access is denied
        if (privateKeyResult.error?.includes('not a participant') || 
            privateKeyResult.error?.includes('not found')) {
          return {
            success: false,
            error: 'You do not have access to the shared wallet private key. Please contact the wallet creator to grant you access, or try accepting the invitation again.'
          };
        }
        
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to access shared wallet private key. Please ensure you are an active member with proper access.'
        };
      }

      // Log private key format info (without exposing the actual key)
      const privateKey = privateKeyResult.privateKey;
      const keyLength = privateKey.length;
      const keyPreview = privateKey.substring(0, 10);
      const isBase64Like = /^[A-Za-z0-9+/=]+$/.test(privateKey);
      const isJsonLike = privateKey.trim().startsWith('[');
      const isHexLike = /^[0-9a-fA-F]+$/.test(privateKey);
      
      logger.debug('Private key format analysis', {
        keyLength,
        keyPreview: keyPreview + '...',
        isBase64Like,
        isJsonLike,
        isHexLike,
        firstChars: keyPreview,
        sharedWalletId
      }, 'ConsolidatedTransactionService');

      // Execute blockchain transaction using the shared wallet's private key
      // We need to create a custom transaction since the shared wallet is the sender
      // ✅ FIX: Use connection with fallback to handle RPC endpoint failures
      const { getConnectionWithFallback } = await import('../connection/connectionFactory');
      const connectionInstance = await getConnectionWithFallback();

      const { PublicKey, Transaction } = await import('@solana/web3.js');
      const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } = await import('../secureTokenUtils');
      const { USDC_CONFIG } = await import('../../shared/walletConstants');

      // CRITICAL: Create keypair FIRST to get the actual shared wallet address
      // The stored wallet.walletAddress might be incorrect, so we derive it from the private key
      const { KeypairUtils } = await import('../../shared/keypairUtils');
      
      logger.info('Creating keypair from private key to derive shared wallet address', {
        keyLength: privateKey.length,
        keyPreview: privateKey.substring(0, 15) + '...',
        keyEnd: '...' + privateKey.substring(Math.max(0, privateKey.length - 10)),
        isBase64Like: /^[A-Za-z0-9+/=]+$/.test(privateKey.trim()),
        isJsonLike: privateKey.trim().startsWith('['),
        isHexLike: /^[0-9a-fA-F]+$/.test(privateKey.trim()),
        sharedWalletId,
        userId
      }, 'ConsolidatedTransactionService');
      
      const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
      
      if (!keypairResult.success || !keypairResult.keypair) {
        logger.error('Failed to create keypair from private key', {
          error: keypairResult.error,
          keyLength: privateKey.length,
          keyPreview: privateKey.substring(0, 20) + '...',
          detectedFormat: keypairResult.format,
          isBase64Like: /^[A-Za-z0-9+/=]+$/.test(privateKey.trim()),
          isJsonLike: privateKey.trim().startsWith('['),
          isHexLike: /^[0-9a-fA-F]+$/.test(privateKey.trim()),
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        return {
          success: false,
          error: keypairResult.error || 'Failed to create keypair from private key. Please try again or contact support if the issue persists.'
        };
      }
      
      // Get the actual shared wallet address from the keypair
      const actualSharedWalletAddress = keypairResult.keypair.publicKey.toBase58();
      
      // Warn if the stored address doesn't match the derived address
      if (actualSharedWalletAddress !== wallet.walletAddress) {
        logger.warn('Shared wallet address mismatch - using derived address from private key', {
          storedAddress: wallet.walletAddress,
          derivedAddress: actualSharedWalletAddress,
          sharedWalletId,
          userId,
          note: 'The stored address may be incorrect. Using the address derived from the private key.'
        }, 'ConsolidatedTransactionService');
      }
      
      logger.info('Keypair created successfully from private key', {
        format: keypairResult.format,
        publicKey: actualSharedWalletAddress,
        storedAddress: wallet.walletAddress,
        addressesMatch: actualSharedWalletAddress === wallet.walletAddress,
        sharedWalletId,
        userId
      }, 'ConsolidatedTransactionService');

      // Validate addresses before instantiating PublicKey to avoid opaque base58 errors
      const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
      const addressesToValidate = {
        from: actualSharedWalletAddress, // Use derived address, not stored address
        to: finalDestinationAddress,
        mint: USDC_CONFIG.mintAddress
      };

      for (const [label, value] of Object.entries(addressesToValidate)) {
        if (!value || typeof value !== 'string' || !base58Pattern.test(value)) {
          logger.error('Invalid Solana address format for shared wallet withdrawal', {
            label,
            value,
            sharedWalletId,
            userId
          }, 'ConsolidatedTransactionService');
          return {
            success: false,
            error: `Invalid ${label} address for withdrawal`
          };
        }
      }

      let fromPublicKey;
      let toPublicKey;
      let mintPublicKey;

      try {
        fromPublicKey = new PublicKey(actualSharedWalletAddress); // Use derived address
        toPublicKey = new PublicKey(finalDestinationAddress);
        mintPublicKey = new PublicKey(USDC_CONFIG.mintAddress);
      } catch (addressError) {
        logger.error('Failed to construct PublicKey for shared wallet withdrawal', {
          error: addressError instanceof Error ? addressError.message : String(addressError),
          walletAddress: actualSharedWalletAddress,
          destinationAddress: finalDestinationAddress,
          mintAddress: USDC_CONFIG.mintAddress,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        return {
          success: false,
          error: 'Invalid wallet address detected while preparing withdrawal'
        };
      }

      const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

      // CRITICAL: Check if source (shared wallet) USDC token account exists and has balance
      // ✅ FIX: Add retry logic and fallback to Firestore balance if on-chain check fails
      let sourceTokenAccount;
      let sourceBalance = 0;
      let balanceCheckFailed = false;
      
      // Get Firestore balance as fallback
      const firestoreBalance = wallet.totalBalance || 0;
      
      try {
        // Try to get on-chain balance with retries (using the retry logic in getAccount)
        sourceTokenAccount = await getAccount(connectionInstance, fromTokenAccount, 'confirmed', 3);
        sourceBalance = Number(sourceTokenAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
        logger.info('Shared wallet USDC token account found', {
          sharedWalletAddress: actualSharedWalletAddress,
          balance: sourceBalance,
          rawAmount: sourceTokenAccount.amount.toString(),
          firestoreBalance,
          balanceMatches: Math.abs(sourceBalance - firestoreBalance) < 0.01
        }, 'ConsolidatedTransactionService');
        
        // ✅ FIX: If on-chain balance is 0 but Firestore shows balance, log warning but use Firestore balance
        if (sourceBalance === 0 && firestoreBalance > 0) {
          logger.warn('⚠️ On-chain balance is 0 but Firestore shows balance - using Firestore balance as fallback', {
            sharedWalletAddress: actualSharedWalletAddress,
            onChainBalance: sourceBalance,
            firestoreBalance,
            sharedWalletId,
            userId,
            note: 'This may indicate RPC endpoint is returning stale data or network sync issue. Using Firestore balance.'
          }, 'ConsolidatedTransactionService');
          sourceBalance = firestoreBalance; // Use Firestore balance as fallback
        }
      } catch (sourceAccountError) {
        balanceCheckFailed = true;
        const errorMessage = sourceAccountError instanceof Error ? sourceAccountError.message : String(sourceAccountError);
        
        if (errorMessage.includes('Token account not found') || errorMessage.includes('not found')) {
          // If account doesn't exist and Firestore shows 0, it's truly empty
          if (firestoreBalance === 0) {
            logger.error('Shared wallet has no USDC token account', {
              sharedWalletAddress: actualSharedWalletAddress,
              sharedWalletId,
              userId,
              note: 'The shared wallet has never received USDC. Please fund it first before withdrawing.'
            }, 'ConsolidatedTransactionService');
            return {
              success: false,
              error: 'Shared wallet has no USDC balance. Please fund the wallet first before withdrawing.'
            };
          }
          
          // If account doesn't exist but Firestore shows balance, use Firestore balance
          logger.warn('⚠️ Token account not found but Firestore shows balance - using Firestore balance as fallback', {
            sharedWalletAddress: actualSharedWalletAddress,
            firestoreBalance,
            sharedWalletId,
            userId,
            note: 'On-chain check failed but Firestore indicates balance exists. Proceeding with Firestore balance.'
          }, 'ConsolidatedTransactionService');
          sourceBalance = firestoreBalance;
        } else if (errorMessage.includes('Network request failed') || errorMessage.includes('timeout')) {
          // Network error - use Firestore balance as fallback
          logger.warn('⚠️ Network error during balance check - using Firestore balance as fallback', {
            sharedWalletAddress: actualSharedWalletAddress,
            firestoreBalance,
            error: errorMessage,
            sharedWalletId,
            userId,
            note: 'RPC endpoint failed. Using Firestore balance as fallback.'
          }, 'ConsolidatedTransactionService');
          sourceBalance = firestoreBalance;
        } else {
          // Other errors - still try Firestore balance as fallback
          logger.warn('⚠️ Balance check failed - using Firestore balance as fallback', {
            sharedWalletAddress: actualSharedWalletAddress,
            firestoreBalance,
            error: errorMessage,
            sharedWalletId,
            userId
          }, 'ConsolidatedTransactionService');
          sourceBalance = firestoreBalance;
        }
      }

      // Check if source has sufficient balance
      if (sourceBalance < amount) {
        logger.error('Insufficient balance in shared wallet', {
          sharedWalletAddress: actualSharedWalletAddress,
          requestedAmount: amount,
          availableBalance: sourceBalance,
          firestoreBalance,
          onChainCheckFailed: balanceCheckFailed,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        return {
          success: false,
          error: `Insufficient balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC`
        };
      }

      // Create transaction
      const transaction = new Transaction();

      // Check if destination token account exists
      try {
        await getAccount(connectionInstance, toTokenAccount);
        logger.debug('Destination USDC token account exists', { 
          toTokenAccount: toTokenAccount.toBase58() 
        }, 'ConsolidatedTransactionService');
      } catch {
        // Create associated token account if it doesn't exist
        logger.debug('Destination USDC token account does not exist, will create it', { 
          toTokenAccount: toTokenAccount.toBase58(),
          recipient: finalDestinationAddress,
          note: 'This is expected for new recipients - account will be created automatically'
        }, 'ConsolidatedTransactionService');
        const { COMPANY_WALLET_CONFIG } = await import('../../../config/constants/feeConfig');
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        const companyPublicKey = new PublicKey(companyWalletAddress);

        transaction.add(
          createAssociatedTokenAccountInstruction(
            companyPublicKey,
            toTokenAccount,
            toPublicKey,
            mintPublicKey
          )
        );
      }

      // Calculate amount (USDC has 6 decimals)
      const transferAmount = Math.floor(amount * Math.pow(10, 6));

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          transferAmount
        )
      );

      // Sign and send transaction
      // Use the keypair we already created earlier
      const fromKeypair = keypairResult.keypair;

      // CRITICAL: Company wallet must be the fee payer, not the shared wallet
      // The shared wallet might not have SOL to pay for transaction fees
      const { COMPANY_WALLET_CONFIG } = await import('../../../config/constants/feeConfig');
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      const companyPublicKey = new PublicKey(companyWalletAddress);
      
      transaction.feePayer = companyPublicKey;
      const latestBlockhash = await connectionInstance.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      // Sign transaction with shared wallet keypair (for the transfer instruction)
      transaction.sign(fromKeypair);

      // Simulate transaction before sending to catch errors early
      try {
        const simulationResult = await connectionInstance.simulateTransaction(transaction);
        if (simulationResult.value.err) {
          const errorMessage = JSON.stringify(simulationResult.value.err);
          logger.error('Transaction simulation failed', {
            error: errorMessage,
            logs: simulationResult.value.logs || [],
            sharedWalletAddress: actualSharedWalletAddress,
            amount,
            sourceBalance,
            sharedWalletId,
            userId
          }, 'ConsolidatedTransactionService');
          
          // Provide more helpful error messages
          if (errorMessage.includes('Attempt to debit an account but found no record of a prior credit')) {
            return {
              success: false,
              error: `Shared wallet has insufficient USDC balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC. Please fund the wallet first.`
            };
          }
          
          if (errorMessage.includes('AccountNotFound')) {
            return {
              success: false,
              error: `Transaction failed: One of the accounts required for this transaction was not found. This may be because the shared wallet doesn't have SOL to pay for fees, or a required account is missing. Please contact support if this issue persists.`
            };
          }
          
          return {
            success: false,
            error: `Transaction simulation failed: ${errorMessage}`
          };
        }
        
        logger.debug('Transaction simulation successful', {
          sharedWalletAddress: actualSharedWalletAddress,
          amount,
          sourceBalance
        }, 'ConsolidatedTransactionService');
      } catch (simulationError) {
        logger.error('Transaction simulation error', {
          error: simulationError instanceof Error ? simulationError.message : String(simulationError),
          sharedWalletAddress: actualSharedWalletAddress,
          amount,
          sourceBalance,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        
        // If simulation fails with "no record of prior credit", it means the account has no balance
        const errorMessage = simulationError instanceof Error ? simulationError.message : String(simulationError);
        if (errorMessage.includes('no record of a prior credit') || errorMessage.includes('Attempt to debit')) {
          return {
            success: false,
            error: `Shared wallet has insufficient USDC balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC. Please fund the wallet first.`
          };
        }
        
        return {
          success: false,
          error: `Transaction validation failed: ${errorMessage}`
        };
      }

      // Convert Transaction to VersionedTransaction for Firebase Functions
      // The company wallet needs to sign as fee payer, so we send to Firebase Functions
      const solanaWeb3 = await import('@solana/web3.js');
      const { VersionedTransaction } = solanaWeb3;
      
      let versionedTransaction: InstanceType<typeof VersionedTransaction>;
      try {
        const compiledMessage = transaction.compileMessage();
        if (!compiledMessage) {
          throw new Error('Failed to compile transaction message');
        }
        
        versionedTransaction = new VersionedTransaction(compiledMessage);
        // Sign with shared wallet keypair (for the transfer instruction)
        versionedTransaction.sign([fromKeypair]);
        
        logger.debug('Transaction converted to VersionedTransaction and signed with shared wallet', {
          sharedWalletAddress: actualSharedWalletAddress,
          feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
        }, 'ConsolidatedTransactionService');
      } catch (versionError) {
        logger.error('Failed to convert transaction to VersionedTransaction', {
          error: versionError instanceof Error ? versionError.message : String(versionError),
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        return {
          success: false,
          error: `Failed to prepare transaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`
        };
      }

      // Serialize the partially signed transaction
      const serializedTransaction = versionedTransaction.serialize();
      
      // Send to Firebase Functions for company wallet signature
      const { signTransaction: signTransactionWithCompany, submitTransaction: submitTransactionToNetwork } = await import('./transactionSigningService');
      
      let signature: string;
      try {
        // Get company wallet signature
        const signedTransaction = await signTransactionWithCompany(serializedTransaction);
        
        // Submit transaction
        const submitResult = await submitTransactionToNetwork(signedTransaction);
        signature = submitResult.signature;
        
        logger.info('Shared wallet withdrawal transaction submitted successfully', {
          signature,
          sharedWalletAddress: actualSharedWalletAddress,
          amount,
          userId
        }, 'ConsolidatedTransactionService');

      // Verify transaction with timeout-safe verification (replaces confirmTransaction)
      // Use network-aware timeout values: more attempts for devnet
      const { getEnvVar } = await import('../../../utils/core/environmentUtils');
      const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK') || getEnvVar('EXPO_PUBLIC_DEV_NETWORK') || '';
      const buildProfile = getEnvVar('EAS_BUILD_PROFILE');
      const appEnv = getEnvVar('APP_ENV');
      const isProduction = buildProfile === 'production' || 
                          appEnv === 'production' ||
                          process.env.NODE_ENV === 'production' ||
                          !__DEV__;
      const isMainnet = isProduction || networkEnv.toLowerCase() === 'mainnet' || getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
      
      // Use same timeout values as Firebase Functions: 15 attempts for mainnet, 20 for devnet
      const maxAttempts = isMainnet ? 10 : 20;
      const baseDelayMs = 2000;
      
      const { verifyTransactionOnBlockchain } = await import('../../shared/transactionUtils');
      const verificationResult = await verifyTransactionOnBlockchain(signature, {
        maxAttempts,
        baseDelayMs
      });
      
      if (!verificationResult.success) {
        logger.error('Transaction verification failed', {
          signature,
          error: verificationResult.error,
          sharedWalletId,
          userId,
          maxAttempts,
          isMainnet
        }, 'ConsolidatedTransactionService');
        
        return {
          success: false,
          error: verificationResult.error || 'Transaction verification failed. The transaction may still be processing on the blockchain.'
        };
      }
      
      logger.info('Transaction verified successfully', {
        signature,
        confirmationStatus: verificationResult.confirmationStatus,
        confirmations: verificationResult.confirmations,
        slot: verificationResult.slot,
        sharedWalletId,
        userId
      }, 'ConsolidatedTransactionService');
      } catch (firebaseError) {
        const errorMessage = firebaseError instanceof Error ? firebaseError.message : String(firebaseError);
        const errorCode = (firebaseError as any)?.code;
        
        logger.error('Failed to sign or submit transaction via Firebase Functions', {
          error: errorMessage,
          errorCode,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
        
        // Provide more helpful error messages
        let userFriendlyError = 'Transaction failed';
        if (errorCode === 'functions/internal' || errorMessage.includes('internal')) {
          userFriendlyError = 'Firebase Functions error: The transaction signing service is temporarily unavailable. Please try again in a moment. If the issue persists, check if Firebase Functions emulator is running or if production functions are deployed.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
          userFriendlyError = 'Transaction timed out. The transaction may have succeeded. Please check your transaction history.';
        } else if (errorMessage.includes('connection') || errorMessage.includes('network')) {
          userFriendlyError = 'Network error: Unable to connect to transaction service. Please check your internet connection and try again.';
        } else {
          userFriendlyError = `Transaction failed: ${errorMessage}`;
        }
        
        return {
          success: false,
          error: userFriendlyError
        };
      }

      // Update shared wallet balance and member withdrawal amount using Firestore transaction for atomicity
      const { db } = await import('../../../config/firebase/firebase');
      const { doc, runTransaction, addDoc, collection, serverTimestamp } = await import('firebase/firestore');

      // Get wallet document ID - fetch it if not already in wallet object
      let walletDocId = wallet.firebaseDocId;
      if (!walletDocId) {
        // Fetch wallet document to get the Firebase document ID
        const { getSharedWalletDocById } = await import('../../sharedWallet/utils');
        const walletDocResult = await getSharedWalletDocById(sharedWalletId);
        if (!walletDocResult) {
          logger.error('Wallet document ID not found', { sharedWalletId }, 'ConsolidatedTransactionService');
          return {
            success: false,
            error: 'Failed to find wallet document'
          };
        }
        walletDocId = walletDocResult.walletDocId;
      }

      // Use Firestore transaction to ensure atomic balance updates
      const walletRef = doc(db, 'sharedWallets', walletDocId);
      let newBalance: number;

      try {
        await runTransaction(db, async (transaction) => {
          const walletDoc = await transaction.get(walletRef);

          if (!walletDoc.exists()) {
            throw new Error('Shared wallet document not found');
          }

          const currentWallet = walletDoc.data();
          const currentBalance = currentWallet.totalBalance || 0;
          newBalance = currentBalance - amount;

          // Check if wallet has sufficient balance
          if (newBalance < 0) {
            throw new Error('Insufficient balance in shared wallet');
          }

          // Update member withdrawal amount
          const currentMembers = currentWallet.members || [];
          const updatedMembers = currentMembers.map((m: any) => {
            if (m.userId === userId) {
              return {
                ...m,
                totalWithdrawn: (m.totalWithdrawn || 0) + amount,
              };
            }
            return m;
          });

          transaction.update(walletRef, {
            totalBalance: newBalance,
            members: updatedMembers,
            updatedAt: serverTimestamp(),
          });
        });
        
        logger.info('Shared wallet balance updated successfully after withdrawal', {
          sharedWalletId,
          userId,
          amount,
          newBalance,
          oldBalance: wallet.totalBalance
        }, 'ConsolidatedTransactionService');
      } catch (transactionError) {
        const errorMessage = transactionError instanceof Error ? transactionError.message : String(transactionError);
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        
        logger.error('Failed to update shared wallet balance atomically', {
          sharedWalletId,
          userId,
          amount,
          error: errorMessage,
          isPermissionError,
          note: isPermissionError 
            ? 'Permission error - transaction succeeded on blockchain but balance update failed. Balance may be out of sync.'
            : 'Transaction succeeded on blockchain but balance update failed.'
        }, 'ConsolidatedTransactionService');

        // ✅ FIX: Don't fail the transaction if it's a permission error - transaction already succeeded on blockchain
        // The balance will be synced from on-chain on next read
        if (isPermissionError) {
          logger.warn('⚠️ Balance update failed due to permissions - transaction succeeded on blockchain', {
            sharedWalletId,
            userId,
            amount,
            note: 'Balance will be synced from on-chain data on next wallet load'
          }, 'ConsolidatedTransactionService');
          // Continue - transaction succeeded, just balance update failed
        } else {
          // For other errors, still return error but log that transaction succeeded
          return {
            success: false,
            error: `Transaction succeeded on blockchain but failed to update balance: ${errorMessage}`
          };
        }
      }

      // Record transaction
      const { generateUniqueId } = await import('../../sharedWallet/utils');
      const transactionData = {
        id: generateUniqueId('tx'),
        sharedWalletId: sharedWalletId,
        type: 'withdrawal',
        userId: userId,
        userName: userMember.name || 'Unknown',
        amount: amount,
        currency: wallet.currency || 'USDC',
        transactionSignature: signature,
        status: 'confirmed',
        memo: memo,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        destination: finalDestinationAddress,
      };

      // ✅ FIX: Save transaction with error handling for permissions
      try {
        await addDoc(collection(db, 'sharedWalletTransactions'), transactionData);
        logger.info('Shared wallet withdrawal transaction saved to Firestore', {
          signature,
          sharedWalletId,
          userId
        }, 'ConsolidatedTransactionService');
      } catch (saveError) {
        // Log error but don't fail the transaction - it already succeeded on blockchain
        logger.error('Failed to save shared wallet withdrawal transaction to Firestore', {
          error: saveError instanceof Error ? saveError.message : String(saveError),
          signature,
          sharedWalletId,
          userId,
          note: 'Transaction succeeded on blockchain but failed to save to Firestore. Balance was updated but transaction record is missing.'
        }, 'ConsolidatedTransactionService');
        // Don't throw - transaction succeeded, just logging failed
      }

      // ✅ FIX: Send notifications to all wallet members (except the withdrawer)
      try {
        const { notificationService } = await import('../../notifications/notificationService');
        const withdrawerName = userMember.name || 'A member';
        
        // Notify all active members except the withdrawer
        const membersToNotify = wallet.members?.filter(m => 
          m.userId !== userId && 
          m.status === 'active'
        ) || [];
        
        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Shared Wallet Withdrawal',
              `${withdrawerName} withdrew ${amount.toFixed(6)} ${wallet.currency || 'USDC'} from "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_withdrawal',
              {
                sharedWalletId: sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                amount: amount,
                currency: wallet.currency || 'USDC',
                withdrawerId: userId,
                withdrawerName: withdrawerName,
                newBalance: newBalance,
                transactionSignature: signature,
                destination: finalDestinationAddress,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send withdrawal notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'ConsolidatedTransactionService');
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send withdrawal notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'ConsolidatedTransactionService');
        // Don't fail the transaction if notifications fail
      }

        return {
          success: true,
        transactionSignature: signature,
        transactionId: signature,
        txId: signature,
        fee: 0, // Company covers fees for withdrawals
        netAmount: amount,
        blockchainFee: 0,
          message: `Successfully withdrew ${amount.toFixed(6)} USDC from shared wallet`
        };
    } catch (error) {
      logger.error('Shared wallet withdrawal failed', error, 'ConsolidatedTransactionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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
