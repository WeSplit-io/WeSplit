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
         req.headers.host?.includes('localhost');
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
      const splitsRef = db.collection('splits');
      const splitQuery = await splitsRef.where('id', '==', splitId).limit(1).get();
      
      if (splitQuery.empty) {
        return res.status(404).json({
          success: false,
          error: 'Split not found'
        });
      }
      
      const splitDoc = splitQuery.docs[0];
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
      
      // Get the split
      const splitsRef = db.collection('splits');
      const splitQuery = await splitsRef.where('id', '==', splitId).limit(1).get();
      
      if (splitQuery.empty) {
        return res.status(404).json({
          success: false,
          error: 'Split not found'
        });
      }
      
      const splitDoc = splitQuery.docs[0];
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
      
      return res.status(200).json({
        success: true,
        transactionSignature: transactionSignature || null,
        amountPaid: newAmountPaid,
        remainingAmount: remainingAmount,
        splitStatus: newSplitStatus,
        isFullyFunded: isFullyFunded
      });
      
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
      
      // Search by email (prefix match)
      const emailQuery = await db.collection('users')
        .where('email', '>=', queryLower)
        .where('email', '<=', queryLower + '\uf8ff')
        .where('discoverable', '!=', false) // Only discoverable users
        .limit(limit)
        .get();
      
      emailQuery.docs.forEach(doc => {
        const data = doc.data();
        if (!users.find(u => u.userId === doc.id)) {
          users.push({
            userId: doc.id,
            email: data.email,
            name: data.name,
            walletAddress: data.wallet_address || null,
            avatar: data.avatar || null
          });
        }
      });
      
      // Search by name (prefix match) if we need more results
      if (users.length < limit) {
        const nameQuery = await db.collection('users')
          .where('name', '>=', query)
          .where('name', '<=', query + '\uf8ff')
          .where('discoverable', '!=', false)
          .limit(limit - users.length)
          .get();
        
        nameQuery.docs.forEach(doc => {
          const data = doc.data();
          if (!users.find(u => u.userId === doc.id)) {
            users.push({
              userId: doc.id,
              email: data.email,
              name: data.name,
              walletAddress: data.wallet_address || null,
              avatar: data.avatar || null
            });
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        users: users,
        total: users.length
      });
      
    } catch (error) {
      console.error('Error in searchKnownUsers:', error);
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
 *         "inviteLink": "https://wesplit.io/join-split?invite=INV_abc123"
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
  return `https://wesplit.io/join-split?invite=${encoded}`;
}

/**
 * Generate invite link (async version)
 */
async function generateInviteLink(email, splitId) {
  return generateInviteLinkSync(email, splitId);
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
      
      // Get the split
      const splitsQuery = await db.collection('splits')
        .where('id', '==', splitId)
        .limit(1)
        .get();
      
      if (splitsQuery.empty) {
        return res.status(404).json({
          success: false,
          error: 'Split not found'
        });
      }
      
      const splitDoc = splitsQuery.docs[0];
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
          
          results.pendingInvites.push({
            email: email,
            name: pendingInvite.name,
            amountOwed: amountOwed,
            inviteLink: generateInviteLinkSync(email, splitId)
          });
          
          // TODO: Send email invitation
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
      
      return res.status(200).json({
        success: true,
        results: results,
        summary: {
          addedExisting: results.addedExisting.length,
          pendingInvites: results.pendingInvites.length,
          alreadyParticipant: results.alreadyParticipant.length,
          failed: results.failed.length
        }
      });
      
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
      
      // Get the split
      const splitsRef = db.collection('splits');
      const splitQuery = await splitsRef.where('id', '==', splitId).limit(1).get();
      
      if (splitQuery.empty) {
        return res.status(404).json({
          success: false,
          error: 'Split not found'
        });
      }
      
      const splitData = splitQuery.docs[0].data();
      
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

