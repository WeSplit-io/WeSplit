/**
 * Avatar Component
 * Centralized component for displaying user avatars with dynamic fetching
 * Handles both local file URLs and Firebase Storage URLs
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  ImageStyle,
  DimensionValue,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { logger } from '../../services/analytics/loggingService';
import { DEFAULT_AVATAR_URL } from '../../config/constants/constants';
import { AvatarService } from '../../services/core/avatarService';
import type { BorderScaleConfig } from '../../services/rewards/assetConfig';
import { isSvgUrl, isSafeUrl } from '../../utils/ui/format/formatUtils';

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
  // Override automatic profile border rendering per usage
  showProfileBorder?: boolean;
  // Override the multiplier applied to border size
  borderScaleOverride?: number;
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
  showProfileBorder = true,
  borderScaleOverride,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [initials, setInitials] = useState<string>('');
  const [borderError, setBorderError] = useState(false);
  const [resolvedBorderUrl, setResolvedBorderUrl] = useState<string | null>(
    showProfileBorder ? borderImageUrl ?? null : null
  );
  const [assetBorderScale, setAssetBorderScale] = useState<number | undefined>(undefined);
  const [assetBorderScaleConfig, setAssetBorderScaleConfig] = useState<BorderScaleConfig | undefined>(undefined);
  const [borderRefreshKey, setBorderRefreshKey] = useState<number>(0);

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

  const loadBorderImage = useCallback(async () => {
    if (!showProfileBorder || !userId || borderImageUrl) {
      return;
    }

    try {
      const avatarService = AvatarService.getInstance();
      const details = await avatarService.getProfileBorderDetails(userId);

      if (!isMountedRef.current) {
        return;
      }

      setResolvedBorderUrl(details?.url ?? null);
      setAssetBorderScale(details?.scale ?? undefined);
      setAssetBorderScaleConfig(details?.scaleConfig);
      setBorderError(false);
    } catch (error) {
      logger.warn('Failed to load border image', { userId, error }, 'Avatar');
      if (isMountedRef.current) {
        setResolvedBorderUrl(null);
        setAssetBorderScale(undefined);
        setAssetBorderScaleConfig(undefined);
        setBorderError(true);
      }
    }
  }, [userId, borderImageUrl, showProfileBorder]);

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

  // Monitor border refresh timestamp to detect when border changes
  useEffect(() => {
    if (!userId || !showProfileBorder || borderImageUrl) {
      return;
    }

    const checkRefresh = () => {
      if (!isMountedRef.current) {
        return;
      }
      const avatarService = AvatarService.getInstance();
      const refreshTimestamp = avatarService.getBorderRefreshTimestamp(userId);
      if (refreshTimestamp > borderRefreshKey) {
        setBorderRefreshKey(refreshTimestamp);
        // Force reload by calling loadBorderImage
        loadBorderImage();
      }
    };

    // Check immediately
    checkRefresh();

    // Poll periodically to detect changes (every 1 second - balance between responsiveness and performance)
    const interval = setInterval(checkRefresh, 1000);

    return () => clearInterval(interval);
  }, [userId, showProfileBorder, borderImageUrl, borderRefreshKey, loadBorderImage]);

  useEffect(() => {
    if (!showProfileBorder) {
      setResolvedBorderUrl(null);
      setAssetBorderScale(undefined);
      setAssetBorderScaleConfig(undefined);
      setBorderError(false);
      return;
    }

    if (borderImageUrl) {
      setResolvedBorderUrl(borderImageUrl);
      setBorderError(false);
      // Still load the asset config for proper scaling even if URL is provided
      if (userId) {
        const loadAssetConfig = async () => {
          try {
            const avatarService = AvatarService.getInstance();
            const details = await avatarService.getProfileBorderDetails(userId);
            if (isMountedRef.current) {
              setAssetBorderScale(details?.scale ?? undefined);
              setAssetBorderScaleConfig(details?.scaleConfig);
            }
          } catch (error) {
            // Silently fail - we have the URL, just won't have custom scaling
            if (isMountedRef.current) {
              setAssetBorderScale(undefined);
              setAssetBorderScaleConfig(undefined);
            }
          }
        };
        loadAssetConfig();
      } else {
        setAssetBorderScale(undefined);
        setAssetBorderScaleConfig(undefined);
      }
      return;
    }

    if (!userId) {
      setResolvedBorderUrl(null);
      setAssetBorderScale(undefined);
      setAssetBorderScaleConfig(undefined);
      return;
    }

    loadBorderImage();
  }, [borderImageUrl, userId, loadBorderImage, showProfileBorder, borderRefreshKey]);

  // Handle image load error
  const handleImageError = useCallback(() => {
    logger.warn('Avatar image failed to load', { userId }, 'Avatar');
    setHasError(true);
  }, [userId]);

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    logger.debug('Avatar image loaded successfully', { userId }, 'Avatar');
    setHasError(false);
  }, [userId]);

  // Handle border image error
  const handleBorderError = useCallback(() => {
    logger.warn(
      'Border image failed to load',
      { userId, borderImageUrl: borderImageUrl ?? resolvedBorderUrl },
      'Avatar'
    );
    setBorderError(true);
    setResolvedBorderUrl(null);
    setAssetBorderScale(undefined);
    setAssetBorderScaleConfig(undefined);
  }, [userId, borderImageUrl, resolvedBorderUrl]);

  // Determine what to display
  const getDisplayContent = () => {
    // If loading and showLoading is true
    if (isLoading && showLoading) {
      return (
        <ActivityIndicator size="small" color={colors.white70} />
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

  const wrapperStyle: ViewStyle = {
    ...(dynamicSize || hasCustomDimensions
      ? {
          width: '100%',
          height: '100%',
          aspectRatio: 1,
        }
      : {
          width: size,
          height: size,
        }),
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  const circleStyle: ViewStyle = {
    width: '100%',
    height: '100%',
    borderRadius: dynamicSize || hasCustomDimensions ? 999 : size / 2,
    backgroundColor: colors.blackWhite5,
    overflow: 'hidden',
    ...(showBorder && {
      borderWidth: 2,
      borderColor: borderColor,
    }),
    justifyContent: 'center',
    alignItems: 'center',
  };

  // Determine the actual size for border calculations
  // If dynamicSize or hasCustomDimensions, we need to use a reference size
  // Otherwise, use the provided size prop
  const effectiveSize = dynamicSize || hasCustomDimensions ? 60 : size; // Default to 60px for dynamic avatars

  const initialsStyle: TextStyle = {
    fontSize: dynamicSize ? 16 : size * 0.4, // Fallback size for dynamic mode
    fontWeight: '600',
    color: colors.white,
    ...textStyle,
  };

  const fullSize: DimensionValue = '100%';
  const imageStyle: ImageStyle = dynamicSize ? {
    flex: 1,
    width: fullSize,
    height: fullSize,
    borderRadius: 999, // Large value to ensure circular shape
  } : {
    width: fullSize,
    height: fullSize,
    borderRadius: size / 2,
  };

  const configScale = useMemo(() => {
    if (!assetBorderScaleConfig) {
      return undefined;
    }

    if (effectiveSize > 200 && assetBorderScaleConfig.gt200) {
      return assetBorderScaleConfig.gt200;
    }
    if (effectiveSize > 150 && assetBorderScaleConfig.gt150) {
      return assetBorderScaleConfig.gt150;
    }
    if (effectiveSize > 100 && assetBorderScaleConfig.gt100) {
      return assetBorderScaleConfig.gt100;
    }
    if (effectiveSize > 80 && assetBorderScaleConfig.gt80) {
      return assetBorderScaleConfig.gt80;
    }
    if (effectiveSize > 60 && assetBorderScaleConfig.gt60) {
      return assetBorderScaleConfig.gt60;
    }
    return assetBorderScaleConfig.base ?? undefined;
  }, [assetBorderScaleConfig, effectiveSize]);

  // Responsive border scaling - smaller on mobile devices
  const borderScale =
    borderScaleOverride ??
    configScale ??
    assetBorderScale ??
    (effectiveSize < 60 ? 1.12 : effectiveSize < 100 ? 1.14 : 1.15);

  return (
    <View style={wrapperStyle}>
      <View style={circleStyle}>{getDisplayContent()}</View>
      {showProfileBorder && resolvedBorderUrl && !borderError && isSafeUrl(resolvedBorderUrl) && (
        isSvgUrl(resolvedBorderUrl) ? (
          <View
            style={{
              position: 'absolute',
              top: -(effectiveSize * (borderScale - 1)) / 2,
              left: -(effectiveSize * (borderScale - 1)) / 2,
              width: effectiveSize * borderScale,
              height: effectiveSize * borderScale,
              zIndex: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <SvgUri
              uri={resolvedBorderUrl}
              width={effectiveSize * borderScale}
              height={effectiveSize * borderScale}
              onError={handleBorderError}
            />
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              top: -(effectiveSize * (borderScale - 1)) / 2,
              left: -(effectiveSize * (borderScale - 1)) / 2,
              width: effectiveSize * borderScale,
              height: effectiveSize * borderScale,
              zIndex: 2,
            }}
            pointerEvents="none"
          >
            <Image
              source={{ uri: resolvedBorderUrl }}
              style={{ width: fullSize, height: fullSize }}
              resizeMode="contain"
              onError={handleBorderError}
            />
          </View>
        )
      )}
    </View>
  );
};

export default Avatar;
