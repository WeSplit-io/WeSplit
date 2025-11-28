/**
 * Dev Asset Preview Screen
 * Development-only screen to preview and apply profile borders, wallet backgrounds, and badges
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Container, Header, Button } from '../../components/shared';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { getAllAssets, getAssetInfo } from '../../services/rewards/assetConfig';
import { getAssetImageUrl } from '../../services/rewards/assetService';
import { resolveStorageUrl } from '../../services/shared/storageUrlService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { logger } from '../../services/analytics/loggingService';
import UserAvatar from '../../components/UserAvatar';

const DevAssetPreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  const [activeTab, setActiveTab] = useState<'borders' | 'backgrounds'>('borders');
  const [loading, setLoading] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const allAssets = useMemo(() => getAllAssets(), []);
  const profileBorders = useMemo(() => 
    allAssets.filter(a => a.assetType === 'profile_border' && a.category === 'christmas'),
    [allAssets]
  );

  const walletBackgrounds = useMemo(() => 
    allAssets.filter(a => a.assetType === 'wallet_background' && a.category === 'christmas'),
    [allAssets]
  );

  // Resolve storage URLs for assets and badges
  useEffect(() => {
    const resolveUrls = async () => {
      const urlMap: Record<string, string> = {};
      
      // Resolve asset URLs
      for (const asset of [...profileBorders, ...walletBackgrounds]) {
        if (asset.url) {
          try {
            const resolved = await resolveStorageUrl(asset.url, { assetId: asset.assetId });
            if (resolved) {
            urlMap[asset.assetId] = resolved;
            }
          } catch (error) {
            logger.warn('Failed to resolve asset URL', { assetId: asset.assetId }, 'DevAssetPreviewScreen');
          }
        }
      }
      
      
      setResolvedUrls(urlMap);
    };
    
    resolveUrls();
  }, [profileBorders, walletBackgrounds]);

  const handleApplyBorder = async (assetId: string) => {
    if (!currentUser?.id) return;
    
    setLoading(assetId);
    try {
      const userRef = firebaseDataService.user.getUserRef(currentUser.id);
      const userData = await firebaseDataService.user.getCurrentUser(currentUser.id);
      
      const profileBorders = userData.profile_borders || [];
      const updatedBorders = profileBorders.includes(assetId) 
        ? profileBorders 
        : [...profileBorders, assetId];

      await userRef.update({
        profile_borders: updatedBorders,
        active_profile_border: assetId
      });

      updateUser({
        profile_borders: updatedBorders,
        active_profile_border: assetId
      });

      Alert.alert('Success', 'Profile border applied!');
    } catch (error) {
      logger.error('Failed to apply profile border', error, 'DevAssetPreviewScreen');
      Alert.alert('Error', 'Failed to apply profile border');
    } finally {
      setLoading(null);
    }
  };

  const handleApplyBackground = async (assetId: string) => {
    if (!currentUser?.id) return;
    
    setLoading(assetId);
    try {
      const userRef = firebaseDataService.user.getUserRef(currentUser.id);
      const userData = await firebaseDataService.user.getCurrentUser(currentUser.id);
      
      const walletBackgrounds = userData.wallet_backgrounds || [];
      const updatedBackgrounds = walletBackgrounds.includes(assetId)
        ? walletBackgrounds
        : [...walletBackgrounds, assetId];

      await userRef.update({
        wallet_backgrounds: updatedBackgrounds,
        active_wallet_background: assetId
      });

      updateUser({
        wallet_backgrounds: updatedBackgrounds,
        active_wallet_background: assetId
      });

      Alert.alert('Success', 'Wallet background applied!');
    } catch (error) {
      logger.error('Failed to apply wallet background', error, 'DevAssetPreviewScreen');
      Alert.alert('Error', 'Failed to apply wallet background');
    } finally {
      setLoading(null);
    }
  };

  const renderProfileBorders = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Borders</Text>
      <Text style={styles.sectionSubtitle}>
        Preview and apply Christmas profile borders
      </Text>
      {profileBorders.length === 0 && (
        <View style={styles.emptyState}>
          <PhosphorIcon name="Image" size={48} color={colors.white30} />
          <Text style={styles.emptyStateText}>No profile borders available</Text>
          <Text style={styles.emptyStateSubtext}>
            Upload border images to Firebase Storage to see them here
          </Text>
        </View>
      )}
      
      <View style={styles.avatarPreview}>
        <UserAvatar
          userId={currentUser?.id || ''}
          userName={currentUser?.name || currentUser?.display_name || undefined}
          displayName={currentUser?.name || currentUser?.display_name || 'User'}
          avatarUrl={currentUser?.avatar}
          size={80}
          borderImageUrl={currentUser?.active_profile_border 
            ? resolvedUrls[currentUser.active_profile_border]
            : undefined}
        />
        <Text style={styles.previewLabel}>Current Avatar</Text>
        {currentUser?.name && (
          <Text style={styles.previewSubLabel}>{currentUser.name}</Text>
        )}
      </View>

      {profileBorders.length > 0 && (
        <View style={styles.grid}>
          {profileBorders.map((asset) => {
            const isActive = currentUser?.active_profile_border === asset.assetId;
            const isLoading = loading === asset.assetId;
            const resolvedUrl = resolvedUrls[asset.assetId];
            const originalUrl = asset.url;
            const imageUrl = resolvedUrl || originalUrl;
            const hasImage = imageUrl && !imageUrl.includes('gs://');
            const isResolving = originalUrl && originalUrl.includes('gs://') && !resolvedUrl;
            
            return (
              <TouchableOpacity
                key={asset.assetId}
                style={[styles.assetCard, isActive && styles.assetCardActive]}
                onPress={() => handleApplyBorder(asset.assetId)}
                disabled={isLoading}
              >
                {hasImage ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.assetImage}
                    resizeMode="contain"
                    onError={() => {
                      // Image failed to load, will show placeholder
                    }}
                  />
                ) : isResolving ? (
                  <View style={styles.assetPlaceholder}>
                    <PhosphorIcon name="Spinner" size={32} color={colors.white70} />
                    <Text style={styles.placeholderText}>Loading...</Text>
                  </View>
                ) : (
                  <View style={styles.assetPlaceholder}>
                    <PhosphorIcon name="Image" size={32} color={colors.white70} />
                    <Text style={styles.placeholderText}>Image not uploaded</Text>
                  </View>
                )}
                <Text style={styles.assetName} numberOfLines={2}>
                  {asset.name}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <PhosphorIcon name="Spinner" size={24} color={colors.green} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderWalletBackgrounds = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wallet Backgrounds</Text>
      <Text style={styles.sectionSubtitle}>
        Preview and apply Christmas wallet backgrounds
      </Text>
      {walletBackgrounds.length === 0 && (
        <View style={styles.emptyState}>
          <PhosphorIcon name="Image" size={48} color={colors.white30} />
          <Text style={styles.emptyStateText}>No wallet backgrounds available</Text>
          <Text style={styles.emptyStateSubtext}>
            Upload background images to Firebase Storage to see them here
          </Text>
        </View>
      )}

      {walletBackgrounds.length > 0 && (
        <View style={styles.grid}>
          {walletBackgrounds.map((asset) => {
            const isActive = currentUser?.active_wallet_background === asset.assetId;
            const isLoading = loading === asset.assetId;
            const resolvedUrl = resolvedUrls[asset.assetId];
            const originalUrl = asset.url;
            const imageUrl = resolvedUrl || originalUrl;
            const hasImage = imageUrl && !imageUrl.includes('gs://');
            const isResolving = originalUrl && originalUrl.includes('gs://') && !resolvedUrl;
            
            return (
              <TouchableOpacity
                key={asset.assetId}
                style={[styles.assetCard, isActive && styles.assetCardActive]}
                onPress={() => handleApplyBackground(asset.assetId)}
                disabled={isLoading}
              >
                {hasImage ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                    onError={() => {
                      // Image failed to load, will show placeholder
                    }}
                  />
                ) : isResolving ? (
                  <View style={styles.assetPlaceholder}>
                    <PhosphorIcon name="Spinner" size={32} color={colors.white70} />
                    <Text style={styles.placeholderText}>Loading...</Text>
                  </View>
                ) : (
                  <View style={styles.assetPlaceholder}>
                    <PhosphorIcon name="Image" size={32} color={colors.white70} />
                    <Text style={styles.placeholderText}>Image not uploaded</Text>
                  </View>
                )}
                <Text style={styles.assetName} numberOfLines={2}>
                  {asset.name}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <PhosphorIcon name="Spinner" size={24} color={colors.green} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );


  if (!__DEV__ && process.env.EXPO_PUBLIC_ENV !== 'development') {
    return null;
  }

  return (
    <Container>
      <Header
        title="Dev Asset Preview"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'borders' && styles.tabActive]}
          onPress={() => setActiveTab('borders')}
        >
          <Text style={[styles.tabText, activeTab === 'borders' && styles.tabTextActive]}>
            Borders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'backgrounds' && styles.tabActive]}
          onPress={() => setActiveTab('backgrounds')}
        >
          <Text style={[styles.tabText, activeTab === 'backgrounds' && styles.tabTextActive]}>
            Backgrounds
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'borders' && renderProfileBorders()}
        {activeTab === 'backgrounds' && renderWalletBackgrounds()}
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
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
    padding: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
  },
  previewLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginTop: spacing.sm,
  },
  previewSubLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs / 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  assetCard: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  assetCardActive: {
    borderColor: colors.green,
  },
  assetImage: {
    width: '80%',
    height: '80%',
    marginBottom: spacing.xs,
  },
  backgroundImage: {
    width: '100%',
    height: '70%',
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
  },
  assetPlaceholder: {
    width: '80%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
  },
  placeholderText: {
    fontSize: typography.fontSize.xxs,
    color: colors.white50,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  placeholderTextSmall: {
    fontSize: typography.fontSize.xxs,
    color: colors.white50,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    marginTop: spacing.md,
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
    color: colors.white70,
    textAlign: 'center',
  },
  assetName: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  activeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.green,
    borderRadius: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: typography.fontSize.xxs,
    color: colors.black,
    fontWeight: typography.fontWeight.bold,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.md,
  },
});

export default DevAssetPreviewScreen;

