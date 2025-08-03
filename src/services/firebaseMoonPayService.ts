import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize Firebase Functions
const functions = getFunctions();

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
    console.log('🔍 Firebase MoonPay: Creating URL...', {
      walletAddress,
      amount,
      currency
    });

    // Verify wallet address format and log details
    console.log('🔍 Firebase MoonPay: Wallet address verification:', {
      walletAddress,
      addressLength: walletAddress?.length,
      addressFormat: walletAddress ? 'Solana (base58)' : 'Not available',
      isValidFormat: walletAddress ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress) : false
    });

    // For Solana, we need to use the correct currency code
    // MoonPay supports USDC on Solana with currency code 'usdc_sol'
    const solanaCurrency = currency === 'usdc' ? 'usdc_sol' : currency;

    console.log('🔍 Firebase MoonPay: Currency mapping:', {
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

    console.log('🔍 Firebase MoonPay: Calling Firebase function with data:', data);

    // Call Firebase Function - authentication is handled by the function
    const createMoonPayURLFunction = httpsCallable(functions, 'createMoonPayURL');
    const result = await createMoonPayURLFunction(data);

    const response = result.data as MoonPayURLResponse;
    console.log('🔍 Firebase MoonPay: URL created successfully:', {
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
    console.log('🔍 Firebase MoonPay: Getting transaction status...', { transactionId });

    // Call Firebase Function - authentication is handled by the function
    const getTransactionStatusFunction = httpsCallable(functions, 'getMoonPayTransactionStatus');
    const result = await getTransactionStatusFunction({ transactionId });

    const response = result.data as MoonPayTransactionStatusResponse;
    console.log('🔍 Firebase MoonPay: Transaction status retrieved:', response);

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
    console.log('🔍 Firebase MoonPay: Getting user transactions...', { limit });

    // Call Firebase Function - authentication is handled by the function
    const getUserTransactionsFunction = httpsCallable(functions, 'getUserMoonPayTransactions');
    const result = await getUserTransactionsFunction({ limit });

    const response = result.data as { transactions: MoonPayTransaction[] };
    console.log('🔍 Firebase MoonPay: User transactions retrieved:', response);

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
  console.log('🔍 Firebase MoonPay: Starting transaction polling...', { transactionId });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const status = await getMoonPayTransactionStatus(transactionId);
      
      console.log(`🔍 Firebase MoonPay: Poll attempt ${attempt}/${maxAttempts}:`, status);

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        console.log('🔍 Firebase MoonPay: Transaction polling completed:', status.status);
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