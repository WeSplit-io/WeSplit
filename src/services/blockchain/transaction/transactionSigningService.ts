/**
 * Transaction Signing Service for Client-Side
 * Calls Firebase Cloud Functions to sign transactions with company wallet
 */

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import Constants from 'expo-constants';
import { logger } from '../../analytics/loggingService';

/**
 * Manual base64 encoding for React Native compatibility
 * Used as fallback when Buffer and btoa are not available
 */
function manualBase64Encode(bytes: Uint8Array): string {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < bytes.length) {
    const a = bytes[i++];
    const b = i < bytes.length ? bytes[i++] : 0;
    const c = i < bytes.length ? bytes[i++] : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += base64Chars.charAt((bitmap >> 18) & 63);
    result += base64Chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < bytes.length ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < bytes.length ? base64Chars.charAt(bitmap & 63) : '=';
  }
  
  return result;
}

// Get environment variables from Expo Constants
const getEnvVar = (key: string): string => {
  // Try to get from process.env first (for development)
  if (process.env[key]) {
    return process.env[key]!;
  }
  
  // Try to get from process.env with EXPO_PUBLIC_ prefix
  if (process.env[`EXPO_PUBLIC_${key}`]) {
    return process.env[`EXPO_PUBLIC_${key}`]!;
  }
  
  // Try to get from Expo Constants
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Try to get from Expo Constants with EXPO_PUBLIC_ prefix
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  }
  
  // Try to get from Constants.manifest (older Expo versions)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return (Constants.manifest as any).extra[key];
  }
  
  // Try to get from Constants.manifest with EXPO_PUBLIC_ prefix
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  }
  
  return '';
};

// Get Firebase configuration values
const apiKey = getEnvVar('FIREBASE_API_KEY');
const authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
const projectId = getEnvVar('FIREBASE_PROJECT_ID') || "wesplit-35186";
const storageBucket = getEnvVar('FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
const messagingSenderId = getEnvVar('FIREBASE_MESSAGING_SENDER_ID');
const appId = getEnvVar('FIREBASE_APP_ID');

// Firebase configuration
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

// Initialize Firebase app (same pattern as other working services)
// IMPORTANT: Use the same Firebase app instance as the main app to share authentication state
let firebaseApp: any = null;
const getFirebaseApp = () => {
  if (!firebaseApp) {
    try {
      // Try to get existing Firebase app first (to share authentication state)
      const { getApp } = require('firebase/app');
      try {
        firebaseApp = getApp();
        logger.info('Using existing Firebase app instance for transaction signing', { projectId }, 'TransactionSigningService');
      } catch (getAppError) {
        // If no existing app, create a new one
      firebaseApp = initializeApp(firebaseConfig);
      logger.info('Firebase app initialized for transaction signing', { projectId }, 'TransactionSigningService');
      }
    } catch (error: any) {
      // If app already exists, try to get it
      if (error.code === 'app/duplicate-app') {
        const { getApp } = require('firebase/app');
        try {
          firebaseApp = getApp();
          logger.info('Using existing Firebase app instance', null, 'TransactionSigningService');
        } catch (getAppError) {
          logger.error('Failed to get existing Firebase app', getAppError, 'TransactionSigningService');
          throw new Error('Firebase app initialization failed');
        }
      } else {
        logger.error('Failed to initialize Firebase app', error, 'TransactionSigningService');
        throw new Error('Firebase app initialization failed');
      }
    }
  }
  return firebaseApp;
};

// Initialize Firebase Functions
// IMPORTANT: Lazy initialization to ensure Firebase app is ready
// In development, connect to local emulator for faster testing

// Cache for emulator connection status
let emulatorConnectionAttempted = false;
let emulatorConnected = false;

// Singleton Firebase Functions instance to ensure emulator connection happens once
let firebaseFunctionsInstance: any = null;

const getFirebaseFunctions = () => {
  // Return cached instance if already initialized
  if (firebaseFunctionsInstance) {
    return firebaseFunctionsInstance;
  }

  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app, 'us-central1');
    
    // Connect to emulator in development mode
    // Set EXPO_PUBLIC_USE_PROD_FUNCTIONS=true to force production even in dev
    // Use getEnvVar to properly read from Expo Constants
    const useProdFunctionsEnv = getEnvVar('EXPO_PUBLIC_USE_PROD_FUNCTIONS');
    const useProdFunctions = useProdFunctionsEnv === 'true' || useProdFunctionsEnv === '1';
    
    // For iOS Simulator/Android Emulator: use localhost
    // For physical device: use your computer's local IP (e.g., 192.168.1.100)
    // You can set EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST to override
    const emulatorHost = getEnvVar('EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST') || 'localhost';
    const emulatorPort = parseInt(getEnvVar('EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT') || '5001');
    
    // CRITICAL: connectFunctionsEmulator MUST be called before any httpsCallable calls
    if (__DEV__ && !useProdFunctions) {
      try {
        connectFunctionsEmulator(functions, emulatorHost, emulatorPort);
        emulatorConnected = true;
        logger.info('🔧 Connected to Firebase Functions Emulator', {
          host: emulatorHost,
          port: emulatorPort,
          isDev: __DEV__,
          useProdFunctions: useProdFunctions,
          envVar: useProdFunctionsEnv,
          emulatorUrl: `http://${emulatorHost}:${emulatorPort}`,
          note: 'Emulator connection established BEFORE any function calls'
        }, 'TransactionSigningService');
      } catch (error: any) {
        // Already connected or connection failed - ignore
        if (error.code !== 'functions/already-initialized') {
          logger.warn('⚠️ Failed to connect to Functions emulator', {
            error: error.message,
            errorCode: error.code,
            errorName: error.name,
            host: emulatorHost,
            port: emulatorPort,
            note: 'Using production Functions - check if emulator is running on port 5001'
          }, 'TransactionSigningService');
          emulatorConnected = false;
        } else {
          emulatorConnected = true;
          logger.info('✅ Functions emulator already connected', {
            host: emulatorHost,
            port: emulatorPort,
            emulatorUrl: `http://${emulatorHost}:${emulatorPort}`
          }, 'TransactionSigningService');
        }
      }
    } else {
      emulatorConnected = false;
      logger.info('🌐 Using production Firebase Functions', {
        isDev: __DEV__,
        useProdFunctions: useProdFunctions,
        envVar: useProdFunctionsEnv,
        reason: !__DEV__ ? 'Not in dev mode' : useProdFunctions ? 'EXPO_PUBLIC_USE_PROD_FUNCTIONS is true' : 'Unknown'
      }, 'TransactionSigningService');
    }
    
    // Cache the instance
    firebaseFunctionsInstance = functions;
    return functions;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Functions', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    }, 'TransactionSigningService');
    throw new Error('Firebase app not initialized');
  }
};

// Note: Authentication is no longer required for transaction signing
// Security is maintained through:
// 1. IP-based rate limiting (10 requests per 15 minutes per IP)
// 2. Transaction hash tracking (prevents duplicate signing)
// 3. Transaction validation (ensures only valid transactions are signed)

// Transaction signing functions
// IMPORTANT: Create callable functions lazily to ensure Firebase is initialized
// httpsCallable returns a function that can be called with data
const getSignTransactionFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'signTransaction', {
    timeout: 60000 // 60 seconds timeout
  });
};

const getSubmitTransactionFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'submitTransaction', {
    timeout: 60000 // 60 seconds timeout
  });
};

const getProcessUsdcTransferFunction = () => {
  try {
    // Ensure emulator connection is attempted before creating function
    const functions = getFirebaseFunctions();
    
    // Log connection status for debugging
    if (!emulatorConnectionAttempted) {
      emulatorConnectionAttempted = true;
      logger.info('🔵 Creating processUsdcTransfer callable function', {
        hasFunctions: !!functions,
        functionName: 'processUsdcTransfer',
        timeout: 90000,
        isDev: __DEV__,
        useProdFunctions: getEnvVar('EXPO_PUBLIC_USE_PROD_FUNCTIONS') === 'true' || getEnvVar('EXPO_PUBLIC_USE_PROD_FUNCTIONS') === '1',
        emulatorHost: getEnvVar('EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST') || 'localhost',
        emulatorPort: getEnvVar('EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT') || '5001',
        emulatorConnected: emulatorConnected
      }, 'TransactionSigningService');
    }
    
    // Production/mainnet needs longer timeout - transactions can take 30-60 seconds
    const isProduction = !__DEV__;
    // Check network from environment variable (synchronous, no await needed)
    const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK') || getEnvVar('EXPO_PUBLIC_DEV_NETWORK') || '';
    const forceMainnet = getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
    const isMainnet = networkEnv.toLowerCase() === 'mainnet' || 
                      forceMainnet ||
                      (isProduction && !networkEnv); // Default to mainnet in production if not set
    const timeout = (isProduction && isMainnet) ? 120000 : 90000; // 120s for production mainnet, 90s otherwise
    
    const callableFunction = httpsCallable(functions, 'processUsdcTransfer', {
      timeout: timeout // Increased timeout for production/mainnet
    });
    
    logger.info('✅ processUsdcTransfer callable function created', {
      functionType: typeof callableFunction,
      isFunction: typeof callableFunction === 'function',
      emulatorConnected: emulatorConnected
    }, 'TransactionSigningService');
    
    return callableFunction;
  } catch (error) {
    logger.error('❌ Failed to create processUsdcTransfer callable function', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    }, 'TransactionSigningService');
    throw error;
  }
};

const getValidateTransactionFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'validateTransaction', {
    timeout: 30000 // 30 seconds timeout
  });
};

const getTransactionFeeEstimateFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'getTransactionFeeEstimate', {
    timeout: 30000 // 30 seconds timeout
  });
};

const getCompanyWalletBalanceFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'getCompanyWalletBalance', {
    timeout: 30000 // 30 seconds timeout
  });
};

const getCompanyWalletAddressFunction = () => {
  return httpsCallable(getFirebaseFunctions(), 'getCompanyWalletAddress', {
    timeout: 10000 // 10 seconds timeout (simple call)
  });
};

/**
 * Add company signature to partially signed transaction
 */
export async function signTransaction(serializedTransaction: Uint8Array): Promise<Uint8Array> {
  try {
    logger.info('Signing transaction with company wallet', {
      transactionSize: serializedTransaction.length,
      transactionType: typeof serializedTransaction,
      isUint8Array: serializedTransaction instanceof Uint8Array
    }, 'TransactionSigningService');

    // Ensure we have a proper Uint8Array
    let txArray: Uint8Array;
    if (serializedTransaction instanceof Uint8Array) {
      txArray = serializedTransaction;
    } else if (Array.isArray(serializedTransaction)) {
      txArray = new Uint8Array(serializedTransaction);
    } else if (serializedTransaction instanceof ArrayBuffer) {
      txArray = new Uint8Array(serializedTransaction);
    } else {
      throw new Error(`Invalid transaction type: ${typeof serializedTransaction}. Expected Uint8Array.`);
    }

    // Convert Uint8Array to base64 string
    // React Native compatible base64 encoding
    let base64Transaction: string;
    try {
      logger.info('Starting base64 conversion', {
        txArrayLength: txArray.length,
        txArrayType: typeof txArray,
        isUint8Array: txArray instanceof Uint8Array,
        hasBuffer: typeof Buffer !== 'undefined',
        hasBtoa: typeof btoa !== 'undefined',
        firstBytes: Array.from(txArray.slice(0, 5))
      }, 'TransactionSigningService');

      // Try using Buffer if available (Node.js environment)
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        try {
          logger.info('Attempting Buffer conversion', {
            txArrayLength: txArray.length
          }, 'TransactionSigningService');
          
          const buffer = Buffer.from(txArray);
          base64Transaction = buffer.toString('base64');
          
          logger.info('Buffer conversion successful', {
            bufferLength: buffer.length,
            base64Length: base64Transaction.length,
            base64Type: typeof base64Transaction,
            base64Preview: base64Transaction.substring(0, 20)
          }, 'TransactionSigningService');
        } catch (bufferError) {
          logger.warn('Buffer conversion failed, trying btoa', {
            error: bufferError instanceof Error ? bufferError.message : String(bufferError),
            errorStack: bufferError instanceof Error ? bufferError.stack : undefined
          }, 'TransactionSigningService');
          // Fall through to btoa
          throw bufferError;
        }
      }
      
      // Use btoa for React Native if Buffer failed or is not available
      if (!base64Transaction && typeof btoa !== 'undefined') {
        try {
          logger.info('Attempting btoa conversion', {
            txArrayLength: txArray.length
          }, 'TransactionSigningService');
          
          // IMPORTANT: btoa expects a binary string, not a Uint8Array directly
          // We need to convert each byte to a character
          // For large arrays, we need to process in chunks to avoid stack overflow
          let binary = '';
          const chunkSize = 8192; // Process in chunks to avoid memory issues
          
          for (let i = 0; i < txArray.length; i += chunkSize) {
            const chunk = txArray.slice(i, Math.min(i + chunkSize, txArray.length));
            binary += Array.from(chunk, byte => String.fromCharCode(byte)).join('');
          }
          
          if (binary.length === 0 && txArray.length > 0) {
            throw new Error('Binary string conversion failed - empty result');
          }
          
          logger.info('Binary string created', {
            binaryLength: binary.length,
            txArrayLength: txArray.length
          }, 'TransactionSigningService');
          
          base64Transaction = btoa(binary);
          
          logger.info('btoa conversion successful', {
            binaryLength: binary.length,
            base64Length: base64Transaction.length,
            base64Type: typeof base64Transaction,
            base64Preview: base64Transaction.substring(0, 20)
          }, 'TransactionSigningService');
        } catch (btoaError) {
          logger.error('btoa conversion failed', {
            error: btoaError instanceof Error ? btoaError.message : String(btoaError),
            errorStack: btoaError instanceof Error ? btoaError.stack : undefined,
            txArrayLength: txArray.length
          }, 'TransactionSigningService');
          throw btoaError;
        }
      }
      
      // Fallback: manual base64 encoding (should rarely be needed)
      if (!base64Transaction) {
        logger.warn('Neither Buffer nor btoa available, using manual base64 encoding', {
          txArrayLength: txArray.length
        }, 'TransactionSigningService');
        
        base64Transaction = manualBase64Encode(txArray);
        
        logger.info('Manual base64 encoding successful', {
          base64Length: base64Transaction.length,
          base64Type: typeof base64Transaction,
          base64Preview: base64Transaction.substring(0, 20)
        }, 'TransactionSigningService');
      }

      // Validate the result
      if (!base64Transaction || typeof base64Transaction !== 'string') {
        throw new Error(`Failed to convert transaction to base64 string. Got type: ${typeof base64Transaction}`);
      }

      // Ensure it's a valid base64 string (non-empty)
      if (base64Transaction.length === 0) {
        throw new Error('Base64 conversion resulted in empty string');
      }
    } catch (conversionError) {
      logger.error('Base64 conversion failed', {
        error: conversionError,
        errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
        txArrayLength: txArray.length,
        hasBuffer: typeof Buffer !== 'undefined',
        hasBtoa: typeof btoa !== 'undefined'
      }, 'TransactionSigningService');
      throw new Error(`Failed to convert transaction to base64: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }

    logger.info('Transaction converted to base64', {
      base64Length: base64Transaction.length,
      base64Type: typeof base64Transaction,
      base64Preview: base64Transaction.substring(0, 20) + '...',
      isEmpty: base64Transaction.length === 0
    }, 'TransactionSigningService');

    // Validate base64 string before sending
    if (typeof base64Transaction !== 'string') {
      logger.error('Invalid base64 type', {
        base64Type: typeof base64Transaction,
        base64Value: base64Transaction,
        txArrayLength: txArray.length
      }, 'TransactionSigningService');
      throw new Error(`Invalid base64 type: ${typeof base64Transaction}. Expected string.`);
    }

    if (base64Transaction.length === 0) {
      logger.error('Empty base64 string', {
        txArrayLength: txArray.length,
        txArrayType: typeof txArray,
        hasBuffer: typeof Buffer !== 'undefined',
        hasBtoa: typeof btoa !== 'undefined'
      }, 'TransactionSigningService');
      throw new Error('Base64 conversion resulted in empty string');
    }

    // Call Firebase Function with validated string
    logger.info('Calling Firebase Function signTransaction', {
      base64Length: base64Transaction.length,
      base64Type: typeof base64Transaction,
      base64FirstChars: base64Transaction.substring(0, 50)
    }, 'TransactionSigningService');

    // Validate base64 string one more time before sending
    if (!base64Transaction || typeof base64Transaction !== 'string' || base64Transaction.length === 0) {
      logger.error('Invalid base64 string before Firebase call', {
        base64Transaction: base64Transaction ? base64Transaction.substring(0, 50) : 'null/undefined',
        base64Type: typeof base64Transaction,
        base64Length: base64Transaction?.length || 0,
        txArrayLength: txArray.length
      }, 'TransactionSigningService');
      throw new Error(`Invalid base64 string: ${typeof base64Transaction}, length: ${base64Transaction?.length || 0}`);
    }

    let result;
    try {
      logger.info('Preparing Firebase Function call', {
        base64Length: base64Transaction.length,
        base64Type: typeof base64Transaction,
        base64FirstChars: base64Transaction.substring(0, 50),
        isString: typeof base64Transaction === 'string',
        isEmpty: base64Transaction.length === 0
      }, 'TransactionSigningService');

      // Ensure base64Transaction is a valid string (not empty, not undefined)
      if (!base64Transaction || base64Transaction.length === 0) {
        logger.error('Empty or invalid base64Transaction', {
          base64Transaction: base64Transaction,
          base64Type: typeof base64Transaction,
          base64Length: base64Transaction?.length || 0
        }, 'TransactionSigningService');
        throw new Error('base64Transaction is empty or invalid');
      }

      // Prepare the data object - Firebase Functions expect a plain object
      // IMPORTANT: The data must be a plain object with serializable values
      const callData = { 
        serializedTransaction: base64Transaction 
      };
      
      logger.info('Calling Firebase Function with data', {
        dataType: typeof callData,
        dataKeys: Object.keys(callData),
        serializedTransactionType: typeof callData.serializedTransaction,
        serializedTransactionLength: callData.serializedTransaction.length,
        serializedTransactionPreview: callData.serializedTransaction.substring(0, 50),
        isString: typeof callData.serializedTransaction === 'string',
        isEmpty: callData.serializedTransaction.length === 0,
        base64Length: base64Transaction.length,
        base64Type: typeof base64Transaction
      }, 'TransactionSigningService');

      // Validate the data before calling
      if (!callData.serializedTransaction || typeof callData.serializedTransaction !== 'string') {
        logger.error('Invalid callData before Firebase Function call', {
          serializedTransactionType: typeof callData.serializedTransaction,
          serializedTransactionValue: callData.serializedTransaction,
          isString: typeof callData.serializedTransaction === 'string',
          isEmpty: callData.serializedTransaction?.length === 0
        }, 'TransactionSigningService');
        throw new Error(`Invalid serializedTransaction type: ${typeof callData.serializedTransaction}. Expected string.`);
      }

      // Get the callable function (lazy initialization)
      const signTransactionFunction = getSignTransactionFunction();
      
      // Call the Firebase Function directly (httpsCallable returns a callable function)
      try {
        logger.info('Invoking Firebase Function signTransaction', {
          functionName: 'signTransaction',
          dataKeys: Object.keys(callData),
          serializedTransactionLength: callData.serializedTransaction.length,
          base64Length: base64Transaction.length,
          base64Type: typeof base64Transaction,
          isString: typeof base64Transaction === 'string',
          callableFunctionType: typeof signTransactionFunction,
          isFunction: typeof signTransactionFunction === 'function'
        }, 'TransactionSigningService');
        
        // Call the function directly with the data object
        result = await signTransactionFunction(callData);
        
        logger.info('Firebase Function call completed', {
          hasResult: !!result,
          resultType: typeof result,
          hasData: !!result?.data,
          hasSuccess: !!result?.data?.success,
          hasSerializedTransaction: !!result?.data?.serializedTransaction
        }, 'TransactionSigningService');
      } catch (callError) {
        logger.error('Firebase Function call failed', {
          error: callError,
          errorMessage: callError instanceof Error ? callError.message : String(callError),
          errorName: callError instanceof Error ? callError.name : typeof callError,
          errorCode: (callError as any)?.code,
          errorDetails: (callError as any)?.details,
          errorStack: callError instanceof Error ? callError.stack : undefined,
          callDataKeys: Object.keys(callData),
          serializedTransactionType: typeof callData.serializedTransaction,
          serializedTransactionLength: callData.serializedTransaction?.length,
          base64Length: base64Transaction.length,
          base64Type: typeof base64Transaction
        }, 'TransactionSigningService');
        throw callError;
      }
      
      logger.info('Firebase Function call succeeded', {
        hasResult: !!result,
        hasData: !!result?.data,
        resultType: typeof result
      }, 'TransactionSigningService');
    } catch (firebaseError) {
      logger.error('Firebase Function call failed', {
        error: firebaseError,
        errorMessage: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        errorStack: firebaseError instanceof Error ? firebaseError.stack : undefined,
        errorName: firebaseError instanceof Error ? firebaseError.name : typeof firebaseError,
        base64Length: base64Transaction.length,
        base64Type: typeof base64Transaction,
        base64Preview: base64Transaction.substring(0, 50),
        base64IsString: typeof base64Transaction === 'string',
        base64IsEmpty: base64Transaction.length === 0
      }, 'TransactionSigningService');
      throw firebaseError;
    }
    
    if (!result || !result.data) {
      logger.error('Invalid result from Firebase Function', {
        result,
        hasResult: !!result,
        hasData: !!result?.data,
        resultType: typeof result
      }, 'TransactionSigningService');
      throw new Error('Invalid result from Firebase Function: missing data');
    }
    
    const response = result.data as { success: boolean; serializedTransaction: string };

    if (!response || !response.success || !response.serializedTransaction) {
      logger.error('Invalid response from signTransaction function', {
        response,
        hasSuccess: !!response?.success,
        hasSerializedTransaction: !!response?.serializedTransaction
      }, 'TransactionSigningService');
      throw new Error('Invalid response from signTransaction function');
    }

    // Convert base64 string back to Uint8Array
    let fullySignedTransaction: Uint8Array;
    try {
    if (typeof Buffer !== 'undefined') {
        const buffer = Buffer.from(response.serializedTransaction, 'base64');
        fullySignedTransaction = new Uint8Array(buffer);
        
        logger.info('Transaction converted from base64 to Uint8Array', {
          base64Length: response.serializedTransaction.length,
          bufferLength: buffer.length,
          uint8ArrayLength: fullySignedTransaction.length,
          firstBytes: Array.from(fullySignedTransaction.slice(0, 10))
        }, 'TransactionSigningService');
    } else {
      // Fallback for React Native
      const binaryString = atob(response.serializedTransaction);
      fullySignedTransaction = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fullySignedTransaction[i] = binaryString.charCodeAt(i);
      }
        
        logger.info('Transaction converted from base64 to Uint8Array (React Native)', {
          base64Length: response.serializedTransaction.length,
          binaryStringLength: binaryString.length,
          uint8ArrayLength: fullySignedTransaction.length
        }, 'TransactionSigningService');
      }

      // Validate the transaction is not empty
      if (!fullySignedTransaction || fullySignedTransaction.length === 0) {
        throw new Error('Fully signed transaction is empty');
      }

      // Validate minimum transaction size (VersionedTransaction should be at least 100 bytes)
      if (fullySignedTransaction.length < 100) {
        logger.warn('Fully signed transaction seems too small', {
          length: fullySignedTransaction.length
        }, 'TransactionSigningService');
    }

    logger.info('Transaction signed successfully', {
        transactionSize: fullySignedTransaction.length,
        isUint8Array: fullySignedTransaction instanceof Uint8Array
    }, 'TransactionSigningService');

    return fullySignedTransaction;
    } catch (conversionError) {
      logger.error('Failed to convert signed transaction from base64', {
        error: conversionError,
        errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
        base64Length: response.serializedTransaction?.length,
        base64Preview: response.serializedTransaction?.substring(0, 50)
      }, 'TransactionSigningService');
      throw new Error(`Failed to convert signed transaction: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }
  } catch (error) {
    logger.error('Failed to sign transaction', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      transactionType: typeof serializedTransaction,
      transactionLength: serializedTransaction?.length
    }, 'TransactionSigningService');
    throw error;
  }
}

/**
 * Submit fully signed transaction
 */
export async function submitTransaction(serializedTransaction: Uint8Array): Promise<{
  signature: string;
  confirmation: any;
}> {
  try {
    logger.info('Submitting transaction', {
      transactionSize: serializedTransaction.length,
      transactionType: typeof serializedTransaction,
      isUint8Array: serializedTransaction instanceof Uint8Array
    }, 'TransactionSigningService');

    // Ensure we have a proper Uint8Array
    let txArray: Uint8Array;
    if (serializedTransaction instanceof Uint8Array) {
      txArray = serializedTransaction;
    } else if (Array.isArray(serializedTransaction)) {
      txArray = new Uint8Array(serializedTransaction);
    } else if (serializedTransaction instanceof ArrayBuffer) {
      txArray = new Uint8Array(serializedTransaction);
    } else {
      throw new Error(`Invalid transaction type: ${typeof serializedTransaction}. Expected Uint8Array.`);
    }

    // Convert Uint8Array to base64 string
    let base64Transaction: string;
    try {
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        const buffer = Buffer.from(txArray);
        base64Transaction = buffer.toString('base64');
      } else if (typeof btoa !== 'undefined') {
        // Use btoa for React Native
        const binary = Array.from(txArray, byte => String.fromCharCode(byte)).join('');
        if (binary.length === 0 && txArray.length > 0) {
          throw new Error('Binary string conversion failed - empty result');
        }
        base64Transaction = btoa(binary);
      } else {
        // Fallback: manual base64 encoding
        base64Transaction = manualBase64Encode(txArray);
      }

      if (!base64Transaction || typeof base64Transaction !== 'string') {
        throw new Error(`Failed to convert transaction to base64 string. Got type: ${typeof base64Transaction}`);
      }

      if (base64Transaction.length === 0) {
        throw new Error('Base64 conversion resulted in empty string');
      }
    } catch (conversionError) {
      logger.error('Base64 conversion failed in submitTransaction', {
        error: conversionError,
        errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
        txArrayLength: txArray.length,
        hasBuffer: typeof Buffer !== 'undefined',
        hasBtoa: typeof btoa !== 'undefined'
      }, 'TransactionSigningService');
      throw new Error(`Failed to convert transaction to base64: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }

    logger.info('Transaction converted to base64 for submission', {
      base64Length: base64Transaction.length
    }, 'TransactionSigningService');

    // Get the callable function (lazy initialization)
    const submitTransactionFunction = getSubmitTransactionFunction();
    
    // Call Firebase Function
    const result = await submitTransactionFunction({ serializedTransaction: base64Transaction });
    const response = result.data as { success: boolean; signature: string; confirmation: any };

    if (!response || !response.success || !response.signature) {
      logger.error('Invalid response from submitTransaction function', {
        response,
        hasSuccess: !!response?.success,
        hasSignature: !!response?.signature
      }, 'TransactionSigningService');
      throw new Error('Invalid response from submitTransaction function');
    }

    logger.info('Transaction submitted successfully', {
      signature: response.signature,
      hasConfirmation: !!response.confirmation
    }, 'TransactionSigningService');

    // Confirmation may be null - client will handle confirmation asynchronously
    return {
      signature: response.signature,
      confirmation: response.confirmation || null
    };
  } catch (error) {
    logger.error('Failed to submit transaction', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      transactionType: typeof serializedTransaction,
      transactionLength: serializedTransaction?.length
    }, 'TransactionSigningService');
    throw error;
  }
}

/**
 * Process USDC transfer (sign and submit in one call)
 */
export async function processUsdcTransfer(serializedTransaction: Uint8Array): Promise<{
  signature: string;
  confirmation: any;
}> {
  try {
    logger.info('Processing USDC transfer', {
      transactionSize: serializedTransaction.length
    }, 'TransactionSigningService');

    // Ensure we have a proper Uint8Array
    let txArray: Uint8Array;
    if (serializedTransaction instanceof Uint8Array) {
      txArray = serializedTransaction;
    } else if (Array.isArray(serializedTransaction)) {
      txArray = new Uint8Array(serializedTransaction);
    } else if (serializedTransaction instanceof ArrayBuffer) {
      txArray = new Uint8Array(serializedTransaction);
    } else {
      throw new Error(`Invalid transaction type: ${typeof serializedTransaction}. Expected Uint8Array.`);
    }

    // Convert Uint8Array to base64 string (React Native compatible)
    let base64Transaction: string;
    try {
      if (typeof Buffer !== 'undefined' && Buffer.from) {
        const buffer = Buffer.from(txArray);
        base64Transaction = buffer.toString('base64');
      } else if (typeof btoa !== 'undefined') {
        // Use btoa for React Native
        const binary = Array.from(txArray, byte => String.fromCharCode(byte)).join('');
        if (binary.length === 0 && txArray.length > 0) {
          throw new Error('Binary string conversion failed - empty result');
        }
        base64Transaction = btoa(binary);
      } else {
        // Fallback: manual base64 encoding
        base64Transaction = manualBase64Encode(txArray);
      }

      if (!base64Transaction || typeof base64Transaction !== 'string') {
        throw new Error(`Failed to convert transaction to base64 string. Got type: ${typeof base64Transaction}`);
      }

      if (base64Transaction.length === 0) {
        throw new Error('Base64 conversion resulted in empty string');
      }
    } catch (conversionError) {
      logger.error('Base64 conversion failed in processUsdcTransfer', {
        error: conversionError,
        errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
        txArrayLength: txArray.length,
        hasBuffer: typeof Buffer !== 'undefined',
        hasBtoa: typeof btoa !== 'undefined'
      }, 'TransactionSigningService');
      throw new Error(`Failed to convert transaction to base64: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }

    // Get the callable function (lazy initialization)
    const processUsdcTransferFunction = getProcessUsdcTransferFunction();
    
    // Call Firebase Function with detailed error handling
    let result;
    try {
      logger.info('🔵 Calling Firebase Function processUsdcTransfer', {
        base64Length: base64Transaction.length,
        base64Preview: base64Transaction.substring(0, 50) + '...',
        functionType: typeof processUsdcTransferFunction,
        isFunction: typeof processUsdcTransferFunction === 'function'
      }, 'TransactionSigningService');
      
      result = await processUsdcTransferFunction({ serializedTransaction: base64Transaction });
      
      logger.info('✅ Firebase Function processUsdcTransfer returned', {
        hasResult: !!result,
        hasData: !!result?.data,
        resultDataType: typeof result?.data,
        resultDataKeys: result?.data ? Object.keys(result.data) : []
      }, 'TransactionSigningService');
    } catch (firebaseError: any) {
      // CRITICAL: Log full error details to understand what's happening
      const errorMessage = firebaseError?.message || 'No error message';
      const errorCode = firebaseError?.code || 'NO_CODE';
      const isTimeout = 
        errorCode === 'deadline-exceeded' ||
        errorCode === 'timeout' ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('deadline exceeded') ||
        errorMessage.toLowerCase().includes('timed out');
      
      logger.error('❌ Firebase Function processUsdcTransfer FAILED', {
        error: firebaseError,
        errorMessage,
        errorName: firebaseError?.name || 'Unknown',
        errorCode,
        isTimeout,
        errorDetails: firebaseError?.details || {},
        errorStack: firebaseError?.stack ? firebaseError.stack.substring(0, 500) : 'No stack trace',
        isFirebaseError: firebaseError?.code !== undefined,
        base64Length: base64Transaction.length,
        base64Preview: base64Transaction.substring(0, 50) + '...',
        functionType: typeof processUsdcTransferFunction,
        note: isTimeout ? 'This may be a timeout - transaction might have succeeded on backend. Check Firebase logs.' : 'Standard error'
      }, 'TransactionSigningService');
      
      // For timeout errors, provide more helpful error message
      // CRITICAL: Don't suggest retrying immediately - transaction may have succeeded
      // User should check transaction history first to avoid duplicate submissions
      if (isTimeout) {
        const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK') || getEnvVar('EXPO_PUBLIC_DEV_NETWORK') || '';
        const isMainnet = networkEnv.toLowerCase() === 'mainnet' || 
                          (!__DEV__ && !networkEnv);
        
        if (isMainnet) {
          throw new Error(`Transaction processing timed out on mainnet. The transaction may have succeeded on the blockchain. Please check your transaction history before trying again. If the transaction didn't go through, wait a few moments and try again. (Error: ${errorCode})`);
        } else {
          throw new Error(`Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history. If the transaction didn't go through, please try again. (Error: ${errorCode})`);
        }
      }
      
      // Re-throw with more context for other errors
      throw new Error(`Firebase Function error (${errorCode}): ${errorMessage}`);
    }
    
    const response = result.data as { success: boolean; signature: string; confirmation: any };

    if (!response || !response.success || !response.signature) {
      logger.error('❌ Invalid response from processUsdcTransfer function', {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        hasSuccess: !!response?.success,
        successValue: response?.success,
        hasSignature: !!response?.signature,
        signatureValue: response?.signature,
        fullResponse: response
      }, 'TransactionSigningService');
      throw new Error('Invalid response from processUsdcTransfer function');
    }

    logger.info('USDC transfer processed successfully', {
      signature: response.signature
    }, 'TransactionSigningService');

    return {
      signature: response.signature,
      confirmation: response.confirmation
    };
  } catch (error) {
    logger.error('Failed to process USDC transfer', error, 'TransactionSigningService');
    throw error;
  }
}

/**
 * Validate transaction before signing
 */
export async function validateTransaction(serializedTransaction: Uint8Array): Promise<{
  success: boolean;
  valid: boolean;
  message?: string;
  error?: string;
}> {
  try {
    logger.info('Validating transaction', {
      transactionSize: serializedTransaction.length
    }, 'TransactionSigningService');

    // Convert Uint8Array to base64 string
    const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

    // Get the callable function (lazy initialization)
    const validateTransactionFunction = getValidateTransactionFunction();
    
    // Call Firebase Function
    const result = await validateTransactionFunction({ serializedTransaction: base64Transaction });
    const response = result.data as { success: boolean; valid: boolean; message?: string; error?: string };

    logger.info('Transaction validation result', {
      success: response.success,
      valid: response.valid
    }, 'TransactionSigningService');

    return response;
  } catch (error) {
    logger.error('Failed to validate transaction', error, 'TransactionSigningService');
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get transaction fee estimate
 */
export async function getTransactionFeeEstimate(serializedTransaction: Uint8Array): Promise<{
  fee: number;
  lamports: number;
}> {
  try {
    logger.info('Estimating transaction fee', {
      transactionSize: serializedTransaction.length
    }, 'TransactionSigningService');

    // Convert Uint8Array to base64 string
    const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

    // Get the callable function (lazy initialization)
    const feeEstimateFunction = getTransactionFeeEstimateFunction();
    
    // Call Firebase Function
    const result = await feeEstimateFunction({ serializedTransaction: base64Transaction });
    const response = result.data as { success: boolean; fee: number; lamports: number };

    if (!response.success) {
      throw new Error('Invalid response from getTransactionFeeEstimate function');
    }

    logger.info('Transaction fee estimated', {
      fee: response.fee,
      lamports: response.lamports
    }, 'TransactionSigningService');

    return {
      fee: response.fee,
      lamports: response.lamports
    };
  } catch (error) {
    logger.error('Failed to estimate transaction fee', error, 'TransactionSigningService');
    throw error;
  }
}

/**
 * Get company wallet address from Firebase Secrets
 * This fetches the address from Firebase instead of using EAS secrets
 * Cached to avoid repeated calls
 */
let cachedCompanyWalletAddress: string | null = null;
let addressFetchPromise: Promise<string> | null = null;

export async function getCompanyWalletAddress(): Promise<string> {
  // Return cached value if available
  if (cachedCompanyWalletAddress) {
    return cachedCompanyWalletAddress;
  }

  // If already fetching, return the existing promise
  if (addressFetchPromise) {
    return addressFetchPromise;
  }

  // Fetch from Firebase
  addressFetchPromise = (async () => {
    try {
      logger.info('Fetching company wallet address from Firebase', null, 'TransactionSigningService');

      // Get the callable function (lazy initialization)
      const companyWalletAddressFunction = getCompanyWalletAddressFunction();
      
      // Call Firebase Function
      const result = await companyWalletAddressFunction({});
      const response = result.data as { success: boolean; address: string };

      if (!response || !response.success || !response.address) {
        const errorDetails = {
          hasResponse: !!response,
          responseKeys: response ? Object.keys(response) : [],
          hasSuccess: !!response?.success,
          successValue: response?.success,
          hasAddress: !!response?.address,
          responseType: typeof response,
          fullResponse: response
        };
        logger.error('Invalid response from getCompanyWalletAddress function', errorDetails, 'TransactionSigningService');
        throw new Error('Invalid response from getCompanyWalletAddress function');
      }

      // Validate address format
      const address = response.address.trim();
      if (address.length < 32 || address.length > 44) {
        throw new Error(`Invalid address format: length ${address.length} (expected 32-44)`);
      }

      // Cache the address
      cachedCompanyWalletAddress = address;

      logger.info('Company wallet address retrieved from Firebase', {
        address: address.substring(0, 8) + '...' + address.substring(address.length - 8),
        addressLength: address.length
      }, 'TransactionSigningService');

      return address;
    } catch (error: any) {
      // Enhanced error logging
      const errorCode = error?.code || 'unknown';
      const errorMessage = error?.message || String(error);
      const isNotFound = errorCode === 'functions/not-found' || errorCode === 'not-found' || errorMessage.includes('not-found');
      
      logger.error('Failed to get company wallet address from Firebase', {
        errorCode,
        errorMessage,
        errorName: error?.name,
        isNotFound,
        isProduction: !__DEV__,
        note: isNotFound 
          ? 'Function may not be deployed. Run: firebase deploy --only functions:getCompanyWalletAddress'
          : 'Check Firebase Functions deployment and network connectivity'
      }, 'TransactionSigningService');
      
      // In production, we MUST have the address from Firebase - no fallback
      if (!__DEV__) {
        // Clear the promise so we can retry
        addressFetchPromise = null;
        throw new Error(
          `Company wallet address not available from Firebase: ${errorMessage}. ` +
          `This is required in production. Ensure getCompanyWalletAddress function is deployed.`
        );
      }
      
      // In development, allow fallback to env var for testing
      logger.warn('Falling back to environment variable in development', {
        hasEnvVar: !!getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS')
      }, 'TransactionSigningService');
      
      const envAddress = getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS');
      if (envAddress) {
        cachedCompanyWalletAddress = envAddress.trim();
        return cachedCompanyWalletAddress;
      }
      
      // Clear the promise so we can retry
      addressFetchPromise = null;
      throw new Error(
        `Company wallet address not available: ${errorMessage}. ` +
        `Firebase function failed and no environment variable found.`
      );
    }
  })();

  return addressFetchPromise;
}

/**
 * Clear cached company wallet address (useful for testing or if address changes)
 */
export function clearCompanyWalletAddressCache(): void {
  cachedCompanyWalletAddress = null;
  addressFetchPromise = null;
}

/**
 * Get company wallet balance
 */
export async function getCompanyWalletBalance(): Promise<{
  address: string;
  balance: number;
  lamports: number;
}> {
  try {
    logger.info('Getting company wallet balance', null, 'TransactionSigningService');

    // Get the callable function (lazy initialization)
    const companyWalletBalanceFunction = getCompanyWalletBalanceFunction();
    
    // Call Firebase Function
    const result = await companyWalletBalanceFunction({});
    const response = result.data as { success: boolean; address: string; balance: number; lamports: number };

    if (!response.success) {
      throw new Error('Invalid response from getCompanyWalletBalance function');
    }

    logger.info('Company wallet balance retrieved', {
      address: response.address,
      balance: response.balance
    }, 'TransactionSigningService');

    return {
      address: response.address,
      balance: response.balance,
      lamports: response.lamports
    };
  } catch (error) {
    logger.error('Failed to get company wallet balance', error, 'TransactionSigningService');
    throw error;
  }
}

