/**
 * Avatar Component
 * Centralized component for displaying user avatars with dynamic fetching
 * Handles both local file URLs and Firebase Storage URLs
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  StyleSheet,
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
  borderImageUrl?: string;
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
  borderImageUrl,
  loadingTimeout: _loadingTimeout = 5000,
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
    
    const words = name?.trim().split(' ') || [];
    if (words.length === 1) {
      return words[0]?.charAt(0).toUpperCase() || '?';
    }
    return (words[0]?.charAt(0) || '') + (words[words.length - 1]?.charAt(0) || '') || '?';
  }, []);

  // Track if component is mounted to prevent state updates on unmounted components
  const isMountedRef = useRef(true);

  // Load avatar URL
  const loadAvatarUrl = useCallback(async () => {
    if (!userId) { return; }

    if (!isMountedRef.current) return; // Don't proceed if unmounted

    setIsLoading(true);
    setHasError(false);

    try {
      // Use AvatarService to get the avatar URL
      const avatarService = AvatarService.getInstance();
      const url = await avatarService.getAvatarUrl(userId);
      
      // Check if component is still mounted before setting state
      if (!isMountedRef.current) return;
      
      if (url) {
        setImageUrl(url);
      } else {
        setImageUrl(null);
      }
    } catch (error) {
      // Check if component is still mounted before setting state
      if (!isMountedRef.current) return;
      
      setHasError(true);
      setImageUrl(null);
    } finally {
      // Check if component is still mounted before setting state
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Initialize component
  useEffect(() => {
    isMountedRef.current = true;
    
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
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
    // generateInitials is stable (useCallback with empty deps), loadAvatarUrl is stable (useCallback with userId deps)
  }, [userId, userName, avatarUrl, loadAvatarUrl, generateInitials]);

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
        <ActivityIndicator size="small" color={colors.textSecondary} />
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
    return initials ? (
      <Text style={initialsStyle}>{initials}</Text>
    ) : (
      <Image
        source={{ uri: DEFAULT_AVATAR_URL }}
        style={imageStyle}
        resizeMode="cover"
      />
    );
  };

  // Check if style has width/height that should override default size
  const hasCustomDimensions = style && ((style as any).width === '100%' || (style as any).height === '100%');
  
  const avatarStyle: ViewStyle = {
    ...(dynamicSize || hasCustomDimensions ? {
      width: '100%',
      height: '100%',
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
    width: '100%',
    height: '100%',
    borderRadius: 999, // Large value to ensure circular shape
  } : {
    width: '100%',
    height: '100%',
    borderRadius: size / 2,
  };

  const borderScale = dynamicSize || hasCustomDimensions ? 1.08 : 1.15;

  return (
    <View style={[avatarStyle, { justifyContent: 'center', alignItems: 'center' }]}>
      {getDisplayContent()}
      {borderImageUrl && (
        <Image
          source={{ uri: borderImageUrl }}
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [{ scale: borderScale }],
              zIndex: 2,
            },
          ]}
          resizeMode="contain"
          pointerEvents="none"
        />
      )}
    </View>
  );
};

export default Avatar;
