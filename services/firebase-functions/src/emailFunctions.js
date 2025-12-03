/**
 * Email Verification Functions
 * Handles sending verification codes and verifying them
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const db = admin.firestore();

// Email configuration helper function
function createTransporter() {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();
  
  // Log configuration status (without exposing credentials)
  console.log('📧 Email configuration check:', {
    hasEmailUser: !!emailUser,
    emailUserLength: emailUser?.length || 0,
    hasEmailPassword: !!emailPassword,
    emailPasswordLength: emailPassword?.length || 0
  });
  
  if (!emailUser || !emailPassword) {
    throw new Error('Email credentials not configured. EMAIL_USER and EMAIL_PASSWORD must be set as Firebase Secrets.');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
  }
});
}

// Email template for verification codes
function generateEmailTemplate(code) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #A5EA15 0%, #53EF97 100%); padding: 48px; text-align: center; color: #061113;">
        <h1 style="margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px;">WeSplit</h1>
        <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 400;">Your verification code</p>
      </div>

      <div style="padding: 48px; background: #061113;">
        <h2 style="color: #FFFFFF; margin-bottom: 24px; font-size: 32px; font-weight: 600; line-height: 40px; letter-spacing: -0.5px;">Hello!</h2>
        <p style="color: rgba(255, 255, 255, 0.70); line-height: 24px; margin-bottom: 32px; font-size: 16px; font-weight: 400;">
          You requested a verification code for your WeSplit account. Use the code below to complete your verification:
        </p>

        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0;">
          <h1 style="color: #A5EA15; font-size: 48px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace; font-weight: 400;">${code}</h1>
        </div>

        <p style="color: rgba(255, 255, 255, 0.50); font-size: 14px; margin-top: 32px; font-weight: 400;">
          This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
        </p>

        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.10); text-align: center;">
          <p style="color: rgba(255, 255, 255, 0.30); font-size: 12px; font-weight: 400;">
            © 2024 WeSplit. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * HTTP Callable Function: Send verification code via email
 * Secrets are explicitly bound using runWith to ensure EMAIL_USER and EMAIL_PASSWORD are available
 */
exports.sendVerificationEmail = functions.runWith({
  secrets: ['EMAIL_USER', 'EMAIL_PASSWORD']
}).https.onCall(async (data, context) => {
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

    // Create transporter (validate credentials)
    let transporter;
    try {
      transporter = createTransporter();
    } catch (configError) {
      console.error('❌ Email configuration error:', configError.message);
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Email service not configured: ${configError.message}`
      );
    }
    
    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError.message);
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Email service authentication failed: ${verifyError.message}`
      );
    }

    // Send email
    const emailUser = process.env.EMAIL_USER?.trim();
    const mailOptions = {
      from: emailUser || 'noreply@wesplit.app',
      to: sanitizedEmail,
      subject: 'WeSplit Verification Code',
      html: generateEmailTemplate(code)
    };

    console.log('📧 Attempting to send email:', {
      from: mailOptions.from,
      to: sanitizedEmail,
      subject: mailOptions.subject
    });

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });
    } catch (sendError) {
      console.error('❌ Error sending email:', {
        error: sendError.message,
        code: sendError.code,
        command: sendError.command,
        response: sendError.response,
        responseCode: sendError.responseCode
      });
      throw new functions.https.HttpsError(
        'internal',
        `Failed to send email: ${sendError.message || 'Unknown error'}`
      );
    }
    
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
    console.error('❌ Error sending verification email:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Provide more detailed error message
    const errorMessage = error.message || 'Unknown error occurred';
    throw new functions.https.HttpsError(
      'internal',
      `Failed to send verification email: ${errorMessage}`
    );
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

    // CRITICAL: Always create custom token for email verification
    // This ensures users are signed into Firebase Auth, which is required for phone linking
    let customToken = null;
    try {
      customToken = await admin.auth().createCustomToken(firebaseUser.uid);
      console.log('✅ Created custom token for user', { uid: firebaseUser.uid });
    } catch (tokenError) {
      console.error('❌ Could not create custom token due to permissions:', tokenError.message);
      // This is critical - throw error if we can't create token
      throw new functions.https.HttpsError('internal', 'Failed to create authentication token');
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
      const existingUserData = userDoc.data();
      
      await userDoc.ref.update({
        lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        emailVerified: true,
        // Update Firebase Auth UID if it's different (for consistency)
        id: firebaseUser.uid,
        firebase_uid: firebaseUser.uid,
        // Update any missing fields
        name: existingUserData.name || firebaseUser.displayName || '',
        avatar: existingUserData.avatar || firebaseUser.photoURL || '',
        // Ensure email-based identification
        primary_email: sanitizedEmail,
        // Migration tracking
        migration_completed: admin.firestore.FieldValue.serverTimestamp(),
        migration_version: '1.0'
      });
      
      console.log(`Updated existing user document for ${sanitizedEmail} with UID ${firebaseUser.uid}`);
    } else {
      // Create new user document with Firebase Auth UID
      userDoc = db.collection('users').doc(firebaseUser.uid);
      await userDoc.set({
        id: firebaseUser.uid,
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        primary_email: sanitizedEmail, // Primary email for identification
        name: firebaseUser.displayName || '',
        wallet_address: '',
        wallet_public_key: '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        avatar: firebaseUser.photoURL || '',
        emailVerified: true,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        lastVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        hasCompletedOnboarding: false,
        // Wallet management tracking
        wallet_status: 'no_wallet',
        wallet_type: 'app-generated',
        wallet_migration_status: 'none',
        // Migration tracking
        migration_completed: admin.firestore.FieldValue.serverTimestamp(),
        migration_version: '1.0',
        // Initialize points balance
        points: 0,
        total_points_earned: 0
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

