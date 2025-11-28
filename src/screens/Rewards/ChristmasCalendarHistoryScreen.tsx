/**
 * Christmas Calendar History Screen
 * Displays all claimed gifts from the Christmas calendar
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import UserAvatar from '../../components/UserAvatar';
import { useApp } from '../../context/AppContext';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { christmasCalendarService } from '../../services/rewards/christmasCalendarService';
import { getGiftForDay } from '../../services/rewards/christmasCalendarConfig';
import { resolveStorageUrl } from '../../services/shared/storageUrlService';
import { Gift, PointsGift, BadgeGift, AssetGift } from '../../types/rewards';
import { Image } from 'react-native';

const POINTS_ICON_URL =
  'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2FChristmas%20icons.png?alt=media&token=28f22ccf-b366-4869-935b-f1c341b006b2';

const ChristmasCalendarHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [claimedGifts, setClaimedGifts] = useState<Array<{ day: number; gift: Gift; claimedAt: Date }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvedBadgeUrls, setResolvedBadgeUrls] = useState<Record<string, string>>({});
  const [totalGifts, setTotalGifts] = useState(24);

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const userTimezone = christmasCalendarService.getUserTimezone();
      const status = await christmasCalendarService.getUserCalendarStatus(currentUser.id, userTimezone);
      
      const claimed: Array<{ day: number; gift: Gift; claimedAt: Date }> = [];
      
      setTotalGifts(status.days.length);

      for (let day = 1; day <= status.days.length; day++) {
        const dayData = status.days[day - 1];
        if (dayData?.claimed && dayData.gift_data) {
          const giftConfig = getGiftForDay(day);
          if (giftConfig) {
            claimed.push({
              day,
              gift: dayData.gift_data,
              claimedAt: dayData.claimed_at ? new Date(dayData.claimed_at) : new Date(),
            });
          }
        }
      }
      
      // Sort by day (ascending)
      claimed.sort((a, b) => a.day - b.day);
      setClaimedGifts(claimed);

      // Resolve badge URLs
      const badgeUrls: Record<string, string> = {};
      for (const item of claimed) {
        if (item.gift.type === 'badge') {
          const badgeGift = item.gift as BadgeGift;
          if (badgeGift.iconUrl) {
            try {
              const resolved = await resolveStorageUrl(badgeGift.iconUrl, { badgeId: badgeGift.badgeId });
              if (resolved) {
                badgeUrls[badgeGift.badgeId] = resolved;
              }
            } catch (error) {
              // Silently fail
            }
          }
        }
      }
      setResolvedBadgeUrls(badgeUrls);
    } catch (error) {
      console.error('Failed to load calendar history:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const renderGift = (item: { day: number; gift: Gift; claimedAt: Date }) => {
    const { day, gift } = item;

    let title = '';
    let subtitle = `Day ${day}`;
    let visual: React.ReactNode = (
      <View style={styles.giftVisual}>
        <PhosphorIcon name="Gift" size={24} color={colors.white} />
      </View>
    );

    if (gift.type === 'points') {
      const pointsGift = gift as PointsGift;
      title = `${pointsGift.amount} Split Points`;
      visual = (
        <View style={[styles.giftVisual, styles.pointsVisual]}>
          <Image source={{ uri: POINTS_ICON_URL }} style={styles.pointsVisualImage} resizeMode="contain" />
        </View>
      );
    } else if (gift.type === 'badge') {
      const badgeGift = gift as BadgeGift;
      title = badgeGift.title;
      subtitle = `Day ${day} • Badge`;
      const iconUrl = resolvedBadgeUrls[badgeGift.badgeId] || badgeGift.iconUrl;
      visual = iconUrl ? (
        <View style={styles.giftVisual}>
          <Image source={{ uri: iconUrl }} style={styles.badgeVisualImage} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.giftVisual}>
          <PhosphorIcon name="Medal" size={24} color={colors.white} />
        </View>
      );
    } else if (gift.type === 'asset') {
      const assetGift = gift as AssetGift;
      title = assetGift.name;
      const assetLabel =
        assetGift.assetType === 'profile_border'
          ? 'Profile Border'
          : assetGift.assetType === 'wallet_background'
          ? 'Wallet Background'
          : 'Profile Asset';
      subtitle = `Day ${day} • ${assetLabel}`;
      const assetPreviewUrl = assetGift.assetUrl;

      if (assetGift.assetType === 'wallet_background') {
        visual = (
          <View style={styles.walletVisualWrapper}>
            {assetPreviewUrl ? (
              <Image source={{ uri: assetPreviewUrl }} style={styles.walletVisualImage} resizeMode="cover" />
            ) : (
              <View style={styles.walletVisualPlaceholder}>
                <PhosphorIcon name="Image" size={20} color={colors.white70} />
              </View>
            )}
          </View>
        );
      } else if (assetGift.assetType === 'profile_border') {
        visual = (
          <View style={styles.borderVisualWrapper}>
            <UserAvatar
              userId={currentUser?.id}
              displayName="Preview User"
              avatarUrl={currentUser?.avatar}
              borderImageUrl={assetPreviewUrl}
              size={48}
              borderScaleOverride={1.5}
            />
          </View>
        );
      } else {
        visual = (
          <View style={styles.profileAssetVisualWrapper}>
            {assetPreviewUrl ? (
              <Image source={{ uri: assetPreviewUrl }} style={styles.profileAssetVisualImage} resizeMode="cover" />
            ) : (
              <PhosphorIcon name="Image" size={20} color={colors.white70} />
            )}
          </View>
        );
      }
    }

    return (
      <View key={day} style={styles.giftItem}>
        <View style={styles.giftContent}>
          {visual}
          <View style={styles.giftInfo}>
            <Text style={styles.giftTitle}>{title}</Text>
            <Text style={styles.giftSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Container>
        <Header
          title="Calendar History"
          showBackButton={true}
          onBackPress={() => rewardNav.goBack()}
          backgroundColor={colors.black}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Calendar History"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        }
      >
        {claimedGifts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PhosphorIcon name="Gift" size={48} color={colors.white70} />
            <Text style={styles.emptyText}>No gifts claimed yet</Text>
            <Text style={styles.emptySubtext}>
              Start claiming gifts from the Advent Calendar!
            </Text>
          </View>
        ) : (
          <View style={styles.giftsList}>
            <Text style={styles.sectionTitle}>
              {claimedGifts.length} of {totalGifts} gifts claimed
            </Text>
            {claimedGifts.map((item) => renderGift(item))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  giftsList: {
    gap: spacing.sm,
  },
  giftItem: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.md,
  },
  giftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  giftVisual: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsVisual: {
    backgroundColor: colors.white5,
  },
  pointsVisualImage: {
    width: 32,
    height: 32,
  },
  badgeVisualImage: {
    width: 36,
    height: 36,
  },
  walletVisualWrapper: {
    width: 70,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.blackWhite5,
  },
  walletVisualImage: {
    width: '100%',
    height: '100%',
  },
  walletVisualPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white5,
  },
  borderVisualWrapper: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAssetVisualWrapper: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAssetVisualImage: {
    width: '100%',
    height: '100%',
  },
  giftInfo: {
    flex: 1,
  },
  giftTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  giftSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
});

export default ChristmasCalendarHistoryScreen;

