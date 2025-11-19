/**
 * User Name With Badges Component
 * Displays user name with community badges next to it
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import CommunityBadge from './CommunityBadge';
import { badgeService } from '../../services/rewards/badgeService';

interface UserNameWithBadgesProps {
  userId: string;
  userName: string;
  style?: any;
  textStyle?: any;
}

const UserNameWithBadges: React.FC<UserNameWithBadgesProps> = ({
  userId,
  userName,
  style,
  textStyle
}) => {
  const [communityBadges, setCommunityBadges] = useState<any[]>([]);

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const badges = await badgeService.getUserCommunityBadges(userId);
        setCommunityBadges(badges);
      } catch (error) {
        // Silently fail - badges are optional
      }
    };

    if (userId) {
      loadBadges();
    }
  }, [userId]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.name, textStyle]}>{userName}</Text>
      {communityBadges.map((badge) => (
        <CommunityBadge
          key={badge.badgeId}
          icon={badge.icon}
          iconUrl={badge.imageUrl}
          title={badge.title}
          size={16}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
});

export default UserNameWithBadges;

