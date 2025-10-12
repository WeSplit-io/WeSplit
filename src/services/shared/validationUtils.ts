/**
 * Shared Validation Utilities
 * Centralizes validation logic for addresses, amounts, and other common validations
 */

import { PublicKey } from '@solana/web3.js';
import { logger } from '../loggingService';

// Import from unified types
import { ValidationResult } from '../../types/unified';

// Re-export for backward compatibility
export type { ValidationResult };

export class ValidationUtils {
  /**
   * Validate Solana public key address
   */
  static validateSolanaAddress(address: string): ValidationResult {
    try {
      if (!address || typeof address !== 'string') {
        return {
          isValid: false,
          error: 'Address is required and must be a string'
        };
      }

      if (address.length < 32 || address.length > 44) {
        return {
          isValid: false,
          error: 'Invalid address length'
        };
      }

      // Try to create a PublicKey to validate the address
      new PublicKey(address);
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid Solana address: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate transaction amount
   */
  static validateAmount(amount: number, minAmount: number = 0.000001, maxAmount: number = 1000000): ValidationResult {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return {
        isValid: false,
        error: 'Amount must be a valid number'
      };
    }

    if (amount <= 0) {
      return {
        isValid: false,
        error: 'Amount must be greater than 0'
      };
    }

    if (amount < minAmount) {
      return {
        isValid: false,
        error: `Amount must be at least ${minAmount}`
      };
    }

    if (amount > maxAmount) {
      return {
        isValid: false,
        error: `Amount cannot exceed ${maxAmount}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate USDC amount (6 decimal places)
   */
  static validateUsdcAmount(amount: number): ValidationResult {
    const result = this.validateAmount(amount, 0.000001, 1000000);
    if (!result.isValid) {
      return result;
    }

    // Check for proper decimal places (USDC has 6 decimals)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 6) {
      return {
        isValid: false,
        error: 'USDC amount cannot have more than 6 decimal places'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate SOL amount (9 decimal places)
   */
  static validateSolAmount(amount: number): ValidationResult {
    const result = this.validateAmount(amount, 0.000000001, 1000000);
    if (!result.isValid) {
      return result;
    }

    // Check for proper decimal places (SOL has 9 decimals)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 9) {
      return {
        isValid: false,
        error: 'SOL amount cannot have more than 9 decimal places'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate recipient address (not the same as sender)
   */
  static validateRecipientAddress(recipientAddress: string, senderAddress: string): ValidationResult {
    const addressValidation = this.validateSolanaAddress(recipientAddress);
    if (!addressValidation.isValid) {
      return addressValidation;
    }

    if (recipientAddress === senderAddress) {
      return {
        isValid: false,
        error: 'Cannot send to the same address'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate memo/note length
   */
  static validateMemo(memo: string, maxLength: number = 200): ValidationResult {
    if (memo && memo.length > maxLength) {
      return {
        isValid: false,
        error: `Memo cannot exceed ${maxLength} characters`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate user ID format
   */
  static validateUserId(userId: string): ValidationResult {
    if (!userId || typeof userId !== 'string') {
      return {
        isValid: false,
        error: 'User ID is required and must be a string'
      };
    }

    if (userId.length < 1 || userId.length > 100) {
      return {
        isValid: false,
        error: 'User ID must be between 1 and 100 characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate group ID format
   */
  static validateGroupId(groupId: string): ValidationResult {
    if (!groupId || typeof groupId !== 'string') {
      return {
        isValid: false,
        error: 'Group ID is required and must be a string'
      };
    }

    if (groupId.length < 1 || groupId.length > 100) {
      return {
        isValid: false,
        error: 'Group ID must be between 1 and 100 characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate transaction parameters
   */
  static validateTransactionParams(params: {
    to: string;
    amount: number;
    currency: string;
    userId: string;
    from?: string;
    memo?: string;
    groupId?: string;
  }): ValidationResult {
    // Validate recipient address
    const recipientValidation = this.validateSolanaAddress(params.to);
    if (!recipientValidation.isValid) {
      return recipientValidation;
    }

    // Validate sender address if provided
    if (params.from) {
      const senderValidation = this.validateRecipientAddress(params.to, params.from);
      if (!senderValidation.isValid) {
        return senderValidation;
      }
    }

    // Validate amount based on currency
    let amountValidation: ValidationResult;
    if (params.currency === 'USDC') {
      amountValidation = this.validateUsdcAmount(params.amount);
    } else if (params.currency === 'SOL') {
      amountValidation = this.validateSolAmount(params.amount);
    } else {
      amountValidation = this.validateAmount(params.amount);
    }

    if (!amountValidation.isValid) {
      return amountValidation;
    }

    // Validate user ID
    const userIdValidation = this.validateUserId(params.userId);
    if (!userIdValidation.isValid) {
      return userIdValidation;
    }

    // Validate group ID if provided
    if (params.groupId) {
      const groupIdValidation = this.validateGroupId(params.groupId);
      if (!groupIdValidation.isValid) {
        return groupIdValidation;
      }
    }

    // Validate memo if provided
    if (params.memo) {
      const memoValidation = this.validateMemo(params.memo);
      if (!memoValidation.isValid) {
        return memoValidation;
      }
    }

    return { isValid: true };
  }

  /**
   * Log validation errors
   */
  static logValidationError(validation: ValidationResult, context: string): void {
    if (!validation.isValid && validation.error) {
      logger.warn(`ValidationUtils: ${context} validation failed`, {
        error: validation.error
      }, 'ValidationUtils');
    }
  }
}

export const validationUtils = ValidationUtils;
