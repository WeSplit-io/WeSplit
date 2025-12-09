import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import Modal from './Modal';
import { ModernLoader } from './index';
import SendComponent, { type RecipientInfo, type WalletInfo } from './SendComponent';
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
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

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
}) => {
  // State management
  const [amount, setAmount] = useState(config.prefilledAmount && config.prefilledAmount > 0 ? formatAmountWithComma(config.prefilledAmount) : '0');
  const [note, setNote] = useState(config.prefilledNote || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  // Map recipient info to SendComponent format
  const sendComponentRecipientInfo: RecipientInfo | null = useMemo(() => {
    if (!displayRecipientInfo) return null;

  // Determine recipient display name - never show "N/A"
    let recipientName = '';
    
    // For merchant, split, or shared types, use the name directly
    if (displayRecipientInfo.type === 'merchant' || 
        displayRecipientInfo.type === 'split' || 
        displayRecipientInfo.type === 'shared') {
      recipientName = displayRecipientInfo.name;
    }
    // For friend/external transfers, use recipient name (never "Order #N/A")
    else if (displayRecipientInfo.name && displayRecipientInfo.name !== 'N/A') {
      recipientName = displayRecipientInfo.name;
    }
    // Fallback: use wallet address if name is not available
    else if (displayRecipientInfo.walletAddress) {
      recipientName = formatWalletAddress(displayRecipientInfo.walletAddress);
    }
    // Last resort: use contact name or generic
    else {
      recipientName = contact?.name || 'Recipient';
    }
    
    // Determine icon and image based on type
    let icon: RecipientInfo['icon'];
    let iconColor: string | undefined;
    let imageUrl: string | undefined;

    if (displayRecipientInfo.type === 'merchant') {
      imageUrl = 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f';
    } else if (displayRecipientInfo.type === 'split') {
      icon = 'Users';
      iconColor = colors.blue;
    } else if (displayRecipientInfo.type === 'shared') {
      icon = 'Wallet';
      iconColor = colors.blue;
    } else if (displayRecipientInfo.type === 'friend') {
      // Friend type - will use Avatar component
    } else {
      icon = 'CurrencyDollar';
      iconColor = colors.green;
    }

    return {
      name: recipientName,
      address: displayRecipientInfo.walletAddress || displayRecipientInfo.address || '',
      avatarUrl: displayRecipientInfo.avatar,
      userId: contact?.id?.toString(),
      icon,
      iconColor,
      imageUrl,
    };
  }, [displayRecipientInfo, contact]);

  // Map wallet info to SendComponent format
  const walletInfo: WalletInfo = useMemo(() => {
    return {
      name: 'WeSplit Wallet',
      balance: effectiveBalance !== null && effectiveBalance !== undefined ? effectiveBalance : 0,
      balanceFormatted: effectiveBalance !== null && effectiveBalance !== undefined 
        ? formatAmountWithComma(effectiveBalance) 
        : '0,00',
      icon: 'Wallet',
      iconColor: colors.green,
    };
  }, [effectiveBalance]);

  // Handle amount change from SendComponent
  const handleAmountChange = useCallback((newAmount: string) => {
    setAmount(newAmount);
    setValidationError(null);
  }, []);

  // Handle note change from SendComponent
  const handleNoteChange = useCallback((newNote: string) => {
    setNote(newNote);
  }, []);

  // Handle recipient change
  const handleRecipientChange = useCallback(() => {
    if (config.onClose) {
      config.onClose();
    }
  }, [config]);

  // Handle wallet change
  const handleWalletChange = useCallback(() => {
    if (config.onClose) {
      config.onClose();
    }
  }, [config]);

  // Don't render SendComponent if recipient info is not available
  if (!sendComponentRecipientInfo && config.showAmountInput) {
    return (
      <Modal
        visible={visible}
        onClose={handleClose}
        title={config.title}
        showHandle={true}
        closeOnBackdrop={true}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load recipient information</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={config.title}
      showHandle={true}
      closeOnBackdrop={true}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Processing Indicator for Auto-Transactions */}
        {config.context === 'spend_split_payment' && isProcessing && (
          <View style={styles.processingContainer}>
            <ModernLoader size="small" text="Processing payment to merchant..." />
            </View>
          )}

        {/* SendComponent - Main UI */}
        {sendComponentRecipientInfo && config.showAmountInput && (
          <SendComponent
            recipient={sendComponentRecipientInfo}
            onRecipientChange={config.allowExternalDestinations ? handleRecipientChange : undefined}
            showRecipientChange={config.allowExternalDestinations}
            amount={amount}
            onAmountChange={handleAmountChange}
            currency="USDC"
            note={note}
            onNoteChange={config.showMemoInput ? handleNoteChange : undefined}
            showAddNote={config.showMemoInput}
            wallet={walletInfo}
            onWalletChange={config.allowExternalDestinations ? handleWalletChange : undefined}
            showWalletChange={config.allowExternalDestinations}
            onSendPress={handleExecuteTransaction}
            sendButtonDisabled={!canExecute || isProcessing}
            sendButtonLoading={isProcessing}
            sendButtonTitle={isProcessing ? 'Processing...' : 'Send'}
            containerStyle={styles.sendComponentContainer}
          />
        )}

        {/* Validation Error - After SendComponent, matching SpendPaymentModal order */}
        {validationError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Network Fee and Total - After wallet info, matching SpendPaymentModal order */}
        {config.showAmountInput && (
          <View style={styles.feeSection}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network Fee (3%)</Text>
              <Text style={styles.feeAmount}>{formatAmountWithComma(networkFee)} USDC</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Total paid</Text>
              <Text style={styles.feeTotal}>{formatAmountWithComma(totalPaid)} USDC</Text>
            </View>
            </View>
          )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  errorContainer: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  sendComponentContainer: {
    flex: 0,
    width: '100%',
    justifyContent: 'flex-start',
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
    marginBottom: spacing.sm,
  },
});

export default CentralizedTransactionModal;
