/**
 * Shared Split Wallet Services
 * Centralized logic for funding and withdrawal operations to eliminate code duplication
 * between Fair Split and Degen Split implementations
 */

import { Platform } from 'react-native';
import { logger } from '../loggingService';
import { roundUsdcAmount } from '../../utils/currencyUtils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, PaymentResult } from './types';
import { KeypairUtils } from '../shared/keypairUtils';
import { ValidationUtils } from '../shared/validationUtils';
import { BalanceUtils } from '../shared/balanceUtils';

// Import the shared transaction execution function
import { executeSplitWalletTransaction } from './SplitWalletPayments';

export type SplitType = 'fair' | 'degen';
export type PaymentMethod = 'in-app' | 'external' | 'kast-card';

export interface FundingRequest {
  splitWalletId: string;
  participantId: string;
  amount: number;
  splitType: SplitType;
  transactionSignature?: string;
}

export interface WithdrawalRequest {
  splitWalletId: string;
  requesterId: string;
  recipientAddress: string;
  amount: number;
  splitType: SplitType;
  paymentMethod?: PaymentMethod;
  description?: string;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  wallet?: SplitWallet;
  participant?: SplitWalletParticipant;
}

/**
 * Shared validation service for split wallet operations
 */
export class SplitWalletValidator {
  /**
   * Validate funding request parameters
   */
  static async validateFundingRequest(
    splitWalletId: string,
    participantId: string,
    amount: number,
    splitType: SplitType
  ): Promise<ValidationResult> {
    try {
      // Validate amount
      const roundedAmount = roundUsdcAmount(amount);
      if (roundedAmount <= 0) {
        return {
          success: false,
          error: 'Invalid payment amount'
        };
      }

      // Get split wallet
      const { SplitWalletPayments } = await import('./SplitWalletPayments');
      const walletResult = await SplitWalletPayments.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Find participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet'
        };
      }

      // Validate payment amount against what they owe
      const remainingAmount = participant.amountOwed - participant.amountPaid;
      const roundedRemainingAmount = roundUsdcAmount(remainingAmount);
      if (roundedAmount > roundedRemainingAmount) {
        return {
          success: false,
          error: `Payment amount (${roundedAmount} USDC) exceeds remaining amount (${roundedRemainingAmount} USDC)`
        };
      }

      // Check if participant has already paid their full share
      if (participant.status === 'paid' || participant.amountPaid >= participant.amountOwed) {
        return {
          success: false,
          error: 'Participant has already paid their full share'
        };
      }

      return {
        success: true,
        wallet,
        participant
      };
    } catch (error) {
      logger.error('Failed to validate funding request', error, 'SplitWalletValidator');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Validate withdrawal request parameters
   */
  static async validateWithdrawalRequest(
    splitWalletId: string,
    requesterId: string,
    splitType: SplitType
  ): Promise<ValidationResult> {
    try {
      // Get split wallet
      const { SplitWalletPayments } = await import('./SplitWalletPayments');
      const walletResult = await SplitWalletPayments.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Validate permissions based on split type
      if (splitType === 'fair') {
        // Fair Split: Only creator can withdraw
        if (wallet.creatorId !== requesterId) {
          return {
            success: false,
            error: 'Only the split creator can extract funds from a Fair Split'
          };
        }
      } else {
        // Degen Split: Any participant can withdraw
        const participant = wallet.participants.find(p => p.userId === requesterId);
        if (!participant) {
          return {
            success: false,
            error: 'Participant not found in split wallet'
          };
        }

        // Check if participant has already been paid
        if (participant.status === 'paid') {
          return {
            success: false,
            error: 'Participant has already been paid. Each participant can only be paid once.'
          };
        }
      }

      return {
        success: true,
        wallet,
        participant: splitType === 'degen' ? wallet.participants.find(p => p.userId === requesterId) : undefined
      };
    } catch (error) {
      logger.error('Failed to validate withdrawal request', error, 'SplitWalletValidator');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Validate user wallet and secret key
   */
  static async validateUserWallet(userId: string): Promise<{ success: boolean; wallet?: any; error?: string }> {
    try {
      const { walletService } = await import('../WalletService');
      const userWallet = await walletService.getUserWallet(userId);
      if (!userWallet || !userWallet.secretKey) {
        return {
          success: false,
          error: 'Failed to retrieve user wallet or secret key for transaction'
        };
      }
      return {
        success: true,
        wallet: userWallet
      };
    } catch (error) {
      logger.error('Failed to validate user wallet', error, 'SplitWalletValidator');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve user wallet'
      };
    }
  }
}

/**
 * Shared database service for split wallet operations
 */
export class SplitWalletDatabaseService {
  /**
   * Update participant status after successful transaction
   */
  static async updateParticipantStatus(
    splitWalletId: string,
    participantId: string,
    newStatus: 'paid' | 'locked',
    transactionSignature: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { SplitWalletPayments } = await import('./SplitWalletPayments');
      const walletResult = await SplitWalletPayments.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          return {
            ...p,
            status: newStatus,
            amountPaid: p.amountPaid + amount,
            transactionSignature,
            paidAt: new Date().toISOString()
          };
        }
        return p;
      });

      const docId = wallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString()
      });

      logger.info('✅ Participant status updated successfully', {
        splitWalletId,
        participantId,
        newStatus,
        transactionSignature,
        amount
      }, 'SplitWalletDatabaseService');

      return { success: true };
    } catch (error) {
      logger.error('Failed to update participant status', error, 'SplitWalletDatabaseService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update participant status'
      };
    }
  }

  /**
   * Update wallet status (e.g., mark as completed)
   */
  static async updateWalletStatus(
    splitWalletId: string,
    newStatus: 'active' | 'locked' | 'completed' | 'cancelled' | 'spinning_completed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { SplitWalletPayments } = await import('./SplitWalletPayments');
      const walletResult = await SplitWalletPayments.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found'
        };
      }

      const wallet = walletResult.wallet;
      const docId = wallet.firebaseDocId || splitWalletId;
      
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'splitWallets', docId), updateData);

      logger.info('✅ Wallet status updated successfully', {
        splitWalletId,
        newStatus
      }, 'SplitWalletDatabaseService');

      return { success: true };
    } catch (error) {
      logger.error('Failed to update wallet status', error, 'SplitWalletDatabaseService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update wallet status'
      };
    }
  }
}

/**
 * Shared funding service for both Fair Split and Degen Split
 */
export class SharedFundingService {
  /**
   * Process funding for both Fair Split and Degen Split
   */
  static async processFunding(request: FundingRequest): Promise<PaymentResult> {
    const startTime = Date.now();
    try {
      logger.info('🚀 Processing shared funding request', {
        splitWalletId: request.splitWalletId,
        participantId: request.participantId,
        amount: request.amount,
        splitType: request.splitType,
        transactionSignature: request.transactionSignature
      }, 'SharedFundingService');

      // Validate request
      const validation = await SplitWalletValidator.validateFundingRequest(
        request.splitWalletId,
        request.participantId,
        request.amount,
        request.splitType
      );

      if (!validation.success) {
        return {
          success: false,
          error: validation.error
        };
      }

      const { wallet, participant } = validation;
      const roundedAmount = roundUsdcAmount(request.amount);

      // Execute transaction if not provided
      let actualTransactionSignature = request.transactionSignature;
      
      if (!actualTransactionSignature) {
        // Validate user wallet
        const userWalletValidation = await SplitWalletValidator.validateUserWallet(request.participantId);
        if (!userWalletValidation.success) {
          return {
            success: false,
            error: userWalletValidation.error
          };
        }

        const userWallet = userWalletValidation.wallet;

        logger.info('🚀 Executing funding transaction', {
          fromAddress: userWallet.address,
          toAddress: wallet!.walletAddress,
          amount: roundedAmount,
          splitWalletId: request.splitWalletId,
          participantId: request.participantId,
          splitType: request.splitType
        }, 'SharedFundingService');

        // Execute transaction using shared function
        const transactionResult = await executeSplitWalletTransaction(
          userWallet.address,
          userWallet.secretKey,
          wallet!.walletAddress,
          roundedAmount,
          'USDC',
          `${request.splitType === 'fair' ? 'Fair' : 'Degen'} Split ${request.splitType === 'fair' ? 'participant payment' : 'fund locking'} - ${wallet!.id}`,
          'funding'
        );

        if (!transactionResult.success) {
          logger.error('Failed to execute funding transaction', {
            splitWalletId: request.splitWalletId,
            participantId: request.participantId,
            amount: roundedAmount,
            error: transactionResult.error,
            splitType: request.splitType
          }, 'SharedFundingService');

          return {
            success: false,
            error: transactionResult.error || 'Failed to execute transaction to split wallet',
            transactionSignature: transactionResult.signature
          };
        }

        if (!transactionResult.signature) {
          return {
            success: false,
            error: 'No transaction signature returned from blockchain transaction'
          };
        }

        actualTransactionSignature = transactionResult.signature;
      }

      // Update participant status
      const newStatus = request.splitType === 'fair' ? 'paid' : 'locked';
      const dbUpdate = await SplitWalletDatabaseService.updateParticipantStatus(
        request.splitWalletId,
        request.participantId,
        newStatus,
        actualTransactionSignature,
        roundedAmount
      );

      if (!dbUpdate.success) {
        return {
          success: false,
          error: dbUpdate.error || 'Failed to update participant status'
        };
      }

      const processingTime = Date.now() - startTime;
      logger.info('✅ Funding processed successfully', {
        splitWalletId: request.splitWalletId,
        participantId: request.participantId,
        amount: roundedAmount,
        splitType: request.splitType,
        transactionSignature: actualTransactionSignature,
        processingTime
      }, 'SharedFundingService');

      return {
        success: true,
        transactionSignature: actualTransactionSignature,
        amount: roundedAmount,
        message: `${request.splitType === 'fair' ? 'Payment' : 'Fund locking'} processed successfully`
      };

    } catch (error) {
      logger.error('Failed to process funding', error, 'SharedFundingService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

/**
 * Shared withdrawal service for both Fair Split and Degen Split
 */
export class SharedWithdrawalService {
  /**
   * Process withdrawal for both Fair Split and Degen Split
   */
  static async processWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
    try {
      logger.info('🚀 Processing shared withdrawal request', {
        splitWalletId: request.splitWalletId,
        requesterId: request.requesterId,
        recipientAddress: request.recipientAddress,
        amount: request.amount,
        splitType: request.splitType,
        paymentMethod: request.paymentMethod,
        description: request.description
      }, 'SharedWithdrawalService');

      // Validate request
      const validation = await SplitWalletValidator.validateWithdrawalRequest(
        request.splitWalletId,
        request.requesterId,
        request.splitType
      );

      if (!validation.success) {
        return {
          success: false,
          error: validation.error
        };
      }

      const { wallet } = validation;

      // Handle different payment methods for Degen Split
      if (request.splitType === 'degen' && request.paymentMethod === 'kast-card') {
        return await this.processKastCardPayment(request, wallet!);
      }

      // Get private key based on split type
      const privateKeyResult = await this.getPrivateKey(request.splitWalletId, request.requesterId, request.splitType);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve private key'
        };
      }

      // Get current balance
      const balanceResult = await BalanceUtils.getUsdcBalance(
        wallet!.walletAddress,
        wallet!.currency
      );

      if (!balanceResult.success || balanceResult.balance <= 0) {
        return {
          success: false,
          error: 'No funds available in split wallet'
        };
      }

      const availableBalance = balanceResult.balance;
      const transferAmount = request.amount || availableBalance;

      logger.info('💸 Executing withdrawal transaction', {
        fromAddress: wallet!.walletAddress,
        toAddress: request.recipientAddress,
        amount: transferAmount,
        currency: wallet!.currency,
        splitType: request.splitType,
        description: request.description
      }, 'SharedWithdrawalService');

      // Execute transaction using shared function
      const withdrawalType = request.splitType === 'fair' ? 'fair_split_extraction' : 'degen_participant_withdrawal';
      const transactionResult = await executeSplitWalletTransaction(
        wallet!.walletAddress,
        privateKeyResult.privateKey,
        request.recipientAddress,
        transferAmount,
        wallet!.currency,
        request.description || `${request.splitType === 'fair' ? 'Fair Split' : 'Degen Split'} withdrawal`,
        'withdrawal',
        withdrawalType
      );

      if (!transactionResult.success) {
        logger.error('Failed to execute withdrawal transaction', {
          splitWalletId: request.splitWalletId,
          requesterId: request.requesterId,
          error: transactionResult.error,
          splitType: request.splitType
        }, 'SharedWithdrawalService');

        return {
          success: false,
          error: transactionResult.error || 'Failed to execute withdrawal transaction'
        };
      }

      // Update participant status for Degen Split
      if (request.splitType === 'degen' && validation.participant) {
        const dbUpdate = await SplitWalletDatabaseService.updateParticipantStatus(
          request.splitWalletId,
          request.requesterId,
          'paid',
          transactionResult.signature!,
          0 // No amount change for withdrawal
        );

        if (!dbUpdate.success) {
          logger.warn('Failed to update participant status after withdrawal', {
            error: dbUpdate.error,
            splitWalletId: request.splitWalletId,
            requesterId: request.requesterId
          }, 'SharedWithdrawalService');
        }
      }

      logger.info('✅ Withdrawal processed successfully', {
        splitWalletId: request.splitWalletId,
        requesterId: request.requesterId,
        amount: transferAmount,
        splitType: request.splitType,
        transactionSignature: transactionResult.signature
      }, 'SharedWithdrawalService');

      return {
        success: true,
        transactionSignature: transactionResult.signature,
        amount: transferAmount,
        message: 'Withdrawal processed successfully'
      };

    } catch (error) {
      logger.error('Failed to process withdrawal', error, 'SharedWithdrawalService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get private key based on split type
   */
  private static async getPrivateKey(
    splitWalletId: string,
    userId: string,
    splitType: SplitType
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      if (splitType === 'fair') {
        // Fair Split: Use creator-specific private key retrieval
        const { SplitWalletPayments } = await import('./SplitWalletPayments');
        return await SplitWalletPayments.getFairSplitPrivateKey(splitWalletId, userId);
      } else {
        // Degen Split: Use shared private key retrieval
        const { SplitWalletSecurity } = await import('./SplitWalletSecurity');
        return await SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, userId);
      }
    } catch (error) {
      logger.error('Failed to get private key', error, 'SharedWithdrawalService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve private key'
      };
    }
  }

  /**
   * Process KAST card payment for Degen Split
   */
  private static async processKastCardPayment(
    request: WithdrawalRequest,
    wallet: SplitWallet
  ): Promise<PaymentResult> {
    try {
      const { walletService } = await import('../WalletService');
      const { ExternalCardPaymentService } = await import('../ExternalCardPaymentService');
      
      // Get user's linked KAST cards
      const linkedData = await walletService.getLinkedDestinations(request.requesterId);
      const kastCards = linkedData.kastCards;
      
      if (kastCards.length === 0) {
        return {
          success: false,
          error: 'No KAST cards linked. Please link a card first.'
        };
      }
      
      // Use the first active card
      const activeCard = kastCards.find(card => card.status === 'active');
      if (!activeCard) {
        return {
          success: false,
          error: 'No active KAST cards found. Please activate a card first.'
        };
      }
      
      // Process payment to card
      const transactionResult = await ExternalCardPaymentService.processCardPayment({
        cardId: activeCard.id,
        amount: request.amount,
        currency: wallet.currency,
        description: request.description || 'Degen Split payment',
        userId: request.requesterId
      });
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to process KAST card payment'
        };
      }
      
      return {
        success: true,
        transactionSignature: transactionResult.transactionId,
        amount: request.amount,
        message: 'KAST card payment processed successfully'
      };
    } catch (error) {
      logger.error('Failed to process KAST card payment', error, 'SharedWithdrawalService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process KAST card payment'
      };
    }
  }
}
