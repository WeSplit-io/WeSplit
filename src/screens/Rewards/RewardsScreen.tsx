/**
 * Rewards Screen
 * Main rewards screen with points display, invite button, feature cards, and points history
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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import NavBar from '../../components/shared/NavBar';
import { Container, Header, LoadingScreen, Button } from '../../components/shared';
import PhosphorIcon, { PhosphorIconName } from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { pointsService } from '../../services/rewards/pointsService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { PointsTransaction } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { userActionSyncService } from '../../services/rewards/userActionSyncService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { seasonService } from '../../services/rewards/seasonService';

const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Get current season (Season 1 starts today and lasts 6 months)
      const currentSeason = seasonService.getCurrentSeason();
      
      // Load data in parallel for better performance
      // Filter to only show current season transactions
      const [points, history] = await Promise.all([
        pointsService.getUserPoints(currentUser.id),
        pointsService.getPointsHistory(currentUser.id, 4, currentSeason) // Only show last 4 transactions from current season
      ]);

      setUserPoints(points);
      setPointsHistory(history);

      // Sync user actions in background (non-blocking)
      (async () => {
        try {
          await userActionSyncService.verifyAndSyncUserActions(currentUser.id);
        } catch (syncError) {
          logger.error('Failed to sync user actions', syncError, 'RewardsScreen');
        }
      })();

      // Refresh user data from database in background (non-blocking)
      firebaseDataService.user.getCurrentUser(currentUser.id)
        .then(freshUser => {
          if (freshUser.points !== undefined && freshUser.points !== currentUser.points) {
            updateUser({ points: freshUser.points, total_points_earned: freshUser.total_points_earned });
            setUserPoints(freshUser.points || 0);
          }
        })
        .catch(error => {
          logger.error('Failed to refresh user data', error, 'RewardsScreen');
        });
    } catch (error) {
      logger.error('Error loading rewards data', error, 'RewardsScreen');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentUser?.id, updateUser]);

  useEffect(() => {
    if (currentUser?.id && !isLoadingRef.current) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only depend on currentUser.id to prevent multiple loads

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Memoized formatting functions to prevent recreation on every render
  const formatPoints = useCallback((points: number) => {
    return points.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }, []);

  const formatTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  }, []);

  // Memoized icon map to prevent recreation
  const iconMap = useMemo<Partial<Record<PointsTransaction['source'], PhosphorIconName>>>(() => ({
    'transaction_reward': 'CurrencyCircleDollar',
    'quest_completion': 'Star',
    'season_reward': 'Trophy',
    'referral_reward': 'Handshake',
    'admin_adjustment': 'Gear',
  }), []);

  const getTransactionIcon = useCallback((source: PointsTransaction['source']): PhosphorIconName => {
    return (iconMap[source] ?? 'Circle') as PhosphorIconName;
  }, [iconMap]);

  // Memoized title map to prevent recreation
  const titleMap = useMemo(() => ({
    'transaction_reward': 'Send Request',
    'quest_completion': 'Quest Completed',
    'season_reward': 'Season Reward',
    'referral_reward': 'Referral Reward',
    'admin_adjustment': 'Admin Adjustment',
  }), []);

  const getTransactionTitle = useCallback((transaction: PointsTransaction) => {
    if (transaction.description) {
      return transaction.description;
    }
    return titleMap[transaction.source] || 'Points Awarded';
  }, [titleMap]);

  if (loading && !refreshing) {
    return (
      <LoadingScreen
        message="Loading rewards..."
        showSpinner={true}
      />
    );
  }

  return (
    <Container>
      <Header
        title="Rewards"
        showBackButton={false}
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
        {/* Points Display */}
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>
            {formatPoints(userPoints || currentUser?.points || 0)}
          </Text>
          <Text style={styles.pointsLabel}>Split points</Text>
                </View>
        <View style={styles.featureCardsContainerWrapper}>
        {/* Invite Friends Button */}
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => rewardNav.goToReferral()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteButtonGradient}
          >
            <PhosphorIcon name="Handshake" size={30} color={colors.black} weight="fill" />
            <View style={styles.inviteButtonContent}>
              <Text style={styles.inviteButtonTitle}>Invite your friends</Text>
              <Text style={styles.inviteButtonSubtitle}>
                Earn points together and climb the ranks.
              </Text>
            </View>
            <PhosphorIcon name="CaretRight" size={20} color={colors.black} weight="regular" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Feature Cards */}
        <View style={styles.featureCardsContainer}>
          {/* Leaderboard Card */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => rewardNav.goToLeaderboardDetail()}
            activeOpacity={0.7}
          >
            <MaskedView
              style={styles.gradientIconMask}
              maskElement={
                <PhosphorIcon name="Ranking" size={32} color={colors.black} weight="fill" />
              }
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientIconFill}
              />
            </MaskedView>
            <Text style={styles.featureCardTitle}>Leaderboard</Text>
            <Text style={styles.featureCardSubtitle}>Climb, compete, conquer.</Text>
          </TouchableOpacity>

          {/* How to Earn Points Card */}
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => rewardNav.goToHowToEarnPoints()}
            activeOpacity={0.7}
          >
            <MaskedView
              style={styles.gradientIconMask}
              maskElement={
                <PhosphorIcon name="Coins" size={32} color={colors.black} weight="fill" />
              }
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientIconFill}
              />
            </MaskedView>
            <Text style={styles.featureCardTitle}>How to Earn Points</Text>
            <Text style={styles.featureCardSubtitle}>Do more, earn more.</Text>
          </TouchableOpacity>
        </View>

        </View>
        

        {/* Christmas Calendar Button - Matches Referral Button Style 
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => rewardNav.goToChristmasCalendar()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteButtonGradient}
          >
            <PhosphorIcon name="Calendar" size={24} color={colors.black} weight="fill" />
            <View style={styles.inviteButtonContent}>
              <Text style={styles.inviteButtonTitle}>Christmas Calendar</Text>
              <Text style={styles.inviteButtonSubtitle}>
                Claim daily gifts and earn rewards.
              </Text>
            </View>
            <PhosphorIcon name="ArrowRight" size={20} color={colors.black} weight="regular" />
          </LinearGradient>
        </TouchableOpacity>*/}

        {/* Points History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Points History</Text>
            <TouchableOpacity 
              onPress={() => rewardNav.goToPointsHistory()}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllLink}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.historyList}>
            {pointsHistory.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <PhosphorIcon name="Receipt" size={32} color={colors.textLightSecondary} />
                <Text style={styles.emptyHistoryText}>No points history yet</Text>
              </View>
            ) : (
              pointsHistory.map((transaction) => {
                const iconName = getTransactionIcon(transaction.source);
                const title = getTransactionTitle(transaction);
                const date = formatDate(transaction.created_at);
                const time = formatTime(transaction.created_at);

                return (
                  <View key={transaction.id} style={styles.historyItem}>
                    <View style={styles.historyItemIcon}>
                      <PhosphorIcon name={iconName} size={18} color={colors.white} weight="regular" />
                    </View>
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.historyItemSubtitle}>
                        {date} - {time}
                      </Text>
                    </View>
                    <View style={styles.historyItemPoints}>
                      <Text style={styles.historyItemPointsValue}>
                        +{transaction.amount}
                      </Text>
                      <Text style={styles.historyItemPointsLabel}>Split Points</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
      </View>
      </ScrollView>

      <NavBar currentRoute="Rewards" navigation={navigation} />
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: 120, // Space for NavBar
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
  pointsContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  pointsLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  inviteButtonContent: {
    flex: 1,
  },
  inviteButtonTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing.xs / 2,
  },
  inviteButtonSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.black,
    opacity: 0.8,
  },
  featureCardsContainerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  featureCardsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  featureCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  featureCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    textAlign: 'center',
  },
  featureCardSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    textAlign: 'left',
  },
  gradientIconMask: {
    width: 32,
    height: 32,
  },
  gradientIconFill: {
    flex: 1,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  seeAllLink: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.lg,
    backgroundColor: colors.white10,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  historyItemSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  historyItemPoints: {
    alignItems: 'flex-end',
  },
  historyItemPointsValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  historyItemPointsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: 2,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyHistoryText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
});

export default RewardsScreen;
