/**
 * Transaction History Item Component
 * Displays a single transaction - supports both shared wallet and split transactions
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { PhosphorIcon, PhosphorIconName } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
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
  // Get the memo/note text
  const getMemoText = useMemo(() => {
    return transaction.memo || transaction.note;
  }, [transaction.memo, transaction.note]);

  // Get the date
  const getDate = useMemo(() => {
    return transaction.createdAt || transaction.created_at;
  }, [transaction.createdAt, transaction.created_at]);

  const getIconName = (): PhosphorIconName => {
    if (transaction.type === 'funding') {
      return 'ArrowLineDown';
    }
    if (transaction.type === 'withdrawal') {
      return 'ArrowLineUp';
    }
    // Map to Phosphor icon names used in this component
    const iconMap: Record<string, string> = {
      funding: 'ArrowLineDown',
      deposit: 'ArrowLineDown',
      receive: 'ArrowLineDown',
      withdrawal: 'ArrowLineUp',
      send: 'ArrowLineUp',
      payment: 'ArrowLineUp',
      refund: 'ArrowCounterClockwise',
    };
    return (iconMap[transaction.type] || 'ArrowsClockwise') as PhosphorIconName;
  };

  const getIconColor = () => {
    if (transaction.type === 'funding' || transaction.type === 'withdrawal') {
      return colors.white;
    }
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

  const amountColor = colors.white;
  const amountPrefix = '';

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
      <View style={styles.transactionMain}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionType}>{getTypeLabel()}</Text>
          <Text style={styles.transactionUser}>From {getUserDisplayName}</Text>
          {getMemoText && (
            <Text style={styles.transactionMemo} numberOfLines={1}>
              {getMemoText}
            </Text>
          )}
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {amountPrefix}
            {formatBalance(transaction.amount, transaction.currency)}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(getDate)}
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
    padding: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  transactionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  transactionInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  transactionType: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  transactionUser: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  transactionMemo: {
    fontSize: typography.fontSize.sm,
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
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  transactionStatusBadge: {},
  transactionStatusConfirmed: {},
  transactionStatusPending: {},
  transactionStatusFailed: {},
  transactionStatusText: {},
});

export default TransactionHistoryItem;

