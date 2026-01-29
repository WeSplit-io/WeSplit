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
import { useApp } from '../../context/AppContext';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

// Normalize error messages so dev-only bundle failures don't look like on-chain
// transaction errors. This is especially important when Metro/Expo crashes with
// messages like \"Could not load bundle\" while the transaction actually succeeded.
export const normalizeTransactionErrorMessage = (message: string): string => {
  if (!message) return message;
  const lower = message.toLowerCase();

  const devBundleIndicators = [
    'could not load bundle',
    'unable to load bundle',
    'unable to resolve host',
    'could not connect to development server',
    'metro has encountered an error'
  ];

  if (devBundleIndicators.some(snippet => lower.includes(snippet))) {
    return 'Development bundle crashed or disconnected. The transaction may have already been submitted. Please refresh and check your balances before retrying.';
  }

  return message;
};

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
  // Optional: Direct transaction parameters (will override props if provided)
  splitWalletId?: string;
  splitId?: string;
  billId?: string;
  sharedWalletId?: string;
  recipientAddress?: string;
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
  // ✅ FIX: Track loading state for shared wallet data to prevent premature button clicks
  const [isLoadingSharedWalletData, setIsLoadingSharedWalletData] = useState(false);

  // ✅ CRITICAL: Prevent multiple transaction executions (debouncing)
  const isExecutingRef = useRef(false);
  // Track if auto-execution has been attempted (prevents infinite loops)
  const hasAutoExecutedRef = useRef(false);

  // Get currentUser from props or AppContext
  const { state: appState } = useApp();
  const currentUser = propCurrentUser || appState?.currentUser;
  const { appWalletBalance, ensureAppWallet } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Use config values if provided, otherwise fall back to props
  const effectiveSplitWalletId = config.splitWalletId || splitWalletId;
  const effectiveSplitId = config.splitId || splitId;
  const effectiveBillId = config.billId || billId;
  const effectiveSharedWalletId = config.sharedWalletId || sharedWalletId;
  const effectiveRecipientAddress = config.recipientAddress || recipientAddress;

  // Load wallet address on mount and when modal becomes visible
  useEffect(() => {
    const loadWalletAddress = async () => {
      if (!currentUser?.id) return;

      try {
        const { simplifiedWalletService } = await import('../../services/blockchain/wallet/simplifiedWalletService');
        const walletInfo = await simplifiedWalletService.getWalletInfo(currentUser.id.toString());
        if (walletInfo) {
          setWalletAddress(walletInfo.address);
          logger.debug('Wallet address loaded for balance', {
            userId: currentUser.id,
            address: walletInfo.address
          }, 'CentralizedTransactionModal');
        }
      } catch (error) {
        logger.error('Failed to load wallet address for balance', { userId: currentUser.id, error }, 'CentralizedTransactionModal');
      }
    };

    // Load immediately and also when modal becomes visible
    if (visible || !walletAddress) {
      loadWalletAddress();
    }
  }, [currentUser?.id, visible]);

  // Live balance for real-time updates
  const { balance: liveBalance } = useLiveBalance(
    walletAddress,
    {
      enabled: !!walletAddress,
    }
  );

  // Reset amount and note when config or visible changes (matching screen behavior)
  useEffect(() => {
    if (!visible) {
      // Reset auto-execution flag when modal closes
      hasAutoExecutedRef.current = false;
      return;
    }
    
    // Reset form when modal becomes visible
    if (config.prefilledAmount && config.prefilledAmount > 0) {
      setAmount(formatAmountWithComma(config.prefilledAmount));
    } else {
      setAmount('0');
    }
    setNote(config.prefilledNote || '');
    setValidationError(null);
    // Reset auto-execution flag when modal opens with new config
    hasAutoExecutedRef.current = false;
  }, [visible, config.prefilledAmount, config.prefilledNote, config.context]);

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
  // For withdrawals, we need the shared wallet balance, not the user's wallet balance
  const [sharedWalletBalance, setSharedWalletBalance] = useState<number | null>(null);
  const [sharedWalletAddress, setSharedWalletAddress] = useState<string | null>(null);
  const [userAvailableBalance, setUserAvailableBalance] = useState<number | null>(null); // ✅ FIX: Track user's available balance for withdrawal
  const [fallbackBalance, setFallbackBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  useEffect(() => {
    // Reset balance and address when modal closes or context changes
    if (!visible || config.context !== 'shared_wallet_withdrawal') {
      setSharedWalletBalance(null);
      setSharedWalletAddress(null);
      setUserAvailableBalance(null);
      setIsLoadingSharedWalletData(false); // ✅ FIX: Reset loading state for all contexts, not just withdrawal
      return;
    }

    if (config.context === 'shared_wallet_withdrawal' && effectiveSharedWalletId && currentUser?.id) {
      const loadSharedWalletData = async () => {
        setIsLoadingSharedWalletData(true);
        try {
          const { SharedWalletService } = await import('../../services/sharedWallet');
          const result = await SharedWalletService.getSharedWallet(effectiveSharedWalletId);
          if (result.success && result.wallet) {
            const balance = result.wallet.totalBalance || 0;
            const address = result.wallet.walletAddress || null; // Get on-chain address, not ID
            setSharedWalletBalance(balance);
            setSharedWalletAddress(address);
            
            // ✅ FIX: Use standardized balance calculation (pool-based approach)
            const userMember = result.wallet.members?.find(m => m.userId === currentUser.id.toString());
            if (userMember) {
              const { MemberRightsService } = await import('../../services/sharedWallet/MemberRightsService');
              const balanceResult = MemberRightsService.getAvailableBalance(userMember, result.wallet);
              
              const available = balanceResult.error ? 0 : balanceResult.availableBalance;
              setUserAvailableBalance(available);
              
              logger.info('Shared wallet data loaded for withdrawal', {
                sharedWalletId: effectiveSharedWalletId,
                totalBalance: balance,
                userAvailableBalance: available,
                walletAddress: address
              }, 'CentralizedTransactionModal');
            } else {
              setUserAvailableBalance(0);
              logger.warn('User not found in shared wallet members', {
                sharedWalletId: effectiveSharedWalletId,
                userId: currentUser.id
              }, 'CentralizedTransactionModal');
            }
          } else {
            logger.error('Failed to get shared wallet', { sharedWalletId: effectiveSharedWalletId }, 'CentralizedTransactionModal');
            setSharedWalletBalance(0);
            setSharedWalletAddress(null);
            setUserAvailableBalance(0);
          }
        } catch (error) {
          logger.error('Failed to load shared wallet data', { error, sharedWalletId: effectiveSharedWalletId }, 'CentralizedTransactionModal');
          setSharedWalletBalance(0);
          setSharedWalletAddress(null);
          setUserAvailableBalance(0);
        } finally {
          setIsLoadingSharedWalletData(false);
        }
      };
      loadSharedWalletData();
    } else {
      setIsLoadingSharedWalletData(false);
      setUserAvailableBalance(null);
    }
  }, [visible, config.context, effectiveSharedWalletId]);

  // CRITICAL FIX: Fetch balance as fallback if liveBalance and appWalletBalance are both missing
  useEffect(() => {
    if (!visible || !currentUser?.id) {
      setFallbackBalance(null);
      return;
    }

    // Only fetch if both liveBalance and appWalletBalance are missing
    const needsFallback = (liveBalance?.usdcBalance === null || liveBalance?.usdcBalance === undefined) && 
                          (appWalletBalance === null || appWalletBalance === undefined || appWalletBalance === 0);
    
    if (needsFallback && !isLoadingBalance && !fallbackBalance) {
      setIsLoadingBalance(true);
      const fetchBalance = async () => {
        try {
          const { getUserBalanceWithFallback } = await import('../../services/shared/balanceCheckUtils');
          const balanceResult = await getUserBalanceWithFallback(currentUser.id.toString(), {
            useLiveBalance: true,
            walletAddress: walletAddress || undefined
          });
          
          if (balanceResult.usdcBalance !== null && balanceResult.usdcBalance !== undefined) {
            setFallbackBalance(balanceResult.usdcBalance);
            logger.info('Balance fetched as fallback', {
              userId: currentUser.id,
              balance: balanceResult.usdcBalance,
              source: balanceResult.source
            }, 'CentralizedTransactionModal');
          }
        } catch (error) {
          logger.error('Failed to fetch fallback balance', {
            userId: currentUser.id,
            error: error instanceof Error ? error.message : String(error)
          }, 'CentralizedTransactionModal');
        } finally {
          setIsLoadingBalance(false);
        }
      };
      
      fetchBalance();
    }
  }, [visible, currentUser?.id, liveBalance?.usdcBalance, appWalletBalance, walletAddress, isLoadingBalance, fallbackBalance]);

  // Determine effective balance with proper fallback chain
  const effectiveBalance = (() => {
    // For shared wallet withdrawal, use shared wallet balance
    if (config.context === 'shared_wallet_withdrawal' && sharedWalletBalance !== null) {
      return sharedWalletBalance;
    }
    
    // Priority: liveBalance > appWalletBalance > fallbackBalance > 0
    if (liveBalance?.usdcBalance !== null && liveBalance?.usdcBalance !== undefined) {
      return liveBalance.usdcBalance;
    }
    
    if (appWalletBalance !== null && appWalletBalance !== undefined) {
      return appWalletBalance;
    }
    
    if (fallbackBalance !== null && fallbackBalance !== undefined) {
      return fallbackBalance;
    }
    
    return 0;
  })();

  // Determine recipient information - matching screen logic
  const getRecipientInfo = () => {
    // Custom recipient info takes precedence
    if (config.customRecipientInfo) {
      // Fill address from config, props, or context-specific sources
      let address = config.customRecipientInfo.address;
      if (!address || address === '') {
        // Try to get address from config or props based on context
        if (config.context === 'fair_split_contribution' || config.context === 'degen_split_lock' || config.context === 'spend_split_payment') {
          // For split contexts, try to get from config, props, or split wallet address
          address = effectiveRecipientAddress || '';
          
          // If still empty and we have splitWalletId, try to load the wallet address
          if (!address && effectiveSplitWalletId) {
            // Address will be resolved when split wallet is loaded
            // For now, use the splitWalletId as a placeholder
            address = effectiveSplitWalletId;
          }
        } else if (config.context === 'shared_wallet_funding') {
          // For shared wallet funding, use sharedWalletId as address identifier (destination is shared wallet)
          address = effectiveSharedWalletId || effectiveRecipientAddress || '';
        } else if (config.context === 'shared_wallet_withdrawal') {
          // For shared wallet withdrawal, destination is user's wallet (not shared wallet)
          // Use customRecipientInfo.address if provided, otherwise fall back to recipientAddress
          address = config.customRecipientInfo?.address || effectiveRecipientAddress || '';
        } else {
          // For other contexts (including send_1to1), use recipientAddress
          address = effectiveRecipientAddress || '';
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

    // Route-provided recipient info (matching screen)
    if (recipientInfo) {
      return recipientInfo;
    }

    // Contact-based recipient (matching screen logic)
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

    // Wallet-based recipient (matching screen logic)
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

  // Load split/shared wallet address if needed (matching screen behavior)
  const [loadedRecipientAddress, setLoadedRecipientAddress] = useState<string | null>(null);
  
  useEffect(() => {
    const loadRecipientAddress = async () => {
      // Only load if customRecipientInfo has empty address and we have splitWalletId or sharedWalletId
      if (!config.customRecipientInfo || config.customRecipientInfo.address) {
        setLoadedRecipientAddress(null);
        return;
      }

      try {
        if (config.context === 'fair_split_contribution' || config.context === 'degen_split_lock' || config.context === 'spend_split_payment') {
          if (effectiveSplitWalletId) {
            const { SplitWalletService } = await import('../../services/split');
            const walletResult = await SplitWalletService.getSplitWallet(effectiveSplitWalletId);
            if (walletResult.success && walletResult.wallet?.walletAddress) {
              setLoadedRecipientAddress(walletResult.wallet.walletAddress);
              logger.info('Loaded split wallet address', {
                splitWalletId: effectiveSplitWalletId,
                address: walletResult.wallet.walletAddress
              }, 'CentralizedTransactionModal');
            }
          }
        } else if (config.context === 'shared_wallet_funding') {
          if (effectiveSharedWalletId) {
            // For shared wallet funding, the ID is the address identifier (destination is shared wallet)
            // The actual wallet address will be resolved by the transaction handler
            setLoadedRecipientAddress(effectiveSharedWalletId);
            logger.info('Shared wallet funding context', { sharedWalletId: effectiveSharedWalletId }, 'CentralizedTransactionModal');
          }
        } else if (config.context === 'shared_wallet_withdrawal') {
          // For shared wallet withdrawal, destination is user's wallet
          // Use customRecipientInfo.address if provided (should be user's wallet address)
          if (config.customRecipientInfo?.address) {
            setLoadedRecipientAddress(config.customRecipientInfo.address);
            logger.info('Shared wallet withdrawal - using custom recipient address', { 
              address: config.customRecipientInfo.address 
            }, 'CentralizedTransactionModal');
          } else if (effectiveRecipientAddress) {
            setLoadedRecipientAddress(effectiveRecipientAddress);
            logger.info('Shared wallet withdrawal - using recipient address from props', { 
              address: effectiveRecipientAddress 
            }, 'CentralizedTransactionModal');
          }
        }
      } catch (error) {
        logger.warn('Failed to load recipient address', { error }, 'CentralizedTransactionModal');
        setLoadedRecipientAddress(null);
      }
    };

    if (visible) {
      loadRecipientAddress();
    }
  }, [visible, config.context, effectiveSplitWalletId, effectiveSharedWalletId, config.customRecipientInfo]);

  // Update recipient info with loaded address (matching screen behavior)
  const finalRecipientInfo = useMemo(() => {
    if (!displayRecipientInfo) return null;
    
    // If address is empty but we loaded one, use it
    if ((!displayRecipientInfo.walletAddress || displayRecipientInfo.walletAddress === '') && loadedRecipientAddress) {
      return {
        ...displayRecipientInfo,
        address: loadedRecipientAddress,
        walletAddress: loadedRecipientAddress
      };
    }
    
    return displayRecipientInfo;
  }, [displayRecipientInfo, loadedRecipientAddress]);

  // Initialize wallet on mount (matching screen behavior)
  useEffect(() => {
    if (currentUser?.id && !appWalletBalance && !liveBalance) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletBalance, liveBalance, ensureAppWallet]);

  // Build transaction parameters with better validation and error messages
  const buildTransactionParams = (): TransactionParams | null => {
    if (!currentUser?.id) {
      logger.error('Cannot build transaction params: currentUser is missing', {
        context: config.context,
        hasPropCurrentUser: !!propCurrentUser,
        hasAppStateUser: !!appState?.currentUser
      }, 'CentralizedTransactionModal');
      return null;
    }

    // Parse amount with comma replaced by period for calculation
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      logger.warn('Invalid amount for transaction', {
        context: config.context,
        amount,
        parsedAmount: numAmount
      }, 'CentralizedTransactionModal');
      return null;
    }

    const baseParams = {
      userId: currentUser.id.toString(),
      amount: numAmount,
      currency: 'USDC',
      memo: note.trim(),
      context: config.context
    };

    switch (config.context) {
      case 'send_1to1':
        if (!finalRecipientInfo?.walletAddress) {
          logger.error('Cannot build send_1to1 params: recipient wallet address is missing', {
            hasDisplayRecipientInfo: !!displayRecipientInfo,
            hasFinalRecipientInfo: !!finalRecipientInfo,
            hasWalletAddress: !!finalRecipientInfo?.walletAddress
          }, 'CentralizedTransactionModal');
          return null;
        }
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
        if (!effectiveSplitWalletId) {
          logger.error('Cannot build fair_split_contribution params: splitWalletId is missing', {
            configSplitWalletId: config.splitWalletId,
            propSplitWalletId: splitWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        return {
          ...baseParams,
          context: 'fair_split_contribution',
          destinationType: 'split_wallet',
          splitWalletId: effectiveSplitWalletId,
          splitId: effectiveSplitId,
          billId: effectiveBillId
        } as any;

      case 'fair_split_withdrawal':
        if (!effectiveSplitWalletId) {
          logger.error('Cannot build fair_split_withdrawal params: splitWalletId is missing', {
            configSplitWalletId: config.splitWalletId,
            propSplitWalletId: splitWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        if (!finalRecipientInfo?.walletAddress) {
          logger.error('Cannot build fair_split_withdrawal params: destination address is missing', {
            hasDisplayRecipientInfo: !!displayRecipientInfo,
            hasFinalRecipientInfo: !!finalRecipientInfo,
            hasWalletAddress: !!finalRecipientInfo?.walletAddress
          }, 'CentralizedTransactionModal');
          return null;
        }
        return {
          ...baseParams,
          context: 'fair_split_withdrawal',
          sourceType: 'split_wallet',
          destinationType: 'external',
          splitWalletId: effectiveSplitWalletId,
          destinationAddress: finalRecipientInfo.walletAddress,
          splitId: effectiveSplitId,
          billId: effectiveBillId
        } as any;

      case 'degen_split_lock':
        if (!effectiveSplitWalletId) {
          logger.error('Cannot build degen_split_lock params: splitWalletId is missing', {
            configSplitWalletId: config.splitWalletId,
            propSplitWalletId: splitWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        return {
          ...baseParams,
          context: 'degen_split_lock',
          destinationType: 'split_wallet',
          splitWalletId: effectiveSplitWalletId,
          splitId: effectiveSplitId,
          billId: effectiveBillId
        } as any;

      case 'spend_split_payment':
        if (!effectiveSplitId || !effectiveSplitWalletId) {
          logger.error('Cannot build spend_split_payment params: splitId or splitWalletId is missing', {
            configSplitId: config.splitId,
            propSplitId: splitId,
            configSplitWalletId: config.splitWalletId,
            propSplitWalletId: splitWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        if (!finalRecipientInfo?.walletAddress) {
          logger.error('Cannot build spend_split_payment params: merchant address is missing', {
            hasFinalRecipientInfo: !!finalRecipientInfo,
            hasWalletAddress: !!finalRecipientInfo?.walletAddress,
            hasDisplayRecipientInfo: !!displayRecipientInfo,
            customRecipientInfoAddress: config.customRecipientInfo?.address
          }, 'CentralizedTransactionModal');
          return null;
        }
        return {
          ...baseParams,
          context: 'spend_split_payment',
          destinationType: 'merchant',
          splitId: effectiveSplitId,
          splitWalletId: effectiveSplitWalletId,
          merchantAddress: finalRecipientInfo.walletAddress  // ✅ CRITICAL: Pass merchant address
        } as any;

      case 'shared_wallet_funding':
        if (!effectiveSharedWalletId) {
          logger.error('Cannot build shared_wallet_funding params: sharedWalletId is missing', {
            configSharedWalletId: config.sharedWalletId,
            propSharedWalletId: sharedWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        return {
          ...baseParams,
          context: 'shared_wallet_funding',
          destinationType: 'shared_wallet',
          sharedWalletId: effectiveSharedWalletId,
          sourceType: 'user_wallet'
        } as any;

      case 'shared_wallet_withdrawal':
        if (!effectiveSharedWalletId) {
          logger.error('Cannot build shared_wallet_withdrawal params: sharedWalletId is missing', {
            configSharedWalletId: config.sharedWalletId,
            propSharedWalletId: sharedWalletId
          }, 'CentralizedTransactionModal');
          return null;
        }
        // For shared wallet withdrawal, destination address is optional
        // The transaction handler will fetch user wallet address if not provided
        // This allows the transaction to proceed even if userWalletAddress hasn't loaded yet
        const destinationAddress = finalRecipientInfo?.walletAddress || config.customRecipientInfo?.address || effectiveRecipientAddress || undefined;
        
        if (destinationAddress && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(destinationAddress)) {
          // Invalid address format - let handler fetch it
          logger.warn('Invalid destination address format for withdrawal, handler will fetch user wallet', {
            providedAddress: destinationAddress
          }, 'CentralizedTransactionModal');
        }
        
        return {
          ...baseParams,
          context: 'shared_wallet_withdrawal',
          sourceType: 'shared_wallet',
          destinationType: 'external',
          sharedWalletId: effectiveSharedWalletId,
          destinationAddress: destinationAddress, // Can be undefined - handler will fetch
          destinationId: wallet?.id
        } as any;

      default:
        logger.error('Unknown transaction context', { context: config.context }, 'CentralizedTransactionModal');
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
      // Match screen behavior - show Alert for parameter building errors
      Alert.alert('Error', 'Unable to build transaction parameters');
      logger.error('Failed to build transaction parameters', {
        context: config.context,
        hasCurrentUser: !!currentUser?.id,
        hasSplitWalletId: !!effectiveSplitWalletId,
        hasSplitId: !!effectiveSplitId,
        hasSharedWalletId: !!effectiveSharedWalletId,
        hasRecipientInfo: !!displayRecipientInfo
      }, 'CentralizedTransactionModal');
      return;
    }

    // ✅ CRITICAL: Set loading state IMMEDIATELY (before validation for faster UX)
    // This ensures user sees loading feedback right away
    isExecutingRef.current = true;
    setIsProcessing(true);
    setValidationError(null);

    // Validate transaction (fast check, should complete quickly)
    const validation = await centralizedTransactionHandler.validateTransaction(params);
    if (!validation.canExecute) {
      setIsProcessing(false);
      isExecutingRef.current = false;
      // Match screen behavior - show Alert for validation errors
      const normalized = normalizeTransactionErrorMessage(
        validation.error || 'Transaction validation failed'
      );
      Alert.alert('Transaction Error', normalized);
      return;
    }

    try {
      logger.info('Calling centralized transaction handler', {
        context: params.context,
        amount: params.amount,
        userId: params.userId
      }, 'CentralizedTransactionModal');

      const result = await centralizedTransactionHandler.executeTransaction(params);

      // Treat on-chain success (signature present) as success even if backend returns success=false
      const effectiveSuccess = result.success || !!result.transactionSignature;

      logger.info('Transaction handler returned', {
        context: params.context,
        success: result.success,
        effectiveSuccess,
        hasSignature: !!result.transactionSignature,
        error: result.error?.substring(0, 100)
      }, 'CentralizedTransactionModal');

      if (effectiveSuccess) {
        // Call success callback if provided
        if (config.onSuccess) {
          config.onSuccess(result);
        } else {
          // Default success behavior
          Alert.alert('Success', result.message || 'Transaction completed successfully');
        }
      } else {
        // Use structured error classification when available
        const rawError = result.error || 'Unknown error occurred';
        const errorKind = result.errorKind || 'definite_failure';

        if (errorKind === 'definite_failure') {
          const normalizedError = normalizeTransactionErrorMessage(rawError);
          const message = `Your transaction was rejected: ${normalizedError}`;
          if (config.onError) {
            config.onError(message);
          } else {
            Alert.alert('Transaction Failed', message);
          }
        } else if (errorKind === 'transient') {
          const friendlyMessage =
            'Our transaction service is temporarily busy. Your funds were not moved. Please wait a few seconds and try again.';

          logger.warn('Transient backend error detected for transaction', {
            context: params.context,
            userId: params.userId,
            error: rawError.substring(0, 200),
          }, 'CentralizedTransactionModal');

          if (config.onError) {
            config.onError(friendlyMessage);
          } else {
            Alert.alert('Service temporarily unavailable', friendlyMessage);
          }
        } else {
          // uncertain_success
          const baseMessage =
            'We could not confirm this transaction yet. It may still complete on the blockchain. Please check your history before retrying.';

          const explorerHint =
            result.transactionSignature
              ? `\n\nTransaction signature: ${result.transactionSignature}`
              : '';

          const message = `${baseMessage}${explorerHint}`;

          logger.warn('Uncertain transaction result reported to user', {
            context: params.context,
            userId: params.userId,
            error: rawError.substring(0, 200),
            transactionSignature: result.transactionSignature
          }, 'CentralizedTransactionModal');

          if (config.onError) {
            config.onError(message);
          } else {
            Alert.alert('Transaction Pending Confirmation', message);
          }
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
        // Regular error - normalize dev-only bundle failures
        const normalizedError = normalizeTransactionErrorMessage(errorMessage);
        if (config.onError) {
          config.onError(normalizedError);
        } else {
          Alert.alert('Transaction Error', normalizedError);
        }
      }
    } finally {
      // ✅ CRITICAL: Reset execution flag AFTER processing state
      setIsProcessing(false);
      isExecutingRef.current = false;
    }
  }, [amount, config.context, currentUser, finalRecipientInfo, contact, wallet, requestId, isSettlement, effectiveSplitWalletId, effectiveSplitId, effectiveBillId, effectiveSharedWalletId, centralizedTransactionHandler]);

  // ✅ REMOVED: Auto-execution for spend_split_payment
  // Transactions to split wallets should only occur when user explicitly triggers them
  // User must click the "Send" or "Confirm" button to execute the transaction

  // Calculate network fee (3%)
  // ✅ FIX: Shared wallet withdrawals have no fee (company covers fees)
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const isSharedWalletWithdrawal = config.context === 'shared_wallet_withdrawal';
  const networkFee = isSharedWalletWithdrawal ? 0 : numAmount * 0.03; // 3% network fee for other transactions, 0 for shared wallet withdrawals
  const totalPaid = numAmount + networkFee;

  const isAmountValid = amount.length > 0 && numAmount > 0;
  // ✅ FIX: Disable button while loading shared wallet data or processing
  const canExecute = isAmountValid && !isProcessing && !validationError && !isLoadingSharedWalletData;

  const handleClose = () => {
    // Ensure modal-specific processing state is cleared
    setIsProcessing(false);
    isExecutingRef.current = false;

    if (config.onClose) {
      config.onClose();
    }
  };

  // Map recipient info to SendComponent format (using finalRecipientInfo like screen)
  const sendComponentRecipientInfo: RecipientInfo | null = useMemo(() => {
    if (!finalRecipientInfo) return null;

  // Determine recipient display name - never show "N/A" (matching screen logic)
    let recipientName = '';
    
    // For merchant, split, or shared types, use the name directly
    if (finalRecipientInfo.type === 'merchant' || 
        finalRecipientInfo.type === 'split' || 
        finalRecipientInfo.type === 'shared') {
      recipientName = finalRecipientInfo.name || 'Recipient';
    }
    // For friend/external transfers, use recipient name (never "Order #N/A")
    else if (finalRecipientInfo.name && finalRecipientInfo.name !== 'N/A') {
      recipientName = finalRecipientInfo.name;
    }
    // Fallback: use wallet address if name is not available
    else if (finalRecipientInfo.walletAddress) {
      recipientName = formatWalletAddress(finalRecipientInfo.walletAddress);
    }
    // Last resort: use contact name or generic
    else {
      recipientName = contact?.name || 'Recipient';
    }
    
    // Determine icon and image based on type
    let icon: RecipientInfo['icon'];
    let iconColor: string | undefined;
    let imageUrl: string | undefined;

    if (finalRecipientInfo.type === 'merchant') {
      imageUrl = 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f';
    } else if (finalRecipientInfo.type === 'split') {
      icon = 'Users';
      iconColor = colors.blue;
    } else if (finalRecipientInfo.type === 'shared') {
      icon = 'Wallet';
      iconColor = colors.blue;
    } else if (finalRecipientInfo.type === 'friend') {
      // Friend type - will use Avatar component
    } else {
      icon = 'CurrencyDollar';
      iconColor = colors.green;
    }

    return {
      name: recipientName,
      address: finalRecipientInfo.walletAddress || finalRecipientInfo.address || '',
      avatarUrl: finalRecipientInfo.avatar,
      userId: contact?.id?.toString(),
      icon,
      iconColor,
      imageUrl,
    };
  }, [finalRecipientInfo, contact]);

  // Map wallet info to SendComponent format
  // For withdrawals, show shared wallet info; for other transactions, show user's wallet
  const walletInfo: WalletInfo = useMemo(() => {
    // For withdrawals, ALWAYS show the shared wallet as the source (sender)
    // This is the wallet we're withdrawing FROM
    // ✅ FIX: Show user's available balance (what they can withdraw) instead of total wallet balance
    if (config.context === 'shared_wallet_withdrawal' && effectiveSharedWalletId) {
      // Use user's available balance if calculated, otherwise show total balance as fallback
      const displayBalance = userAvailableBalance !== null ? userAvailableBalance : (sharedWalletBalance !== null ? sharedWalletBalance : 0);
      const balanceLabel = userAvailableBalance !== null 
        ? `Your Available: ${formatAmountWithComma(userAvailableBalance)}` 
        : 'Shared Wallet';
      
      return {
        name: balanceLabel,
        balance: displayBalance,
        balanceFormatted: formatAmountWithComma(displayBalance),
        icon: 'Wallet' as const,
        iconColor: colors.blue,
        imageUrl: undefined,
        address: sharedWalletAddress || undefined, // Show on-chain address, not wallet ID
      };
    }
    
    // Default: show user's personal wallet (for funding, sends, etc.)
    return {
      name: 'WeSplit Wallet',
      balance: effectiveBalance !== null && effectiveBalance !== undefined ? effectiveBalance : 0,
      balanceFormatted: effectiveBalance !== null && effectiveBalance !== undefined 
        ? formatAmountWithComma(effectiveBalance) 
        : '0,00',
      icon: 'Wallet' as const,
      iconColor: colors.green,
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwesplit-logo-new.png?alt=media&token=f42ea1b1-5f23-419e-a499-931862819cbf',
    };
  }, [effectiveBalance, config.context, effectiveSharedWalletId, sharedWalletBalance, sharedWalletAddress]);

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
  // Check if we need recipient info (showAmountInput OR prefilledAmount)
  const needsRecipientInfo = config.showAmountInput || (config.prefilledAmount && config.prefilledAmount > 0);
  if (!sendComponentRecipientInfo && needsRecipientInfo) {
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

        {/* Validation Error - Before SendComponent (matching screen order) */}
        {validationError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* SendComponent - Main UI */}
        {/* Show SendComponent if: showAmountInput is true OR we have a prefilled amount (for degen split, etc.) */}
        {sendComponentRecipientInfo && (config.showAmountInput || (config.prefilledAmount && config.prefilledAmount > 0)) && (
          <SendComponent
            recipient={sendComponentRecipientInfo}
            onRecipientChange={config.allowExternalDestinations ? handleRecipientChange : undefined}
            showRecipientChange={false}
            amount={amount}
            onAmountChange={config.showAmountInput ? handleAmountChange : () => {}}
            currency="USDC"
            note={note}
            onNoteChange={config.showMemoInput ? handleNoteChange : undefined}
            showAddNote={config.showMemoInput}
            wallet={walletInfo}
            onWalletChange={config.allowExternalDestinations ? handleWalletChange : undefined}
            showWalletChange={false}
            networkFee={networkFee}
            totalPaid={totalPaid}
            showNetworkFee={!isSharedWalletWithdrawal} // ✅ FIX: Hide fee display for shared wallet withdrawals
            onSendPress={handleExecuteTransaction}
            sendButtonDisabled={!canExecute || isProcessing || isLoadingSharedWalletData}
            sendButtonLoading={isProcessing || isLoadingSharedWalletData}
            sendButtonTitle={
              isLoadingSharedWalletData 
                ? 'Loading...' 
                : isProcessing 
                  ? 'Processing...' 
                  : (config.context === 'degen_split_lock' ? 'Lock Funds' : 'Send')
            }
            containerStyle={styles.sendComponentContainer}
          />
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
