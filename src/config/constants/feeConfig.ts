/**
 * Centralized Fee Configuration
 * Single source of truth for all fee-related settings
 * Supports different fee structures for different transaction types
 */

import Constants from 'expo-constants';
import { PublicKey } from '@solana/web3.js';

// Get environment variables from Expo Constants
const getEnvVar = (key: string): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || '';
};

// Transaction types that support different fee structures
export type TransactionType = 
  | 'send'           // 1:1 transfers
  | 'receive'        // 1:1 transfers (incoming)
  | 'split_payment'  // Group split payments
  | 'settlement'     // Group settlement payments
  | 'withdraw'       // External wallet withdrawals
  | 'deposit'        // External wallet deposits
  | 'payment_request' // Requested payments
  | 'group_payment'  // Group-related payments
  | 'premium'        // Premium subscription payments
  | 'split_wallet_withdrawal' // Split wallet fund withdrawals (no company fees)
  | 'external_payment' // External wallet or linked card payments
  | 'default';       // Fallback for unknown types

// Individual fee configurations for each transaction type
export const TRANSACTION_FEE_CONFIGS = {
  // 1:1 Transfers - Very low fee (0.01%)
  send: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SEND_PERCENTAGE') || '0.01'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SEND_MIN') || '0.001'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SEND_MAX') || '0.10'),
    currency: 'USDC',
  },
  receive: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_RECEIVE_PERCENTAGE') || '0.0'), // No fee for receiving
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_RECEIVE_MIN') || '0.0'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_RECEIVE_MAX') || '0.0'),
    currency: 'USDC',
  },
  // Group Split Payments - 1.5% fee for funding splits
  split_payment: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_PERCENTAGE') || '1.5'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_MIN') || '0.001'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_MAX') || '5.00'),
    currency: 'USDC',
  },
  // Settlement Payments - 0% fee for settlements (money out of splits)
  settlement: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SETTLEMENT_PERCENTAGE') || '0.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SETTLEMENT_MIN') || '0.0'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SETTLEMENT_MAX') || '0.0'),
    currency: 'USDC',
  },
  // Withdrawals - 2% fee for external wallet withdrawals
  withdraw: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_WITHDRAW_PERCENTAGE') || '2.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_WITHDRAW_MIN') || '0.10'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_WITHDRAW_MAX') || '10.00'),
    currency: 'USDC',
  },
  // Deposits - No fee for deposits (encourages funding)
  deposit: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_DEPOSIT_PERCENTAGE') || '0.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_DEPOSIT_MIN') || '0.0'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_DEPOSIT_MAX') || '0.0'),
    currency: 'USDC',
  },
  // Payment Requests - 0.01% fee (same as 1:1 transfers)
  payment_request: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PAYMENT_REQUEST_PERCENTAGE') || '0.01'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MIN') || '0.001'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MAX') || '0.10'),
    currency: 'USDC',
  },
  // Group Payments - 1.5% fee (same as split payments)
  group_payment: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_GROUP_PAYMENT_PERCENTAGE') || '1.5'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_GROUP_PAYMENT_MIN') || '0.001'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_GROUP_PAYMENT_MAX') || '5.00'),
    currency: 'USDC',
  },
  // Premium Payments - No fee for premium subscriptions
  premium: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PREMIUM_PERCENTAGE') || '0.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PREMIUM_MIN') || '0.0'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_PREMIUM_MAX') || '0.0'),
    currency: 'USDC',
  },
  // Split Wallet Withdrawals - 0% fee (money out of splits)
  split_wallet_withdrawal: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_WALLET_WITHDRAWAL_PERCENTAGE') || '0.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_WALLET_WITHDRAWAL_MIN') || '0.0'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_SPLIT_WALLET_WITHDRAWAL_MAX') || '0.0'),
    currency: 'USDC',
  },
  // External/Linked Card Payments - 2% fee
  external_payment: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_EXTERNAL_PAYMENT_PERCENTAGE') || '2.0'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_EXTERNAL_PAYMENT_MIN') || '0.10'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_FEE_EXTERNAL_PAYMENT_MAX') || '10.00'),
    currency: 'USDC',
  },
  // Default fallback - 0.01% (same as 1:1 transfers)
  default: {
    percentage: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE') || '0.01'),
    minFee: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MIN_FEE') || '0.001'),
    maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MAX_FEE') || '0.10'),
    currency: 'USDC',
  },
};

// Legacy support - keep the old config for backward compatibility
export const COMPANY_FEE_CONFIG = TRANSACTION_FEE_CONFIGS.default;

// Company Wallet Configuration
// SECURITY: Secret key is NOT stored in client-side code
// All secret key operations must be performed on backend services
// Address is fetched from Firebase Secrets instead of EAS secrets
let cachedCompanyWalletAddress: string | null = null;
let addressFetchPromise: Promise<string> | null = null;

/**
 * Get company wallet address from Firebase Secrets
 * Falls back to environment variable if Firebase fetch fails
 */
async function getCompanyWalletAddress(): Promise<string> {
  // Return cached value if available
  if (cachedCompanyWalletAddress) {
    return cachedCompanyWalletAddress;
  }

  // If already fetching, return the existing promise
  if (addressFetchPromise) {
    return addressFetchPromise;
  }

  // Try to fetch from Firebase first
  addressFetchPromise = (async () => {
    try {
      // Dynamically import to avoid circular dependencies
      const { getCompanyWalletAddress } = await import('../../services/blockchain/transaction/transactionSigningService');
      const address = await getCompanyWalletAddress();
      cachedCompanyWalletAddress = address;
      return address;
    } catch (error: any) {
      // In production, we MUST have the address from Firebase - no fallback
      if (!__DEV__) {
        throw new Error(
          `Company wallet address not available from Firebase: ${error?.message || String(error)}. ` +
          `This is required in production. Ensure getCompanyWalletAddress function is deployed.`
        );
      }
      
      // In development, allow fallback to env var for testing
      const envAddress = getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS');
      if (envAddress) {
        cachedCompanyWalletAddress = envAddress.trim();
        return cachedCompanyWalletAddress;
      }
      throw new Error(
        `Company wallet address not available: ${error?.message || String(error)}. ` +
        `Firebase function failed and no environment variable found.`
      );
    }
  })();

  return addressFetchPromise;
}

/**
 * Company Wallet Configuration
 * Address is fetched from Firebase Secrets (not stored in EAS secrets)
 */
export const COMPANY_WALLET_CONFIG = {
  // Address is fetched dynamically from Firebase
  get address(): string {
    // This is a getter that will throw if accessed synchronously
    // Use getCompanyWalletAddress() async function instead
    if (cachedCompanyWalletAddress) {
      return cachedCompanyWalletAddress;
    }
    // Fallback to env var for synchronous access (backward compatibility)
    const envAddress = getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS');
    if (envAddress) {
      return envAddress;
    }
    throw new Error('Company wallet address not available. Call getCompanyWalletAddress() first or set EXPO_PUBLIC_COMPANY_WALLET_ADDRESS');
  },
  // Async method to get address (preferred)
  getAddress: getCompanyWalletAddress,
  // secretKey removed - must be handled by backend services only
  minSolReserve: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE') || '1.0'),
  gasFeeEstimate: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE') || '0.001'),
  // Company wallet should always pay SOL fees - no fallback to user wallet
  useUserWalletForFees: false,
};

// Fee calculation result interface
export interface FeeCalculation {
  fee: number;
  totalAmount: number;
  recipientAmount: number;
}

// Fee display interface
export interface FeeDisplay {
  percentage: number;
  fee: number;
  total: number;
  netAmount: number;
}

// Centralized Fee Service
export class FeeService {
  /**
   * Calculate company fee for a specific transaction type
   * Recipient gets full amount, sender pays amount + fees
   */
  static calculateCompanyFee(amount: number, transactionType: TransactionType = 'default'): FeeCalculation {
    const config = TRANSACTION_FEE_CONFIGS[transactionType] || TRANSACTION_FEE_CONFIGS.default;
    const feePercentage = config.percentage / 100;
    let fee = amount * feePercentage;
    
    // Apply min and max fee limits
    fee = Math.max(fee, config.minFee);
    fee = Math.min(fee, config.maxFee);
    
    // Recipient gets the full amount they expect
    const recipientAmount = amount;
    
    // Sender pays the amount + fees
    const totalAmount = amount + fee;
    
    return { fee, totalAmount, recipientAmount };
  }

  // Legacy method removed - use calculateCompanyFee(amount, transactionType) instead

  /**
   * Format fee display for UI components
   */
  static formatFeeDisplay(amount: number, transactionType: TransactionType = 'default'): FeeDisplay {
    const calculation = this.calculateCompanyFee(amount, transactionType);
    const config = TRANSACTION_FEE_CONFIGS[transactionType] || TRANSACTION_FEE_CONFIGS.default;
    
    return {
      percentage: config.percentage,
      fee: calculation.fee,
      total: calculation.totalAmount,
      netAmount: calculation.recipientAmount
    };
  }

  /**
   * Get company fee structure for UI display
   */
  static getCompanyFeeStructure(transactionType: TransactionType = 'default') {
    const config = TRANSACTION_FEE_CONFIGS[transactionType] || TRANSACTION_FEE_CONFIGS.default;
    return {
      percentage: config.percentage / 100, // Return as decimal for UI
      minFee: config.minFee,
      maxFee: config.maxFee,
      currency: config.currency
    };
  }

  /**
   * Get all available transaction types and their fee structures
   */
  static getAllFeeStructures() {
    return TRANSACTION_FEE_CONFIGS;
  }

  /**
   * Get fee structure for a specific transaction type
   */
  static getFeeStructure(transactionType: TransactionType) {
    return TRANSACTION_FEE_CONFIGS[transactionType] || TRANSACTION_FEE_CONFIGS.default;
  }

  /**
   * Check if company wallet is configured (synchronous check - uses cached or env var)
   * For async check, use getFeePayerPublicKey() which fetches from Firebase
   */
  static isCompanyWalletConfigured(): boolean {
    // Check cached value or env var (for backward compatibility)
    try {
      return !!(COMPANY_WALLET_CONFIG.address && COMPANY_WALLET_CONFIG.address.trim() !== '');
    } catch {
      return false;
    }
  }

  /**
   * Get fee payer public key for SOL gas fees
   * Company wallet ALWAYS pays SOL gas fees - no exceptions
   * Fetches address from Firebase Secrets if not cached
   */
  static async getFeePayerPublicKey(_userPublicKey: PublicKey): Promise<PublicKey> {
    // Get address from Firebase (with fallback to env var)
    const address = await COMPANY_WALLET_CONFIG.getAddress();
    if (!address) {
      throw new Error('Company wallet not configured. SOL gas fees must be paid by company wallet.');
    }
    return new PublicKey(address);
  }

  /**
   * Validate company wallet has sufficient SOL for gas fees
   */
  static async validateCompanyWalletSolBalance(connection: any): Promise<{ isValid: boolean; balance: number; required: number; error?: string }> {
    try {
      // Get company wallet address from Firebase Secrets (not EAS secrets)
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      if (!companyWalletAddress) {
        return {
          isValid: false,
          balance: 0,
          required: COMPANY_WALLET_CONFIG.minSolReserve,
          error: 'Company wallet not configured'
        };
      }

      const companyPublicKey = new PublicKey(companyWalletAddress);
      const balance = await connection.getBalance(companyPublicKey);
      const balanceInSol = balance / 1000000000; // Convert lamports to SOL
      
      const isValid = balanceInSol >= COMPANY_WALLET_CONFIG.minSolReserve;
      
      return {
        isValid,
        balance: balanceInSol,
        required: COMPANY_WALLET_CONFIG.minSolReserve,
        error: isValid ? undefined : `Company wallet has insufficient SOL. Required: ${COMPANY_WALLET_CONFIG.minSolReserve} SOL, Available: ${balanceInSol.toFixed(6)} SOL`
      };
    } catch (error) {
      return {
        isValid: false,
        balance: 0,
        required: COMPANY_WALLET_CONFIG.minSolReserve,
        error: `Failed to check company wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Configuration loaded from environment variables
