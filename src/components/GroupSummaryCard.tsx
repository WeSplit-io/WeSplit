import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from './Icon';

interface GroupSummaryCardProps {
  groupName: string;
  totalSpending: string;
  memberCount: number;
  expenseCount: number;
  isLoading?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

const GroupSummaryCard: React.FC<GroupSummaryCardProps> = ({
  groupName,
  totalSpending,
  memberCount,
  expenseCount,
  isLoading = false,
  backgroundColor = '#A5EA15',
  textColor = '#212121',
}) => {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={styles.header}>
        <Icon name="users" size={20} color={textColor} />
        <Text style={[styles.groupName, { color: textColor }]}>{groupName}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.label, { color: textColor }]}>Total spending</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={textColor} />
            <Text style={[styles.loadingText, { color: textColor }]}>Loading...</Text>
          </View>
        ) : (
          <Text style={[styles.amount, { color: textColor }]}>{totalSpending}</Text>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: textColor }]}>{memberCount}</Text>
          <Text style={[styles.statLabel, { color: textColor }]}>members</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: textColor }]}>{expenseCount}</Text>
          <Text style={[styles.statLabel, { color: textColor }]}>expenses</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(33, 33, 33, 0.2)',
    marginHorizontal: 16,
  },
});

export default GroupSummaryCard; 