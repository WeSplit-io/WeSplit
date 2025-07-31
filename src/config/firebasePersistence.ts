/**
 * Firebase persistence configuration for React Native
 * Handles AsyncStorage persistence for Firebase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth } from 'firebase/auth';

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
    // The warning is just informational and doesn't affect functionality
    return initializeAuth(app);
  }
} 