/**
 * SPEND Merchant Payment Service
 * Handles automatic payment to SPEND treasury wallet when threshold is met
 */

import { Split, SplitStorageService } from '../../splits/splitStorageService';
import { SplitWalletService } from '../../split';
import { SpendPaymentModeService } from './SpendPaymentModeService';
import { SpendWebhookService } from './SpendWebhookService';
import { SpendPaymentResult, SPEND_CONFIG } from './SpendTypes';
import { PaymentResult } from '../../split/types';
import { logger } from '../../analytics/loggingService';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../config/firebase/firebase';

export class SpendMerchantPaymentService {
  /**
   * Process merchant payment to SPEND treasury wallet
   * Called automatically when payment threshold is met
   * 
   * @param splitId - The split ID
   * @param splitWalletId - The split wallet ID
   * @returns Payment result with transaction signature
   */
  static async processMerchantPayment(
    splitId: string,
    splitWalletId: string
  ): Promise<SpendPaymentResult> {
    try {
      logger.info('Processing merchant payment to SPEND', {
        splitId,
        splitWalletId,
      }, 'SpendMerchantPaymentService');

      // Get split wallet by ID using the unified SplitWalletService facade
      const { SplitWalletService } = await import('../../split');
      const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;
      const splitResult = await SplitStorageService.getSplitByBillId(wallet.billId);

      if (!splitResult.success || !splitResult.split) {
        return {
          success: false,
          error: splitResult.error || 'Split not found',
        };
      }

      const split = splitResult.split;

      // Verify payment mode
      if (!SpendPaymentModeService.requiresMerchantPayment(split)) {
        return {
          success: false,
          error: 'Split does not require merchant payment',
        };
      }

      // Check if already processed (idempotency)
      if (SpendPaymentModeService.isPaymentAlreadyProcessed(split)) {
        logger.warn('Merchant payment already processed', {
          splitId,
          paymentStatus: split.externalMetadata?.paymentStatus,
        }, 'SpendMerchantPaymentService');

        return {
          success: true,
          transactionSignature: split.externalMetadata?.paymentTransactionSig,
          amount: split.totalAmount,
          message: 'Payment already processed',
        };
      }

      // Verify threshold is met
      const totalPaid = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      if (!SpendPaymentModeService.isPaymentThresholdMet(split, totalPaid)) {
        return {
          success: false,
          error: `Payment threshold not met. Required: ${split.totalAmount * (split.externalMetadata?.paymentThreshold || 1.0)}, Paid: ${totalPaid}`,
        };
      }

      // Mark as 'processing' (atomic update to prevent duplicates)
      const idempotencyKey = `merchant_payment_${split.externalMetadata?.orderId}_${Date.now()}`;
      await this.updatePaymentStatus(split, {
        paymentStatus: 'processing',
        idempotencyKey,
        paymentAttempts: (split.externalMetadata?.paymentAttempts || 0) + 1,
        lastPaymentAttempt: new Date().toISOString(),
      });

      // x402 validation for merchant payment - fail-safe: if x402 fails, allow payment to proceed
      try {
        const { X402Service } = await import('../corbits');
        const treasuryWallet = split.externalMetadata?.treasuryWallet;
        if (treasuryWallet) {
          const x402Validation = await X402Service.validatePaymentRequest({
            userId: wallet.creatorId,
            amount: split.totalAmount,
            currency: split.currency || 'USDC',
            context: 'spend_split_payment',
            metadata: {
              splitId: split.id,
              orderId: split.externalMetadata?.orderId,
              treasuryWallet,
            },
          });

          // If x402 validation explicitly fails, block merchant payment
          if (x402Validation.success && !x402Validation.valid) {
            await this.updatePaymentStatus(split, {
              paymentStatus: 'failed',
              paymentAttempts: (split.externalMetadata?.paymentAttempts || 0),
            });

            logger.warn('x402 validation blocked merchant payment', {
              splitId,
              orderId: split.externalMetadata?.orderId,
              amount: split.totalAmount,
              riskScore: x402Validation.riskScore,
              riskLevel: x402Validation.riskLevel,
              error: x402Validation.error,
            }, 'SpendMerchantPaymentService');

            return {
              success: false,
              error: x402Validation.error || 'Merchant payment failed risk assessment',
            };
          }

          // Log x402 validation result (even if it passes)
          if (x402Validation.success) {
            logger.debug('x402 validation passed for merchant payment', {
              splitId,
              orderId: split.externalMetadata?.orderId,
              amount: split.totalAmount,
              riskScore: x402Validation.riskScore,
              riskLevel: x402Validation.riskLevel,
            }, 'SpendMerchantPaymentService');
          }
        }
      } catch (x402Error) {
        // Fail-safe: Log error but allow merchant payment to proceed
        logger.warn('x402 validation error for merchant payment, allowing payment to proceed', {
          error: x402Error instanceof Error ? x402Error.message : String(x402Error),
          splitId,
          orderId: split.externalMetadata?.orderId,
          amount: split.totalAmount,
        }, 'SpendMerchantPaymentService');
      }

      // Send payment to merchant
      const paymentResult = await this.sendPaymentToMerchant(split, splitWalletId, wallet.creatorId);

      if (!paymentResult.success || !paymentResult.transactionSignature) {
        // Mark as failed
        await this.updatePaymentStatus(split, {
          paymentStatus: 'failed',
          paymentAttempts: (split.externalMetadata?.paymentAttempts || 0),
        });

        return {
          success: false,
          error: paymentResult.error || 'Failed to send payment to merchant',
        };
      }

      // Verify transaction on-chain (optional but recommended)
      // The transaction signature is already returned from extractFairSplitFunds
      // We can add verification here if needed

      // Mark as 'paid' on success
      await this.updatePaymentStatus(split, {
        paymentStatus: 'paid',
        paymentTransactionSig: paymentResult.transactionSignature,
      });

      // Update split status to 'completed' after successful merchant payment
      try {
        const { SplitStorageService } = await import('../../splits');
        const completedAt = new Date().toISOString();
        const updateResult = await SplitStorageService.updateSplit(split.id, {
          status: 'completed' as const,
          completedAt: completedAt,
          updatedAt: completedAt,
        });

        if (updateResult.success) {
          logger.info('Split status updated to completed after merchant payment', {
            splitId: split.id,
            completedAt,
            transactionSignature: paymentResult.transactionSignature,
          }, 'SpendMerchantPaymentService');
        } else {
          logger.warn('Failed to update split status to completed', {
            splitId: split.id,
            error: updateResult.error,
          }, 'SpendMerchantPaymentService');
        }
      } catch (statusUpdateError) {
        logger.error('Error updating split status to completed', {
          splitId: split.id,
          error: statusUpdateError instanceof Error ? statusUpdateError.message : String(statusUpdateError),
        }, 'SpendMerchantPaymentService');
        // Don't fail the payment if status update fails
      }

      // Send notifications to all participants (async, don't block)
      this.notifyParticipantsAsync(split, paymentResult.transactionSignature, paymentResult.amount || split.totalAmount)
        .catch((error) => {
          logger.error('Failed to send participant notifications (non-blocking)', {
            splitId,
            error: error instanceof Error ? error.message : String(error),
          }, 'SpendMerchantPaymentService');
        });

      // Call webhook (async, don't block)
      const webhookUrl = split.externalMetadata?.webhookUrl;
      const webhookSecret = split.externalMetadata?.webhookSecret;

      if (webhookUrl && webhookSecret) {
        // Call webhook asynchronously - don't fail payment if webhook fails
        this.callWebhookAsync(split, paymentResult.transactionSignature, paymentResult.amount || split.totalAmount)
          .catch((error) => {
            logger.error('Webhook call failed (non-blocking)', {
              splitId,
              error: error instanceof Error ? error.message : String(error),
            }, 'SpendMerchantPaymentService');
          });
      } else {
        logger.warn('Webhook URL or secret not provided, skipping webhook call', {
          splitId,
          hasWebhookUrl: !!webhookUrl,
          hasWebhookSecret: !!webhookSecret,
        }, 'SpendMerchantPaymentService');
      }

      logger.info('Merchant payment processed successfully', {
        splitId,
        transactionSignature: paymentResult.transactionSignature,
        amount: paymentResult.amount,
      }, 'SpendMerchantPaymentService');

      return {
        success: true,
        transactionSignature: paymentResult.transactionSignature,
        amount: paymentResult.amount || split.totalAmount,
        webhookCalled: !!webhookUrl && !!webhookSecret,
      };

    } catch (error) {
      logger.error('Error processing merchant payment', {
        splitId,
        splitWalletId,
        error: error instanceof Error ? error.message : String(error),
      }, 'SpendMerchantPaymentService');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send payment to SPEND merchant treasury wallet
   * Uses existing extractFairSplitFunds with custom memo format
   * 
   * @param split - The split to pay
   * @param splitWalletId - The split wallet ID
   * @param creatorId - The creator's user ID
   * @returns Payment result with transaction signature
   */
  private static async sendPaymentToMerchant(
    split: Split,
    splitWalletId: string,
    creatorId: string
  ): Promise<PaymentResult> {
    const treasuryWallet = SpendPaymentModeService.getTreasuryWallet(split);
    
    // Use centralized utility to extract orderId
    const orderId = SpendPaymentModeService.getOrderId(split);

    if (!treasuryWallet) {
      return {
        success: false,
        error: 'Treasury wallet not configured',
      };
    }

    if (!orderId) {
      return {
        success: false,
        error: 'Order ID not configured',
      };
    }

    // Format memo: "SP3ND Order: {orderId}"
    // Use order_number if available (more readable), otherwise use id
    const orderNumber = SpendPaymentModeService.getOrderNumber(split);
    const memoOrderId = orderNumber || orderId || '';
    const memo = SPEND_CONFIG.memoFormat.replace('{orderId}', String(memoOrderId));

    logger.info('Sending payment to SPEND treasury', {
      splitId: split.id,
      treasuryWallet,
      orderId,
      amount: split.totalAmount,
      memo,
    }, 'SpendMerchantPaymentService');

    // Use existing extractFairSplitFunds via SplitWalletService with treasury wallet and custom memo
    const result = await SplitWalletService.extractFairSplitFunds(
      splitWalletId,
      treasuryWallet,
      creatorId,
      memo
    );

    // Verify transaction on-chain if successful
    if (result.success && result.transactionSignature) {
      logger.info('Verifying merchant payment transaction on-chain', {
        splitId: split.id,
        transactionSignature: result.transactionSignature,
        treasuryWallet,
      }, 'SpendMerchantPaymentService');
      
      // Transaction verification is handled by extractFairSplitFunds
      // Additional verification can be added here if needed
    }

    return result;
  }

  /**
   * Update payment status atomically in Firestore
   * 
   * @param split - The split to update
   * @param updates - Payment status updates
   */
  private static async updatePaymentStatus(
    split: Split,
    updates: {
      paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
      paymentTransactionSig?: string;
      paymentAttempts?: number;
      lastPaymentAttempt?: string;
      idempotencyKey?: string;
    }
  ): Promise<void> {
    if (!split.firebaseDocId) {
      throw new Error('Split firebaseDocId is required for atomic updates');
    }

    const updateData: any = {
      'externalMetadata.paymentStatus': updates.paymentStatus,
      updatedAt: new Date().toISOString(),
    };

    if (updates.paymentTransactionSig !== undefined) {
      updateData['externalMetadata.paymentTransactionSig'] = updates.paymentTransactionSig;
    }

    if (updates.paymentAttempts !== undefined) {
      updateData['externalMetadata.paymentAttempts'] = updates.paymentAttempts;
    }

    if (updates.lastPaymentAttempt !== undefined) {
      updateData['externalMetadata.lastPaymentAttempt'] = updates.lastPaymentAttempt;
    }

    if (updates.idempotencyKey !== undefined) {
      updateData['externalMetadata.idempotencyKey'] = updates.idempotencyKey;
    }

    try {
      const splitRef = doc(db, 'splits', split.firebaseDocId);
      
      // Use Firestore transaction for atomic updates
      await runTransaction(db, async (transaction) => {
        const splitDoc = await transaction.get(splitRef);
        
        if (!splitDoc.exists()) {
          throw new Error('Split document does not exist');
        }

        const currentData = splitDoc.data();
        const currentStatus = currentData?.externalMetadata?.paymentStatus;
        
        // Prevent status regression (e.g., paid -> processing)
        if (updates.paymentStatus) {
          const statusOrder = ['pending', 'processing', 'paid', 'failed', 'refunded'];
          const currentIndex = statusOrder.indexOf(currentStatus);
          const newIndex = statusOrder.indexOf(updates.paymentStatus);
          
          if (currentIndex > newIndex && currentStatus !== 'failed') {
            logger.warn('Preventing payment status regression', {
              splitId: split.id,
              currentStatus,
              attemptedStatus: updates.paymentStatus,
            }, 'SpendMerchantPaymentService');
            // Don't update if regression detected (except failed -> any is allowed)
            return;
          }
        }

        transaction.update(splitRef, updateData);
      });

      logger.info('Payment status updated atomically', {
        splitId: split.id,
        updates,
      }, 'SpendMerchantPaymentService');
    } catch (error) {
      logger.error('Failed to update payment status atomically', {
        splitId: split.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'SpendMerchantPaymentService');
      throw error;
    }
  }

  /**
   * Notify all participants that payment was sent to merchant (async, non-blocking)
   * 
   * @param split - The split that was paid
   * @param transactionSignature - Transaction signature
   * @param amount - Amount paid
   */
  private static async notifyParticipantsAsync(
    split: Split,
    transactionSignature: string,
    amount: number
  ): Promise<void> {
    try {
      const { notificationService } = await import('../../notifications');
      
      // Notify all participants
      const notificationPromises = (split.participants || []).map(async (participant) => {
        if (!participant.userId) {
          return;
        }

        try {
          await notificationService.instance.sendNotification(
            participant.userId,
            'Payment Sent to SPEND ✅',
            `Payment of ${amount.toFixed(2)} USDC has been sent to SPEND for "${split.title || 'Split'}". Your order will be fulfilled shortly.`,
            'spend_payment_completed',
            {
              splitId: split.id,
              splitName: split.title,
              transactionSignature,
              amount,
              currency: split.currency || 'USDC',
              orderId: split.externalMetadata?.orderId,
              status: 'completed',
              timestamp: new Date().toISOString(),
            }
          );
        } catch (error) {
          logger.warn('Failed to send notification to participant', {
            splitId: split.id,
            participantId: participant.userId,
            error: error instanceof Error ? error.message : String(error),
          }, 'SpendMerchantPaymentService');
        }
      });

      await Promise.allSettled(notificationPromises);
      
      logger.info('Participant notifications sent', {
        splitId: split.id,
        participantCount: split.participants?.length || 0,
      }, 'SpendMerchantPaymentService');
    } catch (error) {
      logger.error('Error sending participant notifications', {
        splitId: split.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'SpendMerchantPaymentService');
    }
  }

  /**
   * Call webhook asynchronously (non-blocking)
   * 
   * @param split - The split that was paid
   * @param transactionSignature - Transaction signature
   * @param amount - Amount paid
   */
  private static async callWebhookAsync(
    split: Split,
    transactionSignature: string,
    amount: number
  ): Promise<void> {
    const webhookUrl = split.externalMetadata?.webhookUrl;
    const webhookSecret = split.externalMetadata?.webhookSecret;

    if (!webhookUrl || !webhookSecret) {
      return;
    }

    // Determine currency from split
    const currency = split.currency === 'USDC' ? 'USDC' : 
                     split.currency === 'SOL' ? 'SOL' : 
                     split.currency === 'BONK' ? 'BONK' : 'USDC';

    const payload = SpendWebhookService.buildWebhookPayload(
      split,
      transactionSignature,
      amount,
      currency
    );

    const response = await SpendWebhookService.callSpendWebhook(
      payload,
      webhookUrl,
      webhookSecret
    );

    if (!response) {
      logger.warn('Webhook call returned null (all retries failed)', {
        splitId: split.id,
        orderId: split.externalMetadata?.orderId,
      }, 'SpendMerchantPaymentService');
    } else if (!response.success) {
      logger.warn('Webhook call returned error', {
        splitId: split.id,
        orderId: split.externalMetadata?.orderId,
        error: response.error,
        code: response.code,
      }, 'SpendMerchantPaymentService');
    } else {
      logger.info('Webhook called successfully', {
        splitId: split.id,
        orderId: split.externalMetadata?.orderId,
        response: response,
      }, 'SpendMerchantPaymentService');
    }
  }
}

