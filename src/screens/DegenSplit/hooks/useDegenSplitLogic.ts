/**
 * Degen Split Business Logic Hook
 * Contains all the business logic and calculations for Degen Split screens
 */

import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { SplitWallet } from '../../../services/split';
import { DegenSplitState } from './useDegenSplitState';
import { logger } from '../../../services/analytics/loggingService';

export interface DegenSplitLogic {
  // Helper functions
  isCurrentUserCreator: (currentUser: any, splitData: any) => boolean;
  calculateLockProgress: (lockedCount: number, totalCount: number) => number;
  formatWalletAddress: (address: string) => string;
  checkUserLockStatus: (wallet: SplitWallet, currentUser: any) => boolean;
  
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
    totalAmount: number,
    currentUser?: any
  ) => Promise<void>;
  
  // Result operations
  handleClaimFunds: (
    currentUser: any,
    splitWallet: SplitWallet,
    totalAmount: number,
    onSuccessAlertShown?: () => void
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
  // Ref to prevent concurrent calls to checkAllParticipantsLocked
  const checkInProgressRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const CHECK_DEBOUNCE_MS = 2000; // 2 seconds debounce
  
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
    // Check if wallet creation is already in progress
    if (state.isCreatingWallet) {
      logger.warn('Wallet creation already in progress, skipping duplicate request', {
        splitId: splitData?.id
      }, 'DegenSplitLogic');
      return null;
    }
    
    // Check if wallet already exists
    if (state.splitWallet) {
      logger.info('Split wallet already exists, returning existing wallet', {
        splitId: splitData?.id,
        existingWalletId: state.splitWallet.id
      }, 'DegenSplitLogic');
      return state.splitWallet;
    }
    
    try {
      setState({ isCreatingWallet: true, error: null });
      
      logger.info('Creating split wallet for degen split', {
        billId: splitData.billId,
        participantsCount: participants?.length,
        participantsType: typeof participants,
        participants: participants
      }, 'DegenSplitLogic');
      
      // Validate participants before proceeding
      if (!participants || !Array.isArray(participants)) {
        throw new Error('Participants parameter is required and must be an array');
      }
      
      const mappedParticipants = participants.map(p => {
        // Import roundUsdcAmount to fix precision issues - same as fair split
        const { roundUsdcAmount } = require('../../../utils/ui/format/formatUtils');
        return {
          userId: p.userId || p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: roundUsdcAmount(totalAmount), // Each participant needs to lock the full amount for degen split
        };
      });
      
      logger.info('Mapped participants for wallet creation', {
        mappedParticipantsCount: mappedParticipants.length,
        mappedParticipants: mappedParticipants
      }, 'DegenSplitLogic');
      
      const { SplitWalletService } = await import('../../../services/split');
      const walletResult = await SplitWalletService.createDegenSplitWallet(
        splitData.billId, // Use billId, not split ID
        currentUser.id.toString(),
        currentUser.name || 'Unknown User', // Add creator name
        totalAmount,
        'USDC',
        mappedParticipants
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
      
      // Update the split with wallet information
      const { SplitStorageService } = await import('../../../services/splits/splitStorageService');
      const updateResult = await SplitStorageService.updateSplit(splitData.id, {
        walletId: newWallet.id,
        walletAddress: newWallet.walletAddress,
        status: 'active' as const
      });
      
      if (updateResult.success) {
        logger.info('Split updated with wallet information', { 
          splitId: splitData.id, 
          walletId: newWallet.id 
        }, 'DegenSplitLogic');
      } else {
        logger.warn('Failed to update split with wallet information', { 
          error: updateResult.error 
        }, 'DegenSplitLogic');
      }
      
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

  // Helper function to check if current user has locked their funds
  const checkUserLockStatus = useCallback((wallet: SplitWallet, currentUser: any) => {
    if (!wallet || !currentUser?.id) {
      return false;
    }
    
    const userParticipant = wallet.participants.find(
      p => p.userId === currentUser.id.toString()
    );
    
    if (!userParticipant) {
      return false;
    }
    
    // User has locked if: status is 'locked' AND amountPaid >= amountOwed AND has transaction signature
    const hasLocked = userParticipant.status === 'locked' && 
                      userParticipant.amountPaid >= userParticipant.amountOwed &&
                      !!userParticipant.transactionSignature;
    
    logger.info('Checking user lock status', {
      userId: currentUser.id.toString(),
      participantStatus: userParticipant.status,
      amountPaid: userParticipant.amountPaid,
      amountOwed: userParticipant.amountOwed,
      hasTransactionSignature: !!userParticipant.transactionSignature,
      hasLocked
    }, 'DegenSplitLogic');
    
    return hasLocked;
  }, []);

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
          
          // CRITICAL FIX: Check if current user has already locked their funds BEFORE setting state
          const userHasLocked = checkUserLockStatus(wallet, currentUser);
          
          setState({ 
            splitWallet: wallet, 
            isLoadingWallet: false,
            isLocked: userHasLocked,
            lockedParticipants: userHasLocked 
              ? [...state.lockedParticipants.filter(id => id !== currentUser?.id?.toString()), currentUser.id.toString()]
              : state.lockedParticipants.filter(id => id !== currentUser?.id?.toString())
          });
          
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
          
          logger.info('Wallet loaded and user lock status checked', {
            userId: currentUser?.id?.toString(),
            hasLocked: userHasLocked,
            walletId: wallet.id
          }, 'DegenSplitLogic');
          
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
  }, [setState, state.lockedParticipants, checkUserLockStatus]);

  // Lock operations
  const handleLockMyShare = useCallback(async (
    currentUser: any,
    totalAmount: number,
    participants: any[]
  ): Promise<boolean> => {
    if (state.isLocked || state.isLocking || state.isLoadingWallet) {return false;}
    
    if (!currentUser?.id) {
      logger.warn('User not authenticated', null, 'DegenSplitLogic');
      return false;
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      logger.warn('No participants found', null, 'DegenSplitLogic');
      return false;
    }

    try {
      // Check user's actual USDC balance
      const { walletService } = await import('../../../services/blockchain/wallet');
      const balanceResult = await walletService.getUserWalletBalance(currentUser.id.toString());
      
      const userBalance = balanceResult?.usdcBalance || 0;
      
      if (userBalance < totalAmount) {
        logger.warn('Insufficient funds', { need: totalAmount, have: userBalance }, 'DegenSplitLogic');
        return false;
      }
      
      // User has sufficient funds, show confirmation modal
      setState({ showLockModal: true });
      return true;
      
    } catch (error) {
      logger.error('Error checking user balance', { error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic');
      // Continue anyway - show modal
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
          const { roundUsdcAmount } = require('../../../utils/ui/format/formatUtils');
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
          logger.error('Failed to sync participants', { error: syncResult.error || 'Unknown error' }, 'DegenSplitLogic');
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
          const { SplitStorageService } = await import('../../../services/splits');
          await SplitStorageService.updateSplit(splitData.id, {
            splitType: 'degen',
            status: 'active',
          });
        } catch (error) {
          // Non-critical error, continue
        }
      }

      // Send notifications to all participants about the split being ready
      const { notificationService } = await import('../../../services/notifications');
      const billName = splitData?.title || 'Degen Split';

      // Send individual notifications to each participant
      for (const participant of participants) {
        try {
          await notificationService.instance.sendNotification(
            participant.userId || participant.id,
            'Split Ready to Spin',
            `${billName} is ready to spin! All participants have locked their funds.`,
            'split_spin_available',
            {
              splitWalletId: walletToUse.id,
              billName,
              amount: totalAmount,
            }
          );
        } catch (notificationError) {
          logger.warn('Failed to send spin notification to participant', {
            participantId: participant.userId || participant.id,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError)
          }, 'DegenSplitLogic');
        }
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
      logger.info('Starting degen split fund locking', {
        splitWalletId: walletToUse.id,
        participantId: currentUser.id.toString(),
        totalAmount,
        userWalletAddress: currentUser.wallet_address
      }, 'DegenSplitLogic');
      
      const { SplitWalletService } = await import('../../../services/split');
      const paymentResult = await SplitWalletService.processDegenFundLocking(
        walletToUse.id,
        currentUser.id.toString(),
        totalAmount // Full bill amount for each participant in degen split
      );
      
      logger.info('Degen split fund locking result', {
        success: paymentResult.success,
        error: paymentResult.error,
        transactionSignature: paymentResult.transactionSignature
      }, 'DegenSplitLogic');

      if (!paymentResult.success) {
        // Provide more specific error messages based on the error type
        let errorTitle = 'Failed to Lock Split';
        let errorMessage = paymentResult.error || 'Failed to lock the split. Please try again.';
        
        if (paymentResult.error?.includes('Insufficient USDC balance')) {
          errorTitle = 'Insufficient Balance';
          errorMessage = paymentResult.error;
        } else if (paymentResult.error?.includes('User wallet not found')) {
          errorTitle = 'Wallet Not Found';
          errorMessage = 'Your wallet could not be found. Please ensure you have a wallet set up.';
        } else if (paymentResult.error?.includes('Split wallet not found')) {
          errorTitle = 'Split Not Found';
          errorMessage = 'The split wallet could not be found. Please try creating the split again.';
        } else if (paymentResult.error?.includes('Participant not found')) {
          errorTitle = 'Participant Error';
          errorMessage = 'You are not listed as a participant in this split.';
        } else if (paymentResult.error?.includes('already locked')) {
          errorTitle = 'Already Locked';
          errorMessage = 'You have already locked your funds for this split.';
        } else if (paymentResult.error?.includes('Transaction failed')) {
          errorTitle = 'Transaction Failed';
          errorMessage = 'The transaction failed. This might be due to network issues. Please try again.';
        }
        
        Alert.alert(
          errorTitle, 
          errorMessage,
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
      const { notificationService } = await import('../../../services/notifications');
      const otherParticipants = participants
        .filter(p => (p.userId || p.id) !== currentUser.id.toString());
      
      const billName = splitData?.title || billData?.title || processedBillData?.title || 'Degen Split';

      // Send individual notifications to each participant
      for (const participant of otherParticipants) {
        try {
          await notificationService.instance.sendNotification(
            participant.userId || participant.id,
            'Lock Required',
            `Please lock your funds for ${billName}. Amount: ${totalAmount} USDC`,
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
        } catch (notificationError) {
          logger.warn('Failed to send notification to participant', {
            participantId: participant.userId || participant.id,
            error: notificationError instanceof Error ? notificationError.message : String(notificationError)
          }, 'DegenSplitLogic');
        }
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

    // CRITICAL FIX: Prevent race conditions with debouncing
    const now = Date.now();
    if (checkInProgressRef.current) {
      logger.debug('Participant lock check already in progress, skipping duplicate call', {
        splitWalletId: splitWallet.id
      }, 'DegenSplitLogic');
      return false;
    }
    
    // Debounce: Don't check too frequently
    if (now - lastCheckTimeRef.current < CHECK_DEBOUNCE_MS) {
      logger.debug('Participant lock check debounced, too soon since last check', {
        splitWalletId: splitWallet.id,
        timeSinceLastCheck: now - lastCheckTimeRef.current
      }, 'DegenSplitLogic');
      return false;
    }

    checkInProgressRef.current = true;
    lastCheckTimeRef.current = now;
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
            const { roundUsdcAmount } = require('../../../utils/ui/format/formatUtils');
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
        
        // CRITICAL FIX: This function should only CHECK status, not UPDATE it
        // The processDegenFundLocking function already handles updates correctly
        // We should not update participants here to avoid race conditions and data inconsistencies
        let currentWallet = walletResult.wallet;
        
        // Optional: Verify blockchain balance for logging/debugging (but don't update based on it)
        try {
          const { SplitWalletPayments } = await import('../../../services/split/SplitWalletPayments');
          const balanceResult = await SplitWalletPayments.verifySplitWalletBalance(currentWallet.id);
          
          if (balanceResult.success && balanceResult.balance !== undefined) {
            logger.info('Blockchain balance verification for degen split (read-only)', {
              splitWalletId: currentWallet.id,
              walletAddress: currentWallet.walletAddress,
              blockchainBalance: balanceResult.balance,
              expectedTotalAmount: currentWallet.totalAmount,
              participantsCount: currentWallet.participants.length,
              lockedParticipantsCount: currentWallet.participants.filter((p: any) => 
                p.status === 'locked' && p.amountPaid >= p.amountOwed
              ).length
            }, 'DegenSplitLogic');
          }
        } catch (balanceError) {
          logger.warn('Failed to verify blockchain balance, using database status', {
            splitWalletId: currentWallet.id,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'DegenSplitLogic');
        }
        
        // CRITICAL FIX: Only CHECK status, don't UPDATE it
        // Count participants who have actually locked their funds (status 'locked' AND amountPaid >= amountOwed)
        // This ensures we only count participants who have valid transaction signatures and have paid
        const lockedCount = currentWallet.participants.filter((p: any) => 
          p.status === 'locked' && 
          p.amountPaid >= p.amountOwed &&
          p.transactionSignature // Ensure they have a valid transaction signature
        ).length;
        
        // Update locked participants list for UI
        const lockedParticipantIds = currentWallet.participants
          .filter((p: any) => p.status === 'locked' && p.amountPaid >= p.amountOwed)
          .map((p: any) => p.userId);
        
        setState({ 
          lockedParticipants: lockedParticipantIds,
          allParticipantsLocked: lockedCount === totalParticipants,
          splitWallet: currentWallet
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
      logger.error('Error checking participant locks', { error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic');
    } finally {
      checkInProgressRef.current = false;
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
  const handleStartSpinning = useCallback(async (
    participants: any[],
    splitWallet: SplitWallet,
    splitData: any,
    billData: any,
    totalAmount: number,
    currentUser?: any
  ): Promise<void> => {
    if (state.isSpinning || state.hasSpun) {return;}

    if (!splitWallet?.id) {
      Alert.alert('Missing Split Wallet', 'We could not find the split wallet for this spin.');
      return;
    }

    if (!participants || participants.length === 0) {
      Alert.alert('No Participants', 'A split needs at least one participant to run the roulette.');
      return;
    }
    
    setState({ isSpinning: true, error: null });

    try {
      const { SplitWalletService } = await import('../../../services/split');
      const rouletteResult = await SplitWalletService.executeDegenRoulette(
        splitWallet.id,
        currentUser?.id?.toString()
      );

      if (!rouletteResult.success || !rouletteResult.loserUserId) {
        throw new Error(rouletteResult.error || 'Failed to execute roulette.');
      }

      if (rouletteResult.updatedWallet) {
        setState({ splitWallet: rouletteResult.updatedWallet });
      }

      const loserIndexInUi = participants.findIndex(
        (participant: any) => (participant.userId || participant.id) === rouletteResult.loserUserId
      );
      const finalIndex = loserIndexInUi >= 0 ? loserIndexInUi : 0;
      const loserParticipant = participants[finalIndex];

      const winnersFromResult = rouletteResult.winners?.map(winner => ({
        userId: winner.userId,
        name: winner.name,
      })) || participants
        .filter((participant: any) => (participant.userId || participant.id) !== rouletteResult.loserUserId)
        .map((participant: any) => ({
          userId: participant.userId || participant.id,
          name: participant.name,
        }));

    // Reset animation values
    if (state.spinAnimationRef.current) {
      state.spinAnimationRef.current.setValue(0);
    }
    if (state.cardScaleRef.current) {
      state.cardScaleRef.current.setValue(1);
    }

      const billName = splitData?.title || billData?.title || processedBillData?.title || 'Degen Split';
      const loserId = rouletteResult.loserUserId;
      const loserName = rouletteResult.loserName || loserParticipant?.name || 'Participant';

      // Animate the spin sequence
    const { Animated } = require('react-native');
    Animated.sequence([
      Animated.timing(state.cardScaleRef.current, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(state.spinAnimationRef.current, {
        toValue: 1,
          duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(state.cardScaleRef.current, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setState({ 
        selectedIndex: finalIndex,
        isSpinning: false,
          hasSpun: true,
      });

      setTimeout(() => {
        (async () => {
          try {
            const { notificationService } = await import('../../../services/notifications');

            const loserNotificationPromise = notificationService.instance.sendNotification(
              loserId,
              'Degen Split Complete - You Lost',
              `${billName} is complete. You are the loser. Transfer your locked funds to your external card to use them.`,
              'split_loser',
              {
                splitId: splitData?.id,
                splitWalletId: splitWallet.id,
                billName,
                amount: totalAmount,
                currency: 'USDC',
                isLoser: true,
                  timestamp: new Date().toISOString(),
              }
            );
            createTimeoutWrapper(loserNotificationPromise, 5000, 'Send loser notification')
              .then(() => logger.debug('Loser notification sent', { loserName }, 'DegenSplitLogic'))
              .catch(error => logger.warn('Failed to send loser notification', { loserName, error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic'));

              for (const winner of winnersFromResult) {
              try {
                const winnerNotificationPromise = notificationService.instance.sendWinnerNotification(
                    winner.userId,
                  splitWallet.id,
                  billName
                );
                createTimeoutWrapper(winnerNotificationPromise, 5000, 'Send winner notification')
                  .then(() => logger.debug('Winner notification sent', { winnerName: winner.name }, 'DegenSplitLogic'))
                  .catch(error => logger.warn('Failed to send winner notification', { winnerName: winner.name, error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic'));
              } catch (error) {
                logger.warn('Failed to send winner notification', { winnerName: winner.name, error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic');
              }
            }
          } catch (error) {
            logger.warn('Failed to send roulette result notifications', { error: error instanceof Error ? error.message : String(error) }, 'DegenSplitLogic');
          }
        })();
        }, 100);
      });
    } catch (error) {
      setState({ isSpinning: false });
      const errorMessage = error instanceof Error ? error.message : 'Failed to start roulette spin.';
      logger.error('Failed to execute secure roulette', {
        error: errorMessage,
        splitWalletId: splitWallet.id,
      }, 'DegenSplitLogic');
      Alert.alert('Unable to Spin', errorMessage);
    }
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
    totalAmount: number,
    onSuccessAlertShown?: () => void // Callback to notify that success alert was shown
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
        // CRITICAL FIX: Mark that we've shown the success alert to prevent duplicates
        if (onSuccessAlertShown) {
          onSuccessAlertShown();
        }
        
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
          logger.info('Transaction sent but confirmation timed out, real-time updates will handle success detection', {
            signature: result.signature,
            splitWalletId: splitWallet.id
          }, 'DegenSplitLogic');
          
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
    if (!splitWallet?.id || !currentUser?.id) {
      Alert.alert('Error', 'Missing required data to retrieve private key');
      return;
    }

    // If a request is already in progress, avoid duplicate calls
    if (state.isFetchingPrivateKey) {
      logger.warn('Private key retrieval already in progress - ignoring duplicate tap', {
        splitWalletId: splitWallet.id,
        userId: currentUser.id.toString()
      }, 'DegenSplitLogic');
      return;
    }

    // If we previously cached a key for a different wallet, clear it
    if (state.privateKey && state.privateKeyWalletId && state.privateKeyWalletId !== splitWallet.id) {
      setState({ privateKey: null, privateKeyWalletId: null });
    }

    // If we already have a cached private key for this wallet, just show the modal
    if (state.privateKey && state.privateKeyWalletId === splitWallet.id) {
      setState({ showPrivateKeyModal: true });
      return;
    }

    try {
      setState({ isFetchingPrivateKey: true, error: null });

        // CRITICAL: Check if user has already withdrawn (single withdrawal rule)
        // Once a user withdraws, they cannot access the private key anymore
        const currentUserParticipant = splitWallet.participants.find(
          p => p.userId === currentUser.id.toString()
        );
        
        if (currentUserParticipant?.status === 'paid') {
          Alert.alert(
            'Access Denied',
            'You have already withdrawn your funds from this split. Private key access is no longer available after withdrawal.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        const { SplitWalletService } = await import('../../../services/split');
        const result = await SplitWalletService.getSplitWalletPrivateKey(splitWallet.id, currentUser.id.toString());
        
        if (result.success && result.privateKey) {
          setState({ 
            privateKey: result.privateKey,
          privateKeyWalletId: splitWallet.id,
            showPrivateKeyModal: true 
          });
        } else {
          Alert.alert('Error', `Could not retrieve private key: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        handleError(error, 'get private key');
    } finally {
      setState({ isFetchingPrivateKey: false });
    }
  }, [
    state.isFetchingPrivateKey,
    state.privateKey,
    state.privateKeyWalletId,
    setState,
    handleError
  ]);

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
    logger.error(`Error in ${context}`, { error: errorMessage }, 'DegenSplitLogic');
    setState({ error: errorMessage });
    Alert.alert('Error', `Failed to ${context}. Please try again.`);
  }, [setState]);

  return {
    // Helper functions
    isCurrentUserCreator,
    calculateLockProgress,
    formatWalletAddress,
    checkUserLockStatus,
    
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
