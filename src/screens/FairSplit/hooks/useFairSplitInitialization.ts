/**
 * Fair Split Initialization Hook
 * Handles all initialization logic for the FairSplitScreen
 */

import { useEffect, useCallback } from 'react';
import { logger } from '../../../services/analytics/loggingService';
import { FairSplitState } from './useFairSplitState';

export interface FairSplitInitialization {
  initializeSplitData: () => Promise<void>;
  loadParticipants: () => Promise<void>;
  loadSplitWallet: () => Promise<void>;
}

export const useFairSplitInitialization = (
  state: FairSplitState,
  splitData: any,
  setParticipants: (participants: any[]) => void,
  setSplitData: (data: any) => void
): FairSplitInitialization => {
  
  const initializeSplitData = useCallback(async () => {
    if (splitData && !state.isInitializing && !state.isInitializingRef.current) {
      state.isInitializingRef.current = true;
      state.setIsInitializing(true);
      
      try {
        // Always load fresh data from database to ensure we have the latest participant information
        if (splitData.id) {
          const { SplitStorageService } = await import('../../../services/splits');
          const result = await SplitStorageService.getSplit(splitData.id);
          
          if (result.success && result.split) {
            // Update the split data with full information
            const fullSplitData = result.split;
            
            // Check if split is already confirmed
            const isConfirmed = fullSplitData.status === 'active' && fullSplitData.splitType === 'fair';
            state.setIsSplitConfirmed(isConfirmed);
            
            // Set the split method based on the data
            if (fullSplitData.splitMethod) {
              state.setSplitMethod(fullSplitData.splitMethod);
            }
            
            // Update the split data
            setSplitData(fullSplitData);
            
            logger.info('Split data initialized successfully', {
              splitId: fullSplitData.id,
              isConfirmed,
              splitMethod: fullSplitData.splitMethod
            });
          }
        }
      } catch (error) {
        logger.error('Failed to initialize split data', error, 'FairSplitInitialization');
      } finally {
        state.setIsInitializing(false);
        state.isInitializingRef.current = false;
      }
    }
  }, [state, splitData, setSplitData]);

  const loadParticipants = useCallback(async () => {
    if (!splitData) {return;}
    
    try {
      // Load participants from split data
      if (splitData.participants && Array.isArray(splitData.participants)) {
        setParticipants(splitData.participants);
        logger.info('Participants loaded successfully', {
          count: splitData.participants.length
        });
      }
    } catch (error) {
      logger.error('Failed to load participants', error, 'FairSplitInitialization');
    }
  }, [splitData, setParticipants]);

  const loadSplitWallet = useCallback(async () => {
    if (!splitData || state.splitWallet) {return;}
    
    try {
      // Load split wallet if it exists
      if (splitData.splitWalletId) {
        const { SplitWalletService } = await import('../../../services/split');
        const walletResult = await SplitWalletService.getSplitWallet(splitData.splitWalletId);
        
        if (walletResult.success && walletResult.wallet) {
          state.setSplitWallet(walletResult.wallet);
          logger.info('Split wallet loaded successfully', {
            walletId: splitData.splitWalletId
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load split wallet', error, 'FairSplitInitialization');
    }
  }, [splitData, state.splitWallet, state.setSplitWallet]);

  // Initialize when component mounts or splitData changes
  useEffect(() => {
    initializeSplitData();
  }, [initializeSplitData]);

  // Load participants when splitData is available
  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Load split wallet when splitData is available
  useEffect(() => {
    loadSplitWallet();
  }, [loadSplitWallet]);

  return {
    initializeSplitData,
    loadParticipants,
    loadSplitWallet,
  };
};
