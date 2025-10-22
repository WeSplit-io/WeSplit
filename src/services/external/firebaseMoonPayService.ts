import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import Constants from 'expo-constants';
import { logger } from '../core';

// Get environment variables from Expo Constants
const getEnvVar = (key: string): string => {
  // Try to get from process.env first (for development)
  if (process.env[key]) {
    return process.env[key]!;
  }
  
  // Try to get from process.env with EXPO_PUBLIC_ prefix
  if (process.env[`EXPO_PUBLIC_${key}`]) {
    return process.env[`EXPO_PUBLIC_${key}`]!;
  }
  
  // Try to get from Expo Constants
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Try to get from Expo Constants with EXPO_PUBLIC_ prefix
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  }
  
  // Try to get from Constants.manifest (older Expo versions)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return (Constants.manifest as any).extra[key];
  }
  
  // Try to get from Constants.manifest with EXPO_PUBLIC_ prefix
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  }
  
  return '';
};

// Get Firebase configuration values
const apiKey = getEnvVar('FIREBASE_API_KEY');
const authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
const projectId = getEnvVar('FIREBASE_PROJECT_ID') || "wesplit-35186";
const storageBucket = getEnvVar('FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
const messagingSenderId = getEnvVar('FIREBASE_MESSAGING_SENDER_ID');
const appId = getEnvVar('FIREBASE_APP_ID');

// Firebase configuration
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Functions with us-central1 region
const functions = getFunctions(app, 'us-central1');

// MoonPay transaction interface
export interface MoonPayTransaction {
  id: string;
  moonpayTransactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  walletAddress: string;
  createdAt: any;
  updatedAt: any;
  failureReason?: string;
}

// MoonPay URL response interface
export interface MoonPayURLResponse {
  url: string;
  walletAddress: string;
  currency: string;
  amount?: number;
}

// MoonPay transaction status response interface
export interface MoonPayTransactionStatusResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: any;
  updatedAt: any;
  failureReason?: string;
}

// Create MoonPay URL using Firebase Functions
export const createMoonPayURL = async (
  walletAddress: string,
  amount?: number,
  currency: string = 'usdc'
): Promise<MoonPayURLResponse> => {
  try {
    logger.info('Creating URL', {
      walletAddress,
      amount,
      currency
    });

    // Verify wallet address format and log details
    logger.debug('Wallet address verification', {
      walletAddress,
      addressLength: walletAddress?.length,
      addressFormat: walletAddress ? 'Solana (base58)' : 'Not available',
      isValidFormat: walletAddress ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress) : false
    });

    // For Solana, we need to use the correct currency code
    // MoonPay supports USDC on Solana with currency code 'usdc_sol'
    const solanaCurrency = currency === 'usdc' ? 'usdc_sol' : currency;

    logger.debug('Currency mapping', {
      originalCurrency: currency,
      solanaCurrency,
      amount
    });

    // Prepare the data object, only including amount if it's provided
    const data: any = {
      walletAddress,
      currency: solanaCurrency
    };

    // Only add amount if it's provided and not undefined
    if (amount !== undefined && amount !== null) {
      data.amount = amount;
    }

    logger.debug('Calling Firebase function with data', { data }, 'firebaseMoonPayService');

    // Call Firebase Function - authentication is handled by the function
    const createMoonPayURLFunction = httpsCallable(functions, 'createMoonPayURL', {
      timeout: 60000 // 60 seconds timeout
    });
    const result = await createMoonPayURLFunction(data);

    const response = result.data as MoonPayURLResponse;
    logger.info('URL created successfully', {
      url: response.url,
      walletAddress: response.walletAddress,
      currency: response.currency,
      amount: response.amount
    });

    // Verify the response contains the correct wallet address
    if (response.walletAddress !== walletAddress) {
      console.warn('🔍 Firebase MoonPay: Warning - Response wallet address differs from input:', {
        expected: walletAddress,
        received: response.walletAddress
      });
    }

    return response;
  } catch (error) {
    console.error('🔍 Firebase MoonPay: Error creating URL:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('unauthenticated')) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.message.includes('permission-denied')) {
        throw new Error('Permission denied. Please check your account.');
      } else if (error.message.includes('No user found for this wallet address')) {
        throw new Error('Wallet not found. Please check your wallet address.');
      } else if (error.message.includes('Invalid Solana wallet address format')) {
        throw new Error('Invalid wallet address format. Please check your wallet address.');
      } else {
        throw new Error(`Failed to create MoonPay URL: ${error.message}`);
      }
    }
    
    throw new Error('Failed to create MoonPay URL');
  }
};

// Get MoonPay transaction status
export const getMoonPayTransactionStatus = async (
  transactionId: string
): Promise<MoonPayTransactionStatusResponse> => {
  try {
    logger.info('Getting transaction status', { transactionId }, 'firebaseMoonPayService');

    // Call Firebase Function - authentication is handled by the function
    const getTransactionStatusFunction = httpsCallable(functions, 'getMoonPayTransactionStatus', {
      timeout: 60000 // 60 seconds timeout
    });
    const result = await getTransactionStatusFunction({ transactionId });

    const response = result.data as MoonPayTransactionStatusResponse;
    logger.info('Transaction status retrieved', { response }, 'firebaseMoonPayService');

    return response;
  } catch (error) {
    console.error('🔍 Firebase MoonPay: Error getting transaction status:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get transaction status');
  }
};

// Get user's MoonPay transactions
export const getUserMoonPayTransactions = async (
  limit: number = 10
): Promise<{ transactions: MoonPayTransaction[] }> => {
  try {
    logger.info('Getting user transactions', { limit }, 'firebaseMoonPayService');

    // Call Firebase Function - authentication is handled by the function
    const getUserTransactionsFunction = httpsCallable(functions, 'getUserMoonPayTransactions', {
      timeout: 60000 // 60 seconds timeout
    });
    const result = await getUserTransactionsFunction({ limit });

    const response = result.data as { transactions: MoonPayTransaction[] };
    logger.info('User transactions retrieved', { response }, 'firebaseMoonPayService');

    return response;
  } catch (error) {
    console.error('🔍 Firebase MoonPay: Error getting user transactions:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get user transactions');
  }
};

// Poll transaction status until completion
export const pollTransactionStatus = async (
  transactionId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<MoonPayTransactionStatusResponse> => {
  logger.info('Starting transaction polling', { transactionId }, 'firebaseMoonPayService');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const status = await getMoonPayTransactionStatus(transactionId);
      
      logger.debug(`Poll attempt ${attempt}/${maxAttempts}`, { status }, 'firebaseMoonPayService');

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        logger.info('Transaction polling completed', { status: status.status }, 'firebaseMoonPayService');
        return status;
      }

      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(`🔍 Firebase MoonPay: Error in poll attempt ${attempt}:`, error);
      
      if (attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error('Transaction polling timed out');
};

// MoonPay service object
export const firebaseMoonPayService = {
  createMoonPayURL,
  getMoonPayTransactionStatus,
  getUserMoonPayTransactions,
  pollTransactionStatus
};

export default firebaseMoonPayService; 