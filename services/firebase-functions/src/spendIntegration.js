/**
 * SPEND Integration Firebase Functions
 * Mock webhook endpoint and test endpoints for SPEND integration
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firestore
const db = admin.firestore();

/**
 * Mock SPEND Webhook Endpoint
 * Receives webhook calls from WeSplit and returns mock response
 * Used for testing before SPEND's actual webhook is deployed
 */
exports.mockSpendWebhook = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }

      const payload = req.body;

      // Log the webhook payload with detailed format
      console.log('=== MOCK SPEND WEBHOOK RECEIVED ===');
      console.log('Full Payload:', JSON.stringify(payload, null, 2));
      console.log('\n--- Payload Structure ---');
      console.log('order_id:', payload.order_id);
      console.log('split_id:', payload.split_id);
      console.log('transaction_signature:', payload.transaction_signature);
      console.log('amount:', payload.amount);
      console.log('currency:', payload.currency);
      console.log('participants:', payload.participants);
      console.log('status:', payload.status);
      console.log('timestamp:', payload.timestamp);
      console.log('=====================================\n');
      
      // Store payload in Firestore for testing/debugging
      try {
        await db.collection('spend_webhook_logs').add({
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          payload: payload,
          orderId: payload.order_id,
          splitId: payload.split_id,
          amount: payload.amount,
          currency: payload.currency,
          status: payload.status,
        });
        console.log('Webhook payload logged to Firestore collection: spend_webhook_logs');
      } catch (logError) {
        console.warn('Failed to log webhook to Firestore:', logError.message);
      }

      // Validate payload structure
      if (!payload.order_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing order_id in payload',
          code: 'MISSING_ORDER_ID'
        });
      }

      if (!payload.transaction_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing transaction_signature in payload',
          code: 'MISSING_TRANSACTION_SIGNATURE'
        });
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Return mock success response matching SPEND's format
      return res.status(200).json({
        success: true,
        order_id: payload.order_id,
        status: 'Funded',
        message: 'Payment received and order updated (mock response)'
      });

    } catch (error) {
      console.error('Error in mockSpendWebhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Test SPEND Payment Flow
 * Test endpoint that simulates full payment flow with mock data
 */
exports.testSpendPaymentFlow = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }

      const testData = req.body;

      // Return mock response simulating the full flow
      return res.status(200).json({
        success: true,
        message: 'Test payment flow simulation',
        data: {
          splitId: testData.splitId || 'test_split_123',
          orderId: testData.orderId || 'SPEND_TEST_ORDER_001',
          paymentStatus: 'processing',
          transactionSignature: '5KJpTestSignature1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
          webhookCalled: true,
          webhookResponse: {
            success: true,
            order_id: testData.orderId || 'SPEND_TEST_ORDER_001',
            status: 'Funded',
            message: 'Payment received and order updated'
          }
        }
      });

    } catch (error) {
      console.error('Error in testSpendPaymentFlow:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Get Webhook Payload Format
 * Returns the expected webhook payload format for testing
 */
exports.getSpendWebhookFormat = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Return the expected payload format
      const examplePayload = {
        order_id: 'SPEND_ORDER_123',
        split_id: 'split_abc123',
        transaction_signature: '5KJpTestSignature1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        amount: 100.0,
        currency: 'USDC',
        participants: [
          'WalletAddress1...',
          'WalletAddress2...'
        ],
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        message: 'SPEND Webhook Payload Format',
        format: {
          description: 'This is the payload format WeSplit sends to SPEND when payment is completed',
          example: examplePayload,
          fields: {
            order_id: {
              type: 'string',
              required: true,
              description: 'SPEND order ID from externalMetadata.orderId'
            },
            split_id: {
              type: 'string',
              required: true,
              description: 'WeSplit split ID'
            },
            transaction_signature: {
              type: 'string',
              required: true,
              description: 'Solana transaction signature for the payment'
            },
            amount: {
              type: 'number',
              required: true,
              description: 'Payment amount in USDC'
            },
            currency: {
              type: 'string',
              required: true,
              description: 'Currency code (USDC, SOL, or BONK)'
            },
            participants: {
              type: 'array<string>',
              required: true,
              description: 'Array of participant wallet addresses'
            },
            status: {
              type: 'string',
              required: true,
              description: 'Payment status: pending, completed, or failed'
            },
            timestamp: {
              type: 'string',
              required: true,
              description: 'ISO 8601 timestamp of when payment was completed'
            }
          }
        },
        webhookEndpoint: '/mockSpendWebhook',
        note: 'Use the mockSpendWebhook endpoint to test webhook calls. Payloads are logged to spend_webhook_logs collection in Firestore.'
      });

    } catch (error) {
      console.error('Error in getSpendWebhookFormat:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

