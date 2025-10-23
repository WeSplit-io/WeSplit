const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { initializeFirebaseAdmin, getFirestore } = require('../config/firebase-admin');

// Initialize Firebase Admin
initializeFirebaseAdmin();
const db = getFirestore();

// Email configuration (configure for production)
const emailTransporter = process.env.NODE_ENV === 'production' 
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    })
  : null; // Skip email transporter in development

// Generate a random 4-digit code
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationCode(email) {
  try {
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';
    
    console.log('🧹 Email sanitization:', { original: email, sanitized: sanitizedEmail });
    
    // 1. Create or get Firebase user (if Firebase Admin is available)
    let firebaseUid = null;
    try {
      const { getAuth } = require('firebase-admin/auth');
      const auth = getAuth();
      
      try {
        const firebaseUser = await auth.getUserByEmail(sanitizedEmail);
        firebaseUid = firebaseUser.uid;
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          const firebaseUser = await auth.createUser({ email: sanitizedEmail });
          firebaseUid = firebaseUser.uid;
        } else {
          console.warn('Firebase user creation failed:', e.message);
        }
      }
    } catch (firebaseError) {
      console.warn('Firebase Admin not available:', firebaseError.message);
    }

    // 2. Generate code
    const code = generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // 3. Store code in Firestore
    const verificationRef = db.collection('verification_codes').doc();
    await verificationRef.set({
      email: sanitizedEmail,
      code,
      firebaseUid,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verifiedAt: null
    });

    // 4. Send email
    if (process.env.NODE_ENV === 'production' && emailTransporter) {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: sanitizedEmail,
        subject: 'Your WeSplit Verification Code',
        html: `<h2>Your WeSplit verification code:</h2><h1>${code}</h1><p>This code expires in 10 minutes.</p>`
      });
    } else {
      console.log(`\n🔐 [DEV] EMAIL VERIFICATION CODE FOR ${sanitizedEmail}: ${code}`);
      console.log('📧 Email sending skipped in development mode');
      console.log('📱 Use this code in your mobile app to continue\n');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendVerificationCode:', error);
    throw error;
  }
}

async function verifyCode(email, code) {
  try {
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';
    
    console.log('🧹 Email sanitization in verifyCode:', { original: email, sanitized: sanitizedEmail });
    
    // 1. Find the verification code in Firestore
    const verificationQuery = await db.collection('verification_codes')
      .where('email', '==', sanitizedEmail)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (verificationQuery.empty) {
      return { success: false, error: 'No verification code found' };
    }

    const verificationDoc = verificationQuery.docs[0];
    const verificationData = verificationDoc.data();

    // 2. Check if code is expired
    if (new Date() > verificationData.expiresAt.toDate()) {
      await verificationDoc.ref.delete();
      return { success: false, error: 'Verification code expired' };
    }

    // 3. Check attempts
    if (verificationData.attempts >= 3) {
      await verificationDoc.ref.delete();
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }

    // 4. Verify code
    if (verificationData.code !== code) {
      await verificationDoc.ref.update({
        attempts: verificationData.attempts + 1
      });
      return { success: false, error: 'Invalid verification code' };
    }

    // 5. Code is valid - mark as verified and get/create user
    await verificationDoc.ref.update({
      verifiedAt: new Date()
    });

    // 6. Get or create user in Firestore
    let userData = null;
    if (verificationData.firebaseUid) {
      const userRef = db.collection('users').doc(verificationData.firebaseUid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        userData = userDoc.data();
        // Update last verification timestamp for existing user
        // IMPORTANT: Preserve existing wallet information
        const updateData = {
          lastVerifiedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        
        // Only update wallet fields if they don't exist (preserve existing wallets)
        if (!userData.wallet_address) {
          updateData.wallet_address = '';
        }
        if (!userData.wallet_public_key) {
          updateData.wallet_public_key = '';
        }
        
        // CRITICAL: Never overwrite existing username/name
        // Only add name if user doesn't have any
        if (!userData.name || userData.name.trim() === '') {
          updateData.name = '';
        }
        
        // CRITICAL: Never overwrite existing avatar
        // Only add avatar if user doesn't have any
        if (!userData.avatar) {
          updateData.avatar = '';
        }
        
        await userRef.update(updateData);
        
        console.log(`Existing user ${email} verified. Wallet preserved: ${userData.wallet_address}, Name preserved: ${userData.name}`);
        
        // Return user data with proper structure
        return {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            walletAddress: userData.wallet_address,
            walletPublicKey: userData.wallet_public_key,
            createdAt: userData.created_at,
            avatar: userData.avatar,
            hasCompletedOnboarding: userData.hasCompletedOnboarding || false
          },
          accessToken,
          refreshToken
        };
      } else {
        // Create new user document
        const { getAuth } = require('firebase-admin/auth');
        const auth = getAuth();
        const firebaseUser = await auth.getUser(verificationData.firebaseUid);
        
        userData = {
          id: verificationData.firebaseUid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          wallet_address: '',
          wallet_public_key: '',
          created_at: new Date().toISOString(),
          avatar: firebaseUser.photoURL || '',
          emailVerified: true,
          lastLoginAt: new Date().toISOString(),
          lastVerifiedAt: new Date().toISOString(), // Track when user last verified
          hasCompletedOnboarding: false // New users need onboarding
        };
        
        await userRef.set(userData);
        console.log(`New user ${email} created without wallet`);
        
        // Return user data with proper structure
        return {
          success: true,
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            walletAddress: userData.wallet_address,
            walletPublicKey: userData.wallet_public_key,
            createdAt: userData.created_at,
            avatar: userData.avatar,
            hasCompletedOnboarding: userData.hasCompletedOnboarding
          },
          accessToken,
          refreshToken
        };
      }
    }

    // 7. Generate JWT tokens
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

    const accessToken = jwt.sign(
      { 
        userId: userData?.id || email, 
        email,
        type: 'access'
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { 
        userId: userData?.id || email, 
        email,
        type: 'refresh'
      }, 
      JWT_SECRET, 
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Store refresh token in Firestore
    await db.collection('refresh_tokens').doc(refreshToken).set({
      userId: userData?.id || email,
      email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return { 
      success: true,
      user: userData ? {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        walletAddress: userData.wallet_address,
        walletPublicKey: userData.wallet_public_key,
        avatar: userData.avatar,
        createdAt: userData.created_at
      } : null,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Error in verifyCode:', error);
    throw error;
  }
}

module.exports = {
  sendVerificationCode,
  verifyCode
}; 