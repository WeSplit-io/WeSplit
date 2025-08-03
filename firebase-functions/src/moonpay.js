const functions = require('firebase-functions');
const admin = require('firebase-admin');

// MoonPay configuration
const MOONPAY_CONFIG = {
  sandbox: {
    apiKey: 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P',
    secretKey: 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH',
    webhookSecret: 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL',
    baseUrl: 'https://buy-sandbox.moonpay.com'
  },
  production: {
    apiKey: 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P',
    secretKey: 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH',
    webhookSecret: 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL',
    baseUrl: 'https://buy.moonpay.com'
  }
};

// Get current environment configuration
const getMoonPayConfig = () => {
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
  return MOONPAY_CONFIG[environment];
};

// MoonPay transaction status
const MoonPayTransactionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// MoonPay webhook event types
const MoonPayWebhookEvent = {
  TRANSACTION_UPDATED: 'transaction.updated',
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_FAILED: 'transaction.failed'
};

// Create MoonPay URL
const createMoonPayURL = functions.https.onCall(async (data, context) => {
  try {
    const { walletAddress, amount, currency = 'usdc' } = data;
    
    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid wallet address');
    }

    // Validate Solana address format (base58, 32-44 characters)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid Solana wallet address format');
    }

    // Only validate amount if it's provided and not undefined
    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid amount');
      }
    }

    let userId = null;

    // Try to get user ID from Firebase Auth context
    if (context.auth) {
      userId = context.auth.uid;
      console.log('MoonPay: User authenticated via Firebase Auth:', userId);
    } else {
      // If no Firebase Auth context, try to find user by wallet address in Firestore
      console.log('MoonPay: No Firebase Auth context, searching for user by wallet address:', walletAddress);
      
      const usersRef = admin.firestore().collection('users');
      const userQuery = await usersRef.where('wallet_address', '==', walletAddress).limit(1).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        userId = userDoc.id;
        console.log('MoonPay: Found user by wallet address:', userId);
      } else {
        // Try searching by wallet_public_key as well
        const userQueryByPublicKey = await usersRef.where('wallet_public_key', '==', walletAddress).limit(1).get();
        
        if (!userQueryByPublicKey.empty) {
          const userDoc = userQueryByPublicKey.docs[0];
          userId = userDoc.id;
          console.log('MoonPay: Found user by wallet public key:', userId);
        } else {
          console.log('MoonPay: No user found for wallet address:', walletAddress);
          throw new functions.https.HttpsError('unauthenticated', 'No user found for this wallet address');
        }
      }
    }

    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const config = getMoonPayConfig();

    // For Solana, we need to use the correct currency code
    // MoonPay supports USDC on Solana with currency code 'usdc_sol'
    const solanaCurrency = currency === 'usdc' ? 'usdc_sol' : currency;

    // Create MoonPay URL
    const params = new URLSearchParams({
      apiKey: config.apiKey,
      currencyCode: solanaCurrency,
      walletAddress: walletAddress,
      redirectURL: 'wesplit://moonpay-success',
      failureRedirectURL: 'wesplit://moonpay-failure'
    });

    if (amount) {
      params.append('baseCurrencyAmount', amount.toString());
    }

    // Add minimal additional parameters to avoid conflicts
    params.append('walletAddressTag', ''); // Empty tag for Solana

    const moonpayUrl = `${config.baseUrl}?${params.toString()}`;

    // Log the transaction attempt
    await admin.firestore().collection('moonpay_transactions').add({
      userId,
      walletAddress,
      amount,
      currency: solanaCurrency,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('MoonPay URL created:', {
      userId,
      walletAddress,
      amount,
      currency: solanaCurrency,
      url: moonpayUrl
    });

    return {
      url: moonpayUrl,
      walletAddress,
      currency: solanaCurrency,
      amount
    };
  } catch (error) {
    console.error('Error creating MoonPay URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create MoonPay URL');
  }
});

// MoonPay webhook handler
const moonpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const signature = req.headers['moonpay-signature'];
    const payload = req.body;

    console.log('MoonPay webhook received:', {
      signature: signature ? 'present' : 'missing',
      type: payload.type,
      transactionId: payload.data.id,
      status: payload.data.status
    });

    // Verify webhook signature (in production, you should verify this)
    const config = getMoonPayConfig();
    // TODO: Implement signature verification
    // if (!verifyWebhookSignature(signature, payload, config.webhookSecret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const { type, data } = payload;

    // Find the transaction in Firestore
    const transactionQuery = await admin.firestore()
      .collection('moonpay_transactions')
      .where('walletAddress', '==', data.walletAddress)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (transactionQuery.empty) {
      console.warn('No transaction found for wallet:', data.walletAddress);
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const transactionDoc = transactionQuery.docs[0];
    const transactionData = transactionDoc.data();

    // Update transaction status
    await transactionDoc.ref.update({
      moonpayTransactionId: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      failureReason: data.failureReason,
      failureCode: data.failureCode,
      failureMessage: data.failureMessage
    });

    // Handle different webhook events
    switch (type) {
      case MoonPayWebhookEvent.TRANSACTION_CREATED:
        console.log('Transaction created:', data.id);
        break;

      case MoonPayWebhookEvent.TRANSACTION_UPDATED:
        console.log('Transaction updated:', data.id, 'Status:', data.status);
        
        if (data.status === MoonPayTransactionStatus.COMPLETED) {
          // Transaction completed successfully
          await handleSuccessfulTransaction(transactionData.userId, data);
        } else if (data.status === MoonPayTransactionStatus.FAILED) {
          // Transaction failed
          await handleFailedTransaction(transactionData.userId, data);
        }
        break;

      case MoonPayWebhookEvent.TRANSACTION_FAILED:
        console.log('Transaction failed:', data.id);
        await handleFailedTransaction(transactionData.userId, data);
        break;

      default:
        console.log('Unknown webhook event type:', type);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing MoonPay webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle successful transaction
async function handleSuccessfulTransaction(userId, transaction) {
  try {
    console.log('Processing successful transaction:', transaction.id);

    // Update user's wallet balance (you'll need to implement this based on your wallet system)
    // await updateUserWalletBalance(userId, transaction.amount, transaction.currency);

    // Send notification to user
    await admin.firestore().collection('notifications').add({
      userId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Your payment of ${transaction.amount} ${transaction.currency.toUpperCase()} has been completed successfully.`,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        walletAddress: transaction.walletAddress
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    console.log('Successfully processed transaction:', transaction.id);
  } catch (error) {
    console.error('Error handling successful transaction:', error);
  }
}

// Handle failed transaction
async function handleFailedTransaction(userId, transaction) {
  try {
    console.log('Processing failed transaction:', transaction.id);

    // Send notification to user
    await admin.firestore().collection('notifications').add({
      userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment of ${transaction.amount} ${transaction.currency.toUpperCase()} has failed. ${transaction.failureReason || ''}`,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        walletAddress: transaction.walletAddress,
        failureReason: transaction.failureReason
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    console.log('Successfully processed failed transaction:', transaction.id);
  } catch (error) {
    console.error('Error handling failed transaction:', error);
  }
}

// Get transaction status
const getMoonPayTransactionStatus = functions.https.onCall(async (data, context) => {
  try {
    const { transactionId } = data;
    
    if (!transactionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Transaction ID is required');
    }

    let userId = null;

    // Try to get user ID from Firebase Auth context
    if (context.auth) {
      userId = context.auth.uid;
      console.log('MoonPay: User authenticated via Firebase Auth for transaction status:', userId);
    } else {
      // If no Firebase Auth context, we can't proceed as we need to know which user's transaction to get
      console.log('MoonPay: No Firebase Auth context for transaction status lookup');
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to get transaction status');
    }

    // Get transaction from Firestore
    const transactionQuery = await admin.firestore()
      .collection('moonpay_transactions')
      .where('userId', '==', userId)
      .where('moonpayTransactionId', '==', transactionId)
      .limit(1)
      .get();

    if (transactionQuery.empty) {
      throw new functions.https.HttpsError('not-found', 'Transaction not found');
    }

    const transactionDoc = transactionQuery.docs[0];
    const transactionData = transactionDoc.data();

    return {
      id: transactionData.moonpayTransactionId,
      status: transactionData.status,
      amount: transactionData.amount,
      currency: transactionData.currency,
      createdAt: transactionData.createdAt,
      updatedAt: transactionData.updatedAt,
      failureReason: transactionData.failureReason
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get transaction status');
  }
});

// Get user's MoonPay transactions
const getUserMoonPayTransactions = functions.https.onCall(async (data, context) => {
  try {
    let userId = null;

    // Try to get user ID from Firebase Auth context
    if (context.auth) {
      userId = context.auth.uid;
      console.log('MoonPay: User authenticated via Firebase Auth for transactions:', userId);
    } else {
      // If no Firebase Auth context, we can't proceed as we need to know which user's transactions to get
      console.log('MoonPay: No Firebase Auth context for transactions lookup');
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to get transactions');
    }

    const { limit = 10 } = data;

    // Get user's transactions from Firestore
    const transactionsQuery = await admin.firestore()
      .collection('moonpay_transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const transactions = transactionsQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        moonpayTransactionId: data.moonpayTransactionId,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        walletAddress: data.walletAddress,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        failureReason: data.failureReason
      };
    });

    return { transactions };
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get transactions');
  }
});

module.exports = {
  createMoonPayURL,
  moonpayWebhook,
  getMoonPayTransactionStatus,
  getUserMoonPayTransactions
}; 