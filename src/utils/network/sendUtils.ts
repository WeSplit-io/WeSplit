/**
 * Utility functions for Send flow
 * Handles balance calculations and address validation
 */

import { PublicKey } from '@solana/web3.js';
import { ValidationUtils } from '../../services/shared/validationUtils';

export interface BalanceInfo {
  available: number;
  total: number;
  currency: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  error?: string;
  chain?: string;
}

/**
 * Calculate percentage amounts based on available balance
 */
export const calculatePercentageAmount = (
  balance: number,
  percentage: 25 | 50 | 100
): number => {
  return (balance * percentage) / 100;
};

/**
 * Validate Solana address format
 * Uses shared validation utility for consistency
 */
export const validateSolanaAddress = (address: string): AddressValidationResult => {
  const result = ValidationUtils.validateSolanaAddress(address);
  
  return {
    isValid: result.isValid,
    error: result.error,
    chain: 'solana'
  };
};

/**
 * Validate Ethereum address format
 */
export const validateEthereumAddress = (address: string): AddressValidationResult => {
  try {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        error: 'Address is required',
        chain: 'ethereum'
      };
    }

    // Basic length check for Ethereum addresses (42 characters)
    if (address.length !== 42) {
      return {
        isValid: false,
        error: 'Invalid Ethereum address length',
        chain: 'ethereum'
      };
    }

    // Check if it starts with 0x
    if (!address.startsWith('0x')) {
      return {
        isValid: false,
        error: 'Ethereum address must start with 0x',
        chain: 'ethereum'
      };
    }

    // Check if it's a valid hex string
    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!hexPattern.test(address)) {
      return {
        isValid: false,
        error: 'Invalid Ethereum address format',
        chain: 'ethereum'
      };
    }

    return {
      isValid: true,
      chain: 'ethereum'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid Ethereum address format',
      chain: 'ethereum'
    };
  }
};

/**
 * Auto-detect chain and validate address
 */
export const validateAddress = (address: string): AddressValidationResult => {
  // Try Solana validation first (most common in this app)
  const solanaResult = validateSolanaAddress(address);
  if (solanaResult.isValid) {
    return solanaResult;
  }

  // Try Ethereum validation
  const ethereumResult = validateEthereumAddress(address);
  if (ethereumResult.isValid) {
    return ethereumResult;
  }

  // Return Solana error as default (since this app primarily uses Solana)
  return solanaResult;
};

/**
 * Format wallet address for display
 */
export const formatWalletAddress = (address: string, maxLength: number = 10): string => {
  if (!address) {return '';}
  if (address.length <= maxLength) {return address;}
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// DEPRECATED: calculateTransactionFees function removed
// Use FeeService.calculateCompanyFee instead

/**
 * Check if amount exceeds balance
 */
export const checkBalanceSufficiency = (
  amount: number,
  availableBalance: number
): {
  isSufficient: boolean;
  shortfall?: number;
} => {
  if (amount <= availableBalance) {
    return { isSufficient: true };
  }

  return {
    isSufficient: false,
    shortfall: amount - availableBalance
  };
};

/**
 * Get balance info for display
 */
export const getBalanceInfo = (balance: number | null, currency: string = 'USDC'): BalanceInfo => {
  const availableBalance = balance || 0;
  
  return {
    available: availableBalance,
    total: availableBalance,
    currency
  };
};

/**
 * Validate amount input
 */
export const validateAmount = (amount: string): {
  isValid: boolean;
  numericValue?: number;
  error?: string;
} => {
  if (!amount || amount.trim() === '') {
    return {
      isValid: false,
      error: 'Amount is required'
    };
  }

  // Use tolerant parser for locales (accepts comma decimals)
  const { parseAmount } = require('../ui/format/formatUtils');
  const numericValue = parseAmount(amount);
  
  if (isNaN(numericValue)) {
    return {
      isValid: false,
      error: 'Please enter a valid number'
    };
  }

  if (numericValue <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0'
    };
  }

  if (numericValue > 999999999) {
    return {
      isValid: false,
      error: 'Amount is too large'
    };
  }

  return {
    isValid: true,
    numericValue
  };
};

/**
 * Validate KAST card wallet address
 * KAST cards should use proper Solana wallet addresses for blockchain transactions
 */
export const validateKastWalletAddress = (address: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      error: 'KAST card wallet address is required'
    };
  }

  const trimmed = address.trim();
  
  if (!trimmed) {
    return {
      isValid: false,
      error: 'KAST card wallet address cannot be empty'
    };
  }

  // Use the same validation as external wallets - proper Solana address validation
  // The validation function now handles trimming internally, but we do it here too for clarity
  const addressValidation = validateSolanaAddress(trimmed);
  if (!addressValidation.isValid) {
    return {
      isValid: false,
      error: addressValidation.error || 'Please enter a valid Solana wallet address for your KAST card'
    };
  }

  return {
    isValid: true
  };
};

/**
 * DEPRECATED: Use validateKastWalletAddress instead
 * This function is kept for backward compatibility but should not be used for new implementations
 */
export const validateKastIdentifier = (identifier: string): {
  isValid: boolean;
  error?: string;
} => {
  // For backward compatibility, treat as wallet address
  return validateKastWalletAddress(identifier);
};

/**
 * Format KAST card wallet address for display
 * Uses the same formatting as external wallet addresses
 */
export const formatKastWalletAddress = (address: string): string => {
  if (!address) {return '';}
  
  // Use the same formatting as external wallet addresses
  return formatWalletAddress(address);
};

/**
 * DEPRECATED: Use formatKastWalletAddress instead
 * This function is kept for backward compatibility
 */
export const formatKastIdentifier = (identifier: string): string => {
  // For backward compatibility, treat as wallet address
  return formatKastWalletAddress(identifier);
};
