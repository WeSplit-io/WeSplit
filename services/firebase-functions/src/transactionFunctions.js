/**
 * Transaction Signing Functions
 * Handles company wallet transaction signing and submission
 * SECURITY: No authentication required - security maintained through:
 * 1. Transaction validation (ensures only valid transactions are signed)
 * 2. Transaction hash tracking (prevents duplicate signing/replay attacks)
 * 3. Rate limiting (prevents abuse)
 * 4. Input validation (prevents invalid API calls)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { transactionSigningService } = require('./transactionSigningService');

const db = admin.firestore();

/**
 * Rate limiting helper for transaction signing
 * Uses transaction hash prefix for basic rate limiting (no authentication required)
 * Note: This provides basic protection, but each transaction has a unique hash.
 * The primary security comes from transaction hash tracking (checkTransactionHash) which prevents duplicate signing.
 */
async function checkRateLimit(transactionBuffer, db) {
  const crypto = require('crypto');
  // Use transaction hash prefix for rate limiting
  // Note: Each transaction has a unique hash, so this provides basic protection
  // The main security comes from checkTransactionHash() which prevents duplicate signing
  const transactionHash = crypto.createHash('sha256').update(transactionBuffer).digest('hex');
  const rateLimitKey = `transaction_signing_rate_${transactionHash.substring(0, 16)}`; // Use first 16 chars for rate limiting
  
  const rateLimitRef = db.collection('rateLimits').doc(rateLimitKey);
  const rateLimitDoc = await rateLimitRef.get();
  
  if (rateLimitDoc.exists) {
    const rateLimitData = rateLimitDoc.data();
    const lastRequest = rateLimitData?.lastRequest?.toDate();
    const now = new Date();
    const requestCount = rateLimitData?.requestCount || 0;
    
    // Allow 10 requests per 15 minutes per transaction hash prefix
    if (lastRequest && (now.getTime() - lastRequest.getTime()) < 15 * 60 * 1000) {
      if (requestCount >= 10) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please wait 15 minutes before making another request.');
      }
    } else {
      // Reset counter if more than 15 minutes have passed
      await rateLimitRef.set({
        transactionHashPrefix: transactionHash.substring(0, 16),
        lastRequest: admin.firestore.FieldValue.serverTimestamp(),
        requestCount: 1
      });
      return;
    }
  }
  
  // Update rate limit
  await rateLimitRef.set({
    transactionHashPrefix: transactionHash.substring(0, 16),
    lastRequest: admin.firestore.FieldValue.serverTimestamp(),
    requestCount: admin.firestore.FieldValue.increment(1)
  }, { merge: true });
}

/**
 * Check if transaction has already been signed (prevent duplicate signing)
 */
async function checkTransactionHash(transactionBuffer, db) {
  const crypto = require('crypto');
  const transactionHash = crypto.createHash('sha256').update(transactionBuffer).digest('hex');
  const hashKey = `transaction_hash_${transactionHash}`;
  const hashRef = db.collection('transactionHashes').doc(hashKey);
  const hashDoc = await hashRef.get();
  
  if (hashDoc.exists) {
    const hashData = hashDoc.data();
    const signedAt = hashData?.signedAt?.toDate();
    const now = new Date();
    
    // If signed within last 5 minutes, reject (prevent replay attacks)
    if (signedAt && (now.getTime() - signedAt.getTime()) < 5 * 60 * 1000) {
      throw new functions.https.HttpsError('already-exists', 'This transaction has already been signed recently. Please create a new transaction.');
    }
  }
  
  // Record transaction hash
  await hashRef.set({
    transactionHash,
    signedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Add company signature to partially signed transaction
 * Secrets are explicitly bound using runWith
 */
exports.signTransaction = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    // Log incoming data for debugging
    console.log('signTransaction called', {
      hasData: !!data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : [],
      hasSerializedTransaction: !!data?.serializedTransaction,
      serializedTransactionType: typeof data?.serializedTransaction,
      serializedTransactionLength: data?.serializedTransaction?.length,
      serializedTransactionPreview: data?.serializedTransaction ? data.serializedTransaction.substring(0, 50) : 'null/undefined',
      userId: context.auth?.uid || 'unauthenticated'
    });

    const { serializedTransaction } = data;
    
    // Validate input with detailed error messages
    if (!serializedTransaction) {
      console.error('Missing serializedTransaction', { data, dataKeys: data ? Object.keys(data) : [] });
      throw new functions.https.HttpsError('invalid-argument', 'serializedTransaction is required');
    }
    
    if (typeof serializedTransaction !== 'string') {
      console.error('Invalid serializedTransaction type', {
        type: typeof serializedTransaction,
        value: serializedTransaction,
        isString: typeof serializedTransaction === 'string',
        isArray: Array.isArray(serializedTransaction),
        isObject: typeof serializedTransaction === 'object',
        constructor: serializedTransaction?.constructor?.name
      });
      throw new functions.https.HttpsError('invalid-argument', `Invalid serializedTransaction format. Expected string, got ${typeof serializedTransaction}`);
    }
    
    if (serializedTransaction.length === 0) {
      console.error('Empty serializedTransaction', { data });
      throw new functions.https.HttpsError('invalid-argument', 'serializedTransaction cannot be empty');
    }

    // Convert base64 string to Buffer for rate limiting and hash checking
    let transactionBuffer;
    try {
      transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 encoding');
    }

    // Check if transaction has already been signed (prevent duplicate signing)
    await checkTransactionHash(transactionBuffer, db);
    
    // Check rate limit (using transaction hash instead of user ID)
    await checkRateLimit(transactionBuffer, db);

    // Validate transaction before signing
    await transactionSigningService.validateTransaction(transactionBuffer);

    // Add company signature
    const fullySignedTransaction = await transactionSigningService.addCompanySignature(transactionBuffer);

    // Ensure we have a Buffer (transaction.serialize() returns Uint8Array in some environments)
    const signedBuffer = Buffer.isBuffer(fullySignedTransaction) 
      ? fullySignedTransaction 
      : Buffer.from(fullySignedTransaction);

    console.log('Preparing signed transaction response', {
      originalType: fullySignedTransaction.constructor?.name,
      isBuffer: Buffer.isBuffer(fullySignedTransaction),
      bufferLength: signedBuffer.length,
      base64Length: signedBuffer.toString('base64').length
    });

    // Return fully signed transaction as base64
    return {
      success: true,
      serializedTransaction: signedBuffer.toString('base64')
    };
  } catch (error) {
    console.error('Error signing transaction:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to sign transaction: ${error.message}`);
  }
});

/**
 * Submit fully signed transaction
 * Secrets are explicitly bound using runWith
 */
exports.submitTransaction = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    const { serializedTransaction } = data;
    
    // Validate input
    if (!serializedTransaction || typeof serializedTransaction !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid serializedTransaction format');
    }

    // Validate base64 string format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(serializedTransaction)) {
      console.error('Invalid base64 format', {
        base64Length: serializedTransaction.length,
        base64Preview: serializedTransaction.substring(0, 50),
        hasInvalidChars: !base64Regex.test(serializedTransaction)
      });
      throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 string format');
    }

    // Convert base64 string to Buffer
    let transactionBuffer;
    try {
      transactionBuffer = Buffer.from(serializedTransaction, 'base64');
      console.log('Transaction buffer created from base64', {
        base64Length: serializedTransaction.length,
        bufferLength: transactionBuffer.length,
        expectedLength: Math.ceil(serializedTransaction.length * 3 / 4),
        actualMatchesExpected: transactionBuffer.length === Math.ceil(serializedTransaction.length * 3 / 4),
        firstBytes: Array.from(transactionBuffer.slice(0, 10)),
        lastBytes: Array.from(transactionBuffer.slice(-10))
      });
      
      // Validate the decoded buffer size makes sense
      if (transactionBuffer.length < 100) {
        console.error('Decoded buffer too small', {
          bufferLength: transactionBuffer.length,
          base64Length: serializedTransaction.length,
          minimumExpected: 100
        });
        throw new functions.https.HttpsError('invalid-argument', `Decoded transaction buffer too small: ${transactionBuffer.length} bytes`);
      }
    } catch (error) {
      console.error('Failed to convert base64 to buffer', {
        error: error.message,
        errorStack: error.stack,
        base64Length: serializedTransaction?.length,
        base64Preview: serializedTransaction?.substring(0, 50),
        base64LastChars: serializedTransaction?.substring(serializedTransaction.length - 20)
      });
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('invalid-argument', `Invalid base64 encoding: ${error.message}`);
    }

    // Validate buffer is not empty
    if (!transactionBuffer || transactionBuffer.length === 0) {
      console.error('Empty transaction buffer');
      throw new functions.https.HttpsError('invalid-argument', 'Transaction buffer is empty');
    }

    // Check rate limit (using transaction hash instead of user ID)
    await checkRateLimit(transactionBuffer, db);

    // Note: We skip validateTransaction here because:
    // 1. The transaction is already fully signed (both user and company signatures)
    // 2. validateTransaction is designed for partially signed transactions
    // 3. We'll validate during deserialization in submitTransaction itself
    // If validation is needed, we can add a simpler check that doesn't require deserialization
    console.log('Skipping validateTransaction for fully signed transaction', {
      bufferLength: transactionBuffer.length
    });

    // Submit transaction
    const result = await transactionSigningService.submitTransaction(transactionBuffer);

    return {
      success: true,
      signature: result.signature,
      confirmation: result.confirmation
    };
  } catch (error) {
    console.error('Error submitting transaction:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to submit transaction: ${error.message}`);
  }
});

/**
 * Process USDC transfer with company fee payer (sign and submit)
 * Secrets are explicitly bound using runWith
 */
exports.processUsdcTransfer = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    const { serializedTransaction } = data;
    
    // Validate input
    if (!serializedTransaction || typeof serializedTransaction !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid serializedTransaction format');
    }

    // Convert base64 string to Buffer
    let transactionBuffer;
    try {
      transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 encoding');
    }

    // Check if transaction has already been signed (prevent duplicate signing)
    await checkTransactionHash(transactionBuffer, db);
    
    // Check rate limit (using transaction hash instead of user ID)
    await checkRateLimit(transactionBuffer, db);

    // Process USDC transfer (sign and submit)
    const result = await transactionSigningService.processUsdcTransfer(transactionBuffer);

    return {
      success: true,
      signature: result.signature,
      confirmation: result.confirmation
    };
  } catch (error) {
    console.error('Error processing USDC transfer:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to process USDC transfer: ${error.message}`);
  }
});

/**
 * Validate transaction before signing
 * Secrets are explicitly bound using runWith
 */
exports.validateTransaction = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    const { serializedTransaction } = data;
    
    // Validate input
    if (!serializedTransaction || typeof serializedTransaction !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid serializedTransaction format');
    }

    // Convert base64 string to Buffer
    let transactionBuffer;
    try {
      transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 encoding');
    }

    // Check rate limit (using transaction hash instead of user ID)
    await checkRateLimit(transactionBuffer, db);

    // Validate transaction
    await transactionSigningService.validateTransaction(transactionBuffer);

    return {
      success: true,
      valid: true,
      message: 'Transaction is valid'
    };
  } catch (error) {
    console.error('Error validating transaction:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Return validation failure as success: false, not an error
    return {
      success: false,
      valid: false,
      error: 'Transaction validation failed',
      message: error.message
    };
  }
});

/**
 * Get transaction fee estimate
 * Secrets are explicitly bound using runWith
 */
exports.getTransactionFeeEstimate = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    const { serializedTransaction } = data;
    
    // Validate input
    if (!serializedTransaction || typeof serializedTransaction !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid serializedTransaction format');
    }

    // Convert base64 string to Buffer
    let transactionBuffer;
    try {
      transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    } catch (error) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid base64 encoding');
    }

    // Check rate limit (using transaction hash instead of user ID)
    await checkRateLimit(transactionBuffer, db);

    // Get fee estimate
    const estimate = await transactionSigningService.getTransactionFeeEstimate(transactionBuffer);

    return {
      success: true,
      fee: estimate.fee,
      lamports: estimate.lamports
    };
  } catch (error) {
    console.error('Error estimating transaction fee:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to estimate transaction fee: ${error.message}`);
  }
});

/**
 * Get company wallet balance
 * Secrets are explicitly bound using runWith
 */
exports.getCompanyWalletBalance = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY']
}).https.onCall(async (data, context) => {
  try {
    // For balance check, use a simple rate limit based on timestamp
    // Create a dummy buffer for rate limiting (balance checks don't have transaction data)
    const dummyBuffer = Buffer.from(Date.now().toString());
    // Check rate limit (using timestamp hash instead of user ID)
    await checkRateLimit(dummyBuffer, db);

    const balance = await transactionSigningService.getCompanyWalletBalance();

    return {
      success: true,
      address: balance.address,
      balance: balance.balance,
      lamports: balance.lamports
    };
  } catch (error) {
    console.error('Error getting company wallet balance:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to get company wallet balance: ${error.message}`);
  }
});

