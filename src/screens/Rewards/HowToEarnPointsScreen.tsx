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
  TouchableOpacity,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, LoadingScreen } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { questService, QUEST_DEFINITIONS } from '../../services/rewards/questService';
import { Quest } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { getSeasonReward, calculateRewardPoints, SeasonReward } from '../../services/rewards/seasonRewardsConfig';
import { seasonService, Season } from '../../services/rewards/seasonService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const HowToEarnPointsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [userQuests, setUserQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState<Season>(1);

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
      logger.error('Failed to load quests', { error }, 'HowToEarnPointsScreen');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Memoized icon map to prevent recreation
  const questIconMap = useMemo<Record<string, React.ComponentProps<typeof PhosphorIcon>['name']>>(() => ({
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
        <View style={styles.questIconContainer}>
          {isCompleted ? (
            <PhosphorIcon name="CheckCircle" size={25} color={colors.white} weight="fill" />
          ) : (
            <PhosphorIcon name={iconName} size={25} color={colors.white} weight="regular" />
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
        <View style={styles.questStatus}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.statusPill}
          >
            {isCompleted ? (
              <>
                <Text style={[styles.statusPillText, styles.statusPillTextClaimed]}>
                  Claimed
                </Text>
              </>
            ) : (
              <Text style={[styles.statusPillText, styles.statusPillTextPoints]}>
                {points} pts
              </Text>
            )}
          </LinearGradient>
        </View>
      </View>
    );
  };

  const formatRewardValue = useCallback((reward: SeasonReward) => {
    if (!reward) {
      return '';
    }
    return reward.type === 'percentage'
      ? `${reward.value}%`
      : `${reward.value} pts`;
  }, []);

  const infoCards = useMemo(() => {
    const isPartnership = currentUser?.is_partnership || false;
    const transactionReward = getSeasonReward('transaction_1_1_request', currentSeason, isPartnership);
    const inviteFriendsPoints = getQuestPoints('invite_friends_create_account');
    const friendSplitPoints = getQuestPoints('friend_do_first_split_over_10');
    const participateReward = getSeasonReward('participate_fair_split', currentSeason, isPartnership);
    const ownerReward = getSeasonReward('create_fair_split_owner_bonus', currentSeason, isPartnership);
    const degenWinReward = getSeasonReward('degen_split_win', currentSeason, isPartnership);
    const degenLoseReward = getSeasonReward('degen_split_lose', currentSeason, isPartnership);

    return [
      {
        id: 'invite_friends_info',
        title: 'Earn big by inviting friends!',
        icon: 'Handshake' as const,
        bullets: [
          `Invite friends who create an account: ${inviteFriendsPoints} Split points`,
          `Friend completes a first split over $10: ${friendSplitPoints} Split points`,
        ],
      },
      {
        id: 'earn_every_action',
        title: 'Earn points for every action',
        icon: 'CurrencyCircleDollar' as const,
        bullets: [
          `Transaction 1:1 / Request: ${formatRewardValue(transactionReward)}`,
          `Friend completes a first split over $10: ${friendSplitPoints} Split points`,
        ],
      },
      {
        id: 'split_rewards',
        title: 'Earn points on every split',
        icon: 'Users' as const,
        bullets: [
          `Participate in a Fair Split: ${formatRewardValue(participateReward)}`,
          `Create a Fair Split (owner bonus): ${formatRewardValue(ownerReward)}`,
          `Degen Split win: ${formatRewardValue(degenWinReward)}`,
          `Degen Split lose: ${formatRewardValue(degenLoseReward)}`,
        ],
      },
    ];
  }, [currentUser?.is_partnership, currentSeason, formatRewardValue, getQuestPoints]);

  const renderInfoCard = (card: {
    id: string;
    title: string;
    icon: React.ComponentProps<typeof PhosphorIcon>['name'];
    bullets: string[];
  }) => (
    <View key={card.id} style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={styles.infoCardIcon}>
          <PhosphorIcon name={card.icon} size={25} color={colors.white} weight="fill" />
        </View>
        <Text style={styles.infoCardTitle}>{card.title}</Text>
      </View>
      <View style={styles.infoCardBullets}>
        {card.bullets.map((bullet, index) => (
          <Text key={`${card.id}-bullet-${index}`} style={styles.infoCardBulletText}>
            • {bullet}
          </Text>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Container>
        <Header
          title="How to Earn Points"
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
        <LoadingScreen
          message="Loading..."
          showSpinner={true}
        />
      </Container>
    );
  }

  const allQuests = Object.values(QUEST_DEFINITIONS).map(questDef => {
    const userQuest = userQuests.find(q => q.id === questDef.id || q.type === questDef.type);
    return userQuest
      ? { ...questDef, ...userQuest, completed: userQuest.completed === true }
      : { ...questDef, completed: false };
  });

  const questOrder = [
    'export_seed_phrase',
    'setup_account_pp',
    'first_split_with_friends',
    'first_external_wallet_linked',
    'invite_friends_create_account',
    'friend_do_first_split_over_10',
  ];

  const orderedQuests = questOrder
    .map(id => allQuests.find(quest => quest.id === id))
    .filter((quest): quest is Quest => Boolean(quest));

  return (
    <Container>
      <Header
        title="How to Earn Points"
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {orderedQuests.map(renderQuestCard)}
          {infoCards.map(renderInfoCard)}
        </View>
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  cardsContainer: {
    gap: spacing.md,
  },
  questCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  questCardCompleted: {
    opacity: 0.5,
  },
  questIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 100,
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
    color: colors.white70,
  },
  questDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    lineHeight: 18,
  },
  questCompletedDate: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    marginTop: spacing.xs / 2,
  },
  questStatus: {
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    gap: spacing.xs,
  },
  statusPillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  statusPillTextClaimed: {
    color: colors.black,
  },
  statusPillTextPoints: {
    color: colors.black,
  },
  infoCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    gap: spacing.sm,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  infoCardBullets: {
    gap: spacing.xs,
  },
  infoCardBulletText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 20,
  },
});

export default HowToEarnPointsScreen;

