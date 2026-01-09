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
  showBadges?: boolean;
}

const UserNameWithBadges: React.FC<UserNameWithBadgesProps> = ({
  userId,
  userName,
  style,
  textStyle,
  showBadges = true
}) => {
  const [communityBadges, setCommunityBadges] = useState<any[]>([]);

  useEffect(() => {
    // Community badges are disabled - do not load or display them
    setCommunityBadges([]);
  }, [userId, showBadges]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.name, textStyle]}>{userName}</Text>
      {/* Community badges are disabled - not displaying them */}
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
    color: colors.white,
  },
});

export default UserNameWithBadges;

