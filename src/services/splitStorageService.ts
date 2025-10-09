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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from './loggingService';

export interface Split {
  id: string;
  billId: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  splitType: 'fair' | 'degen';
  splitMethod?: 'equal' | 'manual'; // Locked split method after confirmation
  status: 'draft' | 'active' | 'locked' | 'completed' | 'cancelled';
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
}

export class SplitStorageService {
  private static readonly COLLECTION_NAME = 'splits';

  /**
   * Create a new split in the database
   */
  static async createSplit(splitData: Omit<Split, 'id' | 'createdAt' | 'updatedAt' | 'firebaseDocId'>): Promise<SplitResult> {
    try {
      console.log('🔍 SplitStorageService: Creating split:', {
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

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), split);
      
      const createdSplit: Split = {
        ...split,
        firebaseDocId: docRef.id,
      };

      console.log('🔍 SplitStorageService: Split created successfully:', {
        splitId: createdSplit.id,
        firebaseDocId: docRef.id
      });

      logger.info('Split created successfully', {
        splitId: createdSplit.id,
        firebaseDocId: docRef.id,
        title: createdSplit.title,
        splitType: createdSplit.splitType
      }, 'SplitStorageService');

      return {
        success: true,
        split: createdSplit,
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error creating split:', error);
      logger.error('Failed to create split', error, 'SplitStorageService');
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
      // Getting split with ID - Removed log to prevent infinite logging

      // First try by Firebase document ID
      if (splitId.length > 20 && !splitId.startsWith('split_')) {
        const splitDoc = await getDoc(doc(db, this.COLLECTION_NAME, splitId));
        
        if (splitDoc.exists()) {
          const splitData = splitDoc.data() as Split;
          splitData.firebaseDocId = splitDoc.id;
          return {
            success: true,
            split: splitData,
          };
        }
      }

      // Try by internal ID
      const splitsRef = collection(db, this.COLLECTION_NAME);
      const q = query(splitsRef, where('id', '==', splitId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const splitData = querySnapshot.docs[0].data() as Split;
        splitData.firebaseDocId = querySnapshot.docs[0].id;
        return {
          success: true,
          split: splitData,
        };
      }

      return {
        success: false,
        error: 'Split not found',
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error getting split:', error);
      logger.error('Failed to get split', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all splits for a user (as creator or participant)
   */
  static async getUserSplits(userId: string): Promise<SplitListResult> {
    try {
      // Getting splits for user - Removed log to prevent infinite logging

      const splitsRef = collection(db, this.COLLECTION_NAME);
      
      // Get splits where user is creator
      const creatorQuery = query(
        splitsRef, 
        where('creatorId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Get all splits and filter for participants (array-contains doesn't work well with complex objects)
      const allSplitsQuery = query(
        splitsRef,
        orderBy('createdAt', 'desc')
      );

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

      // Sort by creation date
      splits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Found splits - Removed log to prevent infinite logging

      return {
        success: true,
        splits,
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error getting user splits:', error);
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
      console.log('🔍 SplitStorageService: Updating split with wallet info:', {
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

      // Get the updated split
      const updatedSplitDoc = await getDoc(splitRef);
      if (updatedSplitDoc.exists()) {
        const updatedSplit: Split = {
          ...updatedSplitDoc.data() as Split,
          firebaseDocId: splitId,
        };

        console.log('🔍 SplitStorageService: Split updated with wallet info successfully');
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
      console.log('🔍 SplitStorageService: Error updating split with wallet info:', error);
      logger.error('Failed to update split with wallet info', error, 'SplitStorageService');
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
      console.log('🔍 SplitStorageService: Updating split:', splitId, updates);

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

      await updateDoc(doc(db, this.COLLECTION_NAME, docId), updateData);

      const updatedSplit: Split = {
        ...split,
        ...updateData,
      };

      console.log('🔍 SplitStorageService: Split updated successfully');

      return {
        success: true,
        split: updatedSplit,
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error updating split:', error);
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
      console.log('🔍 SplitStorageService: Adding/updating participant in split:', {
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
        console.log('🔍 SplitStorageService: Participant exists, updating status from', 
          split.participants[existingParticipantIndex].status, 'to', participant.status);
        
        updatedParticipants = [...split.participants];
        updatedParticipants[existingParticipantIndex] = {
          ...updatedParticipants[existingParticipantIndex],
          ...participant,
          // Preserve original joinedAt if it exists
          joinedAt: updatedParticipants[existingParticipantIndex].joinedAt || new Date().toISOString(),
        };
      } else {
        // Participant doesn't exist, add them
        console.log('🔍 SplitStorageService: Participant does not exist, adding new participant');
        updatedParticipants = [...split.participants, {
          ...participant,
          joinedAt: new Date().toISOString(),
        }];
      }
      
      return await this.updateSplit(splitId, {
        participants: updatedParticipants,
      });

    } catch (error) {
      console.log('🔍 SplitStorageService: Error adding/updating participant:', error);
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
      console.log('🔍 SplitStorageService: Updating participant status:', {
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
      console.log('🔍 SplitStorageService: Error updating participant status:', error);
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
      console.log('🔍 SplitStorageService: Deleting split:', splitId);

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

      console.log('🔍 SplitStorageService: Split deleted successfully');

      return {
        success: true,
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error deleting split:', error);
      logger.error('Failed to delete split', error, 'SplitStorageService');
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
      console.log('🔍 SplitStorageService: Getting splits by status:', { status, userId });

      const splitsRef = collection(db, this.COLLECTION_NAME);
      let q;

      if (userId) {
        q = query(
          splitsRef,
          where('status', '==', status),
          where('creatorId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          splitsRef,
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const splits: Split[] = querySnapshot.docs.map(doc => {
        const splitData = doc.data() as Split;
        splitData.firebaseDocId = doc.id;
        return splitData;
      });

      console.log('🔍 SplitStorageService: Found splits by status:', {
        status,
        count: splits.length
      });

      return {
        success: true,
        splits,
      };

    } catch (error) {
      console.log('🔍 SplitStorageService: Error getting splits by status:', error);
      logger.error('Failed to get splits by status', error, 'SplitStorageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
