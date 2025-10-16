/**
 * External Card Service
 * Handles validation, information retrieval, and management of external cards (KAST cards)
 */

import { logger } from './loggingService';
import { firebaseDataService } from './firebaseDataService';

export interface CardValidationResult {
  isValid: boolean;
  error?: string;
  cardInfo?: CardInfo;
}

export interface CardInfo {
  identifier: string;
  cardType: 'debit' | 'credit' | 'prepaid';
  status: 'active' | 'inactive' | 'blocked' | 'expired';
  balance?: number;
  currency: string;
  expirationDate?: string;
  cardholderName?: string;
}

export interface CardInfoResult {
  success: boolean;
  card?: CardInfo;
  error?: string;
}

export interface LinkResult {
  success: boolean;
  cardId?: string;
  error?: string;
}

export interface RefreshResult {
  success: boolean;
  card?: CardInfo;
  error?: string;
}

export interface CardData {
  label: string;
  identifier: string;
  cardType: 'debit' | 'credit' | 'prepaid';
  status: 'active' | 'inactive' | 'blocked' | 'expired';
  balance?: number;
  currency: string;
  expirationDate?: string;
  cardholderName?: string;
}

export class ExternalCardService {
  /**
   * Validate KAST card identifier
   * This would typically call an external API to validate the card
   */
  static async validateKastCard(identifier: string): Promise<CardValidationResult> {
    try {
      logger.info('Validating KAST card', { identifier }, 'ExternalCardService');

      // Basic validation - check format
      if (!identifier || identifier.length < 8) {
        return {
          isValid: false,
          error: 'Invalid card identifier format'
        };
      }

      // TODO: Replace with actual KAST card API validation
      // For now, simulate validation
      const isValidFormat = /^[A-Z0-9]{8,20}$/.test(identifier);
      if (!isValidFormat) {
        return {
          isValid: false,
          error: 'Card identifier must be 8-20 alphanumeric characters'
        };
      }

      // Simulate API call to validate card
      // In production, this would call the actual KAST card API
      const mockCardInfo: CardInfo = {
        identifier,
        cardType: 'debit',
        status: 'active',
        balance: 1000.00, // Mock balance
        currency: 'USD',
        expirationDate: '2025-12-31',
        cardholderName: 'Card Holder'
      };

      logger.info('KAST card validation successful', { identifier }, 'ExternalCardService');

      return {
        isValid: true,
        cardInfo: mockCardInfo
      };

    } catch (error) {
      logger.error('Error validating KAST card', error, 'ExternalCardService');
      return {
        isValid: false,
        error: 'Failed to validate card. Please try again.'
      };
    }
  }

  /**
   * Get card information from external system
   */
  static async getCardInfo(identifier: string): Promise<CardInfoResult> {
    try {
      logger.info('Getting card information', { identifier }, 'ExternalCardService');

      // TODO: Replace with actual KAST card API call
      // For now, simulate API call
      const mockCardInfo: CardInfo = {
        identifier,
        cardType: 'debit',
        status: 'active',
        balance: 1000.00,
        currency: 'USD',
        expirationDate: '2025-12-31',
        cardholderName: 'Card Holder'
      };

      logger.info('Card information retrieved successfully', { identifier }, 'ExternalCardService');

      return {
        success: true,
        card: mockCardInfo
      };

    } catch (error) {
      logger.error('Error getting card information', error, 'ExternalCardService');
      return {
        success: false,
        error: 'Failed to retrieve card information. Please try again.'
      };
    }
  }

  /**
   * Link card with full information
   */
  static async linkCard(userId: string, cardData: CardData): Promise<LinkResult> {
    try {
      logger.info('Linking card', { userId, identifier: cardData.identifier }, 'ExternalCardService');

      // Check if card is already linked
      const existingCards = await firebaseDataService.linkedWallet.getLinkedWallets(userId);
      const existingCard = existingCards.find(card => 
        card.type === 'kast' && card.identifier === cardData.identifier
      );

      if (existingCard) {
        return {
          success: false,
          error: 'This card is already linked to your account'
        };
      }

      // Link the card using the existing linked wallet service
      const result = await firebaseDataService.linkedWallet.addLinkedWallet(userId, {
        type: 'kast',
        label: cardData.label,
        identifier: cardData.identifier,
        cardType: cardData.cardType,
        status: cardData.status,
        balance: cardData.balance,
        currency: cardData.currency,
        expirationDate: cardData.expirationDate,
        cardholderName: cardData.cardholderName,
        isActive: cardData.status === 'active'
      });

      if (result.success) {
        logger.info('Card linked successfully', { userId, identifier: cardData.identifier }, 'ExternalCardService');
        return {
          success: true,
          cardId: result.cardId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to link card'
        };
      }

    } catch (error) {
      logger.error('Error linking card', error, 'ExternalCardService');
      return {
        success: false,
        error: 'Failed to link card. Please try again.'
      };
    }
  }

  /**
   * Refresh card information from external system
   */
  static async refreshCardInfo(cardId: string): Promise<RefreshResult> {
    try {
      logger.info('Refreshing card information', { cardId }, 'ExternalCardService');

      // TODO: Replace with actual KAST card API call
      // For now, simulate API call
      const mockCardInfo: CardInfo = {
        identifier: 'CARD123456789',
        cardType: 'debit',
        status: 'active',
        balance: 950.00, // Updated balance
        currency: 'USD',
        expirationDate: '2025-12-31',
        cardholderName: 'Card Holder'
      };

      logger.info('Card information refreshed successfully', { cardId }, 'ExternalCardService');

      return {
        success: true,
        card: mockCardInfo
      };

    } catch (error) {
      logger.error('Error refreshing card information', error, 'ExternalCardService');
      return {
        success: false,
        error: 'Failed to refresh card information. Please try again.'
      };
    }
  }

  /**
   * Get card balance from external system
   */
  static async getCardBalance(identifier: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      logger.info('Getting card balance', { identifier }, 'ExternalCardService');

      // TODO: Replace with actual KAST card API call
      // For now, simulate API call
      const mockBalance = 950.00;

      logger.info('Card balance retrieved successfully', { identifier, balance: mockBalance }, 'ExternalCardService');

      return {
        success: true,
        balance: mockBalance
      };

    } catch (error) {
      logger.error('Error getting card balance', error, 'ExternalCardService');
      return {
        success: false,
        error: 'Failed to retrieve card balance. Please try again.'
      };
    }
  }

  /**
   * Validate card for payment
   */
  static async validateCardForPayment(identifier: string, amount: number): Promise<{
    success: boolean;
    canPay: boolean;
    error?: string;
  }> {
    try {
      logger.info('Validating card for payment', { identifier, amount }, 'ExternalCardService');

      // Get card balance
      const balanceResult = await this.getCardBalance(identifier);
      if (!balanceResult.success) {
        return {
          success: false,
          canPay: false,
          error: balanceResult.error
        };
      }

      const balance = balanceResult.balance || 0;
      const canPay = balance >= amount;

      logger.info('Card payment validation completed', { 
        identifier, 
        amount, 
        balance, 
        canPay 
      }, 'ExternalCardService');

      return {
        success: true,
        canPay,
        error: canPay ? undefined : `Insufficient card balance. Required: ${amount}, Available: ${balance}`
      };

    } catch (error) {
      logger.error('Error validating card for payment', error, 'ExternalCardService');
      return {
        success: false,
        canPay: false,
        error: 'Failed to validate card for payment. Please try again.'
      };
    }
  }
}
