/**
 * Badge Display Component
 * Displays user badges and labels on profile pages
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { badgeService } from '../../services/rewards/badgeService';

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
  const [badgeInfoMap, setBadgeInfoMap] = React.useState<Map<string, any>>(new Map());

  // Load badge info from database for all badges
  React.useEffect(() => {
    const loadBadgeInfo = async () => {
      if (!badges || badges.length === 0) return;

      const infoMap = new Map();
      await Promise.all(
        badges.map(async (badgeId) => {
          const info = await badgeService.getBadgeInfoPublic(badgeId);
          if (info) {
            infoMap.set(badgeId, info);
          }
        })
      );
      setBadgeInfoMap(infoMap);
    };

    loadBadgeInfo();
  }, [badges]);

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
        const badgeInfo = badgeInfoMap.get(badgeId);
        if (!badgeInfo) {
          // Badge info not loaded yet or doesn't exist
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
              {badgeInfo.iconUrl ? (
                <Image
                  source={{ uri: badgeInfo.iconUrl }}
                  style={styles.badgeIconImage}
                  resizeMode="cover"
                />
              ) : badgeInfo.icon ? (
                <Text style={styles.badgeIcon}>{badgeInfo.icon}</Text>
              ) : null}
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
    backgroundColor: colors.white10,
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
  badgeIconImage: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: spacing.xs / 2,
  },
  badgeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  badgeTitleActive: {
    color: colors.green,
  },
  activeIndicator: {
    marginLeft: spacing.xs / 2,
  },
});

export default BadgeDisplay;

