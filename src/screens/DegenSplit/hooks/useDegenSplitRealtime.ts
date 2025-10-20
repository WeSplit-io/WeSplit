/**
 * Degen Split Real-time Hook
 * Handles real-time updates for all Degen Split screens
 * Manages participant lock status, wallet updates, and split state changes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { splitRealtimeService, SplitRealtimeUpdate } from '../../../services/splitRealtimeService';
import { logger } from '../../../services/loggingService';
import { SplitWalletService } from '../../../services/split';

export interface DegenSplitRealtimeState {
  isRealtimeActive: boolean;
  lastRealtimeUpdate: string | null;
  realtimeError: string | null;
}

export interface DegenSplitRealtimeCallbacks {
  onParticipantUpdate?: (participants: any[]) => void;
  onSplitWalletUpdate?: (splitWallet: any) => void;
  onLockStatusUpdate?: (lockedParticipants: string[], allLocked: boolean) => void;
  onSplitStatusUpdate?: (status: string) => void;
  onError?: (error: Error) => void;
}

export const useDegenSplitRealtime = (
  splitId: string | undefined,
  splitWalletId: string | undefined,
  callbacks: DegenSplitRealtimeCallbacks = {}
) => {
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);

  // Start real-time updates
  const startRealtimeUpdates = useCallback(async () => {
    if (!splitId || isRealtimeActive) {
      console.log('🔍 DegenSplit Realtime: Not starting updates:', { splitId, isRealtimeActive });
      return;
    }

    try {
      console.log('🔍 DegenSplit Realtime: Starting updates for split:', splitId);
      logger.info('Starting DegenSplit real-time updates', { splitId }, 'useDegenSplitRealtime');

      const cleanup = await splitRealtimeService.startListening(
        splitId,
        {
          onSplitUpdate: async (update: SplitRealtimeUpdate) => {
            console.log('🔍 DegenSplit Realtime: Split update received:', {
              splitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length,
              splitStatus: update.split?.status
            });

            if (update.split) {
              setLastRealtimeUpdate(update.lastUpdated);
              setRealtimeError(null);

              // Update participants
              if (callbacks.onParticipantUpdate) {
                callbacks.onParticipantUpdate(update.participants);
              }

              // Update split status
              if (callbacks.onSplitStatusUpdate) {
                callbacks.onSplitStatusUpdate(update.split.status);
              }

              // Check lock status for Degen Split
              const lockedParticipants = update.participants
                .filter(p => p.status === 'locked' || p.status === 'accepted')
                .map(p => p.userId);
              
              const allLocked = update.participants.length > 0 && 
                update.participants.every(p => p.status === 'locked' || p.status === 'accepted');

              if (callbacks.onLockStatusUpdate) {
                callbacks.onLockStatusUpdate(lockedParticipants, allLocked);
              }

              // OPTIMIZED: Only fetch wallet data if participants have meaningful status changes
              const hasMeaningfulStatusChanges = update.participants.some(p => 
                p.status === 'paid' || p.status === 'locked' || p.status === 'accepted'
              );
              
              // Also check if we have a split wallet ID and the callback exists
              if (splitWalletId && callbacks.onSplitWalletUpdate && hasMeaningfulStatusChanges) {
                try {
                  const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
                  if (walletResult.success && walletResult.wallet) {
                    callbacks.onSplitWalletUpdate(walletResult.wallet);
                  }
                } catch (error) {
                  console.error('🔍 DegenSplit Realtime: Error fetching wallet:', error);
                }
              }
            }
          },
          onParticipantUpdate: (participants) => {
            console.log('🔍 DegenSplit Realtime: Participant update received:', {
              splitId,
              participantsCount: participants.length,
              participants: participants.map(p => ({ name: p.name, status: p.status }))
            });

            if (callbacks.onParticipantUpdate) {
              callbacks.onParticipantUpdate(participants);
            }

            // Update lock status
            const lockedParticipants = participants
              .filter(p => p.status === 'locked' || p.status === 'accepted')
              .map(p => p.userId);
            
            const allLocked = participants.length > 0 && 
              participants.every(p => p.status === 'locked' || p.status === 'accepted');

            if (callbacks.onLockStatusUpdate) {
              callbacks.onLockStatusUpdate(lockedParticipants, allLocked);
            }
          },
          onError: (error) => {
            console.error('🔍 DegenSplit Realtime: Error:', error);
            setRealtimeError(error.message);
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        }
      );

      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      console.log('🔍 DegenSplit Realtime: Updates started successfully');

    } catch (error) {
      console.error('🔍 DegenSplit Realtime: Failed to start updates:', error);
      setRealtimeError(error instanceof Error ? error.message : 'Unknown error');
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
    }
  }, [splitId, isRealtimeActive, splitWalletId, callbacks]);

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    if (!isRealtimeActive) return;

    try {
      console.log('🔍 DegenSplit Realtime: Stopping updates for split:', splitId);
      logger.info('Stopping DegenSplit real-time updates', { splitId }, 'useDegenSplitRealtime');

      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }

      if (splitId) {
        splitRealtimeService.stopListening(splitId);
      }

      setIsRealtimeActive(false);
      setLastRealtimeUpdate(null);
      setRealtimeError(null);

    } catch (error) {
      console.error('🔍 DegenSplit Realtime: Failed to stop updates:', error);
      setRealtimeError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [splitId, isRealtimeActive]);

  // Auto-start real-time updates when splitId is available
  useEffect(() => {
    if (splitId && !isRealtimeActive) {
      startRealtimeUpdates().catch((error: any) => {
        console.error('🔍 DegenSplit Realtime: Auto-start failed:', error);
      });
    }
  }, [splitId, isRealtimeActive, startRealtimeUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }
    };
  }, []);

  return {
    isRealtimeActive,
    lastRealtimeUpdate,
    realtimeError,
    startRealtimeUpdates,
    stopRealtimeUpdates
  };
};
