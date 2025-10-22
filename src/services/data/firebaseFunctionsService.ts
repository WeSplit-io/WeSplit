/**
 * Firebase Functions service for email authentication
 * Uses Firebase Functions instead of local backend
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import Constants from 'expo-constants';
import { logger } from '../core/loggingService';

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
  
  // Additional fallback: try to get from firebase config object
  if (Constants.expoConfig?.extra?.firebase?.[key.toLowerCase().replace('FIREBASE_', '')]) {
    return Constants.expoConfig.extra.firebase[key.toLowerCase().replace('FIREBASE_', '')];
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

// Firebase Functions service initialized

// Validate required environment variables
if (!apiKey) {
  console.error('EXPO_PUBLIC_FIREBASE_API_KEY is missing. Please check your .env file and app.json configuration.');
  throw new Error('EXPO_PUBLIC_FIREBASE_API_KEY is required. Please add it to your .env file or app.json extra section.');
}

if (!messagingSenderId) {
  console.error('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is missing. Please check your .env file and app.json configuration.');
  throw new Error('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required. Please add it to your .env file or app.json extra section.');
}

if (!appId) {
  console.error('EXPO_PUBLIC_FIREBASE_APP_ID is missing. Please check your .env file and app.json configuration.');
  throw new Error('EXPO_PUBLIC_FIREBASE_APP_ID is required. Please add it to your .env file or app.json extra section.');
}

// Firebase configuration
const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Functions
const functions = getFunctions(app);

// Set the region to us-central1 for your specific function
const functionsRegion = getFunctions(app, 'us-central1');

// Firebase Functions callable functions with increased timeout
const sendVerificationEmailFunction = httpsCallable(functionsRegion, 'sendVerificationEmail', {
  timeout: 60000 // 60 seconds timeout
});
const verifyCodeFunction = httpsCallable(functionsRegion, 'verifyCode', {
  timeout: 60000 // 60 seconds timeout
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
  
  try {
    // Generate a 4-digit verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    
    // First, store the verification code in Firestore
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase/firebase');
    
    const verificationData = {
      email: email.trim(),
      code: code,
      used: false,
      created_at: serverTimestamp(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
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
    
  } catch (error: any) {
    if (__DEV__) { console.error('❌ Error sending verification code via Firebase Functions:', error); }
    
    // Handle Firebase Functions specific errors
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('Too many requests. Please wait 1 minute before requesting another code.');
    } else if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid email format. Please enter a valid email address.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to send verification code. Please try again.');
    }
  }
}

/**
 * Verify code via Firebase Functions
 */
export async function verifyCode(email: string, code: string): Promise<FirebaseVerificationResponse> {
  if (__DEV__) { logger.info('verifyCode called (Firebase Functions)', null, 'firebaseFunctionsService'); }
  if (__DEV__) { logger.debug('Email and Code', { email, code }, 'firebaseFunctionsService'); }
  
  try {
    // Call Firebase Function to verify code
    const result = await verifyCodeFunction({
      email: email.trim(),
      code: code.trim()
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
    
  } catch (error: any) {
    if (__DEV__) { console.error('❌ Error verifying code via Firebase Functions:', error); }
    
    // Handle Firebase Functions specific errors
    if (error.code === 'functions/not-found') {
      throw new Error('Invalid or expired verification code. Please request a new code.');
    } else if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid code format. Please enter a 4-digit code.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to verify code. Please try again.');
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
  } catch (error: any) {
    if (__DEV__) { console.warn('⚠️ Firebase Functions not available:', error.message); }
    return false;
  }
} 