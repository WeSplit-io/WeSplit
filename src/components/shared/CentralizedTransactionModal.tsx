import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Image, StyleSheet } from 'react-native';
import Modal from './Modal';
import { PhosphorIcon, ModernLoader } from './index';
import Avatar from './Avatar';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';
import {
  centralizedTransactionHandler
} from '../../services/transactions/CentralizedTransactionHandler';
import type { TransactionContext, TransactionParams } from '../../services/transactions/types';
import type { UserContact } from '../../types';
import { formatAmountWithComma } from '../../utils/ui/format/formatUtils';
import { formatWalletAddress } from '../../utils/spend/spendDataUtils';
import { useWallet } from '../../context/WalletContext';
import { useLiveBalance } from '../../hooks/useLiveBalance';

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
  currentUser?: any;
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
  currentUser: propCurrentUser,
  isSettlement,
  requestId,
  ...props
}) => {
  // State management
  const [amount, setAmount] = useState(config.prefilledAmount && config.prefilledAmount > 0 ? formatAmountWithComma(config.prefilledAmount) : '0');
  const [showNote, setShowNote] = useState(!!config.prefilledNote || config.showMemoInput);
  const [note, setNote] = useState(config.prefilledNote || '');
  const [selectedChip, setSelectedChip] = useState<'25' | '50' | '100' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

  // ✅ CRITICAL: Prevent multiple transaction executions (debouncing)
  const isExecutingRef = useRef(false);

  // Use currentUser directly from props instead of local state
  const currentUser = propCurrentUser;
  const { appWalletBalance } = useWallet();
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
        logger.error('Failed to load wallet address for balance', { userId: currentUser.id, error }, 'CentralizedTransactionModal');
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
      // Fill address from props if empty in config
      let address = config.customRecipientInfo.address;
      if (!address || address === '') {
        // Try to get address from props based on context
        if (config.context === 'fair_split_contribution' || config.context === 'degen_split_lock' || config.context === 'spend_split_payment') {
          // For split contexts, try to get from recipientAddress prop or split wallet
          address = recipientAddress || '';
        } else if (config.context === 'shared_wallet_funding' || config.context === 'shared_wallet_withdrawal') {
          // For shared wallet, use sharedWalletId as address identifier
          address = sharedWalletId || recipientAddress || '';
        }
      }
      
      return {
        name: config.customRecipientInfo.name || 'Recipient',
        address: address,
        avatar: config.customRecipientInfo.avatar,
        type: config.customRecipientInfo.type,
        walletAddress: address
      };
    }

    // Route-provided recipient info
    if (recipientInfo) {
      return recipientInfo;
    }

    // Contact-based recipient
    if (contact) {
      const contactName = contact.name || contact.email?.split('@')[0] || `User ${contact.id}`;
      return {
        name: contactName,
        address: contact.email || '',
        avatar: contact.avatar,
        walletAddress: contact.wallet_address,
        type: 'friend' as const
      };
    }

    // Wallet-based recipient
    if (wallet) {
      const walletName = wallet.label || wallet.name || (wallet.address ? `Wallet ${formatWalletAddress(wallet.address)}` : 'External Wallet');
      return {
        name: walletName,
        address: wallet.address || '',
        avatar: null,
        walletAddress: wallet.address,
        type: 'wallet' as const
      };
    }

    return null;
  };

  const displayRecipientInfo = getRecipientInfo();

  // Handle keypad input (matching SpendPaymentModal)
  const handleKeypadPress = (value: string) => {
    if (value === '⌫') {
      // Backspace
      setAmount((prev) => {
        const newAmount = prev.slice(0, -1) || '0';
        const numAmount = parseFloat(newAmount.replace(',', '.'));
        if (!isNaN(numAmount)) {
          // Amount changed, validation will be handled by parent
        }
        return newAmount;
      });
    } else if (value === ',') {
      // Decimal separator (comma for European format)
      if (!amount.includes(',') && !amount.includes('.')) {
        const newAmount = amount === '0' ? '0,' : amount + ',';
        setAmount(newAmount);
      } else if (amount.includes('.')) {
        // Convert period to comma if present
        setAmount(amount.replace('.', ','));
      }
    } else {
      // Number
      let newAmount = amount === '0' ? value : amount + value;
      
      // Limit to 2 decimal places (handle both comma and period)
      if (newAmount.includes(',') || newAmount.includes('.')) {
        const separator = newAmount.includes(',') ? ',' : '.';
        const parts = newAmount.split(separator);
        if (parts[1] && parts[1].length > 2) {
          newAmount = parts[0] + separator + parts[1].substring(0, 2);
        }
        // Normalize to comma
        if (separator === '.') {
          newAmount = newAmount.replace('.', ',');
        }
      }
      
      setAmount(newAmount);
      const numAmount = parseFloat(newAmount.replace(',', '.'));
      if (!isNaN(numAmount)) {
        // Amount changed
      }
    }
  };

  // Amount input validation (for TextInput)
  const handleAmountChange = (text: string) => {
    // Allow only numbers and comma
    const cleaned = text.replace(/[^0-9,]/g, '');
    
    // Handle comma as decimal separator
    let newAmount = cleaned;
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts.length > 2) {
        // Only allow one comma
        newAmount = parts[0] + ',' + parts.slice(1).join('');
      }
      // Limit to 2 decimal places
      if (parts[1] && parts[1].length > 2) {
        newAmount = parts[0] + ',' + parts[1].substring(0, 2);
      }
    }
    
    setAmount(newAmount);
    const numAmount = parseFloat(newAmount.replace(',', '.')) || 0;
    setSelectedChip(null);
    setValidationError(null);
  };

  // Quick amount selection
  const handleChipPress = (percentage: '25' | '50' | '100') => {
    if (effectiveBalance !== null && effectiveBalance !== undefined) {
      const percentageValue = parseInt(percentage);
      const calculatedAmount = (effectiveBalance * percentageValue) / 100;
      setAmount(formatAmountWithComma(calculatedAmount));
      setSelectedChip(percentage);
    }
  };

  // Build transaction parameters
  const buildTransactionParams = (): TransactionParams | null => {
    if (!currentUser?.id) return null;

    // Parse amount with comma replaced by period for calculation
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) return null;

    const baseParams = {
      userId: currentUser.id.toString(),
      amount: numAmount,
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
        amount: parseFloat(amount.replace(',', '.')),
        isProcessing
      }, 'CentralizedTransactionModal');
      return;
    }

    logger.info('Starting transaction execution', {
      context: config.context,
        amount: parseFloat(amount.replace(',', '.')),
      hasCurrentUser: !!currentUser?.id
    }, 'CentralizedTransactionModal');

    // Parse amount with comma replaced by period for calculation
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
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

      // ✅ CRITICAL: Detect timeout errors and provide helpful guidance
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                       errorMessage.toLowerCase().includes('timed out') ||
                       errorMessage.toLowerCase().includes('deadline exceeded');
      
      if (isTimeout) {
        // Timeout error - transaction may have succeeded
        const timeoutMessage = 'Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history before trying again.';
        logger.warn('Transaction timeout detected', {
          context: config.context,
          amount: parseFloat(amount.replace(',', '.')),
          note: 'Transaction may have succeeded despite timeout'
        }, 'CentralizedTransactionModal');
        
        if (config.onError) {
          config.onError(timeoutMessage);
        } else {
          Alert.alert('Transaction Timeout', timeoutMessage);
        }
      } else {
        // Regular error
        if (config.onError) {
          config.onError(errorMessage);
        } else {
          Alert.alert('Transaction Error', errorMessage);
        }
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

  // Calculate network fee (3%)
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const networkFee = numAmount * 0.03; // 3% network fee
  const totalPaid = numAmount + networkFee;

  const isAmountValid = amount.length > 0 && numAmount > 0;
  const canExecute = isAmountValid && !isProcessing && !validationError;

  const handleClose = () => {
    if (config.onClose) {
      config.onClose();
    }
  };

  // Determine recipient display name - never show "N/A"
  const getRecipientDisplayName = () => {
    if (!displayRecipientInfo) return '';
    
    // For merchant, split, or shared types, use the name directly
    if (displayRecipientInfo.type === 'merchant' || 
        displayRecipientInfo.type === 'split' || 
        displayRecipientInfo.type === 'shared') {
      return displayRecipientInfo.name;
    }
    
    // For friend/external transfers, use recipient name (never "Order #N/A")
    if (displayRecipientInfo.name && displayRecipientInfo.name !== 'N/A') {
      return displayRecipientInfo.name;
    }
    
    // Fallback: use wallet address if name is not available
    if (displayRecipientInfo.walletAddress) {
      return formatWalletAddress(displayRecipientInfo.walletAddress);
    }
    
    // Last resort: use contact name or generic
    return contact?.name || 'Recipient';
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={config.title}
      showHandle={true}
      closeOnBackdrop={true}
    >
      <View style={paymentModalStyles.container}>
        {/* Send to Section */}
          {displayRecipientInfo && (
          <View style={paymentModalStyles.sendToSection}>
            <Text style={paymentModalStyles.sendToLabel}>Send to</Text>
            <View style={paymentModalStyles.recipientCard}>
              <View style={paymentModalStyles.recipientIcon}>
                {displayRecipientInfo.type === 'merchant' ? (
                  <Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }}
                    style={{ width: 24, height: 24 }}
                  />
                ) : displayRecipientInfo.type === 'friend' && displayRecipientInfo.avatar ? (
                  <Avatar
                    userId={contact?.id?.toString() || ''}
                    userName={displayRecipientInfo.name}
                    size={24}
                    avatarUrl={displayRecipientInfo.avatar}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : displayRecipientInfo.type === 'split' ? (
                  <PhosphorIcon name="Users" size={24} color={colors.white} weight="fill" />
                ) : displayRecipientInfo.type === 'shared' ? (
                  <PhosphorIcon name="Wallet" size={24} color={colors.white} weight="fill" />
                ) : (
                  <PhosphorIcon name="CurrencyDollar" size={24} color={colors.white} weight="fill" />
                )}
              </View>
              <View style={paymentModalStyles.recipientInfo}>
                <Text style={paymentModalStyles.recipientOrder}>
                  {getRecipientDisplayName()}
                </Text>
                {displayRecipientInfo.walletAddress && (
                  <Text style={paymentModalStyles.recipientAddress}>
                    {formatWalletAddress(displayRecipientInfo.walletAddress)}
                </Text>
              )}
              </View>
            </View>
            </View>
          )}

        {/* Amount Input Area */}
          {config.showAmountInput && (
          <View style={paymentModalStyles.amountSection}>
            <TextInput
              ref={amountInputRef}
              style={paymentModalStyles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
              onFocus={() => setIsAmountFocused(true)}
              onBlur={() => setIsAmountFocused(false)}
              keyboardType="decimal-pad"
              returnKeyType="done"
                  placeholder="0"
              placeholderTextColor={colors.white70}
              selectTextOnFocus
                  editable={!isProcessing && config.context !== 'spend_split_payment'}
            />
            <Text style={paymentModalStyles.amountCurrency}>USDC</Text>
            {config.showMemoInput && !showNote && (
              <TouchableOpacity onPress={() => setShowNote(true)} style={paymentModalStyles.addNoteButton}>
                <Text style={paymentModalStyles.addNoteText}>Add note</Text>
                    </TouchableOpacity>
            )}
            {config.showMemoInput && showNote && (
                      <TextInput
                style={paymentModalStyles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add note"
                placeholderTextColor={colors.white70}
                autoFocus
                      />
            )}
                    </View>
                  )}

        {/* Wallet Information */}
        <View style={paymentModalStyles.walletCard}>
          <View style={paymentModalStyles.walletIcon}>
            <PhosphorIcon name="Wallet" size={24} color={colors.white} weight="fill" />
          </View>
          <View style={paymentModalStyles.walletInfo}>
            <Text style={paymentModalStyles.walletName}>WeSplit Wallet</Text>
            <Text style={paymentModalStyles.walletBalance}>
              Balance {effectiveBalance !== null && effectiveBalance !== undefined ? formatAmountWithComma(effectiveBalance) : '0,00'} USDC
            </Text>
          </View>
          {config.allowExternalDestinations && (
            <TouchableOpacity 
              style={[
                paymentModalStyles.changeButton,
                (isProcessing) && paymentModalStyles.changeButtonDisabled,
              ]}
              onPress={() => {
                if (config.onClose) {
                  config.onClose();
                }
              }}
              disabled={isProcessing}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[paymentModalStyles.changeButtonText, (isProcessing) && paymentModalStyles.changeButtonTextDisabled]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Balance Error */}
        {validationError && (
          <View style={paymentModalStyles.errorCard}>
            <Text style={paymentModalStyles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Network Fee and Total */}
        {config.showAmountInput && (
          <View style={paymentModalStyles.feeSection}>
            <View style={paymentModalStyles.feeRow}>
              <Text style={paymentModalStyles.feeLabel}>Network Fee (3%)</Text>
              <Text style={paymentModalStyles.feeAmount}>{formatAmountWithComma(networkFee)} USDC</Text>
            </View>
            <View style={paymentModalStyles.feeRow}>
              <Text style={paymentModalStyles.feeLabel}>Total paid</Text>
              <Text style={paymentModalStyles.feeTotal}>{formatAmountWithComma(totalPaid)} USDC</Text>
            </View>
            </View>
          )}

          {/* Processing Indicator for Auto-Transactions */}
          {config.context === 'spend_split_payment' && isProcessing && (
          <View style={paymentModalStyles.processingContainer}>
              <ModernLoader size="small" text="Processing payment to merchant..." />
            </View>
          )}

        {/* Send Button */}
        {config.showAmountInput && (
          <TouchableOpacity
            style={[
              paymentModalStyles.sendButton,
              (!canExecute || isProcessing) && paymentModalStyles.sendButtonDisabled,
            ]}
            onPress={handleExecuteTransaction}
            disabled={!canExecute || isProcessing}
          >
            <Text style={paymentModalStyles.sendButtonText}>
              {isProcessing ? 'Processing...' : 'Send'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const paymentModalStyles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sendToSection: {
    gap: spacing.sm,
  },
  sendToLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  recipientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientOrder: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  recipientAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: typography.fontFamily.mono,
  },
  amountSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountInput: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  amountCurrency: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  addNoteButton: {
    marginTop: spacing.sm,
  },
  addNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  noteInput: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white30,
    paddingBottom: spacing.xs,
    minWidth: 100,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.green + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  walletBalance: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  changeButton: {
    backgroundColor: colors.white5,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeButtonDisabled: {
    opacity: 0.5,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  changeButtonTextDisabled: {
    color: colors.white70,
  },
  errorCard: {
    backgroundColor: colors.red + '20',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.red + '40',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.red,
  },
  feeSection: {
    gap: spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  feeAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotal: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  processingContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  sendButton: {
    width: '100%',
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.white10,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
});

export default CentralizedTransactionModal;
