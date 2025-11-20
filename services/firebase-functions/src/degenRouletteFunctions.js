/**
 * Degen Roulette Cloud Function
 * Selects the loser for degen splits using secure randomness on the server.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

const db = admin.firestore();
const AUDIT_HISTORY_LIMIT = 10;

const sanitizeParticipant = (participant = {}) => ({
  userId: participant.userId,
  name: participant.name,
  status: participant.status,
  amountPaid: participant.amountPaid,
  amountOwed: participant.amountOwed,
  transactionSignature: participant.transactionSignature || null,
});

const validateParticipants = (walletData) => {
  const errors = [];
  const participants = Array.isArray(walletData.participants) ? walletData.participants : [];

  if (participants.length === 0) {
    errors.push('No participants found for this split wallet.');
  }

  const unlockedParticipants = participants.filter(
    (participant) =>
      participant.status !== 'locked' ||
      (participant.amountPaid || 0) < (participant.amountOwed || 0) ||
      !participant.transactionSignature
  );

  if (unlockedParticipants.length > 0) {
    errors.push(
      `All participants must be locked before spinning. Pending: ${unlockedParticipants
        .map((participant) => participant.name || participant.userId)
        .join(', ')}`
    );
  }

  if (walletData.degenLoser && walletData.status === 'spinning_completed') {
    errors.push('Roulette has already been completed for this split wallet.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const getSplitDocRef = async (transaction, billId) => {
  if (!billId) {
    return null;
  }

  const splitQuerySnapshot = await transaction.get(
    db.collection('splits').where('id', '==', billId).limit(1)
  );

  if (splitQuerySnapshot.empty) {
    return null;
  }

  return splitQuerySnapshot.docs[0].ref;
};

exports.executeDegenRoulette = functions
  .runWith({
    timeoutSeconds: 20,
    memory: '256MB',
  })
  .https.onCall(async (data = {}, context) => {
    try {
      if (!context.auth?.uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
      }

      const splitWalletId = data.splitWalletId;
      if (!splitWalletId || typeof splitWalletId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'splitWalletId is required.');
      }

      const walletRef = db.collection('splitWallets').doc(splitWalletId);
      const result = await db.runTransaction(async (transaction) => {
        const walletSnap = await transaction.get(walletRef);
        if (!walletSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'Split wallet not found.');
        }

        const walletData = walletSnap.data();
        const requesterId = context.auth.uid;

        if (walletData.creatorId && walletData.creatorId !== requesterId) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'Only the split creator can spin the roulette.'
          );
        }

        if (walletData.status === 'cancelled' || walletData.status === 'completed') {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'This split is no longer active.'
          );
        }

        const validation = validateParticipants(walletData);
        if (!validation.isValid) {
          throw new functions.https.HttpsError('failed-precondition', validation.errors[0], {
            validationErrors: validation.errors,
          });
        }

        const participants = Array.isArray(walletData.participants)
          ? walletData.participants
          : [];

        const randomBytes = crypto.randomBytes(4);
        const loserIndex = randomBytes.readUInt32BE(0) % participants.length;
        const loserParticipant = participants[loserIndex];

        if (!loserParticipant) {
          throw new functions.https.HttpsError(
            'internal',
            'Unable to determine loser participant.'
          );
        }

        const timestamp = new Date().toISOString();
        const loserRecord = {
          userId: loserParticipant.userId,
          name: loserParticipant.name,
          selectedAt: timestamp,
          requestedByUserId: requesterId,
          entropySource: 'node-crypto',
          seed: randomBytes.toString('hex'),
        };

        const auditEntry = {
          selectedAt: timestamp,
          requestedByUserId: requesterId,
          entropySource: 'node-crypto',
          seed: randomBytes.toString('hex'),
          participantIds: participants.map((participant) => participant.userId),
          lockedParticipantIds: participants
            .filter((participant) => participant.status === 'locked')
            .map((participant) => participant.userId),
          loserUserId: loserParticipant.userId,
          totalParticipants: participants.length,
        };

        const currentAudit = Array.isArray(walletData.rouletteAudit)
          ? walletData.rouletteAudit.slice(-(AUDIT_HISTORY_LIMIT - 1))
          : [];
        const updatedAudit = [...currentAudit, auditEntry];

        const updatedWalletData = {
          ...walletData,
          degenLoser: loserRecord,
          degenWinner: loserRecord,
          rouletteAudit: updatedAudit,
          status: 'spinning_completed',
        };

        transaction.update(walletRef, {
          degenLoser: loserRecord,
          degenWinner: loserRecord,
          rouletteAudit: updatedAudit,
          status: 'spinning_completed',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        const splitRef = await getSplitDocRef(transaction, walletData.billId);
        if (splitRef) {
          transaction.update(splitRef, {
            degenLoser: loserRecord,
            degenWinner: loserRecord,
            rouletteAudit: updatedAudit,
            status: 'spinning_completed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return {
          loserParticipant: sanitizeParticipant(loserParticipant),
          participants: participants.map(sanitizeParticipant),
          auditEntry,
          updatedWallet: {
            ...updatedWalletData,
            participants: participants.map(sanitizeParticipant),
          },
        };
      });

      const winners = result.participants
        .filter((participant) => participant.userId !== result.loserParticipant.userId)
        .map((participant) => ({
          userId: participant.userId,
          name: participant.name,
        }));

      return {
        success: true,
        loserUserId: result.loserParticipant.userId,
        loserName: result.loserParticipant.name,
        loserIndex: result.participants.findIndex(
          (participant) => participant.userId === result.loserParticipant.userId
        ),
        winners,
        auditEntry: result.auditEntry,
        updatedWallet: result.updatedWallet,
      };
    } catch (error) {
      console.error('executeDegenRoulette failed', {
        message: error.message,
        code: error.code,
        details: error.details,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        error?.message || 'Failed to execute roulette.'
      );
    }
  });

