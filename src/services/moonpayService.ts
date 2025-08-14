import { apiRequest } from '../config/api';
import { MoonPayConfig } from '../types';

// MoonPay configuration
export const moonPayConfig: MoonPayConfig = {
  apiKey: process.env.EXPO_PUBLIC_MOONPAY_API_KEY || 'YOUR_MOONPAY_API_KEY_HERE', // Load from environment variable
  environment: __DEV__ ? 'sandbox' : 'production',
  baseUrl: __DEV__ ? 'https://buy-sandbox.moonpay.com' : 'https://buy.moonpay.com'
};

export interface MoonPayURLResponse {
  url: string;
  walletAddress: string;
  currency: string;
  amount?: number;
}

export interface MoonPayStatusResponse {
  transactionId: string;
  status: string;
  amount: string;
  currency: string;
  timestamp: string;
}

function createDirectMoonPayURL(walletAddress: string, amount?: number, currency: string = 'USDC'): string {
  // Validate inputs
  if (!walletAddress || typeof walletAddress !== 'string') {
    throw new Error('Invalid wallet address: must be a non-empty string');
  }
  
  if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
    throw new Error('Invalid amount: must be a positive number');
  }
  
  if (!currency || typeof currency !== 'string') {
    throw new Error('Invalid currency: must be a non-empty string');
  }
  
  console.log('🔍 MoonPay: Creating URL with params:', {
    apiKey: moonPayConfig.apiKey,
    currencyCode: currency,
    walletAddress: walletAddress,
    amount
  });
  
  const params = new URLSearchParams({
    apiKey: moonPayConfig.apiKey,
    currencyCode: currency.toLowerCase(), // MoonPay expects lowercase
    walletAddress: walletAddress,
    ...(amount && { baseCurrencyAmount: amount.toString() })
  });
  
  // Add additional MoonPay parameters
  params.append('redirectURL', 'wesplit://moonpay-success');
  params.append('failureRedirectURL', 'wesplit://moonpay-failure');
  
  const url = `${moonPayConfig.baseUrl}?${params.toString()}`;
  console.log('🔍 MoonPay: Generated URL:', url);
  
  return url;
}

export async function createMoonPayURL(walletAddress: string, amount?: number, currency: string = 'USDC'): Promise<MoonPayURLResponse> {
  if (__DEV__) { console.log('🔍 MoonPay: Creating URL for app wallet:', walletAddress, 'amount:', amount, 'currency:', currency); }
  
  // Validate wallet address
  if (!walletAddress || walletAddress.length < 32) {
    throw new Error('Invalid wallet address provided');
  }
  
  // Always use direct MoonPay URL since backend is not available
  try {
    console.log('🔍 MoonPay: Creating direct URL with real API key...');
      const directUrl = createDirectMoonPayURL(walletAddress, amount, currency);
    if (__DEV__) { console.log('🔍 MoonPay: Created direct URL:', directUrl); }
      
    const response = {
        url: directUrl,
        walletAddress,
        currency,
        amount
      };
    
    console.log('🔍 MoonPay: Returning direct URL response:', response);
    return response;
    } catch (directError) {
    console.error('🔍 MoonPay: Failed to create direct URL:', directError);
      throw new Error('Failed to create MoonPay URL. Please check your internet connection and try again.');
  }
}

export async function checkMoonPayStatus(transactionId: string): Promise<MoonPayStatusResponse> {
  try {
    return await apiRequest<MoonPayStatusResponse>(`/api/moonpay/status/${transactionId}`);
  } catch (e) {
    console.error('Error checking MoonPay status:', e);
    throw new Error('Unable to check transaction status. Please contact support if needed.');
  }
}

export function openMoonPayInBrowser(url: string): void {
  if (__DEV__) { console.log('Opening MoonPay URL:', url); }
  // This would use Linking.openURL(url) in React Native
} 