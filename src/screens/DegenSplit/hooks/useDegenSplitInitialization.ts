/**
 * Degen Split Initialization Hook
 * Handles data initialization and setup for Degen Split screens
 */

import { useEffect, useCallback } from 'react';
import { DegenSplitState } from './useDegenSplitState';
import { DegenSplitLogic } from './useDegenSplitLogic';
import { logger } from '../../../services/core';

export interface DegenSplitInitialization {
  // Initialization functions
  initializeDegenSplit: (
    splitData: any,
    currentUser: any,
    participants: any[],
    totalAmount: number
  ) => Promise<void>;
  
  refreshParticipantData: (participants: any[]) => Promise<any[]>;
  
  // Periodic checks
  startPeriodicLockCheck: (
    splitWallet: any,
    currentUser: any,
    participants: any[]
  ) => () => void;
  
  startPeriodicWalletCheck: (
    splitData: any,
    currentUser: any
  ) => () => void;
}

export const useDegenSplitInitialization = (
  state: DegenSplitState,
  setState: (updates: Partial<DegenSplitState>) => void,
  logic: DegenSplitLogic
): DegenSplitInitialization => {
  
  // Initialize degen split data
  const initializeDegenSplit = useCallback(async (
    splitData: any,
    currentUser: any,
    participants: any[],
    totalAmount: number
  ) => {
    if (state.isInitializingRef.current) {return;}
    
    state.isInitializingRef.current = true;
    setState({ error: null });
    
    try {
      logger.info('Initializing degen split', {
        splitId: splitData?.id,
        participantsCount: participants.length,
        totalAmount
      }, 'DegenSplitInitialization');
      
      // Load or create split wallet
      const wallet = await logic.handleLoadSplitWallet(splitData, currentUser);
      
      if (!wallet && isCurrentUserCreator(currentUser, splitData)) {
        // Creator needs to create the wallet
        logger.info('Creator initializing degen split wallet', null, 'DegenSplitInitialization');
      } else if (wallet) {
        // Wallet exists, check participant lock status
        await logic.checkAllParticipantsLocked(wallet, participants);
      }
      
      logger.info('Degen split initialization completed', {
        hasWallet: !!wallet,
        walletId: wallet?.id
      }, 'DegenSplitInitialization');
      
    } catch (error) {
      logic.handleError(error, 'initialize degen split');
    } finally {
      state.isInitializingRef.current = false;
    }
  }, [state.isInitializingRef, setState, logic]);

  // Helper function to check if current user is creator
  const isCurrentUserCreator = useCallback((currentUser: any, splitData: any) => {
    if (!currentUser || !splitData) {return false;}
    return splitData.creatorId === currentUser.id.toString();
  }, []);

  // Refresh participant data with latest wallet addresses
  const refreshParticipantData = useCallback(async (participants: any[]): Promise<any[]> => {
    if (participants.length === 0) {return participants;}
    
    try {
      logger.info('Refreshing participant data', {
        participantsCount: participants.length
      }, 'DegenSplitInitialization');
      
      const participantsWithLatestData = await Promise.all(
        participants.map(async (participant: any) => {
          try {
            const { firebaseDataService } = await import('../../../services/data');
            const latestUserData = await firebaseDataService.user.getCurrentUser(participant.userId || participant.id);
            
            return {
              ...participant,
              walletAddress: latestUserData?.wallet_address || participant.walletAddress || ''
            };
          } catch (error) {
            logger.warn(`Could not fetch latest data for participant ${participant.userId || participant.id}`, error, 'DegenSplitInitialization');
            return participant; // Return original participant data if fetch fails
          }
        })
      );
      
      logger.info('Participant data refreshed successfully', {
        updatedCount: participantsWithLatestData.length
      }, 'DegenSplitInitialization');
      
      return participantsWithLatestData;
    } catch (error) {
      logger.error('Error refreshing participant data', error, 'DegenSplitInitialization');
      return participants; // Return original data on error
    }
  }, []);

  // Start periodic check for participant locks
  const startPeriodicLockCheck = useCallback((
    splitWallet: any,
    currentUser: any,
    participants: any[]
  ) => {
    if (!state.isLocked || state.allParticipantsLocked || !splitWallet) {
      return () => {}; // Return empty cleanup function
    }

    logger.info('Starting periodic lock check', {
      splitWalletId: splitWallet.id,
      isLocked: state.isLocked,
      allParticipantsLocked: state.allParticipantsLocked
    }, 'DegenSplitInitialization');

    const interval = setInterval(async () => {
      try {
        await logic.checkAllParticipantsLocked(splitWallet, participants);
      } catch (error) {
        logger.error('Error in periodic lock check', error, 'DegenSplitInitialization');
      }
    }, 5000); // Check every 5 seconds

    return () => {
      logger.info('Stopping periodic lock check', null, 'DegenSplitInitialization');
      clearInterval(interval);
    };
  }, [state.isLocked, state.allParticipantsLocked, logic]);

  // Start periodic check for wallet creation (for non-creators)
  const startPeriodicWalletCheck = useCallback((
    splitData: any,
    currentUser: any
  ) => {
    if (state.splitWallet || 
        splitData?.splitType !== 'degen' || 
        currentUser?.id === splitData?.creatorId) {
      return () => {}; // Return empty cleanup function
    }

    logger.info('Starting periodic wallet check for non-creator', {
      splitId: splitData.id,
      creatorId: splitData.creatorId,
      currentUserId: currentUser?.id
    }, 'DegenSplitInitialization');

    const interval = setInterval(async () => {
      try {
        const { SplitWalletService } = await import('../../../services/split');
        const searchResult = await SplitWalletService.getSplitWalletByBillId(splitData.id);
        
        if (searchResult.success && searchResult.wallet) {
          setState({ splitWallet: searchResult.wallet });
          logger.info('Degen Split wallet found for non-creator', { 
            splitId: splitData.id, 
            walletId: searchResult.wallet.id 
          });
        }
      } catch (error) {
        logger.warn('Error checking for Degen Split wallet', { 
          splitId: splitData.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }, 3000); // Check every 3 seconds

    return () => {
      logger.info('Stopping periodic wallet check', null, 'DegenSplitInitialization');
      clearInterval(interval);
    };
  }, [state.splitWallet, setState]);

  return {
    initializeDegenSplit,
    refreshParticipantData,
    startPeriodicLockCheck,
    startPeriodicWalletCheck,
  };
};
