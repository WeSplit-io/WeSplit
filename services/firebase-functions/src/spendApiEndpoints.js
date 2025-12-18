/**
 * SPEND Integration API Endpoints
 * 
 * Endpoints for SPEND dev team to integrate with WeSplit:
 * - inviteParticipantsToSplit: Invite participants to a split
 * - payParticipantShare: Process participant payment
 * - searchKnownUsers: Search for known WeSplit users
 * - getSplitStatus: Get current status of a split
 * 
 * Authentication: Bearer token in Authorization header
 * Base URL: https://us-central1-wesplit-35186.cloudfunctions.net
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Initialize Firestore
const db = admin.firestore();

// Helper function to get FieldValue (lazy-loaded)
function getFieldValue() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  if (!admin.firestore || !admin.firestore.FieldValue) {
    const firestore = require('firebase-admin/firestore');
    if (firestore && firestore.FieldValue) {
      return firestore.FieldValue;
    }
    throw new Error('admin.firestore.FieldValue is not available');
  }
  
  return admin.firestore.FieldValue;
}

const FieldValue = {
  serverTimestamp: () => getFieldValue().serverTimestamp(),
  increment: (n) => getFieldValue().increment(n),
  arrayUnion: (...elements) => getFieldValue().arrayUnion(...elements),
};

// =============================================================================
// AUTHENTICATION & VALIDATION HELPERS
// =============================================================================

/**
 * Get split by ID with fallback to Firebase document ID
 * Handles both query by 'id' field and direct document lookup
 */
async function getSplitById(splitId) {
  // Try query by 'id' field first (preferred method)
  let splitQuery = await db.collection('splits')
    .where('id', '==', splitId)
    .limit(1)
    .get();
  
  // If not found by id field, try Firebase document ID (for backward compatibility)
  if (splitQuery.empty) {
    try {
      const splitDoc = await db.collection('splits').doc(splitId).get();
      if (splitDoc.exists) {
        // Create a mock query result structure
        splitQuery = {
          docs: [splitDoc],
          empty: false
        };
        console.log('Found split by Firebase document ID:', splitId);
      }
    } catch (docError) {
      console.warn('Error checking Firebase document ID:', docError.message);
    }
  }
  
  if (splitQuery.empty) {
    console.error('Split not found:', {
      splitId,
      searchedBy: 'id field and Firebase document ID',
      timestamp: new Date().toISOString()
    });
    return null;
  }
  
  return splitQuery.docs[0];
}

/**
 * Validate API key from Authorization header
 */
async function validateApiKey(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header. Format: Bearer YOUR_API_KEY' };
  }
  
  const apiKey = authHeader.replace('Bearer ', '').trim();
  
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  
  try {
    // Check API key in Firestore
    const apiKeysRef = db.collection('apiKeys');
    const keyQuery = await apiKeysRef
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (keyQuery.empty) {
      // Fallback: Check environment variable (for development)
      const validKeys = process.env.ALLOWED_API_KEYS?.split(',') || [];
      if (validKeys.includes(apiKey)) {
        return { valid: true, source: 'env' };
      }
      return { valid: false, error: 'Invalid API key' };
    }
    
    const keyDoc = keyQuery.docs[0];
    const keyData = keyDoc.data();
    
    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt.toMillis() < Date.now()) {
      return { valid: false, error: 'API key has expired' };
    }
    
    // Update usage stats
    await keyDoc.ref.update({
      lastUsedAt: FieldValue.serverTimestamp(),
      usageCount: FieldValue.increment(1)
    });
    
    return { 
      valid: true, 
      source: keyData.source || 'firestore',
      permissions: keyData.permissions || []
    };
    
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Failed to validate API key' };
  }
}

/**
 * Check if running in emulator mode
 */
function isEmulatorMode(req) {
  return process.env.FUNCTIONS_EMULATOR === 'true' || 
         process.env.FIREBASE_EMULATOR_HUB || 
         req.headers.host?.includes('localhost') ||
         req.headers.host?.includes('127.0.0.1') ||
         req.headers['x-forwarded-host']?.includes('localhost');
}

// =============================================================================
// INVITE PARTICIPANTS TO SPLIT
// =============================================================================

/**
 * POST /inviteParticipantsToSplit
 * 
 * Invites participants to an existing split. Can invite multiple participants at once.
 * 
 * Request Body:
 * {
 *   "splitId": "split_1234567890_abc",
 *   "inviterId": "user_id_of_creator",
 *   "inviterName": "John Doe",
 *   "participants": [
 *     {
 *       "email": "user1@example.com",
 *       "name": "User One",
 *       "amountOwed": 33.33,
 *       "walletAddress": "optional_wallet_address"
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "invitedCount": 2,
 *   "message": "Successfully invited 2 participants",
 *   "participants": [...]
 * }
 */
exports.inviteParticipantsToSplit = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      // Validate API key (skip in emulator)
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const { splitId, inviterId, inviterName, participants } = req.body;
      
      // Validate required fields
      if (!splitId) {
        return res.status(400).json({
          success: false,
          error: 'splitId is required'
        });
      }
      
      if (!inviterId) {
        return res.status(400).json({
          success: false,
          error: 'inviterId is required'
        });
      }
      
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'participants array is required and must not be empty'
        });
      }
      
      // Get the split
      const splitDoc = await getSplitById(splitId);
      
      if (!splitDoc) {
        return res.status(404).json({
          success: false,
          error: 'Split not found',
          message: `No split found with ID: ${splitId}. Please verify the splitId is correct and the split was created successfully.`,
          splitId: splitId
        });
      }
      
      const splitData = splitDoc.data();
      
      // Verify inviter is the creator
      if (splitData.creatorId !== inviterId) {
        return res.status(403).json({
          success: false,
          error: 'Only the split creator can invite participants'
        });
      }
      
      // Process each participant
      const invitedParticipants = [];
      const errors = [];
      const existingEmails = (splitData.participants || []).map(p => p.email?.toLowerCase());
      
      for (const participant of participants) {
        // Validate participant data
        if (!participant.email) {
          errors.push({ email: participant.email, error: 'Email is required' });
          continue;
        }
        
        // Check if already invited
        if (existingEmails.includes(participant.email.toLowerCase())) {
          errors.push({ email: participant.email, error: 'Already a participant' });
          continue;
        }
        
        // Create or get user
        let userId = null;
        let walletAddress = participant.walletAddress || '';
        
        const usersRef = db.collection('users');
        const userQuery = await usersRef
          .where('email', '==', participant.email.toLowerCase())
          .limit(1)
          .get();
        
        if (!userQuery.empty) {
          // Existing user
          const userDoc = userQuery.docs[0];
          userId = userDoc.id;
          walletAddress = walletAddress || userDoc.data().wallet_address || '';
        } else {
          // Create new user
          const newUserData = {
            email: participant.email.toLowerCase(),
            name: participant.name || participant.email.split('@')[0],
            wallet_address: walletAddress,
            created_at: FieldValue.serverTimestamp(),
            hasCompletedOnboarding: false,
            email_verified: false,
            points: 0,
          };
          
          const newUserRef = await usersRef.add(newUserData);
          userId = newUserRef.id;
        }
        
        // Calculate amount owed
        const amountOwed = participant.amountOwed || 
          (splitData.totalAmount / (splitData.participants.length + participants.length));
        
        // Add participant to split
        const newParticipant = {
          userId: userId,
          email: participant.email.toLowerCase(),
          name: participant.name || participant.email.split('@')[0],
          walletAddress: walletAddress,
          amountOwed: amountOwed,
          amountPaid: 0,
          status: 'invited',
          invitedAt: new Date().toISOString(),
          invitedBy: inviterId,
        };
        
        invitedParticipants.push(newParticipant);
      }
      
      // Update split with new participants
      if (invitedParticipants.length > 0) {
        const updatedParticipants = [...(splitData.participants || []), ...invitedParticipants];
        
        await splitDoc.ref.update({
          participants: updatedParticipants,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // Send webhook notification
        await sendWebhookNotification(splitData, 'split.participant_added', {
          participants: invitedParticipants.map(p => ({
            user_id: p.userId,
            email: p.email,
            amount_owed: p.amountOwed,
            status: p.status
          }))
        });
      }
      
      return res.status(200).json({
        success: true,
        invitedCount: invitedParticipants.length,
        message: `Successfully invited ${invitedParticipants.length} participant(s)`,
        participants: invitedParticipants.map(p => ({
          userId: p.userId,
          email: p.email,
          status: p.status,
          amountOwed: p.amountOwed
        })),
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      console.error('Error in inviteParticipantsToSplit:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

// =============================================================================
// PAY PARTICIPANT SHARE
// =============================================================================

/**
 * POST /payParticipantShare
 * 
 * Records a participant's payment for their share of the split.
 * 
 * Request Body:
 * {
 *   "splitId": "split_1234567890_abc",
 *   "participantId": "user_id_of_payer",
 *   "amount": 33.33,
 *   "currency": "USDC",
 *   "transactionSignature": "optional_if_payment_already_made_on_chain"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "transactionSignature": "5j7s8K9...",
 *   "amountPaid": 33.33,
 *   "remainingAmount": 0,
 *   "splitStatus": "active"
 * }
 */
exports.payParticipantShare = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      // Validate API key (skip in emulator)
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const { splitId, participantId, amount, currency, transactionSignature } = req.body;
      
      // Validate required fields
      if (!splitId) {
        return res.status(400).json({
          success: false,
          error: 'splitId is required'
        });
      }
      
      if (!participantId) {
        return res.status(400).json({
          success: false,
          error: 'participantId is required'
        });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'amount must be a positive number'
        });
      }
      
      // Get the split using helper function
      const splitDoc = await getSplitById(splitId);
      
      if (!splitDoc) {
        return res.status(404).json({
          success: false,
          error: 'Split not found',
          message: `No split found with ID: ${splitId}. Please verify the splitId is correct and the split was created successfully.`,
          splitId: splitId
        });
      }
      
      const splitData = splitDoc.data();
      
      // Find the participant
      const participantIndex = splitData.participants.findIndex(
        p => p.userId === participantId
      );
      
      if (participantIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Participant not found in this split'
        });
      }
      
      const participant = splitData.participants[participantIndex];
      
      // Update participant payment
      const newAmountPaid = (participant.amountPaid || 0) + amount;
      const remainingAmount = Math.max(0, (participant.amountOwed || 0) - newAmountPaid);
      const newStatus = remainingAmount <= 0.01 ? 'paid' : 'partial'; // 0.01 threshold for floating point
      
      // Update participant in array
      const updatedParticipants = [...splitData.participants];
      updatedParticipants[participantIndex] = {
        ...participant,
        amountPaid: newAmountPaid,
        status: newStatus,
        lastPaymentAt: new Date().toISOString(),
        transactionSignature: transactionSignature || participant.transactionSignature,
      };
      
      // Check if split is fully funded
      const totalPaid = updatedParticipants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const paymentThreshold = splitData.externalMetadata?.paymentThreshold || 1.0;
      const requiredAmount = splitData.totalAmount * paymentThreshold - 0.01;
      const isFullyFunded = totalPaid >= requiredAmount;

      // Debug logging
      console.log('Split funding check:', {
        splitId: splitData.id,
        totalAmount: splitData.totalAmount,
        paymentThreshold,
        requiredAmount,
        totalPaid,
        isFullyFunded,
        currentStatus: splitData.status,
        newStatus: isFullyFunded ? 'funded' : splitData.status
      });
      
      // Update split status
      let newSplitStatus = splitData.status;
      if (isFullyFunded && splitData.status !== 'funded' && splitData.status !== 'completed') {
        newSplitStatus = 'funded';
      }
      
      // Save updates
      await splitDoc.ref.update({
        participants: updatedParticipants,
        status: newSplitStatus,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Send webhook notification
      await sendWebhookNotification(splitData, 'split.participant_paid', {
        participant: {
          user_id: participantId,
          email: participant.email,
          amount_paid: amount,
          total_paid: newAmountPaid,
          remaining_amount: remainingAmount
        },
        transaction_signature: transactionSignature
      });
      
      // If fully funded, send funded webhook
      if (isFullyFunded && splitData.status !== 'funded') {
        await sendWebhookNotification(splitData, 'split.funded', {
          total_amount: splitData.totalAmount,
          amount_collected: totalPaid,
          participants: updatedParticipants.map(p => ({
            user_id: p.userId,
            amount_paid: p.amountPaid
          }))
        });
      }
      
      // Build response with optional deep link for redirect
      const response = {
        success: true,
        transactionSignature: transactionSignature || null,
        amountPaid: newAmountPaid,
        remainingAmount: remainingAmount,
        splitStatus: newSplitStatus,
        isFullyFunded: isFullyFunded
      };

      // If split has external metadata with callback URL, include deep link
      if (splitData.externalMetadata?.callbackUrl) {
        const callbackUrl = splitData.externalMetadata.callbackUrl;
        const orderId = splitData.externalMetadata.orderId;
        
        // Generate deep link to return to Spend app
        const deepLinkParams = new URLSearchParams({
          callbackUrl: encodeURIComponent(callbackUrl),
          status: 'success'
        });
        
        if (orderId) {
          deepLinkParams.append('orderId', orderId);
        }
        
        response.deepLink = `wesplit://spend-callback?${deepLinkParams.toString()}`;
        response.redirectUrl = callbackUrl; // Also include direct redirect URL
      }

      return res.status(200).json(response);
      
    } catch (error) {
      console.error('Error in payParticipantShare:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

// =============================================================================
// SEARCH KNOWN USERS
// =============================================================================

/**
 * GET /searchKnownUsers?query=john&limit=20
 * 
 * Searches for known WeSplit users by email, name, or wallet address.
 * Only returns users who have opted-in to being discoverable.
 * 
 * Query Parameters:
 * - query: Search term (required)
 * - limit: Maximum results (optional, default: 20)
 * 
 * Response:
 * {
 *   "success": true,
 *   "users": [
 *     {
 *       "userId": "user_id_1",
 *       "email": "john@example.com",
 *       "name": "John Doe",
 *       "walletAddress": "14NMWDU...",
 *       "avatar": "https://..."
 *     }
 *   ],
 *   "total": 1
 * }
 */
exports.searchKnownUsers = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow GET
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use GET.'
        });
      }
      
      // Validate API key (skip in emulator)
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const query = req.query.query;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50 results
      
      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required and must be at least 2 characters'
        });
      }
      
      const queryLower = query.toLowerCase();
      const users = [];
      const seenUserIds = new Set();
      
      // Search by email (prefix match)
      // Use fallback query first to avoid index requirement
      // This prevents the FAILED_PRECONDITION error in production
      try {
        // Try the indexed query first (if index exists, it's faster)
        const emailQuery = await db.collection('users')
          .where('email', '>=', queryLower)
          .where('email', '<=', queryLower + '\uf8ff')
          .where('discoverable', '!=', false) // Only discoverable users
          .limit(limit)
          .get();
        
        emailQuery.docs.forEach(doc => {
          if (!seenUserIds.has(doc.id)) {
            seenUserIds.add(doc.id);
            const data = doc.data();
            users.push({
              userId: doc.id,
              email: data.email,
              name: data.name,
              walletAddress: data.wallet_address || null,
              avatar: data.avatar || null
            });
          }
        });
      } catch (indexError) {
        // If index doesn't exist, use fallback query (no index required)
        // Check for various error formats: 'index', 'FAILED_PRECONDITION', error code 9
        const errorMessage = indexError.message || String(indexError) || '';
        const errorCode = indexError.code || indexError.status || '';
        const errorString = JSON.stringify(indexError);
        
        // Check if this is an index-related error
        // Handle gRPC error format: "9 FAILED_PRECONDITION: The query requires an index..."
        const isIndexError = 
          errorMessage.includes('index') || 
          errorMessage.includes('FAILED_PRECONDITION') ||
          errorMessage.includes('requires an index') ||
          errorMessage.includes('9 FAILED_PRECONDITION') ||
          errorCode === 9 ||
          errorCode === '9' ||
          String(errorCode).includes('FAILED_PRECONDITION') ||
          errorString.includes('FAILED_PRECONDITION') ||
          errorString.includes('requires an index') ||
          errorString.includes('9 FAILED_PRECONDITION');
        
        if (isIndexError) {
          console.warn('Composite index not found, using fallback query (no index required):', errorMessage || errorString);
          
          // Fallback: Query without discoverable filter, filter in memory
          // This query only requires a simple index on 'email' field (usually auto-created)
          try {
            const emailQueryFallback = await db.collection('users')
              .where('email', '>=', queryLower)
              .where('email', '<=', queryLower + '\uf8ff')
              .limit(limit * 3) // Get more to filter (some may be filtered out)
              .get();
            
            emailQueryFallback.docs.forEach(doc => {
              if (users.length >= limit) return;
              const data = doc.data();
              // Filter discoverable in memory (default to true if not set)
              const isDiscoverable = data.discoverable !== false;
              
              if (isDiscoverable && !seenUserIds.has(doc.id)) {
                seenUserIds.add(doc.id);
                users.push({
                  userId: doc.id,
                  email: data.email,
                  name: data.name,
                  walletAddress: data.wallet_address || null,
                  avatar: data.avatar || null
                });
              }
            });
          } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            // If fallback also fails, return empty results rather than crashing
            // This prevents the endpoint from returning 500 errors
            console.warn('Returning empty results due to query error');
          }
        } else {
          // Re-throw if it's not an index error
          console.error('Unexpected error in searchKnownUsers email query:', indexError);
          throw indexError;
        }
      }
      
      // Search by name (prefix match) if we need more results
      if (users.length < limit) {
        try {
          const nameQuery = await db.collection('users')
            .where('name', '>=', query)
            .where('name', '<=', query + '\uf8ff')
            .where('discoverable', '!=', false)
            .limit(limit - users.length)
            .get();
          
          nameQuery.docs.forEach(doc => {
            if (!seenUserIds.has(doc.id)) {
              seenUserIds.add(doc.id);
              const data = doc.data();
              users.push({
                userId: doc.id,
                email: data.email,
                name: data.name,
                walletAddress: data.wallet_address || null,
                avatar: data.avatar || null
              });
            }
          });
        } catch (indexError) {
          // Fallback for name query (no index required)
          const errorMessage = indexError.message || String(indexError) || '';
          const errorCode = indexError.code || indexError.status || '';
          const errorString = JSON.stringify(indexError);
          const errorDetails = indexError.details || '';
          
          // Check if this is an index-related error (multiple formats)
          const isIndexError = 
            errorMessage.includes('index') || 
            errorMessage.includes('FAILED_PRECONDITION') ||
            errorMessage.includes('requires an index') ||
            errorCode === 9 ||
            errorCode === '9' ||
            String(errorCode).includes('FAILED_PRECONDITION') ||
            errorString.includes('FAILED_PRECONDITION') ||
            errorString.includes('requires an index') ||
            errorDetails.includes('index') ||
            errorDetails.includes('FAILED_PRECONDITION');
          
          if (isIndexError) {
            console.warn('Composite index not found for name query, using fallback (no index required):', errorMessage || errorString);
            try {
              const nameQueryFallback = await db.collection('users')
                .where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff')
                .limit((limit - users.length) * 3) // Get more to filter
                .get();
              
              nameQueryFallback.docs.forEach(doc => {
                if (users.length >= limit) return;
                const data = doc.data();
                // Filter discoverable in memory (default to true if not set)
                const isDiscoverable = data.discoverable !== false;
                
                if (isDiscoverable && !seenUserIds.has(doc.id)) {
                  seenUserIds.add(doc.id);
                  users.push({
                    userId: doc.id,
                    email: data.email,
                    name: data.name,
                    walletAddress: data.wallet_address || null,
                    avatar: data.avatar || null
                  });
                }
              });
            } catch (fallbackError) {
              console.error('Fallback name query also failed:', fallbackError);
              // Continue with results found so far
            }
          } else {
            // Re-throw if it's not an index error
            console.error('Unexpected error in searchKnownUsers name query:', indexError);
            throw indexError;
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        users: users,
        total: users.length
      });
      
    } catch (error) {
      console.error('Error in searchKnownUsers:', error);
      
      // Check if this is an index error that wasn't caught earlier
      const errorMessage = error.message || String(error) || '';
      const errorString = JSON.stringify(error);
      
      if (errorMessage.includes('FAILED_PRECONDITION') || 
          errorMessage.includes('requires an index') ||
          errorString.includes('FAILED_PRECONDITION')) {
        console.warn('Index error caught at top level, returning empty results:', errorMessage);
        // Return empty results instead of error to prevent breaking SPEND integration
        return res.status(200).json({
          success: true,
          users: [],
          total: 0,
          message: 'Index not configured - results filtered. Please create the composite index for better performance.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

// =============================================================================
// MATCH USERS BY EMAIL (SPEND Cross-Reference)
// =============================================================================

/**
 * POST /matchUsersByEmail
 * 
 * Cross-references a list of emails from SPEND with WeSplit's user database.
 * Returns which users exist in WeSplit and which are new.
 * 
 * This allows SPEND to:
 * 1. Know which users already have WeSplit accounts
 * 2. Generate invitation codes for existing users
 * 3. Generate download links for new users
 * 
 * Request:
 * {
 *   "emails": ["user1@example.com", "user2@example.com"],
 *   "splitId": "split_123",  // Optional - associates with a specific split
 *   "creatorId": "creator_user_id"  // Optional - for analytics
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "matched": {
 *     "existingUsers": [
 *       {
 *         "email": "user1@example.com",
 *         "userId": "wesplit_user_id",
 *         "hasWallet": true,
 *         "name": "John"  // Only first name for privacy
 *       }
 *     ],
 *     "newUsers": [
 *       {
 *         "email": "user2@example.com",
 *         "inviteCode": "INV_abc123",
 *         "inviteLink": "https://wesplit-deeplinks.web.app/join-split?invite=INV_abc123"
 *       }
 *     ]
 *   },
 *   "stats": {
 *     "totalEmails": 2,
 *     "existingCount": 1,
 *     "newCount": 1
 *   }
 * }
 */
exports.matchUsersByEmail = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      // Validate API key (skip in emulator)
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const { emails, splitId, creatorId } = req.body;
      
      // Validate emails
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'emails array is required and must not be empty'
        });
      }
      
      // Limit to prevent abuse (max 100 emails per request)
      if (emails.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 emails per request'
        });
      }
      
      // Normalize and deduplicate emails
      const normalizedEmails = [...new Set(
        emails
          .map(e => (e || '').toLowerCase().trim())
          .filter(e => e && e.includes('@'))
      )];
      
      const existingUsers = [];
      const newUsers = [];
      
      // Batch query users by email (Firestore supports 'in' queries up to 30)
      const batchSize = 30;
      for (let i = 0; i < normalizedEmails.length; i += batchSize) {
        const batch = normalizedEmails.slice(i, i + batchSize);
        
        const usersQuery = await db.collection('users')
          .where('email', 'in', batch)
          .get();
        
        const foundEmails = new Set();
        
        usersQuery.docs.forEach(doc => {
          const userData = doc.data();
          const email = userData.email?.toLowerCase();
          foundEmails.add(email);
          
          // Only include users who haven't opted out of discovery
          // Default to discoverable if field doesn't exist
          const isDiscoverable = userData.discoverable !== false;
          
          if (isDiscoverable) {
            existingUsers.push({
              email: email,
              userId: doc.id,
              hasWallet: !!(userData.wallet_address || userData.wallet_public_key),
              name: userData.name ? userData.name.split(' ')[0] : null, // Only first name for privacy
              hasAvatar: !!userData.avatar,
              // Don't expose full wallet address for privacy
              walletAddressPreview: userData.wallet_address 
                ? `${userData.wallet_address.substring(0, 4)}...${userData.wallet_address.slice(-4)}`
                : null
            });
          } else {
            // User exists but opted out - treat as "new" for privacy
            // but mark as needing consent
            newUsers.push({
              email: email,
              needsConsent: true,
              inviteLink: generateInviteLinkSync(email, splitId)
            });
          }
        });
        
        // Add non-found emails as new users
        batch.forEach(email => {
          if (!foundEmails.has(email)) {
            newUsers.push({
              email: email,
              inviteLink: generateInviteLinkSync(email, splitId)
            });
          }
        });
      }
      
      // Log analytics (sanitized - no PII)
      console.log('[SPEND] Email matching request:', {
        totalEmails: normalizedEmails.length,
        existingCount: existingUsers.length,
        newCount: newUsers.length,
        splitId: splitId || 'none',
        hasCreator: !!creatorId
      });
      
      // Store invite tracking if splitId provided
      if (splitId) {
        try {
          await db.collection('invite_batches').add({
            splitId: splitId,
            creatorId: creatorId || null,
            totalEmails: normalizedEmails.length,
            existingUserCount: existingUsers.length,
            newUserCount: newUsers.length,
            createdAt: FieldValue.serverTimestamp(),
            source: 'spend'
          });
        } catch (trackError) {
          console.warn('Failed to track invite batch:', trackError);
          // Non-critical, continue
        }
      }
      
      return res.status(200).json({
        success: true,
        matched: {
          existingUsers: existingUsers,
          newUsers: newUsers
        },
        stats: {
          totalEmails: normalizedEmails.length,
          existingCount: existingUsers.length,
          newCount: newUsers.length
        }
      });
      
    } catch (error) {
      console.error('Error in matchUsersByEmail:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Generate invite link synchronously (for non-users)
 */
function generateInviteLinkSync(email, splitId) {
  const inviteData = {
    email: email,
    splitId: splitId || null,
    timestamp: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(inviteData)).toString('base64url');
  // Use deep link domain for universal links (works for all users)
  return `https://wesplit-deeplinks.web.app/join-split?invite=${encoded}`;
}

/**
 * Generate invite link (async version)
 */
async function generateInviteLink(email, splitId) {
  return generateInviteLinkSync(email, splitId);
}

/**
 * Create email transporter for sending invitations
 */
function createEmailTransporter() {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();
  
  if (!emailUser || !emailPassword) {
    console.warn('Email credentials not configured. EMAIL_USER and EMAIL_PASSWORD must be set as Firebase Secrets.');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
}

/**
 * Generate email template for split invitation
 */
function generateSplitInvitationEmailTemplate(inviterName, splitTitle, amountOwed, currency, inviteLink) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #A5EA15 0%, #53EF97 100%); padding: 48px; text-align: center; color: #061113;">
        <h1 style="margin: 0; font-size: 36px; font-weight: 600; letter-spacing: -0.5px;">WeSplit</h1>
        <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 400;">You've been invited to split a bill</p>
      </div>

      <div style="padding: 48px; background: #061113;">
        <h2 style="color: #FFFFFF; margin-bottom: 24px; font-size: 32px; font-weight: 600; line-height: 40px; letter-spacing: -0.5px;">Hello!</h2>
        <p style="color: rgba(255, 255, 255, 0.70); line-height: 24px; margin-bottom: 32px; font-size: 16px; font-weight: 400;">
          <strong>${inviterName}</strong> has invited you to split <strong>"${splitTitle}"</strong> on WeSplit.
        </p>

        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 16px; padding: 32px; margin: 32px 0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="color: rgba(255, 255, 255, 0.50); font-size: 14px; margin: 0 0 8px 0; font-weight: 400;">Your share</p>
            <h3 style="color: #A5EA15; font-size: 36px; margin: 0; font-weight: 600;">${amountOwed.toFixed(2)} ${currency}</h3>
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #A5EA15 0%, #53EF97 100%); color: #061113; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
            Join Split
          </a>
        </div>

        <p style="color: rgba(255, 255, 255, 0.50); font-size: 14px; margin-top: 32px; font-weight: 400; line-height: 20px;">
          Click the button above to join the split and pay your share. This invitation will expire in 7 days.
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
 * Send email invitation to a participant
 */
async function sendEmailInvitation(email, inviterName, splitTitle, amountOwed, currency, inviteLink) {
  try {
    const transporter = createEmailTransporter();
    
    if (!transporter) {
      console.warn('Email transporter not available, skipping email send');
      return { sent: false, reason: 'Email service not configured' };
    }

    // Verify transporter connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('Email transporter verification failed:', verifyError.message);
      return { sent: false, reason: 'Email service authentication failed' };
    }

    const emailUser = process.env.EMAIL_USER?.trim();
    const mailOptions = {
      from: emailUser || 'noreply@wesplit.app',
      to: email,
      subject: `${inviterName} invited you to split "${splitTitle}" on WeSplit`,
      html: generateSplitInvitationEmailTemplate(inviterName, splitTitle, amountOwed, currency, inviteLink)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Split invitation email sent successfully:', {
      messageId: info.messageId,
      to: email,
      splitTitle
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending split invitation email:', {
      error: error.message,
      email,
      splitTitle
    });
    return { sent: false, reason: error.message };
  }
}

// =============================================================================
// BATCH INVITE PARTICIPANTS (Enhanced for SPEND)
// =============================================================================

/**
 * POST /batchInviteParticipants
 * 
 * Enhanced invitation flow for SPEND that handles:
 * - Existing WeSplit users (auto-add to split)
 * - New users (create pending invitations)
 * - Email notifications
 * 
 * Request:
 * {
 *   "splitId": "split_123",
 *   "inviterId": "creator_user_id",
 *   "inviterName": "John Doe",
 *   "participants": [
 *     {
 *       "email": "user1@example.com",
 *       "name": "User One",
 *       "amountOwed": 33.33
 *     }
 *   ],
 *   "sendNotifications": true  // Optional, default true
 * }
 */
exports.batchInviteParticipants = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      // Validate API key
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const { splitId, inviterId, inviterName, participants, sendNotifications = true } = req.body;
      
      // Validate required fields
      if (!splitId || !inviterId || !participants || !Array.isArray(participants)) {
        return res.status(400).json({
          success: false,
          error: 'splitId, inviterId, and participants array are required'
        });
      }
      
      // Get the split using helper function
      const splitDoc = await getSplitById(splitId);
      
      if (!splitDoc) {
        return res.status(404).json({
          success: false,
          error: 'Split not found',
          message: `No split found with ID: ${splitId}. Please verify the splitId is correct and the split was created successfully.`,
          splitId: splitId
        });
      }
      
      const splitData = splitDoc.data();
      
      const results = {
        addedExisting: [],      // Existing users added directly to split
        pendingInvites: [],     // New users - pending account creation
        alreadyParticipant: [], // Already in the split
        failed: []              // Failed invitations
      };
      
      // Process each participant
      for (const participant of participants) {
        if (!participant.email) {
          results.failed.push({
            ...participant,
            error: 'Email is required'
          });
          continue;
        }
        
        const email = participant.email.toLowerCase().trim();
        const amountOwed = participant.amountOwed || (splitData.totalAmount / (participants.length + 1));
        
        // Check if already a participant
        const existingParticipant = (splitData.participants || []).find(
          p => p.email?.toLowerCase() === email
        );
        
        if (existingParticipant) {
          results.alreadyParticipant.push({
            email: email,
            userId: existingParticipant.userId,
            name: existingParticipant.name
          });
          continue;
        }
        
        // Check if user exists in WeSplit
        const userQuery = await db.collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (!userQuery.empty) {
          // Existing user - add directly to split
          const userDoc = userQuery.docs[0];
          const userData = userDoc.data();
          
          const newParticipant = {
            userId: userDoc.id,
            email: email,
            name: userData.name || participant.name || email.split('@')[0],
            walletAddress: userData.wallet_address || '',
            amountOwed: amountOwed,
            amountPaid: 0,
            status: 'invited',
            avatar: userData.avatar || '',
            invitedAt: new Date().toISOString(),
            invitedBy: inviterId
          };
          
          // Add to split participants
          await splitDoc.ref.update({
            participants: FieldValue.arrayUnion(newParticipant),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          results.addedExisting.push({
            email: email,
            userId: userDoc.id,
            name: newParticipant.name,
            amountOwed: amountOwed
          });
          
          // TODO: Send push notification to user
          
        } else {
          // New user - create pending invitation
          const pendingInvite = {
            splitId: splitId,
            email: email,
            name: participant.name || email.split('@')[0],
            amountOwed: amountOwed,
            inviterId: inviterId,
            inviterName: inviterName,
            splitTitle: splitData.title,
            splitTotal: splitData.totalAmount,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            source: 'spend'
          };
          
          // Store pending invitation
          await db.collection('pending_invitations').add(pendingInvite);
          
          const inviteLink = generateInviteLinkSync(email, splitId);
          
          results.pendingInvites.push({
            email: email,
            name: pendingInvite.name,
            amountOwed: amountOwed,
            inviteLink: inviteLink
          });
          
          // Send email invitation if notifications are enabled
          if (sendNotifications) {
            const emailResult = await sendEmailInvitation(
              email,
              inviterName || splitData.creatorName || 'Someone',
              splitData.title || 'Split',
              amountOwed,
              splitData.currency || 'USDC',
              inviteLink
            );
            
            if (!emailResult.sent) {
              console.warn('Failed to send email invitation', {
                email,
                reason: emailResult.reason,
                splitId
          });
              // Don't fail the invitation if email fails - log and continue
            }
          }
        }
      }
      
      // Send webhook notification to SPEND
      if (splitData.externalMetadata?.webhookUrl) {
        try {
          await sendWebhookNotification(splitData, 'split.participants_invited', {
            addedCount: results.addedExisting.length,
            pendingCount: results.pendingInvites.length,
            participants: [...results.addedExisting, ...results.pendingInvites]
          });
        } catch (webhookError) {
          console.warn('Failed to send webhook:', webhookError);
        }
      }
      
      // Build response with optional deep link for redirect
      const response = {
        success: true,
        results: results,
        summary: {
          addedExisting: results.addedExisting.length,
          pendingInvites: results.pendingInvites.length,
          alreadyParticipant: results.alreadyParticipant.length,
          failed: results.failed.length
        }
      };

      // If split has external metadata with callback URL, include deep link
      if (splitData.externalMetadata?.callbackUrl) {
        const callbackUrl = splitData.externalMetadata.callbackUrl;
        const orderId = splitData.externalMetadata.orderId;
        
        // Generate deep link to view split in WeSplit app
        const viewSplitParams = new URLSearchParams({
          splitId: splitId
        });
        
        if (splitData.creatorId) {
          viewSplitParams.append('userId', splitData.creatorId);
        }
        
        response.deepLink = `wesplit://view-split?${viewSplitParams.toString()}`;
        response.redirectUrl = callbackUrl; // Also include direct redirect URL
      }

      return res.status(200).json(response);
      
    } catch (error) {
      console.error('Error in batchInviteParticipants:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

// =============================================================================
// GET SPLIT STATUS
// =============================================================================

/**
 * GET /getSplitStatus?splitId=split_123
 * 
 * Gets the current status of a split including all participants and payment progress.
 * 
 * Response:
 * {
 *   "success": true,
 *   "split": {
 *     "id": "split_123",
 *     "status": "active",
 *     "totalAmount": 100,
 *     "amountCollected": 66.66,
 *     "participants": [...]
 *   }
 * }
 */
exports.getSplitStatus = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow GET
      if (req.method !== 'GET') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use GET.'
        });
      }
      
      // Validate API key (skip in emulator)
      if (!isEmulatorMode(req)) {
        const keyValidation = await validateApiKey(req.headers.authorization);
        if (!keyValidation.valid) {
          return res.status(401).json({
            success: false,
            error: keyValidation.error
          });
        }
      }
      
      const splitId = req.query.splitId;
      
      if (!splitId) {
        return res.status(400).json({
          success: false,
          error: 'splitId query parameter is required'
        });
      }
      
      // Get the split using helper function
      const splitDoc = await getSplitById(splitId);
      
      if (!splitDoc) {
        return res.status(404).json({
          success: false,
          error: 'Split not found',
          message: `No split found with ID: ${splitId}. Please verify the splitId is correct and the split was created successfully.`,
          splitId: splitId
        });
      }
      
      const splitData = splitDoc.data();
      
      // Calculate totals
      const amountCollected = (splitData.participants || [])
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const participantsPaid = (splitData.participants || [])
        .filter(p => p.status === 'paid').length;
      
      return res.status(200).json({
        success: true,
        split: {
          id: splitData.id,
          title: splitData.title,
          status: splitData.status,
          splitType: splitData.splitType,
          totalAmount: splitData.totalAmount,
          currency: splitData.currency,
          amountCollected: amountCollected,
          remainingAmount: splitData.totalAmount - amountCollected,
          completionPercentage: (amountCollected / splitData.totalAmount * 100).toFixed(2),
          participantsCount: (splitData.participants || []).length,
          participantsPaid: participantsPaid,
          createdAt: splitData.createdAt,
          updatedAt: splitData.updatedAt,
          externalMetadata: {
            orderId: splitData.externalMetadata?.orderId,
            orderNumber: splitData.externalMetadata?.orderNumber,
            orderStatus: splitData.externalMetadata?.orderStatus,
            paymentStatus: splitData.externalMetadata?.paymentStatus,
            paymentThreshold: splitData.externalMetadata?.paymentThreshold,
          },
          participants: (splitData.participants || []).map(p => ({
            userId: p.userId,
            email: p.email,
            name: p.name,
            amountOwed: p.amountOwed,
            amountPaid: p.amountPaid || 0,
            status: p.status,
          }))
        }
      });
      
    } catch (error) {
      console.error('Error in getSplitStatus:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

// =============================================================================
// WEBHOOK SENDER (WeSplit -> SPEND)
// =============================================================================

/**
 * Send webhook notification to SPEND
 * 
 * Events:
 * - split.created
 * - split.participant_added
 * - split.participant_paid
 * - split.funded
 * - split.cancelled
 */
async function sendWebhookNotification(splitData, event, additionalData = {}) {
  try {
    const webhookUrl = splitData.externalMetadata?.webhookUrl;
    const webhookSecret = splitData.externalMetadata?.webhookSecret;
    
    if (!webhookUrl) {
      console.log('No webhook URL configured for split:', splitData.id);
      return { sent: false, reason: 'No webhook URL configured' };
    }
    
    // Build webhook payload
    const payload = {
      event: event,
      split_id: splitData.id,
      order_id: splitData.externalMetadata?.orderId,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    // Add event-specific data
    switch (event) {
      case 'split.created':
        payload.total_amount = splitData.totalAmount;
        payload.currency = splitData.currency;
        payload.creator_id = splitData.creatorId;
        payload.participants = (splitData.participants || []).map(p => ({
          user_id: p.userId,
          email: p.email,
          amount_owed: p.amountOwed
        }));
        break;
        
      case 'split.funded':
        payload.total_amount = splitData.totalAmount;
        payload.currency = splitData.currency;
        break;
    }
    
    // Create signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', webhookSecret || 'default_secret')
      .update(signedPayload)
      .digest('hex');
    
    // Send webhook
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WeSplit-Signature': `t=${timestamp},v1=${signature}`,
        'X-WeSplit-Event': event,
        'User-Agent': 'WeSplit-Webhooks/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000 // 10 second timeout
    });
    
    const responseText = await response.text();
    
    // Log webhook delivery
    await db.collection('webhook_logs').add({
      event: event,
      splitId: splitData.id,
      orderId: splitData.externalMetadata?.orderId,
      webhookUrl: webhookUrl,
      payload: payload,
      responseStatus: response.status,
      responseBody: responseText.substring(0, 500), // Limit logged response
      success: response.ok,
      timestamp: FieldValue.serverTimestamp()
    });
    
    return {
      sent: true,
      status: response.status,
      success: response.ok
    };
    
  } catch (error) {
    console.error('Error sending webhook:', error);
    
    // Log failed webhook
    await db.collection('webhook_logs').add({
      event: event,
      splitId: splitData.id,
      orderId: splitData.externalMetadata?.orderId,
      webhookUrl: splitData.externalMetadata?.webhookUrl,
      error: error.message,
      success: false,
      timestamp: FieldValue.serverTimestamp()
    });
    
    return {
      sent: false,
      error: error.message
    };
  }
}

// =============================================================================
// WEBHOOK RECEIVER (SPEND -> WeSplit)
// =============================================================================

/**
 * POST /spendWebhook
 * 
 * Receives webhook callbacks from SPEND when order status changes.
 * Validates HMAC-SHA256 signature before processing.
 * 
 * Expected Headers:
 * - X-Spend-Signature: t=timestamp,v1=signature
 * - Content-Type: application/json
 * 
 * Expected Payload:
 * {
 *   "event": "order.status_changed",
 *   "order_id": "order_123",
 *   "status": "shipped",
 *   "timestamp": "2025-01-27T10:00:00Z",
 *   ...
 * }
 */
exports.spendWebhook = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed. Use POST.'
        });
      }
      
      const signatureHeader = req.headers['x-spend-signature'];
      const payload = req.body;
      
      // Log incoming webhook
      console.log('=== SPEND WEBHOOK RECEIVED ===');
      console.log('Event:', payload.event);
      console.log('Order ID:', payload.order_id);
      console.log('Status:', payload.status);
      
      // Store webhook for debugging (filter out undefined values)
      const webhookLogData = {
        receivedAt: FieldValue.serverTimestamp(),
        event: payload.event || 'unknown',
        orderId: payload.order_id || null,
        status: payload.status || null,
        payload: JSON.parse(JSON.stringify(payload)), // Removes undefined values
        signatureHeader: signatureHeader || null,
        verified: false // Will be updated after verification
      };
      await db.collection('spend_webhook_received').add(webhookLogData);
      
      // Verify signature (if provided)
      if (signatureHeader) {
        const isValid = await verifySpendWebhookSignature(payload, signatureHeader);
        if (!isValid) {
          console.warn('Invalid webhook signature');
          return res.status(401).json({
            success: false,
            error: 'Invalid webhook signature'
          });
        }
      } else if (!isEmulatorMode(req)) {
        console.warn('Missing webhook signature in production');
        // In production, require signature
        // For now, log warning but continue
      }
      
      // Find associated split by order ID
      if (payload.order_id) {
        const splitsRef = db.collection('splits');
        const splitQuery = await splitsRef
          .where('externalMetadata.orderId', '==', payload.order_id)
          .limit(1)
          .get();
        
        if (!splitQuery.empty) {
          const splitDoc = splitQuery.docs[0];
          const splitData = splitDoc.data();
          
          // Update split with new order status
          const updates = {
            'externalMetadata.orderStatus': payload.status,
            updatedAt: FieldValue.serverTimestamp()
          };
          
          // Handle specific events
          switch (payload.event) {
            case 'order.shipped':
              updates['externalMetadata.trackingNumber'] = payload.tracking_number;
              updates['externalMetadata.trackingUrl'] = payload.tracking_url;
              updates['externalMetadata.shippedAt'] = payload.timestamp;
              break;
              
            case 'order.delivered':
              updates['externalMetadata.deliveredAt'] = payload.timestamp;
              updates.status = 'completed';
              break;
              
            case 'order.cancelled':
              updates.status = 'cancelled';
              updates['externalMetadata.cancelledAt'] = payload.timestamp;
              updates['externalMetadata.cancellationReason'] = payload.reason;
              break;
          }
          
          await splitDoc.ref.update(updates);
          
          console.log('Split updated with order status:', {
            splitId: splitData.id,
            newStatus: payload.status
          });
        } else {
          console.warn('No split found for order:', payload.order_id);
        }
      }
      
      // Return success
      return res.status(200).json({
        success: true,
        message: 'Webhook received and processed',
        event: payload.event,
        order_id: payload.order_id
      });
      
    } catch (error) {
      console.error('Error processing SPEND webhook:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
});

/**
 * Verify SPEND webhook signature
 */
async function verifySpendWebhookSignature(payload, signatureHeader) {
  try {
    // Parse signature header: t=timestamp,v1=signature
    const elements = signatureHeader.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];
    
    if (!timestamp || !signature) {
      console.warn('Missing timestamp or signature in header');
      return false;
    }
    
    // Check timestamp (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      console.warn('Webhook timestamp too old');
      return false;
    }
    
    // Get webhook secret from config or environment
    const webhookSecret = process.env.SPEND_WEBHOOK_SECRET || 
                          functions.config().spend?.webhook_secret;
    
    if (!webhookSecret) {
      console.warn('No webhook secret configured, skipping verification');
      return true; // Allow for development
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');
    
    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Export webhook sender for use in other modules
exports.sendWebhookNotification = sendWebhookNotification;

