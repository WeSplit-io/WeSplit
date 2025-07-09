import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';

interface GroupCardProps {
  groupName: string;
  memberCount: number;
  totalAmount: string;
  currency: string;
  userBalance?: number;
  userBalanceCurrency?: string; // Add separate currency for user balance
  lastActivity: string;
  category?: string;
  onPress?: () => void;
  onMenuPress?: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
  groupName,
  memberCount,
  totalAmount,
  currency,
  userBalance = 0,
  userBalanceCurrency,
  lastActivity,
  category = 'general',
  onPress,
  onMenuPress,
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'travel': return 'map-pin';
      case 'food': return 'coffee';
      case 'work': return 'briefcase';
      case 'shopping': return 'shopping-bag';
      case 'home': return 'home';
      default: return 'users';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'travel': return '#A5A6F6';
      case 'food': return '#B5C99A';
      case 'work': return '#F7C873';
      case 'shopping': return '#FF6B6B';
      case 'home': return '#4ECDC4';
      default: return '#A5EA15';
    }
  };

  const formatBalance = (balance: number) => {
    if (balance === 0) return 'Settled';
    const isPositive = balance > 0;
    const balanceCurrency = userBalanceCurrency || currency;
    return `${isPositive ? 'You are owed' : 'You owe'} ${Math.abs(balance).toFixed(2)} ${balanceCurrency}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return '#A89B9B';
    return balance > 0 ? '#A5EA15' : '#FF4D4F';
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(category) }]}>
          <Icon name={getCategoryIcon(category)} size={20} color="#212121" />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.memberCount}>{memberCount} members</Text>
        </View>
        {onMenuPress && (
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <Icon name="more-vertical" size={20} color="#A89B9B" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.amountSection}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total spending</Text>
          <Text style={styles.totalAmount}>{totalAmount}</Text>
        </View>
        
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <Text style={[styles.userBalance, { color: getBalanceColor(userBalance) }]}>
            {formatBalance(userBalance)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.lastActivity}>Last activity: {lastActivity}</Text>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: userBalance === 0 ? '#A5EA15' : '#FF6B35' }]} />
          <Text style={styles.statusText}>{userBalance === 0 ? 'Settled' : 'Active'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#212121',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 14,
    color: '#A89B9B',
  },
  menuButton: {
    padding: 4,
  },
  amountSection: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#A89B9B',
    fontWeight: '500',
  },
  userBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
    paddingTop: 12,
  },
  lastActivity: {
    fontSize: 12,
    color: '#A89B9B',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#A89B9B',
    fontWeight: '500',
  },
});

export default GroupCard; 