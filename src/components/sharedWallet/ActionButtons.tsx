/**
 * Action Buttons Component
 * Displays action buttons for shared wallet operations
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme/spacing';
import { Button } from '../../components/shared';

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
      <Button
        title="Top Up"
        onPress={onTopUp}
        variant="secondary"
        size="small"
        style={styles.actionButton}
        textStyle={styles.actionButtonText}
      />

      <Button
        title="Link Card"
        onPress={onLinkCard}
        variant="secondary"
        size="small"
        style={styles.actionButton}
        textStyle={styles.actionButtonText}
      />

      <Button
        title="Withdraw"
        onPress={onWithdraw}
        variant="secondary"
        size="small"
        disabled={!canWithdraw}
        style={styles.actionButton}
        textStyle={styles.actionButtonText}
      />
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
  },
  actionButtonText: {
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});

export default ActionButtons;

