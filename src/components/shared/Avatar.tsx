/**
 * Avatar Component
 * Centralized component for displaying user avatars with dynamic fetching
 * Handles both local file URLs and Firebase Storage URLs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { logger } from '../../services/analytics/loggingService';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import { AvatarService } from '../../services/core/avatarService';

interface AvatarProps {
  userId?: string;
  userName?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  showBorder?: boolean;
  borderColor?: string;
  // Direct avatar URL if available (for backward compatibility)
  avatarUrl?: string;
  // Loading timeout in milliseconds (default: 5000)
  loadingTimeout?: number;
  // Whether to show loading indicator
  showLoading?: boolean;
  // Whether to use dynamic sizing (flex: 1 with aspectRatio: 1)
  dynamicSize?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  userId,
  userName,
  size = 40,
  style,
  textStyle,
  showBorder = false,
  borderColor = colors.green,
  avatarUrl,
  loadingTimeout = 5000,
  showLoading = true,
  dynamicSize = false,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [initials, setInitials] = useState<string>('');

  // Generate initials from name
  const generateInitials = useCallback((name: string): string => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }, []);

  // Load avatar URL
  const loadAvatarUrl = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setHasError(false);

    try {
      logger.debug('Loading avatar for user', { userId }, 'Avatar');
      
      // Use AvatarService to get the avatar URL
      const avatarService = AvatarService.getInstance();
      const url = await avatarService.getAvatarUrl(userId);
      
      if (url) {
        setImageUrl(url);
        logger.debug('Avatar URL loaded successfully', { userId, url }, 'Avatar');
      } else {
        setImageUrl(null);
        logger.debug('No avatar found for user', { userId }, 'Avatar');
      }
    } catch (error) {
      logger.error('Failed to load avatar URL', { userId, error }, 'Avatar');
      setHasError(true);
      setImageUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initialize component
  useEffect(() => {
    // Set initials
    if (userName) {
      setInitials(generateInitials(userName));
    }

    // If avatarUrl is provided directly, use it
    if (avatarUrl) {
      setImageUrl(avatarUrl);
      setIsLoading(false);
      return;
    }

    // If userId is provided, load avatar
    if (userId) {
      loadAvatarUrl();
    } else {
      setIsLoading(false);
    }
  }, [userId, userName, avatarUrl]); // Removed loadAvatarUrl and generateInitials from dependencies

  // Handle image load error
  const handleImageError = useCallback(() => {
    logger.warn('Avatar image failed to load', { userId, imageUrl }, 'Avatar');
    setHasError(true);
    setImageUrl(null);
  }, [userId, imageUrl]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    logger.debug('Avatar image loaded successfully', { userId }, 'Avatar');
    setHasError(false);
  }, [userId]);

  // Determine what to display
  const getDisplayContent = () => {
    // If loading and showLoading is true
    if (isLoading && showLoading) {
      return (
        <View style={[avatarStyle, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      );
    }

    // If we have a valid image URL and no error
    if (imageUrl && !hasError) {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={imageStyle}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
        />
      );
    }

    // Fallback to initials or default avatar
    return (
      <View style={[avatarStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        {initials ? (
          <Text style={initialsStyle}>{initials}</Text>
        ) : (
          <Image
            source={{ uri: DEFAULT_AVATAR_URL }}
            style={imageStyle}
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  const avatarStyle: ViewStyle = {
    ...(dynamicSize ? {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 999, // Large value to ensure circular shape
    } : {
      width: size,
      height: size,
      borderRadius: size / 2,
    }),
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...(showBorder && {
      borderWidth: 2,
      borderColor: borderColor,
    }),
    ...style,
  };

  const initialsStyle: TextStyle = {
    fontSize: dynamicSize ? 16 : size * 0.4, // Fallback size for dynamic mode
    fontWeight: '600',
    color: colors.white,
    ...textStyle,
  };

  const imageStyle = dynamicSize ? {
    flex: 1,
    borderRadius: 999, // Large value to ensure circular shape
  } : {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={avatarStyle}>
      {getDisplayContent()}
    </View>
  );
};

export default Avatar;
