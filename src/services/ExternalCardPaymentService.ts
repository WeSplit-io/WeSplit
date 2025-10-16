/**
 * External Card Payment Service
 * Handles payments to external cards (KAST cards)
 */

import { logger } from './loggingService';
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

      // TODO: Replace with actual KAST card payment API call
      // For now, simulate payment processing
      const mockTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      logger.info('Card payment processed successfully', {
        cardId: params.cardId,
        amount: params.amount,
        transactionId: mockTransactionId
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        transactionId: mockTransactionId,
        amount: params.amount,
        message: `Payment of ${params.amount} ${params.currency} processed successfully`
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

      // Check card balance
      const balanceResult = await ExternalCardService.getCardBalance(card.identifier);
      if (!balanceResult.success) {
        return {
          success: false,
          canPay: false,
          error: 'Failed to retrieve card balance'
        };
      }

      const balance = balanceResult.balance || 0;
      const canPay = balance >= amount;

      logger.info('Card payment validation completed', {
        cardId,
        amount,
        balance,
        canPay,
        cardStatus: card.status
      }, 'ExternalCardPaymentService');

      return {
        success: true,
        canPay,
        error: canPay ? undefined : `Insufficient card balance. Required: ${amount}, Available: ${balance}`
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
