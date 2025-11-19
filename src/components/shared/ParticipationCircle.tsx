/**
 * Participation Circle Component
 * Displays a circular chart showing member participation percentages
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { SharedWalletMember } from '../../services/sharedWallet';

interface ParticipationCircleProps {
  members: SharedWalletMember[];
  totalContributed: number;
  size?: number;
  strokeWidth?: number;
}

// Predefined colors for participants - cleaner, more cohesive palette
const PARTICIPANT_COLORS = [
  colors.green,
  '#4A90E2', // Blue
  '#F5A623', // Orange
  '#BD10E0', // Purple
  '#50E3C2', // Teal
  '#B8E986', // Light Green
  '#F8E71C', // Yellow
  '#D0021B', // Red
  '#9013FE', // Dark Purple
  '#7ED321', // Bright Green
];

export const ParticipationCircle: React.FC<ParticipationCircleProps> = ({
  members,
  totalContributed,
  size = 120,
  strokeWidth = 12,
}) => {
  const participationData = useMemo(() => {
    if (totalContributed === 0) {
      return members.map((member, index) => ({
        member,
        percentage: 100 / members.length,
        color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
      }));
    }

    return members
      .map((member, index) => ({
        member,
        percentage: (member.totalContributed / totalContributed) * 100,
        color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [members, totalContributed]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate arc paths for each segment - using proper SVG arc calculations
  const segments = useMemo(() => {
    let currentAngle = -90; // Start from top (12 o'clock)
    
    return participationData.map((item) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Convert angles to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calculate start and end points on the circle
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      
      // Large arc flag (1 if angle > 180, 0 otherwise)
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      // Create pie slice path: Move to center, line to start point, arc to end point, close path
      const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      
      currentAngle = endAngle;
      
      return {
        path,
        color: item.color,
        member: item.member,
        percentage: item.percentage,
      };
    });
  }, [participationData, radius, center]);

  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle - subtle gray ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.white10}
            strokeWidth={strokeWidth * 0.2}
            opacity={0.2}
          />
          
          {/* Segments - pie slices with clean edges */}
          {segments.map((segment, index) => (
            <Path
              key={`${segment.member.userId}-${index}`}
              d={segment.path}
              fill={segment.color}
              stroke={colors.black}
              strokeWidth={0.5}
              opacity={1}
            />
          ))}
          
          {/* Inner circle for cleaner look - smaller to leave room for text */}
          <Circle
            cx={center}
            cy={center}
            r={radius * 0.45}
            fill={colors.black}
            opacity={0.9}
          />
        </Svg>
        
        {/* Center text showing total - positioned above inner circle */}
        <View style={styles.centerText}>
          <Text style={styles.centerTextMain}>
            {members.length}
          </Text>
          <Text style={styles.centerTextSub}>
            {members.length === 1 ? 'Member' : 'Members'}
          </Text>
        </View>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        {participationData.slice(0, 5).map((item) => (
          <View key={item.member.userId} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.member.name}: {item.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
        {participationData.length > 5 && (
          <Text style={styles.legendMore}>
            +{participationData.length - 5} more
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  centerTextMain: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    lineHeight: typography.fontSize.xxl * 1.2,
    textAlign: 'center',
  },
  centerTextSub: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },
  legend: {
    width: '100%',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.white10,
  },
  legendText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
  legendMore: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontStyle: 'italic',
    marginTop: spacing.xs / 2,
  },
});

