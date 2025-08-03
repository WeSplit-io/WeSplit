// MoonPay Configuration
export const MOONPAY_CONFIG = {
  // Development (Sandbox)
  development: {
    baseUrl: 'https://buy-sandbox.moonpay.com',
    apiKey: process.env.MOONPAY_API_KEY || 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P', // Load from environment variable
    secretKey: process.env.MOONPAY_SECRET_KEY || '', // Load from environment variable
    webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET || '', // Load from environment variable
  },
  
  // Production
  production: {
    baseUrl: 'https://buy.moonpay.com',
    apiKey: process.env.MOONPAY_API_KEY || '', // Load from environment variable
    secretKey: process.env.MOONPAY_SECRET_KEY || '', // Load from environment variable
    webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET || '', // Load from environment variable
  }
};

// Get current environment configuration
export const getMoonPayConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  return MOONPAY_CONFIG[environment as keyof typeof MOONPAY_CONFIG] || MOONPAY_CONFIG.development;
};

// MoonPay URL parameters
export const MOONPAY_URL_PARAMS = {
  // Supported currencies
  currencies: {
    USDC: 'usdc',
    SOL: 'sol',
    ETH: 'eth',
    BTC: 'btc'
  },
  
  // Supported networks
  networks: {
    solana: 'solana',
    ethereum: 'ethereum',
    bitcoin: 'bitcoin'
  },
  
  // Default settings
  defaults: {
    currency: 'usdc',
    network: 'solana',
    baseCurrencyAmount: undefined, // Optional prefill amount
    redirectURL: 'wesplit://moonpay-success',
    failureRedirectURL: 'wesplit://moonpay-failure'
  }
};

// MoonPay transaction status
export enum MoonPayTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// MoonPay transaction types
export enum MoonPayTransactionType {
  BUY = 'buy',
  SELL = 'sell'
}

// MoonPay API endpoints
export const MOONPAY_API_ENDPOINTS = {
  // Transaction endpoints
  transactions: {
    create: '/v1/transactions',
    get: '/v1/transactions/:transactionId',
    list: '/v1/transactions'
  },
  
  // Currency endpoints
  currencies: {
    list: '/v1/currencies',
    get: '/v1/currencies/:currencyCode'
  },
  
  // Country endpoints
  countries: {
    list: '/v1/countries',
    get: '/v1/countries/:countryCode'
  }
};

// MoonPay webhook events
export enum MoonPayWebhookEvent {
  TRANSACTION_UPDATED = 'transaction.updated',
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_FAILED = 'transaction.failed'
}

// MoonPay webhook payload interface
export interface MoonPayWebhookPayload {
  type: MoonPayWebhookEvent;
  data: {
    id: string;
    status: MoonPayTransactionStatus;
    amount: number;
    currency: string;
    walletAddress: string;
    createdAt: string;
    updatedAt: string;
    failureReason?: string;
  };
}

// MoonPay transaction interface
export interface MoonPayTransaction {
  id: string;
  type: MoonPayTransactionType;
  status: MoonPayTransactionStatus;
  amount: number;
  currency: string;
  baseCurrencyAmount: number;
  baseCurrency: string;
  walletAddress: string;
  walletAddressTag?: string;
  customerId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  failureCode?: string;
  failureMessage?: string;
}

// MoonPay API response interface
export interface MoonPayAPIResponse<T> {
  data: T;
  error?: string;
  message?: string;
} 