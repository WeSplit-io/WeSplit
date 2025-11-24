/**
 * SPEND Mock Data
 * 
 * ⚠️ DEPRECATED: This file is for reference/testing only.
 * Production code does NOT use mock data - all data comes from Firestore.
 * 
 * Mock data structures for testing SPEND integration without production API.
 * These functions are NOT called in production code.
 * 
 * For testing, use Firebase emulator with real order data via createSplitFromPayment endpoint.
 * See: docs/guides/SPEND_INTEGRATION/SPEND_DATA_FLOW.md
 */

import { SpendWebhookPayload, SpendWebhookResponse, SpendOrderData } from './SpendTypes';
import { Split } from '../../splits/splitStorageService';

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
 * Create comprehensive mock SPEND order data matching Figma mockup
 * Based on SP3ND_ORDER_JSON_MODEL.json schema
 */
export function createMockSpendOrderData(overrides?: Partial<SpendOrderData>): SpendOrderData {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  
  return {
    id: 'ord_1234567890',
    order_number: 'ORD-1234567890',
    status: 'Payment_Pending',
    store: 'amazon',
    total_amount: 65.6,
    currency: 'USDC',
    payment_method: 'USDC',
    created_at: createdAt.toISOString(),
    updated_at: now.toISOString(),
    user_wallet: 'B3gt.....sdgux', // Truncated for display
    items: [
      {
        product_id: 'prod_001',
        product_title: 'Wireless Bluetooth Headphones',
        product_url: 'https://example.com/product/001',
        image_url: 'https://via.placeholder.com/150',
        price: 45.6,
        quantity: 1,
        isPrimeEligible: true,
        variants: [
          { type: 'Color', value: 'Black' },
          { type: 'Size', value: 'Standard' },
        ],
      },
      {
        product_id: 'prod_002',
        product_title: 'USB-C Charging Cable',
        product_url: 'https://example.com/product/002',
        image_url: 'https://via.placeholder.com/150',
        price: 20.0,
        quantity: 1,
        isPrimeEligible: false,
        variants: [],
      },
    ],
    shipping_address: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    shipping_method: {
      name: 'Standard Shipping',
      cost: 0,
      estimated_days: 5,
    },
    ...overrides,
  };
}

/**
 * Create mock SPEND split data matching Figma mockup
 * This creates a complete split with all necessary data for testing
 */
export function createMockSpendSplit(overrides?: Partial<Split>): Split {
  const orderData = createMockSpendOrderData();
  const now = new Date();
  const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  
  // Mock participants matching Figma mockup
  const participants = [
    {
      userId: 'user_001',
      id: 'user_001',
      name: 'PauluneMoon',
      email: 'paulune@example.com',
      walletAddress: 'B3gt.....sdgux',
      wallet_address: 'B3gt.....sdgux',
      amountOwed: 10.03,
      amountPaid: 10.03,
      status: 'paid',
      isPaid: true,
    },
    {
      userId: 'user_002',
      id: 'user_002',
      name: 'Yuta',
      email: 'yuta@example.com',
      walletAddress: 'B3gt.....sdgux',
      wallet_address: 'B3gt.....sdgux',
      amountOwed: 10.03,
      amountPaid: 0,
      status: 'pending',
      isPaid: false,
    },
    {
      userId: 'user_003',
      id: 'user_003',
      name: 'Alice',
      email: 'alice@example.com',
      walletAddress: 'B3gt.....sdgux',
      wallet_address: 'B3gt.....sdgux',
      amountOwed: 22.77,
      amountPaid: 11.84,
      status: 'partial',
      isPaid: false,
    },
    {
      userId: 'user_004',
      id: 'user_004',
      name: 'Bob',
      email: 'bob@example.com',
      walletAddress: 'B3gt.....sdgux',
      wallet_address: 'B3gt.....sdgux',
      amountOwed: 22.77,
      amountPaid: 0,
      status: 'pending',
      isPaid: false,
    },
  ];
  
  const totalPaid = participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  
  return {
    id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    firebaseDocId: `firebase_${Date.now()}`,
    billId: `bill_${Date.now()}`,
    title: `Order ${orderData.order_number}`,
    description: `Split for ${orderData.store} order`,
    totalAmount: orderData.total_amount,
    currency: orderData.currency || 'USDC',
    splitType: 'spend',
    status: 'active',
    creatorId: 'user_001',
    creatorName: 'PauluneMoon',
    participants,
    createdAt: createdAt.toISOString(),
    updatedAt: now.toISOString(),
    date: createdAt.toISOString(),
    category: 'food',
    externalMetadata: {
      paymentMode: 'merchant_gateway',
      treasuryWallet: MOCK_TREASURY_WALLETS.test,
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      orderStatus: orderData.status,
      store: orderData.store,
      webhookUrl: MOCK_WEBHOOK_URLS.localhost,
      webhookSecret: MOCK_WEBHOOK_SECRET,
      paymentThreshold: 1.0,
      paymentTimeout: 7,
      paymentStatus: 'pending',
      paymentAttempts: 0,
      orderData, // Store full SP3ND order data
    },
    ...overrides,
  };
}

/**
 * Create mock split with partial payment (33% collected) matching Figma mockup
 */
export function createMockSpendSplitPartialPayment(): Split {
  const split = createMockSpendSplit();
  
  // Update participants to show 33% collected (21.87 USDC out of 65.6 USDC)
  const updatedParticipants = split.participants.map((p, index) => {
    if (index === 0) {
      // First participant paid full amount
      return { ...p, amountPaid: p.amountOwed };
    } else if (index === 1) {
      // Second participant paid partial
      return { ...p, amountPaid: 11.84, status: 'partial' };
    } else {
      // Others haven't paid
      return { ...p, amountPaid: 0, status: 'pending' };
    }
  });
  
  return {
    ...split,
    participants: updatedParticipants,
  };
}

/**
 * Create mock split with no payments (0% collected)
 */
export function createMockSpendSplitNoPayment(): Split {
  const split = createMockSpendSplit();
  
  return {
    ...split,
    participants: split.participants.map(p => ({
      ...p,
      amountPaid: 0,
      status: 'pending',
      isPaid: false,
    })),
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
 * Mock split data with SPEND metadata for testing (legacy - use createMockSpendSplit instead)
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
