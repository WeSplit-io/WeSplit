import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Transaction } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { 
  PaperPlaneTilt, 
  HandCoins, 
  ArrowLineDown, 
  Bank 
} from 'phosphor-react-native';

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
    const iconProps = {
      size: 20,
      color: colors.white,
    };

    switch (transaction.type) {
      case 'send':
        return <PaperPlaneTilt {...iconProps} />;
      case 'receive':
        return <HandCoins {...iconProps} />;
      case 'deposit':
        return <ArrowLineDown {...iconProps} />;
      case 'withdraw':
        return <Bank {...iconProps} />;
      default:
        return <PaperPlaneTilt {...iconProps} />;
    }
  };

  const getTransactionTitle = () => {
    switch (transaction.type) {
      case 'send':
        return `Send to ${recipientName || transaction.recipient_name || transaction.to_user || 'Unknown'}`;
      case 'receive':
        return `Received from ${senderName || transaction.sender_name || transaction.from_user || 'Unknown'}`;
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionSource = () => {
    switch (transaction.type) {
      case 'send':
        return transaction.note || 'Payment';
      case 'receive':
        return transaction.note || 'Payment received';
      case 'deposit':
        return 'MoonPay';
      case 'withdraw':
        return 'Wallet';
      default:
        return '';
    }
  };

  const getTransactionAmount = () => {
    const amount = transaction.amount || 0;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: `${isIncome ? '+' : '-'}${amount.toFixed(2)} USDC`,
      color: isIncome ? colors.primaryGreen : colors.text
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