/**
 * SPEND Order Badge Component
 * Badge showing SPEND order indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';

interface SpendOrderBadgeProps {
  variant?: 'default' | 'compact';
}

export const SpendOrderBadge: React.FC<SpendOrderBadgeProps> = ({
  variant = 'default',
}) => {
  if (variant === 'compact') {
    return (
      <View style={styles.compactBadge}>
        <PhosphorIcon
          name="Storefront"
          size={12}
          color={colors.green}
          weight="fill"
        />
        <Text style={styles.compactText}>SP3ND</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <PhosphorIcon
        name="Storefront"
        size={14}
        color={colors.green}
        weight="fill"
      />
      <Text style={styles.text}>SPEND Order</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    backgroundColor: colors.greenBlue20,
    borderWidth: 1,
    borderColor: colors.green + '40',
    gap: spacing.xs / 2,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    letterSpacing: 0.2,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs / 2,
    backgroundColor: colors.greenBlue20,
    borderWidth: 1,
    borderColor: colors.green + '40',
    gap: spacing.xs / 2,
  },
  compactText: {
    fontSize: typography.fontSize.xs - 2,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
    letterSpacing: 0.5,
  },
});

