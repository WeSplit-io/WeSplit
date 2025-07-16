/**
 * Pure Firebase-based authentication service for WeSplit
 * Uses Firebase Auth and Firestore for email verification without passwords
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firebaseAuth, firestoreService } from '../config/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    walletAddress: string;
    walletPublicKey: string;
    avatar?: string;
    createdAt: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate a random 4-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Send verification code to email using Firebase
 */
export async function sendVerificationCode(email: string): Promise<VerificationResponse> {
  if (__DEV__) { console.log('=== Firebase sendVerificationCode called ==='); }
  if (__DEV__) { console.log('Email:', email); }
  
  try {
    // Generate a 4-digit verification code
    const code = generateVerificationCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Store the verification code in Firestore
    // This will trigger the onVerificationCodeCreated function to send the email
    await firestoreService.storeVerificationCode(email, code, expiresAt);
    
    if (__DEV__) { 
      console.log('Verification code stored in Firestore, email will be sent via trigger');
    }
    
    return { 
      success: true, 
      message: 'Verification code sent successfully',
      // In development, include the code for testing
      ...(__DEV__ && { code })
    };
    
  } catch (error) {
    console.error('=== Error in Firebase sendVerificationCode ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send verification code' 
    };
  }
}

/**
 * Verify code and authenticate user using Firebase Functions
 */
export async function verifyCode(email: string, code: string): Promise<AuthResponse> {
  try {
    if (__DEV__) { console.log('🔐 Firebase Functions verifying code:', code, 'for email:', email); }
    
    // Try to use Firebase Functions for verification
    try {
      const functions = getFunctions();
      const verifyCodeFunction = httpsCallable(functions, 'verifyCode');
      const result = await verifyCodeFunction({ email, code });
      
      if (__DEV__) { console.log('🔍 Firebase Functions verification result:', result); }
      
      const data = result.data as any;
      
      if (data.success && data.user) {
        // Generate tokens (use custom token if available, otherwise generate local ones)
        const accessToken = data.customToken || `firebase_${data.user.id}_${Date.now()}`;
        const refreshToken = `refresh_${data.user.id}_${Date.now()}`;
        
        // Store tokens securely
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('firebaseUser', JSON.stringify({
          uid: data.user.id,
          email: data.user.email,
          emailVerified: true
        }));
        
        if (__DEV__) { console.log('✅ Firebase Functions authentication successful:', data.user); }
        
        return {
          success: true,
          message: data.message || 'Authentication successful',
          user: data.user,
          accessToken,
          refreshToken
        };
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (functionError) {
      // Log the actual Firebase Functions error
      if (__DEV__) { 
        console.log('❌ Firebase Functions error:', functionError);
        console.log('Error details:', {
          message: functionError instanceof Error ? functionError.message : 'Unknown error',
          code: (functionError as any)?.code,
          details: (functionError as any)?.details
        });
      }
      
      // Fallback to local verification if Firebase Functions is not available
      if (__DEV__) { console.log('Firebase Functions failed, using local verification'); }
      
      // Verify the code from Firestore
      if (__DEV__) { console.log('🔍 Verifying code in Firestore...'); }
      const isValidCode = await firestoreService.verifyCode(email, code);
      
      if (__DEV__) { console.log('🔍 Code verification result:', isValidCode); }
      
      if (!isValidCode) {
        throw new Error('Invalid or expired verification code');
      }
      
      // Check if user already exists in Firebase Auth
      let firebaseUser: FirebaseUser | null = null;
      
      try {
        // Check if user already exists
        const existingUser = auth.currentUser;
        if (existingUser && existingUser.email === email) {
          firebaseUser = existingUser;
        } else {
          // Create new user with a secure temporary password
          const tempPassword = `WeSplit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          try {
            // Try to sign in first (user might already exist)
            const userCredential = await firebaseAuth.signInWithEmail(email, tempPassword);
            firebaseUser = userCredential;
          } catch (signInError) {
            // User doesn't exist, create new user
            firebaseUser = await firebaseAuth.createUserWithEmail(email, tempPassword);
            
            // Send email verification
            if (firebaseUser) {
              await firebaseAuth.sendEmailVerification(firebaseUser);
            }
          }
        }
      } catch (authError) {
        console.error('Firebase Auth error:', authError);
        
        // Provide more specific error messages
        if (authError instanceof Error) {
          if (authError.message.includes('email-already-in-use')) {
            throw new Error('An account with this email already exists. Please try signing in.');
          } else if (authError.message.includes('invalid-email')) {
            throw new Error('Invalid email address. Please check your email and try again.');
          } else if (authError.message.includes('weak-password')) {
            throw new Error('Password is too weak. Please try again.');
          } else {
            throw new Error(`Authentication failed: ${authError.message}`);
          }
        }
        
        throw new Error('Failed to create or authenticate user');
      }
      
      if (!firebaseUser) {
        throw new Error('Failed to create or authenticate user');
      }
      
      // Create or update user document in Firestore
      const userData = await firestoreService.createUserDocument(firebaseUser);
      
      // Generate custom tokens (in production, you'd use Firebase Functions)
      const accessToken = `firebase_${firebaseUser.uid}_${Date.now()}`;
      const refreshToken = `refresh_${firebaseUser.uid}_${Date.now()}`;
      
      // Store tokens securely
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('firebaseUser', JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified
      }));
      
      if (__DEV__) { console.log('✅ Local Firebase authentication successful:', userData); }
      
      return {
        success: true,
        message: 'Authentication successful',
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          walletAddress: userData.wallet_address,
          walletPublicKey: userData.wallet_public_key,
          createdAt: userData.created_at,
          avatar: userData.avatar
        },
        accessToken,
        refreshToken
      };
    }
    
  } catch (error) {
    console.error('❌ Firebase verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify code'
    };
  }
}

/**
 * Get current Firebase user
 */
export async function getCurrentUser(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const currentUser = auth.currentUser;
    const accessToken = await AsyncStorage.getItem('accessToken');
    return !!(currentUser && accessToken);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get stored user data
 */
export async function getStoredUser(): Promise<any | null> {
  try {
    const userString = await AsyncStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
}

/**
 * Get access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * Refresh access token (Firebase handles this automatically)
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    // Firebase automatically handles token refresh
    const token = await currentUser.getIdToken(true);
    await AsyncStorage.setItem('accessToken', token);
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    // Sign out from Firebase Auth
    await firebaseAuth.signOut();
    
    // Clear stored data
    await AsyncStorage.multiRemove([
      'accessToken', 
      'refreshToken', 
      'user', 
      'firebaseUser',
      'emailForSignIn'
    ]);
    
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, profileData: any): Promise<void> {
  try {
    await firestoreService.updateUserDocument(userId, profileData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<any | null> {
  try {
    return await firestoreService.getUserDocument(userId);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
  return firebaseAuth.onAuthStateChanged(callback);
}

/**
 * Clean up expired verification codes (call this periodically)
 */
export async function cleanupExpiredCodes(): Promise<void> {
  try {
    await firestoreService.cleanupExpiredCodes();
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
  }
} 