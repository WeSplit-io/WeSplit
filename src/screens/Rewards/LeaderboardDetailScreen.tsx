/**
 * Leaderboard Detail Screen
 * Displays full leaderboard with Friends/Global filter
 * Shows top 3 users prominently and scrollable list of other users
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header } from '../../components/shared';
import Avatar from '../../components/shared/Avatar';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import Tabs from '../../components/shared/Tabs';
import { useApp } from '../../context/AppContext';
import { leaderboardService } from '../../services/rewards/leaderboardService';
import { LeaderboardEntry } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import BadgeDisplay from '../../components/profile/BadgeDisplay';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

type LeaderboardFilter = 'friends' | 'global';

const LeaderboardDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;

  const [filter, setFilter] = useState<LeaderboardFilter>('friends');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [isUserEntryVisible, setIsUserEntryVisible] = useState(false);
  const userEntryRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef<number>(0);
  const scrollViewHeight = useRef<number>(0);
  const userEntryY = useRef<number>(0);
  const userEntryHeight = useRef<number>(0);

  const loadFriendsList = useCallback(async () => {
    if (!currentUser?.id) return [];

    try {
      // Get user's contacts/connections
      // UserContact extends User, so contact.id is the user ID
      const contacts = await firebaseDataService.contact.getContacts(currentUser.id);

      // Extract user IDs from contacts
      // contact.id is the user ID (Firebase document ID of the user)
      const friendIds = contacts
        .map(contact => contact.id) // contact.id is the user ID
        .filter(Boolean) as string[];

      // Always include current user in friends list
      const friendIdsSet = new Set(friendIds);
      friendIdsSet.add(currentUser.id);

      return Array.from(friendIdsSet);
    } catch (error) {
      logger.error('Failed to load friends list', error, 'LeaderboardDetailScreen');
      // Return at least the current user
      return [currentUser.id];
    }
  }, [currentUser?.id]);

  const loadLeaderboard = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);

      let entries: LeaderboardEntry[] = [];

      if (filter === 'friends') {
        // Filter leaderboard to only show friends
        const friendIds = await loadFriendsList();
        const friendIdsSet = new Set(friendIds);

        // Get all users and filter to friends only
        const allUsers = await leaderboardService.getTopUsers(1000);
        entries = allUsers
          .filter(entry => friendIdsSet.has(entry.user_id))
          .sort((a, b) => b.points - a.points) // Sort by points descending
          .map((entry, index) => ({ ...entry, rank: index + 1 }));
      } else {
        // Global leaderboard
        entries = await leaderboardService.getTopUsers(100);
      }

      setLeaderboard(entries);

      // Get user's rank and entry based on current filter
      if (filter === 'friends') {
        // Find user's rank in the filtered friends list
        const userIndex = entries.findIndex(entry => entry.user_id === currentUser.id);
        if (userIndex !== -1 && entries[userIndex]) {
          const userEntryInList = entries[userIndex];
          setUserRank(userIndex + 1);
          setUserEntry(userEntryInList);
        } else {
          // User not in friends list, get global rank as fallback
          const rank = await leaderboardService.getUserRank(currentUser.id);
          setUserRank(rank);
          const entry = await leaderboardService.getUserLeaderboardEntry(currentUser.id);
          setUserEntry(entry);
        }
      } else {
        // Global leaderboard
        const rank = await leaderboardService.getUserRank(currentUser.id);
        setUserRank(rank);
        const entry = await leaderboardService.getUserLeaderboardEntry(currentUser.id);
        setUserEntry(entry);
      }

    } catch (error) {
      logger.error('Failed to load leaderboard', error, 'LeaderboardDetailScreen');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, filter, loadFriendsList]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  // Memoized badge functions to prevent recreation on every render
  const getRankBadge = useCallback((rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  }, []);

  const getRankBadgeColor = useCallback((rank: number) => {
    if (rank === 1) return colors.green;
    if (rank === 2) return colors.textLightSecondary;
    if (rank === 3) return '#CD7F32'; // Bronze
    return colors.white10;
  }, []);

  // Memoize leaderboard slices to prevent recalculation on every render
  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const restOfLeaderboard = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const renderTopThree = () => {
    if (topThree.length === 0) return null;

    return (
      <View style={styles.topThreeContainer}>
        {/* 2nd Place (Left) */}
        {topThree[1] && (
          <View style={[styles.topThreeEntry, styles.secondPlace]}>
            <View style={styles.avatarWrapper}>
              <Avatar
                avatarUrl={topThree[1].avatar}
                userName={topThree[1].name}
                size={90}
              />
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>2</Text>
            </View>
            <Text style={styles.topThreeName} numberOfLines={1}>
              {topThree[1].name}
            </Text>
            {topThree[1].badges && topThree[1].badges.length > 0 && topThree[1].active_badge && (
              <BadgeDisplay
                badges={topThree[1].badges}
                activeBadge={topThree[1].active_badge}
                showAll={false}
              />
            )}
            <Text style={styles.topThreePoints}>{topThree[1].points} pts</Text>
          </View>
        )}

        {/* 1st Place (Center) */}
        {topThree[0] && (
          <View style={[styles.topThreeEntry, styles.firstPlace]}>
            <View style={styles.crownContainer}>
              <MaskedView
                style={styles.crownGradientMask}
                maskElement={
                  <PhosphorIcon name="CrownSimple" size={34} color={colors.black} weight="fill" />
                }
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.crownGradientFill}
                />
              </MaskedView>
            </View>

            <View style={styles.avatarWrapper}>
              <Avatar
                avatarUrl={topThree[0].avatar}
                userName={topThree[0].name}
                size={90}
              />
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>1</Text>
            </View>
            <Text style={styles.topThreeName} numberOfLines={1}>
              {topThree[0].name}
            </Text>
            {topThree[0].badges && topThree[0].badges.length > 0 && topThree[0].active_badge && (
              <BadgeDisplay
                badges={topThree[0].badges}
                activeBadge={topThree[0].active_badge}
                showAll={false}
              />
            )}
            <Text style={styles.topThreePoints}>{topThree[0].points} pts</Text>
          </View>
        )}

        {/* 3rd Place (Right) */}
        {topThree[2] && (
          <View style={[styles.topThreeEntry, styles.thirdPlace]}>
            <View style={styles.avatarWrapper}>
              <Avatar
                avatarUrl={topThree[2].avatar}
                userName={topThree[2].name}
                size={90}
              />
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>3</Text>
            </View>
            <Text style={styles.topThreeName} numberOfLines={1}>
              {topThree[2].name}
            </Text>
            {topThree[2].badges && topThree[2].badges.length > 0 && topThree[2].active_badge && (
              <BadgeDisplay
                badges={topThree[2].badges}
                activeBadge={topThree[2].active_badge}
                showAll={false}
              />
            )}
            <Text style={styles.topThreePoints}>{topThree[2].points} pts</Text>
          </View>
        )}
      </View>
    );
  };

  const checkUserEntryVisibility = useCallback(() => {
    if (
      !userEntryRef.current ||
      !scrollViewRef.current ||
      scrollViewHeight.current === 0
    ) {
      // If we don't have the entry ref, it means the user entry is not in the list
      // (e.g., user is in top 3 or not in friends list)
      setIsUserEntryVisible(false);
      return;
    }

    const viewportTop = scrollY.current;
    const viewportBottom = scrollY.current + scrollViewHeight.current;
    const entryTop = userEntryY.current;
    const entryBottom = userEntryY.current + userEntryHeight.current;

    // Entry is visible if any part of it is within the viewport
    const isVisible = entryTop < viewportBottom && entryBottom > viewportTop;

    setIsUserEntryVisible(isVisible);
  }, []);

  // Reset visibility state when filter or leaderboard changes
  useEffect(() => {
    setIsUserEntryVisible(false);
    userEntryY.current = 0;
    userEntryHeight.current = 0;
    scrollY.current = 0;
    // Recheck visibility after a delay to allow layout to complete
    setTimeout(() => {
      checkUserEntryVisibility();
    }, 300);
  }, [filter, leaderboard.length, checkUserEntryVisibility]);

  const handleScroll = useCallback(
    (event: any) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
      checkUserEntryVisibility();
    },
    [checkUserEntryVisibility]
  );

  const handleUserEntryLayout = useCallback(() => {
    if (!userEntryRef.current || !scrollViewRef.current) return;

    userEntryRef.current.measureLayout(
      scrollViewRef.current as any,
      (_x: number, y: number, _width: number, height: number) => {
        userEntryY.current = y;
        userEntryHeight.current = height;
        // Small delay to ensure layout is complete
        setTimeout(() => {
          checkUserEntryVisibility();
        }, 50);
      },
      () => {
        userEntryY.current = 0;
        userEntryHeight.current = 0;
      }
    );
  }, [checkUserEntryVisibility]);

  const handleScrollViewLayout = useCallback(
    (event: any) => {
      const { height } = event.nativeEvent.layout;
      scrollViewHeight.current = height;
      checkUserEntryVisibility();
    },
    [checkUserEntryVisibility]
  );

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const isCurrentUser = currentUser?.id === entry.user_id;

    if (isCurrentUser) {
      return (
        <View
          key={entry.user_id}
          ref={userEntryRef}
          onLayout={handleUserEntryLayout}
          collapsable={false}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.leaderboardEntry,
              styles.leaderboardEntryCurrent,
            ]}
          >
        <View style={styles.entryRankContainer}>
          <Text
            style={[
              styles.entryRank,
              isCurrentUser && styles.entryRankCurrent,
            ]}
          >
            {entry.rank}
          </Text>
          <Avatar
            avatarUrl={entry.avatar}
            userName={entry.name}
            size={40}
            style={styles.entryAvatar}
          />
          <View style={styles.entryInfo}>
            <Text
              style={[
                styles.entryName,
                isCurrentUser && styles.entryNameCurrent,
              ]}
              numberOfLines={1}
            >
              {isCurrentUser ? 'You' : entry.name}
            </Text>
            {entry.badges && entry.badges.length > 0 && entry.active_badge && (
              <BadgeDisplay
                badges={entry.badges}
                activeBadge={entry.active_badge}
                showAll={false}
              />
            )}
          </View>
        </View>

        <Text
          style={[
            styles.entryPoints,
            styles.entryPointsCurrent,
          ]}
        >
          {entry.points.toLocaleString()} pts
        </Text>
      </LinearGradient>
    </View>
    );
    }

    return (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardEntry,
        ]}
      >
        <View style={styles.entryRankContainer}>
          <Text style={styles.entryRank}>{entry.rank}</Text>
          <Avatar
            avatarUrl={entry.avatar}
            userName={entry.name}
            size={40}
            style={styles.entryAvatar}
          />
          <View style={styles.entryInfo}>
            <Text style={styles.entryName} numberOfLines={1}>
              {entry.name}
            </Text>
            {entry.badges && entry.badges.length > 0 && entry.active_badge && (
              <BadgeDisplay
                badges={entry.badges}
                activeBadge={entry.active_badge}
                showAll={false}
              />
            )}
          </View>
        </View>

        <Text style={styles.entryPoints}>
          {entry.points.toLocaleString()} pts
        </Text>
      </View>
    );
  };

  const renderUserRank = () => {
    if (!userEntry || !currentUser) return null;

    const isInTopThree = userEntry.rank <= 3;
    if (isInTopThree) return null; // Already shown in top 3

    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.userRankContainer}
      >
        <View style={styles.userRankBadge}>
          <Text style={styles.userRankNumber}>{userEntry.rank}</Text>
        </View>
        <Avatar
          avatarUrl={userEntry.avatar}
          userName={userEntry.name}
          size={40}
        />
        <View style={styles.userRankInfo}>
          <Text style={styles.userRankName}>You</Text>
          {userEntry.badges && userEntry.badges.length > 0 && userEntry.active_badge && (
            <BadgeDisplay
              badges={userEntry.badges}
              activeBadge={userEntry.active_badge}
              showAll={false}
            />
          )}
        </View>
        <Text style={styles.userRankPoints}>{userEntry.points.toLocaleString()} pts</Text>
      </LinearGradient>
    );
  };

  return (
    <Container>
      <Header
        title="Leaderboard"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
        rightElement={
          <TouchableOpacity
            onPress={() => rewardNav.goToHowItWorks()}
            activeOpacity={0.7}
          >
            <PhosphorIcon name="Info" size={24} color={colors.textLight} weight="regular" />
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <Tabs
          tabs={[
            { label: 'Friends', value: 'friends' },
            { label: 'Global', value: 'global' },
          ]}
          activeTab={filter}
          onTabChange={(tab) => setFilter(tab as LeaderboardFilter)}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onLayout={handleScrollViewLayout}
        scrollEventThrottle={16}
        onContentSizeChange={checkUserEntryVisibility}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : (
          <>
            {/* Top 3 Display */}
            {topThree.length > 0 && renderTopThree()}

            {/* Rest of Leaderboard */}
            {restOfLeaderboard.length > 0 && (
              <View style={styles.leaderboardList}>
                {restOfLeaderboard.map((entry, index) => renderLeaderboardEntry(entry, index + 4))}
              </View>
            )}

            {/* Empty State */}
            {leaderboard.length === 0 && (
              <View style={styles.emptyContainer}>
                <PhosphorIcon name="Medal" size={48} color={colors.textLightSecondary} />
                <Text style={styles.emptyText}>
                  {filter === 'friends' ? 'No friends with points yet' : 'No users with points yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {filter === 'friends' ? 'Invite friends to start earning!' : 'Be the first to earn points!'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* User's Rank (if not in top 3) - Fixed at bottom */}
      {!isUserEntryVisible && renderUserRank()}
    </Container>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + 80, // Extra padding for fixed user rank at bottom
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    minHeight: 300,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  topThreeEntry: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  firstPlace: {
    marginHorizontal: spacing.sm,
    marginBottom: 20,
  },
  secondPlace: {
  },
  thirdPlace: {
  },
  crownContainer: {
    marginBottom: -15,
    zIndex: 10,
  },
  crownGradientMask: {
    width: 34,
    height: 34,
  },
  crownGradientFill: {
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.blackGreen,
    marginTop: -20,
  },
  rankBadgeText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  avatarWrapper: {
    marginBottom: spacing.sm,
    borderRadius: 48, // Half of total size (90 + 6 padding)
    padding: 3,
    backgroundColor: colors.blackGreen,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topThreeName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  topThreePoints: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textAlign: 'center',
  },
  leaderboardList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  leaderboardEntryCurrent: {
    // Gradient is applied via LinearGradient component
  },
  entryRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryRank: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    width: 30,
  },
  entryRankCurrent: {
    color: colors.black,
  },
  entryAvatar: {
    marginRight: spacing.xs,
  },
  entryInfo: {
  },
  entryName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  entryNameCurrent: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  entryPoints: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.white,
  },
  entryPointsCurrent: {
    color: colors.black,
  },
  userRankContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  userRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userRankNumber: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.black,
    width: 30,
    },

  userRankInfo: {
    flex: 1,
  },
  userRankName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  userRankPoints: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.black,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
  },
});

export default LeaderboardDetailScreen;

