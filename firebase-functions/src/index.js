const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Import MoonPay functions
const moonpayFunctions = require('./moonpay.js');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred email service
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password'
  }
});

// Email template for verification codes
function generateEmailTemplate(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 32px;">WeSplit</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Your verification code</p>
      </div>
      
      <div style="padding: 40px; background: #f9f9f9;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
          You requested a verification code for your WeSplit account. Use the code below to complete your verification:
        </p>
        
        <div style="background: white; border: 2px solid #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
          <h1 style="color: #667eea; font-size: 48px; margin: 0; letter-spacing: 10px; font-family: 'Courier New', monospace;">${code}</h1>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © 2024 WeSplit. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * HTTP Callable Function: Send verification code via email
 */
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email, code } = data;
    
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';
    
    console.log('🧹 Email sanitization in Firebase Functions:', { original: email, sanitized: sanitizedEmail });
    
    // Validate input
    if (!sanitizedEmail || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and code are required');
    }
    
    if (!sanitizedEmail.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }
    
    if (!/^\d{4}$/.test(code)) {
      throw new functions.https.HttpsError('invalid-argument', 'Code must be 4 digits');
    }

    // Rate limiting: Check if too many requests for this email
    const rateLimitKey = `rate_limit_${sanitizedEmail}`;
    const rateLimitRef = db.collection('rateLimits').doc(rateLimitKey);
    const rateLimitDoc = await rateLimitRef.get();
    
    if (rateLimitDoc.exists) {
      const rateLimitData = rateLimitDoc.data();
      const lastRequest = rateLimitData?.lastRequest?.toDate();
      const now = new Date();
      
      // Allow only 1 request per minute per email
      if (lastRequest && (now.getTime() - lastRequest.getTime()) < 60000) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please wait 1 minute before requesting another code.');
      }
    }

    // Send email
    const mailOptions = {
      from: functions.config().email?.user || 'noreply@wesplit.app',
      to: sanitizedEmail,
      subject: 'WeSplit Verification Code',
      html: generateEmailTemplate(code)
    };

    await transporter.sendMail(mailOptions);
    
    // Update rate limit
    await rateLimitRef.set({
      email: sanitizedEmail,
      lastRequest: admin.firestore.FieldValue.serverTimestamp(),
      requestCount: admin.firestore.FieldValue.increment(1)
    });
    
    console.log(`Verification email sent to ${sanitizedEmail}`);
    
    return { 
      success: true, 
      message: 'Verification email sent successfully' 
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }
});

/**
 * HTTP Callable Function: Verify code
 */
exports.verifyCode = functions.https.onCall(async (data, context) => {
  try {
    const { email, code } = data;
    
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';
    
    console.log('🧹 Email sanitization in verifyCode Firebase Function:', { original: email, sanitized: sanitizedEmail });
    
    // Validate input
    if (!sanitizedEmail || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and code are required');
    }
    
    if (!sanitizedEmail.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }
    
    if (!/^\d{4}$/.test(code)) {
      throw new functions.https.HttpsError('invalid-argument', 'Code must be 4 digits');
    }

    // Find the verification code in Firestore
    const verificationRef = db.collection('verificationCodes');
    const q = verificationRef
      .where('email', '==', sanitizedEmail)
      .where('code', '==', code)
      .where('used', '==', false);
    
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid or expired verification code');
    }

    const doc = querySnapshot.docs[0];
    const verificationData = doc.data();
    
    // Check if code is expired
    const expiresAt = verificationData.expiresAt?.toDate ? 
      verificationData.expiresAt.toDate() : 
      new Date(verificationData.expiresAt);
    
    if (new Date() > expiresAt) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }

    // Create or get Firebase user first (before marking code as used)
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(sanitizedEmail);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        firebaseUser = await admin.auth().createUser({
          email: sanitizedEmail,
          emailVerified: true // Mark as verified since they used the code
        });
      } else {
        throw error;
      }
    }

    // Try to create custom token, but handle permission errors gracefully
    let customToken = null;
    try {
      customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    } catch (tokenError) {
      console.warn('Could not create custom token due to permissions:', tokenError.message);
      // Continue without custom token - the frontend will handle authentication
    }

    // Only mark code as used after all operations succeed
    await doc.ref.update({ 
      used: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Check if user already exists by email (to avoid duplicates)
    const existingUserQuery = await db.collection('users')
      .where('email', '==', sanitizedEmail)
      .limit(1)
      .get();
    
    let userDoc;
    
    if (!existingUserQuery.empty) {
      // User already exists, update the existing document
      userDoc = existingUserQuery.docs[0];
      await userDoc.ref.update({
        lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        emailVerified: true,
        // Update Firebase Auth UID if it's different
        id: firebaseUser.uid,
        // Update any missing fields
        name: userDoc.data().name || firebaseUser.displayName || '',
        avatar: userDoc.data().avatar || firebaseUser.photoURL || ''
      });
      
      console.log(`Updated existing user document for ${sanitizedEmail}`);
    } else {
      // Create new user document with Firebase Auth UID
      userDoc = db.collection('users').doc(firebaseUser.uid);
      await userDoc.set({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || '',
        wallet_address: '',
        wallet_public_key: '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        avatar: firebaseUser.photoURL || '',
        emailVerified: true,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(), // Track when user last verified
        hasCompletedOnboarding: false // Track onboarding completion
      });
      
      console.log(`Created new user document for ${sanitizedEmail}`);
    }

    console.log(`Code verified successfully for ${sanitizedEmail}`);
    
    return {
      success: true,
      message: 'Code verified successfully',
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || '',
        walletAddress: '',
        walletPublicKey: '',
        createdAt: firebaseUser.metadata.creationTime,
        avatar: firebaseUser.photoURL || ''
      },
      customToken: customToken || null
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to verify code');
  }
});

// Export MoonPay functions
exports.createMoonPayURL = moonpayFunctions.createMoonPayURL;
exports.moonpayWebhook = moonpayFunctions.moonpayWebhook;
exports.getMoonPayTransactionStatus = moonpayFunctions.getMoonPayTransactionStatus;
exports.getUserMoonPayTransactions = moonpayFunctions.getUserMoonPayTransactions;

// Export AI functions
const aiService = require('./aiService');
exports.aiHealthCheck = aiService.aiHealthCheck;
exports.analyzeBill = aiService.analyzeBill;
exports.testAI = aiService.testAI;