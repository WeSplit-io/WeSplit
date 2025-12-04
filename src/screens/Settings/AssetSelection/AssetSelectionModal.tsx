/**
 * Asset Selection Modal
 * Modal version of AssetSelectionScreen for selecting profile borders and wallet backgrounds
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Modal } from '../../../components/shared';
import { colors, spacing } from '../../../theme';
import { typography } from '../../../theme/typography';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import { useApp } from '../../../context/AppContext';
import { getAssetInfo, getAssetsByType } from '../../../services/rewards/assetConfig';
import { getCanonicalAssetId } from '../../../services/rewards/assetIdMapping';
import { resolveStorageUrl } from '../../../services/shared/storageUrlService';
import { firebaseDataService } from '../../../services/data/firebaseDataService';
import { logger } from '../../../services/analytics/loggingService';
import Avatar from '../../../components/shared/Avatar';

// Helper to check if URL is an SVG
const isSvgUrl = (url: string): boolean => {
  return url.toLowerCase().includes('.svg');
};

// Helper to check if URL is safe to use (not gs://)
const isSafeUrl = (url?: string): boolean => {
  if (!url) return false;
  return !url.startsWith('gs://') && !url.includes('PLACEHOLDER');
};

// Component to render either SVG or Image
const AssetImage: React.FC<{
  uri: string;
  style: any;
  resizeMode?: 'contain' | 'cover';
}> = ({ uri, style, resizeMode = 'contain' }) => {
  if (isSvgUrl(uri)) {
    return (
      <SvgUri
        uri={uri}
        width={style.width || '100%'}
        height={style.height || '100%'}
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
};

interface AssetSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  assetType: 'profile_border' | 'wallet_background';
  maxHeight?: string | number;
}

// Stable empty array to prevent re-renders
const EMPTY_ARRAY: string[] = [];

const getBorderScaleForSize = (assetId?: string | null, sizeValue = 100): number | undefined => {
  if (!assetId) {
    return undefined;
  }

  const asset = getAssetInfo(assetId);
  if (!asset) {
    return undefined;
  }

  const config = asset.borderScaleConfig;
  if (config) {
    if (sizeValue > 200 && config.gt200) {
      return config.gt200;
    }
    if (sizeValue > 150 && config.gt150) {
      return config.gt150;
    }
    if (sizeValue > 100 && config.gt100) {
      return config.gt100;
    }
    if (sizeValue > 80 && config.gt80) {
      return config.gt80;
    }
    if (sizeValue > 60 && config.gt60) {
      return config.gt60;
    }
    return config.base ?? asset.borderScale;
  }

  return asset.borderScale;
};

const AssetSelectionModal: React.FC<AssetSelectionModalProps> = ({ visible, onClose, assetType, maxHeight = '80%' }) => {
  const { state, updateUser, refreshUser } = useApp();
  const { currentUser } = state;
  
  const [loading, setLoading] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Track which asset IDs we've already resolved to prevent infinite loops
  const resolvedAssetIdsRef = useRef<string>('');
  // Track last refresh time to avoid too frequent refreshes
  const lastRefreshRef = useRef<number>(0);

  // Get user's owned assets - use stable empty array to prevent infinite loops
  const ownedBorders = currentUser?.profile_borders ?? EMPTY_ARRAY;
  const ownedBackgrounds = currentUser?.wallet_backgrounds ?? EMPTY_ARRAY;

  const currentUserDisplayName =
    currentUser?.name || currentUser?.email?.split('@')[0] || 'User';

  const canonicalActiveProfileBorder = useMemo(
    () => getCanonicalAssetId(currentUser?.active_profile_border) || currentUser?.active_profile_border,
    [currentUser?.active_profile_border]
  );

  const canonicalActiveWalletBackground = useMemo(
    () => getCanonicalAssetId(currentUser?.active_wallet_background) || currentUser?.active_wallet_background,
    [currentUser?.active_wallet_background]
  );
  
  // Get all available assets from config
  const allBorders = useMemo(() => getAssetsByType('profile_border'), []);
  const allBackgrounds = useMemo(() => getAssetsByType('wallet_background'), []);
  
  // Filter to show only owned assets and handle backward compatibility - memoize with stable dependencies
  const userBorders = useMemo(() => {
    // Create a set of canonical asset IDs that the user owns (including mapped old IDs)
    const canonicalOwnedBorderIds = new Set<string>();

    // Check each owned border ID
    ownedBorders.forEach(ownedId => {
      // If this ID has a mapping, use the canonical (mapped) version
      const canonicalId = getCanonicalAssetId(ownedId) || ownedId;

      // Only add if the canonical asset exists in our config
      if (allBorders.some(a => a.assetId === canonicalId)) {
        canonicalOwnedBorderIds.add(canonicalId);
      }
    });

    // Return the canonical assets that the user owns
    return allBorders.filter(a => canonicalOwnedBorderIds.has(a.assetId));
  }, [allBorders, ownedBorders]);

  const userBackgrounds = useMemo(() => {
    // Create a set of canonical asset IDs that the user owns (including mapped old IDs)
    const canonicalOwnedBackgroundIds = new Set<string>();

    // Check each owned background ID
    ownedBackgrounds.forEach(ownedId => {
      // If this ID has a mapping, use the canonical (mapped) version
      const canonicalId = getCanonicalAssetId(ownedId) || ownedId;

      // Only add if the canonical asset exists in our config
      if (allBackgrounds.some(a => a.assetId === canonicalId)) {
        canonicalOwnedBackgroundIds.add(canonicalId);
      }
    });

    // Get owned backgrounds
    const owned = allBackgrounds.filter(a => canonicalOwnedBackgroundIds.has(a.assetId));
    
    // Always include the 2 default WeSplit backgrounds for all users
    const defaultBackgrounds = allBackgrounds.filter(a => 
      a.assetId === 'wallet_wesplit_default_1' || a.assetId === 'wallet_wesplit_default_2'
    );
    
    // Combine: default backgrounds first, then owned backgrounds (avoid duplicates)
    const defaultIds = new Set(defaultBackgrounds.map(a => a.assetId));
    const ownedWithoutDefaults = owned.filter(a => !defaultIds.has(a.assetId));
    
    return [...defaultBackgrounds, ...ownedWithoutDefaults];
  }, [allBackgrounds, ownedBackgrounds]);

  // Create stable asset list for URL resolution
  const assetIdsToResolve = useMemo(() => {
    const assets = assetType === 'profile_border' ? userBorders : userBackgrounds;
    // Always include default backgrounds for wallet backgrounds
    if (assetType === 'wallet_background') {
      const defaultIds = ['wallet_wesplit_default_1', 'wallet_wesplit_default_2'];
      const allAssetIds = [...assets.map(a => a.assetId), ...defaultIds];
      return [...new Set(allAssetIds)].sort().join(',');
    }
    return assets.map(a => a.assetId).sort().join(',');
  }, [assetType, userBorders, userBackgrounds]);

  // Resolve storage URLs for assets
  useEffect(() => {
    // Skip if no assets or already resolved this exact set
    if (!assetIdsToResolve || assetIdsToResolve === resolvedAssetIdsRef.current || !visible) {
      return;
    }
    
    const resolveUrls = async () => {
      const urlMap: Record<string, string> = {};
      let assets = assetType === 'profile_border' ? userBorders : userBackgrounds;
      
      // For wallet backgrounds, ensure default backgrounds are included
      if (assetType === 'wallet_background') {
        const defaultBackgrounds = allBackgrounds.filter(a => 
          a.assetId === 'wallet_wesplit_default_1' || a.assetId === 'wallet_wesplit_default_2'
        );
        const defaultIds = new Set(defaultBackgrounds.map(a => a.assetId));
        const ownedWithoutDefaults = assets.filter(a => !defaultIds.has(a.assetId));
        assets = [...defaultBackgrounds, ...ownedWithoutDefaults];
      }
      
      logger.info('Resolving asset URLs', { 
        count: assets.length, 
        assetIds: assetIdsToResolve,
        assets: assets.map(a => ({ id: a.assetId, url: a.url }))
      }, 'AssetSelectionModal');
      
      // Resolve asset URLs
      for (const asset of assets) {
        if (asset.url) {
          try {
            logger.debug('Attempting to resolve URL', { assetId: asset.assetId, url: asset.url }, 'AssetSelectionModal');
            const resolved = await resolveStorageUrl(asset.url, { assetId: asset.assetId });
            if (resolved) {
              urlMap[asset.assetId] = resolved;
              logger.debug('Successfully resolved URL', { assetId: asset.assetId, resolved }, 'AssetSelectionModal');
            } else {
              logger.warn('URL resolution returned undefined', { assetId: asset.assetId, url: asset.url }, 'AssetSelectionModal');
            }
          } catch (error) {
            logger.error('Failed to resolve asset URL', { assetId: asset.assetId, url: asset.url, error }, 'AssetSelectionModal');
          }
        } else {
          logger.warn('Asset has no URL', { assetId: asset.assetId }, 'AssetSelectionModal');
        }
      }
      
      logger.info('URL resolution complete', { resolvedCount: Object.keys(urlMap).length, urlMap }, 'AssetSelectionModal');
      
      // Mark these asset IDs as resolved before setting state
      resolvedAssetIdsRef.current = assetIdsToResolve;
      setResolvedUrls(urlMap);
    };
    
    resolveUrls();
  }, [assetIdsToResolve, assetType, userBorders, userBackgrounds, visible, allBackgrounds]);

  const handleSelectBorder = useCallback(async (assetId: string | null) => {
    if (!currentUser?.id) return;
    
    setLoading(assetId || 'none');
    try {
      // Update Firestore directly
      await firebaseDataService.user.updateUser(currentUser.id, {
        active_profile_border: assetId || undefined
      });

      // Update local state
      updateUser({
        active_profile_border: assetId || undefined
      });

      // Invalidate AvatarService cache to force all Avatar components to reload the border
      const { AvatarService } = await import('../../../services/core/avatarService');
      AvatarService.getInstance().clearUserCache(currentUser.id);

      Alert.alert('Success', assetId ? 'Profile border applied!' : 'Profile border removed!');
      onClose();
    } catch (error) {
      logger.error('Failed to apply profile border', error as Record<string, unknown>, 'AssetSelectionModal');
      Alert.alert('Error', 'Failed to apply profile border');
    } finally {
      setLoading(null);
    }
  }, [currentUser?.id, updateUser, onClose]);

  const handleSelectBackground = useCallback(async (assetId: string | null) => {
    if (!currentUser?.id) return;
    
    setLoading(assetId || 'none');
    try {
      // Update Firestore directly
      await firebaseDataService.user.updateUser(currentUser.id, {
        active_wallet_background: assetId || undefined
      });

      // Update local state
      updateUser({
        active_wallet_background: assetId || undefined
      });

      console.log('🎨 Background selection updated:', {
        assetId,
        activeWalletBackground: assetId || undefined
      });

      Alert.alert('Success', assetId ? 'Wallet background applied!' : 'Wallet background reset to default!');
      onClose();
    } catch (error) {
      logger.error('Failed to apply wallet background', error as Record<string, unknown>, 'AssetSelectionModal');
      Alert.alert('Error', 'Failed to apply wallet background');
    } finally {
      setLoading(null);
    }
  }, [currentUser?.id, updateUser, onClose]);

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return '#F39C12';
      case 'epic': return '#9B59B6';
      case 'rare': return '#4A90E2';
      default: return colors.white30;
    }
  };

  const avatarPreviewSize = 100;
  const activeBorderScaleOverride = getBorderScaleForSize(canonicalActiveProfileBorder, avatarPreviewSize);

  const renderBordersContent = () => {
    const userBordersList = userBorders.length === 0 ? [] : userBorders;
    
    return (
      <View style={styles.content}>
        {userBordersList.length === 0 ? (
          <View style={styles.emptyState}>
            <PhosphorIcon name="CircleDashed" size={48} color={colors.white30} />
            <Text style={styles.emptyStateText}>No borders owned yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Earn borders through the Advent Calendar and other rewards
            </Text>
          </View>
        ) : (
          <>
            {/* None option */}
            <TouchableOpacity
              style={[styles.assetCard, !currentUser?.active_profile_border && styles.assetCardActive]}
              onPress={() => handleSelectBorder(null)}
              disabled={loading === 'none'}
            >
              <View style={styles.assetCardImage}>
                <PhosphorIcon name="Prohibit" size={32} color={colors.white70} />
              </View>
              <View style={styles.assetCardContent}>
                <Text style={styles.assetCardTitle}>No Border</Text>
                <Text style={styles.assetCardDescription}>Display your avatar without a border</Text>
              </View>
              {!currentUser?.active_profile_border && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Actual</Text>
                </View>
              )}
              {loading === 'none' && <ActivityIndicator size="small" color={colors.green} />}
            </TouchableOpacity>

            {/* User's owned borders */}
            {userBordersList.map((asset) => {
              // Check if this asset is active (including mapped old IDs)
              const isActive = canonicalActiveProfileBorder === asset.assetId;
              const isLoading = loading === asset.assetId;
              const imageUrl = resolvedUrls[asset.assetId];
              const hasImage = !!(imageUrl && isSafeUrl(imageUrl));
              
              return (
                <TouchableOpacity
                  key={asset.assetId}
                  style={[styles.assetCard, isActive && styles.assetCardActive]}
                  onPress={() => handleSelectBorder(asset.assetId)}
                  disabled={isLoading}
                >
                  <View style={styles.assetCardImage}>
                    {hasImage ? (
                      <AssetImage
                        uri={imageUrl!}
                        style={styles.assetCardImageContent}
                        resizeMode="contain"
                      />
                    ) : (
                      <PhosphorIcon name="CircleHalf" size={32} color={colors.white70} />
                    )}
                  </View>
                  <View style={styles.assetCardContent}>
                    <Text style={styles.assetCardTitle}>{asset.name}</Text>
                    <Text style={styles.assetCardDescription} numberOfLines={1}>
                      {asset.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Actual</Text>
                    </View>
                  )}
                  {isLoading && <ActivityIndicator size="small" color={colors.green} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const renderBackgroundsContent = () => {
    // Always show backgrounds (default + owned)
    const backgroundsList = userBackgrounds.length === 0 ? [] : userBackgrounds;
    
    return (
      <View style={styles.content}>
        {backgroundsList.length === 0 ? (
          <View style={styles.emptyState}>
            <PhosphorIcon name="ImageSquare" size={48} color={colors.white30} />
            <Text style={styles.emptyStateText}>No backgrounds available</Text>
            <Text style={styles.emptyStateSubtext}>
              Earn backgrounds through the Advent Calendar and other rewards
            </Text>
          </View>
        ) : (
          <>
            {/* All backgrounds (default WeSplit + owned) */}
            {backgroundsList.map((asset) => {
              // Check if this asset is active (including mapped old IDs)
              const isActive = canonicalActiveWalletBackground === asset.assetId;
              const isLoading = loading === asset.assetId;
              const imageUrl = resolvedUrls[asset.assetId];
              const hasImage = !!(imageUrl && isSafeUrl(imageUrl));
              
              return (
                <TouchableOpacity
                  key={asset.assetId}
                  style={[styles.assetCard, isActive && styles.assetCardActive]}
                  onPress={() => handleSelectBackground(asset.assetId)}
                  disabled={isLoading}
                >
                  <View style={styles.assetCardImage}>
                    {hasImage ? (
                      <AssetImage
                        uri={imageUrl!}
                        style={styles.backgroundThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <PhosphorIcon name="ImageSquare" size={32} color={colors.white70} />
                    )}
                  </View>
                  <View style={styles.assetCardContent}>
                    <Text style={styles.assetCardTitle}>{asset.name}</Text>
                    <Text style={styles.assetCardDescription} numberOfLines={1}>
                      {asset.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Actual</Text>
                    </View>
                  )}
                  {isLoading && <ActivityIndicator size="small" color={colors.green} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const getModalTitle = () => {
    if (assetType === 'profile_border') {
      return 'Select a new profile border';
    }
    return 'Select a new wallet background';
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={getModalTitle()}
      showHandle={true}
      maxHeight={maxHeight}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {assetType === 'profile_border' && renderBordersContent()}
        {assetType === 'wallet_background' && renderBackgroundsContent()}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white10,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    textAlign: 'center',
    maxWidth: 250,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    position: 'relative',
  },
  assetCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenBlue20,
  },
  assetCardImage: {
    width: 64,
    height: 64,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  assetCardImageContent: {
    width: '100%',
    height: '100%',
  },
  backgroundThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: spacing.xs,
  },
  assetCardContent: {
    flex: 1,
  },
  assetCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: 2,
  },
  assetCardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
  },
  activeBadge: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.xs,
    marginLeft: spacing.sm,
  },
  activeBadgeText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});

export default AssetSelectionModal;

