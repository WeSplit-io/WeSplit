/**
 * Shared Wallet Creation Screen
 * Final step in shared wallet creation - actually creates the wallet
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Container,
  Button,
  Header,
  Avatar,
  ModernLoader,
  PhosphorIcon,
} from '../../components/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService } from '../../services/sharedWallet';
import { logger } from '../../services/analytics/loggingService';

interface SharedWalletCreationScreenProps {
  navigation: any;
  route: any;
}

const SharedWalletCreationScreen: React.FC<SharedWalletCreationScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    walletName,
    walletDescription,
    initialMembers,
    creatorId,
    creatorName,
    creatorWalletAddress,
  } = route.params || {};

  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'validating' | 'creating' | 'encrypting' | 'complete'>('validating');

  const creationSteps = [
    { key: 'validating', label: 'Validating data...', icon: 'CheckCircle' },
    { key: 'creating', label: 'Creating wallet...', icon: 'Wallet' },
    { key: 'encrypting', label: 'Securing private keys...', icon: 'Lock' },
    { key: 'complete', label: 'Wallet created!', icon: 'CheckCircle' },
  ];

  const handleCreateWallet = useCallback(async () => {
    setIsCreating(true);

    try {
      setCreationStep('validating');
      logger.info('Starting shared wallet creation', {
        name: walletName,
        creatorId,
        membersCount: initialMembers?.length || 0
      }, 'SharedWalletCreationScreen');

      setCreationStep('creating');
      const result = await SharedWalletService.createSharedWallet({
        name: walletName,
        description: walletDescription,
        creatorId,
        creatorName,
        creatorWalletAddress,
        initialMembers,
        currency: 'USDC',
        settings: {
          allowMemberInvites: true,
          requireApprovalForWithdrawals: false,
        },
      });

      if (result.success && result.wallet) {
        setCreationStep('encrypting');
        // Small delay to show the encryption step
        await new Promise(resolve => setTimeout(resolve, 1000));

        setCreationStep('complete');
        logger.info('Shared wallet created successfully', {
          walletId: result.wallet.id,
          name: result.wallet.name
        }, 'SharedWalletCreationScreen');

        // Navigate to wallet details after a short delay
        setTimeout(() => {
          navigation.replace('SharedWalletDetails', {
            walletId: result.wallet!.id,
            wallet: result.wallet,
            newlyCreated: true,
          });
        }, 1500);

      } else {
        logger.error('Failed to create shared wallet', {
          error: result.error
        }, 'SharedWalletCreationScreen');

        Alert.alert('Error', result.error || 'Failed to create shared wallet');
        setIsCreating(false);
      }
    } catch (error) {
      logger.error('Error creating shared wallet', error, 'SharedWalletCreationScreen');
      Alert.alert('Error', 'An unexpected error occurred');
      setIsCreating(false);
    }
  }, [walletName, walletDescription, initialMembers, creatorId, creatorName, creatorWalletAddress, navigation]);

  // Auto-start creation when component mounts
  useEffect(() => {
    if (!isCreating) {
      handleCreateWallet();
    }
  }, []); // Only run once on mount

  const getCurrentStepIndex = () => {
    return creationSteps.findIndex(step => step.key === creationStep);
  };

  return (
    <Container>
      <Header
        title="Creating Wallet"
        subtitle="Please wait while we set up your shared wallet"
        showBackButton={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <View style={styles.stepIndicators}>
            <View style={[styles.stepIndicator, styles.stepCompleted]}>
              <PhosphorIcon name="Check" size={16} color={colors.white} weight="bold" />
            </View>
            <View style={[styles.stepIndicator, styles.stepCompleted]}>
              <PhosphorIcon name="Check" size={16} color={colors.white} weight="bold" />
            </View>
            <View style={[styles.stepIndicator, styles.stepActive]}>
              <Text style={[styles.stepText, styles.stepTextActive]}>3</Text>
            </View>
          </View>
        </View>

        {/* Wallet Preview */}
        <View style={styles.walletPreview}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIcon}>
              <PhosphorIcon name="Wallet" size={24} color={colors.green} />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletName}>{walletName}</Text>
              {walletDescription && (
                <Text style={styles.walletDescription}>{walletDescription}</Text>
              )}
            </View>
          </View>

          <View style={styles.membersPreview}>
            <Text style={styles.membersTitle}>Members ({initialMembers?.length || 0})</Text>
            <View style={styles.membersList}>
              {initialMembers?.slice(0, 3).map((member: any, index: number) => (
                <Avatar
                  key={member.userId}
                  userId={member.userId}
                  userName={member.name}
                  size={28}
                  style={[
                    styles.memberAvatar,
                    { marginLeft: index > 0 ? -spacing.sm : 0 }
                  ]}
                />
              ))}
              {(initialMembers?.length || 0) > 3 && (
                <View style={[styles.memberAvatar, styles.extraMembers]}>
                  <Text style={styles.extraMembersText}>
                    +{(initialMembers?.length || 0) - 3}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Creation Progress */}
        <View style={styles.creationContainer}>
          <Text style={styles.creationTitle}>Creating your shared wallet...</Text>

          <View style={styles.stepsList}>
            {creationSteps.map((step, index) => {
              const isCompleted = index < getCurrentStepIndex();
              const isCurrent = index === getCurrentStepIndex();
              const isPending = index > getCurrentStepIndex();

              return (
                <View key={step.key} style={styles.stepItem}>
                  <View style={[
                    styles.stepIcon,
                    isCompleted && styles.stepIconCompleted,
                    isCurrent && styles.stepIconCurrent,
                    isPending && styles.stepIconPending,
                  ]}>
                    {isCompleted ? (
                      <PhosphorIcon name="Check" size={16} color={colors.white} weight="bold" />
                    ) : isCurrent ? (
                      <ModernLoader size="small" color={colors.white} />
                    ) : (
                      <PhosphorIcon name={step.icon as any} size={16} color={colors.white70} />
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isCurrent && styles.stepLabelCurrent,
                    isPending && styles.stepLabelPending,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {creationStep === 'complete' && (
            <View style={styles.successMessage}>
              <PhosphorIcon name="CheckCircle" size={48} color={colors.green} weight="fill" />
              <Text style={styles.successTitle}>Wallet Created Successfully!</Text>
              <Text style={styles.successText}>
                Your shared wallet is ready. Redirecting to wallet details...
              </Text>
            </View>
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
  scrollViewContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.white10,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white20,
  },
  stepCompleted: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  stepActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  stepText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
  },
  stepTextActive: {
    color: colors.white,
  },
  walletPreview: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.sm,
    backgroundColor: colors.greenBlue20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  walletDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  membersPreview: {
    gap: spacing.sm,
  },
  membersTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  membersList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white10,
    borderWidth: 2,
    borderColor: colors.white5,
  },
  extraMembers: {
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraMembersText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  creationContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  creationTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
  stepsList: {
    width: '100%',
    gap: spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconCompleted: {
    backgroundColor: colors.green,
  },
  stepIconCurrent: {
    backgroundColor: colors.green,
  },
  stepIconPending: {
    backgroundColor: colors.white10,
  },
  stepLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    flex: 1,
  },
  stepLabelCompleted: {
    color: colors.white,
  },
  stepLabelCurrent: {
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  stepLabelPending: {
    color: colors.white50,
  },
  successMessage: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  successTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
    textAlign: 'center',
  },
  successText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
});

export default SharedWalletCreationScreen;
