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
import { useApp } from '../../context/AppContext';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { christmasCalendarService } from '../../services/rewards/christmasCalendarService';
import { getGiftForDay } from '../../services/rewards/christmasCalendarConfig';
import { resolveStorageUrl } from '../../services/shared/storageUrlService';
import { Gift, PointsGift, BadgeGift, AssetGift } from '../../types/rewards';
import { Image } from 'react-native';

const ChristmasCalendarHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [claimedGifts, setClaimedGifts] = useState<Array<{ day: number; gift: Gift; claimedAt: Date }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvedBadgeUrls, setResolvedBadgeUrls] = useState<Record<string, string>>({});

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const userTimezone = christmasCalendarService.getUserTimezone();
      const status = await christmasCalendarService.getUserCalendarStatus(currentUser.id, userTimezone);
      
      const claimed: Array<{ day: number; gift: Gift; claimedAt: Date }> = [];
      
      for (let day = 1; day <= 24; day++) {
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
    
    let displayContent;
    if (gift.type === 'points') {
      const pointsGift = gift as PointsGift;
      displayContent = (
        <View style={styles.giftContent}>
          <Text style={styles.giftEmoji}>🎁</Text>
          <View style={styles.giftInfo}>
            <Text style={styles.giftTitle}>{pointsGift.amount} Split Points</Text>
            <Text style={styles.giftSubtitle}>Day {day}</Text>
          </View>
        </View>
      );
    } else if (gift.type === 'badge') {
      const badgeGift = gift as BadgeGift;
      const iconUrl = resolvedBadgeUrls[badgeGift.badgeId] || badgeGift.iconUrl;
      displayContent = (
        <View style={styles.giftContent}>
          {iconUrl ? (
            <Image source={{ uri: iconUrl }} style={styles.giftIcon} resizeMode="contain" />
          ) : (
            <Text style={styles.giftEmoji}>{badgeGift.icon || '🏅'}</Text>
          )}
          <View style={styles.giftInfo}>
            <Text style={styles.giftTitle}>{badgeGift.title}</Text>
            <Text style={styles.giftSubtitle}>Day {day} • Badge</Text>
          </View>
        </View>
      );
    } else if (gift.type === 'asset') {
      const assetGift = gift as AssetGift;
      displayContent = (
        <View style={styles.giftContent}>
          <Text style={styles.giftEmoji}>✨</Text>
          <View style={styles.giftInfo}>
            <Text style={styles.giftTitle}>{assetGift.name}</Text>
            <Text style={styles.giftSubtitle}>Day {day} • {assetGift.assetType === 'profile_image' ? 'Profile Asset' : 'Wallet Asset'}</Text>
          </View>
        </View>
      );
    }

    return (
      <View key={day} style={styles.giftItem}>
        {displayContent}
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
              {claimedGifts.length} of 24 gifts claimed
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
    padding: spacing.md,
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
    backgroundColor: '#0F1B16',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  giftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftIcon: {
    width: 32,
    height: 32,
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

