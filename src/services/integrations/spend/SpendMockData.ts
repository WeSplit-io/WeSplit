/**
 * SPEND Mock Data
 * Mock data structures for testing SPEND integration without production API
 */

import { SpendWebhookPayload, SpendWebhookResponse, SpendOrderData } from './SpendTypes';

/**
 * Mock Treasury Wallet Addresses
 */
export const MOCK_TREASURY_WALLETS = {
  test: 'TestTreasuryWallet12345678901234567890123456789012', // Test wallet (not a real address)
  production: '2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp', // Production wallet from SPEND docs
};

/**
 * Mock Webhook URLs
 */
export const MOCK_WEBHOOK_URLS = {
  localhost: 'http://localhost:5001/{project-id}/us-central1/mockSpendWebhook',
  ngrok: 'https://your-ngrok-url.ngrok.io/mockSpendWebhook', // Replace with actual ngrok URL
};

/**
 * Mock Webhook Secret
 */
export const MOCK_WEBHOOK_SECRET = 'mock_webhook_secret_for_testing';

/**
 * Mock Order IDs
 */
export const MOCK_ORDER_IDS = {
  test1: 'SPEND_TEST_ORDER_001',
  test2: 'SPEND_TEST_ORDER_002',
  test3: 'SPEND_TEST_ORDER_003',
};

/**
 * Create mock SPEND order data
 */
export function createMockSpendOrderData(overrides?: Partial<SpendOrderData>): SpendOrderData {
  return {
    orderId: MOCK_ORDER_IDS.test1,
    treasuryWallet: MOCK_TREASURY_WALLETS.test,
    webhookUrl: MOCK_WEBHOOK_URLS.localhost,
    webhookSecret: MOCK_WEBHOOK_SECRET,
    paymentThreshold: 1.0,
    paymentTimeout: 7, // 7 days
    totalAmount: 100.0,
    currency: 'USDC',
    items: [
      {
        name: 'Test Product 1',
        price: 50.0,
        quantity: 1,
      },
      {
        name: 'Test Product 2',
        price: 50.0,
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

/**
 * Create mock webhook payload
 */
export function createMockWebhookPayload(overrides?: Partial<SpendWebhookPayload>): SpendWebhookPayload {
  return {
    order_id: MOCK_ORDER_IDS.test1,
    split_id: 'split_test_1234567890_abc',
    transaction_signature: '5KJpTestSignature1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    amount: 100.0,
    currency: 'USDC',
    participants: [
      'TestWallet12345678901234567890123456789012',
      'TestWallet23456789012345678901234567890123',
    ],
    status: 'completed',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock webhook success response
 */
export function createMockWebhookSuccessResponse(overrides?: Partial<SpendWebhookResponse>): SpendWebhookResponse {
  return {
    success: true,
    order_id: MOCK_ORDER_IDS.test1,
    status: 'Funded',
    message: 'Payment received and order updated',
    ...overrides,
  };
}

/**
 * Create mock webhook error response
 */
export function createMockWebhookErrorResponse(
  error: string = 'Order not found',
  code: string = 'ORDER_NOT_FOUND'
): SpendWebhookResponse {
  return {
    success: false,
    error,
    code,
  };
}

/**
 * Mock payment metadata for testing
 */
export const MOCK_PAYMENT_METADATA = {
  paymentMode: 'merchant_gateway' as const,
  treasuryWallet: MOCK_TREASURY_WALLETS.test,
  orderId: MOCK_ORDER_IDS.test1,
  webhookUrl: MOCK_WEBHOOK_URLS.localhost,
  webhookSecret: MOCK_WEBHOOK_SECRET,
  paymentThreshold: 1.0,
  paymentTimeout: 7,
  paymentStatus: 'pending' as const,
  paymentAttempts: 0,
};

/**
 * Mock split data with SPEND metadata for testing
 */
export function createMockSplitWithSpendMetadata() {
  return {
    id: 'split_test_1234567890_abc',
    billId: 'bill_test_1234567890_abc',
    title: 'SPEND Test Order',
    description: 'Test order from SPEND',
    totalAmount: 100.0,
    currency: 'USDC',
    status: 'pending' as const,
    creatorId: 'user_test_123',
    creatorName: 'Test User',
    participants: [
      {
        userId: 'user_test_123',
        name: 'Test User',
        email: 'test@example.com',
        walletAddress: 'TestWallet12345678901234567890123456789012',
        amountOwed: 100.0,
        amountPaid: 0,
        status: 'accepted' as const,
      },
    ],
    externalMetadata: MOCK_PAYMENT_METADATA,
  };
}

