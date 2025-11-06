import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert } from 'react-native';
import { colors, spacing } from '../../theme';
import NavBar from '../../components/shared/NavBar';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import Avatar from '../../components/shared/Avatar';
import { useApp } from '../../context/AppContext';
import { leaderboardService } from '../../services/rewards/leaderboardService';
import { questService, QUEST_DEFINITIONS } from '../../services/rewards/questService';
import { pointsService } from '../../services/rewards/pointsService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { LeaderboardEntry, Quest } from '../../types/rewards';
import { getPlatformInfo } from '../../utils/core/platformDetection';
import { styles } from './styles';
import ChristmasCalendar from '../../components/rewards/ChristmasCalendar';

const RewardsScreen: React.FC<any> = ({ navigation }) => {
  const { state, updateUser } = useApp();
  const { currentUser } = state;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userQuests, setUserQuests] = useState<Quest[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load leaderboard
      const topUsers = await leaderboardService.getTopUsers(50);
      setLeaderboard(topUsers);

      // Load user rank, quests, and points if logged in
      if (currentUser?.id) {
        // First, verify and sync user actions to ensure quests are properly marked
        // This is important for old users who may have completed actions but haven't had quests synced
        try {
          const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
          await userActionSyncService.verifyAndSyncUserActions(currentUser.id);
        } catch (syncError) {
          console.error('Failed to sync user actions:', syncError);
          // Continue loading even if sync fails
        }

        const [rank, quests, points] = await Promise.all([
          leaderboardService.getUserRank(currentUser.id),
          questService.getUserQuests(currentUser.id),
          pointsService.getUserPoints(currentUser.id)
        ]);

        setUserRank(rank);
        setUserQuests(quests);
        setUserPoints(points);

        // Refresh user data from database to ensure points are up to date
        try {
          const freshUser = await firebaseDataService.user.getCurrentUser(currentUser.id);
          if (freshUser.points !== undefined && freshUser.points !== currentUser.points) {
            // Update app state with fresh points from database
            await updateUser({ points: freshUser.points, total_points_earned: freshUser.total_points_earned });
            // Update local state with fresh points
            setUserPoints(freshUser.points || 0);
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          // Use points from service if user refresh fails
        }
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Block access in production
  useEffect(() => {
    const platformInfo = getPlatformInfo();
    if (platformInfo.isProduction) {
      Alert.alert(
        'Coming Soon! 🚀',
        'We\'re working on the Rewards feature and it will be available in a few weeks. Stay tuned!',
        [
          {
            text: 'Got it!',
            style: 'default',
            onPress: () => {
              // Navigate back to Dashboard
              if (navigation) {
                navigation.navigate('Dashboard');
              }
            }
          }
        ]
      );
    }
  }, [navigation]);

  useEffect(() => {
    const platformInfo = getPlatformInfo();
    // Only load data if not in production
    if (!platformInfo.isProduction) {
      loadData();
    }
  }, [currentUser?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return colors.brandGreen;
    if (rank === 2) return colors.textLightSecondary;
    if (rank === 3) return '#CD7F32'; // Bronze
    return colors.white10;
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
        <View style={styles.leaderboardRank}>
          <View 
            style={[
              styles.rankBadge,
              { backgroundColor: getRankBadgeColor(entry.rank) }
            ]}
          >
            <Text style={styles.rankBadgeText}>{getRankBadge(entry.rank)}</Text>
          </View>
        </View>
        
        <Avatar
          avatarUrl={entry.avatar}
          userName={entry.name}
          size={40}
          style={styles.leaderboardAvatar}
        />
        
        <View style={styles.leaderboardInfo}>
          <Text 
            style={[
              styles.leaderboardName,
              isCurrentUser && styles.leaderboardNameCurrent
            ]}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          {isCurrentUser && (
            <Text style={styles.leaderboardYouLabel}>You</Text>
          )}
        </View>
        
        <View style={styles.leaderboardPoints}>
          <Text style={styles.leaderboardPointsValue}>{entry.points}</Text>
          <Text style={styles.leaderboardPointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  const renderQuestCard = (quest: Quest) => {
    const isCompleted = quest.completed;
    
    return (
      <View 
        key={quest.id} 
        style={[
          styles.questCard,
          isCompleted && styles.questCardCompleted
        ]}
      >
        <View style={styles.questHeader}>
          <View style={styles.questIconContainer}>
            {isCompleted ? (
              <PhosphorIcon name="CheckCircle" size={24} color={colors.brandGreen} weight="fill" />
            ) : (
              <View style={[styles.questIncompleteIcon, { borderColor: colors.textLightSecondary }]} />
            )}
          </View>
          <View style={styles.questInfo}>
            <Text style={[
              styles.questTitle,
              isCompleted && styles.questTitleCompleted
            ]}>
              {quest.title}
            </Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
          <View style={styles.questPoints}>
            <Text style={[
              styles.questPointsValue,
              isCompleted && styles.questPointsValueCompleted
            ]}>
              +{quest.points}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Block rendering in production
  const platformInfo = getPlatformInfo();
  if (platformInfo.isProduction) {
    return (
      <Container>
        <Header
          title="Rewards"
          showBackButton={false}
          backgroundColor={colors.black}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Rewards coming soon!</Text>
        </View>
        <NavBar currentRoute="Rewards" navigation={navigation} />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Header
          title="Rewards"
          showBackButton={false}
          backgroundColor={colors.black}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandGreen} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
        <NavBar currentRoute="Rewards" navigation={navigation} />
      </Container>
    );
  }
 
  return (
    <Container>
      <Header
        title="Rewards"
        showBackButton={false}
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
            tintColor={colors.brandGreen}
          />
        }
      >
        {/* User Points Summary */}
        {currentUser && (
          <View style={styles.userSummaryCard}>
            <View style={styles.userSummaryHeader}>
              <Text style={styles.userSummaryTitle}>Your Points</Text>
              {userRank !== null && (
                <View style={styles.userRankBadge}>
                  <Text style={styles.userRankText}>Rank #{userRank}</Text>
                </View>
              )}
            </View>
            <View style={styles.userPointsContainer}>
              <Text style={styles.userPointsValue}>{userPoints || currentUser.points || 0}</Text>
              <Text style={styles.userPointsLabel}>points</Text>
            </View>
          </View>
        )}

        {/* Christmas Calendar Section */}
        {currentUser && (
          <ChristmasCalendar 
            userId={currentUser.id}
            onClaimSuccess={async () => {
              // Refresh user points after claiming
              try {
                const freshUser = await firebaseDataService.user.getCurrentUser(currentUser.id);
                if (freshUser.points !== undefined && freshUser.points !== currentUser.points) {
                  await updateUser({ 
                    points: freshUser.points, 
                    total_points_earned: freshUser.total_points_earned,
                    badges: freshUser.badges,
                    active_badge: freshUser.active_badge,
                    profile_assets: freshUser.profile_assets,
                    active_profile_asset: freshUser.active_profile_asset,
                    wallet_backgrounds: freshUser.wallet_backgrounds,
                    active_wallet_background: freshUser.active_wallet_background
                  });
                  setUserPoints(freshUser.points || 0);
                }
              } catch (error) {
                console.error('Failed to refresh user data after gift claim:', error);
              }
            }}
          />
        )}

        {/* How to Earn Points Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Earn Points</Text>
          <View style={styles.questsContainer}>
            {Object.values(QUEST_DEFINITIONS).map(quest => {
              const userQuest = userQuests.find(q => q.id === quest.id);
              return renderQuestCard(userQuest || quest);
            })}
          </View>
        </View>

        {/* Transaction Rewards Info */}
        <View style={styles.infoCard}>
          <PhosphorIcon name="Info" size={24} color={colors.brandGreen} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Transaction Rewards</Text>
            <Text style={styles.infoText}>
              Earn 10% of your transaction amount as points when you send money to other WeSplit users. 
              Example: Send $10 = 1 point
            </Text>
          </View>
        </View>

        {/* Leaderboard Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <Text style={styles.sectionSubtitle}>Top 50 Users</Text>
          </View>
          
          {leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <PhosphorIcon name="Medal" size={48} color={colors.textLightSecondary} />
              <Text style={styles.emptyText}>No users with points yet</Text>
              <Text style={styles.emptySubtext}>Be the first to earn points!</Text>
            </View>
          ) : (
            <View style={styles.leaderboardContainer}>
              {leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))}
            </View>
          )}
      </View>
      </ScrollView>

      <NavBar currentRoute="Rewards" navigation={navigation} />
    </Container>
  );
};

export default RewardsScreen;
