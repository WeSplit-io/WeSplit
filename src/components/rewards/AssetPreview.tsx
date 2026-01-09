/**
 * Asset Preview Component
 * Reusable component for previewing assets (profile borders, wallet backgrounds, profile images)
 * Can be used in event modals, gift claims, and other reward flows
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import UserAvatar from '../UserAvatar';
import { AssetGift } from '../../types/rewards';

export interface AssetPreviewProps {
  /** The asset gift to preview */
  asset: AssetGift;
  /** Resolved image URL (if asset.url needs to be resolved from gs://) */
  resolvedImageUrl?: string;
  /** User ID for avatar preview (for profile borders) */
  userId?: string;
  /** User avatar URL for avatar preview (for profile borders) */
  userAvatarUrl?: string;
  /** User name for avatar preview (for profile borders) */
  userName?: string;
  /** Optional title override */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Custom container style */
  containerStyle?: any;
}

/**
 * Asset Preview Component
 * Displays a preview of an asset based on its type
 */
export const AssetPreview: React.FC<AssetPreviewProps> = ({
  asset,
  resolvedImageUrl,
  userId,
  userAvatarUrl,
  userName,
  title,
  subtitle,
  containerStyle
}) => {
  const imageUrl = resolvedImageUrl || asset.assetUrl;
  const displayTitle = title || asset.name;
  const displaySubtitle = subtitle || asset.description;

  // Wallet background preview
  if (asset.assetType === 'wallet_background') {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.walletPreviewWrapper}>
          {imageUrl ? (
            <View style={styles.walletPreviewImageFrame}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.walletPreviewImage}
                resizeMode="cover"
                onError={() => {
                  // Image failed to load - placeholder will show
                }}
              />
            </View>
          ) : (
            <View style={[styles.walletPreviewImage, styles.placeholderContainer]}>
              <Text style={styles.placeholderText}>Image loading...</Text>
            </View>
          )}
        </View>
        {displayTitle && (
          <Text style={styles.title}>{displayTitle}</Text>
        )}
        {displaySubtitle && (
          <Text style={styles.subtitle}>{displaySubtitle}</Text>
        )}
      </View>
    );
  }

  // Profile border preview
  if (asset.assetType === 'profile_border') {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.profilePreviewWrapper}>
          <UserAvatar
            userId={userId || ''}
            userName={userName || 'Preview User'}
            displayName={userName || 'Preview User'}
            avatarUrl={userAvatarUrl}
            size={80}
          />
        </View>
        {displayTitle && (
          <Text style={styles.title}>{displayTitle}</Text>
        )}
        {displaySubtitle && (
          <Text style={styles.subtitle}>{displaySubtitle}</Text>
        )}
      </View>
    );
  }

  // Profile image preview
  if (asset.assetType === 'profile_image') {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.profileImagePreviewWrapper}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.profileImagePreview}
              resizeMode="cover"
              onError={() => {
                // Image failed to load
              }}
            />
          ) : (
            <View style={[styles.profileImagePreview, styles.placeholderContainer]}>
              <Text style={styles.placeholderText}>Image loading...</Text>
            </View>
          )}
        </View>
        {displayTitle && (
          <Text style={styles.title}>{displayTitle}</Text>
        )}
        {displaySubtitle && (
          <Text style={styles.subtitle}>{displaySubtitle}</Text>
        )}
      </View>
    );
  }

  // Default/unknown asset type
  return (
    <View style={[styles.container, containerStyle]}>
      {displayTitle && (
        <Text style={styles.title}>{displayTitle}</Text>
      )}
      {displaySubtitle && (
        <Text style={styles.subtitle}>{displaySubtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  walletPreviewWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  walletPreviewImageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.white10,
  },
  walletPreviewImage: {
    width: '100%',
    height: '100%',
  },
  profilePreviewWrapper: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  profileImagePreviewWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: colors.white10,
    marginBottom: spacing.sm,
  },
  profileImagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
});

export default AssetPreview;

