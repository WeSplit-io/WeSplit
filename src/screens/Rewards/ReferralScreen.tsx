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
  ActivityIndicator,
  Share,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [inviteReward, setInviteReward] = useState(0);
  const [friendSplitReward, setFriendSplitReward] = useState(0);

  useEffect(() => {
    const season = seasonService.getCurrentSeason();
    setCurrentSeason(season);
    
    // Get reward amounts
    const inviteRewardConfig = getSeasonReward('invite_friends_create_account', season, false);
    setInviteReward(calculateRewardPoints(inviteRewardConfig, 0));
    
    const friendSplitRewardConfig = getSeasonReward('friend_do_first_split_over_10', season, false);
    setFriendSplitReward(calculateRewardPoints(friendSplitRewardConfig, 0));
  }, []); // Only run once on mount

  useEffect(() => {
    const loadReferralCode = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const user = await firebaseDataService.user.getCurrentUser(currentUser.id);
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
      } catch (error) {
        logger.error('Failed to load referral code', error, 'ReferralScreen');
      } finally {
        setLoading(false);
      }
    };

    loadReferralCode();
  }, [currentUser?.id]);

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    
    try {
      await Clipboard.setString(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy referral code', error, 'ReferralScreen');
      Alert.alert('Error', 'Failed to copy referral code');
    }
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    if (!referralCode) return;
    
    try {
      const shareMessage = `Join WeSplit and earn points together! Use my referral code: ${referralCode}`;
      await Share.share({
        message: shareMessage,
        title: 'Invite to WeSplit',
      });
    } catch (error) {
      logger.error('Failed to share referral code', error, 'ReferralScreen');
    }
  }, [referralCode]);

  if (loading) {
    return (
      <Container>
        <Header
          title="Invite Friends"
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
        title="Invite Friends"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <PhosphorIcon name="Handshake" size={64} color={colors.green} weight="fill" />
          </View>
          <Text style={styles.heroTitle}>Earn Points Together</Text>
          <Text style={styles.heroSubtitle}>
            Invite your friends and climb the ranks together
          </Text>
        </View>

        {/* Referral Code Section */}
        <View style={styles.referralCodeSection}>
          <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
          <View style={styles.referralCodeContainer}>
            <Text style={styles.referralCodeText}>{referralCode}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
            >
              <PhosphorIcon name="Copy" size={20} color={colors.black} weight="regular" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rewards Info */}
        <View style={styles.rewardsSection}>
          <Text style={styles.rewardsTitle}>How It Works</Text>
          
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <PhosphorIcon name="UserPlus" size={24} color={colors.green} weight="fill" />
              <Text style={styles.rewardTitle}>Friend Creates Account</Text>
            </View>
            <Text style={styles.rewardDescription}>
              When your friend signs up using your referral code, you both earn points!
            </Text>
            <View style={styles.rewardPoints}>
              <Text style={styles.rewardPointsValue}>+{inviteReward} pts</Text>
              <Text style={styles.rewardPointsLabel}>for you</Text>
            </View>
          </View>

          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <PhosphorIcon name="Handshake" size={24} color={colors.green} weight="fill" />
              <Text style={styles.rewardTitle}>Friend Does First Split {'>'} $10</Text>
            </View>
            <Text style={styles.rewardDescription}>
              When your friend completes their first split over $10, you earn bonus points!
            </Text>
            <View style={styles.rewardPoints}>
              <Text style={styles.rewardPointsValue}>+{friendSplitReward} pts</Text>
              <Text style={styles.rewardPointsLabel}>for you</Text>
            </View>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            <PhosphorIcon name="Share" size={24} color={colors.black} weight="fill" />
            <Text style={styles.shareButtonText}>Share Referral Code</Text>
            <PhosphorIcon name="ArrowRight" size={20} color={colors.black} weight="regular" />
          </LinearGradient>
        </TouchableOpacity>
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
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
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
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  referralCodeText: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 2,
  },
  copyButton: {
    padding: spacing.xs,
  },
  rewardsSection: {
    marginBottom: spacing.xl,
  },
  rewardsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  rewardCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rewardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  rewardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  rewardPoints: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  rewardPointsValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  rewardPointsLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  shareButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
});

export default ReferralScreen;

