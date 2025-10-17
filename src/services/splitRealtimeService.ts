/**
 * Split Real-time Service
 * Handles real-time updates for split data using Firebase onSnapshot listeners
 * Provides live updates when participants accept invitations or make changes
 */

import { 
  doc, 
  onSnapshot, 
  Unsubscribe,
  DocumentSnapshot,
  DocumentData,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from './loggingService';
import { Split, SplitParticipant } from './splitStorageService';

export interface SplitRealtimeUpdate {
  split: Split | null;
  participants: SplitParticipant[];
  hasChanges: boolean;
  lastUpdated: string;
}

export interface SplitRealtimeCallbacks {
  onSplitUpdate?: (update: SplitRealtimeUpdate) => void;
  onParticipantUpdate?: (participants: SplitParticipant[]) => void;
  onError?: (error: Error) => void;
}

export class SplitRealtimeService {
  private static listeners: Map<string, Unsubscribe> = new Map();
  private static readonly COLLECTION_NAME = 'splits';

  /**
   * Start listening to real-time updates for a specific split
   */
  static async startListening(
    splitId: string, 
    callbacks: SplitRealtimeCallbacks
  ): Promise<() => void> {
    try {
      console.log('🔍 SplitRealtimeService: Starting listener for split:', splitId);
      logger.info('Starting real-time listener for split', { splitId }, 'SplitRealtimeService');

      // Stop any existing listener for this split
      this.stopListening(splitId);

      // First, we need to find the correct document ID by querying for the split
      // Since we don't know the firebaseDocId, we'll query by the split id field
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('id', '==', splitId)
      );

      // Get the document to find the correct firebaseDocId
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log('🔍 SplitRealtimeService: No document found for split:', splitId);
        if (callbacks.onError) {
          callbacks.onError(new Error(`Split with ID ${splitId} not found`));
        }
        return () => {}; // Return empty cleanup function
      }

      const docSnapshot = querySnapshot.docs[0];
      const firebaseDocId = docSnapshot.id;
      console.log('🔍 SplitRealtimeService: Found document with firebaseDocId:', firebaseDocId);

      const splitRef = doc(db, this.COLLECTION_NAME, firebaseDocId);
      console.log('🔍 SplitRealtimeService: Created document reference:', splitRef.path);
      
      const unsubscribe = onSnapshot(
        splitRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          try {
            // Reduce logging to prevent excessive console output
            if (__DEV__) {
              console.log('🔍 SplitRealtimeService: Snapshot received for split:', splitId, 'exists:', snapshot.exists());
            }
            
            if (snapshot.exists()) {
              const splitData = snapshot.data() as Split;
              
              // Only log significant changes to reduce noise
              if (__DEV__) {
                console.log('🔍 SplitRealtimeService: Split data:', {
                  id: splitId,
                  title: splitData.title,
                  participantsCount: splitData.participants?.length || 0,
                  status: splitData.status
                });
              }
              
              // Ensure the split has an ID
              const split: Split = {
                ...splitData,
                id: splitId,
                firebaseDocId: snapshot.id
              };

              const participants = split.participants || [];
              
              const update: SplitRealtimeUpdate = {
                split,
                participants,
                hasChanges: true,
                lastUpdated: new Date().toISOString()
              };

              // Only log significant updates to reduce noise
              if (__DEV__) {
                console.log('🔍 SplitRealtimeService: Calling onSplitUpdate callback');
              }
              
              logger.debug('Split real-time update received', {
                splitId,
                participantsCount: participants.length,
                status: split.status,
                lastUpdated: update.lastUpdated
              }, 'SplitRealtimeService');

              // Call the update callback
              if (callbacks.onSplitUpdate) {
                callbacks.onSplitUpdate(update);
              }

              // Call the participant update callback
              if (callbacks.onParticipantUpdate) {
                callbacks.onParticipantUpdate(participants);
              }

            } else {
              logger.warn('Split document not found', { splitId }, 'SplitRealtimeService');
              
              const update: SplitRealtimeUpdate = {
                split: null,
                participants: [],
                hasChanges: true,
                lastUpdated: new Date().toISOString()
              };

              if (callbacks.onSplitUpdate) {
                callbacks.onSplitUpdate(update);
              }
            }
          } catch (error) {
            logger.error('Error processing split snapshot', { error: error.message, splitId }, 'SplitRealtimeService');
            if (callbacks.onError) {
              callbacks.onError(error as Error);
            }
          }
        },
        (error) => {
          logger.error('Split real-time listener error', { error: error.message, splitId }, 'SplitRealtimeService');
          if (callbacks.onError) {
            callbacks.onError(error);
          }
        }
      );

      // Store the unsubscribe function
      this.listeners.set(splitId, unsubscribe);

      // Return cleanup function
      return () => this.stopListening(splitId);

    } catch (error) {
      logger.error('Failed to start split real-time listener', { error: error.message, splitId }, 'SplitRealtimeService');
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
      return () => {}; // Return empty cleanup function
    }
  }

  /**
   * Stop listening to real-time updates for a specific split
   */
  static stopListening(splitId: string): void {
    try {
      const unsubscribe = this.listeners.get(splitId);
      if (unsubscribe) {
        unsubscribe();
        this.listeners.delete(splitId);
        logger.info('Stopped real-time listener for split', { splitId }, 'SplitRealtimeService');
      }
    } catch (error) {
      logger.error('Error stopping split real-time listener', { error: error.message, splitId }, 'SplitRealtimeService');
    }
  }

  /**
   * Stop all active listeners
   */
  static stopAllListeners(): void {
    try {
      logger.info('Stopping all split real-time listeners', { count: this.listeners.size }, 'SplitRealtimeService');
      
      for (const [splitId, unsubscribe] of this.listeners) {
        try {
          unsubscribe();
        } catch (error) {
          logger.error('Error stopping listener for split', { error: error.message, splitId }, 'SplitRealtimeService');
        }
      }
      
      this.listeners.clear();
    } catch (error) {
      logger.error('Error stopping all split real-time listeners', { error: error.message }, 'SplitRealtimeService');
    }
  }

  /**
   * Get list of active listeners
   */
  static getActiveListeners(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if a split is being listened to
   */
  static isListening(splitId: string): boolean {
    return this.listeners.has(splitId);
  }

  /**
   * Get the number of active listeners
   */
  static getListenerCount(): number {
    return this.listeners.size;
  }
}

// Export a singleton instance for easy use
export const splitRealtimeService = SplitRealtimeService;
