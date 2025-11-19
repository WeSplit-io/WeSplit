/**
 * Badge Card Component
 * Reusable component for displaying badge cards in the rewards system
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { BadgeProgress } from '../../services/rewards/badgeService';
import { BadgeInfo } from '../../services/rewards/badgeConfig';

interface BadgeCardProps {
  progress: BadgeProgress;
  badgeInfo: BadgeInfo;
  onPress?: () => void;
  disabled?: boolean;
  isClaiming?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  progress,
  badgeInfo,
  onPress,
  disabled = false,
  isClaiming = false,
}) => {
  const isCompleted = progress.current >= progress.target;
  const progressPercentage = Math.min((progress.current / progress.target) * 100, 100);
  const canClaim = isCompleted && !progress.claimed;

  return (
    <TouchableOpacity
      style={[
        styles.badgeCard,
        progress.claimed && styles.badgeCardClaimed,
        canClaim && styles.badgeCardClaimable
      ]}
      onPress={onPress}
      disabled={disabled || !canClaim}
      activeOpacity={canClaim ? 0.7 : 1}
    >
      {/* Points label - only show if not claimed */}
      {!progress.claimed && (
        <View style={styles.badgePointsLabel}>
          <Text style={styles.badgePointsLabelText}>{badgeInfo.points || 0} pts</Text>
        </View>
      )}

      {/* Badge icon - Pentagonal shape (diamond) */}
      <View style={styles.badgeIconContainer}>
        <View style={styles.badgePentagon}>
          {progress.imageUrl ? (
            <Image 
              source={{ uri: progress.imageUrl }} 
              style={styles.badgeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.badgeIconPlaceholder}>
              <Text style={styles.badgeIconText}>{badgeInfo.icon}</Text>
            </View>
          )}
        </View>
        <Text style={styles.badgeNumber}>{badgeInfo.icon}</Text>
        <Text style={styles.badgeLabel}>TOTAL SPLITS</Text>
      </View>

      {/* Description */}
      <Text style={styles.badgeDescription}>{badgeInfo.description}</Text>

      {/* Progress bar */}
      <View style={styles.badgeProgressContainer}>
        <View style={styles.badgeProgressBar}>
          <View 
            style={[
              styles.badgeProgressFill,
              { width: `${progressPercentage}%` },
              progress.claimed && styles.badgeProgressFillComplete
            ]} 
          />
        </View>
        <Text style={styles.badgeProgressText}>
          {progress.current}/{progress.target}
        </Text>
      </View>

      {/* Claim button overlay */}
      {canClaim && (
        <View style={styles.badgeClaimOverlay}>
          <Text style={styles.badgeClaimText}>
            {isClaiming ? 'Claiming...' : 'Tap to Claim'}
          </Text>
        </View>
      )}
      
      {/* Claimed indicator - subtle checkmark */}
      {progress.claimed && (
        <View style={styles.claimedIndicator}>
          <PhosphorIcon name="CheckCircle" size={16} color={colors.green} weight="fill" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badgeCard: {
    width: '48%', // 2 badges per row
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    position: 'relative',
    minHeight: 220,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badgeCardClaimed: {
    borderColor: colors.green,
    borderWidth: 2,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeCardClaimable: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  badgePointsLabel: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  badgePointsLabelText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  badgeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  badgePentagon: {
    width: 90,
    height: 90,
    backgroundColor: colors.white10,
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  badgeImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    transform: [{ rotate: '-45deg' }],
  },
  badgeIconPlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: 'transparent',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  badgeIconText: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  badgeNumber: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  badgeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  badgeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 'auto',
  },
  badgeProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.white10,
    borderRadius: 3,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  badgeProgressFillComplete: {
    backgroundColor: colors.green,
  },
  badgeProgressText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
    minWidth: 40,
    textAlign: 'right',
  },
  badgeClaimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeClaimText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
  },
  claimedIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.black,
    borderRadius: 12,
    padding: 4,
    zIndex: 2,
  },
});

export default BadgeCard;

