/**
 * Leaderboard Detail Screen
 * Displays full leaderboard with Friends/Global filter
 * Shows top 3 users prominently and scrollable list of other users
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
// LinearGradient not needed for this screen
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, LoadingScreen } from '../../components/shared';
import Avatar from '../../components/shared/Avatar';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
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
  
  const [filter, setFilter] = useState<LeaderboardFilter>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);

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
          .map((entry, index) => ({ ...entry, rank: index + 1 }));
      } else {
        // Global leaderboard
        entries = await leaderboardService.getTopUsers(100);
      }
      
      setLeaderboard(entries);
      
      // Get user's rank and entry
      const rank = await leaderboardService.getUserRank(currentUser.id);
      setUserRank(rank);
      
      const entry = await leaderboardService.getUserLeaderboardEntry(currentUser.id);
      setUserEntry(entry);
      
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
            <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(2) }]}>
              <Text style={styles.rankBadgeText}>2</Text>
            </View>
            <Avatar
              avatarUrl={topThree[1].avatar}
              userName={topThree[1].name}
              size={60}
              style={styles.topThreeAvatar}
            />
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
              <PhosphorIcon name="Crown" size={24} color={colors.green} weight="fill" />
            </View>
            <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(1) }]}>
              <Text style={styles.rankBadgeText}>1</Text>
            </View>
            <Avatar
              avatarUrl={topThree[0].avatar}
              userName={topThree[0].name}
              size={80}
              style={styles.topThreeAvatar}
            />
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
            <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(3) }]}>
              <Text style={styles.rankBadgeText}>3</Text>
            </View>
            <Avatar
              avatarUrl={topThree[2].avatar}
              userName={topThree[2].name}
              size={60}
              style={styles.topThreeAvatar}
            />
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

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => {
    const isCurrentUser = currentUser?.id === entry.user_id;
    
    return (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardEntry,
          isCurrentUser && styles.leaderboardEntryCurrent
        ]}
      >
        <Text style={styles.entryRank}>{entry.rank}</Text>
        <Avatar
          avatarUrl={entry.avatar}
          userName={entry.name}
          size={48}
          style={styles.entryAvatar}
        />
        <View style={styles.entryInfo}>
          <Text
            style={[
              styles.entryName,
              isCurrentUser && styles.entryNameCurrent
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
        <Text style={styles.entryPoints}>{entry.points.toLocaleString()} pts</Text>
      </View>
    );
  };

  const renderUserRank = () => {
    if (!userEntry || !currentUser) return null;
    
    const isInTopThree = userEntry.rank <= 3;
    if (isInTopThree) return null; // Already shown in top 3
    
    return (
      <View style={styles.userRankContainer}>
        <View style={styles.userRankBadge}>
          <Text style={styles.userRankNumber}>{userEntry.rank}</Text>
        </View>
        <Avatar
          avatarUrl={userEntry.avatar}
          userName={userEntry.name}
          size={48}
          style={styles.userRankAvatar}
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
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <Container>
        <Header
          title="Leaderboard"
          showBackButton={true}
          onBackPress={() => rewardNav.goBack()}
          backgroundColor={colors.black}
        />
        <LoadingScreen
          message="Loading leaderboard..."
          showSpinner={true}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Leaderboard"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      {/* Filter Segmented Control */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'friends' && styles.filterButtonActive
          ]}
          onPress={() => setFilter('friends')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'friends' && styles.filterButtonTextActive
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'global' && styles.filterButtonActive
          ]}
          onPress={() => setFilter('global')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'global' && styles.filterButtonTextActive
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>
      </View>

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
        {/* Top 3 Display */}
        {topThree.length > 0 && renderTopThree()}

        {/* Rest of Leaderboard */}
        {restOfLeaderboard.length > 0 && (
          <View style={styles.leaderboardList}>
            {restOfLeaderboard.map((entry, index) => renderLeaderboardEntry(entry, index + 4))}
          </View>
        )}

        {/* User's Rank (if not in top 3) */}
        {renderUserRank()}

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
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.green,
  },
  filterButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
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
    paddingHorizontal: spacing.sm,
  },
  topThreeEntry: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  firstPlace: {
    marginHorizontal: spacing.sm,
    marginBottom: 0,
  },
  secondPlace: {
    marginBottom: spacing.md,
  },
  thirdPlace: {
    marginBottom: spacing.md,
  },
  crownContainer: {
    marginBottom: spacing.xs,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  topThreeAvatar: {
    marginBottom: spacing.sm,
  },
  topThreeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  topThreePoints: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  leaderboardList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  leaderboardEntryCurrent: {
    backgroundColor: colors.green,
  },
  entryRank: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    width: 30,
  },
  entryAvatar: {
    marginRight: spacing.xs,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  entryNameCurrent: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  entryPoints: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  userRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  userRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRankNumber: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  userRankAvatar: {
    marginRight: spacing.xs,
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
    fontWeight: typography.fontWeight.semibold,
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

