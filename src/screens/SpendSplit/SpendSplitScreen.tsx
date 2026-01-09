/**
 * SPEND Split Screen
 * Dedicated screen for SPEND merchant gateway splits
 * Handles automatic payment to SPEND when threshold is met
 *
 * Best Practices:
 * - All hooks called unconditionally in same order
 * - Proper memoization of expensive calculations
 * - Clean separation of concerns
 * - Error boundaries for robustness
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StatusBar,
  TouchableOpacity,
  Share,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme';
import { SplitWalletService, SplitWallet } from '../../services/split';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { SpendPaymentModeService } from '../../services/integrations/spend';
import { SpendPaymentStatus, SpendPaymentSuccessModal } from '../../components/spend';
import CentralizedTransactionModal, { type TransactionModalConfig } from '../../components/shared/CentralizedTransactionModal';
import { WalletSelectorModal } from '../../components/wallet';
import { Container, Header, Button, ModernLoader } from '../../components/shared';
import Modal from '../../components/shared/Modal';
import { LinearGradient } from 'expo-linear-gradient';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { BalanceUpdate } from '../../services/blockchain/balance/LiveBalanceService';
import { SpendSplitHeader, SpendSplitProgress, SpendSplitParticipants } from './components';
import { SplitStorageService } from '../../services/splits';
import { SplitParticipantInvitationService } from '../../services/splits/SplitParticipantInvitationService';
import { extractOrderData, findUserParticipant, calculatePaymentTotals } from '../../utils/spend/spendDataUtils';
import { createSpendSplitWallet } from '../../utils/spend/spendWalletUtils';
import { createMockSpendOrderData } from '../../services/integrations/spend/SpendMockData';
import { SplitInvitationShare } from '../../components/split';
import { SplitInvitationService, SplitInvitationData } from '../../services/splits/splitInvitationService';
import { Linking } from 'react-native';
import { generateSpendCallbackLink } from '../../services/core/deepLinkHandler';


interface SpendSplitScreenProps {
  navigation: any;
  route: any;
}

const SpendSplitScreen: React.FC<SpendSplitScreenProps> = ({ navigation, route }) => {
  // Extract route params safely
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData: routeSplitData } = route.params || {};

  // Context hooks - always called first
  const { state } = useApp();
  const { currentUser } = state;

  // Core data - memoized to prevent unnecessary recalculations
  const splitData = useMemo(() => routeSplitData, [routeSplitData]);

  // ===== STATE MANAGEMENT =====
  // All useState hooks called unconditionally in consistent order

  // Core split state
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>((existingSplitWallet as SplitWallet) || null);
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // UI state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment state
  const [isSendingPayment] = useState(false);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  
  // Payment modal state
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  const [balanceCheckError, setBalanceCheckError] = useState<string | null>(null);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPaymentAmount, setSuccessPaymentAmount] = useState(0);
  
  // Additional modals
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // ===== EXTERNAL HOOKS =====
  // Live balance hook - always called with stable parameters
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
        logger.error('Failed to load wallet address for balance', { userId: currentUser.id, error }, 'SpendSplitScreen');
      }
    };

    loadWalletAddress();
  }, [currentUser?.id]);

  const { balance: liveBalance } = useLiveBalance(walletAddress, {
    enabled: true,
    onBalanceChange: useCallback((update: BalanceUpdate) => {
        if (update.usdcBalance !== null && update.usdcBalance !== undefined && balanceCheckError) {
          setBalanceCheckError(null);
        }
    }, [balanceCheckError])
  });

  // ===== DATA PROCESSING =====
  // Memoized data processing to prevent unnecessary recalculations

  // Process base split data (participants, amounts, etc.)
  const baseSplitData = useMemo(() => {
    if (!splitData) {
      return {
        participants: [],
        totalAmount: 0,
        totalPaid: 0,
        completionPercentage: 0,
        orderData: null
      };
    }

    // Get participants from wallet or split data
    const participants = splitWallet?.participants || splitData.participants || [];
    const totalAmount = splitData.totalAmount || 0;
    const { totalPaid, completionPercentage } = calculatePaymentTotals(participants, totalAmount);

    // Extract order data
    const orderData = splitData.externalMetadata?.orderData;

    return {
      participants,
      totalAmount,
      totalPaid,
      completionPercentage,
      orderData
    };
  }, [splitData, splitWallet?.participants]);

  // Process mock data injection for development
  const processedSplitData = useMemo(() => {
    if (!splitData || !__DEV__) {
      return baseSplitData;
    }

    // Check if we need to inject mock data
    const needsMockData = !splitData.externalMetadata?.orderData?.items?.length;
    if (!needsMockData) {
      return baseSplitData;
    }

    // Inject mock order data
    const mockOrderData = createMockSpendOrderData({
      order_number: splitData.externalMetadata?.orderNumber || 'ORD-1234567890',
      id: splitData.externalMetadata?.orderId || 'ord_1234567890',
      status: splitData.externalMetadata?.orderStatus || 'Payment_Pending',
      store: splitData.externalMetadata?.store || 'amazon',
      total_amount: baseSplitData.totalAmount || 100.0,
    });

    // Create mock participants if none exist
    let participants = baseSplitData.participants;
    if (participants.length === 0) {
      const mockTotalPaid = mockOrderData.total_amount * 0.33;
      participants = [{
        userId: currentUser?.id?.toString() || 'mock_user_1',
        id: currentUser?.id?.toString() || 'mock_user_1',
        name: currentUser?.name || 'You',
        email: currentUser?.email || 'user@example.com',
        amountOwed: mockOrderData.total_amount,
        amountPaid: mockTotalPaid,
        status: 'partial',
        isPaid: false,
      }];
    }

    const { totalPaid, completionPercentage } = calculatePaymentTotals(participants, mockOrderData.total_amount);

    return {
      participants,
      totalAmount: mockOrderData.total_amount,
      totalPaid,
      completionPercentage,
      orderData: mockOrderData
    };
  }, [baseSplitData, splitData, currentUser]);

  // Extract UI data for rendering
  const uiData = useMemo(() => {
    if (!splitData) {
      return {
        billDate: new Date().toISOString(),
        orderId: undefined as string | undefined,
        orderNumber: undefined as string | undefined,
        orderStatus: undefined as string | undefined,
        store: undefined as string | undefined,
        paymentThreshold: 1.0
      };
    }

    const billDate = splitData.date || processedBillData?.date || billData?.date || new Date().toISOString();
    const { orderId, orderNumber, orderStatus, store } = extractOrderData(splitData);
    const paymentThreshold = splitData.externalMetadata?.paymentThreshold || 1.0;

    return {
      billDate,
      orderId: orderId || undefined,
      orderNumber: orderNumber || undefined,
      orderStatus: orderStatus || undefined,
      store: store || undefined,
      paymentThreshold
    };
  }, [splitData, processedBillData, billData]);

  // ===== EFFECTS =====
  // All useEffect hooks called unconditionally

  // Verify this is a SPEND split
  useEffect(() => {
    if (splitData && !SpendPaymentModeService.requiresMerchantPayment(splitData)) {
      logger.warn('SpendSplitScreen opened for non-SPEND split, redirecting to FairSplit', {
        splitId: splitData.id,
        splitType: splitData.splitType,
      }, 'SpendSplitScreen');
      navigation.replace('FairSplit', route.params);
    }
  }, [splitData, navigation, route.params]);

  // Initialize split wallet
  useEffect(() => {
    const initializeSplit = async () => {
      if (!splitData || !currentUser) {
      if (!splitData) {
        setError('Split data not found');
        }
        setIsInitializing(false);
        setIsReady(true);
        return;
      }

      try {
      // If we already have the wallet from route params, use it immediately
      if (existingSplitWallet) {
          setSplitWallet(existingSplitWallet as SplitWallet);
          setIsSplitConfirmed(existingSplitWallet.status === 'active' || existingSplitWallet.status === 'locked');
            setIsInitializing(false);
              setIsReady(true);
        return;
      }

        // Try to load existing split wallet
        if (splitData.walletId) {
          const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            setIsSplitConfirmed(walletResult.wallet.status === 'active' || walletResult.wallet.status === 'locked');
            setIsInitializing(false);
              setIsReady(true);
            return;
          }
        }

        // Don't auto-create wallet - user must confirm split first (aligned with fair splits)
        // Wallet will be created when user confirms or when they try to make a payment
        logger.debug('No wallet found for SPEND split - will be created on user confirmation', {
          splitId: splitData.id,
          billId: splitData.billId,
        }, 'SpendSplitScreen');
      } catch (err) {
        logger.error('Error initializing SPEND split', {
          error: err instanceof Error ? err.message : String(err),
        }, 'SpendSplitScreen');
        setError('Failed to load split data');
      } finally {
        setIsInitializing(false);
          setIsReady(true);
      }
    };

    initializeSplit();
  }, [splitData, currentUser, existingSplitWallet]);

  // Handle selected contacts from Contacts screen
  useEffect(() => {
    const handleSelectedContacts = async () => {
      if (!route?.params?.selectedContacts || !Array.isArray(route.params.selectedContacts) || route.params.selectedContacts.length === 0) {
        return;
      }

      if (!currentUser || !splitData) {
        logger.warn('Cannot process selected contacts: missing current user or split data', null, 'SpendSplitScreen');
        return;
      }

      // Start inviting users
      try {
        // Filter out existing participants
        const newContacts = SplitParticipantInvitationService.filterExistingParticipants(
          route.params.selectedContacts,
          splitData.participants || []
        );

        if (newContacts.length === 0) {
          Alert.alert('Info', 'All selected contacts are already participants in this split.');
          navigation.setParams({ selectedContacts: undefined });
          return;
        }

        const result = await SplitParticipantInvitationService.inviteParticipants({
          splitId: splitData.id,
          inviterId: currentUser.id.toString(),
          inviterName: currentUser.name || 'User',
          contacts: newContacts,
          billName: splitData.title || 'SPEND Order',
          totalAmount: splitData.totalAmount || 0,
          existingParticipants: splitData.participants || [],
          splitWalletId: splitData.walletId,
        });

        if (result.success) {
          // Reload split data to show the newly added participants
          const updatedSplitResult = await SplitStorageService.getSplit(splitData.id);
          if (updatedSplitResult.success && updatedSplitResult.split) {
            // Update local state
            if (updatedSplitResult.split.walletId) {
              const walletResult = await SplitWalletService.getSplitWallet(updatedSplitResult.split.walletId);
              if (walletResult.success && walletResult.wallet) {
                setSplitWallet(walletResult.wallet);
              }
            }
          }

          Alert.alert('Success', result.message || `Successfully invited ${result.invitedCount} participant(s).`);
        } else {
          Alert.alert('Error', result.error || 'Failed to invite participants.');
        }
      } catch (error) {
        logger.error('Error inviting participants', {
          error: error instanceof Error ? error.message : String(error),
        }, 'SpendSplitScreen');
        Alert.alert('Error', 'An error occurred while inviting participants.');
      } finally {
        navigation.setParams({ selectedContacts: undefined });
      }
    };

    handleSelectedContacts();
  }, [route?.params?.selectedContacts, currentUser, splitData, navigation]);

  // Handle add participants
  const handleAddParticipants = useCallback(() => {
    if (!splitData || !currentUser) {
      Alert.alert('Error', 'Split data not available');
      return;
    }

    navigation.navigate('Contacts', {
      action: 'split',
      splitId: splitData.id,
      splitName: splitData.title,
      returnRoute: 'SpendSplit',
      returnParams: {
        splitData,
        billData,
        processedBillData,
        splitWallet,
      },
    });
  }, [splitData, currentUser, navigation, billData, processedBillData, splitWallet]);

  // Handle direct share (opens system share panel directly)
  const handleDirectShare = useCallback(async () => {
    if (!splitData || !currentUser) {
      Alert.alert('Error', 'Split data not available');
      return;
    }

    try {
      // Generate invitation data
      const invitationData: SplitInvitationData = {
        type: 'split_invitation',
        splitId: splitData.id,
        billName: splitData.title || 'Split',
        totalAmount: splitData.totalAmount || 0,
        currency: splitData.currency || 'USDC',
        creatorId: currentUser.id.toString(),
        creatorName: currentUser.name || currentUser.email?.split('@')[0],
        timestamp: new Date().toISOString(),
        splitType: splitData.splitType || 'spend',
      };

      // Generate universal link
      const shareableLink = SplitInvitationService.generateUniversalLink(invitationData);

      // Create share message
      const shareMessage = `Join my split "${splitData.title || 'Split'}" on WeSplit!\n\nTotal: $${(splitData.totalAmount || 0).toFixed(2)} USDC\n\n${shareableLink}`;

      // Open system share panel directly
      const result = await Share.share({
        message: shareMessage,
        title: `Join Split: ${splitData.title || 'Split'}`,
      });

      if (result.action === Share.sharedAction) {
        logger.info('Split invitation shared successfully', {
          splitId: splitData.id,
          sharedWith: result.activityType,
        }, 'SpendSplitScreen');
      }
    } catch (error) {
      logger.error('Error sharing invitation', {
        error: error instanceof Error ? error.message : String(error),
        splitId: splitData?.id,
      }, 'SpendSplitScreen');
      Alert.alert('Error', 'Failed to share invitation. Please try again.');
    }
  }, [splitData, currentUser]);

  // Check payment completion and trigger merchant payment
  const checkPaymentCompletion = useCallback(async () => {
    if (!splitWallet?.id || !splitData) {
      return;
    }

    // Prevent duplicate completion checks
    if (isSplitConfirmed || splitWallet.status === 'completed' || isCheckingCompletion) {
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
      const totalPaid = wallet.participants.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);

      // Check if payment threshold is met for SPEND
      if (allParticipantsPaid && SpendPaymentModeService.isPaymentThresholdMet(splitData, totalPaid)) {
        // Check if payment has already been processed
        if (!SpendPaymentModeService.isPaymentAlreadyProcessed(splitData)) {
          logger.info('SPEND merchant payment threshold met, processing automatic payment', {
            splitId: splitData.id,
            splitWalletId: wallet.id,
            totalPaid,
            threshold: SpendPaymentModeService.getPaymentThreshold(splitData),
            orderId: SpendPaymentModeService.getOrderId(splitData),
          }, 'SpendSplitScreen');

          setIsSplitConfirmed(true);

          // Show processing alert
          Alert.alert(
            'Processing Payment to SPEND',
            'All payments received. Processing automatic payment to SPEND merchant...',
            [{ text: 'OK' }]
          );

          // Trigger automatic payment using SpendMerchantPaymentService
          // This service handles: status updates, idempotency, webhooks, and notifications
          const { SpendMerchantPaymentService } = await import('../../services/integrations/spend/SpendMerchantPaymentService');
          const paymentResult = await SpendMerchantPaymentService.processMerchantPayment(
            splitData.id,
            wallet.id
          );

          if (paymentResult.success) {
            logger.info('SPEND merchant payment processed successfully', {
              splitId: splitData.id,
              transactionSignature: paymentResult.transactionSignature,
            }, 'SpendSplitScreen');

            // Check if we should redirect back to Spend app
            const callbackUrl = splitData.externalMetadata?.callbackUrl;
            const orderId = splitData.externalMetadata?.orderId;

            if (callbackUrl) {
              // Generate deep link to return to Spend app
              const callbackDeepLink = generateSpendCallbackLink(
                callbackUrl,
                orderId,
                'success',
                `Payment of ${wallet.totalAmount} USDC has been sent to SPEND. Your order will be fulfilled shortly.`
              );

              Alert.alert(
                'Payment Sent to SPEND ✅',
                `Payment of ${wallet.totalAmount} USDC has been sent to SPEND. Your order will be fulfilled shortly.`,
                [
                  {
                    text: 'Return to SPEND',
                    onPress: () => {
                      Linking.openURL(callbackDeepLink).catch((error) => {
                        logger.error('Failed to open Spend callback URL', {
                          callbackUrl,
                          error: error instanceof Error ? error.message : String(error)
                        }, 'SpendSplitScreen');
                        
                        // Fallback: try direct URL
                        Linking.openURL(callbackUrl).catch(() => {
                          Alert.alert('Redirect Failed', 'Unable to return to SPEND app. Please return manually.');
                        });
                      });
                    }
                  },
                  { text: 'Stay in WeSplit', style: 'cancel' }
                ]
              );
            } else {
              // No callback URL - show standard success message
              Alert.alert(
                'Payment Sent to SPEND ✅',
                `Payment of ${wallet.totalAmount} USDC has been sent to SPEND. Your order will be fulfilled shortly.`,
                [{ text: 'Done' }]
              );
            }

            // Reload split data to get updated payment status
            const { SplitStorageService } = await import('../../services/splits');
            const updatedSplit = await SplitStorageService.getSplitByBillId(splitData.billId);
            if (updatedSplit.success && updatedSplit.split) {
              // Update local state if needed
            }
          } else {
            logger.error('SPEND merchant payment failed', {
              splitId: splitData.id,
              error: paymentResult.error,
            }, 'SpendSplitScreen');

            Alert.alert(
              'Payment Failed',
              `Failed to send payment to SPEND: ${paymentResult.error || 'Unknown error'}. Please try again or contact support.`,
              [
                { text: 'OK' },
                {
                  text: 'Retry',
                  onPress: async () => {
                    const { centralizedTransactionHandler } = await import('../../services/transactions/CentralizedTransactionHandler');
                    const retryResult = await centralizedTransactionHandler.executeTransaction({
                      context: 'spend_split_payment',
                      userId: currentUser?.id || '',
                      amount: wallet.totalAmount,
                      currency: 'USDC',
                      destinationType: 'external',
                      splitId: splitData.id,
                      splitWalletId: wallet.id
                    });
                    if (!retryResult.success) {
                      Alert.alert('Retry Failed', retryResult.error || 'Unknown error');
                    }
                  },
                },
              ]
            );
          }
        } else {
          // Payment already processed
          logger.info('SPEND merchant payment already processed', {
            splitId: splitData.id,
            paymentStatus: splitData.externalMetadata?.paymentStatus,
          }, 'SpendSplitScreen');
        }
      }
    } catch (error) {
      logger.error('Error checking payment completion', {
        error: error instanceof Error ? error.message : String(error),
      }, 'SpendSplitScreen');
    } finally {
      setIsCheckingCompletion(false);
    }
  }, [splitWallet, splitData, isSplitConfirmed, isCheckingCompletion]);

  // Poll for payment completion - reduced frequency for better performance
  useEffect(() => {
    if (!splitWallet || isSplitConfirmed) {
      return;
    }

    const interval = setInterval(() => {
      checkPaymentCompletion();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [splitWallet, isSplitConfirmed, checkPaymentCompletion]);

  // Check user balance - optimized to use live balance primarily
  const checkUserBalance = useCallback(async (requiredAmount: number) => {
    if (!currentUser) return;

    try {
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
        return;
      }

      // Fallback to balance check utility only if live balance unavailable
      const { getUserBalanceWithFallback } = await import('../../services/shared/balanceCheckUtils');
      const balanceResult = await getUserBalanceWithFallback(currentUser.id.toString(), {
        useLiveBalance: true,
        walletAddress: currentUser.wallet_address
      });
      
      const userUsdcBalance = balanceResult.usdcBalance;
      
      if (balanceResult.isReliable && userUsdcBalance < requiredAmount) {
        setBalanceCheckError(
          `Insufficient balance: You have ${userUsdcBalance.toFixed(6)} USDC but need ${requiredAmount.toFixed(6)} USDC`
        );
      } else {
        setBalanceCheckError(null);
      }
    } catch (error) {
      logger.warn('Balance check failed', {
        error: error instanceof Error ? error.message : String(error)
      }, 'SpendSplitScreen');
      setBalanceCheckError('Could not verify balance. You can still attempt to pay.');
    }
  }, [currentUser, liveBalance]);

  // Handle create split wallet (aligned with fair splits)
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
        [{ text: 'OK' }]
      );
      return;
    }

    if (!splitData) {
      Alert.alert('Error', 'Split data not available');
      return;
    }

    setIsCreatingWallet(true);

    try {
      logger.info('Creating split wallet for SPEND split', {
        splitId: splitData.id,
        billId: splitData.billId,
        creatorId: currentUser.id.toString(),
      }, 'SpendSplitScreen');

      const walletResult = await createSpendSplitWallet(
        splitData,
        currentUser.id.toString()
      );

      if (walletResult.success && walletResult.wallet) {
        const newWallet = walletResult.wallet;
        setSplitWallet(newWallet);
        setIsSplitConfirmed(true);
        
        logger.info('SPEND split wallet created successfully', {
          splitId: splitData.id,
          walletId: newWallet.id,
          walletAddress: newWallet.walletAddress,
        }, 'SpendSplitScreen');

        Alert.alert(
          'Split Wallet Created!',
          'Your split wallet has been created. Participants can now send their payments.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(walletResult.error || 'Failed to create split wallet');
      }
    } catch (error) {
      logger.error('Error creating SPEND split wallet', {
        error: error instanceof Error ? error.message : String(error),
        splitId: splitData?.id,
      }, 'SpendSplitScreen');
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create split wallet. Please try again.'
      );
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Handle send payment button
  const handleSendMyShares = async () => {
    if (!currentUser || !splitData) {
      Alert.alert('Error', 'Unable to process payment');
      return;
    }

    // Ensure split wallet exists - create if needed
    let wallet = splitWallet;
    if (!wallet && splitData.walletId) {
      const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
      if (walletResult.success && walletResult.wallet) {
        wallet = walletResult.wallet;
        setSplitWallet(wallet);
      }
    }

    // If still no wallet, create one for SPEND split
    if (!wallet) {
      logger.info('Creating wallet for SPEND split in payment flow', {
        splitId: splitData.id,
        billId: splitData.billId,
      }, 'SpendSplitScreen');

      const walletResult = await createSpendSplitWallet(
        splitData,
        currentUser.id.toString()
      );

      if (walletResult.success && walletResult.wallet) {
        wallet = walletResult.wallet;
        setSplitWallet(wallet);
        
        logger.info('SPEND split wallet created successfully in payment flow', {
          splitId: splitData.id,
          walletId: wallet?.id,
        }, 'SpendSplitScreen');
      } else {
      Alert.alert(
          'Error',
          walletResult.error || 'Failed to create split wallet. Please try again.',
        [{ text: 'OK' }]
      );
      return;
      }
    }

    // Get participants from wallet if available, otherwise from splitData
    const allParticipants = wallet?.participants || splitData.participants || [];
    const userParticipant = findUserParticipant(allParticipants, currentUser.id.toString());
    
    if (!userParticipant) {
      Alert.alert('Error', 'You are not a participant in this split');
      return;
    }

    const amountOwed = (userParticipant as any).amountOwed || 0;
    const amountPaid = (userParticipant as any).amountPaid || 0;
    const remainingAmount = amountOwed - amountPaid;

    if (remainingAmount <= 0) {
      Alert.alert('Already Paid', 'You have already paid your full share for this split');
      return;
    }

    if (amountOwed <= 0) {
      Alert.alert('Error', 'No amount to pay');
      return;
    }

    const { roundUsdcAmount } = await import('../../utils/ui/format/formatUtils');
    const roundedRemainingAmount = roundUsdcAmount(remainingAmount);
    
    // Show centralized transaction modal
    const modalConfig: TransactionModalConfig = {
      title: 'Pay Merchant',
      subtitle: `Complete payment to SPEND merchant`,
      showAmountInput: true,
      showMemoInput: false,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'spend_split_payment',
      prefilledAmount: roundedRemainingAmount,
      // Pass split IDs in config for consistency (will also be passed as props)
      splitWalletId: wallet?.id,
      splitId: splitData?.id,
      customRecipientInfo: {
        name: uiData.orderNumber || uiData.orderId ? `Order #${uiData.orderNumber || uiData.orderId}` : 'SPEND Merchant',
        address: wallet?.walletAddress || processedSplitData.orderData?.user_wallet || currentUser?.wallet_address || '',
        type: 'split',
        avatar: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-icon.png?alt=media&token=3b2603eb-57cb-4dc6-aafd-0fff463f1579'
      },
      onSuccess: async (result) => {
        logger.info('Payment sent successfully', {
          splitWalletId: wallet?.id,
          amount: roundedRemainingAmount,
          transactionSignature: result.signature,
        }, 'SpendSplitScreen');

        setTransactionModalConfig(null);
        setSuccessPaymentAmount(roundedRemainingAmount);
        setShowSuccessModal(true);

        // Reload split wallet to get updated participant status
        if (wallet?.id) {
          const updatedWalletResult = await SplitWalletService.getSplitWallet(wallet.id);
          if (updatedWalletResult.success && updatedWalletResult.wallet) {
            setSplitWallet(updatedWalletResult.wallet);
          }
        }

        // Trigger payment completion check
        setTimeout(() => checkPaymentCompletion(), 2000);
      },
      onError: (error) => {
        logger.error('Payment failed', {
          splitWalletId: wallet?.id,
          amount: roundedRemainingAmount,
          error,
        }, 'SpendSplitScreen');

        Alert.alert(
          'Payment Failed',
          error || 'Failed to send payment. Please try again.',
          [{ text: 'OK' }]
        );
        setTransactionModalConfig(null);
      },
      onClose: () => {
        setTransactionModalConfig(null);
      }
    };

    setTransactionModalConfig(modalConfig);

    // Check balance in the background
    checkUserBalance(roundedRemainingAmount).catch(error => {
      logger.warn('Balance check failed, but allowing payment attempt', {
        error: error instanceof Error ? error.message : String(error)
      }, 'SpendSplitScreen');
    });
  };


  // Show loader if initializing OR if splitData is not available yet OR if not ready
  // This prevents flashing content before loader appears
  // isReady ensures we don't show content until initialization is fully complete
  if (isInitializing || !splitData || !isReady) {
    return (
      <Container>
        <ModernLoader text="Loading SPEND split..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header
          title="SP3ND Split"
          onBackPress={() => navigation.navigate('SplitsList')}
        />
        <View style={{ padding: spacing.md, alignItems: 'center' }}>
          <Text style={{ color: colors.red, fontSize: typography.fontSize.md }}>
            {error}
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.navigate('SplitsList')}
            variant="primary"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Container>
    );
  }


  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl + spacing.xxl }}
        nestedScrollEnabled={true}
      >
        {/* SPEND Order Header */}
        <SpendSplitHeader
          billName={splitData?.title || 'SPEND Order'}
          billDate={uiData.billDate}
          totalAmount={processedSplitData.totalAmount}
          orderId={uiData.orderId}
          orderNumber={uiData.orderNumber}
          orderStatus={uiData.orderStatus}
          store={uiData.store}
          split={splitData}
          onBackPress={() => navigation.navigate('SplitsList')}
          onSettingsPress={() => {
            navigation.navigate('SpendOrderSettings', {
              splitData,
              orderData: processedSplitData.orderData,
            });
          }}
        />

        {/* SPEND Payment Status Card - Only show if payment is processing or paid */}
        {(() => {
          const paymentStatus = splitData.externalMetadata?.paymentStatus;
          const shouldShow = paymentStatus === 'processing' || paymentStatus === 'paid' || paymentStatus === 'failed';
          if (!shouldShow) return null;
          return (
        <View style={{
              marginHorizontal: spacing.sm,
          marginBottom: spacing.md,
        }}>
          <SpendPaymentStatus split={splitData} />
        </View>
          );
        })()}

        {/* Payment Progress */}
        <SpendSplitProgress
          totalAmount={processedSplitData.totalAmount}
          totalPaid={processedSplitData.totalPaid}
          completionPercentage={processedSplitData.completionPercentage}
          paymentThreshold={uiData.paymentThreshold}
          orderId={uiData.orderId}
        />

        {/* Order Items - Only show if not expanded in header */}
        {/* Items are now shown in the expandable header card */}

        {/* Participants */}
        <View style={{ marginBottom: spacing.md }}>
          <SpendSplitParticipants
            participants={processedSplitData.participants}
            currentUserId={currentUser?.id?.toString()}
            onAddPress={splitData?.creatorId === currentUser?.id?.toString() ? handleAddParticipants : undefined}
            onSharePress={splitData?.creatorId === currentUser?.id?.toString() ? handleDirectShare : undefined}
              />
        </View>
      </ScrollView>

      {/* Create Wallet Button - Show if wallet doesn't exist (aligned with fair splits) */}
      {!splitWallet && splitData?.creatorId === currentUser?.id?.toString() && (
        <View style={{
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.black,
        }}>
          <Button
            title={isCreatingWallet ? 'Creating Wallet...' : 'Create Split Wallet'}
            onPress={handleCreateSplitWallet}
            disabled={isCreatingWallet}
            variant="primary"
            style={{
              backgroundColor: colors.spendGradientStart,
            }}
          />
          <Text style={{
            color: colors.white70,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
            marginTop: spacing.sm,
            paddingHorizontal: spacing.md,
          }}>
            Create a wallet to start collecting payments from participants
          </Text>
        </View>
      )}

      {/* Payment Button - Show if user needs to pay */}
      {(() => {
        if (!currentUser || !splitData) return null;
        
        // Find user participant using centralized utility
        const userParticipant = findUserParticipant(processedSplitData.participants, currentUser.id.toString());
        
        if (!userParticipant) {
          // If user is not a participant, don't show button
          return null;
        }
        
        const amountOwed = (userParticipant as any).amountOwed || 0;
        const amountPaid = (userParticipant as any).amountPaid || 0;
        const remainingAmount = amountOwed - amountPaid;
        const isPaid = remainingAmount <= 0.01; // Use small threshold for floating point comparison
        
        // Don't show button if already paid or payment is being processed
        if (isPaid || isSendingPayment) return null;
        
        // Only show payment button if wallet exists (aligned with fair splits)
        if (!splitWallet) return null;
        
        return (
          <View style={{
            paddingVertical: spacing.md,
            backgroundColor: colors.black,
          }}>
            <TouchableOpacity
              onPress={handleSendMyShares}
              disabled={isSendingPayment}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.spendGradientStart, colors.spendGradientEnd]}
                style={{
                  borderRadius: 16,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.black,
                }}>
                  {isSendingPayment ? 'Sending...' : 'Send my share'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Payment Modal - Centralized Transaction Modal */}
      {transactionModalConfig && (
        <CentralizedTransactionModal
          visible={!!transactionModalConfig}
          config={transactionModalConfig}
          splitWalletId={splitWallet?.id}
          splitId={splitData?.id}
          currentUser={currentUser}
        />
      )}

      {/* Payment Success Modal */}
      <Modal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        showHandle={true}
        closeOnBackdrop={true}
        maxHeight={400}
      >
        <SpendPaymentSuccessModal
          amount={successPaymentAmount}
          orderNumber={uiData.orderNumber}
          orderId={uiData.orderId}
          onClose={() => setShowSuccessModal(false)}
          />
      </Modal>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        visible={showWalletSelector}
        onClose={() => setShowWalletSelector(false)}
      />

      {/* Share Invitation Modal */}
      <SplitInvitationShare
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        split={splitData}
        currentUserId={currentUser?.id?.toString() || ''}
        currentUserName={currentUser?.name || currentUser?.email?.split('@')[0]}
        title="Invite Friends to Split"
      />
    </Container>
  );
};

export default SpendSplitScreen;

