import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Image, Animated, PanResponder, StyleSheet } from 'react-native';
import { Header } from '../../components/shared';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { consolidatedTransactionService } from '../../services/blockchain/transaction';
import { FeeService, TransactionType } from '../../config/constants/feeConfig';
import { colors } from '../../theme';
import { styles } from './styles';
import Avatar from '../../components/shared/Avatar';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import { logger } from '../../services/analytics/loggingService';
import { notificationService } from '../../services/notifications/notificationService';
import { Container } from '../../components/shared';
import { useLiveBalance } from '../../hooks/useLiveBalance';

// --- AppleSlider adapted from WalletManagementScreen ---
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Sign transaction' }) => {
  const maxSlideDistance = 300;
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [, setIsSliderActive] = useState(false);
  const hasTriggeredRef = useRef(false); // ✅ CRITICAL: Prevent multiple triggers

  // Debug logging for slider props
  if (__DEV__) {
    logger.debug('AppleSlider props', {
      disabled,
      loading,
      text,
      onSlideComplete: !!onSlideComplete
    }, 'SendConfirmationScreen');
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return !disabled && !loading && !hasTriggeredRef.current; // ✅ CRITICAL: Check trigger flag
    },
    onMoveShouldSetPanResponder: () => {
      return !disabled && !loading && !hasTriggeredRef.current; // ✅ CRITICAL: Check trigger flag
    },
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > maxSlideDistance * 0.6 && !hasTriggeredRef.current) { // ✅ CRITICAL: Check before triggering
        hasTriggeredRef.current = true; // ✅ CRITICAL: Set flag immediately
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete && hasTriggeredRef.current) { // ✅ CRITICAL: Double-check flag
            onSlideComplete();
          }
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
            hasTriggeredRef.current = false; // ✅ CRITICAL: Reset after delay
          }, 1000);
        });
      } else {
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsSliderActive(false);
        });
      }
    },
  });

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.appleSliderGradientBorder}
    >
      <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]} {...panResponder.panHandlers}>
      <Animated.View style={styles.appleSliderTrack}>
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: sliderValue.interpolate({ inputRange: [0, maxSlideDistance], outputRange: [0, 1] }) as any,
            borderRadius: 999,
          }}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 999,
            }}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.appleSliderText,
            { color: colors.white }
          ]}
        >
          {loading ? 'Signing...' : text}
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.appleSliderThumb,
          {
            transform: [{ translateX: sliderValue }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 30,
          }}
        />
        <Icon name="chevron-right" size={20} color={colors.black} />
      </Animated.View>
      </View>
    </LinearGradient>
  );
};
// --- End AppleSlider ---

const SendConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, wallet, destinationType, amount, description, groupId, isSettlement, requestId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  // Subscribe to live balance updates as a fallback when direct balance fetch fails
  // This ensures we get the correct balance even when network requests fail initially
  const { balance: liveBalance } = useLiveBalance(
    currentUser?.wallet_address || null,
    {
      enabled: !!currentUser?.wallet_address,
      onBalanceChange: (update) => {
        // Update the existing wallet balance state when live balance updates
        // This ensures the UI reflects the correct balance even if initial fetch failed
        if (update.usdcBalance !== null && update.usdcBalance !== undefined) {
          logger.info('Live balance update received in SendConfirmationScreen', {
            usdcBalance: update.usdcBalance,
            address: update.address
          }, 'SendConfirmationScreen');
          
          // Update the balance state to reflect the live balance
          setExistingWalletBalance(prev => {
            // Only update if we don't have a balance yet, or if live balance is higher (more accurate)
            if (!prev || update.usdcBalance > prev.usdc) {
              return {
                sol: update.solBalance || 0,
                usdc: update.usdcBalance
              };
            }
            return prev;
          });
        }
      }
    }
  );

  // Determine recipient based on destination type
  const recipient = destinationType === 'external' ? wallet : contact;
  const recipientName = destinationType === 'external' 
    ? (wallet?.label || `Wallet ${wallet?.address?.substring(0, 6)}...${wallet?.address?.substring(wallet?.address?.length - 6)}`)
    : (contact?.name || 'Unknown');
  const recipientAddress = destinationType === 'external' ? wallet?.address : contact?.wallet_address;

  // Debug logging to ensure recipient data is passed correctly
  useEffect(() => {
    logger.debug('Recipient data received', {
      destinationType,
      name: recipientName,
      address: recipientAddress ? `${recipientAddress.substring(0, 6)}...${recipientAddress.substring(recipientAddress.length - 6)}` : 'No address',
      fullAddress: recipientAddress,
      id: recipient?.id
    });
    logger.debug('Contact data', {
      contactId: contact?.id,
      contactName: contact?.name,
      contactAvatar: contact?.avatar,
      hasAvatar: !!contact?.avatar
    });
    logger.info('Transaction details', {
      amount,
      amountType: typeof amount,
      description,
      groupId,
      isSettlement,
      requestId
    });
    logger.debug('UI state', {
      destinationType,
      hasContact: !!contact,
      willShowUserAvatar: (destinationType === 'friend' || (contact && !destinationType)) && contact,
      contactAvatar: contact?.avatar,
      contactId: contact?.id
    });
  }, [destinationType, recipientName, recipientAddress, amount, description, groupId, isSettlement, contact, requestId, recipient?.id]);
  const [sending, setSending] = useState(false);
  
  // ✅ CRITICAL: Use ref for immediate synchronous check to prevent race conditions
  // State updates are async, so multiple clicks can happen before state is set
  // Ref provides immediate synchronous check
  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const DEBOUNCE_MS = 500; // Minimum 500ms between clicks

  const handleConfirmSend = useCallback(async () => {
    // ✅ CRITICAL: Immediate synchronous check using ref (not state)
    // This prevents race conditions where multiple clicks happen before state updates
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (isProcessingRef.current) {
      logger.warn('⚠️ Transaction already in progress - ignoring duplicate click', {
        timeSinceLastClick: `${timeSinceLastClick}ms`
      }, 'SendConfirmationScreen');
      return;
    }
    
    // Debounce: prevent clicks within 500ms of each other
    if (timeSinceLastClick < DEBOUNCE_MS) {
      logger.warn('⚠️ Click debounced - too soon after previous click', {
        timeSinceLastClick: `${timeSinceLastClick}ms`,
        debounceMs: DEBOUNCE_MS
      }, 'SendConfirmationScreen');
      return;
    }
    
    // Set flags immediately (synchronous)
    isProcessingRef.current = true;
    lastClickTimeRef.current = now;
    setSending(true); // Also update state for UI
    
    // ✅ CRITICAL: Declare transactionResult outside try block so it's accessible in catch block
    let transactionResult: any;
    
    try {
      if (!currentUser?.id) {
        isProcessingRef.current = false; // ✅ CRITICAL: Reset ref on early return
        setSending(false); // ✅ CRITICAL: Reset state on early return
        Alert.alert('Wallet Error', 'User not authenticated');
        return;
      }

      if (!recipientAddress) {
        isProcessingRef.current = false; // ✅ CRITICAL: Reset ref on early return
        setSending(false); // ✅ CRITICAL: Reset state on early return
        Alert.alert('Error', 'Recipient wallet address is missing');
        return;
      }

      // Check balance using existing wallet service - check total amount including fees
      const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
      const transactionType: TransactionType = isSettlement ? 'settlement' : 'send';
      const totalAmountToPay = FeeService.calculateCompanyFee(amount, transactionType).totalAmount; // Amount + fee
      if (balance.usdc < totalAmountToPay) {
        isProcessingRef.current = false; // ✅ CRITICAL: Reset ref on early return
        setSending(false); // ✅ CRITICAL: Reset state on early return
        Alert.alert('Insufficient Balance', `You do not have enough USDC balance. Required: ${totalAmountToPay.toFixed(2)} USDC (including fees), Available: ${balance.usdc.toFixed(2)} USDC`);
        return;
      }

      if (__DEV__) {
        logger.info('Balance check passed', {
          amountToRecipient: amount,
          totalAmountToPay: totalAmountToPay,
          available: balance.usdc,
          remaining: balance.usdc - totalAmountToPay
        });
      }

      setSending(true);
      
      // Send payment processing notification (non-blocking)
      notificationService.instance.sendPaymentStatusNotification(
        currentUser.id,
        amount,
        'USDC',
        `Payment to ${contact?.name || 'External Wallet'}`,
        undefined, // splitId
        'processing'
      );

      // Get fee estimate for display
      const feeEstimate = await consolidatedTransactionService.getTransactionFeeEstimate(amount, 'USDC', 'medium');
      
      logger.info('Transaction fee estimate', { feeEstimate }, 'SendConfirmationScreen');

      // Send transaction using appropriate service based on destination type
      // ✅ CRITICAL: Use Promise.race with timeout wrapper (aligned with Fair Split logic)
      let transactionPromise: Promise<any>;
      
      if (destinationType === 'external') {
        // For external wallets, use external transfer service
        const { externalTransferService } = await import('../../services/blockchain/transaction/sendExternal');
        transactionPromise = externalTransferService.instance.sendExternalTransfer({
          to: recipientAddress,
          amount: amount,
          currency: 'USDC',
          memo: description || 'External wallet transfer',
          userId: currentUser.id.toString(),
          priority: 'medium',
          transactionType: 'external_payment' // Use the new 2% fee structure
        });
      } else {
        // For friends/internal transfers, use existing service
        const transactionType: TransactionType = isSettlement ? 'settlement' : (requestId ? 'payment_request' : 'send');
        
        logger.info('🔍 SendConfirmation: About to send transaction with requestId', {
          requestId: requestId,
          hasRequestId: !!requestId,
          requestIdType: typeof requestId,
          isSettlement,
          transactionType
        }, 'SendConfirmationScreen');
        
        transactionPromise = consolidatedTransactionService.sendUSDCTransaction({
          to: recipientAddress,
          amount: amount,
          currency: 'USDC',
          userId: currentUser.id.toString(),
          memo: description || (isSettlement ? 'Settlement payment' : 'Payment'),
          priority: 'medium',
          transactionType: transactionType,
          requestId: requestId || null
        });
      }
      
      // ✅ CRITICAL: Add timeout wrapper (60 seconds max) - aligned with Fair Split
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout - please check transaction history')), 60000);
      });
      
      try {
        transactionResult = await Promise.race([transactionPromise, timeoutPromise]);
      } catch (timeoutError) {
        // Timeout occurred - check if transaction was actually submitted
        // Try to get result from promise if it completed, but with a timeout to prevent indefinite wait
        try {
          // ✅ CRITICAL: Add timeout to prevent indefinite wait
          transactionResult = await Promise.race([
            transactionPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction still pending after timeout')), 5000)
            )
          ]);
          
          // If we got a result, transaction was submitted successfully
          logger.info('Transaction completed after timeout wrapper', {
            success: transactionResult.success,
            signature: transactionResult.signature
          }, 'SendConfirmationScreen');
        } catch (promiseError) {
          // Promise also failed or still pending - transaction likely failed
          logger.warn('Transaction promise also failed after timeout', {
            error: promiseError instanceof Error ? promiseError.message : String(promiseError)
          }, 'SendConfirmationScreen');
          throw timeoutError; // Throw original timeout error
        }
      }

      // Check if transaction actually succeeded
      if (!transactionResult.success) {
        throw new Error(transactionResult.error || 'Transaction failed');
      }

      logger.info('Transaction successful', {
        signature: transactionResult.signature || transactionResult.transactionId,
        txId: transactionResult.txId || transactionResult.transactionId,
        companyFee: transactionResult.companyFee,
        netAmount: transactionResult.netAmount,
        blockchainFee: transactionResult.fee || 0,
      });

      // If this is a settlement payment, record the settlement
      if (isSettlement && currentUser?.id && groupId && contact?.id) {
        try {
          // Settlement service doesn't exist - comment out for now
          // await firebaseDataService.settlement.recordPersonalSettlement(
          logger.warn('Settlement recording not implemented', { groupId, currentUserId: currentUser.id, contactId: contact.id, amount }, 'SendConfirmationScreen');
          // TODO: Implement settlement recording
          /*
            groupId.toString(),
            currentUser.id.toString(),
            contact.id.toString(),
            amount,
            'USDC'
          );
          */
        } catch (settlementError) {
          console.error('Settlement processing error:', settlementError);
          // Continue to success screen even if settlement processing fails
        }
      }

      // Note: Personalized settlement notifications are now sent automatically 
      // by the ConsolidatedTransactionService when processing payment requests
      // This ensures both users get appropriate notifications

      // Navigate to success screen with real transaction data
      navigation.navigate('SendSuccess', {
        contact: destinationType === 'external' ? null : contact,
        wallet: destinationType === 'external' ? wallet : null,
        destinationType,
        amount,
        description,
        groupId,
        isSettlement,
        transactionId: transactionResult.signature || transactionResult.transactionId,
        txId: transactionResult.txId || transactionResult.transactionId,
        companyFee: transactionResult.companyFee,
        netAmount: transactionResult.netAmount,
        blockchainFee: transactionResult.fee || 0,
        fromNotification: route.params?.fromNotification,
        notificationId: route.params?.notificationId,
        requestId: route.params?.requestId,
        currentUserId: currentUser?.id,
      });
    } catch (error) {
      console.error('Send error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // ✅ CRITICAL: Check if this is a timeout error
      // Timeout errors mean transaction may have succeeded - check before showing error
      const isTimeout = 
        errorMessage.includes('timed out') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('deadline exceeded') ||
        errorMessage.includes('deadline-exceeded');
      
      const isBlockhashExpired = 
        errorMessage.includes('blockhash has expired') ||
        errorMessage.includes('blockhash expired') ||
        errorMessage.includes('Blockhash not found') ||
        errorMessage.includes('Please try again');
      
      // ✅ CRITICAL: For timeout errors, verify on-chain if transaction actually succeeded
      // This aligns with Fair Split logic - don't show error if transaction succeeded
      if (isTimeout && !isBlockhashExpired) {
        // Timeout occurred - verify on-chain if transaction succeeded
        logger.info('Timeout detected, verifying transaction on-chain', {
          recipientAddress,
          amount
        }, 'SendConfirmationScreen');
        
        // ✅ CRITICAL: First check if we have a transaction result with signature
        // This happens when the timeout wrapper caught the error but the promise completed
        if (transactionResult && transactionResult.signature && transactionResult.success) {
          logger.info('Transaction has signature despite timeout - treating as success', {
            signature: transactionResult.signature,
            success: transactionResult.success
          }, 'SendConfirmationScreen');
          
          isProcessingRef.current = false;
          setSending(false);
          
          // Show success message
          Alert.alert(
            '✅ Transaction Sent!', 
            `Your payment of ${amount.toFixed(6)} USDC has been sent!\n\nAlthough the confirmation timed out, the transaction was successfully submitted to the blockchain.`,
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
                  navigation.goBack();
                }
              }
            ]
          );
          return; // Exit early - transaction succeeded
        }
        
        // If no signature, try balance verification
        try {
          // Wait a moment for blockchain to update
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check recipient balance to verify transaction
          const recipientBalanceResult = await consolidatedTransactionService.getUsdcBalance(recipientAddress);
          const senderBalanceResult = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
          
          logger.info('On-chain balance verification after timeout', {
            recipientBalance: recipientBalanceResult.balance,
            senderBalance: senderBalanceResult.usdc,
            expectedAmount: amount,
            note: 'Checking if transaction actually succeeded despite timeout'
          }, 'SendConfirmationScreen');
          
          // Note: Balance verification is not definitive without previous balance
          // But if we're here, we don't have a signature, so show guidance message
          isProcessingRef.current = false;
          setSending(false);
          
          Alert.alert(
            'Transaction Processing', 
            'The transaction is being processed. It may have succeeded on the blockchain.\n\nPlease check your transaction history. If you don\'t see the transaction, wait a moment and try again.',
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
                  navigation.goBack();
                }
              }
            ]
          );
          return; // Exit early
        } catch (verificationError) {
          logger.warn('Failed to verify transaction on-chain after timeout', {
            error: verificationError instanceof Error ? verificationError.message : String(verificationError)
          }, 'SendConfirmationScreen');
          
          // If verification fails, show message directing to check history
          isProcessingRef.current = false;
          setSending(false);
          Alert.alert(
            'Transaction Processing', 
            'The transaction is being processed. It may have succeeded on the blockchain.\n\nPlease check your transaction history. If you don\'t see the transaction, wait a moment and try again.',
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
                  setSending(false);
                }
              }
            ]
          );
          
          return; // Exit early, don't show error
        }
      }
      
      // Send payment failed notification (non-blocking) - only for real failures
      if (currentUser?.id && !isTimeout) {
        notificationService.instance.sendPaymentStatusNotification(
          currentUser.id,
          amount,
          'USDC',
          `Payment to ${contact?.name || 'External Wallet'}`,
          undefined, // splitId
          'failed',
          errorMessage
        );
      }
      
      // Show user-friendly error message
      if (isBlockhashExpired) {
        Alert.alert(
          'Transaction Timed Out', 
          'The transaction took too long to process and the blockhash expired. This usually happens when the network is slow.\n\nPlease try again - a new transaction will be created with a fresh blockhash.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset sending state so user can retry
                setSending(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Transaction Failed', errorMessage);
      }
    } finally {
      // ✅ CRITICAL: Always reset both ref and state
      isProcessingRef.current = false;
      setSending(false);
    }
  }, [currentUser?.id, recipientAddress, amount, description, groupId, isSettlement, requestId, destinationType, contact, wallet, navigation, route.params]);

  // Fee calculation now handled by useMemo hook above

  // Calculate fees using centralized service with transaction type
  const feeCalculation = useMemo(() => {
    if (amount > 0) {
      const transactionType: TransactionType = isSettlement ? 'settlement' : 'send';
      return FeeService.calculateCompanyFee(amount, transactionType);
    }
    return { fee: 0, totalAmount: 0, recipientAmount: 0 };
  }, [amount, isSettlement]);

  const companyFee = feeCalculation.fee;
  const blockchainFee = 0.00001; // Company covers blockchain fees
  // const totalFee = companyFee + blockchainFee; // Not used currently
  const netAmount = feeCalculation.recipientAmount; // Recipient gets full amount
  const totalAmount = feeCalculation.totalAmount; // Sender pays amount + fees
  const destinationAccount = contact?.wallet_address || '';

  // Check if user has existing wallet and sufficient balance
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [existingWalletBalance, setExistingWalletBalance] = useState<{ sol: number; usdc: number } | null>(null);
  // const [hasSufficientSol, setHasSufficientSol] = useState(false); // Not used currently
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    const checkExistingWallet = async () => {
      if (!currentUser?.id) {
        setWalletLoading(false);
        return;
      }

      try {
        setWalletLoading(true);
        setWalletError(null);
        
        logger.info('Starting wallet validation checks', null, 'SendConfirmationScreen');
        
        // Ensure user has a wallet first
        const { walletService } = await import('../../services/blockchain/wallet');
        const walletResult = await walletService.ensureUserWallet(currentUser.id);
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create or access user wallet');
        }
        
        const walletAddress = walletResult.wallet.address;
        logger.debug('Wallet address check result', { walletAddress }, 'SendConfirmationScreen');
        
        // Check balance
        const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
        logger.debug('Balance check result', { balance }, 'SendConfirmationScreen');
        
        // Check SOL for gas
        const solCheck = await consolidatedTransactionService.hasSufficientSolForGas(currentUser.id);
        logger.debug('SOL check result', { solCheck }, 'SendConfirmationScreen');
        
        // Set states
        setHasExistingWallet(true);
        setExistingWalletBalance(balance);
        // setHasSufficientSol(solCheck.hasSufficient); // Not used currently
        setWalletError(null);
        
        logger.info('Wallet validation completed successfully', {
          walletAddress,
          balance,
          hasWallet: true,
          solCheck
        });
        
      } catch (error) {
        console.error('🔍 SendConfirmation: Wallet validation failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown wallet error';
        setWalletError(errorMessage);
        setHasExistingWallet(false);
        setExistingWalletBalance(null);
        // setHasSufficientSol(false); // Not used currently
        
        // Show user-friendly error message
        Alert.alert(
          'Wallet Error',
          `Unable to access your wallet: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
          [{ text: 'OK' }]
        );
      } finally {
        setWalletLoading(false);
      }
    };

    checkExistingWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // consolidatedTransactionService is a singleton, no need to include

  // Check if user has sufficient balance using existing wallet balance - check total amount including fees
  const transactionType: TransactionType = isSettlement ? 'settlement' : 'send';
  // Ensure amount is a valid number
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0;
  const totalAmountToPay = isValidAmount ? FeeService.calculateCompanyFee(numericAmount, transactionType).totalAmount : 0; // Amount + fee
  
  // Use live balance as fallback if available and existingWalletBalance is null or 0
  // This handles cases where the initial balance fetch failed but LiveBalanceService succeeded
  const effectiveBalance = existingWalletBalance?.usdc !== null && existingWalletBalance?.usdc !== undefined && existingWalletBalance.usdc > 0
    ? existingWalletBalance.usdc
    : (liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined ? liveBalance.usdcBalance : 0);
  
  const hasSufficientBalance = !isValidAmount ? false : (effectiveBalance >= totalAmountToPay);

  // Debug logging for slider state
  if (__DEV__) {
    const sliderDisabled = walletLoading || sending || !hasExistingWallet || !hasSufficientBalance || !!walletError;
    logger.debug('Slider state', {
      sending,
      hasExistingWallet,
      hasSufficientBalance,
      existingWalletBalance,
      amount,
      amountType: typeof amount,
      amountValue: amount,
      numericAmount,
      isValidAmount,
      totalAmountToPay,
      walletLoading,
      walletError,
      sliderDisabled,
      breakdown: {
        walletLoading: walletLoading,
        sending: sending,
        hasExistingWallet: hasExistingWallet,
        hasSufficientBalance: hasSufficientBalance,
        hasWalletError: !!walletError,
        isValidAmount: isValidAmount
      }
    }, 'SendConfirmationScreen');
  }

  return (
    <Container>
      {/* Header */}
      <Header
        title={isSettlement ? 'Settlement Payment' : 'Send'}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Card */}
        <View style={styles.mockupRecipientCard}>
          <View style={styles.mockupRecipientAvatar}>
            {(destinationType === 'friend' || (contact && !destinationType)) && contact ? (
              <Avatar
                userId={contact.id?.toString() || ''}
                userName={contact.name}
                size={48}
                avatarUrl={contact.avatar}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : destinationType === 'external' && (wallet as any)?.type === 'kast' ? (
              <Image
                source={require('../../../assets/kast-logo.png')}
                style={[styles.recipientKastIcon]}
              />
            ) : destinationType === 'external' ? (
              <View style={styles.recipientWalletIcon}>
                <Image
                  source={require('../../../assets/wallet-icon-white.png')}
                  style={styles.recipientWalletIconImage}
                />
              </View>
            ) : (
              <Image
                source={{ uri: DEFAULT_AVATAR_URL }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                resizeMode="cover"
              />
            )}
          </View>
          <View style={styles.mockupRecipientInfo}>
            <Text style={styles.mockupRecipientName}>
              {recipientName}
            </Text>
            {recipientAddress ? (
              <Text style={styles.walletAddressText} numberOfLines={1} ellipsizeMode="middle">
                {`${recipientAddress.substring(0, 6)}...${recipientAddress.slice(-4)}`}
              </Text>
            ) : destinationType === 'friend' && contact?.email ? (
              <Text style={styles.mockupRecipientEmail}>{contact.email}</Text>
            ) : null}
          </View>
        </View>

        {/* Sent Amount Card */}
        <View style={styles.sentAmountContainer}>
          <Text style={styles.sentAmountLabel}>Sent amount</Text>
          <View style={styles.sentAmountValueContainer}>
            <Text style={styles.sentAmountValue}>{amount} USDC</Text>
          </View>
          {description && (
            <View style={[styles.mockupNoteContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }] }>
              <Icon name="message-circle" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.mockupNoteText}>{description}</Text>
            </View>
          )}
        </View>

        {/* Transaction Details Card (mockup style) */}
        <View style={styles.mockupTransactionDetails}>
          {(() => {
            const transactionType: TransactionType = isSettlement ? 'settlement' : 'send';
            return (
              <>
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>
                    {destinationType === 'external' ? 'Amount to wallet' : 'Amount to recipient'}
                  </Text>
                  <Text style={styles.mockupFeeValue}>{netAmount.toFixed(2)} USDC</Text>
                </View>
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>WeSplit fees ({FeeService.getCompanyFeeStructure(transactionType).percentage * 100}%)</Text>
                  <Text style={styles.mockupFeeValue}>{companyFee.toFixed(2)} USDC</Text>
                </View>
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>Gas fees (Covered)</Text>
                  <Text style={styles.mockupFeeValue}>Free</Text>
                </View>
                <View style={styles.mockupFeeRowSeparator} />
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>
                    {destinationType === 'external' ? 'Total you\'ll pay' : 'Total you\'ll pay'}
                  </Text>
                  <Text style={[styles.mockupFeeValue, { color: colors.green, fontWeight: 'bold' }]}>{totalAmount.toFixed(2)} USDC</Text>
                </View>
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>
                    {destinationType === 'external' ? 'Destination wallet' : 'Destination account'}
                  </Text>
                  <Text style={styles.mockupFeeValue}>{destinationAccount ? `${destinationAccount.substring(0, 4)}...${destinationAccount.slice(-4)}` : ''}</Text>
                </View>
                <View style={styles.mockupFeeRow}>
                  <Text style={styles.mockupFeeLabel}>Network</Text>
                  <Text style={styles.mockupFeeValue}>Solana Mainnet (Helius)</Text>
                </View>
              </>
            );
          })()}
        </View>




      </ScrollView>
      {/* AppleSlider for confirmation */}
      <View style={styles.appleSliderContainerWrapper}>
        <Text style={styles.walletInfoText}>
          {destinationType === 'external' 
            ? 'Double check the wallet you\'re withdrawing to!'
            : 'Double check the person you\'re sending money to!'
          }
        </Text>
        
        {/* Wallet Error Display */}
        {walletError && (
          <View style={{ 
            backgroundColor: '#FF5252', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 16,
            marginHorizontal: 20
          }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              ⚠️ Wallet Error
            </Text>
            <Text style={{ color: 'white', textAlign: 'center', marginTop: 4, fontSize: 12 }}>
              {walletError}
            </Text>
            <TouchableOpacity 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                padding: 8, 
                borderRadius: 4, 
                marginTop: 8 
              }}
              onPress={() => {
                setWalletError(null);
                // Retry wallet check
                const checkExistingWallet = async () => {
                  if (!currentUser?.id) {return;}
                  try {
                    setWalletLoading(true);
                    
                    // Ensure user has a wallet first
                    const { walletService } = await import('../../services/blockchain/wallet');
                    const walletResult = await walletService.ensureUserWallet(currentUser.id);
                    
                    if (!walletResult.success || !walletResult.wallet) {
                      throw new Error(walletResult.error || 'Failed to create or access user wallet');
                    }
                    
                    // const walletAddress = walletResult.wallet.address; // Not used currently
                    const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
                    const solCheck = await consolidatedTransactionService.hasSufficientSolForGas(currentUser.id);
                    
                    setHasExistingWallet(true);
                    setExistingWalletBalance(balance);
                    // setHasSufficientSol(solCheck.hasSufficient); // Not used currently
                    setWalletError(null);
                  } catch (error) {
                    setWalletError(error instanceof Error ? error.message : 'Unknown error');
                  } finally {
                    setWalletLoading(false);
                  }
                };
                checkExistingWallet();
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        
        <AppleSlider
          onSlideComplete={handleConfirmSend}
          disabled={walletLoading || sending || isProcessingRef.current || !hasExistingWallet || !hasSufficientBalance || !!walletError}
          loading={walletLoading || sending}
          text={
            !hasSufficientBalance 
              ? "Insufficient funds"
              : walletLoading 
                ? "Loading wallet..." 
                : walletError 
                  ? "Wallet Error" 
                  : "Sign transaction"
          }
        />
      </View>
    </Container>
  );
};

export default SendConfirmationScreen; 