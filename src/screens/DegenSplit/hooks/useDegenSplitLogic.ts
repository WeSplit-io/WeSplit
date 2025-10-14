/**
 * Degen Split Business Logic Hook
 * Contains all the business logic and calculations for Degen Split screens
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { SplitWallet } from '../../../services/split';
import { DegenSplitState } from './useDegenSplitState';
import { logger } from '../../../services/loggingService';

export interface DegenSplitLogic {
  // Helper functions
  isCurrentUserCreator: (currentUser: any, splitData: any) => boolean;
  calculateLockProgress: (lockedCount: number, totalCount: number) => number;
  formatWalletAddress: (address: string) => string;
  
  // Wallet operations
  handleCreateSplitWallet: (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ) => Promise<SplitWallet | null>;
  
  handleLoadSplitWallet: (
    splitData: any,
    currentUser: any
  ) => Promise<SplitWallet | null>;
  
  // Lock operations
  handleLockMyShare: (
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ) => Promise<boolean>;
  
  handleLockTheSplit: (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ) => Promise<boolean>;
  
  handleSendMyShare: (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ) => Promise<boolean>;
  
  checkAllParticipantsLocked: (
    splitWallet: SplitWallet,
    participants: any[]
  ) => Promise<boolean>;
  
  // Roulette operations
  handleStartSpinning: (
    participants: any[],
    splitWallet: SplitWallet,
    splitData: any,
    billData: any,
    totalAmount: number
  ) => Promise<void>;
  
  // Result operations
  handleClaimFunds: (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number
  ) => Promise<boolean>;
  
  handleExternalPayment: (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number
  ) => Promise<boolean>;
  
  // Private key operations
  handleShowPrivateKey: (
    splitWallet: SplitWallet,
    currentUser: any
  ) => Promise<void>;
  
  handleCopyPrivateKey: (privateKey: string) => void;
  handleCopyWalletAddress: (address: string) => void;
  
  // Error handling
  handleError: (error: any, context: string) => void;
}

export const useDegenSplitLogic = (
  state: DegenSplitState,
  setState: (updates: Partial<DegenSplitState>) => void
): DegenSplitLogic => {
  
  // Helper functions
  const isCurrentUserCreator = useCallback((currentUser: any, splitData: any) => {
    if (!currentUser || !splitData) return false;
    return splitData.creatorId === currentUser.id.toString();
  }, []);

  const calculateLockProgress = useCallback((lockedCount: number, totalCount: number) => {
    return totalCount > 0 ? lockedCount / totalCount : 0;
  }, []);

  const formatWalletAddress = useCallback((address: string) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  // Wallet operations
  const handleCreateSplitWallet = useCallback(async (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ): Promise<SplitWallet | null> => {
    try {
      setState({ isCreatingWallet: true, error: null });
      
      logger.info('Creating split wallet for degen split', null, 'DegenSplitLogic');
      
      const { SplitWalletService } = await import('../../../services/split');
      const walletResult = await SplitWalletService.createDegenSplitWallet(
        splitData.id,
        currentUser.id.toString(),
        totalAmount,
        'USDC',
        participants.map(p => ({
          userId: p.userId || p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: totalAmount, // Each participant needs to lock the full amount for degen split
        }))
      );
      
      if (!walletResult.success || !walletResult.wallet) {
        throw new Error(walletResult.error || 'Failed to create split wallet');
      }
      
      const newWallet = walletResult.wallet;
      setState({ 
        splitWallet: newWallet, 
        isCreatingWallet: false,
        showWalletRecapModal: true 
      });
      
      logger.info('Split wallet created successfully for degen split', { 
        splitWalletId: newWallet.id 
      }, 'DegenSplitLogic');
      
      return newWallet;
    } catch (error) {
      handleError(error, 'create split wallet');
      setState({ isCreatingWallet: false });
      return null;
    }
  }, [setState]);

  const handleLoadSplitWallet = useCallback(async (
    splitData: any,
    currentUser: any
  ): Promise<SplitWallet | null> => {
    try {
      setState({ isLoadingWallet: true, error: null });
      
      let walletIdToLoad = splitData?.walletId;
      
      if (!walletIdToLoad && splitData?.id && splitData?.splitType === 'degen') {
        // Try to find the split wallet by billId
        const { SplitWalletService } = await import('../../../services/split');
        const searchResult = await SplitWalletService.getSplitWalletByBillId(splitData.id);
        if (searchResult.success && searchResult.wallet) {
          walletIdToLoad = searchResult.wallet.id;
          logger.info('Found Degen Split wallet by bill ID', { 
            splitId: splitData.id, 
            walletId: walletIdToLoad 
          });
        }
      }
      
      if (walletIdToLoad) {
        const { SplitWalletService } = await import('../../../services/split');
        const walletResult = await SplitWalletService.getSplitWallet(walletIdToLoad);
        
        if (walletResult.success && walletResult.wallet) {
          const wallet = walletResult.wallet;
          setState({ splitWallet: wallet, isLoadingWallet: false });
          
          // Check if current user has already locked their funds
          if (currentUser?.id) {
            const userParticipant = wallet.participants.find(
              p => p.userId === currentUser.id.toString()
            );
            
            if (userParticipant && userParticipant.amountPaid > 0) {
              setState({ 
                isLocked: true,
                lockedParticipants: [...state.lockedParticipants, currentUser.id.toString()]
              });
              logger.info('Current user already locked funds', {
                userId: currentUser.id.toString(),
                amountPaid: userParticipant.amountPaid
              });
            }
          }
          
          return wallet;
        }
      }
      
      setState({ isLoadingWallet: false });
      return null;
    } catch (error) {
      handleError(error, 'load split wallet');
      setState({ isLoadingWallet: false });
      return null;
    }
  }, [setState, state.lockedParticipants]);

  // Lock operations
  const handleLockMyShare = useCallback(async (
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ): Promise<boolean> => {
    if (state.isLocked || state.isLocking || state.isLoadingWallet) return false;
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return false;
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      Alert.alert('Error', 'No participants found. Please try again.');
      return false;
    }

    try {
      // Check user's actual USDC balance
      const { walletService } = await import('../../../services/WalletService');
      const balanceResult = await walletService.getUserWalletBalance(currentUser.id.toString());
      
      const userBalance = balanceResult?.usdcBalance || 0;
      
      if (userBalance < totalAmount) {
        Alert.alert(
          'Insufficient Funds',
          `You need ${totalAmount} USDC to lock your share, but your current balance is ${userBalance} USDC. Please add more funds to your wallet.`,
          [{ text: 'OK', style: 'cancel' }]
        );
        return false;
      }
      
      // User has sufficient funds, show confirmation modal
      setState({ showLockModal: true });
      return true;
      
    } catch (error) {
      console.error('Error checking user balance:', error);
      Alert.alert(
        'Balance Check Failed',
        'Unable to verify your balance. You can still attempt to lock your share, but the transaction may fail if you have insufficient funds.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => setState({ showLockModal: true }) }
        ]
      );
      return false;
    }
  }, [state.isLocked, state.isLocking, state.isLoadingWallet, setState]);

  const handleLockTheSplit = useCallback(async (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ): Promise<boolean> => {
    setState({ isCreatingWallet: true });
    
    try {
      // Create split wallet if it doesn't exist
      let walletToUse = state.splitWallet;
      
      if (!walletToUse) {
        const newWallet = await handleCreateSplitWallet(splitData, currentUser, totalAmount, participants);
        if (!newWallet) {
          setState({ isCreatingWallet: false });
          return false;
        }
        walletToUse = newWallet;
      }

      // Sync participants between split data and split wallet if needed
      const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
      const walletParticipantIds = walletToUse.participants.map((p: any) => p.userId);
      
      if (splitParticipantIds.length !== walletParticipantIds.length || 
          !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
        const { SplitWalletService } = await import('../../../services/split');
        const participantsForUpdate = participants.map(p => ({
          userId: p.userId || p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: totalAmount, // Each participant owes the FULL bill amount in degen split
        }));
        
        const syncResult = await SplitWalletService.updateSplitWalletParticipants(
          walletToUse.id,
          participantsForUpdate
        );
        
        if (!syncResult.success) {
          Alert.alert('Error', 'Failed to sync participants. Please try again.');
          setState({ isCreatingWallet: false });
          return false;
        }
        
        // Reload the wallet to get updated participants
        const reloadResult = await SplitWalletService.getSplitWallet(walletToUse.id);
        if (reloadResult.success && reloadResult.wallet) {
          walletToUse = reloadResult.wallet;
          setState({ splitWallet: walletToUse });
        }
      }

      // Update split data to mark as active
      if (splitData && splitData.id) {
        try {
          const { SplitStorageService } = await import('../../../services/splitStorageService');
          await SplitStorageService.updateSplit(splitData.id, {
            splitType: 'degen',
            status: 'active',
          });
        } catch (error) {
          // Non-critical error, continue
        }
      }

      // Send notifications to all participants about the split being ready
      const { notificationService } = await import('../../../services/notificationService');
      const allParticipantIds = participants.map(p => p.userId || p.id);
      const billName = splitData?.title || 'Degen Split';

      if (allParticipantIds.length > 0) {
        await notificationService.sendBulkNotifications(
          allParticipantIds,
          'split_spin_available',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount,
          }
        );
      }

      setState({ isCreatingWallet: false });
      return true;
    } catch (error) {
      handleError(error, 'lock the split');
      setState({ isCreatingWallet: false });
      return false;
    }
  }, [state.splitWallet, setState, handleCreateSplitWallet]);

  const handleSendMyShare = useCallback(async (
    splitData: any,
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ): Promise<boolean> => {
    setState({ isLocking: true, showLockModal: false });
    
    try {
      // Ensure we have a split wallet
      let walletToUse = state.splitWallet;
      
      if (!walletToUse) {
        Alert.alert('Error', 'Split wallet not found. Please create the split first.');
        setState({ isLocking: false });
        return false;
      }

      // For degen split, each participant locks the FULL bill amount (not their individual share)
      // This is different from fair split where they pay their individual share
      // Use the new degen fund locking function that preserves participant status as 'locked'
      const { SplitWalletService } = await import('../../../services/split');
      const paymentResult = await SplitWalletService.processDegenFundLocking(
        walletToUse.id,
        currentUser.id.toString(),
        totalAmount // Full bill amount for each participant in degen split
      );

      if (!paymentResult.success) {
        Alert.alert(
          'Payment Failed', 
          paymentResult.error || 'Failed to send payment. This might be due to insufficient funds or network issues.',
          [{ text: 'OK' }]
        );
        setState({ isLocking: false });
        return false;
      }

      // Update locked participants list
      setState({ 
        lockedParticipants: [...state.lockedParticipants, currentUser.id.toString()],
        isLocked: true,
        isLocking: false
      });

      // Send lock required notifications to all other participants
      const { notificationService } = await import('../../../services/notificationService');
      const otherParticipantIds = participants
        .filter(p => (p.userId || p.id) !== currentUser.id.toString())
        .map(p => p.userId || p.id);
      
      const billName = splitData?.title || 'Degen Split';

      if (otherParticipantIds.length > 0) {
        await notificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount, // Full bill amount
          }
        );
      }

      // Reload wallet to get updated participant status
      const updatedWalletResult = await SplitWalletService.getSplitWallet(walletToUse.id);
      if (updatedWalletResult.success && updatedWalletResult.wallet) {
        setState({ splitWallet: updatedWalletResult.wallet });
      }
      
      // Check if all participants have locked their funds
      await checkAllParticipantsLocked(updatedWalletResult.wallet || walletToUse, participants);

      return true;
    } catch (error) {
      handleError(error, 'send my share');
      setState({ isLocking: false });
      return false;
    }
  }, [state.splitWallet, state.lockedParticipants, setState, checkAllParticipantsLocked]);

  const checkAllParticipantsLocked = useCallback(async (
    splitWallet: SplitWallet,
    participants: any[]
  ): Promise<boolean> => {
    if (!splitWallet) return false;

    setState({ isCheckingLocks: true });
    try {
      const { SplitWalletService } = await import('../../../services/split');
      const walletResult = await SplitWalletService.getSplitWallet(splitWallet.id);
      
      if (walletResult.success && walletResult.wallet) {
        const wallet = walletResult.wallet;
        
        // Sync participants between split data and wallet if needed
        const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
        const walletParticipantIds = wallet.participants.map((p: any) => p.userId);
        
        const needsSync = splitParticipantIds.length !== walletParticipantIds.length || 
                         !splitParticipantIds.every(id => walletParticipantIds.includes(id));
        
        if (needsSync) {
          logger.info('Syncing participants between split data and wallet', null, 'DegenSplitLogic');
          const participantsForUpdate = participants.map(p => ({
            userId: p.userId || p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: splitWallet.totalAmount,
            amountPaid: 0,
            status: 'pending' as const
          }));
          
          const syncResult = await SplitWalletService.updateSplitWalletParticipants(
            wallet.id,
            participantsForUpdate
          );
          
          if (syncResult.success) {
            const reloadResult = await SplitWalletService.getSplitWallet(wallet.id);
            if (reloadResult.success && reloadResult.wallet) {
              wallet = reloadResult.wallet;
            }
          }
        }
        
        const totalParticipants = participants.length;
        // For degen split, check if participants have locked their funds (status 'locked' or amountPaid >= amountOwed)
        const lockedCount = wallet.participants.filter((p: any) => p.status === 'locked' || p.amountPaid >= p.amountOwed).length;
        
        // Update locked participants list for UI
        const lockedParticipantIds = wallet.participants
          .filter((p: any) => p.status === 'locked' || p.amountPaid >= p.amountOwed)
          .map((p: any) => p.userId);
        
        setState({ 
          lockedParticipants: lockedParticipantIds,
          allParticipantsLocked: lockedCount === totalParticipants,
          splitWallet: wallet
        });
        
        logger.info('Participant lock status updated', {
          totalParticipants,
          lockedCount,
          allLocked: lockedCount === totalParticipants,
          lockedParticipantIds
        });
        
        return lockedCount === totalParticipants;
      }
    } catch (error) {
      console.error('Error checking participant locks:', error);
    } finally {
      setState({ isCheckingLocks: false });
    }
    
    return false;
  }, [setState]);

  // Roulette operations
  const handleStartSpinning = useCallback(async (
    participants: any[],
    splitWallet: SplitWallet,
    splitData: any,
    billData: any,
    totalAmount: number
  ): Promise<void> => {
    if (state.isSpinning || state.hasSpun) return;

    setState({ isSpinning: true });

    // Select random participant from original participants (not duplicates)
    const finalIndex = Math.floor(Math.random() * participants.length);

    // Reset animation values
    if (state.spinAnimationRef.current) {
      state.spinAnimationRef.current.setValue(0);
    }
    if (state.cardScaleRef.current) {
      state.cardScaleRef.current.setValue(1);
    }

    // Animate the spin sequence
    const { Animated } = await import('react-native');
    Animated.sequence([
      // Scale down during spin
      Animated.timing(state.cardScaleRef.current, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      // Main spin animation
      Animated.timing(state.spinAnimationRef.current, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      // Scale back up
      Animated.timing(state.cardScaleRef.current, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setState({ 
        selectedIndex: finalIndex,
        isSpinning: false,
        hasSpun: true
      });

      // Save the winner information to the split wallet
      try {
        const { SplitWalletService } = await import('../../../services/split');
        await SplitWalletService.updateSplitWallet(splitWallet.id, {
          degenWinner: {
            userId: participants[finalIndex].userId || participants[finalIndex].id,
            name: participants[finalIndex].name,
            selectedAt: new Date().toISOString()
          },
          status: 'spinning_completed'
        });
      } catch (error) {
        console.error('Failed to save winner information:', error);
      }

      // Send notifications to all participants about the roulette result
      try {
        const { notificationService } = await import('../../../services/notificationService');
        const billName = splitData?.title || billData?.title || 'Degen Split';
        const winnerId = participants[finalIndex].userId || participants[finalIndex].id;
        const winnerName = participants[finalIndex].name;

        // Send winner notification
        await notificationService.sendWinnerNotification(
          winnerId,
          splitWallet.id,
          billName
        );

        // Send loser notifications to all other participants
        const loserIds = participants
          .filter(p => (p.userId || p.id) !== winnerId)
          .map(p => p.userId || p.id)
          .filter(id => id);

        if (loserIds.length > 0) {
          await notificationService.sendBulkNotifications(
            loserIds,
            'split_loser',
            {
              splitId: splitData?.id,
              splitWalletId: splitWallet.id,
              billName,
              amount: totalAmount,
              currency: 'USDC',
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        console.error('Failed to send roulette result notifications:', error);
      }
    });
  }, [state.isSpinning, state.hasSpun, state.spinAnimationRef, state.cardScaleRef, setState]);

  // Result operations
  const handleClaimFunds = useCallback(async (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number
  ): Promise<boolean> => {
    setState({ showClaimModal: false, isProcessing: true });
    
    try {
      const { SplitWalletService } = await import('../../../services/split');
      const result = await SplitWalletService.processDegenWinnerPayout(
        splitWallet.id,
        currentUser.id.toString(),
        currentUser.wallet_address || '',
        totalAmount,
        'Degen Split Winner Payout'
      );
      
      if (result.success) {
        if (result.transactionSignature?.startsWith('WITHDRAWAL_REQUEST_')) {
          Alert.alert(
            '📋 Withdrawal Request Submitted', 
            result.message || 'Your withdrawal request has been submitted. The split creator will process your request.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '🎉 Winner Payout Complete!', 
            `Congratulations! You've received the full amount of ${totalAmount} USDC from the degen split. Your locked funds have been returned to you.`,
            [{ text: 'OK' }]
          );
        }
        setState({ isProcessing: false });
        return true;
      } else {
        Alert.alert('Error', result.error || 'Failed to claim winner payout. Please try again.');
        setState({ isProcessing: false });
        return false;
      }
    } catch (error) {
      handleError(error, 'claim funds');
      setState({ isProcessing: false });
      return false;
    }
  }, [setState]);

  const handleExternalPayment = useCallback(async (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number
  ): Promise<boolean> => {
    setState({ isProcessing: true });
    
    try {
      // Implementation for external payment
      // This would handle payment through external wallet or card
      Alert.alert('External Payment', 'External payment functionality to be implemented');
      setState({ isProcessing: false });
      return false;
    } catch (error) {
      handleError(error, 'external payment');
      setState({ isProcessing: false });
      return false;
    }
  }, [setState]);

  // Private key operations
  const handleShowPrivateKey = useCallback(async (
    splitWallet: SplitWallet,
    currentUser: any
  ): Promise<void> => {
    if (splitWallet?.id && currentUser?.id) {
      try {
        const { SplitWalletService } = await import('../../../services/split');
        const result = await SplitWalletService.getSplitWalletPrivateKey(splitWallet.id, currentUser.id.toString());
        
        if (result.success && result.privateKey) {
          setState({ 
            privateKey: result.privateKey,
            showPrivateKeyModal: true 
          });
        } else {
          Alert.alert('Error', `Could not retrieve private key: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        handleError(error, 'get private key');
      }
    } else {
      Alert.alert('Error', 'Missing required data to retrieve private key');
    }
  }, [setState]);

  const handleCopyPrivateKey = useCallback((privateKey: string) => {
    if (privateKey) {
      const { Clipboard } = require('react-native');
      Clipboard.setString(privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
    }
  }, []);

  const handleCopyWalletAddress = useCallback((address: string) => {
    const { Clipboard } = require('react-native');
    Clipboard.setString(address);
    Alert.alert('Success', 'Wallet address copied to clipboard');
  }, []);

  // Error handling
  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Error in ${context}`, error, 'DegenSplitLogic');
    setState({ error: errorMessage });
    Alert.alert('Error', `Failed to ${context}. Please try again.`);
  }, [setState]);

  return {
    // Helper functions
    isCurrentUserCreator,
    calculateLockProgress,
    formatWalletAddress,
    
    // Wallet operations
    handleCreateSplitWallet,
    handleLoadSplitWallet,
    
    // Lock operations
    handleLockMyShare,
    handleLockTheSplit,
    handleSendMyShare,
    checkAllParticipantsLocked,
    
    // Roulette operations
    handleStartSpinning,
    
    // Result operations
    handleClaimFunds,
    handleExternalPayment,
    
    // Private key operations
    handleShowPrivateKey,
    handleCopyPrivateKey,
    handleCopyWalletAddress,
    
    // Error handling
    handleError,
  };
};
