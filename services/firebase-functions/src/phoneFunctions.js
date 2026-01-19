/**
 * Phone Authentication Functions
 * Handles phone number verification and linking for Firebase Auth
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * HTTP Callable Function: Get custom token for user
 * This function gets or creates a Firebase Auth user and returns a custom token
 * Used when linking phone numbers to existing accounts
 */
exports.getCustomTokenForUser = functions.https.onCall(async (data, context) => {
  try {
    const { userId, email } = data;
    
    // Validate input
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    
    // Sanitize email
    const sanitizedEmail = email.trim().replace(/\s+/g, '');
    
    if (!sanitizedEmail.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    console.log('🔑 Getting custom token for user', { userId, email: sanitizedEmail.substring(0, 5) + '...' });

    // Try to get Firebase Auth user by email
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(sanitizedEmail);
      console.log('✅ Found existing Firebase Auth user', { uid: firebaseUser.uid });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        console.log('📝 Creating new Firebase Auth user for email', { email: sanitizedEmail.substring(0, 5) + '...' });
        firebaseUser = await admin.auth().createUser({
          email: sanitizedEmail,
          emailVerified: true // Mark as verified since user is already authenticated
        });
        console.log('✅ Created new Firebase Auth user', { uid: firebaseUser.uid });
      } else {
        console.error('❌ Error getting/creating Firebase Auth user', error);
        throw new functions.https.HttpsError('internal', 'Failed to get or create Firebase Auth user');
      }
    }

    // If userId is provided, ensure it matches the Firebase Auth UID
    // This helps maintain consistency between Firestore user ID and Firebase Auth UID
    if (userId && userId !== firebaseUser.uid) {
      console.warn('⚠️ User ID mismatch', { 
        providedUserId: userId, 
        firebaseAuthUid: firebaseUser.uid 
      });
      
      // Try to update Firestore user document to use Firebase Auth UID
      try {
        const userDoc = db.collection('users').doc(userId);
        const userSnapshot = await userDoc.get();
        
        if (userSnapshot.exists) {
          // Update the user document to reference Firebase Auth UID
          await userDoc.update({
            firebase_uid: firebaseUser.uid,
            id: firebaseUser.uid // Update primary ID to match Firebase Auth
          });
          console.log('✅ Updated Firestore user document to match Firebase Auth UID');
        }
      } catch (updateError) {
        console.warn('⚠️ Could not update Firestore user document', updateError);
        // Continue anyway - the custom token will still work
      }
    }

    // Create custom token
    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(firebaseUser.uid);
      console.log('✅ Created custom token for user', { uid: firebaseUser.uid });
    } catch (tokenError) {
      console.error('❌ Error creating custom token', {
        error: tokenError.message,
        code: tokenError.code,
        stack: tokenError.stack
      });
      // Provide more detailed error message for debugging
      const errorMessage = tokenError.message || 'Unknown error';
      throw new functions.https.HttpsError('internal', `Failed to create custom token: ${errorMessage}`);
    }

    return {
      success: true,
      token: customToken,
      userId: firebaseUser.uid,
      email: firebaseUser.email
    };
  } catch (error) {
    console.error('❌ Error in getCustomTokenForUser', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to get custom token for user');
  }
});

/**
 * HTTP Callable Function: Check if phone user exists
 * Used for instant login without SMS verification for existing users
 */
exports.checkPhoneUserExists = functions.https.onCall(async (data, context) => {
  try {
    const { phoneNumber } = data;
    
    // Validate input
    if (!phoneNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
    }
    
    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number must be in E.164 format');
    }

    console.log('🔍 Checking if user exists with phone number', {
      phone: phoneNumber.substring(0, 5) + '...' 
    });

    // Check if user exists with this phone number
    const existingUsers = await db.collection('users')
      .where('phone', '==', phoneNumber)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      const userDoc = existingUsers.docs[0];
      const userData = userDoc.data();

      console.log('📱 Found existing user in Firestore', {
        firestoreId: userData.id,
        phone: phoneNumber.substring(0, 5) + '...'
      });

      // Ensure Firebase Auth user exists for this Firestore user
      try {
        let firebaseUser = await admin.auth().getUser(userData.id);
        console.log('✅ Found existing Firebase Auth user by UID', { uid: firebaseUser.uid });

        // Update the user's phone number in Firebase Auth if not set
        if (!firebaseUser.phoneNumber) {
          await admin.auth().updateUser(userData.id, {
            phoneNumber: phoneNumber
          });
          console.log('📱 Updated Firebase Auth user with phone number');
        }

        return {
          success: true,
          userExists: true,
          userId: firebaseUser.uid
        };
      } catch (authError) {
        // Firebase Auth user doesn't exist, create one
        console.log('⚠️ Firebase Auth user not found, creating one...', { uid: userData.id });

        try {
          const firebaseUser = await admin.auth().createUser({
            uid: userData.id,
            phoneNumber: phoneNumber
          });
          console.log('✅ Created Firebase Auth user for existing Firestore user', { uid: firebaseUser.uid });

          return {
            success: true,
            userExists: true,
            userId: firebaseUser.uid
          };
        } catch (createError) {
          console.error('❌ Failed to create Firebase Auth user', createError);
          return {
            success: true,
            userExists: false
          };
        }
      }
    }

    console.log('❌ No user found with phone number', {
      phone: phoneNumber.substring(0, 5) + '...'
    });
    
    return {
      success: true,
      userExists: false
    };

  } catch (error) {
    console.error('❌ Error in checkPhoneUserExists', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to check user existence');
  }
});

/**
 * HTTP Callable Function: Get user custom token for instant login
 * Provides authentication token for existing users without SMS verification
 */
exports.getUserCustomToken = functions.https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    // Validate input
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }

    console.log('🔑 Generating custom token for existing user', { userId });

    // Verify user exists in Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Generate custom token for the user
    const customToken = await admin.auth().createCustomToken(userId);

    console.log('✅ Custom token generated for user', { userId });

    return {
      success: true,
      customToken: customToken
    };

  } catch (error) {
    console.error('❌ Error in getUserCustomToken', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to generate custom token');
  }
});

/**
 * HTTP Callable Function: Start phone authentication (server-side)
 * This completely bypasses reCAPTCHA by handling phone verification on the server
 * The client sends the phone number, server sends SMS and returns a session ID
 */
exports.startPhoneAuthentication = functions.runWith({
  secrets: ['TWILIO_SID', 'TWILIO_AUTH_TOKKEN', 'TWILIO_PHONE_NUMBER']
}).https.onCall(async (data, context) => {
  try {
    const { phoneNumber } = data;
    
    // Validate input
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
    }
    
    // Remove whitespace for validation
    const cleanedPhone = phoneNumber.trim().replace(/\s/g, '');
    
    // Validate phone number format (E.164)
    // E.164 format: ^\+[1-9]\d{1,14}$ - must start with +, country code 1-9, followed by 1-14 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    
    if (!e164Regex.test(cleanedPhone)) {
      console.error('❌ Invalid phone number format', {
        phone: cleanedPhone.substring(0, 10) + '...',
        length: cleanedPhone.length,
        startsWithPlus: cleanedPhone.startsWith('+')
      });
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Phone number must be in valid E.164 format (e.g., +1234567890). Country code must start with 1-9, followed by 1-14 digits.'
      );
    }

    // Additional validation: minimum and maximum length
    if (cleanedPhone.length < 8) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is too short. Please include country code and full number.');
    }

    if (cleanedPhone.length > 16) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is too long. Maximum 15 digits after country code.');
    }

    // Use cleaned phone number for the rest of the function
    const validatedPhoneNumber = cleanedPhone;

    console.log('📱 Starting server-side phone authentication', {
      phone: validatedPhoneNumber.substring(0, 5) + '...',
      fullLength: validatedPhoneNumber.length
    });

    // Generate a unique session ID for this verification attempt
    const sessionId = `phone_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the session in Firestore with a TTL (time to live)
    const sessionDoc = db.collection('phoneAuthSessions').doc(sessionId);
    await sessionDoc.set({
      phoneNumber: validatedPhoneNumber,
      sessionId: sessionId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (5 * 60 * 1000)), // 5 minutes
      attempts: 0,
      maxAttempts: 5
    });

    console.log('✅ Phone auth session created', { sessionId });

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the verification code securely (hashed)
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(verificationCode).digest('hex');

    console.log('📱 Sending SMS verification code via Twilio');

    try {
      // Send SMS via Twilio
      const twilio = require('twilio');
      const twilioClient = twilio(
        process.env.TWILIO_SID,
        process.env.TWILIO_AUTH_TOKKEN
      );

      const message = await twilioClient.messages.create({
        body: `WeSplit verification code: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: validatedPhoneNumber
      });

      console.log('✅ SMS sent successfully via Twilio', {
        messageSid: message.sid,
        to: phoneNumber.substring(0, 5) + '...'
      });

      // Update session with code hash and status
      await sessionDoc.update({
        verificationCodeHash: codeHash,
        status: 'code_sent',
        twilioMessageSid: message.sid
      });

      console.log('✅ Verification code sent and session updated');

    } catch (twilioError) {
      // Enhanced error logging for diagnostics
      const errorCode = twilioError.code || 'UNKNOWN';
      const errorMessage = twilioError.message || 'Unknown Twilio error';
      const errorMoreInfo = twilioError.moreInfo || '';
      
      console.error('❌ Twilio SMS sending failed:', {
        message: errorMessage,
        code: errorCode,
        moreInfo: errorMoreInfo,
        phoneNumber: validatedPhoneNumber.substring(0, 10),
        phoneLength: validatedPhoneNumber.length,
        hasSid: !!process.env.TWILIO_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKKEN,
        hasPhone: !!process.env.TWILIO_PHONE_NUMBER,
        twilioPhone: process.env.TWILIO_PHONE_NUMBER
      });

      // Check if Twilio credentials are configured
      if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('⚠️ Twilio credentials not configured, falling back to test mode');

        // Fallback: Store test code for development
        const testCode = '123456';
        const testCodeHash = crypto.createHash('sha256').update(testCode).digest('hex');

        await sessionDoc.update({
          verificationCodeHash: testCodeHash,
          status: 'code_sent'
        });

        console.log(`📱 TEST CODE for ${phoneNumber}: ${testCode}`);
        console.log('⚠️ Configure TWILIO_SID, TWILIO_AUTH_TOKKEN, and TWILIO_PHONE_NUMBER for real SMS');
      } else {
        // Provide more specific error messages based on Twilio error codes
        let userFriendlyError = 'Failed to send SMS verification code';
        
        switch (errorCode) {
          case 21211:
            userFriendlyError = 'Invalid phone number format. Please use international format (e.g., +1234567890)';
            break;
          case 21214:
            userFriendlyError = 'Twilio phone number configuration error. Please contact support.';
            break;
          case 21608:
          case 21610:
          case 21614:
            userFriendlyError = 'This phone number has opted out of receiving messages.';
            break;
          case 20003:
            userFriendlyError = 'Twilio authentication error. Please contact support.';
            break;
          case 30008:
            userFriendlyError = 'Invalid phone number. Please check the number and try again.';
            break;
          case 30003:
            userFriendlyError = 'Phone number is unreachable. Please try again later.';
            break;
          case 20429:
            userFriendlyError = 'Too many requests. Please wait a moment and try again.';
            break;
          default:
            userFriendlyError = `Failed to send SMS: ${errorMessage}`;
        }

        // Log detailed error for debugging
        console.error('📋 Twilio Error Details:', {
          code: errorCode,
          message: errorMessage,
          moreInfo: errorMoreInfo,
          userFriendlyMessage: userFriendlyError
        });

        // Throw error with user-friendly message
        throw new functions.https.HttpsError(
          'internal',
          userFriendlyError,
          {
            twilioErrorCode: errorCode,
            twilioErrorMessage: errorMessage,
            twilioMoreInfo: errorMoreInfo
          }
        );
      }
    }

    return {
      success: true,
      sessionId: sessionId,
      message: 'Verification code sent to your phone',
      expiresIn: 300 // 5 minutes
    };

  } catch (error) {
    console.error('❌ Error in startPhoneAuthentication', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to start phone authentication');
  }
});

/**
 * HTTP Callable Function: Verify phone code (server-side)
 * This completes the phone authentication and returns a Firebase custom token
 */
exports.verifyPhoneCode = functions.https.onCall(async (data, context) => {
  try {
    const { sessionId, code } = data;

    // Validate input
    if (!sessionId || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Session ID and verification code are required');
    }

    console.log('🔍 Verifying phone code', { sessionId, codeLength: code.length });

    // Get the session from Firestore
    const sessionDoc = db.collection('phoneAuthSessions').doc(sessionId);
    const sessionSnapshot = await sessionDoc.get();

    if (!sessionSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Verification session not found or expired');
    }

    const session = sessionSnapshot.data();

    // Check if session is expired
    if (session.expiresAt.toMillis() < Date.now()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }

    // Check if too many attempts
    if (session.attempts >= session.maxAttempts) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many verification attempts');
    }

    // Increment attempts
    await sessionDoc.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });

    // Verify the code
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    if (codeHash !== session.verificationCodeHash) {
      console.log('❌ Invalid verification code');
      throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code');
    }

    console.log('✅ Verification code correct');

    // Mark session as verified
    await sessionDoc.update({
      status: 'verified',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Check if user already exists with this phone number
    const existingUsers = await db.collection('users')
      .where('phone', '==', session.phoneNumber)
      .limit(1)
      .get();

    let firebaseUser;
    let isNewUser = false;

    if (!existingUsers.empty) {
      // Existing user - try to find their Firebase Auth account by phone number
      const userDoc = existingUsers.docs[0];
      const userData = userDoc.data();

      console.log('📱 Found existing user in Firestore', {
        firestoreId: userData.id,
        phone: session.phoneNumber.substring(0, 5) + '...'
      });

      // Check if this is an emulator-style UID from development
      const isEmulatorUid = userData.id.startsWith('emulator-user-');

      if (isEmulatorUid) {
        console.log('⚠️ Found emulator-style UID, treating as orphaned development user', { firestoreId: userData.id });
        // Don't try to create Firebase Auth user with emulator UID
        // Treat as new user instead
      } else {
        // For existing users with valid UIDs, try to find Firebase Auth user
        try {
          firebaseUser = await admin.auth().getUser(userData.id);
          console.log('✅ Found existing Firebase Auth user by UID', { uid: firebaseUser.uid });
        } catch (authError) {
          // Firebase Auth user doesn't exist, create one with the existing UID
          console.log('⚠️  Firebase Auth user not found, creating with existing UID...', { uid: userData.id });
          firebaseUser = await admin.auth().createUser({
            uid: userData.id
          });
          console.log('✅ Created Firebase Auth user with existing UID', { uid: firebaseUser.uid });
        }
      }

      // If we have a valid Firebase Auth user, return it
      if (firebaseUser) {
        return {
          success: true,
          userExists: true,
          userId: firebaseUser.uid
        };
      }

      // Fall through to new user creation if no valid Firebase Auth user
    }

    // New user or emulator UID case - create new Firebase Auth account
    {
      // New user - create Firebase Auth account (without phone number)
      isNewUser = true;
      firebaseUser = await admin.auth().createUser({
        // No phone number - we handle verification server-side
      });
      console.log('✅ Created new Firebase Auth user', { uid: firebaseUser.uid });

      // Create user document in Firestore with complete wallet fields matching email users
      const userData = {
        id: firebaseUser.uid,
        phone: session.phoneNumber,
        phoneVerified: true,
        primary_phone: session.phoneNumber,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        name: '',
        email: '',
        wallet_address: '',
        wallet_public_key: '',
        wallet_status: 'healthy',
        wallet_created_at: admin.firestore.FieldValue.serverTimestamp(),
        wallet_type: 'app-generated',
        wallet_migration_status: 'none',
        avatar: '',
        hasCompletedOnboarding: false,
        points: 0,
        total_points_earned: 0,
        points_last_updated: admin.firestore.FieldValue.serverTimestamp(),
        badges: [],
        profile_borders: [],
        wallet_backgrounds: [],
        migration_completed: admin.firestore.FieldValue.serverTimestamp(),
        migration_version: '1.0'
      };

      console.log('📝 Creating Firestore user document', {
        userId: firebaseUser.uid,
        phone: session.phoneNumber.substring(0, 5) + '...'
      });

      try {
        // Check if document already exists (prevent duplicates from race conditions)
        const userDocRef = db.collection('users').doc(firebaseUser.uid);
        const existingDoc = await userDocRef.get();

        if (existingDoc.exists) {
          console.log('⚠️ Firestore user document already exists, skipping creation', {
            userId: firebaseUser.uid
          });
        } else {
          await userDocRef.set(userData);
          console.log('✅ Firestore user document created successfully', {
            userId: firebaseUser.uid,
            phone: session.phoneNumber.substring(0, 5) + '...'
          });
        }
      } catch (firestoreError) {
        console.error('❌ Failed to create/check Firestore user document', {
          userId: firebaseUser.uid,
          error: firestoreError.message,
          code: firestoreError.code
        });
        throw new functions.https.HttpsError('internal', `Failed to create user account: ${firestoreError.message}`);
      }
    }

    // Create custom token for the user
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    console.log('✅ Created custom token for authenticated user', { uid: firebaseUser.uid });

    // Clean up the session
    await sessionDoc.delete();
    
    return {
      success: true,
      customToken: customToken,
      userId: firebaseUser.uid,
      isNewUser: isNewUser,
      phoneNumber: session.phoneNumber
    };

  } catch (error) {
    console.error('❌ Error in verifyPhoneCode', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to verify phone code');
  }
});

/**
 * HTTP Callable Function: Start phone linking for existing user
 * This creates a phone verification session for linking phone to existing account
 */
exports.startPhoneLinking = functions.https.onCall(async (data, context) => {
  try {
    const { phoneNumber, userId } = data;

    // Validate input
    if (!phoneNumber || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number and user ID are required');
    }

    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number must be in E.164 format');
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Check if phone is already linked to another user
    const existingUsersWithPhone = await db.collection('users')
      .where('phone', '==', phoneNumber)
      .limit(1)
      .get();

    if (!existingUsersWithPhone.empty) {
      const existingUser = existingUsersWithPhone.docs[0];
      if (existingUser.id !== userId) {
        throw new functions.https.HttpsError('already-exists', 'This phone number is already linked to another account');
      }
    }

    console.log('📱 Starting server-side phone linking', {
      userId,
      phone: phoneNumber.substring(0, 5) + '...'
    });

    // Generate a unique session ID for this verification attempt
    const sessionId = `phone_link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the session in Firestore with a TTL (time to live)
    const sessionDoc = db.collection('phoneLinkSessions').doc(sessionId);
    await sessionDoc.set({
      userId: userId,
      phoneNumber: phoneNumber,
      sessionId: sessionId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (5 * 60 * 1000)), // 5 minutes
      attempts: 0,
      maxAttempts: 5
    });

    console.log('✅ Phone linking session created', { sessionId, userId });

    // Generate a test verification code (in production, this would be sent via SMS)
    const testCode = '123456'; // For testing - replace with real SMS sending

    // Store the verification code securely (hashed)
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(testCode).digest('hex');

    await sessionDoc.update({
      verificationCodeHash: codeHash,
      status: 'code_sent'
    });

    console.log(`📱 TEST CODE for linking ${phoneNumber}: ${testCode}`);
    console.log('⚠️  In production, this code would be sent via SMS service');

    return {
      success: true,
      sessionId: sessionId,
      message: 'Verification code sent to your phone for linking',
      expiresIn: 300 // 5 minutes
    };

  } catch (error) {
    console.error('❌ Error in startPhoneLinking', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to start phone linking');
  }
});

/**
 * HTTP Callable Function: Verify phone code and link to existing user
 * This completes the phone linking process server-side
 */
exports.verifyPhoneForLinking = functions.https.onCall(async (data, context) => {
  try {
    const { userId, phoneNumber, sessionId, code } = data;

    // Validate input
    if (!userId || !phoneNumber || !sessionId || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID, phone number, session ID, and verification code are required');
    }

    console.log('🔍 Verifying phone code for linking', {
      userId,
      sessionId: sessionId.substring(0, 10) + '...',
      codeLength: code.length
    });

    // Get the session from Firestore
    const sessionDoc = db.collection('phoneLinkSessions').doc(sessionId);
    const sessionSnapshot = await sessionDoc.get();

    if (!sessionSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Verification session not found or expired');
    }

    const session = sessionSnapshot.data();

    // Verify session belongs to this user
    if (session.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Session does not belong to this user');
    }

    // Check if session is expired
    if (session.expiresAt.toMillis() < Date.now()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }

    // Check if too many attempts
    if (session.attempts >= session.maxAttempts) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many verification attempts');
    }

    // Increment attempts
    await sessionDoc.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });

    // Verify the code
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    if (codeHash !== session.verificationCodeHash) {
      console.log('❌ Invalid verification code for linking');
      throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code');
    }

    console.log('✅ Verification code correct for linking');

    // Mark session as verified
    await sessionDoc.update({
      status: 'verified',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update user document with phone number
    const userDoc = db.collection('users').doc(userId);
    await userDoc.update({
      phone: phoneNumber,
      phoneVerified: true,
      primary_phone: phoneNumber,
      phoneLinkedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Phone number linked successfully to existing user', { userId });

    // Clean up the session
    await sessionDoc.delete();

    return {
      success: true,
      message: 'Phone number linked successfully',
      phoneNumber: phoneNumber,
      userId: userId
    };

  } catch (error) {
    console.error('❌ Error in verifyPhoneForLinking', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to verify phone for linking');
  }
});

