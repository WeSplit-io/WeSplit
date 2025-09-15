import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface BalanceRowProps {
  avatar: string;
  name: string;
  amount: string;
  status: 'gets back' | 'owes';
  positive?: boolean;
}

const BalanceRow: React.FC<BalanceRowProps> = ({ avatar, name, amount, status, positive = false }) => (
  <View style={styles.row}>
    <Image source={{ uri: avatar }} style={styles.avatar} />
    <Text style={styles.name}>{name}</Text>
    <Text style={[styles.amount, { color: positive ? colors.green : colors.red }]}>
      {amount}
    </Text>
    <Text style={[styles.status, { color: positive ? colors.green : colors.red }]}>
      {status}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.md,
    backgroundColor: colors.lightGray,
  },
  name: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  amount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.sm,
  },
  status: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default BalanceRow; 