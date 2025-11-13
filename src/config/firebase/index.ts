/**
 * Firebase Configuration
 * Centralized exports for all Firebase-related configuration
 */

export { db, auth, storage } from './firebase';
export { initializeFirebaseAuth } from './firebasePersistence';
// firebaseConfig doesn't exist as named export - use default export instead
export { default as firebaseConfig } from './firebaseProduction';
