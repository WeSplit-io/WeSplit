/**
 * Simple Google Authentication Service
 * Uses a different approach to avoid OAuth client issues
 */

import { GoogleAuthProvider, signInWithCredential, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import { logger } from './loggingService';
import { getEnvVar } from '../utils/environmentUtils';

export interface SimpleGoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

class SimpleGoogleAuthService {
  private static instance: SimpleGoogleAuthService;

  private constructor() {
    logger.info('SimpleGoogleAuthService initialized', {
      platform: Platform.OS
    }, 'SimpleGoogleAuth');
  }

  public static getInstance(): SimpleGoogleAuthService {
    if (!SimpleGoogleAuthService.instance) {
      SimpleGoogleAuthService.instance = new SimpleGoogleAuthService();
    }
    return SimpleGoogleAuthService.instance;
  }

  /**
   * Sign in with Google using a simplified approach
   */
  async signInWithGoogle(): Promise<SimpleGoogleAuthResult> {
    try {
      logger.info('🔄 Starting Simple Google Sign-In', {
        platform: Platform.OS
      }, 'SimpleGoogleAuth');

      // For now, let's create a test credential to see if Firebase Auth works
      // This is just for testing - we'll implement the real OAuth flow later
      
      // Check if we have the necessary configuration
      const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
      const androidClientId = getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
      
      logger.info('🔧 Configuration check', {
        hasWebClientId: !!webClientId,
        hasAndroidClientId: !!androidClientId,
        webClientId: webClientId ? webClientId.substring(0, 20) + '...' : 'NOT_FOUND',
        androidClientId: androidClientId ? androidClientId.substring(0, 20) + '...' : 'NOT_FOUND'
      }, 'SimpleGoogleAuth');

      // For testing purposes, let's try a different approach
      // We'll use the web client ID and see if that resolves the OAuth issue
      
      if (!webClientId) {
        return { success: false, error: 'Web Google Client ID not configured' };
      }

      // Create a Google Auth Provider
      const provider = new GoogleAuthProvider();
      
      // Add scopes
      provider.addScope('email');
      provider.addScope('profile');
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // For now, return an error indicating we need to implement the actual OAuth flow
      // But with the correct client ID configuration
      return {
        success: false,
        error: 'OAuth flow needs to be implemented with correct client ID: ' + webClientId.substring(0, 20) + '...'
      };

    } catch (error) {
      logger.error('❌ Simple Google authentication failed', error, 'SimpleGoogleAuth');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simple Google authentication failed'
      };
    }
  }

  /**
   * Test method to verify Firebase Auth is working
   */
  async testFirebaseAuth(): Promise<SimpleGoogleAuthResult> {
    try {
      logger.info('🧪 Testing Firebase Auth configuration', {
        platform: Platform.OS
      }, 'SimpleGoogleAuth');

      // Check if Firebase Auth is properly configured
      if (!auth) {
        return { success: false, error: 'Firebase Auth not initialized' };
      }

      // Check current user
      const currentUser = auth.currentUser;
      
      logger.info('🔍 Firebase Auth status', {
        hasCurrentUser: !!currentUser,
        currentUserEmail: currentUser?.email || 'none'
      }, 'SimpleGoogleAuth');

      return {
        success: true,
        error: 'Firebase Auth is working. Current user: ' + (currentUser?.email || 'none')
      };

    } catch (error) {
      logger.error('❌ Firebase Auth test failed', error, 'SimpleGoogleAuth');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Firebase Auth test failed'
      };
    }
  }
}

// Export singleton instance
export const simpleGoogleAuthService = SimpleGoogleAuthService.getInstance();
export default simpleGoogleAuthService;
