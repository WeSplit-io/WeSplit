import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { createMoonPayURL } from './moonpayService';

// MoonPay SDK Configuration
const MOONPAY_SDK_CONFIG = {
  // Development (Sandbox)
  development: {
    apiKey: process.env.MOONPAY_API_KEY || '',
    baseUrl: 'https://buy-sandbox.moonpay.com'
  },
  
  // Production
  production: {
    apiKey: process.env.MOONPAY_API_KEY || '',
    baseUrl: 'https://buy.moonpay.com'
  }
};

// Get current environment configuration
const getCurrentConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  return MOONPAY_SDK_CONFIG[environment as keyof typeof MOONPAY_SDK_CONFIG] || MOONPAY_SDK_CONFIG.development;
};

// MoonPay transaction status
export enum MoonPayTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// MoonPay transaction interface
export interface MoonPayTransaction {
  id: string;
  status: MoonPayTransactionStatus;
  amount: number;
  currency: string;
  baseCurrencyAmount: number;
  baseCurrency: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

// MoonPay SDK response interface
export interface MoonPaySDKResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Custom hook for MoonPay SDK
export const useMoonPaySDK = () => {
  const { state } = useApp();
  const { appWalletAddress, getAppWalletBalance } = useWallet();
  const config = getCurrentConfig();

  // Open MoonPay purchase flow using direct URL
  const openMoonPayPurchase = async (amount?: number) => {
    try {
      console.log('🔍 MoonPay SDK: Opening purchase flow...');
      console.log('🔍 MoonPay SDK: Config:', {
        apiKey: config.apiKey,
        environment: process.env.NODE_ENV,
        walletAddress: appWalletAddress,
        amount
      });

      if (!appWalletAddress) {
        throw new Error('App wallet address not available');
      }

      if (!state.currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Create MoonPay URL with your real API key
      const moonpayResponse = await createMoonPayURL(
        appWalletAddress,
        amount || 100,
        'USDC'
      );

      const moonpayUrl = moonpayResponse.url;

      console.log('🔍 MoonPay SDK: Created URL:', moonpayUrl);

      // Return the URL for WebView display
      return {
        success: true,
        url: moonpayUrl,
        walletAddress: appWalletAddress,
        currency: 'USDC',
        amount: amount || 100
      };
    } catch (error) {
      console.error('🔍 MoonPay SDK: Error creating MoonPay URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Open MoonPay purchase flow with custom amount
  const openMoonPayPurchaseWithAmount = async (amount: number) => {
    return openMoonPayPurchase(amount);
  };

  // Open MoonPay purchase flow without pre-filled amount
  const openMoonPayPurchaseWithoutAmount = async () => {
    return openMoonPayPurchase();
  };

  return {
    openMoonPayPurchase,
    openMoonPayPurchaseWithAmount,
    openMoonPayPurchaseWithoutAmount,
    config
  };
};

// Export the hook for use in components
export default useMoonPaySDK; 