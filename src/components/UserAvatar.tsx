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
import { logger } from '../services/core';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { userImageService } from '../services/core';
import { UserImageInfo, UserImageService } from '../services/core/userImageService';
import { DEFAULT_AVATAR_URL } from '../config/constants/constants';

interface UserAvatarProps {
  userId?: string;
  userName?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showBorder?: boolean;
  borderColor?: string;
  // If user data is already available, pass it to avoid extra API calls
  userImageInfo?: UserImageInfo;
  // Direct avatar URL if available
  avatarUrl?: string;
  // For simple avatar display without user lookup
  displayName?: string;
  // Loading timeout in milliseconds (default: 5000)
  loadingTimeout?: number;
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
  avatarUrl,
  displayName,
  loadingTimeout = 5000,
}) => {
  const [imageInfo, setImageInfo] = useState<UserImageInfo | null>(userImageInfo || null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    logger.debug('Props received', {
      userId,
      userName,
      displayName,
      userImageInfo: !!userImageInfo,
      avatarUrl,
      hasAvatarUrl: !!avatarUrl
    });

    if (userImageInfo) {
      // Use provided userImageInfo
      setImageInfo(userImageInfo);
    } else if (avatarUrl) {
      // Use provided avatarUrl directly
      setImageInfo({
        userId: userId || 'unknown',
        imageUrl: avatarUrl,
        hasImage: true,
        fallbackInitials: UserImageService.generateInitials(userName || displayName || 'User'),
      });
    } else if (userId) {
      // Fetch image info if userId is provided
      logger.debug('Fetching image info from service', null, 'UserAvatar');
      const fetchImageInfo = async () => {
        try {
          const info = await userImageService.getUserImageInfo(userId, userName || displayName);
          logger.debug('Fetched image info', { info }, 'UserAvatar');
          setImageInfo(info);
        } catch (error) {
          console.error('UserAvatar: Error fetching image info:', error);
          // Set fallback
          setImageInfo({
            userId,
            imageUrl: undefined,
            hasImage: false,
            fallbackInitials: UserImageService.generateInitials(userName || displayName || 'User'),
          });
        }
      };

      fetchImageInfo();
    } else {
      // No userId provided, use displayName for initials
      setImageInfo({
        userId: 'unknown',
        imageUrl: undefined,
        hasImage: false,
        fallbackInitials: UserImageService.generateInitials(displayName || userName || 'User'),
      });
    }
  }, [userId, userName, displayName, userImageInfo, avatarUrl]);

  // Add loading timeout
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        logger.warn('Loading timeout, falling back to placeholder', null, 'UserAvatar');
        setIsLoading(false);
        setImageError(true);
      }, loadingTimeout);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, loadingTimeout]);

  const handleImageError = () => {
    logger.warn('Image failed to load, using fallback', null, 'UserAvatar');
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoadStart = () => {
    setIsLoading(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
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

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (!imageInfo) {
    // Loading state
    return (
      <View style={avatarStyle}>
        <Text style={initialsStyle}>...</Text>
      </View>
    );
  }

  // Show image if available and no error, otherwise show placeholder image
  const imageUri = (imageInfo.hasImage && imageInfo.imageUrl && !imageError) 
    ? imageInfo.imageUrl 
    : DEFAULT_AVATAR_URL;

  return (
    <View style={[avatarStyle, { overflow: 'hidden', position: 'relative' }]}>
      {isLoading && (
        <View style={[avatarStyle, { 
          position: 'absolute', 
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1
        }]}>
          <Text style={initialsStyle}>...</Text>
        </View>
      )}
      <Image
        source={{ uri: imageUri }}
        style={[imageStyle, { opacity: isLoading ? 0 : 1 }]}
        onLoadStart={handleImageLoadStart}
        onLoad={handleImageLoad}
        onError={handleImageError}
        resizeMode="cover"
      />
    </View>
  );
};

export default UserAvatar;
