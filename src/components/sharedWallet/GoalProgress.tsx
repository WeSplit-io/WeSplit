import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatBalance } from '../../utils/ui/format/formatUtils';

interface GoalProgressProps {
  targetAmount: number;
  currentAmount: number;
  currency: string;
  color?: string;
}

const width = 360;
const height = 180;
const strokeWidth = 42;
const radius = 140;
const centerX = width / 2;
const centerY = height;
const arcStartAngle = 180;
const arcEndAngle = 0;
const arcSweepAngle = 180;

const normalizeColor = (customColor?: string) => {
  if (!customColor) return colors.walletPurple;
  return customColor;
};

const lightenColor = (hexColor: string, amount: number) => {
  let hex = hexColor.replace('#', '');

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount * 255));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount * 255));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount * 255));

  return `rgb(${r}, ${g}, ${b})`;
};

const angleToCoord = (angleDeg: number) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);
  return { x, y };
};

const startPoint = angleToCoord(arcStartAngle);
const endPoint = angleToCoord(arcEndAngle);
const backgroundArcPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}`;

const GoalProgress: React.FC<GoalProgressProps> = ({
  targetAmount,
  currentAmount,
  currency,
  color,
}) => {
  if (!targetAmount || targetAmount <= 0) {
    return null;
  }

  const normalizedColor = normalizeColor(color);
  const gradientStart = lightenColor(normalizedColor, 0.2);
  const progress = Math.min(currentAmount / targetAmount, 1);
  const percentage = Math.min(progress * 100, 100);
  const remaining = Math.max(targetAmount - currentAmount, 0);

  const progressAngle = arcStartAngle + arcSweepAngle * progress;
  const progressPoint = angleToCoord(progressAngle);
  const progressArcPath =
    progress > 0
      ? `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${progressPoint.x} ${progressPoint.y}`
      : '';

  return (
    <View style={styles.container}>
      <View style={styles.progressRingWrapper}>
        <View style={styles.progressRing}>
          <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
            <Defs>
              <LinearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={gradientStart} stopOpacity="1" />
                <Stop offset="100%" stopColor={normalizedColor} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            <Path
              d={backgroundArcPath}
              stroke={colors.white10}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="butt"
            />

            {progress > 0 && (
              <Path
                d={progressArcPath}
                stroke="url(#goalGradient)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="butt"
              />
            )}
          </Svg>

          <View style={styles.progressInner}>
            <Text style={styles.progressPercentage}>
              ({percentage.toFixed(0)}%)
            </Text>
            <Text style={styles.progressAmount}>
              {formatBalance(currentAmount, currency)}
            </Text>
            <Text style={styles.progressLabel}>
              Collected
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.remainingContainer}>
        <Text style={styles.remainingLabel}>Remaining</Text>
        <Text style={styles.remainingAmount}>
          {formatBalance(remaining, currency)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  progressRingWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  progressRing: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  progressInner: {
    position: 'absolute',
    top: 100,
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

export default GoalProgress;


