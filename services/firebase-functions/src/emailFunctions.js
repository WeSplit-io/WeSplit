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
          This code will expire in 5 minutes. If you didn't request this code, please ignore this email.
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
 * HTTP Callable Function: Check if email user exists
 * Checks if a user with the given email address already exists in the system
 */
exports.checkEmailUserExists = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;

    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';

    console.log('🧹 Email sanitization in checkEmailUserExists:', { original: email, sanitized: sanitizedEmail });

    // Validate input
    if (!sanitizedEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    if (!sanitizedEmail.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    console.log('🔍 Checking if user exists with email', {
      email: sanitizedEmail.substring(0, 3) + '...' + sanitizedEmail.substring(sanitizedEmail.indexOf('@'))
    });

    // Check if user exists with this email
    const existingUsers = await db.collection('users')
      .where('email', '==', sanitizedEmail)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      const userDoc = existingUsers.docs[0];
      const userData = userDoc.data();

      console.log('📧 Found existing user in Firestore', {
        firestoreId: userData.id,
        email: sanitizedEmail.substring(0, 3) + '...' + sanitizedEmail.substring(sanitizedEmail.indexOf('@'))
      });

      return {
        success: true,
        userExists: true,
        userId: userData.id,
        message: 'User exists'
      };
    } else {
      console.log('📧 No existing user found for email', {
        email: sanitizedEmail.substring(0, 3) + '...' + sanitizedEmail.substring(sanitizedEmail.indexOf('@'))
      });

      return {
        success: true,
        userExists: false,
        message: 'User does not exist'
      };
    }
  } catch (error) {
    console.error('❌ Error in checkEmailUserExists', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to check user existence');
  }
});

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
    
    if (!/^\d{6}$/.test(code)) {
      throw new functions.https.HttpsError('invalid-argument', 'Code must be 6 digits');
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
 * SECURITY: Added rate limiting, attempt counter, and CAPTCHA requirement
 */
exports.verifyCode = functions.https.onCall(async (data, context) => {
  try {
    const { email, code, captchaToken } = data;
    
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
    
    // SECURITY: Changed from 4 to 6 digits
    if (!/^\d{6}$/.test(code)) {
      throw new functions.https.HttpsError('invalid-argument', 'Code must be 6 digits');
    }

    // SECURITY: Get IP address for rate limiting
    const clientIp = context.rawRequest?.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     context.rawRequest?.connection?.remoteAddress || 
                     'unknown';

    // SECURITY: Rate limiting per email + IP
    const rateLimitKey = `verify_attempts_${sanitizedEmail}_${clientIp}`;
    const rateLimitRef = db.collection('rateLimits').doc(rateLimitKey);
    const rateLimitDoc = await rateLimitRef.get();
    
    let attempts = 0;
    let lastAttempt = null;
    let requiresCaptcha = false;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    if (rateLimitDoc.exists) {
      const rateLimitData = rateLimitDoc.data();
      attempts = rateLimitData.attempts || 0;
      lastAttempt = rateLimitData.lastAttempt?.toDate ? rateLimitData.lastAttempt.toDate() : new Date(rateLimitData.lastAttempt);
      
      // Reset counter if last attempt was more than 5 minutes ago
      if (lastAttempt < fiveMinutesAgo) {
        attempts = 0;
      } else {
        // Check if CAPTCHA is required (after 3 failed attempts)
        if (attempts >= 3) {
          requiresCaptcha = true;
          
          // Require CAPTCHA token if attempts >= 3
          if (!captchaToken) {
            // Log suspicious activity
            await db.collection('securityLogs').add({
              type: 'otp_brute_force_attempt',
              email: sanitizedEmail,
              ip: clientIp,
              attempts: attempts,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              requiresCaptcha: true
            });
            
            throw new functions.https.HttpsError(
              'permission-denied',
              'Too many failed attempts. Please complete CAPTCHA and try again.'
            );
          }
          
          // Verify CAPTCHA token (simple validation for now - placeholder for future CAPTCHA service integration)
          if (!captchaToken || captchaToken.length < 10) {
            throw new functions.https.HttpsError(
              'permission-denied',
              'Invalid CAPTCHA token. Please complete CAPTCHA verification.'
            );
          }
        }
        
        // Block after 5 attempts in 5 minutes
        if (attempts >= 5) {
          // Log security event
          await db.collection('securityLogs').add({
            type: 'otp_brute_force_blocked',
            email: sanitizedEmail,
            ip: clientIp,
            attempts: attempts,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Too many verification attempts. Please wait 5 minutes or request a new code.'
          );
        }
      }
    }

    // Find the verification code in Firestore
    const verificationRef = db.collection('verificationCodes');
    const q = verificationRef
      .where('email', '==', sanitizedEmail)
      .where('code', '==', code)
      .where('used', '==', false);
    
    const querySnapshot = await q.get();
    
    // SECURITY: Increment attempts on failure BEFORE checking code
    if (querySnapshot.empty) {
      const newAttempts = attempts + 1;
      await rateLimitRef.set({
        email: sanitizedEmail,
        ip: clientIp,
        attempts: newAttempts,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        requiresCaptcha: newAttempts >= 3
      }, { merge: true });
      
      // Log failed attempt
      await db.collection('securityLogs').add({
        type: 'otp_verification_failed',
        email: sanitizedEmail,
        ip: clientIp,
        attempts: newAttempts,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      throw new functions.https.HttpsError('not-found', 'Invalid or expired verification code');
    }

    const doc = querySnapshot.docs[0];
    const verificationData = doc.data();
    
    // Check if code is expired (support both camelCase and snake_case for backward compatibility)
    let expiresAt;
    if (verificationData.expiresAt) {
      expiresAt = verificationData.expiresAt?.toDate ? 
        verificationData.expiresAt.toDate() : 
        new Date(verificationData.expiresAt);
    } else if (verificationData.expires_at) {
      // Backward compatibility: handle snake_case field name
      expiresAt = verificationData.expires_at?.toDate ? 
        verificationData.expires_at.toDate() : 
        new Date(verificationData.expires_at);
    } else {
      // Fallback: assume expired if no expiration field found
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }
    
    if (new Date() > expiresAt) {
      // Increment attempts on expired code
      const newAttempts = attempts + 1;
      await rateLimitRef.set({
        email: sanitizedEmail,
        ip: clientIp,
        attempts: newAttempts,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        requiresCaptcha: newAttempts >= 3
      }, { merge: true });
      
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }

    // SECURITY: Code is valid - reset rate limit and log success
    await rateLimitRef.delete(); // Clear rate limit on success
    
    await db.collection('securityLogs').add({
      type: 'otp_verification_success',
      email: sanitizedEmail,
      ip: clientIp,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

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
        // Wallet management tracking (consistent with phone users)
        wallet_status: 'healthy',
        wallet_created_at: admin.firestore.FieldValue.serverTimestamp(),
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

/**
 * HTTP Callable Function: Send email change notification to old email address
 * SECURITY: Requires authentication and verifies user can only change their own email
 */
exports.sendEmailChangeNotification = functions.https.onCall(async (data, context) => {
  try {
    const { oldEmail, newEmail, userId } = data;
    
    // SECURITY: Require authentication
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    
    // SECURITY: Verify user can only change their own email
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'You can only change your own email');
    }
    
    const sanitizedOldEmail = oldEmail?.trim().replace(/\s+/g, '') || '';
    const sanitizedNewEmail = newEmail?.trim().replace(/\s+/g, '') || '';
    
    if (!sanitizedOldEmail || !sanitizedNewEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Both old and new email are required');
    }
    
    if (!sanitizedOldEmail.includes('@') || !sanitizedNewEmail.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }
    
    // Create transporter
    let transporter;
    try {
      transporter = createTransporter();
    } catch (configError) {
      throw new functions.https.HttpsError('failed-precondition', 'Email service not configured');
    }
    
    // Generate notification email template
    const emailTemplate = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #A5EA15 0%, #53EF97 100%); padding: 48px; text-align: center; color: #061113;">
          <h1 style="margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px;">WeSplit</h1>
        </div>
        <div style="padding: 48px; background: #061113;">
          <h2 style="color: #FFFFFF; margin-bottom: 24px; font-size: 32px; font-weight: 600; line-height: 40px; letter-spacing: -0.5px;">Email Address Changed</h2>
          <p style="color: rgba(255, 255, 255, 0.70); line-height: 24px; margin-bottom: 32px; font-size: 16px; font-weight: 400;">
            Your WeSplit account email address has been changed from <strong style="color: #FFFFFF;">${sanitizedOldEmail}</strong> to <strong style="color: #FFFFFF;">${sanitizedNewEmail}</strong>.
          </p>
          <p style="color: rgba(255, 255, 255, 0.70); line-height: 24px; margin-bottom: 32px; font-size: 16px; font-weight: 400;">
            If you did not make this change, please contact support immediately.
          </p>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.10); text-align: center;">
            <p style="color: rgba(255, 255, 255, 0.30); font-size: 12px; font-weight: 400;">
              © 2024 WeSplit. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;
    
    const emailUser = process.env.EMAIL_USER?.trim();
    const mailOptions = {
      from: emailUser || 'noreply@wesplit.app',
      to: sanitizedOldEmail,
      subject: 'WeSplit - Email Address Changed',
      html: emailTemplate
    };
    
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email change notification sent to ${sanitizedOldEmail}`);
    } catch (sendError) {
      console.error('Error sending email change notification:', sendError);
      // Don't fail the function if email sending fails - log it
    }
    
    // Log email change
    await db.collection('securityLogs').add({
      type: 'email_change',
      userId: userId,
      oldEmail: sanitizedOldEmail,
      newEmail: sanitizedNewEmail,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Error sending email change notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

/**
 * HTTP Callable Function: Check if user has verified within the last 30 days
 * This replaces the client-side Firestore query to avoid permission issues.
 */
exports.hasVerifiedWithin30Days = functions.https.onCall(async (data, context) => {
  try {
    const rawEmail = data && data.email;
    const email = (rawEmail || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Valid email is required');
    }

    console.log('🔍 Checking 30-day verification for email:', email);

    // Find user by email
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', email).limit(1).get();

    if (querySnapshot.empty) {
      console.log('ℹ️ User not found for 30-day verification check', { email });
      return { success: true, hasVerifiedWithin30Days: false };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() || {};
    const lastVerifiedAt = userData.lastVerifiedAt;

    if (!lastVerifiedAt) {
      console.log('ℹ️ No lastVerifiedAt field found for user', { email, userId: userDoc.id });
      return { success: true, hasVerifiedWithin30Days: false };
    }

    // Normalize lastVerifiedAt to a JS Date
    let lastVerified;
    if (lastVerifiedAt && typeof lastVerifiedAt.toDate === 'function') {
      lastVerified = lastVerifiedAt.toDate();
    } else if (lastVerifiedAt instanceof Date) {
      lastVerified = lastVerifiedAt;
    } else if (typeof lastVerifiedAt === 'string') {
      lastVerified = new Date(lastVerifiedAt);
    } else {
      lastVerified = new Date(lastVerifiedAt);
    }

    if (isNaN(lastVerified.getTime())) {
      console.warn('⚠️ Invalid lastVerifiedAt date for user', { email, value: lastVerifiedAt, type: typeof lastVerifiedAt });
      // Treat as not verified recently
      return { success: true, hasVerifiedWithin30Days: false };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const hasVerifiedWithin30Days = lastVerified > thirtyDaysAgo;

    console.log('✅ 30-day verification check result', {
      email,
      userId: userDoc.id,
      lastVerified: lastVerified.toISOString(),
      now: now.toISOString(),
      thirtyDaysAgo: thirtyDaysAgo.toISOString(),
      hasVerifiedWithin30Days
    });

    return {
      success: true,
      hasVerifiedWithin30Days
    };
  } catch (error) {
    console.error('❌ Error in hasVerifiedWithin30Days function:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to check 30-day verification');
  }
});

