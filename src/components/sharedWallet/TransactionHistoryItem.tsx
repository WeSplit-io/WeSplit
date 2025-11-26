/**
 * Transaction History Item Component
 * Displays a single transaction - supports both shared wallet and split transactions
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { PhosphorIcon } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  getTransactionIconName,
  getTransactionTypeLabel,
  isIncomeTransaction,
  isExpenseTransaction,
} from '../../utils/transactionDisplayUtils';

// Unified transaction interface that supports both shared wallet and split transactions
export interface UnifiedTransaction {
  id?: string;
  firebaseDocId?: string;
  // Transaction type - supports both shared wallet and split types
  type: 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund';
  amount: number;
  currency: string;
  // User information - supports different field names
  userName?: string; // For shared wallets
  senderName?: string; // For splits
  recipientName?: string; // For splits
  from_user?: string; // For splits
  to_user?: string; // For splits
  // Wallet addresses for identifying split wallets and external destinations
  from_wallet?: string;
  to_wallet?: string;
  // Split information
  splitId?: string;
  splitName?: string;
  splitWalletId?: string;
  // External destination flags
  isExternalCard?: boolean;
  isExternalWallet?: boolean;
  // Additional fields
  memo?: string;
  note?: string; // Alternative to memo
  status: 'confirmed' | 'pending' | 'failed' | 'completed';
  createdAt: string | Date;
  created_at?: string | Date; // Alternative field name
  // Optional transaction signature/hash
  transactionSignature?: string;
  tx_hash?: string;
}

interface TransactionHistoryItemProps {
  transaction: UnifiedTransaction;
  onPress?: () => void;
  variant?: 'sharedWallet' | 'split'; // Optional variant to customize display
}

const TransactionHistoryItem: React.FC<TransactionHistoryItemProps> = ({
  transaction,
  onPress,
  variant = 'sharedWallet',
}) => {
  const formatDate = useMemo(() => {
    return (date: string | Date | undefined) => {
      if (!date) return 'Unknown date';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
  }, []);

  // Get the display name for the user
  const getUserDisplayName = useMemo(() => {
    if (variant === 'split') {
      // For splits, use sender/recipient names
      if (transaction.type === 'send' || transaction.type === 'payment') {
        return transaction.recipientName || transaction.to_user || 'Unknown';
      } else if (transaction.type === 'receive' || transaction.type === 'deposit') {
        return transaction.senderName || transaction.from_user || 'Unknown';
      }
    }
    // For shared wallets, use userName
    return transaction.userName || 'Unknown';
  }, [transaction, variant]);

  // Get the display subtitle (destination/source info)
  const getDisplaySubtitle = useMemo(() => {
    // For withdrawals, show destination type or split name if withdrawing from split
    if (transaction.type === 'withdrawal') {
      // If withdrawing FROM a split wallet, show split name
      if (transaction.splitName) {
        return transaction.splitName;
      }
      // Otherwise show destination type
      if (transaction.isExternalCard) {
        return 'External Card';
      } else if (transaction.isExternalWallet) {
        return 'External Wallet';
      }
      return 'Wallet';
    }
    
    // For sends/payments, show destination or source
    if (transaction.type === 'send' || transaction.type === 'payment') {
      // If sending TO a split wallet (funding), show split name
      if (transaction.splitName && transaction.to_wallet) {
        // Check if the split wallet is the destination
        const isFundingSplit = transaction.to_wallet && transaction.splitWalletId;
        if (isFundingSplit) {
          return transaction.splitName;
        }
      }
      // If withdrawing FROM a split wallet, show split name
      if (transaction.splitName && transaction.from_wallet) {
        const isWithdrawingFromSplit = transaction.from_wallet && transaction.splitWalletId;
        if (isWithdrawingFromSplit) {
          return transaction.splitName;
        }
      }
      // If we have external destination info, show it
      if (transaction.isExternalCard) {
        return 'External Card';
      } else if (transaction.isExternalWallet) {
        return 'External Wallet';
      }
      // Fallback to recipient name or "Unknown User"
      return transaction.recipientName || 'Unknown User';
    }
    
    // For receives/deposits, show source (receiving FROM split wallet)
    if (transaction.type === 'receive' || transaction.type === 'deposit') {
      if (transaction.splitName) {
        return transaction.splitName;
      }
      return transaction.senderName || 'Unknown User';
    }
    
    // Default: show memo/note if available
    return transaction.memo || transaction.note || '';
  }, [transaction]);

  // Get the memo/note text
  const getMemoText = useMemo(() => {
    return transaction.memo || transaction.note;
  }, [transaction.memo, transaction.note]);

  // Get the date
  const getDate = useMemo(() => {
    return transaction.createdAt || transaction.created_at;
  }, [transaction.createdAt, transaction.created_at]);

  const getIconName = () => {
    // Map to Phosphor icon names used in this component
    const iconMap: Record<string, string> = {
      funding: 'ArrowDown',
      deposit: 'ArrowDown',
      receive: 'ArrowDown',
      withdrawal: 'ArrowUp',
      send: 'ArrowUp',
      payment: 'ArrowUp',
      refund: 'ArrowCounterClockwise',
    };
    return iconMap[transaction.type] || 'ArrowsClockwise';
  };

  const getIconColor = () => {
    if (isIncomeTransaction(transaction.type)) {
      return colors.green;
    } else if (isExpenseTransaction(transaction.type)) {
      return colors.red;
    }
    return colors.white70;
  };

  const getTypeLabel = () => {
    return getTransactionTypeLabel(transaction.type);
  };

  const getStatusStyle = () => {
    switch (transaction.status) {
      case 'confirmed':
        return styles.transactionStatusConfirmed;
      case 'pending':
        return styles.transactionStatusPending;
      default:
        return styles.transactionStatusFailed;
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      default:
        return 'Failed';
    }
  };

  const amountColor = useMemo(() => {
    if (isIncomeTransaction(transaction.type)) {
      return colors.green;
    } else if (isExpenseTransaction(transaction.type)) {
      return colors.red;
    }
    return colors.white;
  }, [transaction.type]);

  const amountPrefix = useMemo(() => {
    if (isIncomeTransaction(transaction.type)) {
      return '+';
    } else if (isExpenseTransaction(transaction.type)) {
      return '-';
    }
    return '';
  }, [transaction.type]);

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={styles.transactionRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.transactionIconContainer}>
        <PhosphorIcon
          name={getIconName()}
          size={20}
          color={getIconColor()}
          weight="bold"
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionType}>{getTypeLabel()}</Text>
        <Text style={styles.transactionUser}>{getDisplaySubtitle}</Text>
        {getMemoText && getDisplaySubtitle !== getMemoText && (
          <Text style={styles.transactionMemo} numberOfLines={1}>
            {getMemoText}
          </Text>
        )}
        <Text style={styles.transactionDate}>
          {formatDate(getDate)}
        </Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[styles.transactionAmount, { color: amountColor }]}>
          {amountPrefix}
          {formatBalance(transaction.amount, transaction.currency)}
        </Text>
        <View style={[styles.transactionStatusBadge, getStatusStyle()]}>
          <Text style={styles.transactionStatusText}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </Component>
  );
};

const styles = StyleSheet.create({
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  transactionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  transactionType: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  transactionUser: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  transactionMemo: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontStyle: 'italic',
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginTop: spacing.xs / 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs / 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  transactionStatusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.xs / 2,
  },
  transactionStatusConfirmed: {
    backgroundColor: colors.greenBlue20,
  },
  transactionStatusPending: {
    backgroundColor: colors.white10,
  },
  transactionStatusFailed: {
    backgroundColor: colors.red + '20',
  },
  transactionStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
});

export default TransactionHistoryItem;

