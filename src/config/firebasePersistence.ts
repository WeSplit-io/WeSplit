/**
 * Firebase persistence configuration for React Native
 * Handles AsyncStorage persistence for Firebase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';

/**
 * Initialize Firebase Auth with React Native persistence
 * This prevents the warning about missing AsyncStorage persistence
 */
export function initializeFirebaseAuth(app: any) {
  try {
    // Try to get existing auth instance first
    return getAuth(app);
  } catch (error) {
    // If no auth instance exists, initialize with AsyncStorage persistence
    try {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (persistenceError) {
      // Fallback to basic initialization if persistence fails
      console.warn('Failed to initialize Firebase Auth with persistence, using basic initialization:', persistenceError);
      return initializeAuth(app);
    }
  }
} 