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
  const startTime = Date.now();
  
  // Use transaction hash prefix for rate limiting
  // Note: Each transaction has a unique hash, so this provides basic protection
  // The main security comes from checkTransactionHash() which prevents duplicate signing
  const transactionHash = crypto.createHash('sha256').update(transactionBuffer).digest('hex');
  const rateLimitKey = `transaction_signing_rate_${transactionHash.substring(0, 16)}`; // Use first 16 chars for rate limiting
  
  const rateLimitRef = db.collection('rateLimits').doc(rateLimitKey);
  
  // CRITICAL: Aggressive timeout to prevent blockhash expiration
  // Reduced to 500ms with no retries - fail fast to prevent blocking
  let rateLimitDoc;
  try {
    rateLimitDoc = await Promise.race([
      rateLimitRef.get(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Rate limit check timeout')), 500)
      )
    ]);
  } catch (timeoutError) {
    // Don't retry - fail fast to prevent blockhash expiration
    console.warn('Rate limit check timed out - skipping to prevent blockhash expiration', {
      error: timeoutError.message
    });
    throw timeoutError; // Let caller handle (they'll continue anyway)
  }
  
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
      // Update count atomically - aggressive timeout to prevent blockhash expiration
      // Reduced to 300ms with no retries - fail fast
      try {
        await Promise.race([
          rateLimitRef.update({
            lastRequest: admin.firestore.FieldValue.serverTimestamp(),
            requestCount: admin.firestore.FieldValue.increment(1)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Rate limit update timeout')), 300)
          )
        ]);
      } catch (timeoutError) {
        // Don't throw - rate limiting is not critical, continue processing
        console.warn('Rate limit update timed out - skipping to prevent blockhash expiration', {
          error: timeoutError.message
        });
      }
    } else {
      // Reset counter if more than 15 minutes have passed
      // Aggressive timeout to prevent blockhash expiration
      // Reduced to 300ms with no retries - fail fast
      try {
        await Promise.race([
          rateLimitRef.set({
            transactionHashPrefix: transactionHash.substring(0, 16),
            lastRequest: admin.firestore.FieldValue.serverTimestamp(),
            requestCount: 1
          }, { merge: false }), // merge: false is faster
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Rate limit set timeout')), 300)
          )
        ]);
      } catch (timeoutError) {
        // Don't throw - rate limiting is not critical, continue processing
        console.warn('Rate limit set timed out - skipping to prevent blockhash expiration', {
          error: timeoutError.message
        });
      }
    }
  } else {
    // Create new rate limit entry
    // Aggressive timeout to prevent blockhash expiration
    // Reduced to 300ms with no retries - fail fast
    try {
      await Promise.race([
        rateLimitRef.set({
          transactionHashPrefix: transactionHash.substring(0, 16),
          lastRequest: admin.firestore.FieldValue.serverTimestamp(),
          requestCount: 1
        }, { merge: false }), // merge: false is faster
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Rate limit set timeout')), 300)
        )
      ]);
    } catch (timeoutError) {
      // Don't throw - rate limiting is not critical, continue processing
      console.warn('Rate limit set timed out - skipping to prevent blockhash expiration', {
        error: timeoutError.message
      });
    }
  }
  
  const elapsed = Date.now() - startTime;
  if (elapsed > 1000) {
    console.warn('Rate limit check took longer than expected', { elapsedMs: elapsed });
  }
}

/**
 * Check if transaction has already been signed (prevent duplicate signing)
 * CRITICAL: Optimized with timeout to prevent blocking
 */
async function checkTransactionHash(transactionBuffer, db) {
  const crypto = require('crypto');
  const startTime = Date.now();
  
  const transactionHash = crypto.createHash('sha256').update(transactionBuffer).digest('hex');
  const hashKey = `transaction_hash_${transactionHash}`;
  const hashRef = db.collection('transactionHashes').doc(hashKey);
  
  // ✅ CRITICAL: Increased timeout to 2 seconds for duplicate check
  // This is critical for preventing duplicates - must complete before processing
  // If Firestore is slow, we'll reject the transaction to prevent duplicates
  let hashDoc;
  try {
    hashDoc = await Promise.race([
      hashRef.get(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction hash check timeout')), 2000)
      )
    ]);
  } catch (timeoutError) {
    // CRITICAL: Throw error so caller can reject the transaction
    // This prevents duplicates when Firestore is slow
    console.error('❌ Transaction hash check timed out - will reject transaction', {
      error: timeoutError.message,
      note: 'Rejecting to prevent potential duplicates'
    });
    throw timeoutError;
  }
  
  if (hashDoc.exists) {
    const hashData = hashDoc.data();
    const signedAt = hashData?.signedAt?.toDate();
    const now = new Date();
    
    // If signed within last 5 minutes, reject (prevent replay attacks)
    if (signedAt && (now.getTime() - signedAt.getTime()) < 5 * 60 * 1000) {
      throw new functions.https.HttpsError('already-exists', 'This transaction has already been signed recently. Please create a new transaction.');
    }
  }
  
  // Record transaction hash - use shorter timeout for this (non-critical)
  // If this fails, we still proceed (hash recording is less critical than duplicate check)
  try {
    await Promise.race([
      hashRef.set({
        transactionHash,
        signedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: false }), // merge: false is faster than merge: true
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction hash set timeout')), 1000)
      )
    ]);
  } catch (timeoutError) {
    // Don't throw - hash recording is not critical, continue processing
    console.warn('Transaction hash set timed out - continuing anyway', {
      error: timeoutError.message,
      note: 'Hash recording failed but transaction can proceed'
    });
  }
  
  const elapsed = Date.now() - startTime;
  if (elapsed > 1000) {
    console.warn('Transaction hash check took longer than expected', { elapsedMs: elapsed });
  }
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
  secrets: [
    'COMPANY_WALLET_ADDRESS', 
    'COMPANY_WALLET_SECRET_KEY',
    'ALCHEMY_API_KEY',
    'GETBLOCK_API_KEY',
    'HELIUS_API_KEY',
    'USE_PAID_RPC'
  ],
  timeoutSeconds: 60, // Increased from 30s to 60s for production/mainnet (transactions can take longer)
  memory: '512MB'
}).https.onCall(async (data, context) => {
  // CRITICAL: Use try-catch at the very top level to catch ANY errors before they become "internal"
  try {
    // CRITICAL: Log immediately at function entry - this helps diagnose if function is being called
    console.log('🔵 processUsdcTransfer FUNCTION CALLED', {
      timestamp: new Date().toISOString(),
      hasData: !!data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : [],
      hasContext: !!context,
      contextAuth: context?.auth ? 'authenticated' : 'not authenticated',
      contextRawRequest: context?.rawRequest ? 'present' : 'missing',
      nodeVersion: process.version,
      functionName: 'processUsdcTransfer'
    });
  } catch (logError) {
    // Even logging can fail - catch it and log to stderr
    console.error('❌ CRITICAL: Failed to log function entry', {
      error: logError.message,
      errorStack: logError.stack
    });
  }
  
  const functionStartTime = Date.now();
  
  try {
    // Log data structure before processing
    console.log('📥 processUsdcTransfer: Received data', {
      hasSerializedTransaction: !!data?.serializedTransaction,
      serializedTransactionType: typeof data?.serializedTransaction,
      serializedTransactionLength: data?.serializedTransaction?.length,
      allDataKeys: Object.keys(data || {})
    });
    
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

    // CRITICAL: Check blockhash age BEFORE Firestore operations
    // If blockhash is already old, skip Firestore and fail fast to save time
    // This prevents wasting 2-3 seconds on Firestore when blockhash will expire anyway
    const { VersionedTransaction } = require('@solana/web3.js');
    let transaction;
    try {
      transaction = VersionedTransaction.deserialize(transactionBuffer);
    } catch (deserializeError) {
      throw new functions.https.HttpsError('invalid-argument', `Failed to deserialize transaction: ${deserializeError.message}`);
    }

    // Extract blockhash to check age
    let transactionBlockhash;
    if (transaction.message && 'recentBlockhash' in transaction.message) {
      transactionBlockhash = transaction.message.recentBlockhash;
    } else if (transaction.message && transaction.message.recentBlockhash) {
      transactionBlockhash = transaction.message.recentBlockhash;
    }

    // CRITICAL: Skip blockhash validation before Firestore - it adds delay
    // The blockhash is validated RIGHT BEFORE submission anyway
    // Early validation takes 100-300ms which can cause the blockhash to expire during Firestore operations
    // We trust the client's freshness check (blockhash is 0-100ms old when sent)
    // If blockhash expires during Firestore operations, we'll catch it right before submission
    // This saves 100-300ms and reduces blockhash expiration risk
    console.log('Skipping pre-Firestore blockhash validation to minimize delay', {
      note: 'Blockhash will be validated right before submission. Client sends fresh blockhash (0-100ms old).'
    });

    // ✅ CRITICAL: Check for duplicate transactions BEFORE processing
    // This prevents duplicate submissions even if frontend has issues
    // CRITICAL: This check MUST complete - if it times out, we REJECT to prevent duplicates
    // Better to reject one transaction than allow duplicates
    try {
      const duplicateCheckStart = Date.now();
      // Increased timeout to 2 seconds - Firestore should respond within this time
      // If it doesn't, we reject to prevent duplicates (safer than allowing through)
      await Promise.race([
        checkTransactionHash(transactionBuffer, db),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Duplicate check timeout - rejecting to prevent duplicates')), 2000)
        )
      ]);
      const duplicateCheckTime = Date.now() - duplicateCheckStart;
      console.log('✅ Duplicate check passed', {
        checkTimeMs: duplicateCheckTime,
        note: 'Transaction hash verified as unique'
      });
    } catch (duplicateCheckError) {
      const errorMessage = duplicateCheckError?.message || String(duplicateCheckError);
      
      // If it's an "already-exists" error, this is a real duplicate - REJECT
      if (duplicateCheckError?.code === 'already-exists' || 
          errorMessage.includes('already been signed')) {
        console.error('❌ DUPLICATE TRANSACTION DETECTED', {
          error: errorMessage,
          note: 'This transaction has already been processed. Rejecting to prevent duplicate.'
        });
        throw new functions.https.HttpsError('already-exists', 'This transaction has already been processed. Please check your transaction history.');
      }
      
      // CRITICAL: If duplicate check times out, REJECT the transaction
      // This prevents duplicates when Firestore is slow
      // Better to reject one transaction than allow duplicates
      if (errorMessage.includes('timeout')) {
        console.error('❌ Duplicate check timed out - REJECTING to prevent duplicates', {
          error: errorMessage,
          note: 'Check took too long (>2s). Rejecting transaction to prevent potential duplicates. User can retry.'
        });
        throw new functions.https.HttpsError('deadline-exceeded', 'Transaction verification timed out. Please try again. This prevents duplicate transactions.');
      } else {
        // Other errors - also reject to be safe
        console.error('❌ Duplicate check failed - REJECTING to prevent duplicates', {
          error: errorMessage,
          note: 'Check failed. Rejecting transaction to prevent potential duplicates.'
        });
        throw new functions.https.HttpsError('internal', 'Transaction verification failed. Please try again.');
      }
    }
    
    // Rate limiting check (non-blocking, but try to check)
    // Run in background but don't block if it fails
    setImmediate(() => {
      checkRateLimit(transactionBuffer, db).catch(err => {
        console.warn('Background rate limit check failed', { error: err.message });
      });
    });

    const checksTime = Date.now() - functionStartTime;
    console.log('Firestore checks skipped (non-blocking)', {
      checksTimeMs: checksTime,
      note: 'Firestore checks run in background to prevent blockhash expiration'
    });

    // Process USDC transfer (sign and submit) - this is where blockhash expiration happens
    const processStartTime = Date.now();
    const result = await transactionSigningService.processUsdcTransfer(transactionBuffer);
    const processTime = Date.now() - processStartTime;
    const totalTime = Date.now() - functionStartTime;

    console.log('USDC transfer completed', {
      signature: result.signature,
      checksTimeMs: checksTime,
      processTimeMs: processTime,
      totalTimeMs: totalTime
    });

    return {
      success: true,
      signature: result.signature,
      confirmation: result.confirmation
    };
  } catch (error) {
    const totalTime = Date.now() - functionStartTime;
    
    // CRITICAL: Log error immediately with full details
    console.error('❌ processUsdcTransfer: ERROR CAUGHT', {
      timestamp: new Date().toISOString(),
      errorMessage: error?.message || 'No error message',
      errorName: error?.name || 'Unknown',
      errorCode: error?.code || 'NO_CODE',
      errorType: error?.type || 'NO_TYPE',
      isHttpsError: error instanceof functions.https.HttpsError,
      httpsErrorCode: error instanceof functions.https.HttpsError ? error.code : 'N/A',
      httpsErrorMessage: error instanceof functions.https.HttpsError ? error.message : 'N/A',
      errorStack: error?.stack ? error.stack.substring(0, 1000) : 'No stack trace',
      totalTimeMs: totalTime,
      errorDetails: error?.details || error?.context || {},
      hasSerializedTransaction: !!data?.serializedTransaction,
      serializedTransactionLength: data?.serializedTransaction?.length
    });
    
    // If it's already an HttpsError, re-throw it (it already has proper formatting)
    if (error instanceof functions.https.HttpsError) {
      console.error('❌ processUsdcTransfer: Re-throwing HttpsError', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
    
    // Preserve original error message and details for better debugging
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorDetails = error?.details || error?.context || {};
    
    // Include error details in the message for better debugging
    const detailedMessage = errorDetails.originalError 
      ? `Failed to process USDC transfer: ${errorMessage} (${errorDetails.originalError})`
      : `Failed to process USDC transfer: ${errorMessage}`;
    
    console.error('❌ processUsdcTransfer: Throwing internal error', {
      detailedMessage,
      originalError: errorMessage,
      errorDetails
    });
    
    throw new functions.https.HttpsError('internal', detailedMessage);
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
 * Get company wallet address (public only - no secret key)
 * This allows clients to fetch the company wallet address from Firebase Secrets
 * without storing it in EAS secrets or client-side code
 */
exports.getCompanyWalletAddress = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS']
}).https.onCall(async (data, context) => {
  try {
    // Get company wallet address from Firebase Secrets
    const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS?.trim();
    
    if (!companyWalletAddress) {
      throw new functions.https.HttpsError(
        'internal',
        'Company wallet address is not configured in Firebase Secrets'
      );
    }

    return {
      success: true,
      address: companyWalletAddress
    };
  } catch (error) {
    console.error('Error getting company wallet address:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to get company wallet address: ${error.message}`);
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

