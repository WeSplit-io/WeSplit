import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, typography } from '../theme';
// eslint-disable-next-line import/no-unresolved
import { DEFAULT_AVATAR_URL } from '../../config/constants';

interface BalanceRowProps {
  avatar: string;
  name: string;
  amount: string;
  status: 'gets back' | 'owes';
  positive?: boolean;
}

const BalanceRow: React.FC<BalanceRowProps> = ({ avatar, name, amount, status, positive = false }) => (
  <View 
    style={styles.row}
    accessibilityRole="none"
    accessibilityLabel={`${name}, ${status} ${amount}`}
  >
    <Image 
      source={{ uri: avatar || DEFAULT_AVATAR_URL }} 
      style={styles.avatar}
      accessibilityRole="image"
      accessibilityLabel={`${name}'s avatar`}
    />
    <Text style={styles.name}>{name}</Text>
    <Text 
      style={[styles.amount, { color: positive ? colors.green : colors.red }]}
      accessibilityRole="text"
    >
      {amount}
    </Text>
    <Text 
      style={[styles.status, { color: positive ? colors.green : colors.red }]}
      accessibilityRole="text"
    >
      {status}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
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
    backgroundColor: colors.GRAY,
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

export default React.memo(BalanceRow); 