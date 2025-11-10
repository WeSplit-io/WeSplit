/**
 * Badge Display Component
 * Displays user badges and labels on profile pages
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { getBadgeInfo } from '../../services/rewards/badgeConfig';

interface BadgeDisplayProps {
  badges?: string[];
  activeBadge?: string;
  showAll?: boolean;
  onBadgePress?: (badgeId: string) => void;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges = [],
  activeBadge,
  showAll = false,
  onBadgePress
}) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  const displayBadges = showAll ? badges : (activeBadge ? [activeBadge] : []);

  if (displayBadges.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {displayBadges.map((badgeId) => {
        const badgeInfo = getBadgeInfo(badgeId);
        if (!badgeInfo) {
          // Fallback for unknown badges
          return null;
        }
        const isActive = badgeId === activeBadge;

        return (
          <TouchableOpacity
            key={badgeId}
            style={[styles.badge, isActive && styles.badgeActive]}
            onPress={() => onBadgePress?.(badgeId)}
            disabled={!onBadgePress}
            activeOpacity={0.7}
          >
            <View style={styles.badgeContent}>
              {badgeInfo.icon && (
                <Text style={styles.badgeIcon}>{badgeInfo.icon}</Text>
              )}
              <Text style={[styles.badgeTitle, isActive && styles.badgeTitleActive]}>
                {badgeInfo.title || badgeId}
              </Text>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <PhosphorIcon name="CheckCircle" size={12} color={colors.green} weight="fill" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  badgeActive: {
    backgroundColor: colors.green10,
    borderColor: colors.green,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  badgeTitleActive: {
    color: colors.green,
  },
  activeIndicator: {
    marginLeft: spacing.xs / 2,
  },
});

export default BadgeDisplay;

