/**
 * Firebase Functions service for email authentication
 * Uses Firebase Functions instead of local backend
 */

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { logger } from '../analytics/loggingService';

/**
 * Test/Placeholder credentials for iOS team testing
 * 
 * Usage:
 * - Email: test@wesplit.app
 * - Code: 1234
 * 
 * These credentials bypass the actual email verification flow and allow
 * testing the authentication process without needing to receive real emails.
 * 
 * NOTE: Enabled in both development and production for iOS team testing
 */
const TEST_EMAIL = 'test@wesplit.app';
const TEST_CODE = '1234';

// Use the existing Firebase app instance instead of creating a new one
// This ensures we're using the same Firebase configuration and authentication state
// The app is initialized in src/config/firebase/firebase.ts
let app;
try {
  // Try to get the default Firebase app (initialized in firebase.ts)
  app = getApp();
  if (__DEV__) {
    logger.info('Using existing Firebase app instance for Functions', null, 'firebaseFunctionsService');
  }
} catch (error) {
  // If app doesn't exist yet, import and use the one from firebase config
  // This ensures we always use the same app instance
  const firebaseConfig = require('../../config/firebase/firebase');
  app = firebaseConfig.default;
  if (__DEV__) {
    logger.info('Using Firebase app from config for Functions', null, 'firebaseFunctionsService');
  }
}

// Initialize Firebase Functions with the existing app
// Set the region to us-central1 for your specific function
const functionsRegion = getFunctions(app, 'us-central1');

// Connect to emulator in development mode
if (__DEV__ && !process.env.EXPO_PUBLIC_USE_PROD_FUNCTIONS) {
  try {
    const emulatorHost = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST || 'localhost';
    const emulatorPort = parseInt(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001');
    connectFunctionsEmulator(functionsRegion, emulatorHost, emulatorPort);
    logger.info('🔧 Connected to Firebase Functions Emulator', {
      host: emulatorHost,
      port: emulatorPort
    }, 'firebaseFunctionsService');
  } catch (error: any) {
    if (error.code !== 'functions/already-initialized') {
      logger.warn('Failed to connect to Functions emulator', {
        error: error.message,
        note: 'Using production Functions'
      }, 'firebaseFunctionsService');
    }
  }
}

// Firebase Functions callable functions with increased timeout
const sendVerificationEmailFunction = httpsCallable(functionsRegion, 'sendVerificationEmail', {
  timeout: 60000 // 60 seconds timeout
});
const verifyCodeFunction = httpsCallable(functionsRegion, 'verifyCode', {
  timeout: 60000 // 60 seconds timeout
});
const checkEmailUserExistsFunction = httpsCallable(functionsRegion, 'checkEmailUserExists', {
  timeout: 30000 // 30 seconds timeout
});
const checkUsernameAvailabilityFunction = httpsCallable(functionsRegion, 'checkUsernameAvailability', {
  timeout: 30000 // 30 seconds timeout
});
const sendEmailChangeNotificationFunction = httpsCallable(functionsRegion, 'sendEmailChangeNotification', {
  timeout: 30000 // 30 seconds timeout
});

export interface FirebaseAuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    walletAddress: string;
    walletPublicKey: string;
    avatar?: string;
    createdAt: string;
  };
  customToken?: string;
}

export interface FirebaseVerificationResponse {
  success: boolean;
  message: string;
  email: string;
  code?: string; // Only in development
  skipVerification: boolean;
  error?: string; // For error messages
  user?: {
    id: string;
    email: string;
    name: string;
    walletAddress: string;
    walletPublicKey: string;
    avatar?: string;
    createdAt: string;
    hasCompletedOnboarding?: boolean;
  };
  customToken?: string;
}

/**
 * Send verification code via Firebase Functions
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  if (__DEV__) { logger.info('sendVerificationCode called (Firebase Functions)', null, 'firebaseFunctionsService'); }
  if (__DEV__) { logger.debug('Email', { email }, 'firebaseFunctionsService'); }
  
  // TEST MODE: Bypass sending code for placeholder email (enabled for iOS team testing)
  if (email.trim().toLowerCase() === TEST_EMAIL.toLowerCase()) {
    logger.info('🧪 TEST MODE: Placeholder email detected - skipping actual code send', { email: TEST_EMAIL }, 'firebaseFunctionsService');
    logger.info('🧪 TEST MODE: Use code "1234" to verify', null, 'firebaseFunctionsService');
    return { success: true };
  }
  
  try {
    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    
    // First, store the verification code in Firestore
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase/firebase');
    
    const verificationData = {
      email: email.trim(),
      code: code,
      used: false,
      created_at: serverTimestamp(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now (camelCase to match Firebase Function)
    };
    
    await addDoc(collection(db, 'verificationCodes'), verificationData);
    
    if (__DEV__) { logger.info('Verification code stored in Firestore', null, 'firebaseFunctionsService'); }
    
    // Call Firebase Function to send verification email
    const result = await sendVerificationEmailFunction({
      email: email.trim(),
      code: code
    });
    
    const response = result.data as FirebaseAuthResponse;
    
    if (__DEV__) { logger.debug('Firebase Functions response', { response }, 'firebaseFunctionsService'); }
    
    if (response.success) {
      if (__DEV__) { logger.info('Verification code sent successfully via Firebase Functions', null, 'firebaseFunctionsService'); }
      return { success: true };
    } else {
      throw new Error(response.message || 'Failed to send verification code');
    }
    
  } catch (error: unknown) {
    if (__DEV__) { 
      console.error('❌ Error sending verification code via Firebase Functions:', error);
      if ((error as any)?.details) {
        console.error('Error details:', (error as any).details);
      }
    }
    
    // Handle Firebase Functions specific errors
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || '';
    
    if (errorCode === 'functions/resource-exhausted') {
      throw new Error('Too many requests. Please wait 1 minute before requesting another code.');
    } else if (errorCode === 'functions/invalid-argument') {
      throw new Error('Invalid email format. Please enter a valid email address.');
    } else if (errorCode === 'functions/failed-precondition') {
      // Email service configuration error
      throw new Error(errorMessage || 'Email service is not properly configured. Please contact support.');
    } else if (errorCode === 'functions/internal') {
      // Internal server error with detailed message
      throw new Error(errorMessage || 'Failed to send verification code. Please try again.');
    } else if (errorMessage) {
      throw new Error(errorMessage);
    } else {
      throw new Error('Failed to send verification code. Please try again.');
    }
  }
}

/**
 * Verify code via Firebase Functions
 */
export async function verifyCode(email: string, code: string, captchaToken?: string): Promise<FirebaseVerificationResponse> {
  if (__DEV__) { logger.info('verifyCode called (Firebase Functions)', null, 'firebaseFunctionsService'); }
  if (__DEV__) { logger.debug('Email and Code', { email, code }, 'firebaseFunctionsService'); }
  
  // TEST MODE: Bypass verification for placeholder credentials (enabled for iOS team testing)
  if (email.trim().toLowerCase() === TEST_EMAIL.toLowerCase() && code.trim() === TEST_CODE) {
    logger.info('🧪 TEST MODE: Using placeholder credentials for testing', { email: TEST_EMAIL, code: TEST_CODE }, 'firebaseFunctionsService');
    
    try {
      // Get or create test user in Firestore
      const { collection, query, where, getDocs, doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      // Check if test user exists
      let testUser;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', TEST_EMAIL));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        testUser = querySnapshot.docs[0].data();
        logger.info('🧪 Test user found in Firestore', { userId: testUser.id }, 'firebaseFunctionsService');
      }
      
      // Create test user if doesn't exist
      if (!testUser) {
        const testUserId = 'test_user_' + Date.now();
        testUser = {
          id: testUserId,
          email: TEST_EMAIL,
          name: 'Test User',
          wallet_address: '',
          wallet_public_key: '',
          created_at: new Date().toISOString(),
          avatar: '',
          emailVerified: true,
          lastLoginAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(),
          hasCompletedOnboarding: true,
          points: 0,
          total_points_earned: 0
        };
        
        // Try to create user document (non-blocking)
        try {
          const userRef = doc(db, 'users', testUserId);
          await setDoc(userRef, testUser, { merge: true });
          logger.info('🧪 Test user created in Firestore', { userId: testUserId }, 'firebaseFunctionsService');
        } catch (createError) {
          logger.warn('Could not create test user document (non-critical)', { error: createError }, 'firebaseFunctionsService');
        }
      }
      
      // Return mock successful response
      return {
        success: true,
        message: 'Test verification successful',
        email: TEST_EMAIL,
        skipVerification: false,
        user: {
          id: testUser.id,
          email: testUser.email,
          name: testUser.name || 'Test User',
          walletAddress: testUser.wallet_address || '',
          walletPublicKey: testUser.wallet_public_key || '',
          avatar: testUser.avatar || '',
          createdAt: testUser.created_at || new Date().toISOString(),
          hasCompletedOnboarding: testUser.hasCompletedOnboarding !== false
        },
        customToken: null // Will be created by Firebase Function if needed
      };
    } catch (testError) {
      logger.error('Error in test mode verification', { error: testError }, 'firebaseFunctionsService');
      // Fall through to normal verification flow
    }
  }
  
  try {
    // Call Firebase Function to verify code
    const result = await verifyCodeFunction({
      email: email.trim(),
      code: code.trim(),
      captchaToken: captchaToken
    });
    
    const response = result.data as FirebaseVerificationResponse;
    
    if (__DEV__) { logger.debug('Firebase Functions verification response', { response }, 'firebaseFunctionsService'); }
    
    if (response.success) {
      if (__DEV__) { logger.info('Code verified successfully via Firebase Functions', null, 'firebaseFunctionsService'); }
      
      // Mark the verification code as used in Firestore
      try {
        const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase/firebase');
        
        const verificationRef = collection(db, 'verificationCodes');
        const q = query(
          verificationRef,
          where('email', '==', email.trim()),
          where('code', '==', code.trim()),
          where('used', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          await updateDoc(doc.ref, { used: true });
          if (__DEV__) { logger.info('Verification code marked as used', null, 'firebaseFunctionsService'); }
        }
      } catch (firestoreError) {
        if (__DEV__) { console.warn('⚠️ Could not mark verification code as used:', firestoreError); }
        // Don't fail the verification if marking as used fails
      }
      
      return response;
    } else {
      throw new Error(response.message || 'Failed to verify code');
    }
    
  } catch (error: unknown) {
    if (__DEV__) { console.error('❌ Error verifying code via Firebase Functions:', error); }
    
    // Handle Firebase Functions specific errors
    if (error.code === 'functions/not-found') {
      throw new Error('Invalid or expired verification code. Please request a new code.');
    } else if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid code format. Please enter a 6-digit code.');
    } else if (error.code === 'functions/permission-denied') {
      throw new Error(error.message || 'Too many failed attempts. Please complete CAPTCHA and try again.');
    } else if (error.code === 'functions/resource-exhausted') {
      throw new Error(error.message || 'Too many verification attempts. Please wait 5 minutes or request a new code.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to verify code. Please try again.');
    }
  }
}

/**
 * Check if email user exists
 */
export async function checkEmailUserExists(email: string): Promise<{ success: boolean; userExists: boolean; userId?: string; message?: string }> {
  if (__DEV__) { logger.info('checkEmailUserExists called (Firebase Functions)', null, 'firebaseFunctionsService'); }
  if (__DEV__) { logger.debug('Email', { email }, 'firebaseFunctionsService'); }

  try {
    // Call Firebase Function to check if email user exists
    const result = await checkEmailUserExistsFunction({
      email: email.trim()
    });

    if (!result || !result.data) {
      logger.error('Invalid response from checkEmailUserExistsFunction', { result }, 'firebaseFunctionsService');
      throw new Error('Invalid response from server');
    }

    const response = result.data as { success: boolean; userExists: boolean; userId?: string; message?: string };

    if (__DEV__) { logger.debug('Firebase Functions checkEmailUserExists response', { response }, 'firebaseFunctionsService'); }

    // Validate response structure
    if (typeof response !== 'object' || response === null) {
      logger.error('Invalid response structure from Firebase Function', { response }, 'firebaseFunctionsService');
      throw new Error('Invalid response structure from server');
    }

    if (response.success) {
      if (__DEV__) { logger.info('Email user existence check completed', null, 'firebaseFunctionsService'); }
      return {
        success: true,
        userExists: response.userExists || false,
        userId: response.userId,
        message: response.message
      };
    } else {
      throw new Error(response.message || 'Failed to check user existence');
    }

  } catch (error: unknown) {
    if (__DEV__) { console.error('❌ Error checking email user existence via Firebase Functions:', error); }

    // Handle Firebase Functions specific errors
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || '';

    if (errorCode === 'functions/invalid-argument') {
      throw new Error('Invalid email format. Please enter a valid email address.');
    } else if (errorCode === 'functions/internal') {
      throw new Error(errorMessage || 'Failed to check user existence. Please try again.');
    } else if (errorMessage) {
      throw new Error(errorMessage);
    } else {
      throw new Error('Failed to check user existence. Please try again.');
    }
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(username: string, excludeUserId?: string): Promise<{ success: boolean; available: boolean; error?: string; message?: string }> {
  if (__DEV__) { logger.info('checkUsernameAvailability called (Firebase Functions)', { username: username.substring(0, 10) + '...' }, 'firebaseFunctionsService'); }

  // Wrap the entire call in try-catch to handle not-found errors silently
  try {
    // Call Firebase Function to check if username is available
    let result;
    try {
      result = await checkUsernameAvailabilityFunction({
        username: username.trim(),
        excludeUserId: excludeUserId
      });
    } catch (callError: any) {
      // Check if this is a not-found error BEFORE React Native logs it
      const errorCode = callError?.code;
      const errorMessage = String(callError?.message || '');
      const errorString = String(callError);
      
      const isNotFound = errorCode === 'functions/not-found' || 
                         errorCode === 'not-found' || 
                         errorMessage.toLowerCase().includes('not-found') ||
                         errorString.toLowerCase().includes('not-found');
      
      if (isNotFound) {
        // Return special result instead of throwing - prevents React Native error logging
        return {
          success: false,
          available: false,
          error: 'FUNCTION_NOT_FOUND' // Special marker for caller to detect
        };
      }
      // Re-throw other errors
      throw callError;
    }

    if (!result || !result.data) {
      logger.error('Invalid response from checkUsernameAvailabilityFunction', { result }, 'firebaseFunctionsService');
      throw new Error('Invalid response from server');
    }

    const response = result.data as { success: boolean; available: boolean; error?: string; message?: string };

    if (__DEV__) { logger.debug('Firebase Functions checkUsernameAvailability response', { response }, 'firebaseFunctionsService'); }

    // Validate response structure
    if (typeof response !== 'object' || response === null) {
      logger.error('Invalid response structure from Firebase Function', { response }, 'firebaseFunctionsService');
      throw new Error('Invalid response structure from server');
    }

    if (response.success) {
      if (__DEV__) { logger.info('Username availability check completed', { available: response.available }, 'firebaseFunctionsService'); }
      return {
        success: true,
        available: response.available || false,
        error: response.error,
        message: response.message
      };
    } else {
      throw new Error(response.error || 'Failed to check username availability');
    }

  } catch (error: unknown) {
    // Check error code FIRST before any logging
    const errorCode = (error as any)?.code;
    const errorMessage = String((error as any)?.message || '');
    const errorString = String(error);

    // If function not found (not deployed), this is expected - return a special result
    // Check multiple possible error code formats and error string
    const isNotFound = errorCode === 'functions/not-found' || 
                       errorCode === 'not-found' || 
                       errorMessage.toLowerCase().includes('not-found') ||
                       errorString.toLowerCase().includes('not-found');

    if (isNotFound) {
      // Return a special result indicating function not found (caller will use fallback)
      // Don't throw to avoid React Native error logging
      return {
        success: false,
        available: false,
        error: 'FUNCTION_NOT_FOUND' // Special marker for caller to detect
      };
    }

    // For other errors, log them
    if (__DEV__) { 
      console.error('❌ Error checking username availability via Firebase Functions:', error); 
    }

    if (errorCode === 'functions/invalid-argument') {
      throw new Error(errorMessage || 'Invalid username format');
    } else if (errorCode === 'functions/internal') {
      throw new Error(errorMessage || 'Failed to check username availability. Please try again.');
    } else if (errorMessage && errorMessage !== 'undefined' && errorMessage !== 'null') {
      throw new Error(errorMessage);
    } else {
      throw new Error('Failed to check username availability. Please try again.');
    }
  }
}

/**
 * Send email change notification to old email address
 */
export async function sendEmailChangeNotification(oldEmail: string, newEmail: string, userId: string): Promise<{ success: boolean; error?: string }> {
  if (__DEV__) { logger.info('sendEmailChangeNotification called', { oldEmail: oldEmail.substring(0, 5) + '...', newEmail: newEmail.substring(0, 5) + '...' }, 'firebaseFunctionsService'); }
  
  try {
    const result = await sendEmailChangeNotificationFunction({
      oldEmail: oldEmail.trim(),
      newEmail: newEmail.trim(),
      userId: userId
    });
    
    const response = result.data as { success: boolean; message?: string };
    
    if (response.success) {
      if (__DEV__) { logger.info('Email change notification sent successfully', null, 'firebaseFunctionsService'); }
      return { success: true };
    } else {
      throw new Error(response.message || 'Failed to send email change notification');
    }
  } catch (error: unknown) {
    if (__DEV__) { console.error('❌ Error sending email change notification:', error); }
    
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || '';
    
    if (errorCode === 'functions/unauthenticated') {
      throw new Error('Authentication required to change email');
    } else if (errorCode === 'functions/permission-denied') {
      throw new Error('You can only change your own email');
    } else if (errorCode === 'functions/invalid-argument') {
      throw new Error('Invalid email format');
    } else if (errorMessage) {
      throw new Error(errorMessage);
    } else {
      throw new Error('Failed to send email change notification. Please try again.');
    }
  }
}

/**
 * Check if Firebase Functions are available
 */
export async function checkFirebaseFunctionsAvailability(): Promise<boolean> {
  try {
    // Try to call a simple function to check if Firebase Functions are available
    await sendVerificationEmailFunction({ email: 'test@example.com', code: '1234' });
    return true;
  } catch (error: unknown) {
    if (__DEV__) { console.warn('⚠️ Firebase Functions not available:', error.message); }
    return false;
  }
} 