/**
 * SPEND Split Progress Component
 * Displays payment progress toward SPEND order threshold
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

interface SpendSplitProgressProps {
  totalAmount: number;
  totalPaid: number;
  completionPercentage: number;
  paymentThreshold?: number; // Percentage threshold (e.g., 1.0 = 100%)
  orderId?: string;
}

const SpendSplitProgress: React.FC<SpendSplitProgressProps> = ({
  totalAmount,
  totalPaid,
  completionPercentage,
  paymentThreshold = 1.0,
  orderId,
}) => {
  const thresholdAmount = totalAmount * paymentThreshold;
  const thresholdPercentage = paymentThreshold * 100;
  const isThresholdMet = totalPaid >= thresholdAmount;

  return (
    <View style={styles.container}>
      {/* Progress Circle */}
      <View style={styles.progressCircleWrapper}>
        <View style={styles.progressCircle}>
          {/* Progress fill overlay */}
          {completionPercentage > 0 && (
            <View 
              style={[
                styles.progressFill,
                isThresholdMet && styles.progressFillComplete,
                { transform: [{ rotate: `${(completionPercentage / 100) * 360 - 90}deg` }] }
              ]}
            />
          )}
          <View style={styles.progressInner}>
            <Text style={styles.progressPercentage}>
              {Math.min(completionPercentage, 100).toFixed(0)}%
            </Text>
            <Text style={styles.progressAmount}>
              ${totalPaid.toFixed(2)}
            </Text>
            <Text style={styles.progressLabel}>
              Collected
            </Text>
          </View>
        </View>
        {isThresholdMet && (
          <View style={styles.thresholdBadge}>
            <Text style={styles.thresholdBadgeText}>✓ Ready</Text>
          </View>
        )}
      </View>
      
      {/* Progress Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Total</Text>
          <Text style={styles.detailValue}>${totalAmount.toFixed(2)} USDC</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Collected</Text>
          <Text style={[styles.detailValue, totalPaid > 0 && styles.detailValueHighlight]}>
            ${totalPaid.toFixed(2)} USDC
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Remaining</Text>
          <Text style={styles.detailValue}>
            ${Math.max(0, totalAmount - totalPaid).toFixed(2)} USDC
          </Text>
        </View>
        {paymentThreshold < 1.0 && (
          <View style={[styles.detailRow, styles.thresholdRow]}>
            <View>
              <Text style={styles.detailLabel}>Payment Threshold</Text>
              <Text style={styles.thresholdSubLabel}>({thresholdPercentage}% required)</Text>
            </View>
            <Text style={[styles.detailValue, isThresholdMet && styles.thresholdMet]}>
              ${thresholdAmount.toFixed(2)} {isThresholdMet ? '✓' : ''}
            </Text>
          </View>
        )}
        {isThresholdMet && (
          <View style={styles.thresholdMetBanner}>
            <Text style={styles.thresholdMetText}>
              ✓ Payment threshold met! Processing payment to SPEND...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },
  progressCircleWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.white10,
    borderWidth: 10,
    borderColor: colors.white20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  thresholdBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderWidth: 2,
    borderColor: colors.black,
  },
  thresholdBadgeText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  progressFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 60,
  },
  progressFillComplete: {
    backgroundColor: colors.green,
  },
  progressInner: {
    alignItems: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  progressAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
    marginBottom: spacing.xs / 4,
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white20,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  detailValue: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.bold,
  },
  detailValueHighlight: {
    color: colors.green,
  },
  thresholdRow: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  thresholdSubLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary + 'CC',
    marginTop: spacing.xs / 4,
  },
  thresholdMet: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
  },
  thresholdMetBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.green + '15',
    borderRadius: spacing.sm,
    borderWidth: 2,
    borderColor: colors.green + '60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  thresholdMetText: {
    fontSize: typography.fontSize.md,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
});

export default SpendSplitProgress;

