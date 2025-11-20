/**
 * Degen Split Real-time Hook
 * Handles real-time updates for all Degen Split screens
 * Manages participant lock status, wallet updates, and split state changes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { splitRealtimeService, SplitRealtimeUpdate } from '../../../services/splits';
import { logger } from '../../../services/analytics/loggingService';
import { SplitWalletService } from '../../../services/split';

export interface DegenSplitRealtimeState {
  isRealtimeActive: boolean;
  lastRealtimeUpdate: string | null;
  realtimeError: string | null;
  hasReceivedRealtimeData: boolean;
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
  const [hasReceivedRealtimeData, setHasReceivedRealtimeData] = useState(false);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  const walletFetchPromiseRef = useRef<Promise<void> | null>(null);
  const walletFetchPendingRef = useRef(false);

  const fetchLatestWallet = useCallback(async (reason: string) => {
    if (!splitWalletId || !callbacks.onSplitWalletUpdate) {return;}

    if (walletFetchPromiseRef.current) {
      walletFetchPendingRef.current = true;
      return;
    }

    const fetchPromise = (async () => {
      try {
        const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
        if (walletResult.success && walletResult.wallet) {
          logger.debug('Fetching wallet due to update', {
            reason,
            participantsCount: walletResult.wallet.participants.length
          }, 'useDegenSplitRealtime');
          callbacks.onSplitWalletUpdate(walletResult.wallet);
        }
      } catch (error) {
        logger.error('Error fetching wallet', {
          reason,
          error: error instanceof Error ? error.message : String(error)
        }, 'useDegenSplitRealtime');
      } finally {
        if (walletFetchPromiseRef.current === fetchPromise) {
          walletFetchPromiseRef.current = null;
        }
        if (walletFetchPendingRef.current) {
          walletFetchPendingRef.current = false;
          await fetchLatestWallet('queued');
        }
      }
    })();

    walletFetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  }, [splitWalletId, callbacks]);

  // Start real-time updates
  const startRealtimeUpdates = useCallback(async () => {
    if (!splitId || isRealtimeActive) {
      logger.debug('Not starting updates', { splitId, isRealtimeActive }, 'useDegenSplitRealtime');
      return;
    }

    try {
      logger.info('Starting DegenSplit real-time updates', { splitId }, 'useDegenSplitRealtime');

      const cleanup = await splitRealtimeService.startListening(
        splitId,
        {
          onSplitUpdate: async (update: SplitRealtimeUpdate) => {
            logger.debug('Split update received', {
              splitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length,
              splitStatus: update.split?.status
            }, 'useDegenSplitRealtime');

            if (update.split) {
              setLastRealtimeUpdate(update.lastUpdated);
              setRealtimeError(null);
              setHasReceivedRealtimeData(true);

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

              // CRITICAL FIX: Fetch wallet data if participants have meaningful status changes OR participant count changes
              // This ensures wallet is refreshed when participants are added, not just when status changes
              const hasMeaningfulStatusChanges = update.participants.some(p => 
                p.status === 'paid' || p.status === 'locked' || p.status === 'accepted'
              );
              
              // Track previous participant count to detect additions
              // Note: We can't track this perfectly without state, but we can check if there are new participants
              // by checking if any participant has status 'invited' or 'accepted' (newly added)
              const hasNewParticipants = update.participants.some(p => 
                p.status === 'invited' || p.status === 'accepted'
              );
              
              // CRITICAL FIX: Also fetch wallet if participant count might have changed
              // This ensures wallet is refreshed when participants are added
              const shouldFetchWallet = hasMeaningfulStatusChanges || hasNewParticipants || update.hasChanges;
              
              // Also check if we have a split wallet ID and the callback exists
              if (splitWalletId && callbacks.onSplitWalletUpdate && shouldFetchWallet) {
                await fetchLatestWallet('split-update');
              }
            }
          },
          onParticipantUpdate: async (participants) => {
            logger.debug('Participant update received', {
              splitId,
              participantsCount: participants.length
            }, 'useDegenSplitRealtime');

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

            if (splitWalletId && callbacks.onSplitWalletUpdate) {
              const hasActionableStatus = participants.some(p => 
                p.status === 'locked' || p.status === 'accepted' || p.status === 'paid'
              );
              if (hasActionableStatus) {
                await fetchLatestWallet('participant-update');
              }
            }
          },
          onError: (error) => {
            logger.error('Real-time update error', error as Record<string, unknown>, 'useDegenSplitRealtime');
            setRealtimeError(error.message);
            if (callbacks.onError) {
              callbacks.onError(error);
            }
          }
        }
      );

      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      // Don't set hasReceivedRealtimeData here - only when actual data is received
      logger.debug('Updates started successfully', null, 'useDegenSplitRealtime');

    } catch (error) {
      logger.error('Failed to start updates', error as Record<string, unknown>, 'useDegenSplitRealtime');
      setRealtimeError(error instanceof Error ? error.message : 'Unknown error');
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
    }
  }, [splitId, isRealtimeActive, splitWalletId, callbacks]);

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    if (!isRealtimeActive) {return;}

    try {
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
      logger.error('Failed to stop updates', error as Record<string, unknown>, 'useDegenSplitRealtime');
      setRealtimeError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [splitId, isRealtimeActive]);

  // Auto-start real-time updates when splitId is available - use ref to prevent duplicate calls
  const startRealtimeUpdatesRef = useRef(startRealtimeUpdates);
  useEffect(() => {
    startRealtimeUpdatesRef.current = startRealtimeUpdates;
  }, [startRealtimeUpdates]);
  
  useEffect(() => {
    if (splitId && !isRealtimeActive) {
      startRealtimeUpdatesRef.current().catch((error: unknown) => {
        logger.error('Auto-start failed', error as Record<string, unknown>, 'useDegenSplitRealtime');
      });
    }
  }, [splitId, isRealtimeActive]);

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
    hasReceivedRealtimeData,
    startRealtimeUpdates,
    stopRealtimeUpdates
  };
};
