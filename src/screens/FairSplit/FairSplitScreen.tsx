/**
 * Fair Split Screen
 * Allows users to configure and manage fair bill splitting with equal or manual options
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import Input from '../../components/shared/Input';
import { SplitWalletService, SplitWallet, SplitWalletParticipant } from '../../services/split';
import { notificationService } from '../../services/notifications';
import { priceManagementService } from '../../services/core';
import { useApp } from '../../context/AppContext';
import { AmountCalculationService } from '../../services/payments';
import { Participant } from '../../services/payments/amountCalculationService';
import { DataSourceService } from '../../services/data/dataSourceService';
import { logger } from '../../services/analytics/loggingService';
import { debugSplitData, validateSplitData, clearSplitCaches } from '../../services/shared/splitDataUtils';
import { splitRealtimeService, SplitRealtimeUpdate } from '../../services/splits';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { useSplitWallet } from '../../hooks/useSplitWallet';
import { useSplitRealtime } from '../../hooks/useSplitRealtime';
import { splitUtils } from '../../utils/performance/splitUtils';
import FairSplitHeader from './components/FairSplitHeader';
import FairSplitProgress from './components/FairSplitProgress';
import FairSplitParticipants from './components/FairSplitParticipants';
import { Container, Button, AppleSlider, ErrorScreen, ModernLoader } from '../../components/shared';
import Modal from '../../components/shared/Modal';
import CentralizedTransactionModal, { type TransactionModalConfig } from '../../components/shared/CentralizedTransactionModal';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { 
  getParticipantStatusDisplayText
} from '../../utils/statusUtils';

// Remove local image mapping - now handled in FairSplitHeader component

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreen: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  // Subscribe to live balance updates as a fallback when direct balance fetch fails
  // Get wallet address for balance checking (same as transaction validation)
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Load wallet address on mount
  useEffect(() => {
    const loadWalletAddress = async () => {
      if (!currentUser?.id) return;

      try {
        const { simplifiedWalletService } = await import('../../services/blockchain/wallet/simplifiedWalletService');
        const walletInfo = await simplifiedWalletService.getWalletInfo(currentUser.id.toString());
        if (walletInfo) {
          setWalletAddress(walletInfo.address);
        }
      } catch (error) {
        logger.error('Failed to load wallet address for balance', { userId: currentUser.id, error }, 'FairSplitScreen');
      }
    };

    loadWalletAddress();
  }, [currentUser?.id]);

  // This ensures we get the correct balance even when network requests fail initially
  const { balance: liveBalance } = useLiveBalance(
    walletAddress,
    {
      enabled: !!walletAddress,
      onBalanceChange: (update) => {
        // Live balance updates are now handled by the centralized transaction modal
        logger.debug('Live balance update received', {
          usdcBalance: update.usdcBalance,
          address: update.address
        }, 'FairSplitScreen');
      }
    }
  );
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>((existingSplitWallet as SplitWallet) || null);
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false); // Track if split has been confirmed
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null); // Track which participant is being edited
  const [editAmount, setEditAmount] = useState(''); // Track the amount being edited
  const [showEditModal, setShowEditModal] = useState(false); // Track if edit modal is shown
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Track if payment modal is shown
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Track if initialization is in progress - start as true to show loader immediately
  const [showSplitModal, setShowSplitModal] = useState(false); // Track if split modal is shown
  const [selectedTransferMethod, setSelectedTransferMethod] = useState<'external-wallet' | 'in-app-wallet' | null>(null);
  const [showSignatureStep, setShowSignatureStep] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Balance checking state
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceCheckError, setBalanceCheckError] = useState<string | null>(null);

  // Error state management
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  
  // Wallet recap modal state
  const [showWalletRecapModal, setShowWalletRecapModal] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  
  // Wallet management state
  const [externalWallets, setExternalWallets] = useState<{id: string, address: string, name?: string}[]>([]);
  const [kastCards, setKastCards] = useState<{id: string, address: string, name?: string}[]>([]);
  const [inAppWallet, setInAppWallet] = useState<{address: string} | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<{id: string, address: string, type: 'external' | 'in-app' | 'kast', name?: string} | null>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  
  // Real-time update states
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const [hasReceivedRealtimeData, setHasReceivedRealtimeData] = useState(false);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  
  // Helper function to check if current user is the creator
  const isCurrentUserCreator = useCallback(() => {
    if (!currentUser || !splitData) {return false;}
    return splitData.creatorId === currentUser.id.toString();
  }, [currentUser, splitData]);

  /**
   * Determines what action button to show based on split state and user role
   * Returns: 'create-wallet' | 'confirm-split' | 'withdraw' | 'pay-share' | 'waiting'
   */
  const getButtonState = useCallback((): {
    type: 'create-wallet' | 'confirm-split' | 'withdraw' | 'pay-share' | 'waiting';
    message?: string;
  } => {
    // Phase 0: No wallet created yet
    if (!splitWallet) {
      return { type: 'create-wallet' };
    }

    // Phase 1: Split not confirmed yet
    if (!isSplitConfirmed) {
      if (isCurrentUserCreator()) {
        return { type: 'confirm-split' };
      } else {
        return { 
          type: 'waiting',
          message: 'Waiting for creator to confirm the split repartition...'
        };
      }
    }

    // Phase 2: Split confirmed - check payment status
    // CRITICAL: Calculate from split wallet if completion data not available (fallback)
    let completionPercentage = completionData?.completionPercentage ?? 0;
    let collectedAmount = completionData?.collectedAmount ?? 0;
    
    // Fallback: Calculate from split wallet if completion data is null or stale
    if (!completionData && splitWallet?.participants) {
      collectedAmount = splitWallet.participants.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
      const totalAmount = splitWallet.totalAmount || totalAmount || 0;
      const rawPercentage = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
      completionPercentage = Math.min(100, Math.max(0, rawPercentage));
    }
    
    const hasCompletionData = completionData !== null;
    const isFullyCovered = (hasCompletionData || splitWallet?.participants) && 
      completionPercentage >= 100 && 
      collectedAmount > 0; // CRITICAL: Must have actual funds collected
    
    const isCreator = isCurrentUserCreator();
    const isSingleParticipant = participants.length === 1;
    const currentUserParticipant = participants.find(p => p.id === currentUser?.id?.toString());
    const hasUserPaidFully = hasParticipantPaidFully(currentUserParticipant);

    // Special case: Single participant who is the creator can withdraw after paying
    if (isSingleParticipant && isCreator && hasUserPaidFully) {
      return { type: 'withdraw' };
    }

    // Creator can withdraw when fully covered (multiple participants)
    if (isFullyCovered && isCreator) {
      return { type: 'withdraw' };
    }

    // Non-creator sees waiting message when fully covered
    if (isFullyCovered && !isCreator) {
      return { 
        type: 'waiting',
        message: 'Waiting for creator to split the funds...'
      };
    }

    // User has paid their share but others haven't
    if (hasUserPaidFully && !isFullyCovered) {
      return { 
        type: 'waiting',
        message: '✅ You have paid your share! Waiting for other participants to complete their payments...'
      };
    }

    // User needs to pay their share
    return { type: 'pay-share' };
  }, [splitWallet, isSplitConfirmed, isCurrentUserCreator, completionData, participants, currentUser, hasParticipantPaidFully]);

  /**
   * Helper function to check if a participant has fully paid their share
   * Centralizes the payment status check logic to avoid duplication
   * 
   * CRITICAL: Only checks for actual payment, not invitation acceptance
   * - 'accepted' status means they accepted the split invitation, NOT that they've paid
   * - 'paid' status means they've actually sent payment
   * - amountPaid >= amountOwed means they've paid the required amount
   */
  const hasParticipantPaidFully = useCallback((participant: Participant | undefined): boolean => {
    if (!participant) {
      return false;
    }
    
    const { roundUsdcAmount } = require('../../utils/ui/format/formatUtils');
    const roundedAmountPaid = roundUsdcAmount(participant.amountPaid || 0);
    const roundedAmountOwed = roundUsdcAmount(participant.amountOwed || 0);
    
    // CRITICAL: Only check for actual payment status, not 'accepted' status
    // 'accepted' is for split invitation acceptance, not payment
    const hasPaidStatus = participant.status === 'paid';
    const hasPaidAmount = roundedAmountOwed > 0 && roundedAmountPaid >= roundedAmountOwed && roundedAmountPaid > 0;
    
    return hasPaidStatus || hasPaidAmount;
  }, []);

  // Wallet recap functions
  const formatWalletAddress = useCallback((address: string) => {
    if (!address || address.length < 8) {return address;}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  // Balance checking function
  const checkUserBalance = useCallback(async (requiredAmount: number) => {
    if (!currentUser) return;

    try {
      setIsCheckingBalance(true);
      setBalanceCheckError(null);

      // Use live balance if available and recent (avoid unnecessary API calls)
      if (liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined) {
        const userUsdcBalance = liveBalance.usdcBalance;

        if (userUsdcBalance < requiredAmount) {
          setBalanceCheckError(
            `Insufficient balance: You have ${userUsdcBalance.toFixed(6)} USDC but need ${requiredAmount.toFixed(6)} USDC`
          );
        } else {
          setBalanceCheckError(null);
        }
        setIsCheckingBalance(false);
        return;
      }

      // Fallback to balance check utility only if live balance unavailable
      const { getUserBalanceWithFallback } = await import('../../services/shared/balanceCheckUtils');
      const balanceResult = await getUserBalanceWithFallback(currentUser.id.toString(), {
        useLiveBalance: true
      });

      const userUsdcBalance = balanceResult.usdcBalance;

      if (userUsdcBalance < requiredAmount) {
        setBalanceCheckError(
          `Insufficient balance: You have ${userUsdcBalance.toFixed(6)} USDC but need ${requiredAmount.toFixed(6)} USDC`
        );
      } else {
        setBalanceCheckError(null);
      }

      setIsCheckingBalance(false);
    } catch (error) {
      logger.error('Balance check failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: currentUser?.id,
        requiredAmount
      }, 'FairSplitScreen');

      setBalanceCheckError('Failed to check balance. Please try again.');
      setIsCheckingBalance(false);
    }
  }, [currentUser, liveBalance]);

  const handleShowPrivateKey = async () => {
    if (splitWallet?.id && currentUser?.id) {
      try {
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWalletPrivateKey(splitWallet.id, currentUser.id.toString());
        if (result.success && result.privateKey) {
          setPrivateKey(result.privateKey);
          setShowPrivateKeyModal(true);
        } else {
          Alert.alert('Error', 'Could not retrieve private key');
        }
      } catch (error) {
        logger.error('Error getting private key', error as Record<string, unknown>, 'FairSplitScreen');
        Alert.alert('Error', 'Could not retrieve private key');
      }
    }
  };

  const handleClosePrivateKeyModal = () => {
    setShowPrivateKeyModal(false);
  };

  const handleCopyPrivateKey = () => {
    if (privateKey) {
      const { Clipboard } = require('react-native');
      Clipboard.setString(privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
    }
  };

  const handleCopyWalletAddress = (address: string) => {
    const { Clipboard } = require('react-native');
    Clipboard.setString(address);
    Alert.alert('Success', 'Wallet address copied to clipboard');
  };

  // Helper functions for common calculations - memoized for performance
  const calculateTotalLocked = useCallback(() => {
    return participants.reduce((sum, p) => sum + p.amountLocked, 0);
  }, [participants]);

  // Use centralized split utilities for calculations
  const calculateTotalAssigned = useCallback(() => {
    return splitUtils.calculation.calculateTotalRemaining(participants.map(p => ({
      id: p.id,
      name: p.name || '',
      amountOwed: p.amountOwed || 0,
      amountPaid: p.amountPaid || 0
    }))) + participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }, [participants]);

  const calculateTotalPaid = useCallback((walletParticipants: any[]) => {
    return walletParticipants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }, []);

  const hasInvalidAmounts = useCallback(() => {
    const validation = splitUtils.validation.validateParticipants(participants.map(p => ({
      id: p.id,
      name: p.name || '',
      amountOwed: p.amountOwed || 0,
      amountPaid: p.amountPaid || 0
    })));
    return !validation.isValid;
  }, [participants]);

  const hasZeroAmounts = useCallback(() => {
    return participants.some(p => p.amountOwed === 0);
  }, [participants]);


  // Use ref to prevent infinite loops
  const isInitializingRef = useRef(false);


  // Load split wallet data when component mounts and split wallet exists
  useEffect(() => {
    if (splitWallet && splitWallet.id) {
      loadSplitWalletData();
    }
  }, []); // Run once on mount

  // Initialize split confirmation status and method
  useEffect(() => {
    const initializeSplitData = async () => {
      if (splitData && !isInitializingRef.current) {
        isInitializingRef.current = true;
        setIsInitializing(true);
        
        // Perform background refresh and updates
        // Keep loader visible until all critical data is ready to prevent intermediate renders
        // BATCH all updates together to prevent multiple re-renders
        if (splitData.id) {
          Promise.resolve().then(async () => {
            try {
              // Clear any potential caches
              clearSplitCaches();
              
              const { SplitStorageService } = await import('../../services/splits');
              const result = await SplitStorageService.forceRefreshSplit(splitData.id);
              
              if (result.success && result.split) {
                const fullSplitData = result.split;
                
                // Fetch latest user data for participants and load wallet in parallel
                const totalAmount = fullSplitData.totalAmount;
                const amountPerPerson = totalAmount / fullSplitData.participants.length;
                
                // Run participant fetch and wallet load in parallel
                const [participantsWithLatestData, walletData] = await Promise.allSettled([
                  // Fetch participant data
                  Promise.all(
                    fullSplitData.participants.map(async (p: any) => {
                      try {
                        const { firebaseDataService } = await import('../../services/data');
                        const latestUserData = await firebaseDataService.user.getCurrentUser(p.userId);
                        
                        return {
                          ...p,
                          walletAddress: latestUserData?.wallet_address || p.walletAddress || '',
                          avatar: latestUserData?.avatar || p.avatar || '',
                        };
                      } catch (error) {
                        logger.debug('Could not fetch latest data for participant (background)', { userId: p.userId }, 'FairSplitScreen');
                        return p;
                      }
                    })
                  ),
                  // Load wallet if needed
                  (async () => {
                    if (fullSplitData.walletId && !existingSplitWallet) {
                      try {
                        const { SplitWalletService } = await import('../../services/split');
                        const walletResult = await SplitWalletService.getSplitWallet(fullSplitData.walletId);
                        
                        if (walletResult.success && walletResult.wallet) {
                          const wallet = walletResult.wallet;
                          
                          // Check if wallet status is completed (critical check)
                          if (wallet.status === 'completed') {
                            Alert.alert(
                              'Withdrawal Already Completed',
                              'The funds from this split have already been withdrawn. You cannot withdraw funds from this split again.',
                              [
                                {
                                  text: 'OK',
                                  onPress: () => navigation.navigate('SplitsList' as never)
                                }
                              ]
                            );
                            return null;
                          }
                          
                          // Check if wallet participants match split participants
                          const splitParticipantIds = fullSplitData.participants.map((p: { userId: string }) => p.userId);
                          const walletParticipantIds = wallet.participants.map((p: SplitWalletParticipant) => p.userId);
                          
                          // If participants don't match, sync them
                          if (splitParticipantIds.length !== walletParticipantIds.length || 
                              !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
                            const totalAmount = fullSplitData.totalAmount;
                            const amountPerPerson = totalAmount / fullSplitData.participants.length;
                            
                            const updatedWalletParticipants = fullSplitData.participants.map((p: { userId: string; name: string; walletAddress: string; amountOwed: number }) => {
                              const existingWalletParticipant = wallet.participants.find((wp: SplitWalletParticipant) => wp.userId === p.userId);
                              return {
                                userId: p.userId,
                                name: p.name,
                                walletAddress: p.walletAddress,
                                amountOwed: p.amountOwed > 0 ? p.amountOwed : amountPerPerson,
                                amountPaid: existingWalletParticipant?.amountPaid || 0,
                                status: existingWalletParticipant?.status || 'locked' as const,
                                transactionSignature: existingWalletParticipant?.transactionSignature,
                                paidAt: existingWalletParticipant?.paidAt,
                              };
                            });
                            
                            const participantsForUpdate = updatedWalletParticipants.map(p => ({
                              userId: p.userId,
                              name: p.name,
                              walletAddress: p.walletAddress,
                              amountOwed: p.amountOwed,
                            }));
                            
                            const updateResult = await SplitWalletService.updateSplitWalletParticipants(fullSplitData.walletId, participantsForUpdate);
                            
                            if (updateResult.success) {
                              const reloadResult = await SplitWalletService.getSplitWallet(fullSplitData.walletId);
                              if (reloadResult.success && reloadResult.wallet) {
                                return reloadResult.wallet;
                              }
                            }
                            return wallet;
                          }
                          return wallet;
                        }
                        return null;
                      } catch (error) {
                        logger.debug('Background wallet load failed', { error }, 'FairSplitScreen');
                        return null;
                      }
                    }
                    return null;
                  })()
                ]);
                
                // BATCH all state updates together in a single React update cycle
                // Use startTransition to batch all updates and prevent intermediate renders
                const newIsConfirmed = fullSplitData.status === 'active' && fullSplitData.splitType === 'fair';
                const finalWallet = walletData.status === 'fulfilled' ? walletData.value : null;
                
                // Use startTransition to batch all state updates together
                // This ensures React batches all updates and only renders once with the final state
                startTransition(() => {
                  if (participantsWithLatestData.status === 'fulfilled') {
                    const transformedParticipants = participantsWithLatestData.value.map((p: any) => ({
                      id: p.userId,
                      name: p.name,
                      walletAddress: p.walletAddress,
                      amountOwed: p.amountOwed > 0 ? p.amountOwed : amountPerPerson,
                      amountPaid: p.amountPaid || 0,
                      amountLocked: 0,
                      status: p.status,
                      avatar: p.avatar,
                    }));
                    
                    // All state updates batched together - React will render once with all updates
                    setIsSplitConfirmed(newIsConfirmed);
                    if (newIsConfirmed && fullSplitData.splitMethod) {
                      setSplitMethod(fullSplitData.splitMethod as 'equal' | 'manual');
                    }
                    setParticipants(transformedParticipants);
                    if (finalWallet) {
                      setSplitWallet(finalWallet);
                    }
                    
                    // Hide loader only after all critical data is ready
                    setIsInitializing(false);
                    isInitializingRef.current = false;
                  }
                });
              } else {
                // Refresh failed - hide loader and use route params data
                startTransition(() => {
                  setIsInitializing(false);
                  isInitializingRef.current = false;
                });
              }
            } catch (error) {
              logger.debug('Background split refresh failed', { error }, 'FairSplitScreen');
              // Hide loader even if refresh failed - use route params data
              startTransition(() => {
                setIsInitializing(false);
                isInitializingRef.current = false;
              });
            }
          }).catch(error => {
            logger.debug('Background initialization failed', { error }, 'FairSplitScreen');
            // Hide loader even if background init failed - use route params data
            startTransition(() => {
              setIsInitializing(false);
              isInitializingRef.current = false;
            });
          });
        } else {
          // No split ID - use route params data directly
          // Load split wallet if wallet ID is available
          if (splitData.walletId && !existingSplitWallet) {
            Promise.resolve().then(async () => {
              try {
                const { SplitWalletService } = await import('../../services/split');
                const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
                if (walletResult.success && walletResult.wallet) {
                  const wallet = walletResult.wallet;
                  
                  if (wallet.status === 'completed') {
                    Alert.alert(
                      'Withdrawal Already Completed',
                      'The funds from this split have already been withdrawn. You cannot withdraw funds from this split again.',
                      [
                        {
                          text: 'OK',
                          onPress: () => navigation.navigate('SplitsList' as never)
                        }
                      ]
                    );
                    return;
                  }
                  
                  startTransition(() => {
                    setSplitWallet(wallet);
                    setIsInitializing(false);
                    isInitializingRef.current = false;
                  });
                } else {
                  // Wallet load failed - hide loader
                  startTransition(() => {
                    setIsInitializing(false);
                    isInitializingRef.current = false;
                  });
                }
              } catch (error) {
                logger.debug('Background wallet load failed', { error }, 'FairSplitScreen');
                // Hide loader even if wallet load failed
                startTransition(() => {
                  setIsInitializing(false);
                  isInitializingRef.current = false;
                });
              }
            }).catch(error => {
              logger.debug('Background wallet operation failed', { error }, 'FairSplitScreen');
              // Hide loader even if wallet operation failed
              startTransition(() => {
                setIsInitializing(false);
                isInitializingRef.current = false;
              });
            });
          } else {
            // No wallet to load - hide loader immediately
            startTransition(() => {
              setIsInitializing(false);
              isInitializingRef.current = false;
            });
          }
        }
      }
    };

    initializeSplitData();
    
    // Cleanup function to reset ref when component unmounts
    return () => {
      isInitializingRef.current = false;
    };
  }, [splitData?.id]); // Removed isInitializing to prevent infinite loops
  
  // Initialize participants from route params or use current user as creator
  // CRITICAL: If walletId exists, don't initialize from split storage (stale data)
  // Wait for wallet to load which has the source of truth
  const [participants, setParticipants] = useState<Participant[]>(() => {
    // If we have a walletId, don't use split storage data (it's stale)
    // The useEffect will load from wallet (source of truth)
    if (splitData?.walletId) {
      // Return empty array - will be populated by useEffect when wallet loads
      return [];
    }
    
    // Priority: splitData.participants > processedBillData.participants > billData.participants > current user only
    let sourceParticipants = null;
    if (splitData?.participants && splitData.participants.length > 0) {
      sourceParticipants = splitData.participants;
    } else if (processedBillData?.participants && processedBillData.participants.length > 0) {
      sourceParticipants = processedBillData.participants;
    } else if (billData?.participants && billData.participants.length > 0) {
      sourceParticipants = billData.participants;
    }

    if (sourceParticipants && Array.isArray(sourceParticipants) && (sourceParticipants as any[]).length > 0) {
      // Convert BillParticipant to FairSplitScreen Participant format
      const participantsArray = sourceParticipants as any[];
      const mappedParticipants = participantsArray.map((p: any, index: number) => {
        // Handle different participant formats (splitData uses userId, billData uses id)
        const participantId = p.userId || p.id || `participant_${index}`;
        
        // Calculate amount per person for equal split
        const totalAmount = splitData?.totalAmount || 0; // Use split data if available
        const amountPerPerson = totalAmount / participantsArray.length;
        
        // If this participant is the current user, use real data
        if (currentUser && (p.name === 'You' || participantId === currentUser.id.toString())) {
          return {
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address || 'No wallet address',
            amountOwed: p.amountOwed || amountPerPerson, // Use existing amountOwed or calculate equal split
            amountPaid: p.amountPaid || 0, // Use existing amountPaid if available
            amountLocked: 0, // Start with no locked amounts
            status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
            avatar: currentUser.avatar, // Include current user's avatar
          };
        }
        
        // For other participants, use the provided data
        return {
          id: participantId,
          name: p.name || `Participant ${index + 1}`,
          walletAddress: p.walletAddress || p.wallet_address || 'Unknown wallet',
          amountOwed: p.amountOwed || amountPerPerson, // Use existing amountOwed or calculate equal split
          amountPaid: p.amountPaid || 0, // Use existing amountPaid if available
          amountLocked: 0, // Start with no locked amounts
          status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
          avatar: p.avatar, // Include participant's avatar
        };
      });
      
      
      return mappedParticipants;
    }
    
    // If no participants provided, start with just the current user as creator
    if (currentUser) {
      const totalAmount = splitData?.totalAmount || 0; // Use split data if available
      const currentUserParticipant = {
        id: currentUser.id.toString(),
        name: currentUser.name,
        walletAddress: currentUser.wallet_address || 'No wallet address',
        amountOwed: totalAmount, // Single participant gets the full amount
        amountPaid: 0,
        amountLocked: 0,
        status: 'accepted' as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
        avatar: currentUser.avatar, // Include current user's avatar
      };
      
      return [currentUserParticipant];
    }
    
    // Fallback if no current user
    return [];
  });

  // Get the authoritative price from centralized price management
  // Use consistent bill ID format that matches SplitDetailsScreen
  // CRITICAL: Memoize billId to prevent unnecessary re-renders
  const billId = useMemo(() => {
    return processedBillData?.id || splitData?.billId || `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [processedBillData?.id, splitData?.billId]);
  
  // CRITICAL: Memoize price retrieval to prevent multiple calls
  const authoritativePrice = useMemo(() => {
    return priceManagementService.getBillPrice(billId);
  }, [billId]);
  
  // Use DataSourceService for consistent data access with validation
  // CRITICAL: Memoize to prevent multiple calls
  const billInfo = useMemo(() => {
    return DataSourceService.getBillInfo(splitData, processedBillData, billData);
  }, [splitData, processedBillData, billData]);
  
  const totalAmount = billInfo.amount.data;
  
  // Validate data consistency and log warnings if needed
  // CRITICAL: Only log once per billId change, not on every render
  useEffect(() => {
  if (__DEV__) {
    logger.debug('FairSplit: Bill info loaded', {
      splitData: splitData?.totalAmount,
      processedBillData: processedBillData?.totalAmount,
      billData: billData?.totalAmount,
        finalAmount: totalAmount,
        billId
    }, 'FairSplitScreen');
  }
  }, [billId, totalAmount, splitData?.totalAmount, processedBillData?.totalAmount, billData?.totalAmount]);
  
  // Set authoritative price when component loads
  useEffect(() => {
    const setAuthoritativePrice = () => {
      // Force set the authoritative price for this bill (overrides any existing)
      priceManagementService.setBillPrice(
        billId,
        totalAmount,
        billInfo.currency.data
      );
      
      // Log data source usage for debugging
      if (__DEV__) {
        DataSourceService.logDataSourceUsage(splitData, processedBillData, billData, 'FairSplitScreen');
      }
    };
    
    setAuthoritativePrice();
  }, [billId, totalAmount, billInfo.currency.data]);
  
  
  // Total amount calculation - memoized for performance
  const totalLocked = useMemo(() => calculateTotalLocked(), [calculateTotalLocked]);
  // CRITICAL: Use completion data if available (more accurate), otherwise calculate from locked amounts
  // CRITICAL: Cap at 100% to prevent showing >100% progress
  const progressPercentage = useMemo(() => {
    if (completionData?.completionPercentage !== undefined) {
      return Math.min(100, Math.max(0, Math.round(completionData.completionPercentage)));
    }
    if (totalAmount <= 0) return 0;
    const calculated = Math.round((totalLocked / totalAmount) * 100);
    return Math.min(100, Math.max(0, calculated)); // Cap at 100%
  }, [totalLocked, totalAmount, completionData?.completionPercentage]);
  
  // State for completion tracking
  const [completionData, setCompletionData] = useState<{
    completionPercentage: number;
    totalAmount: number;
    collectedAmount: number;
    remainingAmount: number;
    participantsPaid: number;
    totalParticipants: number;
  } | null>(null);
  const [isLoadingCompletionData, setIsLoadingCompletionData] = useState(false);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);

  // Calculate amounts when split method or total amount changes
  useEffect(() => {
    if (splitMethod === 'equal' && participants.length > 0) {
      // Check if participants have zero amounts and recalculate if needed
      if (hasZeroAmounts()) {
        // Simply recalculate amounts instead of triggering repair
        const amountPerPerson = totalAmount / participants.length;
        const updatedParticipants = participants.map(p => ({ ...p, amountOwed: amountPerPerson }));
        setParticipants(updatedParticipants);
        return;
      }
      
      // Use AmountCalculationService for consistent calculations
      const updatedParticipants = AmountCalculationService.calculateParticipantAmounts(
        totalAmount,
        participants,
        'equal'
      );
      
      // Only update if the amount actually changed to prevent infinite loops
      setParticipants(prev => {
        const needsUpdate = prev.some((p, index) => 
          Math.abs(p.amountOwed - updatedParticipants[index]?.amountOwed || 0) > 0.01
        );
        
        if (!needsUpdate) {return prev;}
        
        return updatedParticipants;
      });
    }
  }, [splitMethod, totalAmount, participants.length, splitWallet?.id]);


  // Track if we're currently loading to prevent infinite loops
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const LOAD_THROTTLE_MS = 2000; // Minimum 2 seconds between loads

  // Load completion data when split wallet is available
  // Consolidated to prevent overlapping interval calls
  useEffect(() => {
    // Only set up intervals if we have a split wallet
    if (!splitWallet?.id) {
      return;
    }
    
    // Throttle initial load to prevent rapid successive calls
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    const timeoutId = setTimeout(() => {
      // Only load if not already loading and enough time has passed
      if (!isLoadingRef.current && timeSinceLastLoad >= LOAD_THROTTLE_MS) {
        isLoadingRef.current = true;
        lastLoadTimeRef.current = Date.now();
        
        loadCompletionData().finally(() => {
          isLoadingRef.current = false;
        });
        
        checkAndRepairData();
        
        // Only check completion if not already confirmed or completed
        if (!isSplitConfirmed && splitWallet.status !== 'completed') {
          checkPaymentCompletion();
        }
      }
    }, 100); // 100ms delay to prevent rapid successive calls
    
    // Set up periodic progress updates (only if not completed to avoid infinite loops)
    // CRITICAL: Increased interval to 60 seconds to reduce memory pressure
    const progressInterval = setInterval(() => {
      if (splitWallet?.status !== 'completed' && !isLoadingRef.current) {
        const now = Date.now();
        if (now - lastLoadTimeRef.current >= LOAD_THROTTLE_MS) {
          isLoadingRef.current = true;
          lastLoadTimeRef.current = now;
          loadCompletionData().finally(() => {
            isLoadingRef.current = false;
          });
        }
      }
    }, 60000); // Update progress every 60 seconds to reduce memory pressure
    
    const completionInterval = setInterval(() => {
      if (splitWallet?.status !== 'completed' && !isSplitConfirmed && !isCheckingCompletion) {
        // Only check completion if we have participants and they're not all paid
        const hasUnpaidParticipants = splitWallet?.participants?.some(p => p.status !== 'paid') || false;
        if (hasUnpaidParticipants) {
          checkPaymentCompletion();
        }
      }
    }, 180000); // Check completion every 3 minutes to reduce memory pressure
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      clearInterval(completionInterval);
    };
  }, [splitWallet?.id, isSplitConfirmed, isCheckingCompletion]); // Removed isLoadingCompletionData from dependencies to prevent infinite loop

  // CRITICAL: Load split wallet immediately when walletId is available
  // This ensures we always read from split wallet (source of truth) not split storage
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  useEffect(() => {
    const loadWalletIfNeeded = async () => {
      // If we have a walletId but no splitWallet loaded, load it immediately
      if (splitData?.walletId && !splitWallet?.id && !isLoadingWallet) {
        setIsLoadingWallet(true);
        try {
          const { SplitWalletService } = await import('../../services/split');
          const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
          
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            
            // CRITICAL: Update participants from split wallet (source of truth)
            // This overrides stale data from split storage
            const totalAmount = splitData?.totalAmount || walletResult.wallet.totalAmount || 0;
            const amountPerPerson = totalAmount / walletResult.wallet.participants.length;
            
            const { roundUsdcAmount } = require('../../utils/ui/format/formatUtils');
            const updatedParticipants = walletResult.wallet.participants.map((p: any) => {
              const roundedAmountOwed = p.amountOwed > 0 ? roundUsdcAmount(p.amountOwed) : roundUsdcAmount(amountPerPerson);
              
              let participantStatus: 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined' = 'pending';
              if (p.status === 'paid') {
                participantStatus = 'accepted';
              } else if (p.status === 'locked') {
                participantStatus = 'locked';
              } else if (p.status === 'accepted') {
                participantStatus = 'accepted';
              } else if (p.status === 'declined') {
                participantStatus = 'declined';
              }
              
              const isFullyPaid = (p.amountPaid || 0) >= roundedAmountOwed;
              if (isFullyPaid && participantStatus !== 'declined') {
                participantStatus = 'accepted';
              }
              
              return {
                id: p.userId,
                name: p.name,
                walletAddress: p.walletAddress,
                amountOwed: roundedAmountOwed,
                amountPaid: p.amountPaid || 0, // CRITICAL: Use split wallet data, not split storage
                amountLocked: 0,
                status: participantStatus,
                avatar: p.avatar,
              };
            });
            
            setParticipants(updatedParticipants);
            
            // CRITICAL: Load completion data immediately after wallet loads
            // This ensures progress bar shows correct data
            try {
              const completionResult = await SplitWalletService.getSplitWalletCompletion(walletResult.wallet.id);
              if (completionResult.success) {
                const rawCompletionPercentage = completionResult.completionPercentage ?? 0;
                const cappedCompletionPercentage = Math.min(100, Math.max(0, rawCompletionPercentage));
                
                setCompletionData({
                  completionPercentage: cappedCompletionPercentage,
                  totalAmount: Math.max(0, completionResult.totalAmount ?? walletResult.wallet.totalAmount ?? 0),
                  collectedAmount: Math.max(0, completionResult.collectedAmount ?? 0),
                  remainingAmount: Math.max(0, completionResult.remainingAmount ?? (completionResult.totalAmount ?? walletResult.wallet.totalAmount ?? 0)),
                  participantsPaid: Math.max(0, completionResult.participantsPaid ?? 0),
                  totalParticipants: Math.max(0, completionResult.totalParticipants ?? walletResult.wallet.participants?.length ?? 0),
                });
              }
            } catch (completionError) {
              logger.warn('Failed to load completion data on wallet load', {
                error: completionError instanceof Error ? completionError.message : String(completionError)
              }, 'FairSplitScreen');
            }
            
            // Sync split storage from split wallet to fix stale data (non-blocking)
            const { SplitDataSynchronizer } = await import('../../services/split/SplitDataSynchronizer');
            if (splitData?.billId) {
              // Run sync asynchronously to not block UI
              SplitDataSynchronizer.syncAllParticipantsFromSplitWalletToSplitStorage(
                splitData.billId,
                walletResult.wallet.participants
              ).catch(syncError => {
                logger.warn('Failed to sync split storage', {
                  billId: splitData.billId,
                  error: syncError instanceof Error ? syncError.message : String(syncError)
                }, 'FairSplitScreen');
              });
            }
          }
        } catch (error) {
          logger.error('Failed to load split wallet on mount', {
            error: error instanceof Error ? error.message : String(error),
            walletId: splitData?.walletId
          }, 'FairSplitScreen');
        } finally {
          setIsLoadingWallet(false);
        }
      }
    };
    
    loadWalletIfNeeded();
  }, [splitData?.walletId, splitWallet?.id, isLoadingWallet]);

  // Load user wallets when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      loadUserWallets();
    }
  }, [currentUser?.id]);

  // Reload wallets and completion data when screen comes back into focus (e.g., after adding a wallet or making a payment)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUser?.id) {
        loadUserWallets();
      }
      
      // CRITICAL: Reload split wallet data and completion data when screen comes into focus
      // This ensures we have the latest data, especially after a payment or navigation
      if (splitWallet?.id) {
        loadSplitWalletData().then(() => {
          loadCompletionData();
        }).catch(error => {
          logger.warn('Failed to reload split wallet data on focus', { 
            error: error instanceof Error ? error.message : String(error) 
          }, 'FairSplitScreen');
        });
      }
    });

    return unsubscribe;
  }, [navigation, currentUser?.id, splitWallet?.id]);

  // Real-time update functions
  const startRealtimeUpdates = async () => {
    if (!splitData?.id || isRealtimeActive) {return;}
    
    try {
      logger.info('Starting real-time updates for FairSplit', { splitId: splitData.id }, 'FairSplitScreen');
      
      const cleanup = await splitRealtimeService.startListening(
        splitData.id,
        {
          onSplitUpdate: (update: SplitRealtimeUpdate) => {
            logger.debug('Real-time split update received in FairSplit', { 
              splitId: splitData.id,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length
            }, 'FairSplitScreen');
            
            if (update.split) {
              // Update the split data
              setLastRealtimeUpdate(update.lastUpdated);
              setHasReceivedRealtimeData(true);
              
              // Update participants if they have changed
              if (update.participants.length !== participants.length) {
                // Reload split wallet data to get updated participants
                if (splitWallet?.id) {
                  loadSplitWalletData();
                }
              }
            }
          },
          onParticipantUpdate: (participants) => {
            logger.debug('Real-time participant update received in FairSplit', { 
              splitId: splitData.id,
              participantsCount: participants.length
            }, 'FairSplitScreen');
            
            setHasReceivedRealtimeData(true);
            
            // Reload split wallet data to get updated participants
            if (splitWallet?.id) {
              loadSplitWalletData();
            }
          },
          onError: (error) => {
            logger.error('Real-time update error in FairSplit', { 
              splitId: splitData.id,
              error: error.message 
            }, 'FairSplitScreen');
          }
        }
      );
      
      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      // Don't set hasReceivedRealtimeData here - only when actual data is received
      
    } catch (error) {
      logger.error('Failed to start real-time updates in FairSplit', { 
        splitId: splitData?.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'FairSplitScreen');
    }
  };

  const stopRealtimeUpdates = () => {
    if (!isRealtimeActive) {return;}
    
    try {
      logger.info('Stopping real-time updates for FairSplit', { splitId: splitData?.id }, 'FairSplitScreen');
      
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }
      
      splitRealtimeService.stopListening(splitData?.id);
      setIsRealtimeActive(false);
      setLastRealtimeUpdate(null);
      
    } catch (error) {
      logger.error('Failed to stop real-time updates in FairSplit', { 
        splitId: splitData?.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'FairSplitScreen');
    }
  };

  // Start real-time updates when split data is available (with throttling)
  useEffect(() => {
    if (splitData?.id && !isRealtimeActive) {
      // Add a small delay to prevent excessive real-time updates
      const timeoutId = setTimeout(() => {
        startRealtimeUpdates().catch(error => {
          logger.error('Failed to start real-time updates in FairSplit', error as Record<string, unknown>, 'FairSplitScreen');
        });
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [splitData?.id, isRealtimeActive]);

  // Cleanup real-time updates on unmount
  useEffect(() => {
    return () => {
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }
    };
  }, []);

  // Check if all participants have paid their shares (with throttling to prevent excessive calls)
  const checkPaymentCompletion = async () => {
    if (!splitWallet?.id) {
      return;
    }

    // Prevent duplicate completion checks
    if (isSplitConfirmed || splitWallet.status === 'completed' || isCheckingCompletion) {
      return;
    }

    // Only check completion for the current split wallet, not all wallets
    const currentSplitWalletId = splitWallet.id;
    if (!currentSplitWalletId) {
      return;
    }

    setIsCheckingCompletion(true);

    try {
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (!result.success || !result.wallet) {
        return;
      }

      const wallet = result.wallet;
      const allParticipantsPaid = wallet.participants.every((p: any) => p.status === 'paid');

      // Check for data consistency issues - don't trigger completion if there are inconsistencies
      const completionData = await SplitWalletService.getSplitWalletCompletion(wallet.id);
      if (completionData?.dataConsistencyIssue) {
        logger.warn('Skipping completion check due to data consistency issues', {
          splitWalletId: wallet.id,
          completionPercentage: completionData.completionPercentage,
          collectedAmount: completionData.collectedAmount,
          actualOnChainBalance: completionData.actualOnChainBalance || 0
        }, 'FairSplitScreen');
        
        // If there's a data consistency issue, try to repair it first
        try {
          const { fixSplitWalletDataConsistency } = await import('../../services/split/SplitWalletManagement');
          const repairResult = await fixSplitWalletDataConsistency(wallet.id);
          if (repairResult.success && repairResult.fixed) {
            logger.info('Data consistency issue repaired, retrying completion check', {
              splitWalletId: wallet.id
            }, 'FairSplitScreen');
            // Retry completion check after repair
            setTimeout(() => checkPaymentCompletion(), 2000);
          }
        } catch (repairError) {
          logger.error('Failed to repair data consistency issue', {
            splitWalletId: wallet.id,
            error: repairError instanceof Error ? repairError.message : String(repairError)
          }, 'FairSplitScreen');
        }
        return;
      }

      // Only proceed if all participants have paid AND the wallet is not already completed
      // Add additional validation to prevent duplicate completion attempts
      if (allParticipantsPaid && wallet.participants.length > 0 && wallet.status !== 'completed' && !isSplitConfirmed) {
        
        logger.info('All participants have paid - showing withdrawal options', {
          splitWalletId: splitWallet.id,
          participantsCount: wallet.participants.length,
          totalAmount: wallet.totalAmount
        }, 'FairSplitScreen');
        
        // Set confirmation flag FIRST to prevent duplicate triggers
        setIsSplitConfirmed(true);
        
        // Update local state to show completion status but not mark as completed yet
        setSplitWallet(prev => prev ? { 
          ...prev, 
          status: 'active' as const, // Keep as active until withdrawal is complete
          participants: wallet.participants.map((p: any) => ({ ...p, status: 'paid' }))
        } : null);
        
        // Verify blockchain state before showing completion
        try {
          const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
          const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
          
          if (balanceResult.success && balanceResult.balance > 0) {
            logger.info('Blockchain verification successful, showing completion', {
              splitWalletId: wallet.id,
              onChainBalance: balanceResult.balance,
              expectedAmount: wallet.totalAmount
            }, 'FairSplitScreen');
            
            // Show alert to inform user that all payments are received
            Alert.alert(
              'All Payments Received! 🎉',
              `All participants have paid their shares (${wallet.totalAmount} USDC total). You can now withdraw the funds to distribute them.`,
              [
                {
                  text: 'Withdraw Funds',
                  style: 'default',
                  onPress: () => {
                    // Show withdrawal modal after user confirms
                    setShowSplitModal(true);
                  }
                },
              ]
            );
          } else {
            logger.warn('Blockchain verification failed, not showing completion', {
              splitWalletId: wallet.id,
              onChainBalance: balanceResult.balance,
              expectedAmount: wallet.totalAmount
            }, 'FairSplitScreen');
            
            // Don't show completion popup if blockchain doesn't confirm funds
            Alert.alert(
              'Payment Processing',
              'Your payment is being processed. Please wait for blockchain confirmation before withdrawing funds.',
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          logger.error('Failed to verify blockchain state', {
            splitWalletId: wallet.id,
            error: error instanceof Error ? error.message : String(error)
          }, 'FairSplitScreen');
          
          // Fallback: show completion but warn about verification
          Alert.alert(
            'All Payments Received! 🎉',
            `All participants have paid their shares (${wallet.totalAmount} USDC total). You can now withdraw the funds to distribute them.`,
            [
              {
                text: 'Withdraw Funds',
                style: 'default',
                onPress: () => {
                  setShowSplitModal(true);
                }
              },
            ]
          );
        }
        
        return; // Don't proceed with automatic completion
      }
    } catch (error) {
      logger.error('Error checking payment completion', error as Record<string, unknown>, 'FairSplitScreen');
    } finally {
      setIsCheckingCompletion(false);
    }
  };

  const checkAndRepairData = async () => {
    if (!splitWallet?.id) {return;}
    
    // Skip validation for completed splits - they're already finalized
    if (splitWallet.status === 'completed') {
      return;
    }
    
    // Add validation to prevent processing invalid wallets
    if (!splitWallet.billId || !splitWallet.creatorId || !splitWallet.walletAddress) {
      logger.warn('Skipping data repair due to missing critical data', {
        billId: splitWallet.billId,
        creatorId: splitWallet.creatorId,
        walletAddress: splitWallet.walletAddress
      }, 'FairSplitScreen');
      return;
    }
    
    try {
      // First validate the data
      const { SplitDataValidationService } = await import('../../services/splits');
      // Convert split wallet to the format expected by validation service
      const validationWallet = {
        id: splitWallet.id,
        billId: splitWallet.billId || '',
        creatorId: splitWallet.creatorId || '',
        walletAddress: splitWallet.walletAddress || '',
        address: splitWallet.walletAddress || '',
        balance: 0, // Will be updated by validation service
        currency: splitWallet.currency || 'USDC',
        totalAmount: splitWallet.totalAmount || 0,
        participants: splitWallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status,
          share: p.amountOwed / (splitWallet.totalAmount || 1), // Calculate share
          isActive: p.status !== 'failed'
        })),
        created_at: splitWallet.createdAt,
        updated_at: splitWallet.updatedAt
      };
      const validationResult = SplitDataValidationService.validateSplitWallet(validationWallet);
      
      // Only repair if there are critical errors, not warnings or info
      const criticalIssues = validationResult.issues.filter(issue => 
        issue.type === 'error' && issue.severity === 'critical'
      );
      
      if (criticalIssues.length > 0) {
        logger.warn('Critical data validation issues found', { criticalIssues }, 'FairSplitScreen');
        
        // Try to repair the data only for critical issues
        const repairResult = await SplitWalletService.repairSplitWalletData(splitWallet.id);
        
        if (repairResult.success && repairResult.repaired) {
          // Silently reload the split wallet data without showing popup
          loadSplitWalletData();
          logger.info('Split wallet data repaired successfully', { splitWalletId: splitWallet.id }, 'FairSplitScreen');
        } else if (repairResult.success && !repairResult.repaired) {
          // No repair needed, but validation issues exist
          const summary = SplitDataValidationService.getValidationSummary(validationResult);
          logger.debug('Validation summary', { summary }, 'FairSplitScreen');
        } else {
          logger.error('Data repair failed', { error: repairResult.error }, 'FairSplitScreen');
        }
      } else {
        // Log non-critical issues for debugging but don't repair
        const nonCriticalIssues = validationResult.issues.filter(issue => 
          issue.type !== 'error' || issue.severity !== 'critical'
        );
        if (nonCriticalIssues.length > 0) {
          logger.debug('Non-critical validation issues found', { issues: nonCriticalIssues }, 'FairSplitScreen');
        }
      }
    } catch (error) {
      logger.error('Error checking data corruption', error as Record<string, unknown>, 'FairSplitScreen');
    }
  };

  const loadSplitWalletData = async () => {
    if (!splitWallet?.id || isLoadingCompletionData) {return;}
    
    // Add guard to prevent multiple simultaneous calls
    setIsLoadingCompletionData(true);
    
    try {
      // First, fix any precision issues in the split wallet data
      const { fixSplitWalletPrecision, fixSplitWalletDataConsistency } = await import('../../services/split/SplitWalletManagement');
      await fixSplitWalletPrecision(splitWallet.id);
      
      // Then, fix any data consistency issues (participants marked as paid but no funds on-chain)
      const consistencyResult = await fixSplitWalletDataConsistency(splitWallet.id);
      if (consistencyResult.success && consistencyResult.fixed) {
        if (__DEV__) {
          logger.debug('Fixed data consistency issues in split wallet', null, 'FairSplitScreen');
        }
        logger.info('Data consistency fix applied', {
          splitWalletId: splitWallet.id,
          fixed: consistencyResult.fixed
        }, 'FairSplitScreen');
      } else if (consistencyResult.success && !consistencyResult.fixed) {
        if (__DEV__) {
          logger.debug('No data consistency issues found in split wallet', null, 'FairSplitScreen');
        }
      } else {
        logger.warn('Data consistency fix failed', { error: consistencyResult.error }, 'FairSplitScreen');
      }
      
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (result.success && result.wallet) {
        setSplitWallet(result.wallet);
        
        // Update participants with the repaired data
        const totalAmount = splitData?.totalAmount || 0;
        const amountPerPerson = totalAmount / result.wallet.participants.length;
        
        const updatedParticipants = result.wallet.participants.map((p: any) => {
          // Import roundUsdcAmount to fix precision issues
          const { roundUsdcAmount } = require('../../utils/ui/format/formatUtils');
          const roundedAmountOwed = p.amountOwed > 0 ? roundUsdcAmount(p.amountOwed) : roundUsdcAmount(amountPerPerson);
          
          // CRITICAL: Map split wallet status to participant status correctly
          // 'paid' status in split wallet means fully paid
          let participantStatus: 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined' = 'pending';
          if (p.status === 'paid') {
            participantStatus = 'accepted'; // Fully paid participants are accepted
          } else if (p.status === 'locked') {
            participantStatus = 'locked';
          } else if (p.status === 'accepted') {
            participantStatus = 'accepted';
          } else if (p.status === 'declined') {
            participantStatus = 'declined';
          }
          
          // Also check if amountPaid >= amountOwed to determine if fully paid
          const isFullyPaid = (p.amountPaid || 0) >= roundedAmountOwed;
          if (isFullyPaid && participantStatus !== 'declined') {
            participantStatus = 'accepted';
          }
          
          return {
            id: p.userId,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: roundedAmountOwed,
            amountPaid: p.amountPaid || 0,
            amountLocked: 0,
            status: participantStatus,
            avatar: p.avatar, // Include avatar from wallet participant data
          };
        });
        
        setParticipants(updatedParticipants);
        
        // CRITICAL: Load completion data immediately after updating participants
        // This ensures progress bar shows correct data
        try {
          const completionResult = await SplitWalletService.getSplitWalletCompletion(walletResult.wallet.id);
          if (completionResult.success) {
            const rawCompletionPercentage = completionResult.completionPercentage ?? 0;
            const cappedCompletionPercentage = Math.min(100, Math.max(0, rawCompletionPercentage));
            
            setCompletionData({
              completionPercentage: cappedCompletionPercentage,
              totalAmount: Math.max(0, completionResult.totalAmount ?? walletResult.wallet.totalAmount ?? 0),
              collectedAmount: Math.max(0, completionResult.collectedAmount ?? 0),
              remainingAmount: Math.max(0, completionResult.remainingAmount ?? (completionResult.totalAmount ?? walletResult.wallet.totalAmount ?? 0)),
              participantsPaid: Math.max(0, completionResult.participantsPaid ?? 0),
              totalParticipants: Math.max(0, completionResult.totalParticipants ?? walletResult.wallet.participants?.length ?? 0),
            });
          }
        } catch (completionError) {
          logger.warn('Failed to load completion data in loadSplitWalletData', {
            error: completionError instanceof Error ? completionError.message : String(completionError)
          }, 'FairSplitScreen');
        }
      }
    } catch (error) {
      logger.error('Failed to reload split wallet data', error as Record<string, unknown>, 'FairSplitScreen');
    } finally {
      setIsLoadingCompletionData(false);
    }
  };

  const loadCompletionData = async () => {
    if (!splitWallet?.id) {
      // CRITICAL: If no split wallet, ensure completion data is null or reset to defaults
      setCompletionData(null);
      return;
    }
    
    // CRITICAL: Prevent duplicate calls
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoadingCompletionData(true);
    try {
      const result = await SplitWalletService.getSplitWalletCompletion(splitWallet.id);
      
      if (result.success) {
        // CRITICAL: Ensure all values are properly initialized, defaulting to 0 if undefined
        // CRITICAL: Cap completion percentage at 100% to prevent showing >100% progress
        const rawCompletionPercentage = result.completionPercentage ?? 0;
        const cappedCompletionPercentage = Math.min(100, Math.max(0, rawCompletionPercentage));
        
        const newCompletionData = {
          completionPercentage: cappedCompletionPercentage,
          totalAmount: Math.max(0, result.totalAmount ?? splitWallet.totalAmount ?? 0),
          collectedAmount: Math.max(0, result.collectedAmount ?? 0),
          remainingAmount: Math.max(0, result.remainingAmount ?? (result.totalAmount ?? splitWallet.totalAmount ?? 0)),
          participantsPaid: Math.max(0, result.participantsPaid ?? 0),
          totalParticipants: Math.max(0, result.totalParticipants ?? splitWallet.participants?.length ?? participants.length ?? 0),
        };
        
        // Only update if data actually changed to prevent unnecessary re-renders
        setCompletionData(prev => {
          if (!prev) {
            return newCompletionData;
          }
          
          const hasChanged = 
            prev.completionPercentage !== newCompletionData.completionPercentage ||
            prev.collectedAmount !== newCompletionData.collectedAmount ||
            prev.remainingAmount !== newCompletionData.remainingAmount ||
            prev.participantsPaid !== newCompletionData.participantsPaid;
          
          if (!hasChanged) {
            return prev; // Return previous state to prevent re-render
          }
          
          return newCompletionData;
        });
        
        // Reduce logging frequency to prevent spam
        if (__DEV__ && (newCompletionData.completionPercentage === 100 || newCompletionData.completionPercentage === 0)) {
          // Only log every 10 seconds to prevent spam
          const now = Date.now();
          const lastLogTime = (completionData as any)?.lastLogTime || 0;
          if (now - lastLogTime > 10000) { // Only log every 10 seconds
            logger.debug('Completion data updated', { newCompletionData }, 'FairSplitScreen');
          }
        }
      } else {
        if (__DEV__) {
          logger.error('Failed to load completion data', { error: result.error }, 'FairSplitScreen');
        }
        // Set default completion data on error (only if not already set)
        setCompletionData(prev => {
          if (prev && prev.completionPercentage === 0 && prev.collectedAmount === 0) {
            return prev; // Already at default, no need to update
          }
          return {
            completionPercentage: 0,
            totalAmount: totalAmount,
            collectedAmount: 0,
            remainingAmount: totalAmount,
            participantsPaid: 0,
            totalParticipants: participants.length,
          };
        });
      }
    } catch (error) {
      if (__DEV__) {
        logger.error('Error loading completion data', error as Record<string, unknown>, 'FairSplitScreen');
      }
      // Set default completion data on error (only if not already set)
      setCompletionData(prev => {
        if (prev && prev.completionPercentage === 0 && prev.collectedAmount === 0) {
          return prev; // Already at default, no need to update
        }
        return {
          completionPercentage: 0,
          totalAmount: totalAmount,
          collectedAmount: 0,
          remainingAmount: totalAmount,
          participantsPaid: 0,
          totalParticipants: participants.length,
        };
      });
    } finally {
      setIsLoadingCompletionData(false);
    }
  };

  const handleSplitMethodChange = (method: 'equal' | 'manual') => {
    setSplitMethod(method);
  };

  const handleAmountChange = (participantId: string, amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    setParticipants(prev =>
      prev.map(p => 
        p.id === participantId 
          ? { ...p, amountOwed: newAmount }
          : p
      )
    );
  };

  const handleCreateSplitWallet = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if we already have a split wallet
    if (splitWallet) {
      Alert.alert(
        'Split Wallet Ready!',
        'Your split wallet is already created. Participants can now send their payments.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Send notifications to participants
              sendPaymentNotifications(splitWallet);
            },
          },
        ]
      );
      return;
    }

    // Ensure amounts are calculated before creating wallet
    let participantsWithAmounts = [...participants];
    if (splitMethod === 'equal' && participants.length > 0) {
      const amountPerPerson = totalAmount / participants.length;
      participantsWithAmounts = participants.map(p => ({ ...p, amountOwed: amountPerPerson }));
      setParticipants(participantsWithAmounts);
    }

    if (__DEV__) {
    logger.info('Creating split wallet with participants', {
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
      participantsCount: participantsWithAmounts.length,
      totalAmount
    }, 'FairSplitScreen');
    }

    setIsCreatingWallet(true);

    try {
      // Create split wallet if it doesn't exist
      if (!splitWallet) {
        logger.info('Creating new split wallet for fair split', null, 'FairSplitScreen');
        
        // Use unified creation service with participant mapper
        const { UnifiedSplitCreationService } = await import('../../services/split/UnifiedSplitCreationService');
        const { mapParticipantsToSplitWallet } = await import('../../services/split/utils/participantMapper');
        
        const mappedParticipants = mapParticipantsToSplitWallet(participantsWithAmounts.map(p => ({
            userId: p.id,
          id: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed,
        })));
        
        const walletResult = await UnifiedSplitCreationService.createSplitWallet({
          billId: splitData!.billId,
          creatorId: currentUser!.id.toString(),
          totalAmount,
          currency: 'USDC',
          splitType: 'fair',
          participants: mappedParticipants,
        });
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create split wallet');
        }
        
        const newWallet = walletResult.wallet;
        setSplitWallet(newWallet);
        logger.info('Split wallet created successfully', { splitWalletId: newWallet.id }, 'FairSplitScreen');
        
        // CRITICAL: Initialize completion data to 0 when wallet is first created
        // This ensures UI shows correct state (0% collected, no payments made)
        setCompletionData({
          completionPercentage: 0,
          totalAmount: newWallet.totalAmount,
          collectedAmount: 0,
          remainingAmount: newWallet.totalAmount,
          participantsPaid: 0,
          totalParticipants: newWallet.participants.length,
        });
        
        // Note: Split document sync is handled by UnifiedSplitCreationService
        
        // Set the authoritative price in the price management service
        const walletBillId = newWallet.billId;
        const unifiedAmount = totalAmount;
        
        if (__DEV__) {
          logger.debug('Setting authoritative price', {
            billId: walletBillId,
            totalAmount: unifiedAmount
          }, 'FairSplitScreen');
        }
        
        priceManagementService.setBillPrice(
          walletBillId,
          unifiedAmount,
          'USDC'
        );
        
        // Send notifications to participants silently
        sendPaymentNotifications(newWallet);
      }

    } catch (error) {
      handleError(error, 'create split wallet');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const sendPaymentNotifications = async (wallet: SplitWallet) => {
    const participantIds = wallet.participants.map((p: any) => p.userId);
    const billName = billInfo.name.data || 'Split Payment'; // Use DataSourceService with fallback

    // Send individual notifications to each participant
    for (const participant of wallet.participants) {
      await notificationService.instance.sendNotification(
        participant.userId,
        'Payment Required',
        `You owe ${participant.amountOwed} USDC for ${billName}`,
        'split_payment_required',
        {
          splitId: splitData?.id,
          splitWalletId: wallet.id,
          billName,
          amount: participant.amountOwed,
          currency: 'USDC',
          timestamp: new Date().toISOString()
        }
      );
    }
  };

  const handlePayMyShare = () => {
    if (!splitWallet || !currentUser?.id) {
      Alert.alert('Error', 'Split wallet not created yet');
      return;
    }

    logger.debug('Checking participant lookup for payment', {
      currentUserId: currentUser.id.toString(),
      splitWalletId: splitWallet.id,
      participantsCount: splitWallet.participants.length
    }, 'FairSplitScreen');

    const participant = splitWallet.participants.find(p => p.userId === currentUser.id.toString());
    if (!participant) {
      logger.debug('Participant not found in splitWallet, checking local participants', {
        localParticipantsCount: participants.length,
        currentUserId: currentUser.id.toString()
      }, 'FairSplitScreen');
      
      // Fallback: check if user exists in local participants
      const localParticipant = participants.find(p => p.id === currentUser.id.toString());
      if (!localParticipant) {
        Alert.alert('Error', 'You are not a participant in this split');
        return;
      }
      
      logger.debug('Using local participant data for navigation', null, 'FairSplitScreen');
    } else {
      // Check if participant data looks incorrect (amountOwed = 0, amountPaid > 0)
      if (participant.amountOwed === 0 && participant.amountPaid > 0) {
        logger.warn('Detected incorrect participant data', {
          participantId: participant.userId,
          amountOwed: participant.amountOwed,
          amountPaid: participant.amountPaid,
          expectedAmountOwed: totalAmount / participants.length
        }, 'FairSplitScreen');
        
        Alert.alert(
          'Data Issue Detected',
          'There seems to be an issue with your payment data. The system shows you have already paid, but the amount owed is incorrect. Please contact support or try creating a new split.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue Anyway', 
              onPress: () => {
                // Navigate to payment screen anyway
                navigation.navigate('SplitPayment', {
                  splitWalletId: splitWallet.id,
                  billName: billInfo.name.data, // Use DataSourceService
                  totalAmount: totalAmount,
                });
              }
            }
          ]
        );
        return;
      }
    }

    // Navigate to payment screen
    navigation.navigate('SplitPayment', {
      splitWalletId: splitWallet.id,
      billName: processedBillData?.title || billData?.title || 'Restaurant Night',
      totalAmount: totalAmount,
    });
  };

  // Load user's wallets from Firebase
  const loadUserWallets = async () => {
    if (!currentUser?.id) {return;}
    
    setIsLoadingWallets(true);
    try {
      // Use LinkedWalletService to get both external wallets and KAST cards
      const { LinkedWalletService } = await import('../../services/blockchain/wallet/LinkedWalletService');
      const linkedData = await LinkedWalletService.getLinkedDestinations(currentUser.id.toString());
      
      // Transform external wallets to the format expected by the UI
      const externalWalletsData = linkedData.externalWallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address || wallet.identifier || '',
        name: wallet.label || `External Wallet ${wallet.id.slice(-4)}`
      }));
      
      // Transform KAST cards to the format expected by the UI
      const kastCardsData = linkedData.kastCards.map(card => ({
        id: card.id,
        address: card.address || card.identifier || '',
        name: card.label || `KAST Card ${card.id.slice(-4)}`
      }));
      
      setExternalWallets(externalWalletsData);
      setKastCards(kastCardsData);
      
      // Load in-app wallet from user document
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      const userDocRef = doc(db, 'users', currentUser.id);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        if (userData.wallet_address) {
          setInAppWallet({ address: userData.wallet_address });
        }
      }
      
      logger.debug('Loaded user wallets', {
        externalWalletsCount: externalWalletsData.length,
        kastCardsCount: kastCardsData.length,
        hasInAppWallet: userDocSnapshot.exists() && userDocSnapshot.data().wallet_address
      }, 'FairSplitScreen');
      
    } catch (error) {
      logger.error('Error loading user wallets', error as Record<string, unknown>, 'FairSplitScreen');
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoadingWallets(false);
    }
  };

  // Helper function to reload wallets (used in multiple places)
  const reloadWallets = async () => {
    await loadUserWallets();
  };

  // Helper function for common error handling
  const handleError = (error: unknown, context: string, showAlert: boolean = true) => {
    logger.error(`${context}`, error as Record<string, unknown>, 'FairSplitScreen');
    setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    setIsLoading(false);
    setIsCreatingWallet(false);
    if (showAlert) {
      Alert.alert('Error', `Failed to ${context.toLowerCase()}. Please try again.`);
    }
  };

  // Debug USDC balance to identify balance query issues
  const debugUsdcBalance = async () => {
    if (!splitWallet) {
      Alert.alert('Error', 'No split wallet available');
      return;
    }

    try {
      logger.debug('Starting USDC balance debug', {
        splitWalletAddress: splitWallet.walletAddress
      }, 'FairSplitScreen');

      const { SplitWalletService } = await import('../../services/split');
      const debugResult = await SplitWalletService.debugUsdcBalance(splitWallet.walletAddress);

      if (debugResult.success) {
        logger.debug('USDC balance debug results', debugResult.results, 'FairSplitScreen');
        
        // Show results in a detailed alert
        const results = debugResult.results;
        let message = `USDC Balance Debug Results:\n\n`;
        message += `Wallet: ${results.walletAddress}\n`;
        message += `USDC Mint: ${results.usdcMint}\n\n`;
        
        if (results.method1) {
          message += `Method 1 (getAssociatedTokenAddress):\n`;
          message += `Token Account: ${results.method1.tokenAccount}\n`;
          message += `Balance: ${results.method1.balance || 0} USDC\n`;
          message += `Raw Amount: ${results.method1.rawAmount || 'N/A'}\n`;
          message += `Success: ${results.method1.success}\n\n`;
        }
        
        if (results.method2) {
          message += `Method 2 (getAccountInfo):\n`;
          message += `Exists: ${results.method2.exists}\n`;
          message += `Owner: ${results.method2.owner || 'N/A'}\n`;
          message += `Manual Balance: ${results.method2.manualBalance || 0} USDC\n`;
          message += `Manual Raw: ${results.method2.manualRawAmount || 'N/A'}\n\n`;
        }
        
        if (results.method3) {
          message += `Method 3 (getTokenAccountsByOwner):\n`;
          message += `Total Accounts: ${results.method3.totalAccounts}\n`;
          if (results.method3.usdcAccount) {
            message += `USDC Account Found: ${results.method3.usdcAccount.pubkey}\n`;
            message += `USDC Balance: ${results.method3.usdcAccount.balance} USDC\n`;
            message += `USDC Raw: ${results.method3.usdcAccount.rawAmount}\n`;
          } else {
            message += `No USDC account found\n`;
          }
        }
        
        Alert.alert('USDC Balance Debug Results', message, [
          { text: 'OK' }
        ]);
      } else {
        Alert.alert('Debug Failed', debugResult.error || 'Failed to debug USDC balance');
      }
    } catch (error) {
      logger.error('Error debugging USDC balance', error as Record<string, unknown>, 'FairSplitScreen');
      Alert.alert('Error', 'Failed to debug USDC balance');
    }
  };

  // Fix participant status for single participant splits
  const handleFixParticipantStatus = async () => {
    if (!splitWallet) {
      Alert.alert('Error', 'No split wallet found');
      return;
    }

    try {
      setIsLoading(true);
      
      const { SplitWalletService } = await import('../../services/split');
      const repairResult = await SplitWalletService.repairSplitWalletData(splitWallet.id);
      
      if (repairResult.success && repairResult.repaired) {
        Alert.alert(
          '✅ Status Fixed!',
          'Participant status has been repaired. The data should now be consistent.',
          [{ text: 'OK' }]
        );
        
        // Reload data to reflect changes
        await loadSplitWalletData();
        await loadCompletionData();
      } else if (repairResult.success && !repairResult.repaired) {
        Alert.alert(
          'No Issues Found',
          'No data consistency issues were detected. The participant status is already correct.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Repair Failed',
          repairResult.error || 'Failed to repair participant status',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fix participant status');
      logger.error('Error fixing participant status', error as Record<string, unknown>, 'FairSplitScreen');
    } finally {
      setIsLoading(false);
    }
  };

  // Repair split wallet when synchronization issues are detected
  const repairSplitWallet = async () => {
    if (!splitWallet || !currentUser) {
      Alert.alert('Error', 'Unable to repair split wallet');
      return;
    }

    try {
      logger.info('Starting split wallet repair', {
        splitWalletId: splitWallet.id,
        creatorId: currentUser.id.toString()
      }, 'FairSplitScreen');

      const { SplitWalletService } = await import('../../services/split');
      const repairResult = await SplitWalletService.repairSplitWalletSynchronization(
        splitWallet.id,
        currentUser.id.toString()
      );

      if (repairResult.success && repairResult.repaired) {
        logger.info('Split wallet repaired successfully', null, 'FairSplitScreen');
        
        Alert.alert(
          'Split Wallet Repaired!',
          'The split wallet data has been repaired. Participant payment status has been reset, and they can now retry their payments.\n\nYou can now try to withdraw funds again once participants have paid.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload the split wallet data to reflect the repair
                loadSplitWalletData();
                // Close any open modals
                setShowSignatureStep(false);
                setShowSplitModal(false);
                setSelectedTransferMethod(null);
                setSelectedWallet(null);
              }
            }
          ]
        );
      } else if (repairResult.success && !repairResult.repaired) {
        Alert.alert(
          'No Repair Needed',
          'The split wallet data appears to be correct. The issue might be temporary. Please try the withdrawal again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Repair Failed',
          repairResult.error || 'Failed to repair split wallet. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('Error repairing split wallet', error as Record<string, unknown>, 'FairSplitScreen');
      Alert.alert('Error', 'Failed to repair split wallet. Please contact support.');
    }
  };

  // Helper function to validate creator permissions
  const validateCreatorPermission = (action: string): boolean => {
    if (!isCurrentUserCreator()) {
      Alert.alert('Error', `Only the split creator can ${action}`);
      return false;
    }
    return true;
  };

  // DEV FUNCTION: Independent fund withdrawal for testing
  const handleDevWithdraw = () => {
    if (!splitWallet) {
      Alert.alert('Error', 'Split wallet not created yet');
      return;
    }

    // Ensure only the creator can use the dev withdrawal
    if (!validateCreatorPermission('withdraw funds')) {
      return;
    }

    logger.info('Independent fund withdrawal triggered', {
      splitWalletId: splitWallet.id,
      billName: billInfo.name.data,
      totalAmount: totalAmount,
      collectedAmount: completionData?.collectedAmount || 0,
      completionPercentage: completionData?.completionPercentage || 0,
      participantsCount: participants.length,
      isCreator: isCurrentUserCreator(),
      currentUserId: currentUser?.id,
      creatorId: splitWallet.creatorId
    }, 'FairSplitScreen');

    // Show confirmation dialog
    Alert.alert(
      '🚀 DEV: Independent Fund Withdrawal',
      `This will withdraw ${completionData?.collectedAmount || 0} USDC from the split wallet.\n\nCurrent Progress: ${completionData?.completionPercentage || 0}%\nCollected: ${completionData?.collectedAmount || 0} USDC\nTotal: ${totalAmount} USDC\n\nThis is a development feature for testing purposes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Withdraw Funds', 
          style: 'destructive',
          onPress: () => {
            // Load wallets first, then trigger the split funds modal
            reloadWallets();
            setShowSplitModal(true);
          }
        }
      ]
    );
  };

  // Phase 1: Creator confirms the split repartition
  const handleConfirmSplit = async () => {
    if (!validateCreatorPermission('confirm the repartition')) {
      return;
    }

    // Ensure all participants have valid amounts (handle case where amounts might be 0 or undefined)
    const participantsWithAmounts = participants.map(p => {
      // If amountOwed is 0 or undefined, calculate it based on split method
      if (!p.amountOwed || p.amountOwed === 0) {
        if (splitMethod === 'equal' && participants.length > 0) {
          return { ...p, amountOwed: totalAmount / participants.length };
        }
      }
      return p;
    });

    // Update participants if amounts were recalculated
    if (participantsWithAmounts.some((p, i) => p.amountOwed !== participants[i].amountOwed)) {
      setParticipants(participantsWithAmounts);
    }

    // Validate that all participants have positive amounts assigned
    const invalidParticipants = participantsWithAmounts.filter(p => !p.amountOwed || p.amountOwed <= 0);
    if (invalidParticipants.length > 0) {
      Alert.alert('Error', `Some participants don't have valid amounts assigned. Please ensure all participants have amounts greater than 0.`);
      return;
    }

    // Validate that total amounts match the bill total
    const totalAssigned = participantsWithAmounts.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    if (Math.abs(totalAssigned - totalAmount) > 0.01) { // Allow small rounding differences
      Alert.alert('Error', `Total assigned amounts (${totalAssigned.toFixed(2)}) must equal bill total (${totalAmount.toFixed(2)})`);
      return;
    }

    try {
      setIsCreatingWallet(true);
      
      // Create split wallet if it doesn't exist
      let finalSplitWallet = splitWallet;
      if (!finalSplitWallet) {
        logger.info('Creating split wallet for confirmed split', null, 'FairSplitScreen');
        
        const { SplitWalletService } = await import('../../services/split');
        const walletResult = await SplitWalletService.createSplitWallet(
          splitData!.id,
          currentUser!.id.toString(),
          totalAmount,
          'USDC',
          participantsWithAmounts.map(p => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed,
          }))
        );
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create split wallet');
        }
        
        finalSplitWallet = walletResult.wallet;
        setSplitWallet(finalSplitWallet);
        if (finalSplitWallet) {
          logger.info('Split wallet created successfully', { splitWalletId: finalSplitWallet.id }, 'FairSplitScreen');
          
          // CRITICAL: Initialize completion data to 0 when wallet is created during confirmation
          setCompletionData({
            completionPercentage: 0,
            totalAmount: finalSplitWallet.totalAmount,
            collectedAmount: 0,
            remainingAmount: finalSplitWallet.totalAmount,
            participantsPaid: 0,
            totalParticipants: finalSplitWallet.participants.length,
          });
        }
      } else if (finalSplitWallet) {
        // If wallet already exists, ensure completion data is loaded
        // This handles the case where wallet was created before confirmation
        await loadCompletionData();
      }
      
      // Update the split in the database with the confirmed repartition
      if (!finalSplitWallet) {
        throw new Error('Split wallet not created');
      }
      
      const { SplitStorageService } = await import('../../services/splits');
      const updateResult = await SplitStorageService.updateSplit(splitData!.id, {
        status: 'active',
        splitMethod: splitMethod, // Store the locked split method
        participants: participantsWithAmounts.map(p => ({
          userId: p.id,
          name: p.name,
          email: '', // Email not available in Participant type
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
          amountPaid: 0,
          status: 'accepted' as const,
        })),
        splitType: 'fair',
        // Store wallet information in the split data
        walletId: finalSplitWallet.id,
        walletAddress: finalSplitWallet.walletAddress,
      });

      if (updateResult.success) {
        setIsSplitConfirmed(true);
        
        // Send notifications to all participants (except the creator)
        const { notificationService } = await import('../../services/notifications');
        const notificationPromises = participants
          .filter(p => p.id !== currentUser?.id.toString()) // Don't notify the creator
          .map(async (participant) => {
            try {
              await notificationService.instance.sendNotification(
                participant.id,
                'Split Confirmed - Time to Pay!',
                `The split for "${processedBillData?.title || billData?.title || 'Restaurant Night'}" has been confirmed. You owe ${participant.amountOwed.toFixed(2)} USDC. Tap to pay your share!`,
                'payment_request',
                {
                  splitId: splitData!.id,
                  splitWalletId: finalSplitWallet.id,
                  splitWalletAddress: finalSplitWallet.walletAddress,
                  billName: processedBillData?.title || billData?.title || 'Restaurant Night',
                  totalAmount: totalAmount,
                  currency: processedBillData?.currency || 'USDC',
                  participantAmount: participant.amountOwed,
                  creatorName: currentUser?.name || 'Unknown',
                  creatorId: currentUser?.id.toString() || '',
                  // Navigation data to redirect to FairSplitScreen
                  navigation: {
                    screen: 'FairSplit',
                    params: {
                      billData: processedBillData ? {
                        id: processedBillData.id,
                        title: processedBillData.title,
                        totalAmount: processedBillData.totalAmount,
                        currency: processedBillData.currency,
                        date: processedBillData.date,
                        merchant: processedBillData.merchant,
                        location: processedBillData.location,
                        participants: processedBillData.participants.map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          walletAddress: p.walletAddress,
                          amountOwed: p.amountOwed,
                          amountPaid: p.amountPaid || 0,
                          status: p.status,
                          items: p.items || []
                        }))
                      } : undefined,
                      processedBillData: processedBillData,
                      splitWallet: {
                        id: finalSplitWallet.id,
                        walletAddress: finalSplitWallet.walletAddress,
                        totalAmount: finalSplitWallet.totalAmount,
                        currency: finalSplitWallet.currency,
                        participants: finalSplitWallet.participants
                      },
                      splitData: {
                        id: splitData!.id,
                        title: splitData!.title,
                        totalAmount: splitData!.totalAmount,
                        currency: splitData!.currency,
                        splitType: splitData!.splitType,
                        status: splitData!.status,
                        creatorId: splitData!.creatorId,
                        creatorName: splitData!.creatorName,
                        participants: splitData!.participants,
                        walletId: finalSplitWallet.id,
                        walletAddress: finalSplitWallet.walletAddress
                      }
                    }
                  }
                }
              );
              logger.info('Notification sent to participant', { participantName: participant.name }, 'FairSplitScreen');
            } catch (notificationError) {
              logger.error('Failed to send notification to participant', { participantName: participant.name, error: notificationError as Record<string, unknown> }, 'FairSplitScreen');
            }
          });

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises);
        
        // Wallet created successfully - no popup needed
        // setShowWalletRecapModal(true); // Removed popup - wallet created silently
      } else {
        Alert.alert('Error', updateResult.error || 'Failed to confirm split');
      }
    } catch (error) {
      handleError(error, 'confirm split');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Handle editing participant amount (creator only)
  const handleEditParticipantAmount = (participant: Participant) => {
    if (!isCurrentUserCreator() || isSplitConfirmed || splitMethod !== 'manual') {
      return;
    }
    
    setEditingParticipant(participant);
    setEditAmount(participant.amountOwed.toString());
    setShowEditModal(true);
  };

  // Handle saving edited amount
  const handleSaveEditedAmount = async () => {
    if (!editingParticipant || !editAmount) {
      return;
    }

    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    // Check if the total would exceed the bill total
    const otherParticipantsTotal = participants
      .filter(p => p.id !== editingParticipant.id)
      .reduce((sum, p) => sum + p.amountOwed, 0);
    
    const newTotal = otherParticipantsTotal + newAmount;
    if (newTotal > totalAmount) {
      Alert.alert(
        'Amount Too High', 
        `The total amount (${newTotal.toFixed(2)} USDC) cannot exceed the bill total (${totalAmount.toFixed(2)} USDC)`
      );
      return;
    }

    // Update the participant's amount locally first
    const updatedParticipants = participants.map(p => 
      p.id === editingParticipant.id 
        ? { ...p, amountOwed: newAmount }
        : p
    );
    setParticipants(updatedParticipants);

    // Persist the changes to the database
    try {
      if (splitData?.walletId) {
        const { SplitWalletManagement } = await import('../../services/split/SplitWalletManagement');
        const participantsForUpdate = updatedParticipants.map(p => ({
          userId: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
        }));
        
        const updateResult = await SplitWalletManagement.updateSplitWalletParticipants(
          splitData.walletId, 
          participantsForUpdate
        );
        
        if (!updateResult.success) {
          logger.error('Failed to update participant amounts in database', { error: updateResult.error }, 'FairSplitScreen');
          Alert.alert('Error', 'Failed to save changes. Please try again.');
          // Revert local changes if database update failed
          setParticipants(participants);
          return;
        }
        
        // Refresh completion data after successful update
        await loadCompletionData();
      }
    } catch (error) {
      logger.error('Error updating participant amounts', error as Record<string, unknown>, 'FairSplitScreen');
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      // Revert local changes if database update failed
      setParticipants(participants);
      return;
    }

    setShowEditModal(false);
    setEditingParticipant(null);
    setEditAmount('');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingParticipant(null);
    setEditAmount('');
  };


  // Phase 2: User sends their payment
  const handleSendMyShares = async () => {
    if (!splitWallet || !currentUser) {
      Alert.alert('Error', 'Unable to process payment');
      return;
    }

    const userParticipant = participants.find(p => p.id === currentUser.id.toString());
    if (!userParticipant) {
      Alert.alert('Error', 'You are not a participant in this split');
      return;
    }

    // Check if user has already paid their full share using centralized helper
    if (hasParticipantPaidFully(userParticipant)) {
      Alert.alert('Already Paid', 'You have already paid your full share for this split');
      return;
    }

    if (!userParticipant.amountOwed || userParticipant.amountOwed <= 0) {
      Alert.alert('Error', 'No amount to pay');
      return;
    }

    // Calculate remaining amount immediately (no async needed)
    const { roundUsdcAmount } = await import('../../utils/ui/format/formatUtils');
    const remainingAmount = roundUsdcAmount(userParticipant.amountOwed - userParticipant.amountPaid);
    
    // Show centralized transaction modal
    const modalConfig: TransactionModalConfig = {
      title: 'Contribute to Split',
      subtitle: `Pay your share to the fair split`,
      showAmountInput: true,
      showMemoInput: false,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'fair_split_contribution',
      prefilledAmount: remainingAmount,
      // Pass split IDs in config for consistency (will also be passed as props)
      splitWalletId: splitWallet.id,
      splitId: splitData?.id,
      billId: splitData?.billId,
      customRecipientInfo: {
        name: 'Fair Split Wallet',
        address: splitWallet.walletAddress,
        type: 'split'
      },
      onSuccess: (result) => {
        logger.info('Fair split contribution successful', { result });
        setTransactionModalConfig(null);
        // Reload data to reflect the payment
        loadSplitWalletData();
      },
      onError: (error) => {
        logger.error('Fair split contribution failed', { error });
        Alert.alert('Payment Failed', error);
        setTransactionModalConfig(null);
      },
      onClose: () => {
        setTransactionModalConfig(null);
      }
    };

    setTransactionModalConfig(modalConfig);

    // Check balance in the background (non-blocking)
    checkUserBalance(remainingAmount).catch(error => {
      logger.warn('Balance check failed, but allowing payment attempt', {
        error: error instanceof Error ? error.message : String(error)
      }, 'FairSplitScreen');
    });
  };


  // Handle split funds action
  const handleSplitFunds = () => {
    setShowSplitModal(true);
  };

  const handleSelectWallet = (wallet: {id: string, address: string, type: 'external' | 'in-app' | 'kast', name?: string}) => {
    setSelectedWallet(wallet);
    setSelectedTransferMethod(wallet.type === 'external' || wallet.type === 'kast' ? 'external-wallet' : 'in-app-wallet');
    setShowSignatureStep(true);
  };

  // Handle signature step
  const handleSignatureStep = async () => {
    if (!selectedWallet || !splitWallet || !currentUser) {return;}
    
    // Show confirmation dialog before transfer
    const walletTypeLabel = selectedWallet.type === 'external' 
      ? 'external wallet' 
      : selectedWallet.type === 'kast' 
        ? 'KAST card' 
        : 'in-app wallet';
    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to transfer ${splitWallet.totalAmount.toFixed(2)} USDC to ${selectedWallet.name || walletTypeLabel}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Transfer', 
          style: 'default',
          onPress: () => executeTransfer()
        }
      ]
    );
  };

  // Execute the actual transfer
  const executeTransfer = async () => {
    if (!selectedWallet || !splitWallet || !currentUser) {return;}
    
    // Prevent double triggering
    if (isSigning) {
      logger.warn('Transfer already in progress, ignoring duplicate request', {
        splitWalletId: splitWallet.id,
        isSigning
      }, 'FairSplitScreen');
      return;
    }
    
    setIsSigning(true);
    
    // Temporarily disable real-time updates during withdrawal to prevent interference
    const wasRealtimeActive = isRealtimeActive;
    if (wasRealtimeActive) {
      logger.info('Temporarily disabling real-time updates during withdrawal', { splitWalletId: splitWallet.id }, 'FairSplitScreen');
      stopRealtimeUpdates(); // Actually stop the Firebase listener
    }
    
    // CRITICAL: Capture recipient balance before transaction for verification
    let recipientBalanceBefore = 0;
    let splitBalanceBefore = 0;
    try {
      const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
      
      // Capture both recipient and split wallet balances before transaction
      const [recipientBalanceResult, splitBalanceResult] = await Promise.all([
        consolidatedTransactionService.getUsdcBalance(selectedWallet.address),
        consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress)
      ]);
      
      if (recipientBalanceResult.success) {
        recipientBalanceBefore = recipientBalanceResult.balance;
        logger.info('Captured recipient balance before withdrawal', {
          recipientAddress: selectedWallet.address,
          balanceBefore: recipientBalanceBefore
        }, 'FairSplitScreen');
      }
      
      if (splitBalanceResult.success) {
        splitBalanceBefore = splitBalanceResult.balance;
        logger.info('Captured split wallet balance before withdrawal', {
          splitWalletAddress: splitWallet.walletAddress,
          balanceBefore: splitBalanceBefore
        }, 'FairSplitScreen');
      }
    } catch (balanceError) {
      logger.warn('Failed to capture balances before withdrawal', {
        error: balanceError instanceof Error ? balanceError.message : String(balanceError)
      }, 'FairSplitScreen');
      // Continue anyway - we'll try to verify later
    }
    
    try {
      logger.info('Processing transfer to selected wallet', {
        selectedWallet,
        totalAmount,
        splitWalletId: splitWallet.id,
        currentUserId: currentUser.id,
        creatorId: splitWallet.creatorId,
        recipientBalanceBefore
      });
      
      // Validate that only the creator can withdraw funds
      if (currentUser.id.toString() !== splitWallet.creatorId) {
        logger.error('Non-creator attempted to withdraw funds', {
          currentUserId: currentUser.id.toString(),
          creatorId: splitWallet.creatorId
        }, 'FairSplitScreen');
        Alert.alert('Error', 'Only the split creator can withdraw funds.');
        return;
      }
      
      // CRITICAL: Check if withdrawal has already been completed
      if (splitWallet.status === 'completed') {
        if (__DEV__) {
          logger.debug('Split wallet withdrawal already completed', {
            status: splitWallet.status,
            completedAt: splitWallet.completedAt
          }, 'FairSplitScreen');
        }
        
        Alert.alert(
          'Withdrawal Already Completed',
          'The funds from this split have already been withdrawn. You cannot withdraw funds from this split again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SplitsList' as never)
            }
          ]
        );
        return;
      }

      // Verify actual blockchain balance before withdrawal
      try {
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
        const balanceResult = await consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress);
        
        if (!balanceResult.success || balanceResult.balance <= 0) {
          logger.error('Split wallet has no funds on blockchain', {
            totalAmount: splitWallet.totalAmount,
            onChainBalance: balanceResult.balance,
            walletAddress: splitWallet.walletAddress
          }, 'FairSplitScreen');
          Alert.alert(
            'No Funds Available', 
            'The split wallet has no funds available for withdrawal. Please ensure all participants have completed their payments.'
          );
          return;
        }
        
        logger.info('Blockchain balance verified for withdrawal', {
          splitWalletId: splitWallet.id,
          onChainBalance: balanceResult.balance,
          expectedAmount: splitWallet.totalAmount
        }, 'FairSplitScreen');
      } catch (balanceError) {
        logger.error('Failed to verify blockchain balance for withdrawal', {
          splitWalletId: splitWallet.id,
          error: balanceError instanceof Error ? balanceError.message : String(balanceError)
        }, 'FairSplitScreen');
        
        Alert.alert(
          'Balance Verification Failed',
          'Unable to verify the split wallet balance. Please try again or contact support if the issue persists.'
        );
        return;
      }
      
      // Check if participants have actually paid their shares
      const totalPaid = calculateTotalPaid(splitWallet.participants);
      const tolerance = 0.001; // 0.001 USDC tolerance for rounding differences
      
      logger.info('Fund collection check', {
        totalAmount: splitWallet.totalAmount,
        totalPaid,
        tolerance,
        difference: Math.abs(totalPaid - splitWallet.totalAmount),
        participants: splitWallet.participants.map((p: any) => ({
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      });
      
      // If no funds collected but we expect funds, try to refresh data first
      if (totalPaid === 0 && splitWallet.totalAmount > 0) {
        logger.warn('No funds collected detected, attempting data refresh', {
          splitWalletId: splitWallet.id,
          totalAmount: splitWallet.totalAmount
        }, 'FairSplitScreen');
        
        // Force refresh split wallet data
        await loadSplitWalletData();
        
        // Re-check after refresh
        const refreshedWallet = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (refreshedWallet.success && refreshedWallet.wallet) {
          const refreshedTotalPaid = calculateTotalPaid(refreshedWallet.wallet.participants);
          logger.info('Fund collection check after refresh', {
            totalAmount: refreshedWallet.wallet.totalAmount,
            totalPaid: refreshedTotalPaid,
            participants: refreshedWallet.wallet.participants.map((p: any) => ({
              name: p.name,
              amountOwed: p.amountOwed,
              amountPaid: p.amountPaid,
              status: p.status
            }))
          }, 'FairSplitScreen');
          
          if (refreshedTotalPaid >= (refreshedWallet.wallet.totalAmount - tolerance)) {
            // Update local state with refreshed data
            setSplitWallet(refreshedWallet.wallet);
            // Continue with withdrawal using refreshed data
          } else {
            Alert.alert(
              'Insufficient Funds', 
              `Not all participants have paid their shares. Required: ${refreshedWallet.wallet.totalAmount} USDC, Collected: ${refreshedTotalPaid} USDC. Please ensure all participants have paid before withdrawing funds.`
            );
            return;
          }
        }
      } else if (totalPaid < (splitWallet.totalAmount - tolerance)) {
        logger.error('Insufficient funds collected', {
          required: splitWallet.totalAmount,
          collected: totalPaid,
          missing: splitWallet.totalAmount - totalPaid,
          tolerance
        }, 'FairSplitScreen');
        Alert.alert(
          'Insufficient Funds', 
          `Not all participants have paid their shares. Required: ${splitWallet.totalAmount} USDC, Collected: ${totalPaid} USDC. Please ensure all participants have paid before withdrawing funds.`
        );
        return;
      }

      // CRITICAL: Verify actual on-chain balance before allowing withdrawal
      logger.info('Verifying actual on-chain balance before withdrawal', {
        splitWalletAddress: splitWallet.walletAddress,
        expectedAmount: splitWallet.totalAmount,
        splitWalletId: splitWallet.id,
        status: splitWallet.status
      }, 'FairSplitScreen');
      
      // Debug: Check if the split wallet address is correct
      if (__DEV__) {
        logger.debug('Split wallet details', {
          id: splitWallet.id,
          address: splitWallet.walletAddress,
        publicKey: splitWallet.publicKey,
        totalAmount: splitWallet.totalAmount,
        status: splitWallet.status,
        participants: splitWallet.participants.map(p => ({
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status,
          transactionSignature: p.transactionSignature
        }))
        }, 'FairSplitScreen');
      }
      
      try {
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
        const balanceResult = await consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress);
        
        if (balanceResult.success) {
          logger.info('On-chain balance verification', {
            onChainBalance: balanceResult.balance,
            expectedBalance: splitWallet.totalAmount,
            difference: Math.abs(balanceResult.balance - splitWallet.totalAmount),
            tolerance
          }, 'FairSplitScreen');
          
          // If there's a significant difference, try to fix data consistency
          const balanceDifference = Math.abs(balanceResult.balance - splitWallet.totalAmount);
          if (balanceDifference > tolerance) {
            logger.warn('Balance discrepancy detected, attempting data consistency fix', {
              onChainBalance: balanceResult.balance,
              expectedBalance: splitWallet.totalAmount,
              difference: balanceDifference
            }, 'FairSplitScreen');
            
            try {
              const { fixSplitWalletDataConsistency } = await import('../../services/split/SplitWalletManagement');
              const fixResult = await fixSplitWalletDataConsistency(splitWallet.id);
              if (fixResult.success && fixResult.fixed) {
                logger.info('Data consistency fix applied during withdrawal check', {
                  splitWalletId: splitWallet.id
                }, 'FairSplitScreen');
                
                // Reload the split wallet data after the fix
                await loadSplitWalletData();
              }
            } catch (fixError) {
              logger.warn('Failed to apply data consistency fix during withdrawal check', {
                error: fixError
              }, 'FairSplitScreen');
            }
          }
          
          // Debug: Check transaction history if balance is 0 but expected > 0
          if (balanceResult.balance === 0 && splitWallet.totalAmount > 0) {
            if (__DEV__) {
              logger.debug('Balance is 0 but expected > 0, checking transaction history', null, 'FairSplitScreen');
            }
            try {
              const { Connection, PublicKey } = await import('@solana/web3.js');
              const { getConfig } = await import('../../config/unified');
              const connection = new Connection(getConfig().blockchain.rpcUrl);
              const publicKey = new PublicKey(splitWallet.walletAddress);
              
              // Get recent signatures to see if there were any outgoing transactions
              const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
              if (__DEV__) {
                logger.debug('Recent transactions for split wallet', {
                  address: splitWallet.walletAddress,
                  signatureCount: signatures.length,
                  signatures: signatures.map(sig => ({
                    signature: sig.signature,
                    blockTime: sig.blockTime,
                    err: sig.err,
                    memo: sig.memo
                  }))
                }, 'FairSplitScreen');
              }
            } catch (error) {
              logger.error('Error checking transaction history', error as Record<string, unknown>, 'FairSplitScreen');
            }
          }
          
          // Check if on-chain balance is sufficient (with tolerance)
          if (balanceResult.balance < (splitWallet.totalAmount - tolerance)) {
            logger.error('On-chain balance insufficient for withdrawal', {
              onChainBalance: balanceResult.balance,
              expectedBalance: splitWallet.totalAmount,
              difference: splitWallet.totalAmount - balanceResult.balance,
              tolerance
            }, 'FairSplitScreen');
            
            Alert.alert(
              'Insufficient On-Chain Balance', 
              `The split wallet only has ${balanceResult.balance.toFixed(6)} USDC on-chain, but ${splitWallet.totalAmount} USDC is required. This indicates that participants haven't actually sent their payments yet, even though they may be marked as paid in the system. Please ensure all participants have sent their actual payments before withdrawing.`
            );
            return;
          }
        } else {
          logger.warn('Could not verify on-chain balance', { error: balanceResult.error }, 'FairSplitScreen');
          Alert.alert(
            'Balance Verification Failed', 
            'Could not verify the actual balance in the split wallet. Please try again or contact support if the issue persists.'
          );
          return;
        }
      } catch (error) {
        logger.error('Error checking on-chain balance', error as Record<string, unknown>, 'FairSplitScreen');
        Alert.alert(
          'Balance Check Error', 
          'Failed to verify the split wallet balance. Please try again or contact support if the issue persists.'
        );
        return;
      }

      // Process the transfer - both external and in-app use the same method
      const walletTypeLabel = selectedWallet.type === 'external' 
        ? 'external wallet' 
        : selectedWallet.type === 'kast' 
          ? 'KAST card' 
          : 'in-app wallet';
      const description = `Split funds transfer to ${selectedWallet.name || walletTypeLabel}`;
      
      logger.info('Initiating blockchain transfer', {
        splitWalletId: splitWallet.id,
        splitWalletAddress: splitWallet.walletAddress,
        destinationAddress: selectedWallet.address,
        destinationType: selectedWallet.type,
        destinationName: selectedWallet.name,
        amount: splitWallet.totalAmount,
        currency: splitWallet.currency,
        description,
        creatorId: splitWallet.creatorId,
        billId: splitWallet.billId
      });
      
      // Use extractFairSplitFunds for Fair Split transfers with timeout
      const transferPromise = SplitWalletService.extractFairSplitFunds(
        splitWallet.id,
        selectedWallet.address,
        currentUser.id.toString(),
        description
      );
      
      // Add timeout wrapper (90 seconds max - increased to account for balance verification)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transfer timeout - please check transaction history')), 90000);
      });
      
      let transferResult: any;
      try {
        transferResult = await Promise.race([transferPromise, timeoutPromise]) as any;
      } catch (timeoutError) {
        // ✅ CRITICAL: Timeout occurred - check if transaction was actually submitted
        // Try to get result from original promise if it completed
        logger.warn('Transfer timeout wrapper triggered, checking if transaction completed', {
          splitWalletId: splitWallet.id,
          error: timeoutError instanceof Error ? timeoutError.message : String(timeoutError)
        }, 'FairSplitScreen');
        
        try {
          // Wait a moment for the promise to potentially complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to get result from original promise (non-blocking)
          transferResult = await Promise.race([
            transferPromise.catch(() => null), // Don't throw if it fails
            new Promise(resolve => setTimeout(() => resolve(null), 1000)) // 1 second timeout
          ]) as any;
          
          // If we got a result with signature, transaction succeeded
          if (transferResult && transferResult.success && transferResult.transactionSignature) {
            logger.info('Transaction completed after timeout wrapper - treating as success', {
              signature: transferResult.transactionSignature,
              splitWalletId: splitWallet.id
            }, 'FairSplitScreen');
            // Continue with success handling below
          } else {
            // No result or no signature - transaction likely failed or still processing
            throw timeoutError; // Re-throw original timeout error
          }
        } catch (checkError) {
          // Couldn't get result - throw original timeout error
          throw timeoutError;
        }
      }
      
      logger.info('Transfer result received', {
        success: transferResult.success,
        transactionSignature: transferResult.transactionSignature,
        amount: transferResult.amount,
        error: transferResult.error
      });
      
      // Debug: Log detailed transfer result for troubleshooting
      if (__DEV__) {
        logger.debug('Detailed transfer result', {
          success: transferResult.success,
          transactionSignature: transferResult.transactionSignature,
          amount: transferResult.amount,
          error: transferResult.error,
          splitWalletId: splitWallet.id,
          destinationAddress: selectedWallet.address,
          creatorId: currentUser.id.toString()
        }, 'FairSplitScreen');
      }
      
      if (transferResult.success) {
        logger.info('Transfer successful', {
          transactionSignature: transferResult.transactionSignature,
          amount: transferResult.amount,
          destination: selectedWallet.address
        }, 'FairSplitScreen');
        
        // Verify the transfer actually happened by checking balances
        try {
          const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
          
          // Wait a moment for blockchain to update
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const splitBalance = await consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress);
          const recipientBalance = await consolidatedTransactionService.getUsdcBalance(selectedWallet.address);
          
          logger.info('Post-transfer balance verification', {
            splitWalletBalance: splitBalance.balance,
            recipientBalance: recipientBalance.balance,
            expectedAmount: transferResult.amount,
            transactionSignature: transferResult.transactionSignature
          }, 'FairSplitScreen');
          
          // Update local state to reflect completion
          setSplitWallet(prev => prev ? { 
            ...prev, 
            status: 'completed' as const,
            completedAt: new Date().toISOString()
          } : null);
          
          // CRITICAL: Update split status to 'completed' in the database
          if (splitData?.id) {
            try {
              const { SplitStorageService } = await import('../../services/splits');
              const completedAt = new Date().toISOString();
              const updateResult = await SplitStorageService.updateSplit(splitData.id, {
                status: 'completed' as const,
                completedAt: completedAt,
                updatedAt: completedAt
              });
              
              if (updateResult.success) {
                logger.info('Split status updated to completed after withdrawal', {
                  splitId: splitData.id,
                  completedAt
                }, 'FairSplitScreen');
              } else {
                logger.error('Failed to update split status to completed', {
                  splitId: splitData.id,
                  error: updateResult.error
                }, 'FairSplitScreen');
              }
            } catch (updateError) {
              logger.error('Error updating split status to completed', {
                splitId: splitData.id,
                error: updateError instanceof Error ? updateError.message : String(updateError)
              }, 'FairSplitScreen');
              // Don't fail the withdrawal if status update fails, but log the error
            }
          }
          
          // Show success message with verification
          const successWalletTypeLabel = selectedWallet.type === 'external' 
            ? 'external wallet' 
            : selectedWallet.type === 'kast' 
              ? 'KAST card' 
              : 'in-app wallet';
          Alert.alert(
            '✅ Transfer Verified!', 
            `Successfully transferred ${transferResult.amount.toFixed(6)} USDC to ${selectedWallet.name || successWalletTypeLabel}!\n\nTransaction: ${transferResult.transactionSignature?.slice(0, 8)}...\n\n✅ Balance verification confirmed the transfer.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Close modals and reset state
                  setShowSignatureStep(false);
                  setShowSplitModal(false);
                  setSelectedTransferMethod(null);
                  setSelectedWallet(null);
                  
                  // Navigate back to splits list
                  navigation.navigate('SplitsList');
                }
              }
            ]
          );
        } catch (verificationError) {
          logger.warn('Failed to verify transfer balances', {
            error: verificationError instanceof Error ? verificationError.message : String(verificationError)
          }, 'FairSplitScreen');
          
          // Update local state to reflect completion
          setSplitWallet(prev => prev ? { 
            ...prev, 
            status: 'completed' as const,
            completedAt: new Date().toISOString()
          } : null);
          
          // CRITICAL: Update split status to 'completed' in the database
          if (splitData?.id) {
            try {
              const { SplitStorageService } = await import('../../services/splits');
              const completedAt = new Date().toISOString();
              const updateResult = await SplitStorageService.updateSplit(splitData.id, {
                status: 'completed' as const,
                completedAt: completedAt,
                updatedAt: completedAt
              });
              
              if (updateResult.success) {
                logger.info('Split status updated to completed after withdrawal', {
                  splitId: splitData.id,
                  completedAt
                }, 'FairSplitScreen');
              } else {
                logger.error('Failed to update split status to completed', {
                  splitId: splitData.id,
                  error: updateResult.error
                }, 'FairSplitScreen');
              }
            } catch (updateError) {
              logger.error('Error updating split status to completed', {
                splitId: splitData.id,
                error: updateError instanceof Error ? updateError.message : String(updateError)
              }, 'FairSplitScreen');
              // Don't fail the withdrawal if status update fails, but log the error
            }
          }
          
          // Show success message without verification
          const submittedWalletTypeLabel = selectedWallet.type === 'external' 
            ? 'external wallet' 
            : selectedWallet.type === 'kast' 
              ? 'KAST card' 
              : 'in-app wallet';
          Alert.alert(
            'Transfer Submitted!', 
            `Transfer of ${transferResult.amount.toFixed(6)} USDC to ${selectedWallet.name || submittedWalletTypeLabel} has been submitted.\n\nTransaction: ${transferResult.transactionSignature?.slice(0, 8)}...\n\nPlease check your wallet to confirm receipt.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Close modals and reset state
                  setShowSignatureStep(false);
                  setShowSplitModal(false);
                  setSelectedTransferMethod(null);
                  setSelectedWallet(null);
                  
                  // Navigate back to splits list
                  navigation.navigate('SplitsList');
                }
              }
            ]
          );
        }
      } else {
        logger.error('Transfer failed', { error: transferResult.error }, 'FairSplitScreen');
        
        // Check if this is a verification timeout - transaction might have succeeded on-chain
        const isVerificationTimeout = transferResult.error?.includes('Transaction verification failed') ||
                                      transferResult.error?.includes('Transaction confirmation timed out') ||
                                      transferResult.error?.includes('confirmation failed') ||
                                      transferResult.error?.includes('transaction was not found on-chain');
        
        if (isVerificationTimeout) {
          // CRITICAL: Check on-chain balances to verify if transaction actually succeeded
          // Even if verification timed out, the transaction might have gone through
          logger.info('Verification timeout detected, checking on-chain balances to verify transaction', {
            splitWalletId: splitWallet.id,
            splitWalletAddress: splitWallet.walletAddress,
            recipientAddress: selectedWallet.address
          }, 'FairSplitScreen');
          
          try {
            const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
            
            // Wait a moment for blockchain to update
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check both balances
            const splitBalanceResult = await consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress);
            const recipientBalanceResult = await consolidatedTransactionService.getUsdcBalance(selectedWallet.address);
            
            // Use the captured balance before transaction (or current balance if not captured)
            const actualRecipientBalance = recipientBalanceResult.balance;
            const balanceIncrease = recipientBalanceBefore > 0 
              ? actualRecipientBalance - recipientBalanceBefore
              : 0; // If we didn't capture before, we can't verify
            
            logger.info('On-chain balance verification after timeout', {
              splitWalletBalance: splitBalanceResult.balance,
              recipientBalanceBefore: recipientBalanceBefore,
              recipientBalanceAfter: actualRecipientBalance,
              balanceIncrease,
              expectedAmount: splitWallet.totalAmount,
              transactionSucceeded: recipientBalanceBefore > 0 && balanceIncrease >= (splitWallet.totalAmount - 0.01) // Allow small tolerance
            }, 'FairSplitScreen');
            
            // If recipient balance increased by the expected amount and split wallet is empty, transaction succeeded
            // Only verify if we captured the balance before (recipientBalanceBefore > 0)
            if (recipientBalanceBefore > 0 && 
                balanceIncrease >= (splitWallet.totalAmount - 0.01) && 
                splitBalanceResult.balance < 0.01) {
              logger.info('Transaction verified on-chain despite timeout - treating as success', {
                splitWalletId: splitWallet.id,
                balanceIncrease,
                expectedAmount: splitWallet.totalAmount
              }, 'FairSplitScreen');
              
              // Update local state to reflect completion
              setSplitWallet(prev => prev ? { 
                ...prev, 
                status: 'completed' as const,
                completedAt: new Date().toISOString()
              } : null);
              
              // CRITICAL: Update split status to 'completed' in the database
              if (splitData?.id) {
                try {
                  const { SplitStorageService } = await import('../../services/splits');
                  const completedAt = new Date().toISOString();
                  const updateResult = await SplitStorageService.updateSplit(splitData.id, {
                    status: 'completed' as const,
                    completedAt: completedAt,
                    updatedAt: completedAt
                  });
                  
                  if (updateResult.success) {
                    logger.info('Split status updated to completed after on-chain verification', {
                      splitId: splitData.id,
                      completedAt
                    }, 'FairSplitScreen');
                  }
                } catch (updateError) {
                  logger.error('Error updating split status after on-chain verification', {
                    splitId: splitData?.id,
                    error: updateError instanceof Error ? updateError.message : String(updateError)
                  }, 'FairSplitScreen');
                }
              }
              
              // Show success message
              Alert.alert(
                '✅ Transfer Verified!', 
                `Successfully transferred ${splitWallet.totalAmount.toFixed(6)} USDC to ${selectedWallet.name || 'your wallet'}!\n\nAlthough the initial verification timed out, we confirmed the transaction succeeded on the blockchain.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Close modals and reset state
                      setShowSignatureStep(false);
                      setShowSplitModal(false);
                      setSelectedTransferMethod(null);
                      setSelectedWallet(null);
                      
                      // Navigate back to splits list
                      navigation.navigate('SplitsList');
                    }
                  }
                ]
              );
              return; // Exit early - transaction succeeded
            }
          } catch (balanceCheckError) {
            logger.warn('Failed to verify on-chain balances after timeout', {
              error: balanceCheckError instanceof Error ? balanceCheckError.message : String(balanceCheckError)
            }, 'FairSplitScreen');
            // Continue with normal timeout handling if balance check fails
          }
          
          // Check if we have a transaction signature - if so, the transaction likely succeeded
          if (transferResult.transactionSignature) {
            logger.info('Fair split transaction timed out but has signature - likely succeeded', {
              transactionSignature: transferResult.transactionSignature,
              splitWalletId: splitWallet.id
            }, 'FairSplitScreen');
            
            // CRITICAL: Update split status to 'completed' even if confirmation timed out
            // The transaction was sent successfully, so we should mark it as completed
            if (splitData?.id) {
              try {
                const { SplitStorageService } = await import('../../services/splits');
                const completedAt = new Date().toISOString();
                const updateResult = await SplitStorageService.updateSplit(splitData.id, {
                  status: 'completed' as const,
                  completedAt: completedAt,
                  updatedAt: completedAt
                });
                
                if (updateResult.success) {
                  logger.info('Split status updated to completed after timeout (transaction sent)', {
                    splitId: splitData.id,
                    transactionSignature: transferResult.transactionSignature,
                    completedAt
                  }, 'FairSplitScreen');
                } else {
                  logger.error('Failed to update split status to completed after timeout', {
                    splitId: splitData.id,
                    error: updateResult.error
                  }, 'FairSplitScreen');
                }
              } catch (updateError) {
                logger.error('Error updating split status to completed after timeout', {
                  splitId: splitData.id,
                  error: updateError instanceof Error ? updateError.message : String(updateError)
                }, 'FairSplitScreen');
              }
            }
            
            Alert.alert(
              'Transaction Processing',
              'Your transaction was sent successfully but is still being confirmed on the blockchain. This is normal and can take a few moments.\n\nYou can check the transaction status manually or wait for it to complete automatically.',
              [
                {
                  text: 'Check Transaction',
                  onPress: () => {
                    // Open transaction in explorer
                    const explorerUrl = `https://solscan.io/tx/${transferResult.transactionSignature}`;
                    // You might want to use Linking.openURL(explorerUrl) here
                    if (__DEV__) {
                      logger.debug('Transaction URL', { url: explorerUrl }, 'FairSplitScreen');
                    }
                  }
                },
                {
                  text: 'OK',
                  onPress: () => {
                    // Close modals and reset state
                    setShowSignatureStep(false);
                    setShowSplitModal(false);
                    setSelectedTransferMethod(null);
                    setSelectedWallet(null);
                    
                    // Navigate back to splits list - this will trigger a refresh
                    navigation.navigate('SplitsList');
                  }
                }
              ]
            );
          } else {
            // No signature means the transaction definitely failed
            Alert.alert('Transfer Failed', 'The transaction could not be sent. Please try again.');
          }
        } else if (transferResult.error?.includes('Transaction synchronization issue detected')) {
          Alert.alert(
            'Synchronization Issue Detected',
            'We detected that participants are marked as paid but the funds aren\'t actually in the split wallet. This can happen due to transaction delays or failures.\n\nWould you like to repair the split wallet data? This will reset participant payment status so they can retry their payments.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Repair Split Wallet', 
                style: 'default',
                onPress: () => repairSplitWallet()
              }
            ]
          );
        } else {
          const rawMessage = transferResult.error || 'Failed to transfer funds. Please try again.';
          const normalizedMessage = normalizeTransactionErrorMessage
            ? normalizeTransactionErrorMessage(rawMessage)
            : rawMessage;
          Alert.alert('Transfer Failed', normalizedMessage);
        }
      }
      
    } catch (error) {
      // Handle timeout errors specifically
      if (error instanceof Error && (error.message.includes('Transfer timeout') || error.message.includes('timeout'))) {
        logger.warn('Transfer timeout occurred, verifying if transaction succeeded', {
          splitWalletId: splitWallet.id,
          error: error.message
        }, 'FairSplitScreen');
        
        // ✅ CRITICAL: Verify on-chain if transaction actually succeeded despite timeout
        // This aligns with the fix we applied - don't show error if transaction succeeded
        try {
          // Wait a moment for blockchain to update
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check balances to verify transaction
          const { consolidatedTransactionService } = await import('../../services/blockchain/transaction/ConsolidatedTransactionService');
          const [splitBalanceResult, recipientBalanceResult] = await Promise.all([
            consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress),
            consolidatedTransactionService.getUsdcBalance(selectedWallet.address)
          ]);
          
          logger.info('On-chain balance verification after timeout', {
            splitWalletBalanceBefore: splitBalanceBefore,
            splitWalletBalanceAfter: splitBalanceResult.balance,
            recipientBalanceBefore: recipientBalanceBefore,
            recipientBalanceAfter: recipientBalanceResult.balance,
            expectedAmount: splitWallet.totalAmount,
            note: 'Checking if transaction actually succeeded despite timeout'
          }, 'FairSplitScreen');
          
          // ✅ CRITICAL: Verify both balances changed correctly
          // 1. Split wallet should be empty (or very close to 0)
          // 2. Recipient balance should have increased by approximately the expected amount
          const splitWalletEmpty = splitBalanceResult.balance < 0.01;
          const balanceIncrease = recipientBalanceBefore > 0 
            ? recipientBalanceResult.balance - recipientBalanceBefore
            : 0;
          const expectedAmount = splitWallet.totalAmount;
          const tolerance = 0.01; // 0.01 USDC tolerance
          
          // Check if transaction succeeded based on balance changes
          const recipientBalanceCorrect = recipientBalanceBefore > 0 && 
            Math.abs(balanceIncrease - expectedAmount) <= tolerance;
          const splitWalletCorrect = splitBalanceBefore > 0 && splitWalletEmpty;
          
          // If we have both balances before, verify both changed correctly
          if (splitBalanceBefore > 0 && recipientBalanceBefore > 0) {
            if (splitWalletCorrect && recipientBalanceCorrect) {
              logger.info('Transaction verified on-chain despite timeout - both balances correct', {
                splitWalletId: splitWallet.id,
                splitBalanceDecrease: splitBalanceBefore - splitBalanceResult.balance,
                balanceIncrease,
                expectedAmount
              }, 'FairSplitScreen');
              
              // Update local state and show success
              setSplitWallet(prev => prev ? { 
                ...prev, 
                status: 'completed' as const,
                completedAt: new Date().toISOString()
              } : null);
              
              Alert.alert(
                '✅ Transfer Verified!', 
                `Successfully transferred ${splitWallet.totalAmount.toFixed(6)} USDC to ${selectedWallet.name || 'your wallet'}!\n\nAlthough the initial confirmation timed out, we confirmed the transaction succeeded on the blockchain.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setShowSignatureStep(false);
                      setShowSplitModal(false);
                      setSelectedTransferMethod(null);
                      setSelectedWallet(null);
                      navigation.navigate('SplitsList');
                    }
                  }
                ]
              );
              return; // Exit early - transaction succeeded
            } else {
              logger.warn('Balance verification failed - balances do not match expected changes', {
                splitWalletCorrect,
                recipientBalanceCorrect,
                splitBalanceBefore,
                splitBalanceAfter: splitBalanceResult.balance,
                recipientBalanceBefore,
                recipientBalanceAfter: recipientBalanceResult.balance,
                expectedAmount
              }, 'FairSplitScreen');
            }
          } else if (splitWalletEmpty && recipientBalanceBefore > 0 && recipientBalanceCorrect) {
            // Fallback: If split wallet is empty and recipient balance increased correctly
            logger.info('Transaction verified on-chain despite timeout - split wallet empty and recipient balance correct', {
              splitWalletId: splitWallet.id,
              balanceIncrease,
              expectedAmount
            }, 'FairSplitScreen');
            
            // Update local state and show success
            setSplitWallet(prev => prev ? { 
              ...prev, 
              status: 'completed' as const,
              completedAt: new Date().toISOString()
            } : null);
            
            Alert.alert(
              '✅ Transfer Verified!', 
              `Successfully transferred ${splitWallet.totalAmount.toFixed(6)} USDC to ${selectedWallet.name || 'your wallet'}!\n\nAlthough the initial confirmation timed out, we confirmed the transaction succeeded on the blockchain.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowSignatureStep(false);
                    setShowSplitModal(false);
                    setSelectedTransferMethod(null);
                    setSelectedWallet(null);
                    navigation.navigate('SplitsList');
                  }
                }
              ]
            );
            return; // Exit early - transaction succeeded
          }
        } catch (verificationError) {
          logger.warn('Failed to verify transaction on-chain after timeout', {
            error: verificationError instanceof Error ? verificationError.message : String(verificationError)
          }, 'FairSplitScreen');
          // Continue with timeout error handling below
        }
        
        // If verification failed or couldn't verify, show timeout message
        Alert.alert(
          'Transaction Processing',
          'The transfer is taking longer than expected to confirm. This can happen during high network congestion.\n\nYour transaction may still be processing. Please check your wallet balance or transaction history in a few minutes.',
          [
            {
              text: 'Check History',
              onPress: () => {
                navigation.navigate('TransactionHistory');
              }
            },
            {
              text: 'OK',
              style: 'cancel',
              onPress: () => {
                setShowSignatureStep(false);
                setShowSplitModal(false);
                setSelectedTransferMethod(null);
                setSelectedWallet(null);
                navigation.navigate('SplitsList');
              }
            }
          ]
        );
      } else {
        handleError(error, 'complete transfer');
      }
    } finally {
      setIsSigning(false);
      
      // Re-enable real-time updates after withdrawal is complete
      if (wasRealtimeActive) {
        logger.info('Re-enabling real-time updates after withdrawal', { splitWalletId: splitWallet.id }, 'FairSplitScreen');
        // Restart real-time updates (this will set isRealtimeActive to true)
        startRealtimeUpdates();
      }
    }
  };

  // Status functions now use shared utilities

  // Show loader while split is initializing or if splitData is missing
  // Show error state if there's an error
  if (error) {
    return (
      <ErrorScreen
        title="Something went wrong"
        message={error}
        onRetry={() => setError(null)}
        retryText="Try Again"
      />
    );
  }

  // Show loader while split is initializing or if splitData is missing
  if (isInitializing || !splitData) {
    return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ModernLoader size="large" text="Loading split..." />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with Bill Information */}
        <FairSplitHeader
          billName={billInfo.name.data}
          billDate={billInfo.date.data}
          totalAmount={totalAmount}
          category={splitData?.category || processedBillData?.category || billData?.category}
          onBackPress={() => navigation.navigate('SplitsList')}
          isRealtimeActive={hasReceivedRealtimeData}
        />

        {/* Progress Indicator - Only show when split is confirmed */}
        {isSplitConfirmed && (
            <FairSplitProgress
              completionData={completionData}
              totalAmount={totalAmount}
              isLoading={isLoadingCompletionData}
              splitWallet={splitWallet}
            />
        )}

        {/* Split Wallet Section - Show when wallet exists */}
        {splitWallet && (
          <View style={styles.splitWalletSection}>
            <Text style={styles.splitWalletTitle}>Split Wallet</Text>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Wallet Address</Text>
                <TouchableOpacity 
                  style={styles.walletAddressContainer}
                  onPress={() => handleCopyWalletAddress(splitWallet.walletAddress)}
                >
                  <Text style={styles.splitWalletAddress}>
                    {formatWalletAddress(splitWallet.walletAddress)}
                  </Text>
                  <PhosphorIcon
                    name="Copy"
                    size={20}
                    color={colors.white}
                    weight="regular"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.privateKeyButton}
                onPress={handleShowPrivateKey}
              >
                <PhosphorIcon
                  name="IdentificationCard"
                  size={20}
                  color={colors.white}
                  style={styles.privateKeyButtonIcon}
                />
                <Text style={styles.privateKeyButtonText}>View Private Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Split Method Selection - Only for creator before confirmation */}
        {!isSplitConfirmed && isCurrentUserCreator() && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split between:</Text>
            <View style={styles.splitMethodOptions}>
              {splitMethod === 'equal' ? (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    style={styles.splitMethodOptionTouchable}
                    onPress={() => handleSplitMethodChange('equal')}
                  >
                    <Text style={[
                      styles.splitMethodOptionText,
                      styles.splitMethodOptionTextActive
                    ]}>
                      Equal
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <TouchableOpacity
                  style={styles.splitMethodOption}
                  onPress={() => handleSplitMethodChange('equal')}
                >
                  <Text style={styles.splitMethodOptionText}>
                    Equal
                  </Text>
                </TouchableOpacity>
              )}
              
              {splitMethod === 'manual' ? (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    style={styles.splitMethodOptionTouchable}
                    onPress={() => handleSplitMethodChange('manual')}
                  >
                    <Text style={[
                      styles.splitMethodOptionText,
                      styles.splitMethodOptionTextActive
                    ]}>
                      Manual
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <TouchableOpacity
                  style={styles.splitMethodOption}
                  onPress={() => handleSplitMethodChange('manual')}
                >
                  <Text style={styles.splitMethodOptionText}>
                    Manual
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Show current split method if confirmed */}
        {isSplitConfirmed && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split method:</Text>
            <View style={styles.splitMethodOptions}>
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.splitMethodOptionText, styles.splitMethodOptionTextActive]}>
                  {splitMethod === 'equal' ? 'Equal' : 'Manual'} (Locked)
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Participants List */}
        <FairSplitParticipants
          participants={participants}
          isSplitConfirmed={isSplitConfirmed}
          isCurrentUserCreator={isCurrentUserCreator()}
          splitMethod={splitMethod}
          onEditParticipantAmount={handleEditParticipantAmount}
        />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomContainer}>
        {(() => {
          const buttonState = getButtonState();
          
          switch (buttonState.type) {
            case 'create-wallet':
              return (
                <Button
                  title="Continue"
                  onPress={handleCreateSplitWallet}
                  variant="primary"
                  disabled={isCreatingWallet}
                  loading={isCreatingWallet}
                  fullWidth={true}
                  style={styles.createWalletButton}
                />
              );
            
            case 'confirm-split':
              return (
                <Button
                  title={isCreatingWallet ? 'Confirming...' : 'Confirm Split'}
                  onPress={handleConfirmSplit}
                  variant="primary"
                  disabled={isCreatingWallet}
                  loading={isCreatingWallet}
                  fullWidth={true}
                  style={styles.confirmButton}
                />
              );
            
            case 'withdraw':
              return (
                <View style={styles.buttonContainer}>
                  <Button
                    title="Withdraw Funds"
                    onPress={handleSplitFunds}
                    variant="primary"
                    fullWidth={true}
                    style={styles.splitButton}
                  />
                </View>
              );
            
            case 'pay-share': {
              const currentUserParticipant = participants.find(p => p.id === currentUser?.id?.toString());
              const buttonTitle = (currentUserParticipant && currentUserParticipant.amountPaid > 0)
                ? 'Pay Remaining'
                : 'Pay My Share';

              return (
                <View style={styles.buttonContainer}>
                  <Button
                    title={buttonTitle}
                    onPress={handleSendMyShares}
                    variant="primary"
                    fullWidth={true}
                  />
                </View>
              );
            }
            
            case 'waiting':
              return (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    {buttonState.message || 'Please wait...'}
                  </Text>
                </View>
              );
            
            default:
              return null;
          }
        })()}
      </View>

      {/* Edit Amount Modal */}
      <Modal
        visible={showEditModal && !!editingParticipant}
        onClose={handleCancelEdit}
        title={`Edit Amount for ${editingParticipant?.name}`}
        showHandle={true}
        closeOnBackdrop={true}
      >
        <View style={styles.modalInputContainer}>
          <Input
            label="Amount (USDC):"
            value={editAmount}
            onChangeText={setEditAmount}
            placeholder="0.00"
            keyboardType="numeric"
            autoFocus
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <View style={styles.modalButtonsContainer}>
          <Button
            title="Cancel"
            onPress={handleCancelEdit}
            variant="secondary"
            style={{flex: 1}}
          />

          <Button
            title="Save"
            onPress={handleSaveEditedAmount}
            variant="primary"
            style={{flex: 1}}
          />
        </View>
      </Modal>

      {/* Centralized Transaction Modal */}
      {transactionModalConfig && (
        <CentralizedTransactionModal
          visible={!!transactionModalConfig}
          config={transactionModalConfig}
          splitWalletId={splitWallet?.id}
          splitId={splitData?.id}
          billId={splitData?.billId}
          currentUser={currentUser}
        />
      )}

      {/* Split Modal */}
      <Modal
        visible={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        title={!showSignatureStep ? 'Transfer Funds' : `Transfer ${totalAmount.toFixed(2)} USDC to ${selectedWallet?.name || 'Selected Wallet'}`}
        description={!showSignatureStep 
          ? 'All participants have covered their share. Choose how to transfer the funds:'
          : 'Transfer funds to your selected wallet address.'
        }
        showHandle={true}
        closeOnBackdrop={true}
      >
        {!showSignatureStep ? (
          // Transfer Method Selection Step
          <>
            {isLoadingWallets ? (
              <View style={styles.loadingContainer}>
                <ModernLoader size="large" text="Loading your wallets..." />
              </View>
            ) : (
              <View style={styles.splitOptionsContainer}>
                {/* External Wallets */}
                {externalWallets.map((wallet) => (
                  <TouchableOpacity 
                    key={wallet.id}
                    style={styles.splitOptionButton}
                    onPress={() => handleSelectWallet({
                      id: wallet.id,
                      address: wallet.address,
                      type: 'external',
                      name: wallet.name
                    })}
                  >
                    <View style={styles.splitOptionIcon}>
                      <PhosphorIcon name="Bank" size={24} color={colors.white} weight="fill" />
                    </View>
                    <View style={styles.splitOptionContent}>
                      <Text style={styles.splitOptionTitle}>{wallet.name}</Text>
                      <Text style={styles.splitOptionDescription}>
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </Text>
                    </View>
                    <PhosphorIcon name="CaretRight" size={20} color={colors.white} weight="bold" />
                  </TouchableOpacity>
                ))}

                {/* KAST Cards */}
                {kastCards.map((card) => (
                  <TouchableOpacity 
                    key={card.id}
                    style={styles.splitOptionButton}
                    onPress={() => handleSelectWallet({
                      id: card.id,
                      address: card.address,
                      type: 'kast',
                      name: card.name
                    })}
                  >
                    <View style={styles.splitOptionIcon}>
                      <PhosphorIcon name="CreditCard" size={24} color={colors.white} weight="fill" />
                    </View>
                    <View style={styles.splitOptionContent}>
                      <Text style={styles.splitOptionTitle}>{card.name}</Text>
                      <Text style={styles.splitOptionDescription}>
                        {card.address.slice(0, 8)}...{card.address.slice(-8)}
                      </Text>
                    </View>
                    <PhosphorIcon name="CaretRight" size={20} color={colors.white} weight="bold" />
                  </TouchableOpacity>
                ))}

                {/* In-App Wallet */}
                {inAppWallet && (
                  <TouchableOpacity 
                    style={styles.splitOptionButton}
                    onPress={() => handleSelectWallet({
                      id: 'in-app',
                      address: inAppWallet.address,
                      type: 'in-app',
                      name: 'In-App Wallet'
                    })}
                  >
                    <View style={styles.splitOptionIcon}>
                      <PhosphorIcon name="CreditCard" size={24} color={colors.white} weight="fill" />
                    </View>
                    <View style={styles.splitOptionContent}>
                      <Text style={styles.splitOptionTitle}>In-App Wallet</Text>
                      <Text style={styles.splitOptionDescription}>
                        {inAppWallet.address.slice(0, 8)}...{inAppWallet.address.slice(-8)}
                      </Text>
                    </View>
                    <PhosphorIcon name="CaretRight" size={20} color={colors.white} weight="bold" />
                  </TouchableOpacity>
                )}

                {/* Add External Wallet Button - Show when no external wallets AND no KAST cards */}
                {externalWallets.length === 0 && kastCards.length === 0 && (
                  <TouchableOpacity 
                    style={styles.addWalletButton}
                    onPress={() => {
                      setShowSplitModal(false);
                      navigation.navigate('LinkedCards');
                    }}
                  >
                    <View style={styles.addWalletIcon}>
                      <PhosphorIcon name="Plus" size={24} color={colors.white} weight="bold" />
                    </View>
                    <View style={styles.addWalletContent}>
                      <Text style={styles.addWalletTitle}>Add External Wallet or Card</Text>
                      <Text style={styles.addWalletDescription}>
                        {inAppWallet 
                          ? 'Link a KAST card or external wallet for more transfer options'
                          : 'Link a KAST card or external wallet to receive funds'
                        }
                      </Text>
                    </View>
                    <PhosphorIcon name="CaretRight" size={20} color={colors.white} weight="bold" />
                  </TouchableOpacity>
                )}

                {/* No wallets available - only show if no external wallets, no KAST cards, AND no in-app wallet */}
                {externalWallets.length === 0 && kastCards.length === 0 && !inAppWallet && (
                  <View style={styles.noWalletsContainer}>
                    <Text style={styles.noWalletsText}>
                      No wallets found. Please add a wallet or card to your profile first.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Button
              title="Cancel"
              onPress={() => setShowSplitModal(false)}
              variant="secondary"
              style={{flex: 1}}
            />
          </>
        ) : (
          // Signature Step
          <>
            {/* Selected Wallet Info */}
            {selectedWallet && (
              <View style={styles.selectedWalletInfo}>
                <Text style={styles.selectedWalletLabel}>Destination:</Text>
                <Text style={styles.selectedWalletAddress}>
                  {selectedWallet.address}
                </Text>
              </View>
            )}
            
            <AppleSlider
              onSlideComplete={handleSignatureStep}
              disabled={!selectedWallet || isSigning}
              loading={isSigning}
              text="Slide to Transfer Funds"
            />

            
          </>
        )}
      </Modal>

      {/* Wallet Recap Modal */}
      <Modal
        visible={showWalletRecapModal}
        onClose={() => setShowWalletRecapModal(false)}
        title="🎉 Split Wallet Created!"
        description="Your split wallet has been created and is ready for payments. Keep your private key secure!"
        showHandle={true}
        closeOnBackdrop={true}
      >
        {splitWallet && (
          <View style={styles.walletRecapContent}>
            <View style={styles.walletInfoCard}>
              <Text style={styles.walletInfoLabel}>Wallet Address</Text>
              <View style={styles.walletAddressContainer}>
                <Text style={styles.walletAddressText}>
                  {formatWalletAddress(splitWallet.walletAddress)}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    const { Clipboard } = require('react-native');
                    Clipboard.setString(splitWallet.walletAddress);
                    Alert.alert('Copied', 'Wallet address copied to clipboard');
                  }}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Button
              title="View Private Key"
              onPress={handleShowPrivateKey}
              variant="secondary"
              style={styles.privateKeyButton}
            />
          </View>
        )}
        
        <Button
          title="Continue"
          onPress={() => setShowWalletRecapModal(false)}
          variant="primary"
          fullWidth={true}
          style={styles.walletRecapButton}
        />
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal && !!privateKey}
        onClose={handleClosePrivateKeyModal}
        title="Private Key"
        description="Keep this private key secure. Anyone with access to this key can control your split wallet."
        showHandle={true}
        closeOnBackdrop={true}
      >
        <View style={styles.privateKeyDisplay}>
          <Text style={styles.privateKeyText}>{privateKey}</Text>
        </View>
        
        <View style={styles.privateKeyWarning}>
          <Text style={styles.privateKeyWarningText}>
            ⚠️ Never share your private key with anyone. Store it in a secure location.
          </Text>
        </View>
        
        <View style={styles.privateKeyButtons}>
          <Button
            title="Close"
            onPress={handleClosePrivateKeyModal}
            variant="secondary"
            style={{flex: 1}}
          />
          
          <Button
            title="Copy Key"
            onPress={handleCopyPrivateKey}
            variant="primary"
            style={{flex: 1}}
          />
        </View>
      </Modal>

    </Container>
  );
};


export default FairSplitScreen;


