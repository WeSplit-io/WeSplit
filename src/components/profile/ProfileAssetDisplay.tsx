/**
 * Profile Asset Display Component
 * Displays profile assets (images, backgrounds) on profile pages
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { getAssetInfo } from '../../services/rewards/assetConfig';

interface ProfileAssetDisplayProps {
  profileAssets?: string[];
  activeProfileAsset?: string;
  walletBackgrounds?: string[];
  activeWalletBackground?: string;
  showProfileAsset?: boolean;
  showWalletBackground?: boolean;
}

const ProfileAssetDisplay: React.FC<ProfileAssetDisplayProps> = ({
  profileAssets = [],
  activeProfileAsset,
  walletBackgrounds = [],
  activeWalletBackground,
  showProfileAsset = true,
  showWalletBackground = false,
}) => {

  if (showProfileAsset && activeProfileAsset) {
    const assetInfo = getAssetInfo(activeProfileAsset);
    if (!assetInfo || assetInfo.assetType !== 'profile_image') {
      return null;
    }
    
    return (
      <View style={styles.container}>
        <View style={styles.assetBadge}>
          <PhosphorIcon name="Image" size={16} color={colors.green} weight="regular" />
          <Text style={styles.assetText}>{assetInfo.name || activeProfileAsset}</Text>
        </View>
      </View>
    );
  }

  if (showWalletBackground && activeWalletBackground) {
    const assetInfo = getAssetInfo(activeWalletBackground);
    if (!assetInfo || assetInfo.assetType !== 'wallet_background') {
      return null;
    }
    
    return (
      <View style={styles.container}>
        <View style={styles.assetBadge}>
          <PhosphorIcon name="ImageSquare" size={16} color={colors.green} weight="regular" />
          <Text style={styles.assetText}>{assetInfo.name || activeWalletBackground}</Text>
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
});

export default ProfileAssetDisplay;

