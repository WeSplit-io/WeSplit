/**
 * SPEND Split Progress Component
 * Displays payment progress toward SPEND order threshold
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { formatAmountWithComma } from '../../../utils/spend/formatUtils';

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

  // Use shared formatting utility
  const formatAmount = formatAmountWithComma;

  // SVG circle calculations
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(completionPercentage, 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      {/* Progress Circle */}
      <View style={styles.progressCircleWrapper}>
        <View style={styles.progressCircle}>
          <Svg width={size} height={size} style={styles.svg}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.white20}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress arc */}
            {progress > 0 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.green}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
          </Svg>
          
          <View style={styles.progressInner}>
            <Text style={styles.progressPercentage}>
              ({Math.min(completionPercentage, 100).toFixed(0)}%)
            </Text>
            <Text style={styles.progressAmount}>
              {formatAmount(totalPaid)} USDC
            </Text>
            <Text style={styles.progressLabel}>
              Collected
            </Text>
          </View>
        </View>
      </View>
      
      {/* Remaining Amount Bar */}
      <View style={styles.remainingContainer}>
        <Text style={styles.remainingLabel}>Remaining</Text>
        <Text style={styles.remainingAmount}>
          {formatAmount(Math.max(0, totalAmount - totalPaid))} USDC
            </Text>
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
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  progressInner: {
    alignItems: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  progressAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs / 4,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  remainingLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  remainingAmount: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SpendSplitProgress;

