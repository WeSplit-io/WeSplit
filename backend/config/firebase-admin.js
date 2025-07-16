const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      return admin.apps[0];
    }

    // Try to load service account from JSON file first
    const fs = require('fs');
    const path = require('path');
    const serviceAccountPath = path.join(__dirname, '../wesplit-35186-firebase-adminsdk-fbsvc-2b1bb8a520.json');
    
    let serviceAccount;
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log('📁 Loading Firebase credentials from service account JSON file');
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } else {
      console.log('📁 Loading Firebase credentials from environment variables');
      // Fallback to environment variables
      serviceAccount = {
        type: process.env.FIREBASE_TYPE || 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };
    }

    // Check if we have the required credentials
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.warn('⚠️ Firebase Admin credentials not found. Using default app initialization.');
      
      // Try to initialize with default credentials (for development)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      // Initialize with service account
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }

    console.log('✅ Firebase Admin SDK initialized successfully');
    return admin.app();
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Get Firebase Auth instance
const getAuth = () => {
  return admin.auth();
};

// Get Firestore instance (if needed)
const getFirestore = () => {
  return admin.firestore();
};

module.exports = {
  initializeFirebaseAdmin,
  getAuth,
  getFirestore,
  admin
}; 