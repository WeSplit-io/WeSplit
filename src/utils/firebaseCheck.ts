import { auth, db } from '../config/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { logger } from '../services/loggingService';

export const checkFirebaseConfiguration = () => {
  try {
    const app = getApp();
    const options = app.options;
    
    const config = {
      auth: !!auth,
      db: !!db,
      projectId: options.projectId,
      apiKey: options.apiKey,
    };

    if (__DEV__) {
      logger.info('Firebase Configuration Check', { authInitialized: !!auth, firestoreInitialized: !!db, projectId: config.projectId || 'NOT SET', apiKeySet: !!config.apiKey }, 'firebaseCheck');
    }

    return {
      isConfigured: !!(auth && db && config.projectId && config.apiKey),
      config
    };
  } catch (error) {
    if (__DEV__) {
      logger.warn('Firebase Configuration Check - Missing Config', { authInitialized: !!auth, firestoreInitialized: !!db, projectId: 'NOT SET', apiKeySet: false }, 'firebaseCheck');
    }

    return {
      isConfigured: false,
      config: { auth: !!auth, db: !!db, projectId: null, apiKey: null }
    };
  }
};

export const testFirebaseConnection = async () => {
  try {
    // Test Firestore connection by trying to read a document
    const testDoc = await getDoc(doc(db, 'test', 'connection-test'));
    
    if (__DEV__) {
      logger.info('Firebase connection test successful', null, 'firebaseCheck');
    }
    
    return { success: true, error: null };
  } catch (error) {
    if (__DEV__) {
      console.error('❌ Firebase connection test failed:', error);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}; 