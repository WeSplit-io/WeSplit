import { apiRequest } from '../config/api';

// MoonPay direct URL parameters (for fallback when backend is unavailable)
const MOONPAY_DIRECT_CONFIG = {
  baseUrl: 'https://buy-sandbox.moonpay.com',
  apiKey: 'pk_test_123', // Replace with your actual sandbox API key
  currency: 'SOL',
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

function createDirectMoonPayURL(walletAddress: string, amount?: number, currency: string = 'SOL'): string {
  const params = new URLSearchParams({
    apiKey: MOONPAY_DIRECT_CONFIG.apiKey,
    currencyCode: currency,
    walletAddress: walletAddress,
    colorCode: '%23A5EA15', // WeSplit green color
    ...(amount && { baseCurrencyAmount: amount.toString() })
  });
  
  return `${MOONPAY_DIRECT_CONFIG.baseUrl}?${params.toString()}`;
}

export async function createMoonPayURL(walletAddress: string, amount?: number, currency: string = 'SOL'): Promise<MoonPayURLResponse> {
  console.log('Creating MoonPay URL for wallet:', walletAddress, 'amount:', amount);
  
  // First try to use the backend API
  try {
    const data = await apiRequest<MoonPayURLResponse>('/api/moonpay/create-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        amount,
        currency
      }),
    });

      console.log('MoonPay URL created successfully via backend:', data);
      return data;
  } catch (backendError) {
    console.warn('Backend unavailable, using direct MoonPay URL:', backendError);
    
    // Fallback to direct MoonPay URL
    try {
      const directUrl = createDirectMoonPayURL(walletAddress, amount, currency);
      console.log('Created direct MoonPay URL:', directUrl);
      
      return {
        url: directUrl,
        walletAddress,
        currency,
        amount
      };
    } catch (directError) {
      console.error('Failed to create direct MoonPay URL:', directError);
      throw new Error('Failed to create MoonPay URL. Please check your internet connection and try again.');
    }
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
  console.log('Opening MoonPay URL:', url);
  // This would use Linking.openURL(url) in React Native
} 