/**
 * Action Buttons Component
 * Displays action buttons for shared wallet operations
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhosphorIcon } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ActionButtonsProps {
  onTopUp: () => void;
  onLinkCard: () => void;
  onWithdraw: () => void;
  canWithdraw: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onTopUp,
  onLinkCard,
  onWithdraw,
  canWithdraw,
}) => {
  return (
    <View style={styles.actionsGrid}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onTopUp}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[colors.greenBlue20, colors.greenBlue10]}
          style={styles.actionButtonGradient}
        >
          <PhosphorIcon name="Plus" size={24} color={colors.green} weight="bold" />
        </LinearGradient>
        <Text style={styles.actionButtonText}>Top Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onLinkCard}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[colors.greenBlue20, colors.greenBlue10]}
          style={styles.actionButtonGradient}
        >
          <PhosphorIcon name="CreditCard" size={24} color={colors.green} weight="bold" />
        </LinearGradient>
        <Text style={styles.actionButtonText}>Link Card</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onWithdraw}
        activeOpacity={0.7}
        disabled={!canWithdraw}
      >
        <LinearGradient
          colors={canWithdraw ? [colors.greenBlue20, colors.greenBlue10] : [colors.white10, colors.white5]}
          style={styles.actionButtonGradient}
        >
          <PhosphorIcon 
            name="ArrowDown" 
            size={24} 
            color={canWithdraw ? colors.green : colors.white70} 
            weight="bold" 
          />
        </LinearGradient>
        <Text style={[styles.actionButtonText, !canWithdraw && styles.actionButtonTextDisabled]}>
          Withdraw
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  actionButtonTextDisabled: {
    color: colors.white70,
  },
});

export default ActionButtons;

