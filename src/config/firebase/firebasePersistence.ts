/**
 * Firebase persistence configuration for React Native
 * Handles AsyncStorage persistence for Firebase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth } from 'firebase/auth';
import { logger } from '../../services/analytics/loggingService';

/**
 * Initialize Firebase Auth with React Native persistence
 * This prevents the warning about missing AsyncStorage persistence
 */
export function initializeFirebaseAuth(app: any) {
  try {
    // Try to get ReactNativePersistence if available, otherwise use basic initialization
    let persistence: any = undefined;
    try {
      // Dynamic import to handle cases where getReactNativePersistence might not be available
      const authModule = require('firebase/auth');
      if (authModule.getReactNativePersistence) {
        persistence = authModule.getReactNativePersistence(AsyncStorage);
      }
    } catch {
      // getReactNativePersistence not available, will use default persistence
    }
    
    // Always try to initialize with AsyncStorage persistence first
    return initializeAuth(app, persistence ? {
      persistence: persistence
    } : {});
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