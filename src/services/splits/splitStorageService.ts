/**
 * Split Storage Service
 * Manages split data storage and retrieval in Firebase
 * Handles the complete lifecycle of splits from creation to completion
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { logger } from '../analytics/loggingService';
// Remove undefined values helper function
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {return obj;}
  if (typeof obj !== 'object') {return obj;}
  if (Array.isArray(obj)) {return obj.map(removeUndefinedValues);}
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefinedValues(value);
    }
  }
  return cleaned;
};

export interface Split {
  id: string;
  billId: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  category?: string; // Category for the split (trip, food, home, event, rocket)
  splitType?: 'fair' | 'degen';
  splitMethod?: 'equal' | 'manual'; // Locked split method after confirmation
  status: 'draft' | 'pending' | 'active' | 'locked' | 'completed' | 'cancelled';
  creatorId: string;
  creatorName: string;
  participants: SplitParticipant[];
  items?: SplitItem[];
  merchant?: {
    name: string;
    address?: string;
    phone?: string;
  };
  date: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  firebaseDocId?: string;
  // OCR-extracted data
  subtotal?: number; // Subtotal from receipt (before tax)
  tax?: number; // Tax amount from receipt
  receiptNumber?: string; // Receipt number from OCR
  // Wallet information
  walletId?: string;
  walletAddress?: string;
}

export interface SplitParticipant {
  userId: string;
  name: string;
  email?: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'invited' | 'accepted' | 'declined' | 'paid' | 'locked';
  joinedAt?: string;
  paidAt?: string;
  transactionSignature?: string;
  avatar?: string; // Optional avatar URL
}

export interface SplitItem {
  id: string;
  name: string;
  price: number;
  participants: string[]; // Array of participant IDs who share this item
}

export interface SplitResult {
  success: boolean;
  split?: Split;
  error?: string;
}

export interface SplitListResult {
  success: boolean;
  splits?: Split[];
  error?: string;
  hasMore?: boolean; // Indicates if there are more splits to load
  totalCount?: number; // Total number of splits (if available)
  currentPage?: number; // Current page number
  totalPages?: number; // Total number of pages
  lastDoc?: QueryDocumentSnapshot; // Last document for pagination
}

export class SplitStorageServiceClass {
  private static readonly COLLECTION_NAME = 'splits'


  /**
   * Create a new split in the database
   */
  static async createSplit(splitData: Omit<Split, 'id' | 'createdAt' | 'updatedAt' | 'firebaseDocId'>): Promise<SplitResult> {
    try {
      logger.info('Creating split', {
        title: splitData.title,
        totalAmount: splitData.totalAmount,
        splitType: splitData.splitType,
        creatorId: splitData.creatorId,
        participantsCount: splitData.participants.length
      });

      const split: Omit<Split, 'firebaseDocId'> = {
        ...splitData,
        id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined values to prevent Firebase errors
      const cleanedSplit = removeUndefinedValues(split);
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), cleanedSplit);
      
      const createdSplit: Split = {
        ...split,
        firebaseDocId: docRef.id,
      };

      logger.info('Split created successfully', {
        splitId: createdSplit.id,
        firebaseDocId: docRef.id,
        title: createdSplit.title,
        splitType: createdSplit.splitType,
        participantsCount: createdSplit.participants.length
      }, 'SplitStorageService');

      // Sync first split quest completion
      try {
        const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
        await userActionSyncService.syncFirstSplit(createdSplit.creatorId);
      } catch (syncError) {
        logger.error('Failed to sync first split quest', { 
          userId: createdSplit.creatorId, 
          splitId: createdSplit.id,
          syncError 
        }, 'SplitStorageService');
        // Don't fail split creation if sync fails
      }

      // Award split creation rewards (owner bonus + first split with friends)
      try {
        const { splitRewardsService } = await import('../../services/rewards/splitRewardsService');
        const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
        
        // Award owner bonus for creating split
        if (createdSplit.splitType === 'fair') {
          await splitRewardsService.awardFairSplitParticipation({
            userId: createdSplit.creatorId,
            splitId: createdSplit.id,
            splitType: 'fair',
            splitAmount: createdSplit.totalAmount,
            isOwner: true
          });
        }
        
        // Check for first split with friends (multiple participants)
        if (createdSplit.participants.length > 1) {
          await userActionSyncService.syncFirstSplitWithFriends(
            createdSplit.creatorId,
            createdSplit.id,
            createdSplit.participants.length
          );
        }
      } catch (rewardError) {
        logger.error('Failed to award split creation rewards', { 
          userId: createdSplit.creatorId, 
          splitId: createdSplit.id,
          rewardError 
        }, 'SplitStorageService');
        // Don't fail split creation if rewards fail
      }

      return {
        success: true,
        split: createdSplit,
      };

    } catch (error) {
      logger.error('Error creating split', { error: (error as Error).message }, 'splitStorageService');
      logger.error('Failed to create split', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a split by billId
   */
  static async getSplitByBillId(billId: string): Promise<SplitResult> {
    try {
      logger.info('Getting split by billId', { billId }, 'splitStorageService');

      const splitsRef = collection(db, this.COLLECTION_NAME);
      const q = query(splitsRef, where('billId', '==', billId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        logger.warn('Split not found by billId', { billId }, 'splitStorageService');
        return {
          success: false,
          error: 'Split not found',
        };
      }

      // Get the most recent split (in case there are multiple) - sort by createdAt in JavaScript
      const sortedDocs = querySnapshot.docs.sort((a, b) => {
        const aTime = new Date(a.data().createdAt).getTime();
        const bTime = new Date(b.data().createdAt).getTime();
        return bTime - aTime; // Descending order (most recent first)
      });
      
      const splitDoc = sortedDocs[0];
      const splitData = splitDoc.data() as Split;
      splitData.firebaseDocId = splitDoc.id;

      logger.info('Split found by billId', { 
        splitId: splitData.id, 
        firebaseDocId: splitDoc.id,
        status: splitData.status,
        createdAt: splitData.createdAt,
        totalAmount: splitData.totalAmount,
        participantsCount: splitData.participants?.length || 0
      }, 'splitStorageService');
      
      return {
        success: true,
        split: splitData,
      };

    } catch (error) {
      logger.error('Error getting split by billId', { error: (error as Error).message, billId }, 'splitStorageService');
      logger.error('Failed to get split by billId', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get a split by ID
   */
  static async getSplit(splitId: string): Promise<SplitResult> {
    try {
      logger.info('Getting split by ID', { splitId }, 'splitStorageService');

      // First try by Firebase document ID
      if (splitId.length > 20 && !splitId.startsWith('split_')) {
        const splitDoc = await getDoc(doc(db, this.COLLECTION_NAME, splitId));
        
        if (splitDoc.exists()) {
          const splitData = splitDoc.data() as Split;
          splitData.firebaseDocId = splitDoc.id;
          
          logger.info('Split found by Firebase ID', { 
            splitId: splitData.id, 
            firebaseDocId: splitDoc.id,
            status: splitData.status,
            createdAt: splitData.createdAt,
            totalAmount: splitData.totalAmount
          }, 'splitStorageService');
          
          return {
            success: true,
            split: splitData,
          };
        }
      }

      // Try by internal ID (no orderBy needed since ID is unique)
      const splitsRef = collection(db, this.COLLECTION_NAME);
      const q = query(splitsRef, where('id', '==', splitId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Get the most recent split (in case there are multiple)
        const splitData = querySnapshot.docs[0].data() as Split;
        splitData.firebaseDocId = querySnapshot.docs[0].id;
        
        logger.info('Split found by internal ID', { 
          splitId: splitData.id, 
          firebaseDocId: querySnapshot.docs[0].id,
          status: splitData.status,
          createdAt: splitData.createdAt,
          totalAmount: splitData.totalAmount
        }, 'splitStorageService');
        
        return {
          success: true,
          split: splitData,
        };
      }

      logger.warn('Split not found by ID', { splitId }, 'splitStorageService');
      return {
        success: false,
        error: 'Split not found',
      };

    } catch (error) {
      logger.error('Error getting split', { error: (error as Error).message }, 'splitStorageService');
      logger.error('Failed to get split', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get splits for a user (as creator or participant) with pagination
   * @param userId - User ID
   * @param limitCount - Maximum number of splits to return (default: 20)
   * @param pageNumber - Page number (1-indexed, default: 1)
   * @param lastDoc - Last document snapshot from previous page (for pagination)
   */
  static async getUserSplits(
    userId: string, 
    limitCount: number = 20,
    pageNumber: number = 1,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<SplitListResult> {
    try {
      const splitsRef = collection(db, this.COLLECTION_NAME);
      
      // Build creator query with pagination
      let creatorQueryConstraints: any[] = [
        where('creatorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];
      
      // Add startAfter for pagination (skip first page)
      if (lastDoc && pageNumber > 1) {
        creatorQueryConstraints.splice(-1, 0, startAfter(lastDoc));
      }
      
      let creatorQuery = query(splitsRef, ...creatorQueryConstraints);
      
      // For participant splits, we need to query all and filter client-side
      // But limit the query to reduce data transfer
      // Note: Firestore doesn't support array-contains with complex objects well
      // So we limit the query and filter client-side
      let allSplitsQueryConstraints: any[] = [
        orderBy('createdAt', 'desc'),
        limit(limitCount * 2) // Get more to account for filtering
      ];
      
      if (lastDoc && pageNumber > 1) {
        allSplitsQueryConstraints.splice(-1, 0, startAfter(lastDoc));
      }
      
      let allSplitsQuery = query(splitsRef, ...allSplitsQueryConstraints);

      const [creatorSnapshot, allSplitsSnapshot] = await Promise.all([
        getDocs(creatorQuery),
        getDocs(allSplitsQuery)
      ]);

      const splits: Split[] = [];
      const seenIds = new Set<string>();

      // Add creator splits
      creatorSnapshot.docs.forEach(doc => {
        const splitData = doc.data() as Split;
        splitData.firebaseDocId = doc.id;
        if (!seenIds.has(splitData.id)) {
          splits.push(splitData);
          seenIds.add(splitData.id);
        }
      });

      // Add participant splits (avoid duplicates) - only show accepted invitations
      allSplitsSnapshot.docs.forEach(doc => {
        const splitData = doc.data() as Split;
        splitData.firebaseDocId = doc.id;
        
        // Check if user is a participant in this split with accepted status
        const userParticipant = splitData.participants.find(participant => 
          participant.userId === userId
        );
        
        // Only include splits where user has accepted the invitation
        const isAcceptedParticipant = userParticipant && 
          (userParticipant.status === 'accepted' || userParticipant.status === 'paid' || userParticipant.status === 'locked');
        
        if (isAcceptedParticipant && !seenIds.has(splitData.id)) {
          // Found accepted participant split - Removed log to prevent infinite logging
          splits.push(splitData);
          seenIds.add(splitData.id);
        }
      });

      // Sort by creation date (newest first)
      splits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply limit after merging to ensure we don't exceed the limit
      const limitedSplits = splits.slice(0, limitCount);
      
      // Get the last document for pagination (from the most recent query)
      // Use the last document from creatorSnapshot or allSplitsSnapshot
      let lastDocument: QueryDocumentSnapshot | undefined;
      if (creatorSnapshot.docs.length > 0) {
        lastDocument = creatorSnapshot.docs[creatorSnapshot.docs.length - 1];
      } else if (allSplitsSnapshot.docs.length > 0) {
        // Find the last document that matches our user
        for (let i = allSplitsSnapshot.docs.length - 1; i >= 0; i--) {
          const doc = allSplitsSnapshot.docs[i];
          const splitData = doc.data() as Split;
          const userParticipant = splitData.participants.find(p => p.userId === userId);
          if (userParticipant && (userParticipant.status === 'accepted' || userParticipant.status === 'paid' || userParticipant.status === 'locked')) {
            lastDocument = doc;
            break;
          }
        }
      }
      
      // Check if there are more splits by trying to get one more
      const hasMore = limitedSplits.length === limitCount;

      return {
        success: true,
        splits: limitedSplits,
        hasMore,
        currentPage: pageNumber,
        lastDoc: lastDocument,
      };

    } catch (error) {
      logger.error('Error getting user splits', { error: (error as Error).message }, 'splitStorageService');
      logger.error('Failed to get user splits', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update split with wallet information
   */
  static async updateSplitWithWallet(splitId: string, walletId: string, walletAddress: string): Promise<SplitResult> {
    try {
      logger.info('Updating split with wallet info', {
        splitId,
        walletId,
        walletAddress
      });

      const splitRef = doc(db, this.COLLECTION_NAME, splitId);
      
      await updateDoc(splitRef, {
        walletId,
        walletAddress,
        updatedAt: new Date().toISOString(),
      });

      // CRITICAL: Also update the splitWallets collection to keep both databases synchronized
      try {
        const { SplitWalletQueries } = await import('../split/SplitWalletQueries');
        const { SplitWalletManagement } = await import('../split/SplitWalletManagement');
        
        // Find the split wallet by billId (splitId)
        const walletResult = await SplitWalletQueries.getSplitWalletByBillId(splitId);
        
        if (walletResult.success && walletResult.wallet) {
          // Update the split wallet with the wallet information
          const walletUpdateResult = await SplitWalletManagement.updateSplitWallet(walletResult.wallet.id, {
            walletAddress,
            updatedAt: new Date().toISOString(),
          });
          
          if (walletUpdateResult.success) {
            logger.info('Split wallet database synchronized successfully (wallet info update)', {
              splitId,
              splitWalletId: walletResult.wallet.id,
              walletAddress
            }, 'SplitStorageService');
          } else {
            logger.error('Failed to synchronize split wallet database (wallet info update)', {
              splitId,
              splitWalletId: walletResult.wallet.id,
              error: walletUpdateResult.error
            }, 'SplitStorageService');
          }
        } else {
          logger.warn('Split wallet not found for wallet info sync', {
            splitId,
            error: walletResult.error
          }, 'SplitStorageService');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split wallet database during wallet info update', {
          splitId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitStorageService');
        // Don't fail the update if sync fails, but log the error
      }

      // Get the updated split
      const updatedSplitDoc = await getDoc(splitRef);
      if (updatedSplitDoc.exists()) {
        const updatedSplit: Split = {
          ...updatedSplitDoc.data() as Split,
          firebaseDocId: splitId,
        };

        logger.info('Split updated with wallet info successfully', null, 'splitStorageService');
        return {
          success: true,
          split: updatedSplit,
        };
      } else {
        return {
          success: false,
          error: 'Split not found after update',
        };
      }
    } catch (error) {
      logger.error('Error updating split with wallet info', { error: (error as Error).message }, 'splitStorageService');
      logger.error('Failed to update split with wallet info', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update a split by billId
   */
  static async updateSplitByBillId(billId: string, updates: Partial<Split>): Promise<SplitResult> {
    try {
      logger.info('Updating split by billId', { billId, updates }, 'splitStorageService');

      const splitResult = await this.getSplitByBillId(billId);
      if (!splitResult.success || !splitResult.split) {
        return splitResult;
      }

      const split = splitResult.split;
      const docId = split.firebaseDocId || split.id;

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined values to prevent Firebase errors
      const cleanedUpdateData = removeUndefinedValues(updateData);

      await updateDoc(doc(db, this.COLLECTION_NAME, docId), cleanedUpdateData);

      const updatedSplit: Split = {
        ...split,
        ...updateData,
      };

      logger.info('Split updated by billId successfully', null, 'splitStorageService');
      return {
        success: true,
        split: updatedSplit,
      };

    } catch (error) {
      logger.error('Error updating split by billId', { error: (error as Error).message, billId }, 'splitStorageService');
      logger.error('Failed to update split by billId', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update a split
   */
  static async updateSplit(splitId: string, updates: Partial<Split>): Promise<SplitResult> {
    try {
      logger.info('Updating split', { splitId, updates }, 'SplitStorageService');

      const splitResult = await this.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        return splitResult;
      }

      const split = splitResult.split;
      const docId = split.firebaseDocId || splitId;

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined values to prevent Firebase errors
      const cleanedUpdateData = removeUndefinedValues(updateData);

      await updateDoc(doc(db, this.COLLECTION_NAME, docId), cleanedUpdateData);

      const updatedSplit: Split = {
        ...split,
        ...updateData,
      };

      logger.info('Split updated successfully', null, 'SplitStorageService');

      return {
        success: true,
        split: updatedSplit,
      };

    } catch (error) {
      logger.error('Error updating split', { error: (error as Error).message }, 'SplitStorageService');
      logger.error('Failed to update split', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Add participant to split or update existing participant
   */
  static async addParticipant(splitId: string, participant: SplitParticipant): Promise<SplitResult> {
    try {
      logger.info('Adding/updating participant in split', {
        splitId,
        participantName: participant.name,
        participantId: participant.userId,
        status: participant.status
      });

      const splitResult = await this.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        return splitResult;
      }

      const split = splitResult.split;
      
      // Check if participant already exists
      const existingParticipantIndex = split.participants.findIndex(p => p.userId === participant.userId);
      
      let updatedParticipants: SplitParticipant[];
      
      if (existingParticipantIndex >= 0) {
        // Participant exists, update their status and data
        logger.info('Participant exists, updating status', { 
          from: split.participants[existingParticipantIndex].status, 
          to: participant.status
        }, 'SplitStorageService');
        
        updatedParticipants = [...split.participants];
        updatedParticipants[existingParticipantIndex] = {
          ...updatedParticipants[existingParticipantIndex],
          ...participant,
          // Preserve original joinedAt if it exists
          joinedAt: updatedParticipants[existingParticipantIndex].joinedAt || new Date().toISOString(),
        };
      } else {
        // Participant doesn't exist, add them
        logger.info('Participant does not exist, adding new participant', null, 'SplitStorageService');
        updatedParticipants = [...split.participants, {
          ...participant,
          joinedAt: new Date().toISOString(),
        }];
      }
      
      return await this.updateSplit(splitId, {
        participants: updatedParticipants,
      });

    } catch (error) {
      logger.error('Error adding/updating participant', { error: (error as Error).message }, 'SplitStorageService');
      logger.error('Failed to add/update participant', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update participant status
   */
  static async updateParticipantStatus(
    splitId: string, 
    userId: string, 
    status: SplitParticipant['status'],
    amountPaid?: number,
    transactionSignature?: string
  ): Promise<SplitResult> {
    try {
      logger.info('Updating participant status', {
        splitId,
        userId,
        status,
        amountPaid
      });

      const splitResult = await this.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        return splitResult;
      }

      const split = splitResult.split;
      
      const updatedParticipants = split.participants.map(p => {
        if (p.userId === userId) {
          return {
            ...p,
            status,
            amountPaid: amountPaid !== undefined ? amountPaid : p.amountPaid,
            transactionSignature: transactionSignature || p.transactionSignature,
            paidAt: status === 'paid' ? new Date().toISOString() : p.paidAt,
          };
        }
        return p;
      });

      return await this.updateSplit(splitId, {
        participants: updatedParticipants,
      });

    } catch (error) {
      logger.error('Error updating participant status', { error: (error as Error).message }, 'SplitStorageService');
      logger.error('Failed to update participant status', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete a split
   */
  static async deleteSplit(splitId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Deleting split', { splitId }, 'splitStorageService');

      const splitResult = await this.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        return {
          success: false,
          error: 'Split not found',
        };
      }

      const split = splitResult.split;
      const docId = split.firebaseDocId || splitId;

      await deleteDoc(doc(db, this.COLLECTION_NAME, docId));

      // CRITICAL: Also delete the corresponding split wallet from splitWallets collection
      try {
        const { SplitWalletQueries } = await import('../split/SplitWalletQueries');
        const { SplitWalletCleanup } = await import('../split/SplitWalletCleanup');
        
        // Find the split wallet by billId (splitId)
        const walletResult = await SplitWalletQueries.getSplitWalletByBillId(splitId);
        
        if (walletResult.success && walletResult.wallet) {
          // Delete the split wallet
          const walletDeleteResult = await SplitWalletCleanup.burnSplitWalletAndCleanup(
            walletResult.wallet.id,
            walletResult.wallet.creatorId,
            'Split deleted - cleaning up associated wallet'
          );
          
          if (walletDeleteResult.success) {
            logger.info('Split wallet database synchronized successfully (split deletion)', {
              splitId,
              splitWalletId: walletResult.wallet.id,
              action: 'deleted'
            }, 'SplitStorageService');
          } else {
            logger.error('Failed to synchronize split wallet database (split deletion)', {
              splitId,
              splitWalletId: walletResult.wallet.id,
              error: walletDeleteResult.error
            }, 'SplitStorageService');
          }
        } else {
          logger.warn('Split wallet not found for split deletion sync', {
            splitId,
            error: walletResult.error
          }, 'SplitStorageService');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split wallet database during split deletion', {
          splitId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitStorageService');
        // Don't fail the deletion if sync fails, but log the error
      }

      logger.info('Split deleted successfully', null, 'splitStorageService');

      return {
        success: true,
      };

    } catch (error) {
      logger.error('Error deleting split', { error: (error as Error).message }, 'SplitStorageService');
      logger.error('Failed to delete split', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Force refresh split data from database (bypass any caches)
   */
  static async forceRefreshSplit(splitId: string): Promise<SplitResult> {
    try {
      logger.info('Force refreshing split data', { splitId }, 'splitStorageService');
      
      // Clear any potential caches first
      // This ensures we get the absolute latest data from Firebase
      
      // Try to get fresh data
      const result = await this.getSplit(splitId);
      
      if (result.success && result.split) {
        logger.info('Split data refreshed successfully', {
          splitId: result.split.id,
          status: result.split.status,
          totalAmount: result.split.totalAmount,
          participantsCount: result.split.participants?.length || 0
        }, 'splitStorageService');
      }
      
      return result;
    } catch (error) {
      logger.error('Error force refreshing split', { error: (error as Error).message, splitId }, 'splitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get splits by status
   */
  static async getSplitsByStatus(status: Split['status'], userId?: string): Promise<SplitListResult> {
    try {
      logger.info('Getting splits by status', { status, userId }, 'splitStorageService');

      const splitsRef = collection(db, this.COLLECTION_NAME);
      let q;

      if (userId) {
        q = query(
          splitsRef,
          where('status', '==', status),
          where('creatorId', '==', userId)
        );
      } else {
        q = query(
          splitsRef,
          where('status', '==', status)
        );
      }

      const querySnapshot = await getDocs(q);
      const splits: Split[] = querySnapshot.docs.map(doc => {
        const splitData = doc.data() as Split;
        splitData.firebaseDocId = doc.id;
        return splitData;
      });

      // Sort by creation date (most recent first)
      splits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      logger.info('Found splits by status', {
        status,
        count: splits.length
      });

      return {
        success: true,
        splits,
      };

    } catch (error) {
      logger.error('Error getting splits by status', { error: (error as Error).message }, 'SplitStorageService');
      logger.error('Failed to get splits by status', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export the SplitStorageService class
export { SplitStorageServiceClass as SplitStorageService };

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _splitStorageService: SplitStorageServiceClass | null = null;

export const splitStorageService = {
  get instance() {
    if (!_splitStorageService) {
      _splitStorageService = new SplitStorageServiceClass();
    }
    return _splitStorageService;
  }
};
