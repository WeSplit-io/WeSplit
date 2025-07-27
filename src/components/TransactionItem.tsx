import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Transaction } from '../types';
import { colors } from '../theme/colors';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showTime?: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  showTime = true,
}) => {
  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'send':
        return require('../../assets/icon-send.png');
      case 'receive':
        return require('../../assets/icon-receive.png');
      case 'deposit':
        return require('../../assets/icon-deposit.png');
      case 'withdraw':
        return require('../../assets/icon-withdraw.png');
      default:
        return require('../../assets/icon-send.png');
    }
  };

  const getTransactionTitle = () => {
    switch (transaction.type) {
      case 'send':
        return `Send to ${transaction.to_user}`;
      case 'receive':
        return `Received from ${transaction.from_user}`;
      case 'deposit':
        return 'Top Up Wallet';
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
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.primaryGreen : colors.text
    };
  };

  const transactionTime = new Date(transaction.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const { amount, color } = getTransactionAmount();

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
    >
      <View style={styles.transactionIconContainer}>
        <Image
          source={getTransactionIcon()}
          style={styles.transactionIcon}
        />
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
        <Text style={[styles.transactionAmount, { color }]}>
          {amount}
        </Text>
        {showTime && (
          <Text style={styles.transactionTime}>
            {transactionTime}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionIcon: {
    width: 24,
    height: 24,
    tintColor: colors.background,
  },
  transactionContent: {
    flex: 1,
    marginRight: 16,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  transactionSource: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default TransactionItem; 