import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, Image, StyleSheet } from 'react-native';
import { Header, Container, PhosphorIcon, ModernLoader } from '../../components/shared';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { transactionSharedStyles as styles } from '../../components/shared/styles/TransactionSharedStyles';
import Avatar from '../../components/shared/Avatar';
import { logger } from '../../services/analytics/loggingService';
import {
  centralizedTransactionHandler
} from '../../services/transactions/CentralizedTransactionHandler';
import type { TransactionContext, TransactionParams } from '../../services/transactions/types';
import type { UserContact } from '../../types';
import { formatAmountWithComma } from '../../utils/ui/format/formatUtils';
import { formatWalletAddress } from '../../utils/spend/spendDataUtils';

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
  const [amount, setAmount] = useState(prefilledAmount && prefilledAmount > 0 ? formatAmountWithComma(prefilledAmount) : '0');
  const [showNote, setShowNote] = useState(!!prefilledNote || config.showMemoInput);
  const [note, setNote] = useState(prefilledNote || '');
  const [selectedChip, setSelectedChip] = useState<'25' | '50' | '100' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

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
      // Fill address from route params if empty
      let address = customRecipientInfo.address;
      if (!address || address === '') {
        // Try to get address from route params based on context
        if (context === 'fair_split_contribution' || context === 'degen_split_lock' || context === 'spend_split_payment') {
          // For split contexts, we need the split wallet address (will be loaded by handler)
          // For now, use recipientAddress if provided
          address = recipientAddress || '';
        } else if (context === 'shared_wallet_funding' || context === 'shared_wallet_withdrawal') {
          // For shared wallet, use sharedWalletId as address identifier
          address = sharedWalletId || recipientAddress || '';
        }
      }
      
      return {
        name: customRecipientInfo.name || 'Recipient',
        address: address,
        avatar: customRecipientInfo.avatar,
        type: customRecipientInfo.type,
        walletAddress: address
      };
    }

    // Route-provided recipient info
    if (routeRecipientInfo) {
      return routeRecipientInfo;
    }

    // Contact-based recipient
    if (contact) {
      const contactName = contact.name || contact.email?.split('@')[0] || `User ${contact.id}`;
      return {
        name: contactName,
        address: contact.email || '',
        avatar: contact.avatar || contact.photoURL,
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

  const recipientInfo = getRecipientInfo();

  // Load split/shared wallet address if needed
  const [loadedRecipientAddress, setLoadedRecipientAddress] = useState<string | null>(null);
  
  useEffect(() => {
    const loadRecipientAddress = async () => {
      // Only load if customRecipientInfo has empty address and we have splitWalletId or sharedWalletId
      if (!customRecipientInfo || customRecipientInfo.address) {
        setLoadedRecipientAddress(null);
        return;
      }

      try {
        if (context === 'fair_split_contribution' || context === 'degen_split_lock' || context === 'spend_split_payment') {
          if (splitWalletId) {
            const { SplitWalletService } = await import('../../services/split');
            const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
            if (walletResult.success && walletResult.wallet?.walletAddress) {
              setLoadedRecipientAddress(walletResult.wallet.walletAddress);
              logger.info('Loaded split wallet address', {
                splitWalletId,
                address: walletResult.wallet.walletAddress
              }, 'CentralizedTransactionScreen');
            }
          }
        } else if (context === 'shared_wallet_funding' || context === 'shared_wallet_withdrawal') {
          if (sharedWalletId) {
            // For shared wallets, the ID is the address identifier
            // The actual wallet address will be resolved by the transaction handler
            setLoadedRecipientAddress(sharedWalletId);
            logger.info('Shared wallet context', { sharedWalletId }, 'CentralizedTransactionScreen');
          }
        }
      } catch (error) {
        logger.warn('Failed to load recipient address', { error }, 'CentralizedTransactionScreen');
        setLoadedRecipientAddress(null);
      }
    };

    loadRecipientAddress();
  }, [context, splitWalletId, sharedWalletId, customRecipientInfo]);

  // Update recipient info with loaded address
  const finalRecipientInfo = useMemo(() => {
    if (!recipientInfo) return null;
    
    // If address is empty but we loaded one, use it
    if ((!recipientInfo.walletAddress || recipientInfo.walletAddress === '') && loadedRecipientAddress) {
      return {
        ...recipientInfo,
        address: loadedRecipientAddress,
        walletAddress: loadedRecipientAddress
      };
    }
    
    return recipientInfo;
  }, [recipientInfo, loadedRecipientAddress]);

  // Initialize wallet on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletBalance && !liveBalance) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletBalance, liveBalance, ensureAppWallet]);

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
      context
    };

    switch (context) {
      case 'send_1to1':
        if (!finalRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'send_1to1',
          destinationType: contact ? 'friend' : 'external',
          recipientAddress: finalRecipientInfo.walletAddress,
          recipientInfo: {
            name: finalRecipientInfo.name,
            email: finalRecipientInfo.address,
            avatar: finalRecipientInfo.avatar
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
        if (!splitWalletId || !finalRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'fair_split_withdrawal',
          sourceType: 'split_wallet',
          destinationType: 'external',
          splitWalletId,
          destinationAddress: finalRecipientInfo.walletAddress,
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
        if (!sharedWalletId || !finalRecipientInfo?.walletAddress) return null;
        return {
          ...baseParams,
          context: 'shared_wallet_withdrawal',
          sourceType: 'shared_wallet',
          destinationType: 'external',
          sharedWalletId,
          destinationAddress: finalRecipientInfo.walletAddress,
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

      // ✅ CRITICAL: Detect timeout errors and provide helpful guidance
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                       errorMessage.toLowerCase().includes('timed out') ||
                       errorMessage.toLowerCase().includes('deadline exceeded');
      
      if (isTimeout) {
        // Timeout error - transaction may have succeeded
        const timeoutMessage = 'Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history before trying again.';
        logger.warn('Transaction timeout detected', {
          context,
          amount: parseFloat(amount.replace(',', '.')),
          note: 'Transaction may have succeeded despite timeout'
        }, 'CentralizedTransactionScreen');
        
        Alert.alert('Transaction Timeout', timeoutMessage);
      } else {
        // Regular error
        Alert.alert('Transaction Error', errorMessage);
      }
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
      const numAmount = parseFloat(amount.replace(',', '.'));
      if (amount && numAmount > 0) {
        handleExecuteTransaction();
      }
    }
  }, [contact, prefilledAmount, currentUser?.id, amount]);

  // Calculate network fee (3%)
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const networkFee = numAmount * 0.03; // 3% network fee
  const totalPaid = numAmount + networkFee;

  const isAmountValid = amount.length > 0 && numAmount > 0;
  const canExecute = isAmountValid && !isProcessing && !validationError;

  // Determine recipient display name - never show "N/A"
  const getRecipientDisplayName = () => {
    if (!finalRecipientInfo) return '';
    
    // For merchant, split, or shared types, use the name directly
    if (finalRecipientInfo.type === 'merchant' || 
        finalRecipientInfo.type === 'split' || 
        finalRecipientInfo.type === 'shared') {
      return finalRecipientInfo.name || 'Recipient';
    }
    
    // For friend/external transfers, use recipient name (never "Order #N/A")
    if (finalRecipientInfo.name && finalRecipientInfo.name !== 'N/A') {
      return finalRecipientInfo.name;
    }
    
    // Fallback: use wallet address if name is not available
    if (finalRecipientInfo.walletAddress) {
      return formatWalletAddress(finalRecipientInfo.walletAddress);
    }
    
    // Last resort: use contact name or generic
    return contact?.name || 'Recipient';
  };

  return (
    <Container>
      <Header
        title={config.title}
        onBackPress={() => navigation.goBack()}
      />

      {config.subtitle && (
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      )}

      <View style={paymentScreenStyles.container}>
        {/* Send to Section */}
          {finalRecipientInfo && (
          <View style={paymentScreenStyles.sendToSection}>
            <Text style={paymentScreenStyles.sendToLabel}>Send to</Text>
            <View style={paymentScreenStyles.recipientCard}>
              <View style={paymentScreenStyles.recipientIcon}>
                {finalRecipientInfo.type === 'merchant' ? (
                  <Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }}
                    style={{ width: 24, height: 24 }}
                  />
                ) : finalRecipientInfo.type === 'friend' && finalRecipientInfo.avatar ? (
                  <Avatar
                    userId={contact?.id?.toString() || ''}
                    userName={finalRecipientInfo.name}
                    size={24}
                    avatarUrl={finalRecipientInfo.avatar}
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                ) : finalRecipientInfo.type === 'split' ? (
                  <PhosphorIcon name="Users" size={24} color={colors.white} weight="fill" />
                ) : finalRecipientInfo.type === 'shared' ? (
                  <PhosphorIcon name="Wallet" size={24} color={colors.white} weight="fill" />
                ) : (
                  <PhosphorIcon name="CurrencyDollar" size={24} color={colors.white} weight="fill" />
                )}
              </View>
              <View style={paymentScreenStyles.recipientInfo}>
                <Text style={paymentScreenStyles.recipientOrder}>
                  {getRecipientDisplayName()}
                </Text>
                {finalRecipientInfo.walletAddress && (
                  <Text style={paymentScreenStyles.recipientAddress}>
                    {formatWalletAddress(finalRecipientInfo.walletAddress)}
                </Text>
              )}
              </View>
            </View>
            </View>
          )}

        {/* Amount Input Area */}
          {config.showAmountInput && (
          <View style={paymentScreenStyles.amountSection}>
            <TextInput
              ref={amountInputRef}
              style={paymentScreenStyles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
              onFocus={() => setIsAmountFocused(true)}
              onBlur={() => setIsAmountFocused(false)}
              keyboardType="decimal-pad"
              returnKeyType="done"
                  placeholder="0"
              placeholderTextColor={colors.white70}
              selectTextOnFocus
                  editable={!isProcessing && context !== 'spend_split_payment'}
            />
            <Text style={paymentScreenStyles.amountCurrency}>USDC</Text>
            {config.showMemoInput && !showNote && (
              <TouchableOpacity onPress={() => setShowNote(true)} style={paymentScreenStyles.addNoteButton}>
                <Text style={paymentScreenStyles.addNoteText}>Add note</Text>
                    </TouchableOpacity>
            )}
            {config.showMemoInput && showNote && (
                      <TextInput
                style={paymentScreenStyles.noteInput}
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
        <View style={paymentScreenStyles.walletCard}>
          <View style={paymentScreenStyles.walletIcon}>
            <PhosphorIcon name="Wallet" size={24} color={colors.white} weight="fill" />
          </View>
          <View style={paymentScreenStyles.walletInfo}>
            <Text style={paymentScreenStyles.walletName}>WeSplit Wallet</Text>
            <Text style={paymentScreenStyles.walletBalance}>
              Balance {effectiveBalance !== null && effectiveBalance !== undefined ? formatAmountWithComma(effectiveBalance) : '0,00'} USDC
            </Text>
          </View>
          {config.allowExternalDestinations && (
            <TouchableOpacity 
              style={[
                paymentScreenStyles.changeButton,
                (isProcessing) && paymentScreenStyles.changeButtonDisabled,
              ]}
              onPress={() => {
                // Handle wallet change
              }}
              disabled={isProcessing}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[paymentScreenStyles.changeButtonText, (isProcessing) && paymentScreenStyles.changeButtonTextDisabled]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Balance Error */}
        {validationError && (
          <View style={paymentScreenStyles.errorCard}>
            <Text style={paymentScreenStyles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Network Fee and Total */}
        {config.showAmountInput && (
          <View style={paymentScreenStyles.feeSection}>
            <View style={paymentScreenStyles.feeRow}>
              <Text style={paymentScreenStyles.feeLabel}>Network Fee (3%)</Text>
              <Text style={paymentScreenStyles.feeAmount}>{formatAmountWithComma(networkFee)} USDC</Text>
            </View>
            <View style={paymentScreenStyles.feeRow}>
              <Text style={paymentScreenStyles.feeLabel}>Total paid</Text>
              <Text style={paymentScreenStyles.feeTotal}>{formatAmountWithComma(totalPaid)} USDC</Text>
            </View>
            </View>
          )}

          {/* Processing Indicator for Auto-Transactions */}
          {context === 'spend_split_payment' && isProcessing && (
          <View style={paymentScreenStyles.processingContainer}>
              <ModernLoader size="small" text="Processing payment to merchant..." />
            </View>
          )}

        {/* Send Button */}
        {config.showAmountInput && (
          <TouchableOpacity
            style={[
              paymentScreenStyles.sendButton,
              (!canExecute || isProcessing) && paymentScreenStyles.sendButtonDisabled,
            ]}
            onPress={handleExecuteTransaction}
            disabled={!canExecute || isProcessing}
          >
            <Text style={paymentScreenStyles.sendButtonText}>
              {isProcessing ? 'Processing...' : 'Send'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Container>
  );
};

const paymentScreenStyles = StyleSheet.create({
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

export default CentralizedTransactionScreen;
