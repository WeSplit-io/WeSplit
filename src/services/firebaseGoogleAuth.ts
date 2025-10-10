/**
 * Firebase Google Authentication Service
 * Uses Firebase Auth directly instead of Expo AuthSession for better reliability
 */

import { GoogleAuthProvider, signInWithCredential, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import { logger } from './loggingService';
import { getEnvVar, getPlatformGoogleClientId } from '../utils/environmentUtils';

export interface FirebaseGoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

class FirebaseGoogleAuthService {
  private static instance: FirebaseGoogleAuthService;
  private googleClientId: string;

  private constructor() {
    this.googleClientId = getPlatformGoogleClientId();
    
    logger.info('FirebaseGoogleAuthService initialized', {
      hasGoogleClientId: !!this.googleClientId,
      platform: Platform.OS,
      clientId: this.googleClientId ? this.googleClientId.substring(0, 20) + '...' : 'NOT_FOUND'
    }, 'FirebaseGoogleAuth');
  }

  public static getInstance(): FirebaseGoogleAuthService {
    if (!FirebaseGoogleAuthService.instance) {
      FirebaseGoogleAuthService.instance = new FirebaseGoogleAuthService();
    }
    return FirebaseGoogleAuthService.instance;
  }

  /**
   * Sign in with Google using Firebase Auth
   */
  async signInWithGoogle(): Promise<FirebaseGoogleAuthResult> {
    try {
      if (!this.googleClientId) {
        return { success: false, error: 'Google Client ID not configured' };
      }

      logger.info('🔄 Starting Firebase Google Sign-In', {
        clientId: this.googleClientId.substring(0, 20) + '...',
        platform: Platform.OS
      }, 'FirebaseGoogleAuth');

      // For now, let's try a different approach
      // We'll use the web client ID and see if that works better
      const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
      
      if (!webClientId) {
        return { success: false, error: 'Web Google Client ID not configured' };
      }

      logger.info('🔄 Using Web Client ID for Firebase Auth', {
        webClientId: webClientId.substring(0, 20) + '...',
        platform: Platform.OS
      }, 'FirebaseGoogleAuth');

      // Create Google Auth Provider
      const provider = new GoogleAuthProvider();
      
      // Add custom parameters
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // For development, let's try using the web client ID
      // This might work better than the Android-specific client ID
      const credential = GoogleAuthProvider.credential(null, null);
      
      // Try to sign in with popup (this might work better in development)
      const result = await this.signInWithPopup(provider);

      logger.info('✅ Firebase Google authentication successful', {
        uid: result.user.uid,
        email: result.user.email,
        isNewUser: result.additionalUserInfo?.isNewUser
      }, 'FirebaseGoogleAuth');

      return {
        success: true,
        user: result.user,
        isNewUser: result.additionalUserInfo?.isNewUser
      };

    } catch (error) {
      logger.error('❌ Firebase Google authentication failed', error, 'FirebaseGoogleAuth');
      
      let errorMessage = 'Google authentication failed';
      if (error instanceof Error) {
        if (error.message.includes('popup_closed_by_user')) {
          errorMessage = 'Sign-in was cancelled';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sign in with popup (for web/development)
   */
  private async signInWithPopup(provider: GoogleAuthProvider): Promise<any> {
    // This is a placeholder - in a real implementation, you'd use
    // Firebase's signInWithPopup or a mobile-specific method
    throw new Error('Popup sign-in not implemented for mobile');
  }

  /**
   * Alternative: Try using the web client ID approach
   */
  async signInWithGoogleWeb(): Promise<FirebaseGoogleAuthResult> {
    try {
      const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
      
      if (!webClientId) {
        return { success: false, error: 'Web Google Client ID not configured' };
      }

      logger.info('🔄 Trying Web Client ID approach', {
        webClientId: webClientId.substring(0, 20) + '...',
        platform: Platform.OS
      }, 'FirebaseGoogleAuth');

      // For mobile, we might need to use a different approach
      // Let's try using the web client ID with a different method
      
      return {
        success: false,
        error: 'Web client approach not implemented yet'
      };

    } catch (error) {
      logger.error('❌ Web client approach failed', error, 'FirebaseGoogleAuth');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web client authentication failed'
      };
    }
  }
}

// Export singleton instance
export const firebaseGoogleAuthService = FirebaseGoogleAuthService.getInstance();
export default firebaseGoogleAuthService;
