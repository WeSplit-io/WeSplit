import { useState, useRef, useCallback } from 'react';
import { logger } from '../services/analytics/loggingService';
import { splitRealtimeService, SplitRealtimeUpdate } from '../services/splits';

export interface UseSplitRealtimeOptions {
  onSplitUpdate?: (update: SplitRealtimeUpdate) => void;
  onParticipantUpdate?: (participants: any[]) => void;
  onError?: (error: Error) => void;
}

export interface UseSplitRealtimeReturn {
  // State
  isRealtimeActive: boolean;
  lastRealtimeUpdate: string | null;
  hasReceivedRealtimeData: boolean;

  // Actions
  startRealtimeUpdates: (splitId: string, options?: UseSplitRealtimeOptions) => Promise<(() => void) | null>;
  stopRealtimeUpdates: () => void;
}

export const useSplitRealtime = (): UseSplitRealtimeReturn => {
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const [hasReceivedRealtimeData, setHasReceivedRealtimeData] = useState(false);

  const realtimeCleanupRef = useRef<(() => void) | null>(null);

  const startRealtimeUpdates = useCallback(async (
    splitId: string,
    options: UseSplitRealtimeOptions = {}
  ): Promise<(() => void) | null> => {
    if (!splitId || isRealtimeActive) return null;

    try {
      logger.info('Starting real-time updates for split', { splitId }, 'useSplitRealtime');

      const cleanup = await splitRealtimeService.startListening(
        splitId,
        {
          onSplitUpdate: (update: SplitRealtimeUpdate) => {
            logger.debug('Real-time split update received', {
              splitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length
            }, 'useSplitRealtime');

            if (update.split) {
              setLastRealtimeUpdate(update.lastUpdated);
              setHasReceivedRealtimeData(true);
            }

            // Call custom handler if provided
            if (options.onSplitUpdate) {
              options.onSplitUpdate(update);
            }
          },
          onParticipantUpdate: (participants) => {
            logger.debug('Real-time participant update received', {
              splitId,
              participantsCount: participants.length
            }, 'useSplitRealtime');

            setHasReceivedRealtimeData(true);

            // Call custom handler if provided
            if (options.onParticipantUpdate) {
              options.onParticipantUpdate(participants);
            }
          },
          onError: (error) => {
            logger.error('Real-time update error', {
              splitId,
              error: error.message
            }, 'useSplitRealtime');

            // Call custom handler if provided
            if (options.onError) {
              options.onError(error);
            }
          }
        }
      );

      setIsRealtimeActive(true);
      realtimeCleanupRef.current = cleanup;

      return cleanup;
    } catch (error) {
      logger.error('Failed to start realtime updates', { splitId, error }, 'useSplitRealtime');
      return null;
    }
  }, [isRealtimeActive]);

  const stopRealtimeUpdates = useCallback(() => {
    if (realtimeCleanupRef.current) {
      logger.info('Stopping real-time updates', {}, 'useSplitRealtime');
      realtimeCleanupRef.current();
      realtimeCleanupRef.current = null;
    }
    setIsRealtimeActive(false);
  }, []);

  return {
    isRealtimeActive,
    lastRealtimeUpdate,
    hasReceivedRealtimeData,
    startRealtimeUpdates,
    stopRealtimeUpdates
  };
};
