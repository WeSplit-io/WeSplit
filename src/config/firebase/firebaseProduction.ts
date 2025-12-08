/**
 * Production Firebase Configuration
 * Handles environment variable loading issues in production builds
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { logger } from '../../services/analytics/loggingService';

// Comprehensive environment variable getter
const getEnvVar = (key: string): string => {
  // Try all possible sources
  const sources = [
    process.env[key],
    process.env[`EXPO_PUBLIC_${key}`],
    Constants.expoConfig?.extra?.[key],
    Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`],
    (Constants.manifest as any)?.extra?.[key],
    (Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]
  ];
  
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim() !== '') {
      return source.trim();
    }
  }
  
  return '';
};

// Get Firebase configuration with fallbacks
// Returns null if required fields are missing (instead of throwing)
const getFirebaseConfig = (): any => {
  const apiKey = getEnvVar('FIREBASE_API_KEY');
  const authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
  const projectId = getEnvVar('FIREBASE_PROJECT_ID') || "wesplit-35186";
  const storageBucket = getEnvVar('FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
  const messagingSenderId = getEnvVar('FIREBASE_MESSAGING_SENDER_ID');
  const appId = getEnvVar('FIREBASE_APP_ID');
  
  // Log configuration loading for debugging
  logger.info('Firebase Configuration Loading', {
    apiKey: apiKey ? `${apiKey.substring(0, 20)}...` : 'MISSING',
    authDomain: authDomain || 'MISSING',
    projectId: projectId || 'MISSING',
    storageBucket: storageBucket || 'MISSING',
    messagingSenderId: messagingSenderId || 'MISSING',
    appId: appId ? `${appId.substring(0, 20)}...` : 'MISSING',
    environment: getEnvVar('NODE_ENV') || 'unknown'
  }, 'firebaseProduction');
  
  // Validate required fields
  const missingFields = [];
  if (!apiKey) {missingFields.push('FIREBASE_API_KEY');}
  if (!messagingSenderId) {missingFields.push('FIREBASE_MESSAGING_SENDER_ID');}
  if (!appId) {missingFields.push('FIREBASE_APP_ID');}
  
  if (missingFields.length > 0) {
    const errorMessage = `Missing required Firebase configuration: ${missingFields.join(', ')}`;
    logger.error('Firebase Configuration Error', { missingFields }, 'firebaseProduction');
    // CRITICAL: Don't throw - return null config and let initialization fail gracefully
    console.error('🚨 Firebase configuration incomplete. Returning null config.');
    console.error('   App will continue but Firebase features will not work.');
    return null; // Return null instead of throwing
  }
  
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  };
};

// Initialize Firebase with error handling
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let firebaseStorage: any = null;

export const initializeFirebaseProduction = () => {
  try {
    if (firebaseApp) {
      logger.info('Firebase already initialized, returning existing instance', null, 'firebaseProduction');
      return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
    }
    
    // Get configuration
    const config = getFirebaseConfig();
    
    // If config is null (missing required fields), return null instances
    if (!config) {
      console.error('🚨 Cannot initialize Firebase - configuration is incomplete');
      return { app: null, auth: null, db: null, storage: null };
    }
    
    // Initialize Firebase app
    firebaseApp = initializeApp(config);
    logger.info('Firebase app initialized successfully', { projectId: config.projectId }, 'firebaseProduction');
    
    // Initialize Firebase Auth with persistence
    try {
      // Try to get ReactNativePersistence if available
      let persistence: any = undefined;
      try {
        const authModule = require('firebase/auth');
        if (authModule.getReactNativePersistence) {
          persistence = authModule.getReactNativePersistence(AsyncStorage);
        }
      } catch {
        // getReactNativePersistence not available, will use default persistence
      }
      
      firebaseAuth = initializeAuth(firebaseApp, persistence ? {
        persistence: persistence
      } : {});
      logger.info('Firebase Auth initialized with persistence', null, 'firebaseProduction');
    } catch (authError: any) {
      if (authError.code === 'auth/already-initialized') {
        firebaseAuth = getAuth(firebaseApp);
        logger.info('Firebase Auth already initialized, using existing instance', null, 'firebaseProduction');
      } else {
        logger.error('Firebase Auth initialization failed', authError, 'firebaseProduction');
        throw authError;
      }
    }
    
    // Initialize Firestore
    firebaseDb = getFirestore(firebaseApp);
    logger.info('Firestore initialized successfully', null, 'firebaseProduction');
    
    // Initialize Storage
    firebaseStorage = getStorage(firebaseApp);
    logger.info('Firebase Storage initialized successfully', null, 'firebaseProduction');
    
    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firebaseDb,
      storage: firebaseStorage
    };
    
  } catch (error) {
    logger.error('Firebase initialization failed', error as Record<string, unknown>, 'firebaseProduction');
    throw error;
  }
};

// CRITICAL: Don't initialize at module load time - this can crash the app
// Initialize lazily on first access
let firebaseInstances: { app: any; auth: any; db: any; storage: any } | null = null;
let initializationAttempted = false;

const getFirebaseInstances = () => {
  if (!firebaseInstances && !initializationAttempted) {
    initializationAttempted = true;
    try {
      firebaseInstances = initializeFirebaseProduction();
    } catch (error: any) {
      console.error('🚨 Failed to initialize Firebase Production:', error?.message || error);
      // Return null objects to prevent crashes
      firebaseInstances = {
        app: null,
        auth: null,
        db: null,
        storage: null,
      };
    }
  }
  return firebaseInstances || { app: null, auth: null, db: null, storage: null };
};

// Export lazy getters - initialize on first access, not at module load
// This prevents crashes if initialization fails
export const app = new Proxy({} as any, {
  get(target, prop) {
    const instance = getFirebaseInstances().app;
    if (!instance) return undefined;
    return typeof instance[prop] === 'function' 
      ? instance[prop].bind(instance) 
      : instance[prop];
  }
});

export const auth = new Proxy({} as any, {
  get(target, prop) {
    const instance = getFirebaseInstances().auth;
    if (!instance) return undefined;
    return typeof instance[prop] === 'function' 
      ? instance[prop].bind(instance) 
      : instance[prop];
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    const instance = getFirebaseInstances().db;
    if (!instance) return undefined;
    return typeof instance[prop] === 'function' 
      ? instance[prop].bind(instance) 
      : instance[prop];
  }
});

export const storage = new Proxy({} as any, {
  get(target, prop) {
    const instance = getFirebaseInstances().storage;
    if (!instance) return undefined;
    return typeof instance[prop] === 'function' 
      ? instance[prop].bind(instance) 
      : instance[prop];
  }
});

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    const authInstance = getFirebaseInstances().auth;
    if (!authInstance) {
      logger.error('Firebase Auth not initialized', null, 'firebaseProduction');
      return false;
    }
    
    // Test basic Firebase functionality
    const currentUser = authInstance.currentUser;
    logger.info('Firebase connection test successful', { 
      hasCurrentUser: !!currentUser,
      userId: currentUser?.uid || 'none'
    }, 'firebaseProduction');
    
    return true;
  } catch (error) {
    logger.error('Firebase connection test failed', error as Record<string, unknown>, 'firebaseProduction');
    return false;
  }
};

// Network connectivity test
export const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Test basic network connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      logger.info('Network connectivity test successful', null, 'firebaseProduction');
      return true;
    } else {
      logger.warn('Network connectivity test failed', { status: response.status }, 'firebaseProduction');
      return false;
    }
  } catch (error) {
    logger.error('Network connectivity test failed', error as Record<string, unknown>, 'firebaseProduction');
    return false;
  }
};

// Comprehensive health check
export const runHealthCheck = async (): Promise<{
  firebase: boolean;
  network: boolean;
  overall: boolean;
  details: any;
}> => {
  logger.info('Starting production health check', null, 'firebaseProduction');
  
  const firebaseOk = await testFirebaseConnection();
  const networkOk = await testNetworkConnectivity();
  const overall = firebaseOk && networkOk;
  
  const details = {
    firebase: firebaseOk,
    network: networkOk,
    environment: getEnvVar('NODE_ENV'),
    projectId: getEnvVar('FIREBASE_PROJECT_ID'),
    timestamp: new Date().toISOString()
  };
  
  logger.info('Health check completed', details, 'firebaseProduction');
  
  return {
    firebase: firebaseOk,
    network: networkOk,
    overall,
    details
  };
};

export default { app, auth, db, storage, testFirebaseConnection, testNetworkConnectivity, runHealthCheck };
