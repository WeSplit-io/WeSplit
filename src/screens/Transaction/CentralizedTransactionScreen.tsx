import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header, Button, Container, PhosphorIcon, AppleSlider, ModernLoader, TransactionAmountInput } from '../../components/shared';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { colors } from '../../theme';
import { transactionSharedStyles as styles } from '../../components/shared/styles/TransactionSharedStyles';
import Avatar from '../../components/shared/Avatar';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import { logger } from '../../services/analytics/loggingService';
import {
  centralizedTransactionHandler,
  type TransactionContext,
  type TransactionParams,
  type DestinationType,
  type SourceType
} from '../../services/transactions/CentralizedTransactionHandler';
import type { UserContact, User } from '../../types';

// Screen configuration based on transaction context
interface TransactionScreenConfig {
  title: string;
  subtitle?: string;
  showRecipientSelection: boolean;
  showAmountInput: boolean;
  showMemoInput: boolean;
  showQuickAmounts: boolean;
  allowExternalDestinations: boolean;
  allowFriendDestinations: boolean;
  customRecipientInfo?: {
    name: string;
    address: string;
    avatar?: string;
    type: 'wallet' | 'card' | 'merchant' | 'split' | 'shared';
  };
}

const getScreenConfig = (context: TransactionContext): TransactionScreenConfig => {
  switch (context) {
    case 'send_1to1':
      return {
        title: 'Send',
        subtitle: 'Send USDC to friends or external wallets',
        showRecipientSelection: true,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: true,
        allowExternalDestinations: true,
        allowFriendDestinations: true,
      };

    case 'fair_split_contribution':
      return {
        title: 'Contribute to Split',
        subtitle: 'Pay your share to the fair split',
        showRecipientSelection: false,
        showAmountInput: true,
        showMemoInput: false,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'Fair Split Wallet',
          address: '', // Will be filled from route params
          type: 'split'
        }
      };

    case 'fair_split_withdrawal':
      return {
        title: 'Withdraw from Split',
        subtitle: 'Withdraw funds from the completed split',
        showRecipientSelection: true,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: true,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'Split Withdrawal',
          address: '', // Will be filled from route params
          type: 'split'
        }
      };

    case 'degen_split_lock':
      return {
        title: 'Lock Funds',
        subtitle: 'Lock your funds for the degen split',
        showRecipientSelection: false,
        showAmountInput: true,
        showMemoInput: false,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'Degen Split Wallet',
          address: '', // Will be filled from route params
          type: 'split'
        }
      };

    case 'spend_split_payment':
      return {
        title: 'Pay Merchant',
        subtitle: 'Complete payment to SPEND merchant',
        showRecipientSelection: false,
        showAmountInput: false,
        showMemoInput: false,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'SPEND Merchant',
          address: '', // Will be filled from route params
          type: 'merchant'
        }
      };

    case 'shared_wallet_funding':
      return {
        title: 'Top Up Shared Wallet',
        subtitle: 'Add funds to your shared wallet',
        showRecipientSelection: false,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: true,
        allowExternalDestinations: false,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'Shared Wallet',
          address: '', // Will be filled from route params
          type: 'shared'
        }
      };

    case 'shared_wallet_withdrawal':
      return {
        title: 'Withdraw from Shared Wallet',
        subtitle: 'Withdraw funds to your wallet or card',
        showRecipientSelection: true,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: true,
        allowFriendDestinations: false,
        customRecipientInfo: {
          name: 'Shared Wallet Withdrawal',
          address: '', // Will be filled from route params
          type: 'shared'
        }
      };

    default:
      return {
        title: 'Transaction',
        showRecipientSelection: false,
        showAmountInput: true,
        showMemoInput: false,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false,
      };
  }
};

interface CentralizedTransactionScreenProps {
  navigation: any;
  route: any;
}

const CentralizedTransactionScreen: React.FC<CentralizedTransactionScreenProps> = ({
  navigation,
  route
}) => {
  const {
    context,
    // Recipient information
    contact,
    wallet,
    recipientAddress,
    routeRecipientInfo,
    // Split/Shared wallet information
    splitWalletId,
    splitId,
    billId,
    sharedWalletId,
    // Transaction details
    prefilledAmount,
    prefilledNote,
    isSettlement,
    requestId,
    // Custom recipient info override
    customRecipientInfo
  } = route.params || {};

  const config = getScreenConfig(context);

  // State management
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toString() : '');
  const [showAddNote, setShowAddNote] = useState(!!prefilledNote || config.showMemoInput);
  const [note, setNote] = useState(prefilledNote || '');
  const [selectedChip, setSelectedChip] = useState<'25' | '50' | '100' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ CRITICAL: Prevent multiple transaction executions (debouncing)
  const isExecutingRef = useRef(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Context hooks
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletBalance, ensureAppWallet } = useWallet();

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
        logger.error('Failed to load wallet address for balance', { userId: currentUser.id, error }, 'CentralizedTransactionScreen');
      }
    };

    loadWalletAddress();
  }, [currentUser?.id]);

  // Live balance for real-time updates
  const { balance: liveBalance } = useLiveBalance(
    walletAddress,
    {
      enabled: !!walletAddress,
    }
  );

  // Determine effective balance
  const effectiveBalance = liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined
    ? liveBalance.usdcBalance
    : appWalletBalance;

  // Determine recipient information
  const getRecipientInfo = () => {
    // Custom recipient info takes precedence
    if (customRecipientInfo) {
      return {
        name: customRecipientInfo.name,
        address: customRecipientInfo.address,
        avatar: customRecipientInfo.avatar,
        type: customRecipientInfo.type,
        walletAddress: customRecipientInfo.address
      };
    }

    // Route-provided recipient info
    if (routeRecipientInfo) {
      return routeRecipientInfo;
    }

    // Contact-based recipient
    if (contact) {
      return {
        name: contact.name || `User ${contact.id}`,
        address: contact.email || '',
        avatar: contact.avatar || contact.photoURL,
        walletAddress: contact.wallet_address,
        type: 'friend' as const
      };
    }

    // Wallet-based recipient
    if (wallet) {
      return {
        name: wallet.label || `Wallet ${wallet.address?.substring(0, 6)}...`,
        address: wallet.address || '',
        avatar: null,
        walletAddress: wallet.address,
        type: 'wallet' as const
      };
    }

    return null;
  };

  const recipientInfo = getRecipientInfo();

  // Initialize wallet on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletBalance && !liveBalance) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletBalance, liveBalance, ensureAppWallet]);

  // Amount input validation
  const handleAmountChange = (value: string) => {
    let cleaned = value.replace(/,/g, '.');
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    if (parts.length === 2 && parts[1].length > 2) return;

    setAmount(cleaned);
    setSelectedChip(null);
    setValidationError(null);
  };

  // Quick amount selection
  const handleChipPress = (percentage: '25' | '50' | '100') => {
    if (effectiveBalance !== null && effectiveBalance !== undefined) {
      const percentageValue = parseInt(percentage);
      const calculatedAmount = (effectiveBalance * percentageValue) / 100;
      setAmount(calculatedAmount.toFixed(2));
      setSelectedChip(percentage);
    }
  };

  // Build transaction parameters
  const buildTransactionParams = (): TransactionParams | null => {
    if (!currentUser?.id) return null;

    const baseParams = {
      userId: currentUser.id.toString(),
      amount: parseFloat(amount),
      currency: 'USDC',
      memo: note.trim(),
      context
    };

    switch (context) {
      case 'send_1to1':
        if (!recipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'send_1to1',
          destinationType: contact ? 'friend' : 'external',
          recipientAddress: recipientInfo.walletAddress,
          recipientInfo: {
            name: recipientInfo.name,
            email: recipientInfo.address,
            avatar: recipientInfo.avatar
          },
          requestId,
          isSettlement
        } as any;

      case 'fair_split_contribution':
        if (!splitWalletId) return null;
        return {
          ...baseParams,
          context: 'fair_split_contribution',
          destinationType: 'split_wallet',
          splitWalletId,
          splitId,
          billId
        } as any;

      case 'fair_split_withdrawal':
        if (!splitWalletId || !recipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'fair_split_withdrawal',
          sourceType: 'split_wallet',
          destinationType: 'external',
          splitWalletId,
          destinationAddress: recipientInfo.walletAddress,
          splitId,
          billId
        } as any;

      case 'degen_split_lock':
        if (!splitWalletId) return null;
        return {
          ...baseParams,
          context: 'degen_split_lock',
          destinationType: 'split_wallet',
          splitWalletId,
          splitId,
          billId
        } as any;

      case 'spend_split_payment':
        if (!splitId || !splitWalletId) return null;
        return {
          ...baseParams,
          context: 'spend_split_payment',
          destinationType: 'merchant',
          splitId,
          splitWalletId
        } as any;

      case 'shared_wallet_funding':
        if (!sharedWalletId) return null;
        return {
          ...baseParams,
          context: 'shared_wallet_funding',
          destinationType: 'shared_wallet',
          sharedWalletId,
          sourceType: 'user_wallet'
        } as any;

      case 'shared_wallet_withdrawal':
        if (!sharedWalletId || !recipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'shared_wallet_withdrawal',
          sourceType: 'shared_wallet',
          destinationType: 'external',
          sharedWalletId,
          destinationAddress: recipientInfo.walletAddress,
          destinationId: wallet?.id
        } as any;

      default:
        return null;
    }
  };

  // Execute transaction
  const handleExecuteTransaction = useCallback(async () => {
    // ✅ CRITICAL: Prevent multiple simultaneous executions
    if (isExecutingRef.current) {
      logger.warn('Transaction already in progress - ignoring duplicate execution', {}, 'CentralizedTransactionScreen');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const params = buildTransactionParams();
    if (!params) {
      Alert.alert('Error', 'Unable to build transaction parameters');
      return;
    }

    // Validate transaction
    const validation = await centralizedTransactionHandler.validateTransaction(params);
    if (!validation.canExecute) {
      Alert.alert('Transaction Error', validation.error || 'Transaction validation failed');
      return;
    }

    // ✅ CRITICAL: Set execution flag BEFORE setting processing state
    isExecutingRef.current = true;
    setIsProcessing(true);
    setValidationError(null);

    try {
      const result = await centralizedTransactionHandler.executeTransaction(params);

      if (result.success) {
        // Navigate to success screen with transaction details
        navigation.navigate('SendSuccess', {
          contact: context === 'send_1to1' && contact ? contact : null,
          wallet: context === 'send_1to1' && wallet ? wallet : null,
          destinationType: params.destinationType,
          amount: params.amount,
          description: params.memo,
          groupId: splitId || billId,
          transactionId: result.transactionSignature || result.transactionId,
          txId: result.txId || result.transactionId,
          companyFee: result.fee,
          netAmount: result.netAmount,
          blockchainFee: result.blockchainFee,
          fromNotification: route.params?.fromNotification,
          notificationId: route.params?.notificationId,
          requestId: route.params?.requestId,
          currentUserId: currentUser?.id,
        });
      } else {
        Alert.alert('Transaction Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      logger.error('Transaction execution error', {
        error: error instanceof Error ? error.message : String(error)
      }, 'CentralizedTransactionScreen');

      Alert.alert('Transaction Error', 'An unexpected error occurred. Please try again.');
    } finally {
      // ✅ CRITICAL: Reset execution flag AFTER processing state
      setIsProcessing(false);
      isExecutingRef.current = false;
    }
  }, [amount, context, currentUser, recipientInfo, contact, wallet, requestId, isSettlement, centralizedTransactionHandler]);

  // For spend split payment, auto-execute on mount
  useEffect(() => {
    if (context === 'spend_split_payment' && splitId && splitWalletId) {
      handleExecuteTransaction();
    }
  }, [context, splitId, splitWalletId]);

  // For pre-filled data from notifications
  useEffect(() => {
    if (contact && prefilledAmount && currentUser?.id && context === 'send_1to1') {
      logger.info('Auto-navigating to confirmation for pre-filled data', {
        contactName: contact.name,
        prefilledAmount,
        prefilledNote,
        requestId
      });

      // Auto-execute for notification-based transactions
      if (amount && parseFloat(amount) > 0) {
        handleExecuteTransaction();
      }
    }
  }, [contact, prefilledAmount, currentUser?.id, amount]);

  const isAmountValid = amount.length > 0 && parseFloat(amount) > 0;
  const canExecute = isAmountValid && !isProcessing && !validationError;

  return (
    <Container>
      <Header
        title={config.title}
        onBackPress={() => navigation.goBack()}
      />

      {config.subtitle && (
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 0, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipient Info */}
          {recipientInfo && (
            <View style={styles.recipientAvatarContainer}>
              <View style={styles.recipientAvatar}>
                {recipientInfo.type === 'friend' && recipientInfo.avatar ? (
                  <Avatar
                    userId={contact?.id?.toString() || ''}
                    userName={recipientInfo.name}
                    size={70}
                    avatarUrl={recipientInfo.avatar}
                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                  />
                ) : recipientInfo.type === 'wallet' || recipientInfo.type === 'card' ? (
                  <View style={styles.recipientWalletIcon}>
                    <PhosphorIcon
                      name="Wallet"
                      size={24}
                      color={colors.white}
                      style={styles.recipientWalletIconImage}
                    />
                  </View>
                ) : recipientInfo.type === 'merchant' ? (
                  <Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }}
                    style={styles.recipientKastIcon}
                  />
                ) : (
                  <View style={styles.recipientWalletIcon}>
                    <PhosphorIcon
                      name={recipientInfo.type === 'split' ? 'Users' : 'Wallet'}
                      size={24}
                      color={colors.white}
                      style={styles.recipientWalletIconImage}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.recipientName}>
                {recipientInfo.name}
              </Text>
              {recipientInfo.address && (
                <Text style={styles.recipientEmail}>
                  {recipientInfo.address.length > 20
                    ? `${recipientInfo.address.substring(0, 10)}...${recipientInfo.address.slice(-8)}`
                    : recipientInfo.address
                  }
                </Text>
              )}
            </View>
          )}

          {/* Amount Input */}
          {config.showAmountInput && (
            <View style={styles.amountCardMockup}>
              <View style={styles.amountCardHeader}>
                <Text style={styles.amountCardLabel}>Enter amount</Text>

                <TransactionAmountInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  editable={!isProcessing && context !== 'spend_split_payment'}
                  autoFocus={true}
                  maxLength={12}
                  currency="USDC"
                  showQuickAmounts={config.showQuickAmounts && effectiveBalance !== null && effectiveBalance !== undefined}
                  onQuickAmountPress={handleChipPress}
                  selectedQuickAmount={selectedChip}
                  containerStyle={{ width: '100%' }}
                  inputStyle={styles.amountCardInput}
                  currencyStyle={styles.amountCardCurrency}
                />
              </View>

              {/* Add Note Section */}
              {config.showMemoInput && !isProcessing && (
                <>
                  {!showAddNote ? (
                    <TouchableOpacity
                      style={[styles.amountCardAddNoteRow, { justifyContent: 'center' }]}
                      onPress={() => setShowAddNote(true)}
                    >
                      <PhosphorIcon name="message-circle" size={16} color={colors.white50} />
                      <Text style={styles.amountCardAddNoteText}>Add note</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.amountCardAddNoteRow, { justifyContent: 'center' }]}>
                      <PhosphorIcon name="message-circle" size={16} color={colors.white50} />
                      <TextInput
                        style={[
                          styles.amountCardAddNoteText,
                          {
                            color: 'white',
                            marginLeft: 8,
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                            width: '80%',
                            textAlign: 'center',
                          },
                        ]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add note"
                        placeholderTextColor={colors.white50}
                        multiline={false}
                        maxLength={100}
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Processing Indicator for Auto-Transactions */}
          {context === 'spend_split_payment' && isProcessing && (
            <View style={styles.processingContainer}>
              <ModernLoader size="small" text="Processing payment to merchant..." />
            </View>
          )}

          {/* Validation Error */}
          {validationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}
        </ScrollView>

        {/* Apple Slider for Transaction Confirmation */}
        {config.showAmountInput && (
          <View style={styles.appleSliderContainer}>
            <AppleSlider
              onSlideComplete={handleExecuteTransaction}
              disabled={!canExecute}
              loading={isProcessing}
              text={isProcessing ? "Processing..." : "Slide to Confirm Transaction"}
              gradientColors={[colors.green, colors.green]}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Container>
  );
};

export default CentralizedTransactionScreen;
