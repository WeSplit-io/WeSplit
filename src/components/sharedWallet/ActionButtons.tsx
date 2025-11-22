/**
 * Action Buttons Component
 * Displays action buttons for shared wallet operations
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        style={[styles.actionButton, styles.actionButtonEnabled]}
        onPress={onTopUp}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonText}>Top Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.actionButtonEnabled]}
        onPress={onLinkCard}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonText}>Link Card</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, canWithdraw ? styles.actionButtonEnabled : styles.actionButtonDisabled]}
        onPress={onWithdraw}
        activeOpacity={0.7}
        disabled={!canWithdraw}
      >
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
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  actionButtonEnabled: {
    backgroundColor: colors.greenBlue20,
    borderColor: colors.green + '40',
  },
  actionButtonDisabled: {
    backgroundColor: colors.white10,
    borderColor: colors.white10,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  actionButtonTextDisabled: {
    color: colors.white50,
  },
});

export default ActionButtons;

