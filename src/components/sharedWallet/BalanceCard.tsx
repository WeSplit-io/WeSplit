/**
 * Balance Card Component
 * Displays the total balance of a shared wallet
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PhosphorIcon, PhosphorIconName } from '../shared';
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
  // Check if customLogo is a URL (starts with http) or a Phosphor icon name
  const isLogoUrl = customLogo?.startsWith('http');
  const isPhosphorIcon = customLogo && !isLogoUrl;

  return (
    <View style={[styles.balanceCard, customColor && { backgroundColor: customColor + '20' }]}>
      {customLogo && (
        <View style={styles.logoContainer}>
          {isLogoUrl ? (
            // Custom URL logo (future support)
            <Text style={styles.logoText}>{customLogo}</Text>
          ) : isPhosphorIcon ? (
            // Phosphor icon
            <PhosphorIcon
              name={customLogo as PhosphorIconName}
              size={28}
              color={customColor || colors.green}
              weight="bold"
            />
          ) : null}
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
    borderRadius: spacing.sm,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  logoContainer: {
    marginBottom: spacing.md,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
  },
  balanceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
    lineHeight: typography.fontSize.xxl * 1.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.greenBlue20,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    letterSpacing: 0.2,
  },
});

export default BalanceCard;

