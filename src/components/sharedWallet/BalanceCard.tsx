/**
 * Balance Card Component
 * Displays the total balance of a shared wallet
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface BalanceCardProps {
  balance: number;
  currency: string;
  status: string;
  customColor?: string;
  customLogo?: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  currency,
  status,
  customColor,
  customLogo,
}) => {
  return (
    <View style={[styles.balanceCard, customColor && { backgroundColor: customColor + '20' }]}>
      {customLogo && (
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>{customLogo}</Text>
        </View>
      )}
      <Text style={styles.balanceLabel}>Total Balance</Text>
      <Text style={styles.balanceValue}>
        {formatBalance(balance, currency)}
      </Text>
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, customColor && { backgroundColor: customColor }]} />
        <Text style={[styles.statusText, customColor && { color: customColor }]}>
          {status === 'active' ? 'Active' : status}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoContainer: {
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 32,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.greenBlue20,
    gap: spacing.xs / 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
  },
});

export default BalanceCard;

