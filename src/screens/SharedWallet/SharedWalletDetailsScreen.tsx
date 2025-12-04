/**
 * Shared Wallet Details Screen
 * Clean wallet interface with balance display and tabbed content
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  Container, 
  Header, 
  ModernLoader, 
  ErrorScreen,
  PhosphorIcon,
  TabSecondary,
} from '../../components/shared';
import {
  TransactionHistory,
  MembersList,
  UnifiedTransaction,
  GoalProgress,
} from '../../components/sharedWallet';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import SharedWalletHeroCard from '../../components/SharedWalletHeroCard';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import CentralizedTransactionModal, { type TransactionModalConfig } from '../../components/shared/CentralizedTransactionModal';

const SharedWalletDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useApp();
  const { currentUser } = state;

  const { walletId, wallet: routeWallet } = (route.params as any) || {};
  
  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(!routeWallet);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'transactions' | 'members'>('transactions');

  // Handle back navigation
  const handleBack = useCallback(() => {
    (navigation as any).navigate('SplitsList', {
      activeTab: 'sharedWallets',
    });
  }, [navigation]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!wallet?.id) return;

    setIsLoadingTransactions(true);
    try {
      // TODO: Replace with real transactions fetch when backend is ready
      setTransactions([]);
    } catch (error) {
      logger.error('Error loading transactions', { error: String(error) }, 'SharedWalletDetailsScreen');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [wallet?.id]);

  // Load wallet data
  useEffect(() => {
    const loadWallet = async () => {
      if (routeWallet) {
        setWallet(routeWallet);
        setIsLoadingWallet(false);
        loadTransactions();
        return;
      }

      if (!walletId) {
        logger.error('No walletId provided', null, 'SharedWalletDetailsScreen');
        Alert.alert('Error', 'No wallet specified');
        handleBack();
        return;
      }

      try {
        logger.info('Loading shared wallet', walletId ? { walletId } : {}, 'SharedWalletDetailsScreen');
        const result = await SharedWalletService.getSharedWallet(walletId);

        if (result.success && result.wallet) {
          setWallet(result.wallet);
          loadTransactions();
        } else {
          Alert.alert('Error', result.error || 'Failed to load shared wallet');
          handleBack();
        }
      } catch (error) {
        logger.error('Error loading shared wallet', { error: String(error) }, 'SharedWalletDetailsScreen');
        Alert.alert('Error', 'Failed to load shared wallet');
        handleBack();
      } finally {
        setIsLoadingWallet(false);
      }
    };

    loadWallet();
  }, [walletId, routeWallet]);

  // Loading states
  if (isLoadingWallet) {
    return (
      <Container>
        <Header
          title="Shared Wallet"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ModernLoader size="large" text="Loading wallet..." />
        </View>
      </Container>
    );
  }

  if (!wallet) {
    return (
      <Container>
        <Header
          title="Shared Wallet"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <ErrorScreen
          title="Wallet Not Found"
          message="The shared wallet you're looking for doesn't exist or you don't have access to it."
          onRetry={handleBack}
          retryText="Go Back"
          showIcon={false}
        />
      </Container>
    );
  }

  const isCreator = wallet.creatorId === currentUser?.id?.toString();
  const goalAmount = wallet.settings?.goalAmount;
  const hasGoal = typeof goalAmount === 'number' && goalAmount > 0;
  const goalTargetAmount = goalAmount ?? 0;
  const goalCollectedAmount = wallet.totalBalance;
  const shouldShowGoalProgress = hasGoal;

  return (
    <Container>
      <Header
        title={wallet.name}
        onBackPress={handleBack}
        showBackButton={true}
        rightElement={
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('SharedWalletSettings', {
              walletId: wallet.id,
              wallet: wallet,
            })}
            activeOpacity={0.7}
            style={styles.headerIconButton}
          >
            <PhosphorIcon name="Gear" size={22} color={colors.white} weight="regular" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Display - Real Wallet Style */}
        <View style={styles.walletBalanceContainer}>
          <SharedWalletHeroCard wallet={wallet} />
        </View>

        {/* Action Buttons - Withdraw and Top Up */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.dashboardActionButton}
            activeOpacity={0.8}
            onPress={() => {
              if (!currentUser?.id) return;

              const modalConfig: TransactionModalConfig = {
                title: 'Withdraw from Shared Wallet',
                subtitle: 'Transfer funds from the shared wallet to your personal wallet',
                transactionType: 'shared_wallet_withdrawal',
                recipientInfo: {
                  name: 'Your Personal Wallet',
                  address: userWalletAddress || 'Your Wallet',
                  type: 'personal'
                },
                allowExternalDestinations: false,
                allowFriendDestinations: false,
                context: 'shared_wallet_withdrawal',
                prefilledAmount: wallet.totalBalance || 0,
                customRecipientInfo: {
                  name: 'Your Personal Wallet',
                  address: userWalletAddress || 'Your Wallet',
                  type: 'personal'
                },
                onSuccess: (result) => {
                  logger.info('Shared wallet withdrawal successful', { result });
                  setTransactionModalConfig(null);
                  // Refresh wallet data
                  loadTransactions();
                  // Reload wallet data by triggering a re-render
                  setWallet(prev => prev ? {...prev} : prev);
                },
                onError: (error) => {
                  logger.error('Shared wallet withdrawal failed', { error });
                  Alert.alert('Withdrawal Failed', error);
                  setTransactionModalConfig(null);
                },
                onClose: () => {
                  setTransactionModalConfig(null);
                }
              };

              setTransactionModalConfig(modalConfig);
            }}
          >
            <PhosphorIcon name="ArrowLineUp" size={22} color={colors.white} weight="bold" />
            <Text style={styles.dashboardActionButtonLabel}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dashboardActionButton}
            activeOpacity={0.8}
            onPress={() => {
              if (!currentUser?.id) return;

              const modalConfig: TransactionModalConfig = {
                title: 'Top Up Shared Wallet',
                subtitle: 'Add funds to the shared wallet from your personal wallet',
                transactionType: 'shared_wallet_funding',
                recipientInfo: {
                  name: wallet.name || 'Shared Wallet',
                  address: wallet.id,
                  type: 'shared_wallet'
                },
                allowExternalDestinations: false,
                allowFriendDestinations: false,
                context: 'shared_wallet_funding',
                customRecipientInfo: {
                  name: wallet.name || 'Shared Wallet',
                  address: wallet.id,
                  type: 'shared_wallet'
                },
                onSuccess: (result) => {
                  logger.info('Shared wallet funding successful', { result });
                  setTransactionModalConfig(null);
                  // Refresh wallet data
                  loadTransactions();
                  // Reload wallet data by triggering a re-render
                  setWallet(prev => prev ? {...prev} : prev);
                },
                onError: (error) => {
                  logger.error('Shared wallet funding failed', { error });
                  Alert.alert('Top Up Failed', error);
                  setTransactionModalConfig(null);
                },
                onClose: () => {
                  setTransactionModalConfig(null);
                }
              };

              setTransactionModalConfig(modalConfig);
            }}
          >
            <PhosphorIcon name="ArrowLineDown" size={22} color={colors.white} weight="bold" />
            <Text style={styles.dashboardActionButtonLabel}>Top Up</Text>
          </TouchableOpacity>
        </View>

        {shouldShowGoalProgress ? (
          <GoalProgress
            targetAmount={goalTargetAmount}
            currentAmount={goalCollectedAmount}
            currency={wallet.currency}
            color={wallet.customColor}
          />
        ) : null}

        {/* Tabs - Transactions and Members */}
        <View style={styles.tabsContainer}>
          <TabSecondary
            tabs={[
              { label: `Transactions (${transactions.length})`, value: 'transactions' },
              { label: `Members (${wallet.members?.length || 0})`, value: 'members' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabValue) => setActiveTab(tabValue as 'transactions' | 'members')}
            fullWidthTabs
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'transactions' && (
          <View style={styles.tabContent}>
            {isLoadingTransactions ? (
              <View style={styles.loadingContainer}>
                <ModernLoader size="medium" text="Loading transactions..." />
              </View>
            ) : transactions.length > 0 ? (
              <TransactionHistory
                transactions={transactions}
                isLoading={isLoadingTransactions}
                variant="sharedWallet"
                hideChrome
              />
            ) : (
              <View style={styles.emptyTransactions}>
                <View style={styles.emptyTransactionsIcon}>
                  <PhosphorIcon name="Receipt" size={24} color={colors.white70} weight="regular" />
                </View>
                <Text style={styles.emptyTransactionsTitle}>No transactions yet</Text>
              </View>
            )}
            </View>
            )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {/* Add Member Button for Creator */}
            {isCreator && (
              <View style={styles.memberManagementContainer}>
                <TouchableOpacity
                  style={styles.manageRightsButton}
                  onPress={() => {
                    Alert.alert('Coming Soon', 'Member rights management will be available soon.');
                  }}
                  activeOpacity={0.8}
                >
                  <PhosphorIcon name="SlidersHorizontal" size={18} color={colors.white} weight="bold" />
                  <Text style={styles.manageRightsLabel}>Manage rights</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMemberButton}
                  onPress={() => (navigation as any).navigate('SharedWalletMembers', {
                    walletId: wallet.id,
                    walletName: wallet.name,
                  })}
                  activeOpacity={0.8}
                >
                  <PhosphorIcon name="Plus" size={18} color={colors.white} weight="bold" />
                  <Text style={styles.addMemberLabel}>Add</Text>
                </TouchableOpacity>
                </View>
            )}

            <MembersList
              members={wallet.members}
              currentUserId={currentUser?.id?.toString()}
            />
                    </View>
        )}
      </ScrollView>

      {/* Centralized Transaction Modal */}
      {transactionModalConfig && (
        <CentralizedTransactionModal
          visible={!!transactionModalConfig}
          config={transactionModalConfig}
          sharedWalletId={wallet.id}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  walletBalanceContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dashboardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderTopColor: colors.white10,
    borderLeftColor: colors.white10,
    borderRightColor: 'rgba(10, 138, 90, 0.15)',
    borderBottomColor: 'rgba(10, 138, 90, 0.15)',
  },
  dashboardActionButtonLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
  tabsContainer: {
    marginBottom: spacing.md,
  },
  tabContent: {
    flex: 1,
  },
  memberManagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  managementPillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  addMemberLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTransactionsIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTransactionsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
  },
  manageRightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  manageRightsLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginTop: spacing.sm,
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.4,
  },
  headerIconButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SharedWalletDetailsScreen;
