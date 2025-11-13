/**
 * Referral Screen
 * Allows users to invite friends and share referral code
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, LoadingScreen } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { referralService } from '../../services/rewards/referralService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { logger } from '../../services/analytics/loggingService';
import { getSeasonReward, calculateRewardPoints } from '../../services/rewards/seasonRewardsConfig';
import { seasonService } from '../../services/rewards/seasonService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const ReferralScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [inviteReward, setInviteReward] = useState(0);
  const [friendSplitReward, setFriendSplitReward] = useState(0);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    const season = seasonService.getCurrentSeason();
    
    // Get reward amounts
    const inviteRewardConfig = getSeasonReward('invite_friends_create_account', season, false);
    setInviteReward(calculateRewardPoints(inviteRewardConfig, 0));
    
    const friendSplitRewardConfig = getSeasonReward('friend_do_first_split_over_10', season, false);
    setFriendSplitReward(calculateRewardPoints(friendSplitRewardConfig, 0));
  }, []); // Only run once on mount

  useEffect(() => {
    const loadReferralData = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const user = await firebaseDataService.user.getCurrentUser(currentUser.id);
        const referrals = await referralService.getUserReferrals(currentUser.id);

        if (user.referral_code) {
          setReferralCode(user.referral_code);
        } else {
          // Generate referral code if not exists
          const code = referralService.generateReferralCode(currentUser.id);
          await firebaseDataService.user.updateUser(currentUser.id, {
            referral_code: code
          });
          setReferralCode(code);
        }

        setReferralCount(referrals.length);
      } catch (error) {
        logger.error('Failed to load referral code', { error }, 'ReferralScreen');
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [currentUser?.id]);

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    
    try {
      await Clipboard.setString(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy referral code', { error }, 'ReferralScreen');
      Alert.alert('Error', 'Failed to copy referral code');
    }
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    if (!referralCode) return;
    
    try {
      const shareMessage = `Join WeSplit and earn points together! Downlaod the app here: https://t.me/+v-e8orBns-llNThk and use my referral code: ${referralCode}`;
      await Share.share({
        message: shareMessage,
        title: 'Invite to WeSplit',
      });
    } catch (error) {
      logger.error('Failed to share referral code', { error }, 'ReferralScreen');
    }
  }, [referralCode]);

  const steps = useMemo(
    () => [
      {
        id: 'share',
        title: 'Share your referral code',
        description: 'Send your code to a friend so they can join through you.',
        icon: 'ShareNetwork' as const,
      },
      {
        id: 'join',
        title: 'They join WeSplit',
        description: 'When they sign up with your code, you earn points instantly.',
        icon: 'UserCircleCheck' as const,
        points: inviteReward,
      },
      {
        id: 'split',
        title: 'They complete their first real split',
        description: 'Once they make a split above $10, you unlock your big bonus.',
        icon: 'Lightning' as const,
        points: friendSplitReward,
      },
    ],
    [inviteReward, friendSplitReward]
  );

  if (loading) {
    return (
      <Container>
        <Header
          title="Refer a friend"
          showBackButton={true}
          onBackPress={() => rewardNav.goBack()}
          backgroundColor={colors.black}
        />
        <LoadingScreen
          message="Loading..."
          showSpinner={true}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Refer a friend"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your score</Text>
          <Text style={styles.scoreValue}>{referralCount}</Text>
          <Text style={styles.scoreCaption}>Referrals</Text>
        </View>

        {/* Referral Code Section */}
        <View style={styles.referralCodeSection}>
          <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.referralCodeCard}
          >
            <Text style={styles.referralCodeText}>{referralCode || '------'}</Text>
          </LinearGradient>

          <View style={styles.referralActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyCode}>
              <PhosphorIcon name="CopySimple" size={20} color={colors.textLight} weight="regular" />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <PhosphorIcon name="ShareNetwork" size={20} color={colors.textLight} weight="regular" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rewards Info */}
        <View style={styles.rewardsSection}>
          <Text style={styles.rewardsTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepIconColumn}>
                  {index !== 0 && <View style={styles.timelineConnectorTop} />}
                  <View style={styles.stepIconCircle}>
                    <PhosphorIcon
                      name={step.icon}
                      size={20}
                      color={colors.white}
                      weight="regular"
                    />
                  </View>
                  {index !== steps.length - 1 && <View style={styles.timelineConnectorBottom} />}
                </View>

                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>

                {step.points ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pointsBadge}
                  >
                    <Text style={styles.pointsBadgeText}>{`${step.points} pts`}</Text>
                  </LinearGradient>
                ) : null}
              </View>
            ))}
          </View>
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
    paddingTop: spacing.lg,
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
  scoreCard: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  scoreLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  scoreCaption: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
  },
  referralCodeSection: {
    marginBottom: spacing.xl,
  },
  referralCodeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLightSecondary,
    marginBottom: spacing.sm,
  },
  referralCodeCard: {
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCodeText: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    letterSpacing: 2,
  },
  referralActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  rewardsSection: {
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  rewardsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLightSecondary,

  },
  stepsContainer: {
    borderRadius: spacing.radiusLg,
    gap: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepIconColumn: {
    alignItems: 'center',
    width: 40,
    position: 'relative',
  },
  stepIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.blackWhite5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineConnectorTop: {
    position: 'absolute',
    top: -spacing.lg,
    left: 18,
    width: 2,
    height: spacing.lg + spacing.sm,
    backgroundColor: colors.blackWhite5,
  },
  timelineConnectorBottom: {
    position: 'absolute',
    top: 40,
    left: 18,
    width: 2,
    height: spacing.lg + spacing.sm,
    backgroundColor: colors.blackWhite5,
  },
  stepContent: {
    flex: 1,
    gap: spacing.xs,
  },
  stepTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  stepDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    lineHeight: 20,
  },
  pointsBadge: {
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  pointsBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.black,
  },
});

export default ReferralScreen;

