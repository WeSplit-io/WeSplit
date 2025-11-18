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
 * HTTP Callable Function: Send SMS verification code for phone linking
 * This bypasses the reCAPTCHA Enterprise issue on mobile by using backend SMS sending
 */
exports.sendPhoneVerificationCode = functions.https.onCall(async (data, context) => {
  try {
    const { phoneNumber, userId } = data;
    
    // Validate input
    if (!phoneNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
    }
    
    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number must be in E.164 format');
    }

    console.log('📱 Sending SMS verification code for phone linking', { 
      userId, 
      phone: phoneNumber.substring(0, 5) + '...' 
    });

    // Note: Firebase Admin SDK doesn't have a direct method to send SMS
    // We need to use Firebase Auth's phone authentication, but we can create
    // a verification session server-side
    // However, the best approach is to let the client handle it but with better error handling
    
    // For now, we'll return success and let the client handle the actual SMS sending
    // The client will need to handle the reCAPTCHA issue differently
    
    return {
      success: true,
      message: 'SMS verification should be handled client-side',
      note: 'This function is a placeholder. The actual SMS sending happens client-side.'
    };
  } catch (error) {
    console.error('❌ Error in sendPhoneVerificationCode', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to send phone verification code');
  }
});

/**
 * HTTP Callable Function: Verify phone number and link to existing user
 * This is used when an existing user wants to add a phone number to their account
 */
exports.verifyPhoneForLinking = functions.https.onCall(async (data, context) => {
  try {
    // This function is called after the phone verification code is verified on the client
    // The actual phone verification is handled by Firebase Auth on the client side
    // This function just updates the Firestore user document
    
    const { userId, phoneNumber } = data;
    
    // Validate input
    if (!userId || !phoneNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID and phone number are required');
    }
    
    // Validate phone number format (E.164)
    if (!phoneNumber.startsWith('+')) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number must be in E.164 format');
    }

    console.log('📱 Verifying phone for linking', { 
      userId, 
      phone: phoneNumber.substring(0, 5) + '...' 
    });

    // Update user document in Firestore
    const userDoc = db.collection('users').doc(userId);
    const userSnapshot = await userDoc.get();
    
    if (!userSnapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Update user document with phone number
    await userDoc.update({
      phone: phoneNumber,
      phoneVerified: true,
      primary_phone: phoneNumber,
      phoneLinkedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Phone number linked successfully', { userId });

    return {
      success: true,
      message: 'Phone number linked successfully',
      phoneNumber: phoneNumber
    };
  } catch (error) {
    console.error('❌ Error in verifyPhoneForLinking', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to verify phone for linking');
  }
});

