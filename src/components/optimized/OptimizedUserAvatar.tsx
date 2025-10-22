/**
 * Optimized User Avatar Component
 * Performance-optimized version with React.memo, useMemo, and useCallback
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface OptimizedUserAvatarProps {
  avatarUrl?: string;
  displayName: string;
  size?: number;
  style?: any;
  loadingTimeout?: number;
}

const OptimizedUserAvatar: React.FC<OptimizedUserAvatarProps> = memo(({
  avatarUrl,
  displayName,
  size = 40,
  style,
  loadingTimeout = 5000
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Memoize initials calculation
  const initials = useMemo(() => {
    if (!displayName) {return 'U';}
    
    const words = displayName.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }, [displayName]);

  // Memoize avatar styles
  const avatarStyles = useMemo(() => StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.primaryGreen,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      ...style
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    initials: {
      color: colors.background,
      fontSize: size * 0.4,
      fontWeight: 'bold',
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
    }
  }), [size, style]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  // Set loading timeout
  useEffect(() => {
    if (avatarUrl && imageLoading) {
      const timeout = setTimeout(() => {
        setImageLoading(false);
        setImageError(true);
      }, loadingTimeout);

      return () => clearTimeout(timeout);
    }
  }, [avatarUrl, imageLoading, loadingTimeout]);

  // Reset states when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [avatarUrl]);

  // Determine what to render
  const shouldShowImage = avatarUrl && !imageError && !imageLoading;
  const shouldShowInitials = !avatarUrl || imageError;

  return (
    <View style={avatarStyles.container}>
      {shouldShowImage && (
        <Image
          source={{ uri: avatarUrl }}
          style={avatarStyles.image}
          onLoad={handleImageLoad}
          onError={handleImageError}
          resizeMode="cover"
        />
      )}
      
      {imageLoading && (
        <View style={avatarStyles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primaryGreen} />
        </View>
      )}
      
      {shouldShowInitials && (
        <Text style={avatarStyles.initials}>
          {initials}
        </Text>
      )}
    </View>
  );
});

// Set display name for debugging
OptimizedUserAvatar.displayName = 'OptimizedUserAvatar';

export default OptimizedUserAvatar;
