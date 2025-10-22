/**
 * Firebase persistence configuration for React Native
 * Handles AsyncStorage persistence for Firebase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { logger } from '../../services/core';

/**
 * Initialize Firebase Auth with React Native persistence
 * This prevents the warning about missing AsyncStorage persistence
 */
export function initializeFirebaseAuth(app: any) {
  try {
    // Always try to initialize with AsyncStorage persistence first
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // If initialization fails (e.g., already initialized), try to get existing instance
    try {
      logger.info('Firebase Auth already initialized, getting existing instance', null, 'firebasePersistence');
      return getAuth(app);
    } catch (getAuthError) {
      // If both fail, fallback to basic initialization
      console.warn('Failed to initialize Firebase Auth with persistence, using basic initialization:', getAuthError);
      return initializeAuth(app);
    }
  }
} 