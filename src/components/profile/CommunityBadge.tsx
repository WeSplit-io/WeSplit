/**
 * Community Badge Component
 * Small badge displayed next to user names/profile pictures
 * Used for community badges that represent communities
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';

interface CommunityBadgeProps {
  icon?: string;
  iconUrl?: string;
  title?: string;
  size?: number;
}

const CommunityBadge: React.FC<CommunityBadgeProps> = ({
  icon,
  iconUrl,
  title,
  size = 20
}) => {
  if (!icon && !iconUrl) {
    return null;
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {iconUrl ? (
        <Image
          source={{ uri: iconUrl }}
          style={[styles.image, { width: size, height: size }]}
          resizeMode="cover"
          onError={(error) => {
            console.warn('Failed to load community badge image', { iconUrl, error });
          }}
        />
      ) : (
        <View style={[styles.iconContainer, { width: size, height: size }]}>
          <Text style={[styles.icon, { fontSize: size * 0.6 }]}>{icon}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default CommunityBadge;

