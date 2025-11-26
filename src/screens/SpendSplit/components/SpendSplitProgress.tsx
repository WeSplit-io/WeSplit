/**
 * SPEND Split Progress Component
 * Displays payment progress toward SPEND order threshold
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
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

  // SVG semi-circular arc calculations (180-degree arc at the top)
  const width = 360; // Even bigger
  const height = 180; // Even bigger
  const strokeWidth = 42; // Much fatter/thicker
  const radius = 140; // Increased proportionally
  const centerX = width / 2; // 180
  const centerY = height; // 180 - center at bottom for semi-circle at top
  
  // Arc configuration: 180-degree semi-circle at the top
  // For a semi-circle at the top, the center is at the bottom of the viewBox
  // We need to go from left (180°) to right (0°) but curve upward
  // In SVG: 0° = right, 90° = bottom, 180° = left, 270° = top
  // To curve upward, we go clockwise from 180° to 0° (sweep=1)
  // This goes: 180° -> 270° -> 0° (curves upward through the top)
  const arcStartAngle = 180; // Start from left
  const arcEndAngle = 0; // End at right
  const arcSweepAngle = 180; // Total arc span (semi-circle)
  
  // Helper function to convert angle to coordinates
  // SVG uses standard math: 0° = right, positive = counterclockwise
  const angleToCoord = (angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return { x, y };
  };
  
  // Calculate start and end points of the full arc
  const startPoint = angleToCoord(arcStartAngle); // Left point: (20, 100)
  const endPoint = angleToCoord(arcEndAngle); // Right point: (180, 100)
  
  // Large arc flag: 0 for semi-circle (exactly 180 degrees)
  const largeArcFlag = 0;
  // Sweep flag: 1 for clockwise (curves upward from left to right through top)
  const sweepFlag = 1;
  
  // Create arc path for background (full semi-circle - always visible)
  // SVG arc format: M x y A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const backgroundArcPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endPoint.x} ${endPoint.y}`;
  
  // Progress: 0 to 1 (0% to 100%)
  const progress = Math.min(completionPercentage, 100) / 100;
  
  // Calculate progress end point based on current progress
  // Progress goes from start (180°) clockwise to end (0°)
  // For clockwise: startAngle + (sweepAngle * progress)
  const progressAngle = arcStartAngle + (arcSweepAngle * progress);
  // Normalize to 0-360 range
  const normalizedProgressAngle = progressAngle > 360 ? progressAngle - 360 : progressAngle;
  const progressPoint = angleToCoord(normalizedProgressAngle);
  
  // Determine if progress arc is large (> 180 degrees) - but for semi-circle, max is 180
  const progressArcAngle = arcSweepAngle * progress;
  const progressLargeArcFlag = progressArcAngle > 180 ? 1 : 0;
  
  // Create arc path for progress (partial arc based on progress)
  const progressArcPath = progress > 0 
    ? `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${progressLargeArcFlag} ${sweepFlag} ${progressPoint.x} ${progressPoint.y}`
    : '';

  return (
    <View style={styles.container}>
      {/* Progress Ring - Semi-circular arc at top */}
      <View style={styles.progressRingWrapper}>
        <View style={styles.progressRing}>
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
            <Defs>
              {/* Spend gradient for progress bar */}
              <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.spendGradientStart} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors.spendGradientEnd} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            
            {/* Background arc (unfilled portion) - always shows full semi-circle with better visibility */}
            <Path
              d={backgroundArcPath}
              stroke={colors.white10}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="butt"
            />
            
            {/* Progress arc (filled portion) - shows progress from left to right */}
            {progress > 0 && (
              <Path
                d={progressArcPath}
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="butt"
              />
            )}
          </Svg>
          
          {/* Text content centered inside the semi-circle */}
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
    marginBottom: spacing.md,
  },
  progressRingWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  progressRing: {
    width: 360,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  progressInner: {
    position: 'absolute',
    top: 100, // Adjusted for larger SVG
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  progressAmount: {
    fontSize: typography.fontSize.xl + 2,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 4,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.regular,
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  remainingLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  remainingAmount: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SpendSplitProgress;

