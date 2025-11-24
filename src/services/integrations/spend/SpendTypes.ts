/**
 * SPEND Integration Types
 * TypeScript types for SPEND payment gateway integration
 * Based on SPEND's integration documentation
 */

import { Split } from '../../splits/splitStorageService';

/**
 * SPEND Payment Metadata
 * Metadata structure for SPEND merchant gateway payments
 * Includes full SP3ND order data
 */
export interface SpendPaymentMetadata {
  paymentMode: 'personal' | 'merchant_gateway';
  treasuryWallet?: string;
  orderId?: string; // SP3ND order ID (from order.id or order.order_number)
  orderNumber?: string; // Human-readable order number (e.g., "ORD-1234567890")
  orderStatus?: string; // SP3ND order status (Created, Payment_Pending, Paid, etc.)
  store?: string; // Store identifier ("amazon", "temu", "jumia")
  webhookUrl?: string;
  webhookSecret?: string;
  paymentThreshold?: number; // Default: 1.0 (100%)
  paymentTimeout?: number; // Days to wait for partial payments
  paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  paymentTransactionSig?: string;
  paymentAttempts?: number;
  lastPaymentAttempt?: string;
  idempotencyKey?: string;
  
  // Full SP3ND order data (optional, for reference)
  orderData?: Partial<SpendOrderData>;
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
 * Based on SP3ND Order JSON Schema
 */
export interface SpendOrderData {
  // Core order fields
  id: string; // Firebase document ID
  order_number?: string; // Human-readable order number (e.g., "ORD-1234567890")
  user_id: string; // Firebase user ID
  user_wallet?: string; // Solana wallet address
  customer_email?: string; // Customer email address
  status: string; // Order status (Created, Payment_Pending, Paid, etc.)
  created_at?: any; // Firebase Timestamp, ISO string, or Date
  updated_at?: any; // Firebase Timestamp, ISO string, or Date
  store: string; // Store identifier ("amazon", "temu", "jumia")
  
  // Items
  items?: SpendOrderItem[];
  
  // Financial fields
  subtotal?: number;
  discount?: number;
  voucher_code?: string;
  voucher_id?: string;
  fx_conversion_fee?: number;
  tax_amount?: number;
  shipping_amount?: number;
  no_kyc_fee?: number;
  total_amount: number; // Final total amount
  usd_total_at_payment?: number;
  
  // Shipping
  shipping_address?: SpendShippingAddress;
  shipping_country?: string;
  shipping_option?: string;
  is_international_shipping?: boolean;
  selected_shipping_method?: SpendShippingMethod;
  
  // Payment
  payment_method?: string; // "SOL", "USDC", "BONK"
  transaction_signature?: string;
  transaction_state?: string;
  payment_initiated_at?: any;
  payment_confirmed_at?: any;
  payment_verified_at?: any;
  
  // Tracking
  reference_number?: string;
  tracking_number?: string;
  tracking_url?: string;
  additional_notes?: string;
  
  // Amazon-specific
  amazonOrderIds?: string[];
  shippedAmazonOrderIds?: string[];
  deliveredAmazonOrderIds?: string[];
  deliveredAt?: any;
  lastStatusChangeAt?: any;
  nextPollAt?: any;
  
  // International processing
  international_processing?: SpendInternationalProcessing;
  international_submitted_at?: any;
  international_ready_at?: any;
  international_payment_completed_at?: any;
  
  // WeSplit integration fields
  treasuryWallet: string; // SP3ND treasury wallet
  webhookUrl?: string;
  webhookSecret?: string;
  paymentThreshold?: number;
  paymentTimeout?: number;
  currency?: string; // Default: "USDC"
}

/**
 * SPEND Order Item
 * Item structure from SP3ND order
 */
export interface SpendOrderItem {
  name?: string;
  product_title?: string;
  product_id?: string;
  product_url?: string;
  url?: string;
  price: number; // Required, default: 0.0
  quantity: number; // Required, default: 1
  category?: string; // Optional, default: 'general'
  image?: string;
  image_url?: string;
  isPrimeEligible?: boolean;
  variants?: SpendProductVariant[];
}

/**
 * Product Variant
 */
export interface SpendProductVariant {
  type: string; // Required
  value: string; // Required
}

/**
 * Shipping Address
 */
export interface SpendShippingAddress {
  name: string; // Required
  city: string; // Required
  state: string; // Required
  country: string; // Required
  address1: string; // Required
  address2?: string;
  postal_code: string; // Required
  phone?: string;
  recipient?: string;
  street?: string;
  line1?: string;
  line2?: string;
  zip?: string;
  email?: string;
  delivery_type?: string;
  pickup_location_id?: string;
  pickup_location_name?: string;
  pickup_location_address?: string;
}

/**
 * Shipping Method
 */
export interface SpendShippingMethod {
  name: string; // Required
  price: string; // Required
  minDays: string; // Required
  maxDays: string; // Required
}

/**
 * International Processing
 */
export interface SpendInternationalProcessing {
  shippingMethods?: SpendShippingMethod[];
  customsFee?: number;
  conversionFee?: number;
  internationalTax?: number;
  customMessage?: string;
  processedBy?: string;
  processedAt?: any;
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

