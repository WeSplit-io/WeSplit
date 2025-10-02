/**
 * User Avatar Component
 * Displays user profile images with fallback to initials
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { UserImageService, UserImageInfo } from '../services/userImageService';

interface UserAvatarProps {
  userId: string;
  userName?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showBorder?: boolean;
  borderColor?: string;
  // If user data is already available, pass it to avoid extra API calls
  userImageInfo?: UserImageInfo;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  userName,
  size = 40,
  style,
  textStyle,
  showBorder = false,
  borderColor = colors.green,
  userImageInfo,
}) => {
  const [imageInfo, setImageInfo] = useState<UserImageInfo | null>(userImageInfo || null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!userImageInfo) {
      // Fetch image info if not provided
      const fetchImageInfo = async () => {
        try {
          const info = await UserImageService.getUserImageInfo(userId, userName);
          setImageInfo(info);
        } catch (error) {
          console.error('UserAvatar: Error fetching image info:', error);
          // Set fallback
          setImageInfo({
            userId,
            imageUrl: undefined,
            hasImage: false,
            fallbackInitials: UserImageService.generateInitials(userName || 'User'),
          });
        }
      };

      fetchImageInfo();
    } else {
      setImageInfo(userImageInfo);
    }
  }, [userId, userName, userImageInfo]);

  const handleImageError = () => {
    console.log('UserAvatar: Image failed to load, using fallback');
    setImageError(true);
  };

  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...(showBorder && {
      borderWidth: 2,
      borderColor: borderColor,
    }),
    ...style,
  };

  const initialsStyle: TextStyle = {
    fontSize: size * 0.4,
    fontWeight: '600',
    color: colors.white,
    ...textStyle,
  };

  if (!imageInfo) {
    // Loading state
    return (
      <View style={avatarStyle}>
        <Text style={initialsStyle}>...</Text>
      </View>
    );
  }

  // Show image if available and no error
  if (imageInfo.hasImage && imageInfo.imageUrl && !imageError) {
    return (
      <Image
        source={{ uri: imageInfo.imageUrl }}
        style={avatarStyle}
        onError={handleImageError}
        resizeMode="cover"
      />
    );
  }

  // Show initials fallback
  return (
    <View style={avatarStyle}>
      <Text style={initialsStyle}>
        {imageInfo.fallbackInitials}
      </Text>
    </View>
  );
};

export default UserAvatar;
