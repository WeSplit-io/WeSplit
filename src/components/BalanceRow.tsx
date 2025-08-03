import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';

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
    borderRadius: radii.card,
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
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium as any,
  },
  amount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold as any,
    marginRight: spacing.sm,
  },
  status: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold as any,
  },
});

export default BalanceRow; 