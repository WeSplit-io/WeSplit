/**
 * Profile Asset Display Component
 * Displays profile assets (images, backgrounds) on profile pages
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { getAssetInfo } from '../../services/rewards/assetConfig';
import { getUserAssetMetadata, AssetInfo } from '../../services/rewards/assetService';

interface ProfileAssetDisplayProps {
  userId?: string;
  profileAssets?: string[];
  activeProfileAsset?: string;
  profileBorders?: string[];
  activeProfileBorder?: string;
  walletBackgrounds?: string[];
  activeWalletBackground?: string;
  showProfileAsset?: boolean;
  showProfileBorder?: boolean;
  showWalletBackground?: boolean;
}

const ProfileAssetDisplay: React.FC<ProfileAssetDisplayProps> = ({
  userId,
  profileAssets = [],
  activeProfileAsset,
  profileBorders = [],
  activeProfileBorder,
  walletBackgrounds = [],
  activeWalletBackground,
  showProfileAsset = true,
  showProfileBorder = false,
  showWalletBackground = false,
}) => {
  const [profileAssetInfo, setProfileAssetInfo] = useState<AssetInfo | null>(null);
  const [profileBorderInfo, setProfileBorderInfo] = useState<AssetInfo | null>(null);
  const [walletAssetInfo, setWalletAssetInfo] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Load asset metadata from database
  useEffect(() => {
    const loadAssetMetadata = async () => {
      if (!userId) {
        // Fallback to config if no userId
        if (activeProfileAsset) {
          setProfileAssetInfo(getAssetInfo(activeProfileAsset));
        }
        if (activeProfileBorder) {
          setProfileBorderInfo(getAssetInfo(activeProfileBorder));
        }
        if (activeWalletBackground) {
          setWalletAssetInfo(getAssetInfo(activeWalletBackground));
        }
        return;
      }

      setLoading(true);
      try {
        if (activeProfileAsset) {
          const metadata = await getUserAssetMetadata(userId, activeProfileAsset);
          setProfileAssetInfo(metadata);
        }
        if (activeProfileBorder) {
          const metadata = await getUserAssetMetadata(userId, activeProfileBorder);
          setProfileBorderInfo(metadata);
        }
        if (activeWalletBackground) {
          const metadata = await getUserAssetMetadata(userId, activeWalletBackground);
          setWalletAssetInfo(metadata);
        }
      } catch (error) {
        console.error('Failed to load asset metadata:', error);
        // Fallback to config on error
        if (activeProfileAsset) {
          setProfileAssetInfo(getAssetInfo(activeProfileAsset));
        }
        if (activeProfileBorder) {
          setProfileBorderInfo(getAssetInfo(activeProfileBorder));
        }
        if (activeWalletBackground) {
          setWalletAssetInfo(getAssetInfo(activeWalletBackground));
        }
      } finally {
        setLoading(false);
      }
    };

    loadAssetMetadata();
  }, [userId, activeProfileAsset, activeProfileBorder, activeWalletBackground]);

  if (showProfileAsset && activeProfileAsset) {
    const assetInfo = profileAssetInfo || getAssetInfo(activeProfileAsset);
    if (!assetInfo || assetInfo.assetType !== 'profile_image') {
      return null;
    }
    
    const imageUrl = assetInfo.url || assetInfo.nftMetadata?.imageUrl;
    
    return (
      <View style={styles.container}>
        <View style={styles.assetBadge}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.assetImage}
              resizeMode="cover"
            />
          ) : (
            <PhosphorIcon name="Image" size={16} color={colors.green} weight="regular" />
          )}
          <Text style={styles.assetText}>{assetInfo.name || activeProfileAsset}</Text>
          {assetInfo.nftMetadata && (
            <View style={styles.nftIndicator}>
              <PhosphorIcon name="Cube" size={10} color={colors.green} weight="fill" />
            </View>
          )}
        </View>
      </View>
    );
  }

  if (showWalletBackground && activeWalletBackground) {
    const assetInfo = walletAssetInfo || getAssetInfo(activeWalletBackground);
    if (!assetInfo || assetInfo.assetType !== 'wallet_background') {
      return null;
    }
    
    const imageUrl = assetInfo.url || assetInfo.nftMetadata?.imageUrl;
    
    return (
      <View style={styles.container}>
        <View style={styles.assetBadge}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.assetImage}
              resizeMode="cover"
            />
          ) : (
            <PhosphorIcon name="ImageSquare" size={16} color={colors.green} weight="regular" />
          )}
          <Text style={styles.assetText}>{assetInfo.name || activeWalletBackground}</Text>
          {assetInfo.nftMetadata && (
            <View style={styles.nftIndicator}>
              <PhosphorIcon name="Cube" size={10} color={colors.green} weight="fill" />
            </View>
          )}
        </View>
      </View>
    );
  }

  if (showProfileBorder && activeProfileBorder) {
    const assetInfo = profileBorderInfo || getAssetInfo(activeProfileBorder);
    if (!assetInfo || assetInfo.assetType !== 'profile_border') {
      return null;
    }
    
    const imageUrl = assetInfo.url || assetInfo.nftMetadata?.imageUrl;
    
    return (
      <View style={styles.container}>
        <View style={styles.assetBadge}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.assetImage}
              resizeMode="cover"
            />
          ) : (
            <PhosphorIcon name="CircleHalf" size={16} color={colors.green} weight="regular" />
          )}
          <Text style={styles.assetText}>{assetInfo.name || activeProfileBorder}</Text>
          {assetInfo.nftMetadata && (
            <View style={styles.nftIndicator}>
              <PhosphorIcon name="Cube" size={10} color={colors.green} weight="fill" />
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  assetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.green10,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.green,
  },
  assetText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
  },
  assetImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: spacing.xs / 2,
  },
  nftIndicator: {
    marginLeft: spacing.xs / 2,
  },
});

export default ProfileAssetDisplay;

