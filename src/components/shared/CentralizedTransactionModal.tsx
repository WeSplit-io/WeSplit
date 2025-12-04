import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from './Modal';
import { Button, PhosphorIcon, AppleSlider, Container, ModernLoader, SendConfirmation, TransactionAmountInput } from './index';
import Avatar from './Avatar';
import { colors } from '../../theme';
import { transactionSharedStyles as styles } from './styles/TransactionSharedStyles';
import { logger } from '../../services/analytics/loggingService';
import {
  centralizedTransactionHandler,
  type TransactionContext,
  type TransactionParams
} from '../../services/transactions/CentralizedTransactionHandler';
import type { UserContact, User } from '../../types';

export interface TransactionModalConfig {
  // Modal configuration
  title: string;
  subtitle?: string;
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
  // Transaction configuration
  context: TransactionContext;
  prefilledAmount?: number;
  prefilledNote?: string;
  // UI callbacks
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

interface CentralizedTransactionModalProps {
  visible: boolean;
  config: TransactionModalConfig;
  // Additional props that might be needed
  contact?: UserContact;
  wallet?: any;
  recipientAddress?: string;
  recipientInfo?: any;
  splitWalletId?: string;
  splitId?: string;
  billId?: string;
  sharedWalletId?: string;
  isSettlement?: boolean;
  requestId?: string;
}

const CentralizedTransactionModal: React.FC<CentralizedTransactionModalProps> = ({
  visible,
  config,
  contact,
  wallet,
  recipientAddress,
  recipientInfo,
  splitWalletId,
  splitId,
  billId,
  sharedWalletId,
  isSettlement,
  requestId,
  ...props
}) => {
  // State management
  const [amount, setAmount] = useState(config.prefilledAmount ? config.prefilledAmount.toString() : '');
  const [showAddNote, setShowAddNote] = useState(!!config.prefilledNote || config.showMemoInput);
  const [note, setNote] = useState(config.prefilledNote || '');
  const [selectedChip, setSelectedChip] = useState<'25' | '50' | '100' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ✅ CRITICAL: Prevent multiple transaction executions (debouncing)
  const isExecutingRef = useRef(false);

  // Context hooks - we'll need to import these
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appWalletBalance, setAppWalletBalance] = useState<number | null>(null);
  const [liveBalance, setLiveBalance] = useState<any>(null);

  // For now, we'll use placeholder values - in real implementation, these would come from context
  useEffect(() => {
    // TODO: Get current user from context
    // TODO: Get wallet balance from context
    // TODO: Subscribe to live balance
  }, []);

  // Log modal visibility changes for debugging
  useEffect(() => {
    if (visible) {
      logger.info('Transaction modal opened', {
        context: config.context,
        hasAmount: !!amount,
        isProcessing
      }, 'CentralizedTransactionModal');
    }
  }, [visible, config.context, amount, isProcessing]);

  // Determine effective balance
  const effectiveBalance = liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined
    ? liveBalance.usdcBalance
    : appWalletBalance;

  // Determine recipient information
  const getRecipientInfo = () => {
    // Custom recipient info takes precedence
    if (config.customRecipientInfo) {
      return {
        name: config.customRecipientInfo.name,
        address: config.customRecipientInfo.address,
        avatar: config.customRecipientInfo.avatar,
        type: config.customRecipientInfo.type,
        walletAddress: config.customRecipientInfo.address
      };
    }

    // Route-provided recipient info
    if (recipientInfo) {
      return recipientInfo;
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

  const displayRecipientInfo = getRecipientInfo();

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
      context: config.context
    };

    switch (config.context) {
      case 'send_1to1':
        if (!displayRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'send_1to1',
          destinationType: contact ? 'friend' : 'external',
          recipientAddress: displayRecipientInfo.walletAddress,
          recipientInfo: {
            name: displayRecipientInfo.name,
            email: displayRecipientInfo.address,
            avatar: displayRecipientInfo.avatar
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
        if (!splitWalletId || !displayRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'fair_split_withdrawal',
          sourceType: 'split_wallet',
          destinationType: 'external',
          splitWalletId,
          destinationAddress: displayRecipientInfo.walletAddress,
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
        if (!sharedWalletId || !displayRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'shared_wallet_withdrawal',
          sourceType: 'shared_wallet',
          destinationType: 'external',
          sharedWalletId,
          destinationAddress: displayRecipientInfo.walletAddress,
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
      logger.warn('Transaction already in progress - ignoring duplicate execution', {
        context: config.context,
        amount: parseFloat(amount),
        isProcessing
      }, 'CentralizedTransactionModal');
      return;
    }

    logger.info('Starting transaction execution', {
      context: config.context,
      amount: parseFloat(amount),
      hasCurrentUser: !!currentUser?.id
    }, 'CentralizedTransactionModal');

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
      setValidationError(validation.error || 'Transaction validation failed');
      return;
    }

    // ✅ CRITICAL: Set execution flag BEFORE setting processing state
    isExecutingRef.current = true;
    setIsProcessing(true);
    setValidationError(null);

    try {
      logger.info('Calling centralized transaction handler', {
        context: params.context,
        amount: params.amount,
        userId: params.userId
      }, 'CentralizedTransactionModal');

      const result = await centralizedTransactionHandler.executeTransaction(params);

      logger.info('Transaction handler returned', {
        context: params.context,
        success: result.success,
        hasSignature: !!result.transactionSignature,
        error: result.error?.substring(0, 100)
      }, 'CentralizedTransactionModal');

      if (result.success) {
        // Call success callback if provided
        if (config.onSuccess) {
          config.onSuccess(result);
        } else {
          // Default success behavior
          Alert.alert('Success', result.message || 'Transaction completed successfully');
        }
      } else {
        // Call error callback if provided
        if (config.onError) {
          config.onError(result.error || 'Unknown error occurred');
        } else {
          // Default error behavior
          Alert.alert('Transaction Failed', result.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      logger.error('Transaction execution error', {
        error: error instanceof Error ? error.message : String(error)
      }, 'CentralizedTransactionModal');

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (config.onError) {
        config.onError(errorMessage);
      } else {
        Alert.alert('Transaction Error', errorMessage);
      }
    } finally {
      // ✅ CRITICAL: Reset execution flag AFTER processing state
      setIsProcessing(false);
      isExecutingRef.current = false;
    }
  }, [config, amount, currentUser, displayRecipientInfo, centralizedTransactionHandler]);

  // For spend split payment, auto-execute when modal opens (only once)
  useEffect(() => {
    if (visible && config.context === 'spend_split_payment' && splitId && splitWalletId && !isExecutingRef.current && !isProcessing) {
      logger.info('Auto-executing spend split payment', {
        splitId,
        splitWalletId
      }, 'CentralizedTransactionModal');
      handleExecuteTransaction();
    }
  }, [visible, config.context, splitId, splitWalletId]);

  const isAmountValid = amount.length > 0 && parseFloat(amount) > 0;
  const canExecute = isAmountValid && !isProcessing && !validationError;

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Modal
      visible={visible}
      onClose={config.onClose}
      title={config.title}
      subtitle={config.subtitle}
      showHandle={true}
      closeOnBackdrop={true}
    >
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
          {displayRecipientInfo && (
            <View style={styles.recipientAvatarContainer}>
              <View style={styles.recipientAvatar}>
                {displayRecipientInfo.type === 'friend' && displayRecipientInfo.avatar ? (
                  <Avatar
                    userId={contact?.id?.toString() || ''}
                    userName={displayRecipientInfo.name}
                    size={70}
                    avatarUrl={displayRecipientInfo.avatar}
                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                  />
                ) : displayRecipientInfo.type === 'wallet' || displayRecipientInfo.type === 'card' ? (
                  <View style={styles.recipientWalletIcon}>
                    <PhosphorIcon
                      name="Wallet"
                      size={24}
                      color={colors.white}
                      style={styles.recipientWalletIconImage}
                    />
                  </View>
                ) : displayRecipientInfo.type === 'merchant' ? (
                  <Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }}
                    style={styles.recipientKastIcon}
                  />
                ) : (
                  <View style={styles.recipientWalletIcon}>
                    <PhosphorIcon
                      name={displayRecipientInfo.type === 'split' ? 'Users' : 'Wallet'}
                      size={24}
                      color={colors.white}
                      style={styles.recipientWalletIconImage}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.recipientName}>
                {displayRecipientInfo.name}
              </Text>
              {displayRecipientInfo.address && (
                <Text style={styles.recipientEmail}>
                  {displayRecipientInfo.address.length > 20
                    ? `${displayRecipientInfo.address.substring(0, 10)}...${displayRecipientInfo.address.slice(-8)}`
                    : displayRecipientInfo.address
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
                  editable={!isProcessing && config.context !== 'spend_split_payment'}
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
          {config.context === 'spend_split_payment' && isProcessing && (
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
    </Modal>
  );
};

export default CentralizedTransactionModal;
