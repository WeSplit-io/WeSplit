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
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, Loader } from '../../components/shared';
import Avatar from '../../components/shared/Avatar';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import Tabs from '../../components/shared/Tabs';
import { useApp } from '../../context/AppContext';
import { leaderboardService } from '../../services/rewards/leaderboardService';
import { LeaderboardEntry } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import BadgeDisplay from '../../components/profile/BadgeDisplay';
import UserNameWithBadges from '../../components/profile/UserNameWithBadges';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { TransactionBasedContactService } from '../../services/contacts/transactionBasedContactService';
import { badgeService } from '../../services/rewards/badgeService';

type LeaderboardFilter = 'friends' | 'global';

const LeaderboardDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
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
      // Get user's contacts/connections using TransactionBasedContactService
      // This service returns contacts with proper user IDs (contact.id is the user ID)
      const contacts = await TransactionBasedContactService.getTransactionBasedContacts(currentUser.id);

      // Extract user IDs from contacts
      // contact.id is the user ID (Firebase document ID of the user)
      const friendIds = contacts
        .map(contact => contact.id) // contact.id is the user ID
        .filter(Boolean) as string[];

      // Always include current user in friends list
      const friendIdsSet = new Set(friendIds);
      friendIdsSet.add(currentUser.id);

      logger.info('Loaded friends list for leaderboard', {
        totalContacts: contacts.length,
        friendIdsCount: friendIdsSet.size
      }, 'LeaderboardDetailScreen');

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
    if (rank === 2) return colors.whiteSecondary;
    if (rank === 3) return '#CD7F32'; // Bronze
    return colors.white10;
  }, []);

  // Helper component to render badges, filtering out community badges
  const RenderFilteredBadges = useCallback(({ badges, activeBadge }: { badges?: string[], activeBadge?: string }) => {
    // Don't render if no badges or no active badge
    if (!badges || badges.length === 0 || !activeBadge) {
      return null;
    }
    
    // BadgeDisplay already filters out community badges, so we can just use it
    // The filter happens inside BadgeDisplay after badge info is loaded
    return (
      <BadgeDisplay
        badges={badges}
        activeBadge={activeBadge}
        showAll={false}
      />
    );
  }, []);

  // Memoize leaderboard slices to prevent recalculation on every render
  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const restOfLeaderboard = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const handleUserPress = useCallback((userId: string) => {
    if (!userId) {
      logger.warn('Cannot navigate: userId is missing', { userId }, 'LeaderboardDetailScreen');
      return;
    }
    try {
      logger.info('Navigating to user profile', { userId }, 'LeaderboardDetailScreen');
      navigation.navigate('UserProfile', { userId });
    } catch (error) {
      logger.error('Failed to navigate to user profile', { error: error instanceof Error ? error.message : String(error), userId }, 'LeaderboardDetailScreen');
    }
  }, [navigation]);

  const renderTopThree = () => {
    if (topThree.length === 0) return null;

    return (
      <View style={styles.topThreeContainer}>
        {/* 2nd Place (Left) */}
        {topThree[1] && (
          <TouchableOpacity
            style={[styles.topThreeEntry, styles.secondPlace]}
            onPress={() => handleUserPress(topThree[1].user_id)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            <View style={styles.topThreeNameContainer}>
              <UserNameWithBadges
                userId={topThree[1].user_id}
                userName={topThree[1].name}
                textStyle={styles.topThreeName}
                showBadges={true}
              />
            </View>
            <RenderFilteredBadges badges={topThree[1].badges} activeBadge={topThree[1].active_badge} />
            <Text style={styles.topThreePoints}>{topThree[1].points} pts</Text>
          </TouchableOpacity>
        )}

        {/* 1st Place (Center) */}
        {topThree[0] && (
          <TouchableOpacity
            style={[styles.topThreeEntry, styles.firstPlace]}
            onPress={() => handleUserPress(topThree[0].user_id)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            <View style={styles.topThreeNameContainer}>
              <UserNameWithBadges
                userId={topThree[0].user_id}
                userName={topThree[0].name}
                textStyle={styles.topThreeName}
                showBadges={true}
              />
            </View>
            <RenderFilteredBadges badges={topThree[0].badges} activeBadge={topThree[0].active_badge} />
            <Text style={styles.topThreePoints}>{topThree[0].points} pts</Text>
          </TouchableOpacity>
        )}

        {/* 3rd Place (Right) */}
        {topThree[2] && (
          <TouchableOpacity
            style={[styles.topThreeEntry, styles.thirdPlace]}
            onPress={() => handleUserPress(topThree[2].user_id)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            <View style={styles.topThreeNameContainer}>
              <UserNameWithBadges
                userId={topThree[2].user_id}
                userName={topThree[2].name}
                textStyle={styles.topThreeName}
                showBadges={true}
              />
            </View>
            <RenderFilteredBadges badges={topThree[2].badges} activeBadge={topThree[2].active_badge} />
            <Text style={styles.topThreePoints}>{topThree[2].points} pts</Text>
          </TouchableOpacity>
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
        <TouchableOpacity
          key={entry.user_id}
          ref={userEntryRef}
          onLayout={handleUserEntryLayout}
          collapsable={false}
          onPress={() => handleUserPress(entry.user_id)}
          activeOpacity={0.7}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
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
            <UserNameWithBadges
              userId={entry.user_id}
              userName={isCurrentUser ? 'You' : entry.name}
              textStyle={[
                styles.entryName,
                isCurrentUser && styles.entryNameCurrent,
              ]}
              showBadges={true}
            />
            <RenderFilteredBadges badges={entry.badges} activeBadge={entry.active_badge} />
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
    </TouchableOpacity>
    );
    }

    return (
      <TouchableOpacity
        key={entry.user_id}
        style={[
          styles.leaderboardEntry,
        ]}
        onPress={() => handleUserPress(entry.user_id)}
        activeOpacity={0.7}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
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
            <UserNameWithBadges
              userId={entry.user_id}
              userName={entry.name}
              textStyle={styles.entryName}
              showBadges={true}
            />
            <RenderFilteredBadges badges={entry.badges} activeBadge={entry.active_badge} />
          </View>
        </View>

        <Text style={styles.entryPoints}>
          {entry.points.toLocaleString()} pts
        </Text>
      </TouchableOpacity>
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
          <UserNameWithBadges
            userId={userEntry.user_id}
            userName="You"
            textStyle={styles.userRankName}
            showBadges={true}
          />
          <RenderFilteredBadges badges={userEntry.badges} activeBadge={userEntry.active_badge} />
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
            <PhosphorIcon name="Info" size={24} color={colors.white} weight="regular" />
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
          <Loader />
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
                <PhosphorIcon name="Medal" size={48} color={colors.whiteSecondary} />
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
    color: colors.white,
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
    width: '100%',
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
  },
  topThreeNameContainer: {
    alignItems: 'center',
    marginTop: spacing.xs,
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    flex: 1,
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    pointerEvents: 'none', // Allow touches to pass through to parent TouchableOpacity
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
    color: colors.white,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.whiteSecondary,
    marginTop: spacing.xs,
  },
});

export default LeaderboardDetailScreen;

