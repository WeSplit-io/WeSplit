/**
 * Utility functions for Send flow
 * Handles balance calculations and address validation
 */

import { PublicKey } from '@solana/web3.js';

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
 */
export const validateSolanaAddress = (address: string): AddressValidationResult => {
  try {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        error: 'Address is required',
        chain: 'solana'
      };
    }

    // Basic length check for Solana addresses (32-44 characters)
    if (address.length < 32 || address.length > 44) {
      return {
        isValid: false,
        error: 'Invalid Solana address length',
        chain: 'solana'
      };
    }

    // Try to create a PublicKey to validate the address
    new PublicKey(address);
    
    return {
      isValid: true,
      chain: 'solana'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid Solana address format',
      chain: 'solana'
    };
  }
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
  if (!address) return '';
  if (address.length <= maxLength) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Calculate transaction fees
 */
export const calculateTransactionFees = (
  amount: number,
  feePercentage: number = 0.03
): {
  fee: number;
  netAmount: number;
  totalAmount: number;
} => {
  const fee = amount * feePercentage;
  const netAmount = amount - fee;
  const totalAmount = amount;

  return {
    fee,
    netAmount,
    totalAmount
  };
};

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

  const numericValue = parseFloat(amount);
  
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
 * Validate KAST card identifier
 */
export const validateKastIdentifier = (identifier: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!identifier || identifier.trim() === '') {
    return {
      isValid: false,
      error: 'Card identifier is required'
    };
  }

  const trimmed = identifier.trim();

  // Check minimum length
  if (trimmed.length < 4) {
    return {
      isValid: false,
      error: 'Card identifier must be at least 4 characters'
    };
  }

  // Check maximum length
  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: 'Card identifier is too long'
    };
  }

  // Check if it contains only alphanumeric characters and common separators
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Card identifier contains invalid characters'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Format KAST card identifier for display
 */
export const formatKastIdentifier = (identifier: string): string => {
  if (!identifier) return '';
  
  const trimmed = identifier.trim();
  
  // If it's already in the format "•••• 1234", return as is
  if (trimmed.includes('••••')) {
    return trimmed;
  }
  
  // If it's longer than 4 characters, show last 4 with mask
  if (trimmed.length > 4) {
    return `•••• ${trimmed.slice(-4)}`;
  }
  
  // If it's 4 characters or less, show as is
  return trimmed;
};
