import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  updateProfile,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initializeFirebaseAuth } from './firebasePersistence';

// Get environment variables from Expo Constants
const getEnvVar = (key: string): string => {
  // Try to get from process.env first (for development)
  if (process.env[key]) {
    return process.env[key]!;
  }
  
  // Try to get from Expo Constants
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Try to get from Constants.manifest (older Expo versions)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return (Constants.manifest as any).extra[key];
  }
  
  return '';
};

// Get Firebase configuration values
const apiKey = getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY');
const authDomain = getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
const projectId = getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID') || "wesplit-35186";
const storageBucket = getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
const messagingSenderId = getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
const appId = getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID');

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

// Initialize Firebase Authentication with persistence
export const auth = initializeFirebaseAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

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
      await AsyncStorage.setItem('emailForSignIn', email);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending sign-in link:', error);
      throw error;
    }
  },

  // Check if the current URL is a sign-in link
  isSignInLink(url: string): boolean {
    return isSignInWithEmailLink(auth, url);
  },

  // Sign in with email link
  async signInWithEmailLink(email: string, url: string) {
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
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  },

  // Sign out
  async signOut() {
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
    return onAuthStateChanged(auth, callback);
  },

  // Get stored email for sign-in
  async getStoredEmail(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('emailForSignIn');
    } catch (error) {
      console.error('Error getting stored email:', error);
      return null;
    }
  },

  // Clear stored email
  async clearStoredEmail() {
    try {
      await AsyncStorage.removeItem('emailForSignIn');
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
        hasCompletedOnboarding: false // Track onboarding completion
      };

      await setDoc(userRef, userData, { merge: true });
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
        return false; // User doesn't exist, needs verification
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const lastVerifiedAt = userData.lastVerifiedAt;
      
      if (!lastVerifiedAt) {
        return false; // No verification record, needs verification
      }
      
      // Check if last verification was within the last 30 days
      const lastVerified = new Date(lastVerifiedAt);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const hasVerifiedWithin30Days = lastVerified > thirtyDaysAgo;
      
      if (__DEV__) {
        console.log('📅 30-day verification check for', email);
        console.log('Last verified:', lastVerified);
        console.log('Current date:', now);
        console.log('30 days ago:', thirtyDaysAgo);
        console.log('Has verified within 30 days:', hasVerifiedWithin30Days);
      }
      
      return hasVerifiedWithin30Days;
    } catch (error) {
      console.error('Error checking 30-day verification:', error);
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
        await updateDoc(userDoc.ref, {
          lastVerifiedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        
        if (__DEV__) {
          console.log('✅ Updated lastVerifiedAt for', email);
        }
      }
    } catch (error) {
      console.error('Error updating lastVerifiedAt:', error);
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
          console.log('✅ Existing user has wallet, assuming onboarding completed');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Check if user has a name (indicates they've created a profile)
      if (userData.name && userData.name.trim() !== '') {
        if (__DEV__) {
          console.log('✅ Existing user has name, assuming onboarding completed');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Check if user has been verified before (indicates they've used the app)
      if (userData.lastVerifiedAt) {
        if (__DEV__) {
          console.log('✅ Existing user has verification history, assuming onboarding completed');
        }
        // Update the user document to set hasCompletedOnboarding to true
        await this.updateExistingUserOnboardingStatus(userData.id, true);
        return true;
      }

      // Default to false for truly new users
      if (__DEV__) {
        console.log('❓ Existing user has no activity indicators, requiring onboarding');
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
        console.log(`✅ Updated onboarding status for user ${userId}: ${hasCompletedOnboarding}`);
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
        console.log('🧹 Cleaning up', existingCodesSnapshot.docs.length, 'existing unused codes for', email);
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
        console.log('💾 Stored new verification code:', code, 'for email:', email);
      }
    } catch (error) {
      console.error('Error storing verification code:', error);
      throw error;
    }
  },

  // Verify code from Firestore
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      if (__DEV__) { console.log('🔍 Firestore: Looking for code', code, 'for email', email); }
      
      const verificationRef = collection(db, 'verificationCodes');
      const q = query(
        verificationRef,
        where('email', '==', email),
        where('code', '==', code),
        where('used', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (__DEV__) { console.log('🔍 Firestore: Found', querySnapshot.docs.length, 'matching documents'); }
      
      // Debug: Show all verification codes for this email
      if (__DEV__) {
        const allCodesQuery = query(
          verificationRef,
          where('email', '==', email)
        );
        const allCodesSnapshot = await getDocs(allCodesQuery);
        console.log('🔍 Firestore: All codes for this email:', allCodesSnapshot.docs.map(doc => ({
          id: doc.id,
          code: doc.data().code,
          used: doc.data().used,
          expiresAt: doc.data().expiresAt,
          createdAt: doc.data().createdAt
        })));
      }
      
      if (querySnapshot.empty) {
        if (__DEV__) { console.log('🔍 Firestore: No matching documents found'); }
        return false;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      if (__DEV__) { console.log('🔍 Firestore: Document data:', data); }
      
      // Check if code is expired
      const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      const now = new Date();
      
      if (__DEV__) { console.log('🔍 Firestore: Code expires at:', expiresAt, 'Current time:', now); }
      
      if (now > expiresAt) {
        if (__DEV__) { console.log('🔍 Firestore: Code is expired'); }
        return false;
      }

      // Mark code as used
      await updateDoc(doc.ref, { used: true });
      
      if (__DEV__) { console.log('🔍 Firestore: Code verified successfully'); }
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
      
      console.log(`Cleaned up ${querySnapshot.docs.length} expired verification codes`);
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
};

export default app; 