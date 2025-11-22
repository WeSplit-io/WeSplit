/**
 * SPEND Integration Types
 * TypeScript types for SPEND payment gateway integration
 * Based on SPEND's integration documentation
 */

import { Split } from '../../splits/splitStorageService';

/**
 * SPEND Payment Metadata
 * Metadata structure for SPEND merchant gateway payments
 */
export interface SpendPaymentMetadata {
  paymentMode: 'personal' | 'merchant_gateway';
  treasuryWallet?: string;
  orderId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  paymentThreshold?: number; // Default: 1.0 (100%)
  paymentTimeout?: number; // Days to wait for partial payments
  paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  paymentTransactionSig?: string;
  paymentAttempts?: number;
  lastPaymentAttempt?: string;
  idempotencyKey?: string;
}

/**
 * SPEND Webhook Payload
 * Payload format for calling SPEND's webhook endpoint
 * Matches format from SPEND's HTML documentation
 */
export interface SpendWebhookPayload {
  order_id: string;
  split_id: string;
  transaction_signature: string;
  amount: number;
  currency: 'SOL' | 'USDC' | 'BONK';
  participants: string[];
  status: 'pending' | 'completed' | 'failed';
  timestamp: string; // ISO 8601 format
}

/**
 * SPEND Webhook Response
 * Expected response from SPEND's webhook endpoint
 * Matches format from SPEND's HTML documentation
 */
export interface SpendWebhookResponse {
  success: boolean;
  order_id?: string;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * SPEND Payment Result
 * Result of processing a merchant payment to SPEND
 */
export interface SpendPaymentResult {
  success: boolean;
  transactionSignature?: string;
  amount?: number;
  error?: string;
  message?: string;
  webhookCalled?: boolean;
  webhookError?: string;
}

/**
 * SPEND Order Data
 * Order data structure from SPEND when creating a split
 */
export interface SpendOrderData {
  orderId: string;
  treasuryWallet: string;
  webhookUrl?: string;
  webhookSecret?: string;
  paymentThreshold?: number;
  paymentTimeout?: number;
  totalAmount: number;
  currency: string;
  items?: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
}

/**
 * SPEND Configuration
 * Configuration values for SPEND integration
 */
export interface SpendConfig {
  productionTreasuryWallet: string;
  testTreasuryWallet?: string;
  memoFormat: string; // "SP3ND Order: {orderId}"
  defaultPaymentThreshold: number; // Default: 1.0 (100%)
  maxPaymentAttempts: number; // Default: 5
  webhookRetryAttempts: number; // Default: 3
  webhookRetryDelays: number[]; // [1000, 2000, 4000] in milliseconds
}

/**
 * SPEND Constants
 */
export const SPEND_CONFIG: SpendConfig = {
  productionTreasuryWallet: '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp',
  memoFormat: 'SP3ND Order: {orderId}',
  defaultPaymentThreshold: 1.0,
  maxPaymentAttempts: 5,
  webhookRetryAttempts: 3,
  webhookRetryDelays: [1000, 2000, 4000], // 1s, 2s, 4s
};

