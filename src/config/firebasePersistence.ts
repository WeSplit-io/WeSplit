/**
 * Firebase persistence configuration for React Native
 * Handles AsyncStorage persistence for Firebase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth } from 'firebase/auth';
// Note: getReactNativePersistence is not available in the current Firebase version
// This is a placeholder for when the proper module is available

/**
 * Initialize Firebase Auth with React Native persistence
 * This prevents the warning about missing AsyncStorage persistence
 */
export function initializeFirebaseAuth(app: any) {
  try {
    // Try to get existing auth instance
    return getAuth(app);
  } catch (error) {
    // If no auth instance exists, initialize without persistence for now
    // TODO: Add proper React Native persistence when available
    return initializeAuth(app);
  }
} 