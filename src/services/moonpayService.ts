const BACKEND_URL = 'http://192.168.1.75:4000';

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
    const response = await fetch(`${BACKEND_URL}/api/moonpay/create-url`, {
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

    console.log('MoonPay backend response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('MoonPay URL created successfully via backend:', data);
      return data;
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
      console.warn('Backend failed, falling back to direct URL:', errorData);
      throw new Error('Backend failed');
    }
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
    const response = await fetch(`${BACKEND_URL}/api/moonpay/status/${transactionId}`);

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Status check failed' }));
      throw new Error(errorData.error || 'Failed to check transaction status');
    }
  } catch (e) {
    console.error('Error checking MoonPay status:', e);
    throw new Error('Unable to check transaction status. Please contact support if needed.');
  }
}

export function openMoonPayInBrowser(url: string): void {
  console.log('Opening MoonPay URL:', url);
  // This would use Linking.openURL(url) in React Native
} 