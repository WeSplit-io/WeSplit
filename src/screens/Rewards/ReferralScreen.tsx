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
  Modal,
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
import { generateReferralLink } from '../../services/core/deepLinkHandler';
import QrCodeView from '../../services/core/QrCodeView';

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
  const [showQRModal, setShowQRModal] = useState(false);

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
        // Use centralized method to ensure user has a referral code
        // This will generate and store the code if it doesn't exist
        const code = await referralService.ensureUserHasReferralCode(currentUser.id);
        setReferralCode(code);
        logger.info('Referral code loaded/ensured', { 
          userId: currentUser.id, 
          referralCode: code 
        }, 'ReferralScreen');
        
        // Use counter field from user document (faster than querying all referrals)
        // Fallback to querying if counter is not available (for backward compatibility)
        if (currentUser.referral_count !== undefined) {
          setReferralCount(currentUser.referral_count);
        } else {
          // Fallback: query referrals if counter not available
          const referrals = await referralService.getUserReferrals(currentUser.id, currentUser.id);
          setReferralCount(referrals.length);
          
          // Update user document with count for future use
          try {
            await firebaseDataService.user.updateUser(currentUser.id, {
              referral_count: referrals.length
            });
          } catch (updateError) {
            logger.warn('Failed to update referral count (non-critical)', { error: updateError }, 'ReferralScreen');
          }
        }
      } catch (error) {
        logger.error('Failed to load referral code', error, 'ReferralScreen');
        // Show error but don't block the screen
        Alert.alert(
          'Error',
          'Failed to load referral code. Please try again later.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    };

    loadReferralData();
  }, [currentUser?.id, currentUser?.referral_count]);

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
      const referralLink = generateReferralLink(referralCode);
      const shareMessage = [
        'Join WeSplit and earn points together!',
        '1) Download the app: https://t.me/+v-e8orBns-llNThk',
        `2) Open this link on your phone to apply my referral: ${referralLink}`,
        '',
        `Fallback: you can also manually enter my referral code: ${referralCode}`
      ].join('\n');
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
              <PhosphorIcon name="CopySimple" size={20} color={colors.white} weight="regular" />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <PhosphorIcon name="ShareNetwork" size={20} color={colors.white} weight="regular" />
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

      {/* Referral QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Referral QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.qrModalCloseButton}
              >
                <PhosphorIcon name="X" size={24} color={colors.white} weight="bold" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.qrModalDescription}>
              Scan this QR code to apply the referral automatically
            </Text>

            {referralCode && (
              <View style={styles.qrCodeContainer}>
                <QrCodeView
                  value={generateReferralLink(referralCode)}
                  size={250}
                  backgroundColor={colors.white}
                  color={colors.black}
                  showButtons={true}
                  showCopyButton={true}
                  showShareButton={true}
                  copyButtonText="Copy Link"
                  shareButtonText="Share Link"
                  onCopy={(text) => {
                    Alert.alert('Copied!', 'Referral link copied to clipboard');
                  }}
                  onShare={(text) => {
                    handleShare();
                    setShowQRModal(false);
                  }}
                />
              </View>
            )}

            <View style={styles.qrModalFooter}>
              <Text style={styles.qrModalCodeText}>Code: {referralCode}</Text>
            </View>
          </View>
        </View>
      </Modal>
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
    color: colors.white,
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
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  scoreCaption: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginTop: spacing.xs,
  },
  referralCodeSection: {
    marginBottom: spacing.xl,
  },
  referralCodeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
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
    color: colors.white,
  },
  rewardsSection: {
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  rewardsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,

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
    color: colors.white,
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: colors.blackWhite5,
    borderRadius: spacing.radiusLg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  qrModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  qrModalCloseButton: {
    padding: spacing.xs,
  },
  qrModalDescription: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  qrCodeContainer: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  qrModalFooter: {
    width: '100%',
    alignItems: 'center',
  },
  qrModalCodeText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    letterSpacing: 2,
  },
});

export default ReferralScreen;

