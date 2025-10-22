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
    if (!currentUser || !splitData) {return false;}
    return splitData.creatorId === currentUser.id.toString();
  }, []);

  const calculateLockProgress = useCallback((lockedCount: number, totalCount: number) => {
    return totalCount > 0 ? lockedCount / totalCount : 0;
  }, []);

  const formatWalletAddress = useCallback((address: string) => {
    if (!address || address.length < 8) {return address;}
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
        participants.map(p => {
          // Import roundUsdcAmount to fix precision issues - same as fair split
          const { roundUsdcAmount } = require('../../../utils/formatUtils');
          return {
            userId: p.userId || p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: roundUsdcAmount(totalAmount), // Each participant needs to lock the full amount for degen split
          };
        })
      );
      
      if (!walletResult.success || !walletResult.wallet) {
        throw new Error(walletResult.error || 'Failed to create split wallet');
      }
      
      const newWallet = walletResult.wallet;
      setState({ 
        splitWallet: newWallet, 
        isCreatingWallet: false,
        showWalletRecapModal: false // Removed popup - wallet created silently
      });
      
      logger.info('Split wallet created successfully for degen split', { 
        splitWalletId: newWallet.id 
      }, 'DegenSplitLogic');
      
      return newWallet;
    } catch (error) {
      handleError(error, 'create split wallet', false); // Don't show popup
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
          
          // Verify split wallet balance against blockchain data
          try {
            const balanceVerification = await SplitWalletService.verifySplitWalletBalance(walletIdToLoad);
            if (balanceVerification.success) {
              logger.info('Split wallet balance verification', {
                splitWalletId: walletIdToLoad,
                onChainBalance: balanceVerification.onChainBalance,
                databaseBalance: balanceVerification.databaseBalance,
                isConsistent: balanceVerification.isConsistent
              });
              
              if (!balanceVerification.isConsistent) {
                logger.warn('Split wallet balance inconsistency detected', {
                  splitWalletId: walletIdToLoad,
                  onChainBalance: balanceVerification.onChainBalance,
                  databaseBalance: balanceVerification.databaseBalance,
                  difference: Math.abs((balanceVerification.onChainBalance || 0) - (balanceVerification.databaseBalance || 0))
                });
              }
            }
          } catch (balanceError) {
            logger.warn('Could not verify split wallet balance', {
              splitWalletId: walletIdToLoad,
              error: balanceError instanceof Error ? balanceError.message : String(balanceError)
            });
          }
          
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
    if (state.isLocked || state.isLocking || state.isLoadingWallet) {return false;}
    
    if (!currentUser?.id) {
      // Log error but don't show popup
      console.error('User not authenticated');
      return false;
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      // Log error but don't show popup
      console.error('No participants found');
      return false;
    }

    try {
      // Check user's actual USDC balance
      const { walletService } = await import('../../../services/WalletService');
      const balanceResult = await walletService.getUserWalletBalance(currentUser.id.toString());
      
      const userBalance = balanceResult?.usdcBalance || 0;
      
      if (userBalance < totalAmount) {
        // Log error but don't show popup
        console.error(`Insufficient funds: need ${totalAmount} USDC, have ${userBalance} USDC`);
        return false;
      }
      
      // User has sufficient funds, show confirmation modal
      setState({ showLockModal: true });
      return true;
      
    } catch (error) {
      console.error('Error checking user balance:', error);
      // Log error but don't show popup - continue anyway
      setState({ showLockModal: true });
      return true;
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
        const participantsForUpdate = participants.map(p => {
          // Import roundUsdcAmount to fix precision issues - same as fair split
          const { roundUsdcAmount } = require('../../../utils/formatUtils');
          return {
            userId: p.userId || p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: roundUsdcAmount(totalAmount), // Each participant owes the FULL bill amount in degen split
          };
        });
        
        const syncResult = await SplitWalletService.updateSplitWalletParticipants(
          walletToUse.id,
          participantsForUpdate
        );
        
        if (!syncResult.success) {
          // Log error but don't show popup
          console.error('Failed to sync participants:', syncResult.error);
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
      handleError(error, 'lock the split', false); // Don't show popup
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
      const walletToUse = state.splitWallet;
      
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
      
      const billName = splitData?.title || billData?.title || processedBillData?.title || 'Degen Split';

      if (otherParticipantIds.length > 0) {
        await notificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            splitId: splitData?.id,
            billName,
            amount: totalAmount, // Full bill amount
            currency: 'USDC',
            timestamp: new Date().toISOString()
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
    if (!splitWallet) {return false;}

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
          const participantsForUpdate = participants.map(p => {
            // Import roundUsdcAmount to fix precision issues - same as fair split
            const { roundUsdcAmount } = require('../../../utils/formatUtils');
            return {
              userId: p.userId || p.id,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: roundUsdcAmount(splitWallet.totalAmount),
              amountPaid: 0,
              status: 'pending' as const
            };
          });
          
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
        // For degen split, check if participants have locked their funds (status 'locked' AND amountPaid >= amountOwed)
        const lockedCount = wallet.participants.filter((p: any) => p.status === 'locked' && p.amountPaid >= p.amountOwed).length;
        
        // Update locked participants list for UI
        const lockedParticipantIds = wallet.participants
          .filter((p: any) => p.status === 'locked' && p.amountPaid >= p.amountOwed)
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

  // Helper function to create timeout wrapper for database operations
  const createTimeoutWrapper = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  };

  // Roulette operations
  const handleStartSpinning = useCallback((
    participants: any[],
    splitWallet: SplitWallet,
    splitData: any,
    billData: any,
    totalAmount: number
  ): void => {
    if (state.isSpinning || state.hasSpun) {return;}

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

    // Animate the spin sequence - NON-BLOCKING
    const { Animated } = require('react-native');
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
    ]).start(() => {
      // IMMEDIATELY update UI state - no blocking operations
      setState({ 
        selectedIndex: finalIndex,
        isSpinning: false,
        hasSpun: true
      });

      // Execute post-animation operations in background - COMPLETELY NON-BLOCKING
      // Use setTimeout to ensure UI is not blocked
      setTimeout(() => {
        // Save the winner information to the split wallet - NON-BLOCKING
        (async () => {
          try {
            const { SplitWalletService } = await import('../../../services/split');
            const saveWinnerPromise = SplitWalletService.updateSplitWallet(splitWallet.id, {
              degenWinner: {
                userId: participants[finalIndex].userId || participants[finalIndex].id,
                name: participants[finalIndex].name,
                selectedAt: new Date().toISOString()
              },
              status: 'spinning_completed'
            });
            
            // Use shorter timeout and don't await - fire and forget
            createTimeoutWrapper(saveWinnerPromise, 5000, 'Save winner to database')
              .then(() => console.log('✅ Winner information saved successfully'))
              .catch(error => console.error('❌ Failed to save winner information:', error));
          } catch (error) {
            console.error('❌ Failed to save winner information:', error);
          }
        })();

        // Send notifications - NON-BLOCKING
        (async () => {
          try {
            const { notificationService } = await import('../../../services/notificationService');
            const billName = splitData?.title || billData?.title || processedBillData?.title || 'Degen Split';
            const winnerId = participants[finalIndex].userId || participants[finalIndex].id;
            const winnerName = participants[finalIndex].name;

            // Send winner notification - fire and forget
            const winnerNotificationPromise = notificationService.sendWinnerNotification(
              winnerId,
              splitWallet.id,
              billName
            );
            createTimeoutWrapper(winnerNotificationPromise, 5000, 'Send winner notification')
              .then(() => console.log('✅ Winner notification sent'))
              .catch(error => console.error('❌ Failed to send winner notification:', error));

            // Send loser notifications - fire and forget
            const loserIds = participants
              .filter(p => (p.userId || p.id) !== winnerId)
              .map(p => p.userId || p.id)
              .filter(id => id);

            if (loserIds.length > 0) {
              const loserNotificationPromise = notificationService.sendBulkNotifications(
                loserIds,
                'split_loser',
                {
                  splitId: splitData?.id,
                  splitWalletId: splitWallet.id,
                  billName,
                  amount: totalAmount,
                  currency: 'USDC',
                  winnerId,
                  winnerName,
                  timestamp: new Date().toISOString()
                }
              );
              createTimeoutWrapper(loserNotificationPromise, 5000, 'Send loser notifications')
                .then(() => console.log('✅ Loser notifications sent'))
                .catch(error => console.error('❌ Failed to send loser notifications:', error));
            }
          } catch (error) {
            console.error('❌ Failed to send roulette result notifications:', error);
          }
        })();
      }, 100); // Small delay to ensure UI state is updated first
    });
  }, [state.isSpinning, state.hasSpun, state.spinAnimationRef, state.cardScaleRef, setState]);

  // OPTIMIZED: Centralized claim validation function
  const canUserClaimFunds = useCallback((currentUser: any, splitWallet: SplitWallet): boolean => {
    if (!currentUser || !splitWallet) {return false;}
    
    const participant = splitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
    return participant && participant.status !== 'paid';
  }, []);

  // Result operations
  const handleClaimFunds = useCallback(async (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number
  ): Promise<boolean> => {
    setState({ showClaimModal: false, isProcessing: true });
    
    try {
      // OPTIMIZED: Use centralized validation
      if (!canUserClaimFunds(currentUser, splitWallet)) {
        Alert.alert(
          'Already Claimed', 
          'You have already claimed your funds from this split.',
          [{ text: 'OK' }]
        );
        setState({ isProcessing: false });
        return false;
      }
      
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
        
        // OPTIMIZED: Real-time updates will handle UI refresh automatically
        // No need for manual refresh - the real-time listener will update the UI
        
        setState({ isProcessing: false });
        return true;
      } else {
        // OPTIMIZED: Simplified error handling - real-time updates will handle success detection
        if (result.signature && result.error?.includes('confirmation timed out')) {
          // Transaction was sent but confirmation timed out
          console.log('🔍 Transaction sent but confirmation timed out, real-time updates will handle success detection', {
            signature: result.signature,
            splitWalletId: splitWallet.id
          });
          
          Alert.alert(
            '⏳ Transaction Processing', 
            'Your transaction has been sent to the blockchain. Real-time updates will notify you when it completes.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to claim winner payout. Please try again.');
        }
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
    canUserClaimFunds, // OPTIMIZED: Expose centralized validation function
    
    // Private key operations
    handleShowPrivateKey,
    handleCopyPrivateKey,
    handleCopyWalletAddress,
    
    // Error handling
    handleError,
  };
};
