/**
 * External Card Payment Service
 * Handles payments to external cards (KAST cards)
 */

import { logger } from '../core';
import { ExternalCardService } from './ExternalCardService';

export interface CardPaymentParams {
  cardId: string;
  amount: number;
  currency: string;
  description?: string;
  userId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  error?: string;
  message?: string;
}

export class ExternalCardPaymentService {
  /**
   * Process payment to external card
   */
  static async processCardPayment(params: CardPaymentParams): Promise<PaymentResult> {
    try {
      logger.info('Processing card payment', {
        cardId: params.cardId,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'ExternalCardPaymentService');

      // Validate card for payment
      const validation = await this.validateCardForPayment(params.cardId, params.amount);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Failed to validate card for payment'
        };
      }

      if (!validation.canPay) {
        return {
          success: false,
          error: validation.error || 'Card cannot process this payment'
        };
      }

      // Get the KAST card wallet address for USDC transfer
      const cardInfo = await ExternalCardService.getCardInfo(params.cardId);
      if (!cardInfo.success || !cardInfo.card) {
        return {
          success: false,
          error: 'KAST card not found or invalid'
        };
      }

      const kastWalletAddress = cardInfo.card.identifier; // This should be the Solana wallet address
      
      logger.info('Processing KAST card payment via external wallet transfer', {
        cardId: params.cardId,
        kastWalletAddress,
        amount: params.amount,
        currency: params.currency
      }, 'ExternalCardPaymentService');

      // Use the external wallet transfer service for KAST card payments
      const { externalTransferService } = await import('../transaction/sendExternal');
      const transferResult = await externalTransferService.sendExternalTransfer({
        to: kastWalletAddress,
        amount: params.amount,
        currency: 'USDC', // KAST cards receive USDC
        memo: params.description || 'KAST card payment',
        userId: params.userId,
        priority: 'medium',
        transactionType: 'external_payment' // Use the new 2% fee structure for linked cards
      });

      if (!transferResult.success) {
        logger.error('KAST card payment failed', {
          cardId: params.cardId,
          kastWalletAddress,
          error: transferResult.error
        }, 'ExternalCardPaymentService');
        
        return {
          success: false,
          error: transferResult.error || 'Failed to process KAST card payment'
        };
      }

      logger.info('KAST card payment processed successfully', {
        cardId: params.cardId,
        kastWalletAddress,
        amount: params.amount,
        transactionSignature: transferResult.signature
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        transactionId: transferResult.signature,
        amount: params.amount,
        message: `Payment of ${params.amount} ${params.currency} sent to KAST card successfully`
      };

    } catch (error) {
      logger.error('Error processing card payment', error, 'ExternalCardPaymentService');
      return {
        success: false,
        error: 'Failed to process card payment. Please try again.'
      };
    }
  }

  /**
   * Validate card for payment
   */
  static async validateCardForPayment(cardId: string, amount: number): Promise<{
    success: boolean;
    canPay: boolean;
    error?: string;
  }> {
    try {
      logger.info('Validating card for payment', { cardId, amount }, 'ExternalCardPaymentService');

      // Get card information
      const cardInfo = await ExternalCardService.getCardInfo(cardId);
      if (!cardInfo.success || !cardInfo.card) {
        return {
          success: false,
          canPay: false,
          error: 'Card not found or invalid'
        };
      }

      const card = cardInfo.card;

      // Check if card is active
      if (card.status !== 'active') {
        return {
          success: false,
          canPay: false,
          error: `Card is ${card.status}. Only active cards can process payments.`
        };
      }

      // For KAST card payments, we're sending USDC TO the card, not FROM the card
      // So we need to validate that the card has a valid wallet address
      if (!card.identifier) {
        return {
          success: false,
          canPay: false,
          error: 'KAST card does not have a valid wallet address'
        };
      }

      // Validate that the identifier is a valid Solana address
      const { validateSolanaAddress } = await import('../uti../format');
      const addressValidation = validateSolanaAddress(card.identifier);
      if (!addressValidation.isValid) {
        return {
          success: false,
          canPay: false,
          error: `Invalid KAST card wallet address: ${addressValidation.error}`
        };
      }

      logger.info('KAST card payment validation completed', {
        cardId,
        amount,
        kastWalletAddress: card.identifier,
        cardStatus: card.status,
        canPay: true // KAST cards can always receive payments if they have valid addresses
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        canPay: true // KAST cards can receive payments if they have valid wallet addresses
      };

    } catch (error) {
      logger.error('Error validating card for payment', error, 'ExternalCardPaymentService');
      return {
        success: false,
        canPay: false,
        error: 'Failed to validate card for payment. Please try again.'
      };
    }
  }

  /**
   * Get card balance
   */
  static async getCardBalance(cardId: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      logger.info('Getting card balance', { cardId }, 'ExternalCardPaymentService');

      // Get card information
      const cardInfo = await ExternalCardService.getCardInfo(cardId);
      if (!cardInfo.success || !cardInfo.card) {
        return {
          success: false,
          error: 'Card not found or invalid'
        };
      }

      // Get balance from external system
      const balanceResult = await ExternalCardService.getCardBalance(cardInfo.card.identifier);
      if (!balanceResult.success) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to retrieve card balance'
        };
      }

      logger.info('Card balance retrieved successfully', {
        cardId,
        balance: balanceResult.balance
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        balance: balanceResult.balance
      };

    } catch (error) {
      logger.error('Error getting card balance', error, 'ExternalCardPaymentService');
      return {
        success: false,
        error: 'Failed to retrieve card balance. Please try again.'
      };
    }
  }

  /**
   * Get payment history for a card
   */
  static async getPaymentHistory(cardId: string): Promise<{
    success: boolean;
    payments?: any[];
    error?: string;
  }> {
    try {
      logger.info('Getting payment history', { cardId }, 'ExternalCardPaymentService');

      // TODO: Replace with actual KAST card API call
      // For now, simulate API call
      const mockPayments = [
        {
          id: 'PAY_001',
          amount: 50.00,
          currency: 'USD',
          description: 'Test payment',
          timestamp: new Date().toISOString(),
          status: 'completed'
        }
      ];

      logger.info('Payment history retrieved successfully', {
        cardId,
        paymentCount: mockPayments.length
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        payments: mockPayments
      };

    } catch (error) {
      logger.error('Error getting payment history', error, 'ExternalCardPaymentService');
      return {
        success: false,
        error: 'Failed to retrieve payment history. Please try again.'
      };
    }
  }
}
