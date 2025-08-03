import { auth, db } from '../config/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';

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
      console.log('🔥 Firebase Configuration Check:');
      console.log('  - Auth initialized:', !!auth);
      console.log('  - Firestore initialized:', !!db);
      console.log('  - Project ID:', config.projectId || 'NOT SET');
      console.log('  - API Key:', config.apiKey ? 'SET' : 'NOT SET');
    }

    return {
      isConfigured: !!(auth && db && config.projectId && config.apiKey),
      config
    };
  } catch (error) {
    if (__DEV__) {
      console.log('🔥 Firebase Configuration Check:');
      console.log('  - Auth initialized:', !!auth);
      console.log('  - Firestore initialized:', !!db);
      console.log('  - Project ID: NOT SET');
      console.log('  - API Key: NOT SET');
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
      console.log('✅ Firebase connection test successful');
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