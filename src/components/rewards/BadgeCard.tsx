/**
 * Badge Card Component
 * Reusable component for displaying badge cards in the rewards system
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  hideClaimedOverlay?: boolean;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  progress,
  badgeInfo,
  onPress,
  disabled = false,
  isClaiming = false,
  hideClaimedOverlay = false,
}) => {
  const targetValue = typeof progress.target === 'number' && progress.target > 0 ? progress.target : 1;
  const progressPercentage = Math.min((progress.current / targetValue) * 100, 100);
  const canClaim = progress.current >= (progress.target || Number.POSITIVE_INFINITY) && !progress.claimed;

  const formatProgressValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (badgeInfo.progressMetric === 'transaction_volume') {
      return `$${safeValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    return safeValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const cardContent = (insideGradient: boolean = false) => (
    <TouchableOpacity
      style={[
        styles.badgeCard,
        progress.claimed && styles.badgeCardClaimed,
        canClaim && styles.badgeCardClaimable,
        insideGradient && styles.badgeCardInsideGradient
      ]}
      onPress={onPress}
      disabled={disabled || !canClaim}
      activeOpacity={canClaim ? 0.7 : 1}
    >
      {/* Points label - only show if not claimed */}
      {!progress.claimed && (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.badgePointsLabel}
        >
          <Text style={styles.badgePointsLabelText}>{badgeInfo.points || 0} pts</Text>
        </LinearGradient>
      )}

      {/* Badge image - displayed directly from Firebase */}
      <View style={styles.badgeImageContainer}>
          {progress.imageUrl && progress.imageUrl.startsWith('http') ? (
            <Image 
              source={{ uri: progress.imageUrl }} 
              style={styles.badgeImage}
            resizeMode="contain"
            onError={(error) => {
              console.warn('Failed to load badge image', { 
                badgeId: progress.badgeId, 
                imageUrl: progress.imageUrl,
                error 
              });
            }}
            onLoad={() => {
              console.debug('Badge image loaded successfully', { 
                badgeId: progress.badgeId 
              });
            }}
            />
          ) : (
          <View style={styles.badgeImagePlaceholder}>
            <PhosphorIcon name="Image" size={32} color={colors.white70} weight="regular" />
            <Text style={styles.badgeImagePlaceholderText}>
              {progress.imageUrl && progress.imageUrl.startsWith('gs://') 
                ? 'Loading badge...' 
                : 'No badge image'}
            </Text>
            </View>
          )}
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
          {formatProgressValue(progress.current)}/{formatProgressValue(progress.target || 0)}
        </Text>
      </View>

      {/* Claim button overlay */}
      {canClaim && (
        <View style={styles.badgeClaimOverlay}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badgeClaimTextGradient}
          >
            <Text style={styles.badgeClaimText}>
              {isClaiming ? 'Claiming...' : 'Tap to Claim'}
            </Text>
          </LinearGradient>
        </View>
      )}
      
      {/* Claimed overlay - similar to claim overlay but with "Already Claimed" */}
      {progress.claimed && !hideClaimedOverlay && (
        <View style={styles.badgeClaimOverlay}>
          <View style={styles.badgeClaimedContent}>
            <PhosphorIcon name="CheckCircle" size={24} color={colors.white} weight="fill" />
            <Text style={styles.badgeClaimedText}>
              Already Claimed
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  // Wrap in LinearGradient for claimable and claimed cards to create gradient border
  if (canClaim || progress.claimed) {
    return (
      <View style={styles.badgeCardWrapper}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.badgeCardGradientBorder}
        >
          {cardContent(true)}
        </LinearGradient>
      </View>
    );
  }

  return cardContent(false);
};

const styles = StyleSheet.create({
  badgeCard: {
    width: '48%', // 2 badges per row
    backgroundColor: colors.blackWhite5,
    borderRadius: 12,
    padding: spacing.md,
    position: 'relative',
    minHeight: 220,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badgeCardClaimed: {
    // Border is handled by LinearGradient wrapper, no border needed here
    marginBottom: 0, // Margin handled by wrapper
  },
  badgeCardClaimable: {
    // Border is handled by LinearGradient wrapper, no border needed here
    marginBottom: 0, // Margin handled by wrapper
  },
  badgeCardInsideGradient: {
    width: '100%', // Full width when inside gradient border
    marginBottom: 0, // No margin when inside wrapper
    borderRadius: 12, // Match badgeCard borderRadius
  },
  badgeCardWrapper: {
    width: '48%', // Match badgeCard width for grid alignment
    marginBottom: spacing.md, // Match badgeCard margin
  },
  badgeCardGradientBorder: {
    borderRadius: 14, // badgeCard borderRadius (12) + borderWidth (2)
    padding: 2, // This creates the gradient border effect (2px border width)
    width: '100%', // Full width to fill wrapper
    overflow: 'hidden', // Ensure border radius is respected
  },
  badgePointsLabel: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopRightRadius: spacing.sm,
    borderBottomRightRadius: spacing.sm,
    zIndex: 1,
  },
  badgePointsLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  badgeImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    width: '100%',
    minHeight: 120,
  },
  badgeImage: {
    width: '100%',
    height: 120,
    maxWidth: 120,
    maxHeight: 120,
    resizeMode: 'contain',
  },
  badgeImagePlaceholder: {
    width: '100%',
    height: 120,
    maxWidth: 120,
    maxHeight: 120,
    backgroundColor: colors.white10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  badgeImagePlaceholderText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
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
  badgeClaimTextGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  badgeClaimText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    textAlign: 'center',
  },
  badgeClaimedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  badgeClaimedText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
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

