import { MOONPAY_CONFIG, getMoonPayConfig } from '../config/moonpay';

export const moonpayConfig = {
  // Use environment variables for API keys
  apiKey: process.env.MOONPAY_API_KEY || '', // Your real MoonPay public key
  currency: 'USDC',
  network: 'solana'
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
    apiKey: moonpayConfig.apiKey,
    currencyCode: currency,
    walletAddress: walletAddress,
    amount
  });
  
  const params = new URLSearchParams({
    apiKey: moonpayConfig.apiKey,
    currencyCode: currency.toLowerCase(), // MoonPay expects lowercase
    walletAddress: walletAddress,
    redirectURL: 'wesplit://moonpay-success'
  });
  
  // Add amount if provided
  if (amount) {
    params.append('baseCurrencyAmount', amount.toString());
  }
  
  params.append('failureRedirectURL', 'wesplit://moonpay-failure');
  
  const config = getMoonPayConfig();
  const url = `${config.baseUrl}?${params.toString()}`;
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
  // Stub function - MoonPay status checking is not implemented yet
  if (__DEV__) { console.log('🔍 MoonPay: Status check not implemented for transaction:', transactionId); }
  
  // Return a mock response for now
  return {
    transactionId,
    status: 'pending',
    amount: '0',
    currency: 'USDC',
    timestamp: new Date().toISOString()
  };
}

export function openMoonPayInBrowser(url: string): void {
  if (__DEV__) { console.log('Opening MoonPay URL:', url); }
  // This would use Linking.openURL(url) in React Native
} 