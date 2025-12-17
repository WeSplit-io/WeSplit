import { initializeApp } from 'firebase/app';
import { 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  TwitterAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { initializeFirebaseAuth } from './firebasePersistence';
import { logger } from '../../services/analytics/loggingService';

// Get environment variables from Expo Constants with enhanced production support
const getEnvVar = (key: string): string => {
  // Helper to convert FIREBASE_API_KEY -> apiKey, FIREBASE_AUTH_DOMAIN -> authDomain, etc.
  const toCamelCase = (str: string): string => {
    return str
      .replace(/^FIREBASE_/, '')
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^[A-Z]/, (letter) => letter.toLowerCase());
  };
  
  // Try to get from process.env first (for development)
  if (process.env[key]) {
    return process.env[key]!.trim();
  }
  
  // Try to get from process.env with EXPO_PUBLIC_ prefix
  if (process.env[`EXPO_PUBLIC_${key}`]) {
    return process.env[`EXPO_PUBLIC_${key}`]!.trim();
  }
  
  // Try to get from Expo Constants
  if (Constants.expoConfig?.extra?.[key]) {
    return String(Constants.expoConfig.extra[key]).trim();
  }
  
  // Try to get from Expo Constants with EXPO_PUBLIC_ prefix
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return String(Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`]).trim();
  }
  
  // Try to get from Constants.manifest (older Expo versions)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return String((Constants.manifest as any).extra[key]).trim();
  }
  
  // Try to get from Constants.manifest with EXPO_PUBLIC_ prefix
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {
    return String((Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`]).trim();
  }
  
  // CRITICAL: Try to get from firebase config object (from app.config.js)
  // This is the primary source in production builds
  const firebaseKey = toCamelCase(key);
  if (Constants.expoConfig?.extra?.firebase?.[firebaseKey]) {
    const value = Constants.expoConfig.extra.firebase[firebaseKey];
    if (value && typeof value === 'string' && value.trim() !== '') {
      return String(value).trim();
    }
  }
  
  // Also try legacy format (lowercase with underscores)
  const legacyKey = key.toLowerCase().replace('firebase_', '');
  if (Constants.expoConfig?.extra?.firebase?.[legacyKey]) {
    const value = Constants.expoConfig.extra.firebase[legacyKey];
    if (value && typeof value === 'string' && value.trim() !== '') {
      return String(value).trim();
    }
  }
  
  // Production fallback: try to get from app.config.js or app.json
  if (Constants.expoConfig?.extra?.env?.[key]) {
    return String(Constants.expoConfig.extra.env[key]).trim();
  }
  
  if (Constants.expoConfig?.extra?.env?.[`EXPO_PUBLIC_${key}`]) {
    return String(Constants.expoConfig.extra.env[`EXPO_PUBLIC_${key}`]).trim();
  }
  
  return '';
};

// Helper to check if a value is a template string that wasn't substituted
const isTemplateString = (value: any): boolean => {
  return typeof value === 'string' && value.startsWith('${') && value.endsWith('}');
};

// Get Firebase configuration values
let apiKey = getEnvVar('FIREBASE_API_KEY');
let authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
let projectId = getEnvVar('FIREBASE_PROJECT_ID') || "wesplit-35186";
let storageBucket = getEnvVar('FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
let messagingSenderId = getEnvVar('FIREBASE_MESSAGING_SENDER_ID');
let appId = getEnvVar('FIREBASE_APP_ID');

// Check for template strings (values that weren't substituted during build)
if (isTemplateString(apiKey)) {
  console.warn('⚠️  apiKey appears to be a template string, was not substituted during build');
  apiKey = '';
}
if (isTemplateString(messagingSenderId)) {
  console.warn('⚠️  messagingSenderId appears to be a template string, was not substituted during build');
  messagingSenderId = '';
}
if (isTemplateString(appId)) {
  console.warn('⚠️  appId appears to be a template string, was not substituted during build');
  appId = '';
}

// Debug: Log what we found (only in development)
if (__DEV__) {
  console.log('Firebase Config Check:', {
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId: messagingSenderId ? `${messagingSenderId.substring(0, 10)}...` : 'MISSING',
    appId: appId ? `${appId.substring(0, 10)}...` : 'MISSING',
    hasFirebaseConfig: !!Constants.expoConfig?.extra?.firebase,
    firebaseConfigKeys: Constants.expoConfig?.extra?.firebase ? Object.keys(Constants.expoConfig.extra.firebase) : []
  });
}

// Configuration validation with better error messages
const missingFields: string[] = [];

if (!apiKey) {
  missingFields.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  console.error('❌ EXPO_PUBLIC_FIREBASE_API_KEY is missing.');
  console.error('   Check: Constants.expoConfig?.extra?.firebase?.apiKey');
  console.error('   Available firebase keys:', Constants.expoConfig?.extra?.firebase ? Object.keys(Constants.expoConfig.extra.firebase) : 'none');
}

if (!messagingSenderId) {
  missingFields.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  console.error('❌ EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is missing.');
}

if (!appId) {
  missingFields.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  console.error('❌ EXPO_PUBLIC_FIREBASE_APP_ID is missing.');
}

if (missingFields.length > 0) {
  const errorMessage = `Firebase configuration is incomplete. Missing: ${missingFields.join(', ')}.\n\n` +
    `In production, these must be set as EAS secrets:\n` +
    missingFields.map(field => `  eas secret:create --scope project --name ${field} --value "your-value"`).join('\n') +
    `\n\nOr ensure they are in your app.config.js extra.firebase object.`;
  
  console.error('🚨 FIREBASE CONFIGURATION ERROR:', errorMessage);
  
  // CRITICAL: Never throw in production - this crashes the app before React renders
  // Log the error and let initialization fail gracefully
  console.error('⚠️  Firebase will not be initialized. App will continue but Firebase features will not work.');
  console.error('   Please fix Firebase configuration and rebuild the app.');
}

// Firebase configuration
// CRITICAL: Validate config before creating it - Firebase throws if values are invalid
const canInitializeFirebase = apiKey && apiKey.trim() !== '' && 
                               messagingSenderId && messagingSenderId.trim() !== '' && 
                               appId && appId.trim() !== '';

const firebaseConfig = canInitializeFirebase ? {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
} : null;

// Initialize Firebase with error handling
let firebaseApp: any;
let authInstance: any;
let firebaseDb: any;
let firebaseStorage: any;

// CRITICAL: Check config before trying to initialize
// This prevents Firebase from throwing with invalid config
if (!canInitializeFirebase || !firebaseConfig) {
  // Set all to null - app will continue without Firebase
  firebaseApp = null;
  authInstance = null;
  firebaseDb = null;
  firebaseStorage = null;
  
  // Log error but don't throw - this is at module load time
  console.error('🚨 FIREBASE CONFIGURATION INCOMPLETE - App will continue but Firebase features will not work');
  console.error('   Missing required fields. Please check your Firebase configuration.');
  console.error('   Required: EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, EXPO_PUBLIC_FIREBASE_APP_ID');
} else {
  // Only try to initialize if we have valid config
  try {
    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    
    // PRODUCTION: Use live Firebase Auth (no emulator for production readiness)
    // Emulator was used for development testing, now using production Firebase
    
    // Initialize Firebase Authentication with persistence
    authInstance = initializeFirebaseAuth(firebaseApp);
    
    // Initialize Cloud Firestore and get a reference to the service
    firebaseDb = getFirestore(firebaseApp);
    
    // Initialize Firebase Storage and get a reference to the service
    firebaseStorage = getStorage(firebaseApp);
    
    if (__DEV__) {
      logger.info('Firebase initialized successfully', { projectId }, 'firebase');
    }
  } catch (error: any) {
    // CRITICAL: Never throw in production - this crashes the app before React renders
    // All errors are caught here and handled gracefully
    
    const errorMessage = `Failed to initialize Firebase: ${error?.message || 'Unknown error'}`;
    
    // Set to null if not already set
    firebaseApp = null;
    authInstance = null;
    firebaseDb = null;
    firebaseStorage = null;
    
    console.error('🚨 FIREBASE INITIALIZATION ERROR:', errorMessage);
    console.error('Firebase config:', {
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId: messagingSenderId ? `${messagingSenderId.substring(0, 10)}...` : 'MISSING',
      appId: appId ? `${appId.substring(0, 10)}...` : 'MISSING'
    });
    
    // CRITICAL: Never throw - this crashes the app before React renders
    // Instead, log the error and create safe fallback objects
    // The app can still render, and Firebase-dependent features will gracefully fail
    console.error('🚨 FIREBASE INITIALIZATION FAILED - App will continue but Firebase features will not work');
    console.error('   This is a critical error. Please check your Firebase configuration.');
    console.error('   Error:', errorMessage);
    
    // Log to error tracking if available
    try {
      logger.error('Firebase initialization failed - app will continue without Firebase', {
        error: errorMessage,
        config: {
          hasApiKey: !!apiKey,
          hasMessagingSenderId: !!messagingSenderId,
          hasAppId: !!appId,
          projectId,
          authDomain
        }
      }, 'firebase');
    } catch (logError) {
      // Ignore logging errors
    }
  }
}

// Export Firebase services (using const exports for compatibility)
export const app = firebaseApp;
export const auth = authInstance;
export const db = firebaseDb;
export const storage = firebaseStorage;

// Firebase Authentication functions for email-only flow
export const firebaseAuth = {
  // Send sign-in link to email (passwordless authentication)
  async sendSignInLink(email: string, actionCodeSettings?: any) {
    try {
      const defaultSettings = {
        url: 'https://wesplit.app/auth', // Replace with your app's auth URL
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.wesplit.app'
        },
        android: {
          packageName: 'com.wesplit.app',
          installApp: true,
          minimumVersion: '12'
        },
        dynamicLinkDomain: 'wesplit.page.link' // Replace with your dynamic link domain
      };

      const settings = actionCodeSettings || defaultSettings;
      
      await sendSignInLinkToEmail(auth, email, settings);
      
      // Save the email for later use
      // SECURITY: Use SecureStore instead of AsyncStorage for email storage
      await SecureStore.setItemAsync('emailForSignIn', email, {
        requireAuthentication: false, // Email is less sensitive than private keys
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      throw error;
    }
  },

  // Check if the current URL is a sign-in link
  isSignInLink(url: string): boolean {
    if (!checkFirebaseInitialized()) {
      return false;
    }
    return isSignInWithEmailLink(auth, url);
  },

  // Sign in with email link
  async signInWithEmailLink(email: string, url: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot sign in.');
    }
    
    try {
      const result = await signInWithEmailLink(auth, email, url);
      return result.user;
    } catch (error) {
      console.error('Error signing in with email link:', error);
      throw error;
    }
  },

  // Create user with email and temporary password (for verification flow)
  async createUserWithEmail(email: string, temporaryPassword: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot create user.');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, temporaryPassword);
      return userCredential.user;
    } catch (error) {
      console.error('Error creating user with email:', error);
      throw error;
    }
  },

  // Sign in with email and password
  async signInWithEmail(email: string, password: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot sign in.');
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  },

  // Send email verification
  async sendEmailVerification(user: FirebaseUser) {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot send password reset email.');
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  },

  // Sign out
  async signOut() {
    if (!checkFirebaseInitialized()) {
      // Don't throw on signOut - just return silently if Firebase isn't initialized
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Check if email is verified
  isEmailVerified(user: FirebaseUser): boolean {
    return user.emailVerified;
  },

  // Social Authentication Methods
  // Google Sign In
  async signInWithGoogle(idToken: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot sign in with Google.');
    }
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

  // Apple Sign In
  async signInWithApple(idToken: string, nonce: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot sign in with Apple.');
    }
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken,
        rawNonce: nonce,
      });
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw error;
    }
  },

  // Twitter Sign In
  async signInWithTwitter(accessToken: string, secret: string) {
    if (!checkFirebaseInitialized()) {
      throw new Error('Firebase is not initialized. Cannot sign in with Twitter.');
    }
    try {
      const credential = TwitterAuthProvider.credential(accessToken, secret);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Twitter:', error);
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    if (!checkFirebaseInitialized()) {
      // Return a no-op unsubscribe function if Firebase isn't initialized
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  // Get stored email for sign-in
  // SECURITY: Uses SecureStore instead of AsyncStorage for email storage
  async getStoredEmail(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('emailForSignIn');
    } catch (error) {
      console.error('Error getting stored email:', error);
      return null;
    }
  },

  // Clear stored email
  // SECURITY: Uses SecureStore instead of AsyncStorage for email storage
  async clearStoredEmail() {
    try {
      await SecureStore.deleteItemAsync('emailForSignIn');
    } catch (error) {
      console.error('Error clearing stored email:', error);
    }
  }
};

// Firestore functions for user data and verification codes
export const firestoreService = {
  // Create or update user document
  async createUserDocument(user: FirebaseUser, walletData?: { address: string; publicKey: string }) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userData = {
        id: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        wallet_address: walletData?.address || '',
        wallet_public_key: walletData?.publicKey || '',
        created_at: new Date().toISOString(),
        avatar: user.photoURL || '',
        emailVerified: user.emailVerified,
        lastLoginAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(), // Track when user last verified
        hasCompletedOnboarding: false, // Track onboarding completion
        // Initialize points balance
        points: 0,
        total_points_earned: 0
      };

      await setDoc(userRef, userData, { merge: true });
      
      // Generate referral code and track referrals (non-blocking, fire and forget)
      (async () => {
        try {
          const { referralService } = await import('../services/rewards/referralService');
          const { userActionSyncService } = await import('../services/rewards/userActionSyncService');
          
          // Ensure referral code exists using centralized, uniqueness-checked logic
          await referralService.ensureUserHasReferralCode(user.uid);
          
          // Track referral if provided (check route params or query params)
          // Note: This would need to be passed from the signup flow
          // For now, we'll handle it in the signup screen
          
          // Sync account setup reward
          await userActionSyncService.syncAccountSetupPP(user.uid);
        } catch (rewardError) {
          console.error('Error setting up rewards for new user:', rewardError);
          // Don't fail user creation if rewards setup fails
        }
      })().catch(() => {}); // Swallow errors - non-blocking
      
      return userData;
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  },

  // Get user document
  async getUserDocument(uid: string) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user document:', error);
      throw error;
    }
  },

  // Check if user has verified within the last 30 days
  async hasVerifiedWithin30Days(email: string): Promise<boolean> {
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        if (__DEV__) {
          logger.debug('User not found for 30-day verification check', { email }, 'firebase');
        }
        return false; // User doesn't exist, needs verification
      }
      
      const userDoc = querySnapshot.docs[0];
      if (!userDoc) {
        if (__DEV__) {
          logger.debug('No user document found for 30-day verification check', { email }, 'firebase');
        }
        return false; // No user document found
      }
      const userData = userDoc.data();
      const lastVerifiedAt = userData.lastVerifiedAt;
      
      if (!lastVerifiedAt) {
        if (__DEV__) {
          logger.debug('No lastVerifiedAt field found for user', { email, userId: userData.id }, 'firebase');
        }
        return false; // No verification record, needs verification
      }
      
      // Handle Firestore Timestamp objects (from serverTimestamp())
      let lastVerified: Date;
      if (lastVerifiedAt && typeof lastVerifiedAt.toDate === 'function') {
        // It's a Firestore Timestamp object
        lastVerified = lastVerifiedAt.toDate();
      } else if (typeof lastVerifiedAt === 'string') {
        // It's an ISO string
        lastVerified = new Date(lastVerifiedAt);
      } else if (lastVerifiedAt instanceof Date) {
        // It's already a Date object
        lastVerified = lastVerifiedAt;
      } else {
        // Try to parse it as a date
        lastVerified = new Date(lastVerifiedAt);
      }
      
      // Check if lastVerifiedAt is a valid date (not NaN)
      if (isNaN(lastVerified.getTime())) {
        console.warn('⚠️ Invalid lastVerifiedAt date found for user:', email, 'Value:', lastVerifiedAt, 'Type:', typeof lastVerifiedAt);
        // Fix the invalid date by updating it to current time
        await this.updateLastVerifiedAt(email);
        return true; // Allow user to proceed since we're fixing the issue
      }
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const hasVerifiedWithin30Days = lastVerified > thirtyDaysAgo;
      
      if (__DEV__) {
        logger.debug('30-day verification check', { 
          email, 
          lastVerified: lastVerified.toISOString(), 
          now: now.toISOString(), 
          thirtyDaysAgo: thirtyDaysAgo.toISOString(), 
          hasVerifiedWithin30Days,
          daysSinceVerification: Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24))
        }, 'firebase');
      }
      
      return hasVerifiedWithin30Days;
    } catch (error) {
      console.error('Error checking 30-day verification:', error);
      logger.error('Error checking 30-day verification', { error, email }, 'firebase');
      return false; // On error, require verification
    }
  },

  // Update user's last verification timestamp
  async updateLastVerifiedAt(email: string) {
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        if (!userDoc) {
          return; // No user document found
        }
        await updateDoc(userDoc.ref, {
          lastVerifiedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        
        if (__DEV__) {
          logger.info('Updated lastVerifiedAt for', { email }, 'firebase');
        }
      }
    } catch (error) {
      console.error('Error updating lastVerifiedAt:', error);
    }
  },

  // Fix users with invalid lastVerifiedAt dates
  async fixInvalidLastVerifiedAt() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      let fixedCount = 0;
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const lastVerifiedAt = userData.lastVerifiedAt;
        
        if (lastVerifiedAt) {
          const lastVerified = new Date(lastVerifiedAt);
          if (isNaN(lastVerified.getTime())) {
            console.warn('⚠️ Fixing invalid lastVerifiedAt for user:', userData.email, 'Value:', lastVerifiedAt);
            
            await updateDoc(doc.ref, {
              lastVerifiedAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            });
            
            fixedCount++;
          }
        }
      }
      
      if (fixedCount > 0) {
        logger.info('Fixed users with invalid lastVerifiedAt dates', { fixedCount }, 'firebase');
      }
      
      return fixedCount;
    } catch (error) {
      console.error('Error fixing invalid lastVerifiedAt dates:', error);
      return 0;
    }
  },

  // Check if existing user should be considered as having completed onboarding
  async shouldSkipOnboardingForExistingUser(userData: any): Promise<boolean> {
    try {
      // If user explicitly has hasCompletedOnboarding field, use that
      if (userData.hasCompletedOnboarding !== undefined) {
        return userData.hasCompletedOnboarding;
      }

      // For existing users without the field, check if they have activity that suggests they've used the app
      // Check if user has a wallet address (indicates they've gone through the setup process)
      if (userData.wallet_address && userData.wallet_address.trim() !== '') {
        if (__DEV__) {
          logger.info('Existing user has wallet, assuming onboarding completed', null, 'firebase');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Check if user has a name (indicates they've created a profile)
      if (userData.name && userData.name.trim() !== '') {
        if (__DEV__) {
          logger.info('Existing user has name, assuming onboarding completed', null, 'firebase');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Check if user has been verified before (indicates they've used the app)
      if (userData.lastVerifiedAt) {
        if (__DEV__) {
          logger.info('Existing user has verification history, assuming onboarding completed', null, 'firebase');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Default to false for truly new users
      if (__DEV__) {
        logger.info('Existing user has no activity indicators, requiring onboarding', null, 'firebase');
      }
      return false;
    } catch (error) {
      console.error('Error checking onboarding status for existing user:', error);
      return false; // Default to requiring onboarding on error
    }
  },

  // Update existing user's onboarding status
  async updateExistingUserOnboardingStatus(userId: string, hasCompletedOnboarding: boolean) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        hasCompletedOnboarding: hasCompletedOnboarding,
        updated_at: new Date().toISOString()
      });
      
      if (__DEV__) {
        logger.info('Updated onboarding status for user', { userId, hasCompletedOnboarding }, 'firebase');
      }
    } catch (error) {
      console.error('Error updating existing user onboarding status:', error);
      // Don't throw error, just log it
    }
  },

  // Update user wallet information
  async updateUserWallet(uid: string, walletData: { address: string; publicKey: string }) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        wallet_address: walletData.address,
        wallet_public_key: walletData.publicKey,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user wallet:', error);
      throw error;
    }
  },

  // Update user document
  async updateUserDocument(uid: string, profileData: any) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...profileData,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user document:', error);
      throw error;
    }
  },

  // Store verification code in Firestore
  async storeVerificationCode(email: string, code: string, expiresAt: Date) {
    try {
      // First, clean up any existing unused codes for this email
      const verificationRef = collection(db, 'verificationCodes');
      const existingCodesQuery = query(
        verificationRef,
        where('email', '==', email),
        where('used', '==', false)
      );
      const existingCodesSnapshot = await getDocs(existingCodesQuery);
      
      if (__DEV__) { 
        logger.info('Cleaning up existing unused codes', { count: existingCodesSnapshot.docs.length, email }, 'firebase');
      }
      
      // Delete existing unused codes
      const deletePromises = existingCodesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Store the new verification code
      await addDoc(verificationRef, {
        email,
        code,
        expiresAt,
        createdAt: new Date().toISOString(),
        used: false
      });
      
      if (__DEV__) { 
        logger.info('Stored new verification code', { code, email }, 'firebase');
      }
    } catch (error) {
      console.error('Error storing verification code:', error);
      throw error;
    }
  },

  // Verify code from Firestore
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      if (__DEV__) { logger.debug('Looking for code', { code, email }, 'firebase'); }
      
      const verificationRef = collection(db, 'verificationCodes');
      const q = query(
        verificationRef,
        where('email', '==', email),
        where('code', '==', code),
        where('used', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (__DEV__) { logger.debug('Found matching documents', { count: querySnapshot.docs.length }, 'firebase'); }
      
      // Debug: Show all verification codes for this email
      if (__DEV__) {
        const allCodesQuery = query(
          verificationRef,
          where('email', '==', email)
        );
        const allCodesSnapshot = await getDocs(allCodesQuery);
        logger.debug('All codes for this email', { 
          codes: allCodesSnapshot.docs.map(doc => ({
            id: doc.id,
            code: doc.data().code,
            used: doc.data().used,
            expiresAt: doc.data().expiresAt,
            createdAt: doc.data().createdAt
          }))
        }, 'firebase');
      }
      
      if (querySnapshot.empty) {
        if (__DEV__) { logger.debug('No matching documents found', null, 'firebase'); }
        return false;
      }

      const doc = querySnapshot.docs[0];
      if (!doc) {
        return false; // No document found
      }
      const data = doc.data();
      
      if (__DEV__) { logger.debug('Document data', { data }, 'firebase'); }
      
      // Check if code is expired
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      const now = new Date();
      
      if (__DEV__) { logger.debug('Code expires at', { expiresAt, now }, 'firebase'); }
      
      if (now > expiresAt) {
        if (__DEV__) { logger.debug('Code is expired', null, 'firebase'); }
        return false;
      }

      // Mark code as used
      if (!doc) {
        return false; // No document found
      }
      await updateDoc(doc.ref, { used: true });
      
      if (__DEV__) { logger.info('Code verified successfully', null, 'firebase'); }
      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      return false;
    }
  },

  // Clean up expired verification codes
  async cleanupExpiredCodes() {
    try {
      const verificationRef = collection(db, 'verificationCodes');
      const q = query(verificationRef, where('expiresAt', '<', new Date()));
      
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      logger.info('Cleaned up expired verification codes', { count: querySnapshot.docs.length }, 'firebase');
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
};

export default app; 