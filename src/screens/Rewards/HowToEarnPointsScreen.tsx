/**
 * How to Earn Points Screen
 * Displays all quest types and ways to earn points
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { questService, QUEST_DEFINITIONS } from '../../services/rewards/questService';
import { Quest } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { getSeasonReward, calculateRewardPoints } from '../../services/rewards/seasonRewardsConfig';
import { seasonService } from '../../services/rewards/seasonService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const HowToEarnPointsScreen: React.FC = () => {
  const navigation = useNavigation();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [userQuests, setUserQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(1);

  useEffect(() => {
    setCurrentSeason(seasonService.getCurrentSeason());
  }, []);

  const loadQuests = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const quests = await questService.getUserQuests(currentUser.id);
      setUserQuests(quests);
    } catch (error) {
      logger.error('Failed to load quests', error, 'HowToEarnPointsScreen');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Memoized icon map to prevent recreation
  const questIconMap = useMemo(() => ({
    'export_seed_phrase': 'Key',
    'setup_account_pp': 'UserCircle',
    'first_split_with_friends': 'Users',
    'first_external_wallet_linked': 'Wallet',
    'invite_friends_create_account': 'UserPlus',
    'friend_do_first_split_over_10': 'Handshake',
    'profile_image': 'Image',
    'first_transaction': 'CurrencyCircleDollar',
  }), []);

  const getQuestIcon = useCallback((questType: string) => {
    return questIconMap[questType] || 'Star';
  }, [questIconMap]);

  // Memoize season-based quests list
  const seasonBasedQuests = useMemo(() => [
    'export_seed_phrase',
    'setup_account_pp',
    'first_split_with_friends',
    'first_external_wallet_linked',
    'invite_friends_create_account',
    'friend_do_first_split_over_10'
  ], []);

  const getQuestPoints = useCallback((questType: string) => {
    const userQuest = userQuests.find(q => q.id === questType || q.type === questType);
    if (userQuest?.points) {
      return userQuest.points;
    }
    
    if (seasonBasedQuests.includes(questType)) {
      const reward = getSeasonReward(questType as any, currentSeason, false);
      return calculateRewardPoints(reward, 0);
    }
    
    const questDef = QUEST_DEFINITIONS[questType];
    return questDef?.points || 0;
  }, [userQuests, seasonBasedQuests, currentSeason]);

  const renderQuestCard = (quest: Quest) => {
    const isCompleted = quest.completed === true;
    const iconName = getQuestIcon(quest.type || quest.id);
    const points = getQuestPoints(quest.type || quest.id);

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
              <PhosphorIcon name="CheckCircle" size={32} color={colors.green} weight="fill" />
            ) : (
              <PhosphorIcon name={iconName} size={32} color={colors.textLightSecondary} weight="regular" />
            )}
          </View>
          <View style={styles.questInfo}>
            <Text
              style={[
                styles.questTitle,
                isCompleted && styles.questTitleCompleted
              ]}
            >
              {quest.title}
            </Text>
            <Text style={styles.questDescription}>
              {quest.description}
            </Text>
            {isCompleted && quest.completed_at && (
              <Text style={styles.questCompletedDate}>
                Completed {new Date(quest.completed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
          <View style={styles.questPoints}>
            <Text
              style={[
                styles.questPointsValue,
                isCompleted && styles.questPointsValueCompleted
              ]}
            >
              +{points}
            </Text>
            <Text style={styles.questPointsLabel}>pts</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTransactionRewards = () => {
    const isPartnership = currentUser?.is_partnership || false;
    const reward = getSeasonReward('transaction_1_1_request', currentSeason, isPartnership);
    const percentage = reward.type === 'percentage' ? reward.value : 0;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PhosphorIcon name="CurrencyCircleDollar" size={24} color={colors.green} weight="fill" />
          <Text style={styles.sectionTitle}>Transaction Rewards</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Earn {percentage}% of your transaction amount as points when you send money to other WeSplit users.
          </Text>
          {isPartnership && (
            <Text style={styles.partnershipBadge}>
              Partnership Bonus Active
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSplitRewards = () => {
    const isPartnership = currentUser?.is_partnership || false;
    const participateReward = getSeasonReward('participate_fair_split', currentSeason, isPartnership);
    const ownerReward = getSeasonReward('create_fair_split_owner_bonus', currentSeason, isPartnership);
    const degenWinReward = getSeasonReward('degen_split_win', currentSeason, isPartnership);
    const degenLoseReward = getSeasonReward('degen_split_lose', currentSeason, isPartnership);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PhosphorIcon name="Users" size={24} color={colors.green} weight="fill" />
          <Text style={styles.sectionTitle}>Split Rewards</Text>
        </View>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Fair Split</Text>
          <Text style={styles.infoText}>
            • Participate: {participateReward.type === 'percentage' ? `${participateReward.value}%` : `${participateReward.value} pts`}
          </Text>
          <Text style={styles.infoText}>
            • Create (Owner Bonus): {ownerReward.type === 'percentage' ? `${ownerReward.value}%` : `${ownerReward.value} pts`}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Degen Split</Text>
          <Text style={styles.infoText}>
            • Win: {degenWinReward.type === 'percentage' ? `${degenWinReward.value}%` : `${degenWinReward.value} pts`}
          </Text>
          <Text style={styles.infoText}>
            • Lose: {degenLoseReward.type === 'percentage' ? `${degenLoseReward.value}%` : `${degenLoseReward.value} pts`}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Container>
        <Header
          title="How to Earn Points"
          showBackButton={true}
          onBackPress={() => rewardNav.goBack()}
          backgroundColor={colors.black}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Container>
    );
  }

  const allQuests = Object.values(QUEST_DEFINITIONS).map(questDef => {
    const userQuest = userQuests.find(q => q.id === questDef.id || q.type === questDef.type);
    return userQuest
      ? { ...questDef, ...userQuest, completed: userQuest.completed === true }
      : { ...questDef, completed: false };
  });

  return (
    <Container>
      <Header
        title="How to Earn Points"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Season Info */}
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonText}>Season {currentSeason}</Text>
        </View>

        {/* Get Started Quests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          <View style={styles.questsContainer}>
            {allQuests
              .filter(q => ['export_seed_phrase', 'setup_account_pp', 'first_split_with_friends', 'first_external_wallet_linked'].includes(q.id))
              .map(quest => renderQuestCard(quest))}
          </View>
        </View>

        {/* Referral Quests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral</Text>
          <View style={styles.questsContainer}>
            {allQuests
              .filter(q => ['invite_friends_create_account', 'friend_do_first_split_over_10'].includes(q.id))
              .map(quest => renderQuestCard(quest))}
          </View>
        </View>

        {/* Transaction Rewards */}
        {renderTransactionRewards()}

        {/* Split Rewards */}
        {renderSplitRewards()}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
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
  seasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  seasonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  questsContainer: {
    gap: spacing.sm,
  },
  questCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  questCardCompleted: {
    borderColor: colors.green,
    opacity: 0.7,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  questIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLightSecondary,
  },
  questDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 18,
  },
  questCompletedDate: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    marginTop: spacing.xs / 2,
  },
  questPoints: {
    alignItems: 'flex-end',
  },
  questPointsValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  questPointsValueCompleted: {
    color: colors.textLightSecondary,
  },
  questPointsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 18,
  },
  partnershipBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    marginTop: spacing.xs,
  },
});

export default HowToEarnPointsScreen;

