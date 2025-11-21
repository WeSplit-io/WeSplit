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
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, LoadingScreen, Input, Button } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import Tabs from '../../components/shared/Tabs';
import BadgeCard from '../../components/rewards/BadgeCard';
import { useApp } from '../../context/AppContext';
import { questService, QUEST_DEFINITIONS } from '../../services/rewards/questService';
import { Quest } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { getSeasonReward, calculateRewardPoints, SeasonReward } from '../../services/rewards/seasonRewardsConfig';
import { seasonService, Season } from '../../services/rewards/seasonService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';
import { badgeService, BadgeProgress } from '../../services/rewards/badgeService';
import { BADGE_DEFINITIONS } from '../../services/rewards/badgeConfig';

const HowToEarnPointsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [userQuests, setUserQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState<Season>(1);
  const [activeSection, setActiveSection] = useState<'quest' | 'badges'>('quest');
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
  const [badgeTab, setBadgeTab] = useState<'all' | 'claimed' | 'redeem'>('all');
  const [claimingBadge, setClaimingBadge] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemingBadge, setRedeemingBadge] = useState(false);

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

  const loadBadges = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const progress = await badgeService.getUserBadgeProgress(currentUser.id);
      setBadgeProgress(progress);
    } catch (error) {
      logger.error('Failed to load badges', { error }, 'HowToEarnPointsScreen');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeSection === 'badges') {
      loadBadges();
    }
  }, [activeSection, loadBadges]);

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

  const handleClaimBadge = useCallback(async (badgeId: string) => {
    if (!currentUser?.id || claimingBadge) return;

    setClaimingBadge(badgeId);
    try {
      const result = await badgeService.claimBadge(currentUser.id, badgeId);
      if (result.success) {
        Alert.alert('Success', 'Badge claimed successfully!');
        await loadBadges();
      } else {
        Alert.alert('Error', result.error || 'Failed to claim badge');
      }
    } catch (error) {
      logger.error('Failed to claim badge', { error, badgeId }, 'HowToEarnPointsScreen');
      Alert.alert('Error', 'Failed to claim badge. Please try again.');
    } finally {
      setClaimingBadge(null);
    }
  }, [currentUser?.id, loadBadges]);

  const handleRedeemCode = useCallback(async () => {
    if (!currentUser?.id || !redeemCode.trim() || redeemingBadge) return;

    setRedeemingBadge(true);
    try {
      const result = await badgeService.claimEventBadge(currentUser.id, redeemCode.trim());
      if (result.success) {
        Alert.alert('Success', 'Badge redeemed successfully!');
        setRedeemCode('');
        await loadBadges();
      } else {
        Alert.alert('Error', result.error || 'Invalid redeem code');
      }
    } catch (error) {
      logger.error('Failed to redeem badge', { error, redeemCode }, 'HowToEarnPointsScreen');
      Alert.alert('Error', 'Failed to redeem badge. Please try again.');
    } finally {
      setRedeemingBadge(false);
    }
  }, [currentUser?.id, redeemCode, redeemingBadge, loadBadges]);

  // Filter badges based on active tab - exclude community badges (only show point badges)
  const filteredBadges = useMemo(() => {
    // Filter out community badges - only show badges with points
    const pointBadges = badgeProgress.filter(p => {
      const badgeInfo = BADGE_DEFINITIONS[p.badgeId];
      return badgeInfo && !badgeInfo.isCommunityBadge && badgeInfo.points !== undefined && badgeInfo.points > 0;
    });

    if (badgeTab === 'claimed') {
      // Show claimed point badges AND claimed community badges
      return badgeProgress.filter(p => {
        if (!p.claimed) return false;
        const badgeInfo = BADGE_DEFINITIONS[p.badgeId];
        if (!badgeInfo) return false;
        // Include point badges
        if (!badgeInfo.isCommunityBadge && badgeInfo.points !== undefined && badgeInfo.points > 0) {
          return true;
        }
        // Include community badges that are claimed
        if (badgeInfo.isCommunityBadge) {
          return true;
        }
        return false;
      });
    }
    if (badgeTab === 'redeem') {
      // Redeem tab doesn't apply to point badges (only community/event badges)
      return [];
    }
    // "All" tab shows all point badges
    return pointBadges;
  }, [badgeProgress, badgeTab]);

  const renderBadgeCard = (progress: BadgeProgress) => {
    const badgeInfo = BADGE_DEFINITIONS[progress.badgeId];
    if (!badgeInfo) return null;

    const isClaiming = claimingBadge === progress.badgeId;
    const canClaim = progress.current >= progress.target && !progress.claimed;

    return (
      <BadgeCard
        key={progress.badgeId}
        progress={progress}
        badgeInfo={badgeInfo}
        onPress={() => canClaim && !isClaiming && handleClaimBadge(progress.badgeId)}
        disabled={!canClaim || isClaiming}
        isClaiming={isClaiming}
        hideClaimedOverlay={badgeTab === 'claimed'}
      />
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

      {/* Primary Navigation: Quest / Badges */}
      <View style={styles.primaryNavWrapper}>
        <Tabs
          tabs={[
            { label: 'Quest', value: 'quest' },
            { label: 'Badges', value: 'badges' },
          ]}
          activeTab={activeSection}
          onTabChange={(tab) => setActiveSection(tab as 'quest' | 'badges')}
          enableAnimation={false}
        />
      </View>

      {/* Secondary Navigation: All / Claimed / Redeem Code (only for badges) */}
      {activeSection === 'badges' && (
        <View style={styles.secondaryNavWrapper}>
          <View style={styles.secondaryNavContainer}>
            {[
              { label: 'All', value: 'all' },
              { label: 'Claimed', value: 'claimed' },
              { label: 'Redeem Code', value: 'redeem' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.value}
                style={styles.secondaryNavTab}
                onPress={() => setBadgeTab(tab.value as 'all' | 'claimed' | 'redeem')}
              >
                <Text
                  style={[
                    styles.secondaryNavText,
                    badgeTab === tab.value && styles.secondaryNavTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {badgeTab === tab.value && (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.secondaryNavIndicator}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.secondaryNavUnderline} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {activeSection === 'quest' ? (
            <>
          {orderedQuests.map(renderQuestCard)}
          {infoCards.map(renderInfoCard)}
            </>
          ) : (
            <>
              {badgeTab === 'redeem' ? (
                <View style={styles.redeemContainer}>
                  <Text style={styles.redeemTitle}>Claim your special badge:</Text>
                  <Input
                    placeholder="Enter code"
                    value={redeemCode}
                    onChangeText={setRedeemCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    variant="default"
                    containerStyle={styles.redeemInputContainer}
                  />
                  <Button
                    title="Redeem your badge"
                    onPress={handleRedeemCode}
                    disabled={!redeemCode.trim() || redeemingBadge}
                    loading={redeemingBadge}
                    variant="primary"
                    fullWidth={true}
                    style={styles.redeemButton}
                  />
                  {filteredBadges.length > 0 && (
                    <View style={styles.availableBadgesContainer}>
                      <Text style={styles.availableBadgesTitle}>Available Event Badges:</Text>
                      <View style={styles.badgesGrid}>
                        {filteredBadges.map(renderBadgeCard)}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.badgesGrid}>
                  {filteredBadges.length > 0 ? (
                    filteredBadges.map(renderBadgeCard)
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        {badgeTab === 'claimed' 
                          ? 'No badges claimed yet' 
                          : 'No badges available'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
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
  // Primary Navigation Styles
  primaryNavWrapper: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  secondaryNavWrapper: {
    marginBottom: spacing.lg,
  },
  secondaryNavContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'flex-start',
    gap: spacing.lg,
  },
  secondaryNavTab: {
    position: 'relative',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryNavText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  secondaryNavTextActive: {
    color: colors.white,
  },
  secondaryNavIndicator: {
    position: 'absolute',
    bottom: -spacing.xs - 1,
    left: 0,
    right: 0,
    height: 2,
  },
  secondaryNavUnderline: {
    width: '100%',
    height: 1,
    backgroundColor: colors.white10,
    marginTop: spacing.xs,
  },
  // Badge Styles
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  emptyState: {
    width: '100%',
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
  },
  // Redeem Code Styles
  redeemContainer: {
    width: '100%',
  },
  redeemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  redeemInputContainer: {
    marginBottom: spacing.md,
  },
  redeemButton: {
    marginTop: 0,
  },
  availableBadgesContainer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  availableBadgesTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
});

export default HowToEarnPointsScreen;

