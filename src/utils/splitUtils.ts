/**
 * Split Utilities
 * Consolidated utility functions for split-related operations
 * Provides common calculations, validations, and transformations
 */

import { logger } from '../services/loggingService';
import { calculateEqualSplit as currencyCalculateEqualSplit } from './currencyUtils';

// Types
export interface SplitCalculationResult {
  amountPerPerson: number;
  totalAmount: number;
  participantCount: number;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface Participant {
  id: string;
  name: string;
  amountOwed: number;
  amountPaid?: number;
  userId?: string;
  walletAddress?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SplitValidationOptions {
  tolerance?: number;
  allowZeroAmounts?: boolean;
  requireWalletAddresses?: boolean;
}

/**
 * Split Calculation Utilities
 */
export class SplitCalculationUtils {
  /**
   * Calculate equal split amount per person
   * @param totalAmount Total bill amount
   * @param participantCount Number of participants
   * @returns Amount each person should pay
   */
  static calculateEqualSplit(totalAmount: number, participantCount: number): number {
    return currencyCalculateEqualSplit(totalAmount, participantCount);
  }

  /**
   * Calculate participant amounts based on split method
   * @param totalAmount Total bill amount
   * @param participants Array of participants
   * @param method Split method ('equal' or 'manual')
   * @returns Updated participants with calculated amounts
   */
  static calculateParticipantAmounts(
    totalAmount: number,
    participants: Participant[],
    method: 'equal' | 'manual' = 'equal'
  ): Participant[] {
    if (method === 'equal') {
      const amountPerPerson = this.calculateEqualSplit(totalAmount, participants.length);
      return participants.map(participant => ({
        ...participant,
        amountOwed: amountPerPerson
      }));
    }

    // For manual splits, participants set their own amounts
    return participants;
  }

  /**
   * Validate that participant amounts sum to total amount
   * @param participants Array of participants
   * @param totalAmount Expected total amount
   * @param tolerance Allowed difference (default: 0.01)
   * @returns Validation result
   */
  static validateAmounts(
    participants: Participant[],
    totalAmount: number,
    tolerance: number = 0.01
  ): SplitCalculationResult {
    const errors: string[] = [];
    
    if (!participants || participants.length === 0) {
      errors.push('No participants provided');
      return {
        amountPerPerson: 0,
        totalAmount,
        participantCount: 0,
        isValid: false,
        errors
      };
    }

    const totalAssigned = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    const difference = Math.abs(totalAssigned - totalAmount);
    
    if (difference > tolerance) {
      errors.push(
        `Total assigned amounts (${totalAssigned.toFixed(6)}) do not match bill total (${totalAmount.toFixed(6)}). Difference: ${difference.toFixed(6)}`
      );
    }

    // Check for negative amounts
    const negativeAmounts = participants.filter(p => p.amountOwed < 0);
    if (negativeAmounts.length > 0) {
      errors.push(`Participants with negative amounts: ${negativeAmounts.map(p => p.name).join(', ')}`);
    }

    // Check for zero amounts
    const zeroAmounts = participants.filter(p => p.amountOwed === 0);
    if (zeroAmounts.length > 0 && zeroAmounts.length === participants.length) {
      errors.push('All participants have zero amounts assigned');
    }

    const amountPerPerson = this.calculateEqualSplit(totalAmount, participants.length);

    return {
      amountPerPerson,
      totalAmount,
      participantCount: participants.length,
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate remaining amount for a participant
   * @param participant Participant object
   * @returns Remaining amount to be paid
   */
  static calculateRemainingAmount(participant: Participant): number {
    const amountOwed = participant.amountOwed || 0;
    const amountPaid = participant.amountPaid || 0;
    return Math.max(0, amountOwed - amountPaid);
  }

  /**
   * Calculate total remaining amount across all participants
   * @param participants Array of participants
   * @returns Total remaining amount
   */
  static calculateTotalRemaining(participants: Participant[]): number {
    return participants.reduce((total, participant) => {
      return total + this.calculateRemainingAmount(participant);
    }, 0);
  }
}

/**
 * Split Validation Utilities
 */
export class SplitValidationUtils {
  /**
   * Validate participants data
   * @param participants Array of participants
   * @param options Validation options
   * @returns Validation result
   */
  static validateParticipants(
    participants: Participant[], 
    options: SplitValidationOptions = {}
  ): ValidationResult {
    const { allowZeroAmounts = false, requireWalletAddresses = false } = options;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!participants || !Array.isArray(participants)) {
      errors.push('Participants must be an array');
      return { isValid: false, errors, warnings };
    }

    if (participants.length === 0) {
      errors.push('At least one participant is required');
      return { isValid: false, errors, warnings };
    }

    participants.forEach((participant, index) => {
      if (!participant.id && !participant.userId) {
        errors.push(`Participant ${index + 1} is missing an ID`);
      }
      if (!participant.name) {
        errors.push(`Participant ${index + 1} is missing a name`);
      }
      if (participant.amountOwed < 0) {
        errors.push(`Participant ${index + 1} has negative amount owed`);
      }
      if (participant.amountPaid && participant.amountPaid < 0) {
        errors.push(`Participant ${index + 1} has negative amount paid`);
      }
      if (participant.amountPaid && participant.amountPaid > participant.amountOwed) {
        warnings.push(`Participant ${index + 1} has paid more than they owe`);
      }
      if (requireWalletAddresses && !participant.walletAddress) {
        errors.push(`Participant ${index + 1} is missing wallet address`);
      }
      if (!allowZeroAmounts && participant.amountOwed === 0) {
        warnings.push(`Participant ${index + 1} has zero amount owed`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate bill data
   * @param billData Bill data object
   * @returns Validation result
   */
  static validateBillData(billData: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!billData) {
      errors.push('Bill data is required');
      return { isValid: false, errors, warnings };
    }

    if (!billData.totalAmount || billData.totalAmount <= 0) {
      errors.push('Bill total amount must be greater than 0');
    }

    if (!billData.currency) {
      errors.push('Bill currency is required');
    }

    if (!billData.title && !billData.name) {
      warnings.push('Bill title/name is missing');
    }

    if (billData.participants && !Array.isArray(billData.participants)) {
      errors.push('Bill participants must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate split wallet data
   * @param wallet Split wallet object
   * @returns Validation result
   */
  static validateSplitWallet(wallet: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!wallet) {
      errors.push('Split wallet data is required');
      return { isValid: false, errors, warnings };
    }

    // Validate basic structure
    if (!wallet.id) {
      errors.push('Split wallet ID is required');
    }

    if (!wallet.billId) {
      errors.push('Split wallet bill ID is required');
    }

    if (!wallet.creatorId) {
      errors.push('Split wallet creator ID is required');
    }

    if (!wallet.walletAddress) {
      errors.push('Split wallet address is required');
    }

    if (!wallet.totalAmount || wallet.totalAmount <= 0) {
      errors.push('Split wallet total amount must be greater than 0');
    }

    if (!wallet.currency) {
      errors.push('Split wallet currency is required');
    }

    if (!wallet.status) {
      errors.push('Split wallet status is required');
    }

    // Validate participants
    if (!wallet.participants || !Array.isArray(wallet.participants)) {
      errors.push('Split wallet participants must be an array');
    } else if (wallet.participants.length === 0) {
      errors.push('Split wallet must have at least one participant');
    } else {
      const participantValidation = this.validateParticipants(wallet.participants, {
        requireWalletAddresses: true
      });
      errors.push(...participantValidation.errors);
      warnings.push(...participantValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Split Data Transformation Utilities
 */
export class SplitDataTransformUtils {
  /**
   * Transform participants to unified format
   * @param participants Array of participants in various formats
   * @returns Unified participant format
   */
  static transformParticipants(participants: any[]): Participant[] {
    return participants.map(participant => ({
      id: participant.id || participant.userId || '',
      name: participant.name || '',
      amountOwed: participant.amountOwed || 0,
      amountPaid: participant.amountPaid || 0,
      userId: participant.userId || participant.id,
      walletAddress: participant.walletAddress || participant.wallet_address
    }));
  }

  /**
   * Generate unique split ID
   * @param prefix Optional prefix for the ID
   * @returns Unique split ID
   */
  static generateSplitId(prefix: string = 'split'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format split amount for display
   * @param amount Amount to format
   * @param currency Currency code
   * @param decimals Number of decimal places
   * @returns Formatted amount string
   */
  static formatSplitAmount(amount: number, currency: string = 'USD', decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }

  /**
   * Calculate split completion percentage
   * @param participants Array of participants
   * @returns Completion percentage (0-100)
   */
  static calculateCompletionPercentage(participants: Participant[]): number {
    if (!participants || participants.length === 0) {
      return 0;
    }

    const totalOwed = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    const totalPaid = participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    if (totalOwed === 0) {
      return 100;
    }

    return Math.min(100, Math.round((totalPaid / totalOwed) * 100));
  }
}

/**
 * Split Status Utilities
 */
export class SplitStatusUtils {
  /**
   * Check if split is active
   * @param status Split status
   * @returns True if split is active
   */
  static isActive(status: string): boolean {
    return ['active', 'locked'].includes(status);
  }

  /**
   * Check if split is completed
   * @param status Split status
   * @returns True if split is completed
   */
  static isCompleted(status: string): boolean {
    return ['completed', 'cancelled'].includes(status);
  }

  /**
   * Check if split can be modified
   * @param status Split status
   * @returns True if split can be modified
   */
  static canModify(status: string): boolean {
    return ['draft', 'pending'].includes(status);
  }

  /**
   * Get next valid status
   * @param currentStatus Current split status
   * @returns Next valid status or null
   */
  static getNextStatus(currentStatus: string): string | null {
    const statusFlow: Record<string, string | null> = {
      'draft': 'pending',
      'pending': 'active',
      'active': 'locked',
      'locked': 'completed',
      'completed': null,
      'cancelled': null
    };

    return statusFlow[currentStatus] || null;
  }
}

// Export all utilities as a single object for convenience
export const splitUtils = {
  calculation: SplitCalculationUtils,
  validation: SplitValidationUtils,
  transform: SplitDataTransformUtils,
  status: SplitStatusUtils
};

export default splitUtils;
