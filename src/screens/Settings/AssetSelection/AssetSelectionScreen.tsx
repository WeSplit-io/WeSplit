/**
 * Asset Selection Screen
 * Allows users to select and apply their owned profile borders and wallet backgrounds
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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SvgUri } from 'react-native-svg';
import { Container, Header } from '../../../components/shared';
import { colors, spacing } from '../../../theme';
import { typography } from '../../../theme/typography';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import { useApp } from '../../../context/AppContext';
import { useFocusEffect } from '@react-navigation/native';
import { getAssetInfo, getAssetsByType, AssetInfo } from '../../../services/rewards/assetConfig';
import { resolveStorageUrl } from '../../../services/shared/storageUrlService';
import { firebaseDataService } from '../../../services/data/firebaseDataService';
import { logger } from '../../../services/analytics/loggingService';
import UserAvatar from '../../../components/UserAvatar';

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

interface AssetSelectionScreenProps {
  route?: {
    params?: {
      assetType?: 'profile_border' | 'wallet_background';
    };
  };
}

// Stable empty array to prevent re-renders
const EMPTY_ARRAY: string[] = [];

const AssetSelectionScreen: React.FC<AssetSelectionScreenProps> = ({ route }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { state, updateUser, refreshUser } = useApp();
  const { currentUser } = state;
  
  const initialTab = route?.params?.assetType === 'wallet_background' ? 'backgrounds' : 'borders';
  const [activeTab, setActiveTab] = useState<'borders' | 'backgrounds'>(initialTab);
  const [loading, setLoading] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Track which asset IDs we've already resolved to prevent infinite loops
  const resolvedAssetIdsRef = useRef<string>('');

  // Get user's owned assets - use stable empty array to prevent infinite loops
  const ownedBorders = currentUser?.profile_borders ?? EMPTY_ARRAY;
  const ownedBackgrounds = currentUser?.wallet_backgrounds ?? EMPTY_ARRAY;
  
  // Get all available assets from config
  const allBorders = useMemo(() => getAssetsByType('profile_border'), []);
  const allBackgrounds = useMemo(() => getAssetsByType('wallet_background'), []);
  
  // Filter to show only owned assets - memoize with stable dependencies
  const userBorders = useMemo(() => 
    allBorders.filter(a => ownedBorders.includes(a.assetId)),
    [allBorders, ownedBorders]
  );
  const userBackgrounds = useMemo(() => 
    allBackgrounds.filter(a => ownedBackgrounds.includes(a.assetId)),
    [allBackgrounds, ownedBackgrounds]
  );

  // Create stable asset list for URL resolution
  const assetIdsToResolve = useMemo(() => 
    [...userBorders, ...userBackgrounds].map(a => a.assetId).sort().join(','),
    [userBorders, userBackgrounds]
  );

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        try {
          logger.debug('Refreshing user data on AssetSelectionScreen focus', {
            currentOwnedBackgrounds: ownedBackgrounds,
            currentUserId: currentUser?.id
          }, 'AssetSelectionScreen');

          await refreshUser();

          logger.debug('User data refreshed on AssetSelectionScreen focus', {
            newOwnedBackgrounds: currentUser?.wallet_backgrounds,
            currentUserId: currentUser?.id
          }, 'AssetSelectionScreen');
        } catch (error) {
          logger.error('Failed to refresh user data on focus', { error }, 'AssetSelectionScreen');
        }
      };

      refreshUserData();
    }, [refreshUser, ownedBackgrounds, currentUser?.id, currentUser?.wallet_backgrounds])
  );

  // Debug logging for asset selection
  useEffect(() => {
    logger.debug('AssetSelectionScreen mounted', {
      ownedBorders: ownedBorders,
      ownedBackgrounds: ownedBackgrounds,
      userBordersCount: userBorders.length,
      userBackgroundsCount: userBackgrounds.length,
      allBordersCount: allBorders.length,
      allBackgroundsCount: allBackgrounds.length,
    }, 'AssetSelectionScreen');

    // Also log to console for easier debugging
    console.log('🎨 AssetSelectionScreen Debug:', {
      ownedBorders,
      ownedBackgrounds,
      userBordersCount: userBorders.length,
      userBackgroundsCount: userBackgrounds.length,
    });
  }, [ownedBorders, ownedBackgrounds, userBorders.length, userBackgrounds.length]);

  // Resolve storage URLs for assets
  useEffect(() => {
    // Skip if no assets or already resolved this exact set
    if (!assetIdsToResolve || assetIdsToResolve === resolvedAssetIdsRef.current) {
      return;
    }
    
    const resolveUrls = async () => {
      const urlMap: Record<string, string> = {};
      const allAssets = [...userBorders, ...userBackgrounds];
      
      logger.info('Resolving asset URLs', { 
        count: allAssets.length, 
        assetIds: assetIdsToResolve,
        assets: allAssets.map(a => ({ id: a.assetId, url: a.url }))
      }, 'AssetSelectionScreen');
      
      // Resolve asset URLs
      for (const asset of allAssets) {
        if (asset.url) {
          try {
            logger.debug('Attempting to resolve URL', { assetId: asset.assetId, url: asset.url }, 'AssetSelectionScreen');
            const resolved = await resolveStorageUrl(asset.url, { assetId: asset.assetId });
            if (resolved) {
              urlMap[asset.assetId] = resolved;
              logger.debug('Successfully resolved URL', { assetId: asset.assetId, resolved }, 'AssetSelectionScreen');
            } else {
              logger.warn('URL resolution returned undefined', { assetId: asset.assetId, url: asset.url }, 'AssetSelectionScreen');
            }
          } catch (error) {
            logger.error('Failed to resolve asset URL', { assetId: asset.assetId, url: asset.url, error }, 'AssetSelectionScreen');
          }
        } else {
          logger.warn('Asset has no URL', { assetId: asset.assetId }, 'AssetSelectionScreen');
        }
      }
      
      logger.info('URL resolution complete', { resolvedCount: Object.keys(urlMap).length, urlMap }, 'AssetSelectionScreen');
      
      // Mark these asset IDs as resolved before setting state
      resolvedAssetIdsRef.current = assetIdsToResolve;
      setResolvedUrls(urlMap);
    };
    
    resolveUrls();
  }, [assetIdsToResolve, userBorders, userBackgrounds]);

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

      Alert.alert('Success', assetId ? 'Profile border applied!' : 'Profile border removed!');
    } catch (error) {
      logger.error('Failed to apply profile border', error, 'AssetSelectionScreen');
      Alert.alert('Error', 'Failed to apply profile border');
    } finally {
      setLoading(null);
    }
  }, [currentUser?.id, updateUser]);

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
    } catch (error) {
      logger.error('Failed to apply wallet background', error, 'AssetSelectionScreen');
      Alert.alert('Error', 'Failed to apply wallet background');
    } finally {
      setLoading(null);
    }
  }, [currentUser?.id, updateUser]);

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return '#F39C12';
      case 'epic': return '#9B59B6';
      case 'rare': return '#4A90E2';
      default: return colors.white30;
    }
  };

  const renderBordersTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Borders</Text>
      <Text style={styles.sectionSubtitle}>
        Select a border to display around your avatar
      </Text>
      
      {/* Current Avatar Preview */}
      <View style={styles.avatarPreview}>
        <UserAvatar
          userId={currentUser?.id || ''}
          userName={currentUser?.name || currentUser?.display_name || undefined}
          displayName={currentUser?.name || currentUser?.display_name || 'User'}
          avatarUrl={currentUser?.avatar}
          size={100}
          borderImageUrl={currentUser?.active_profile_border 
            ? resolvedUrls[currentUser.active_profile_border] || undefined
            : undefined}
        />
        <Text style={styles.previewLabel}>Current Preview</Text>
        {currentUser?.active_profile_border && (
          <Text style={styles.previewAssetName}>
            {getAssetInfo(currentUser.active_profile_border)?.name || 'Custom Border'}
          </Text>
        )}
      </View>

      {userBorders.length === 0 ? (
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
            style={[styles.assetRow, !currentUser?.active_profile_border && styles.assetRowActive]}
            onPress={() => handleSelectBorder(null)}
            disabled={loading === 'none'}
          >
            <View style={styles.assetRowIcon}>
              <PhosphorIcon name="ProhibitInset" size={32} color={colors.white70} />
            </View>
            <View style={styles.assetRowContent}>
              <Text style={styles.assetRowTitle}>No Border</Text>
              <Text style={styles.assetRowDescription}>Display your avatar without a border</Text>
            </View>
            {!currentUser?.active_profile_border && (
              <PhosphorIcon name="CheckCircle" size={24} color={colors.green} weight="fill" />
            )}
            {loading === 'none' && <ActivityIndicator size="small" color={colors.green} />}
          </TouchableOpacity>

          {/* User's owned borders */}
          {userBorders.map((asset) => {
            const isActive = currentUser?.active_profile_border === asset.assetId;
            const isLoading = loading === asset.assetId;
            const imageUrl = resolvedUrls[asset.assetId];
            const hasImage = isSafeUrl(imageUrl);
            
            return (
              <TouchableOpacity
                key={asset.assetId}
                style={[styles.assetRow, isActive && styles.assetRowActive]}
                onPress={() => handleSelectBorder(asset.assetId)}
                disabled={isLoading}
              >
                <View style={styles.assetRowIcon}>
                  {hasImage ? (
                    <AssetImage
                      uri={imageUrl}
                      style={styles.assetRowImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <PhosphorIcon name="CircleHalf" size={32} color={colors.white70} />
                  )}
                </View>
                <View style={styles.assetRowContent}>
                  <View style={styles.assetRowHeader}>
                    <Text style={styles.assetRowTitle}>{asset.name}</Text>
                    {asset.rarity && (
                      <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(asset.rarity) }]}>
                        <Text style={styles.rarityText}>{asset.rarity}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.assetRowDescription} numberOfLines={1}>
                    {asset.description}
                  </Text>
                </View>
                {isActive && (
                  <PhosphorIcon name="CheckCircle" size={24} color={colors.green} weight="fill" />
                )}
                {isLoading && <ActivityIndicator size="small" color={colors.green} />}
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );

  const renderBackgroundsTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wallet Backgrounds</Text>
      <Text style={styles.sectionSubtitle}>
        Select a background for your balance card
      </Text>

      {userBackgrounds.length === 0 ? (
        <View style={styles.emptyState}>
          <PhosphorIcon name="ImageSquare" size={48} color={colors.white30} />
          <Text style={styles.emptyStateText}>No backgrounds owned yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Earn backgrounds through the Advent Calendar and other rewards
          </Text>
        </View>
      ) : (
        <>
          {/* Default option */}
          <TouchableOpacity
            style={[styles.assetRow, !currentUser?.active_wallet_background && styles.assetRowActive]}
            onPress={() => handleSelectBackground(null)}
            disabled={loading === 'none'}
          >
            <View style={styles.assetRowIcon}>
              <PhosphorIcon name="ArrowCounterClockwise" size={32} color={colors.white70} />
            </View>
            <View style={styles.assetRowContent}>
              <Text style={styles.assetRowTitle}>Default Background</Text>
              <Text style={styles.assetRowDescription}>Use the standard balance card design</Text>
            </View>
            {!currentUser?.active_wallet_background && (
              <PhosphorIcon name="CheckCircle" size={24} color={colors.green} weight="fill" />
            )}
            {loading === 'none' && <ActivityIndicator size="small" color={colors.green} />}
          </TouchableOpacity>

          {/* User's owned backgrounds */}
          {userBackgrounds.map((asset) => {
            const isActive = currentUser?.active_wallet_background === asset.assetId;
            const isLoading = loading === asset.assetId;
            const imageUrl = resolvedUrls[asset.assetId];
            const hasImage = isSafeUrl(imageUrl);
            
            return (
              <TouchableOpacity
                key={asset.assetId}
                style={[styles.assetRow, isActive && styles.assetRowActive]}
                onPress={() => handleSelectBackground(asset.assetId)}
                disabled={isLoading}
              >
                <View style={styles.assetRowIcon}>
                  {hasImage ? (
                    <AssetImage
                      uri={imageUrl}
                      style={styles.backgroundThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <PhosphorIcon name="ImageSquare" size={32} color={colors.white70} />
                  )}
                </View>
                <View style={styles.assetRowContent}>
                  <View style={styles.assetRowHeader}>
                    <Text style={styles.assetRowTitle}>{asset.name}</Text>
                    {asset.rarity && (
                      <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(asset.rarity) }]}>
                        <Text style={styles.rarityText}>{asset.rarity}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.assetRowDescription} numberOfLines={1}>
                    {asset.description}
                  </Text>
                </View>
                {isActive && (
                  <PhosphorIcon name="CheckCircle" size={24} color={colors.green} weight="fill" />
                )}
                {isLoading && <ActivityIndicator size="small" color={colors.green} />}
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );

  return (
    <Container>
      <Header
        title="Customize Appearance"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        backgroundColor={colors.black}
        rightElement={
          <TouchableOpacity
            onPress={async () => {
              try {
                await refreshUser();
                Alert.alert('Refreshed', 'User data has been refreshed');
              } catch (error) {
                Alert.alert('Error', 'Failed to refresh user data');
              }
            }}
            style={{ padding: 8 }}
          >
            <PhosphorIcon name="ArrowClockwise" size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'borders' && styles.tabActive]}
          onPress={() => setActiveTab('borders')}
        >
          <PhosphorIcon 
            name="CircleHalf" 
            size={18} 
            color={activeTab === 'borders' ? colors.green : colors.white70} 
            weight="regular"
          />
          <Text style={[styles.tabText, activeTab === 'borders' && styles.tabTextActive]}>
            Borders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'backgrounds' && styles.tabActive]}
          onPress={() => setActiveTab('backgrounds')}
        >
          <PhosphorIcon 
            name="ImageSquare" 
            size={18} 
            color={activeTab === 'backgrounds' ? colors.green : colors.white70} 
            weight="regular"
          />
          <Text style={[styles.tabText, activeTab === 'backgrounds' && styles.tabTextActive]}>
            Backgrounds
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'borders' && renderBordersTab()}
        {activeTab === 'backgrounds' && renderBackgroundsTab()}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.green,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.lg,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  previewLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
    marginTop: spacing.md,
  },
  previewAssetName: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    marginTop: spacing.xs / 2,
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
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  assetRowActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenBlue20,
  },
  assetRowIcon: {
    width: 56,
    height: 56,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  assetRowImage: {
    width: '100%',
    height: '100%',
  },
  backgroundThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: spacing.xs,
  },
  assetRowContent: {
    flex: 1,
  },
  assetRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  assetRowTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  assetRowDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
  },
  rarityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.xs,
  },
  rarityText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
});

export default AssetSelectionScreen;

