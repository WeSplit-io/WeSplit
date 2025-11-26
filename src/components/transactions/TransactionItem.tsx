import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Transaction } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { PhosphorIcon } from '../shared';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import {
  getTransactionIconName,
  formatTransactionTitle,
  formatTransactionSource,
} from '../../utils/transactionDisplayUtils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showTime?: boolean;
  recipientName?: string;
  senderName?: string;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  showTime: _showTime = true,
  recipientName,
  senderName,
}) => {
  const getTransactionIcon = () => {
    const iconName = getTransactionIconName(transaction.type);
    return (
      <PhosphorIcon
        name={iconName as any}
        size={20}
        color={colors.white}
        weight="regular"
      />
    );
  };

  const getTransactionTitle = () => {
    return formatTransactionTitle(transaction, recipientName, senderName);
  };

  const getTransactionSource = () => {
    return formatTransactionSource(transaction);
  };

  const getTransactionAmount = () => {
    const amount = transaction.amount || 0;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    const currency = transaction.currency || 'USDC';
    
    // Use shared formatBalance utility for consistency
    const formattedAmount = formatBalance(amount, currency, 2);
    
    // formatBalance already includes currency, so we just add the sign
    return {
      amount: `${isIncome ? '+' : '-'}${formattedAmount}`,
      color: isIncome ? colors.green : colors.text
    };
  };

  const { amount } = getTransactionAmount();

  const handlePress = () => {
    if (onPress) {
      onPress(transaction);
    }
  };

  return (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${getTransactionTitle()}, ${amount}`}
      accessibilityHint={onPress ? "Opens transaction details" : undefined}
    >
      <View style={styles.transactionIconContainer}>
        {getTransactionIcon()}
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle}>
          {getTransactionTitle()}
        </Text>
        <Text style={styles.transactionSource}>
          {getTransactionSource()}
        </Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={styles.transactionAmount}>
          {amount}
        </Text>
    
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  transactionContent: {
    flex: 1,
    marginRight: spacing.md,
    marginLeft: spacing.md,
  },
  transactionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  transactionSource: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});

export default TransactionItem; 