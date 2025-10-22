/**
 * Split Data Validation Utilities
 * Ensures data consistency across the split process
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SplitDataValidator {
  /**
   * Validate participants data
   */
  static validateParticipants(participants: any[]): ValidationResult {
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
      if (!participant.id) {
        errors.push(`Participant ${index + 1} is missing an ID`);
      }
      if (!participant.name) {
        errors.push(`Participant ${index + 1} is missing a name`);
      }
      if (participant.amountOwed < 0) {
        errors.push(`Participant ${index + 1} has negative amount owed`);
      }
      if (participant.amountPaid < 0) {
        errors.push(`Participant ${index + 1} has negative amount paid`);
      }
      if (participant.amountPaid > participant.amountOwed) {
        warnings.push(`Participant ${index + 1} has paid more than they owe`);
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

    if (!billData.title) {
      warnings.push('Bill title is missing');
    }

    if (!billData.currency) {
      warnings.push('Bill currency is missing, defaulting to USDC');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate split wallet data
   */
  static validateSplitWallet(splitWallet: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!splitWallet) {
      errors.push('Split wallet is required');
      return { isValid: false, errors, warnings };
    }

    if (!splitWallet.id) {
      errors.push('Split wallet ID is required');
    }

    if (!splitWallet.billId) {
      errors.push('Split wallet bill ID is required');
    }

    if (!splitWallet.creatorId) {
      errors.push('Split wallet creator ID is required');
    }

    if (!splitWallet.walletAddress) {
      errors.push('Split wallet address is required');
    }

    if (!splitWallet.participants || !Array.isArray(splitWallet.participants)) {
      errors.push('Split wallet participants must be an array');
    } else {
      const participantValidation = this.validateParticipants(splitWallet.participants);
      if (!participantValidation.isValid) {
        errors.push(...participantValidation.errors);
      }
      warnings.push(...participantValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate navigation parameters
   */
  static validateNavigationParams(params: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!params) {
      errors.push('Navigation parameters are required');
      return { isValid: false, errors, warnings };
    }

    // Check for required parameters based on screen
    if (params.splitWalletId && !params.billName) {
      warnings.push('Bill name is missing from navigation parameters');
    }

    if (params.totalAmount && params.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
