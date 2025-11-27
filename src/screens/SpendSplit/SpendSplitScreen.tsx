/**
 * SPEND Split Screen
 * Dedicated screen for SPEND merchant gateway splits
 * Handles automatic payment to SPEND when threshold is met
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme';
import { SplitWalletService, SplitWallet } from '../../services/split';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { SpendPaymentModeService, SpendMerchantPaymentService } from '../../services/integrations/spend';
import { SpendPaymentStatus, SpendPaymentSuccessModal } from '../../components/spend';
import { SendComponent, SendConfirmation } from '../../components/shared';
import { WalletSelectorModal } from '../../components/wallet';
import { useWallet } from '../../context/WalletContext';
import { Container, Header, Button, ModernLoader } from '../../components/shared';
import Modal from '../../components/shared/Modal';
import { LinearGradient } from 'expo-linear-gradient';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { SpendSplitHeader, SpendSplitProgress, SpendSplitParticipants } from './components';
import { SplitStorageService } from '../../services/splits';
import { SplitParticipantInvitationService } from '../../services/splits/SplitParticipantInvitationService';
import { extractOrderData, findUserParticipant, calculatePaymentTotals } from '../../utils/spend/spendDataUtils';
import { createSpendSplitWallet } from '../../utils/spend/spendWalletUtils';
import { createMockSpendOrderData } from '../../services/integrations/spend/SpendMockData';
import { formatAmountWithComma } from '../../utils/spend/formatUtils';
import { SplitInvitationShare } from '../../components/split';
import { SplitInvitationService, SplitInvitationData } from '../../services/splits/splitInvitationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpendSplitScreenProps {
  navigation: any;
  route: any;
}

const SpendSplitScreen: React.FC<SpendSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData: routeSplitData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const walletContext = useWallet();

  // Inject mock order data if missing (development only)
  const splitData = useMemo(() => {
    if (!routeSplitData) return routeSplitData;
    
    // Only inject mock data in development and if orderData is missing or has no items
    if (__DEV__ && (!routeSplitData.externalMetadata?.orderData || !routeSplitData.externalMetadata?.orderData?.items || routeSplitData.externalMetadata.orderData.items.length === 0)) {
      const mockOrderData = createMockSpendOrderData({
        order_number: routeSplitData.externalMetadata?.orderNumber || 'ORD-1234567890',
        id: routeSplitData.externalMetadata?.orderId || 'ord_1234567890',
        status: routeSplitData.externalMetadata?.orderStatus || 'Payment_Pending',
        store: routeSplitData.externalMetadata?.store || 'amazon',
        total_amount: routeSplitData.totalAmount || 100.0,
      });
      
      return {
        ...routeSplitData,
        externalMetadata: {
          ...routeSplitData.externalMetadata,
          orderData: {
            ...mockOrderData,
            ...routeSplitData.externalMetadata?.orderData,
            // Ensure items are present
            items: routeSplitData.externalMetadata?.orderData?.items?.length > 0 
              ? routeSplitData.externalMetadata.orderData.items 
              : mockOrderData.items,
          },
          // Update metadata fields if missing
          orderId: routeSplitData.externalMetadata?.orderId || mockOrderData.id,
          orderNumber: routeSplitData.externalMetadata?.orderNumber || mockOrderData.order_number,
          orderStatus: routeSplitData.externalMetadata?.orderStatus || mockOrderData.status,
          store: routeSplitData.externalMetadata?.store || mockOrderData.store,
        },
      };
    }
    
    return routeSplitData;
  }, [routeSplitData]);

  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>((existingSplitWallet as SplitWallet) || null);
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false);
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  // Start with true to show loader immediately, prevent content flash
  // Keep true until we're absolutely ready to render content
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track if component is ready to render (prevents flash)
  const [isReady, setIsReady] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceCheckError, setBalanceCheckError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentAmountString, setPaymentAmountString] = useState('0');
  const [paymentNote, setPaymentNote] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPaymentAmount, setSuccessPaymentAmount] = useState(0);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  
  // Participant invitation state
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Subscribe to live balance updates
  const { balance: liveBalance } = useLiveBalance(
    currentUser?.wallet_address || null,
    {
      enabled: !!currentUser?.wallet_address,
      onBalanceChange: (update) => {
        if (update.usdcBalance !== null && update.usdcBalance !== undefined && balanceCheckError) {
          setBalanceCheckError(null);
        }
      }
    }
  );

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
        setIsReady(true); // Allow error screen to show
        return;
      }

      // If we already have the wallet from route params, use it immediately
      // Add a delay to ensure loader shows first and prevent content flash
      if (existingSplitWallet) {
        // Use requestAnimationFrame to ensure loader renders first
        requestAnimationFrame(() => {
          setSplitWallet(existingSplitWallet as SplitWallet);
          setIsSplitConfirmed(existingSplitWallet.status === 'active' || existingSplitWallet.status === 'locked');
          // Delay to ensure smooth transition from loader to content
          // Set both flags to ensure component is ready
          setTimeout(() => {
            setIsInitializing(false);
            // Additional delay to ensure loader has rendered
            setTimeout(() => {
              setIsReady(true);
            }, 50);
          }, 150);
        });
        return;
      }

      try {
        // Load split wallet if it exists
        if (splitData.walletId) {
          const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            setIsSplitConfirmed(walletResult.wallet.status === 'active' || walletResult.wallet.status === 'locked');
            setIsInitializing(false);
            // Small delay to ensure loader has rendered before showing content
            setTimeout(() => {
              setIsReady(true);
            }, 100);
            return;
          }
        }

        // Auto-create wallet for SPEND splits if it doesn't exist
        logger.info('No wallet found for SPEND split, auto-creating wallet', {
          splitId: splitData.id,
          billId: splitData.billId,
        }, 'SpendSplitScreen');

        const walletResult = await createSpendSplitWallet(
          splitData,
          currentUser.id.toString()
        );

        if (walletResult.success && walletResult.wallet) {
          setSplitWallet(walletResult.wallet);
          setIsSplitConfirmed(true);
          
          logger.info('SPEND split wallet auto-created successfully', {
            splitId: splitData.id,
            walletId: walletResult.wallet.id,
            walletAddress: walletResult.wallet.walletAddress,
          }, 'SpendSplitScreen');
        } else {
          logger.error('Failed to auto-create wallet for SPEND split', {
            splitId: splitData.id,
            error: walletResult.error,
          }, 'SpendSplitScreen');
          setError(walletResult.error || 'Failed to create split wallet');
        }
      } catch (err) {
        logger.error('Error initializing SPEND split', {
          error: err instanceof Error ? err.message : String(err),
        }, 'SpendSplitScreen');
        setError('Failed to load split data');
      } finally {
        setIsInitializing(false);
        // Small delay to ensure loader has rendered before showing content
        setTimeout(() => {
          setIsReady(true);
        }, 100);
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

          // Trigger automatic payment
          const paymentResult = await SpendMerchantPaymentService.processMerchantPayment(
            splitData.id,
            wallet.id
          );

          if (paymentResult.success) {
            logger.info('SPEND merchant payment processed successfully', {
              splitId: splitData.id,
              transactionSignature: paymentResult.transactionSignature,
            }, 'SpendSplitScreen');

            Alert.alert(
              'Payment Sent to SPEND ✅',
              `Payment of ${wallet.totalAmount} USDC has been sent to SPEND. Your order will be fulfilled shortly.`,
              [{ text: 'Done' }]
            );

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
                    const retryResult = await SpendMerchantPaymentService.processMerchantPayment(
                      splitData.id,
                      wallet.id
                    );
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

  // Poll for payment completion
  useEffect(() => {
    if (!splitWallet || isSplitConfirmed) {
      return;
    }

    const interval = setInterval(() => {
      checkPaymentCompletion();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [splitWallet, isSplitConfirmed, checkPaymentCompletion]);

  // Check user balance
  const checkUserBalance = async (requiredAmount: number) => {
    if (!currentUser) return;

    try {
      setIsCheckingBalance(true);
      setBalanceCheckError(null);
      
      const { walletService } = await import('../../services/blockchain/wallet');
      const userWallet = await walletService.getWalletInfo(currentUser.id.toString());
      
      if (!userWallet) {
        setBalanceCheckError('Could not load wallet information');
        setIsCheckingBalance(false);
        return;
      }

      // Use live balance if available
      if (liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined && liveBalance.usdcBalance > 0) {
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

      // Fallback to balance check utility
      const { getUserBalanceWithFallback } = await import('../../services/shared/balanceCheckUtils');
      const balanceResult = await getUserBalanceWithFallback(currentUser.id.toString(), {
        useLiveBalance: true,
        walletAddress: userWallet.address || currentUser.wallet_address
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
    } finally {
      setIsCheckingBalance(false);
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
    
    // Set initial payment amount
    setPaymentAmount(roundedRemainingAmount);
    setPaymentAmountString(formatAmountWithComma(roundedRemainingAmount));
    setPaymentNote('');
    
    // Show modal immediately
    setBalanceCheckError(null);
    setIsCheckingBalance(true);
    setShowPaymentModal(true);

    // Check balance in the background
    checkUserBalance(roundedRemainingAmount).catch(error => {
      logger.warn('Balance check failed, but allowing payment attempt', {
        error: error instanceof Error ? error.message : String(error)
      }, 'SpendSplitScreen');
    });
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setBalanceCheckError(null);
    setIsCheckingBalance(false);
  };

  // Handle payment confirmation
  const handlePaymentModalConfirm = async () => {
    if (!currentUser || !splitData) {
      Alert.alert('Error', 'Unable to process payment');
      return;
    }

    // Ensure split wallet exists - create if needed
    let wallet: SplitWallet | null = splitWallet;
    if (!wallet && splitData.walletId) {
      const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
      if (walletResult.success && walletResult.wallet) {
        wallet = walletResult.wallet;
        setSplitWallet(wallet);
      }
    }

    // If still no wallet, we need to create one (this shouldn't happen for SPEND splits, but handle it)
    if (!wallet) {
      Alert.alert(
        'Wallet Required',
        'The split wallet needs to be created first. Please contact support.',
        [{ text: 'OK' }]
      );
      setIsSendingPayment(false);
      return;
    }

    // Get participants from wallet if available, otherwise from splitData
    const allParticipants = wallet.participants || splitData.participants || [];
    const userParticipant = findUserParticipant(allParticipants, currentUser.id.toString());
    
    if (!userParticipant) {
      Alert.alert('Error', 'You are not a participant in this split');
      setIsSendingPayment(false);
      return;
    }

    const amountOwed = (userParticipant as any).amountOwed || 0;
    const amountPaid = (userParticipant as any).amountPaid || 0;
    const remainingAmount = amountOwed - amountPaid;
    
    const { roundUsdcAmount } = await import('../../utils/ui/format/formatUtils');
    // Use paymentAmount from modal if set, otherwise use remainingAmount
    const amount = paymentAmount > 0 ? roundUsdcAmount(paymentAmount) : roundUsdcAmount(remainingAmount);
    
    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'You have no remaining balance to pay');
      setIsSendingPayment(false);
      return;
    }

    setIsCheckingBalance(false);
    setIsSendingPayment(true);
    setShowPaymentModal(false);
    
    try {
      // Ensure user has a wallet
      const { walletService } = await import('../../services/blockchain/wallet');
      const userWallet = await walletService.getWalletInfo(currentUser.id.toString());
      if (!userWallet || !userWallet.secretKey) {
        Alert.alert(
          'Wallet Required',
          'You need to set up a wallet before making payments. Would you like to create one now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Create Wallet', 
              onPress: async () => {
                try {
                  const walletResult = await walletService.ensureUserWallet(currentUser.id.toString());
                  if (walletResult.success) {
                    Alert.alert('Wallet Created', 'Your wallet has been created successfully. You can now make payments.');
                  } else {
                    Alert.alert('Error', walletResult.error || 'Failed to create wallet');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to create wallet. Please try again.');
                }
              }
            }
          ]
        );
        setIsSendingPayment(false);
        return;
      }
      
      // Process payment (wallet is guaranteed to exist at this point)
      if (!wallet) {
        Alert.alert('Error', 'Wallet not available');
        setIsSendingPayment(false);
        return;
      }
      
      const result = await SplitWalletService.payParticipantShare(
        wallet.id,
        currentUser.id.toString(),
        amount
      );
      
      if (result.success) {
        logger.info('Payment sent successfully', {
          splitWalletId: wallet.id,
          amount,
          transactionSignature: result.transactionSignature,
        }, 'SpendSplitScreen');

        // Close confirmation modal and show success modal
        setShowConfirmationModal(false);
        setSuccessPaymentAmount(amount);
        setShowSuccessModal(true);

        // Reload split wallet to get updated participant status
        const updatedWalletResult = await SplitWalletService.getSplitWallet(wallet.id);
        if (updatedWalletResult.success && updatedWalletResult.wallet) {
          setSplitWallet(updatedWalletResult.wallet);
        }

        // Trigger payment completion check
        setTimeout(() => checkPaymentCompletion(), 2000);
      } else {
        logger.error('Payment failed', {
          splitWalletId: wallet.id,
          amount,
          error: result.error,
        }, 'SpendSplitScreen');

        Alert.alert(
          'Payment Failed',
          result.error || 'Failed to send payment. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logger.error('Error processing payment', {
        error: error instanceof Error ? error.message : String(error),
      }, 'SpendSplitScreen');

      Alert.alert(
        'Error',
        'An unexpected error occurred while processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSendingPayment(false);
    }
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

  // Extract participants and calculate totals
  let participants = splitWallet?.participants || splitData.participants || [];
  let totalAmount = splitData.totalAmount || 0;
  
  // Calculate initial totals to check if we need mock data
  const initialTotals = calculatePaymentTotals(participants, totalAmount);
  
  // Inject mock progress data in development mode (33% progress for visualization)
  // This ensures the arc progress bar shows a partial-filled state matching the mockup
  if (__DEV__ && (participants.length === 0 || totalAmount === 0 || initialTotals.totalPaid === 0)) {
    const mockTotalAmount = totalAmount > 0 ? totalAmount : 100.0;
    const mockTotalPaid = mockTotalAmount * 0.33; // 33% progress (21.87 USDC for 66.21 total, or 33 USDC for 100 total)
    
    // Create mock participants with partial payment if no participants exist
    if (participants.length === 0) {
      participants = [
        {
          userId: currentUser?.id?.toString() || 'mock_user_1',
          id: currentUser?.id?.toString() || 'mock_user_1',
          name: currentUser?.name || 'You',
          email: currentUser?.email || 'user@example.com',
          amountOwed: mockTotalAmount,
          amountPaid: mockTotalPaid,
          status: 'partial',
          isPaid: false,
        },
      ];
    } else {
      // Update existing participants to show 33% progress if they haven't paid
      participants = participants.map((p: any) => {
        const participantOwed = p.amountOwed || (mockTotalAmount / participants.length);
        const participantPaid = p.amountPaid > 0 ? p.amountPaid : participantOwed * 0.33;
        return {
          ...p,
          amountOwed: participantOwed,
          amountPaid: participantPaid,
          status: participantPaid >= participantOwed ? 'paid' : participantPaid > 0 ? 'partial' : 'pending',
        };
      });
    }
    
    // Update totalAmount if it's 0
    if (totalAmount === 0) {
      totalAmount = mockTotalAmount;
    }
  }
  
  const { totalPaid, completionPercentage } = calculatePaymentTotals(
    participants,
    totalAmount
  );

  // Extract bill info for header
  const billDate = splitData.date || processedBillData?.date || billData?.date || new Date().toISOString();
  
  // Extract SP3ND order data using centralized utility
  const { orderId, orderNumber, orderStatus, store } = extractOrderData(splitData);
  const paymentThreshold = splitData.externalMetadata?.paymentThreshold || 1.0;

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
          billName={splitData.title || 'SPEND Order'}
          billDate={billDate}
          totalAmount={totalAmount}
          orderId={orderId || undefined}
          orderNumber={orderNumber || undefined}
          orderStatus={orderStatus || undefined}
          store={store || undefined}
          split={splitData}
          onBackPress={() => navigation.navigate('SplitsList')}
          onSettingsPress={() => {
            navigation.navigate('SpendOrderSettings', {
              splitData,
              orderData: splitData.externalMetadata?.orderData,
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
          totalAmount={totalAmount}
          totalPaid={totalPaid}
          completionPercentage={completionPercentage}
          paymentThreshold={paymentThreshold}
          orderId={orderId || undefined}
        />

        {/* Order Items - Only show if not expanded in header */}
        {/* Items are now shown in the expandable header card */}

        {/* Participants */}
        <View style={{ marginBottom: spacing.md }}>
          <SpendSplitParticipants
            participants={participants}
            currentUserId={currentUser?.id?.toString()}
            onAddPress={splitData.creatorId === currentUser?.id?.toString() ? handleAddParticipants : undefined}
            onSharePress={splitData.creatorId === currentUser?.id?.toString() ? handleDirectShare : undefined}
              />
        </View>
      </ScrollView>

      {/* Payment Button - Show if user needs to pay */}
      {(() => {
        if (!currentUser || !splitData) return null;
        
        // Get participants from splitWallet if available, otherwise from splitData
        const allParticipants = splitWallet?.participants || splitData.participants || [];
        
        // Find user participant using centralized utility
        const userParticipant = findUserParticipant(allParticipants, currentUser.id.toString());
        
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
        
        // Show button even if wallet doesn't exist yet - it will be created when needed
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

      {/* Payment Modal - "Send to" Screen */}
      <Modal
        visible={showPaymentModal}
        onClose={handlePaymentModalClose}
        showHandle={true}
        closeOnBackdrop={true}
        maxHeight={SCREEN_HEIGHT * 0.9}
      >
        <View style={{ flex: 1, paddingBottom: spacing.md }}>
          <SendComponent
            recipient={{
              name: `Order #${orderNumber || orderId || 'N/A'}`,
              address: splitWallet?.walletAddress || splitData?.externalMetadata?.orderData?.user_wallet || currentUser?.wallet_address || undefined,
              imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-icon.png?alt=media&token=3b2603eb-57cb-4dc6-aafd-0fff463f1579',
            }}
            onRecipientChange={undefined}
            showRecipientChange={false}
            amount={paymentAmountString}
            onAmountChange={(newAmountString) => {
              setPaymentAmountString(newAmountString);
              // Convert string to number (handle comma as decimal separator)
              const numAmount = parseFloat(newAmountString.replace(',', '.')) || 0;
              setPaymentAmount(numAmount);
              // Re-check balance when amount changes
              if (numAmount > 0) {
                checkUserBalance(numAmount).catch(() => {});
              }
            }}
            currency="USDC"
            note={paymentNote}
            onNoteChange={setPaymentNote}
            showAddNote={false}
            wallet={{
              name: walletContext.walletName || 'WeSplit Wallet',
              balance: liveBalance?.usdcBalance || 0,
              balanceFormatted: liveBalance?.usdcBalance !== undefined ? formatAmountWithComma(liveBalance.usdcBalance) : undefined,
              imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwesplit-logo-new.png?alt=media&token=f42ea1b1-5f23-419e-a499-931862819cbf',
            }}
            onWalletChange={() => setShowWalletSelector(true)}
            showWalletChange={false}
            onSendPress={() => {
              setShowPaymentModal(false);
              setShowConfirmationModal(true);
            }}
            sendButtonDisabled={isSendingPayment || isCheckingBalance || paymentAmount <= 0}
            sendButtonLoading={isSendingPayment || isCheckingBalance}
            sendButtonTitle={isSendingPayment || isCheckingBalance ? 'Processing...' : 'Send'}
            sendButtonGradientColors={[colors.spendGradientStart, colors.spendGradientEnd]}
          />
        </View>
      </Modal>

      {/* Payment Confirmation Modal */}
      <SendConfirmation
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        recipientName={`Order #${orderNumber || orderId || 'N/A'}`}
        amount={paymentAmount}
        currency="USDC"
        onSlideComplete={handlePaymentModalConfirm}
        disabled={isSendingPayment || isCheckingBalance}
        loading={isSendingPayment || isCheckingBalance}
        gradientColors={[colors.spendGradientStart, colors.spendGradientEnd]}
        insufficientFunds={
          liveBalance?.usdcBalance !== null && 
          liveBalance?.usdcBalance !== undefined && 
          paymentAmount > 0 && 
          liveBalance.usdcBalance < (paymentAmount + paymentAmount * 0.03)
        }
      />

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
          orderNumber={orderNumber || undefined}
          orderId={orderId || undefined}
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

