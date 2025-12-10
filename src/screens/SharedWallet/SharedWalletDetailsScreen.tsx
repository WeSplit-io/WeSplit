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
import { db } from '../../config/firebase/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';

const SharedWalletDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useApp();
  const { currentUser } = state;

  const { walletId, sharedWalletId, wallet: routeWallet } = (route.params as any) || {};
  const effectiveWalletId = walletId || sharedWalletId;
  
  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(!routeWallet);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  
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
      const { SharedWalletService } = await import('../../services/sharedWallet');
      const result = await SharedWalletService.getSharedWalletTransactions(wallet.id, 50);

      if (result.success && result.transactions) {
        // Transform transactions to match the UnifiedTransaction interface
        const unifiedTransactions = result.transactions.map((tx: any) => ({
          id: tx.id,
          firebaseDocId: tx.firebaseDocId,
          type: tx.type as 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund',
          amount: tx.amount,
          currency: tx.currency || 'USDC',
          userName: tx.userName,
          memo: tx.memo,
          status: tx.status as 'confirmed' | 'pending' | 'failed' | 'completed',
          createdAt: tx.createdAt,
          transactionSignature: tx.transactionSignature,
          sharedWalletId: tx.sharedWalletId,
          // Additional fields for shared wallet context
          userId: tx.userId,
          // For withdrawal transactions, mark as external if destination is different from wallet
          isExternalWallet: tx.type === 'withdrawal' && tx.destination ? true : false,
        }));

        setTransactions(unifiedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      logger.error('Error loading transactions', { error: String(error) }, 'SharedWalletDetailsScreen');
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [wallet?.id]);

  // Set up real-time listener for wallet updates
  useEffect(() => {
    if (!wallet?.firebaseDocId) return;

    logger.info('Setting up real-time listener for shared wallet', {
      walletId: wallet.id,
      firebaseDocId: wallet.firebaseDocId
    }, 'SharedWalletDetailsScreen');

    const walletRef = doc(db, 'sharedWallets', wallet.firebaseDocId);
    const unsubscribe = onSnapshot(walletRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedWallet = {
          ...docSnapshot.data(),
          firebaseDocId: docSnapshot.id,
        } as SharedWallet;

        logger.info('Real-time wallet update received', {
          walletId: wallet.id,
          oldBalance: wallet.totalBalance,
          newBalance: updatedWallet.totalBalance,
          balanceDifference: updatedWallet.totalBalance - wallet.totalBalance,
          memberCount: updatedWallet.members?.length,
          updatedAt: updatedWallet.updatedAt
        }, 'SharedWalletDetailsScreen');

        setWallet(updatedWallet);
      }
    }, (error) => {
      logger.error('Real-time listener error for shared wallet', {
        walletId: wallet.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'SharedWalletDetailsScreen');
    });

    return () => {
      logger.info('Cleaning up real-time listener for shared wallet', {
        walletId: wallet.id
      }, 'SharedWalletDetailsScreen');
      unsubscribe();
    };
  }, [wallet?.firebaseDocId, wallet?.id]);

  // Set up real-time listener for transactions
  useEffect(() => {
    if (!wallet?.id) return;

    logger.info('Setting up real-time listener for shared wallet transactions', {
      walletId: wallet.id
    }, 'SharedWalletDetailsScreen');

    const transactionsRef = collection(db, 'sharedWalletTransactions');
    const q = query(
      transactionsRef,
      where('sharedWalletId', '==', wallet.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const updatedTransactions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          firebaseDocId: doc.id,
          type: data.type as 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund',
          amount: data.amount,
          currency: data.currency || 'USDC',
          userName: data.userName,
          memo: data.memo,
          status: data.status as 'confirmed' | 'pending' | 'failed' | 'completed',
          createdAt: data.createdAt,
          transactionSignature: data.transactionSignature,
          sharedWalletId: data.sharedWalletId,
          userId: data.userId,
          isExternalWallet: data.type === 'withdrawal' && data.destination ? true : false,
        } as UnifiedTransaction;
      });

      logger.debug('Real-time transactions update received', {
        walletId: wallet.id,
        transactionCount: updatedTransactions.length
      }, 'SharedWalletDetailsScreen');

      setTransactions(updatedTransactions);
    }, (error) => {
      logger.error('Real-time listener error for shared wallet transactions', {
        walletId: wallet.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'SharedWalletDetailsScreen');
    });

    return () => {
      logger.info('Cleaning up real-time listener for shared wallet transactions', {
        walletId: wallet.id
      }, 'SharedWalletDetailsScreen');
      unsubscribe();
    };
  }, [wallet?.id]);

  // Load wallet data with on-chain balance verification
  const loadWalletData = useCallback(async (walletId: string) => {
    try {
      const { SharedWalletService } = await import('../../services/sharedWallet');
      const result = await SharedWalletService.getSharedWallet(walletId);

      if (result.success && result.wallet) {
        let updatedWallet = result.wallet;

        // Fetch on-chain balance for verification
        try {
          const onChainResult = await SharedWalletService.getSharedWalletOnChainBalance(walletId);

          if (onChainResult.success) {
            logger.info('On-chain balance check for shared wallet', {
              walletId,
              databaseBalance: updatedWallet.totalBalance,
              onChainBalance: onChainResult.balance,
              accountExists: onChainResult.accountExists,
              difference: updatedWallet.totalBalance - (onChainResult.balance || 0)
            }, 'SharedWalletDetailsScreen');

            // If there's a significant difference, log it for monitoring
            const difference = Math.abs(updatedWallet.totalBalance - (onChainResult.balance || 0));
            if (difference > 0.01) { // More than 1 cent difference
              logger.warn('Balance discrepancy detected', {
                walletId,
                databaseBalance: updatedWallet.totalBalance,
                onChainBalance: onChainResult.balance,
                difference
              }, 'SharedWalletDetailsScreen');
            }
          } else {
            logger.error('Failed to fetch on-chain balance', {
              walletId,
              error: onChainResult.error
            }, 'SharedWalletDetailsScreen');
          }
        } catch (balanceError) {
          logger.error('Failed to fetch on-chain balance', {
            walletId,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'SharedWalletDetailsScreen');
        }

        setWallet(updatedWallet);
        return updatedWallet;
      } else {
        logger.error('Failed to load wallet data', { walletId, error: result.error }, 'SharedWalletDetailsScreen');
        return null;
      }
    } catch (error) {
      logger.error('Error loading wallet data', {
        walletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SharedWalletDetailsScreen');
      return null;
    }
  }, []);

  // Load wallet data
  useEffect(() => {
    const loadWallet = async () => {
      if (routeWallet) {
        setWallet(routeWallet);
        setIsLoadingWallet(false);
        loadTransactions();
        return;
      }

      if (!effectiveWalletId) {
        logger.error('No walletId provided', null, 'SharedWalletDetailsScreen');
        Alert.alert('Error', 'No wallet specified');
        handleBack();
        return;
      }

      try {
        logger.info('Loading shared wallet', effectiveWalletId ? { walletId: effectiveWalletId } : {}, 'SharedWalletDetailsScreen');
        const result = await SharedWalletService.getSharedWallet(effectiveWalletId);

        if (result.success && result.wallet) {
          setWallet(result.wallet);
          loadTransactions();

          // Get user's wallet address for withdrawal transactions
          if (currentUser?.id) {
            try {
              const { consolidatedTransactionService } = await import('../../services/blockchain/transaction');
              const userWalletAddress = await consolidatedTransactionService.getUserWalletAddress(currentUser.id);
              setUserWalletAddress(userWalletAddress || '');
            } catch (error) {
              logger.warn('Failed to get user wallet address', { error }, 'SharedWalletDetailsScreen');
            }
          }
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
  }, [effectiveWalletId, routeWallet, currentUser?.id]);

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
                showAmountInput: true,
                showMemoInput: true,
                showQuickAmounts: false,
                allowExternalDestinations: false,
                allowFriendDestinations: false,
                context: 'shared_wallet_withdrawal',
                // Pass shared wallet ID in config for consistency (will also be passed as props)
                sharedWalletId: wallet.id,
                prefilledAmount: (() => {
                  const currentUserMember = wallet.members?.find(m => m.userId === currentUser?.id);
                  if (currentUserMember) {
                    const availableBalance = (currentUserMember.totalContributed || 0) - (currentUserMember.totalWithdrawn || 0);
                    return Math.max(0, availableBalance);
                  }
                  return 0;
                })(),
                customRecipientInfo: {
                  name: 'Your Personal Wallet',
                  address: userWalletAddress || '',
                  type: 'wallet'
                },
                onSuccess: async (result) => {
                  logger.info('Shared wallet withdrawal successful', { result });
                  setIsProcessingTransaction(true);
                  try {
                    // Reload wallet data from database with on-chain verification
                    await loadWalletData(wallet.id);
                    // Refresh transactions
                    await loadTransactions();
                  } catch (error) {
                    logger.error('Error refreshing wallet data after withdrawal', { error }, 'SharedWalletDetailsScreen');
                  } finally {
                    setIsProcessingTransaction(false);
                    setTransactionModalConfig(null);
                  }
                },
                onError: (error) => {
                  logger.error('Shared wallet withdrawal failed', { error });
                  Alert.alert('Withdrawal Failed', error);
                  setTransactionModalConfig(null);
                  setIsProcessingTransaction(false);
                },
                onClose: () => {
                  setTransactionModalConfig(null);
                  setIsProcessingTransaction(false);
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
                showAmountInput: true,
                showMemoInput: true,
                showQuickAmounts: true,
                allowExternalDestinations: false,
                allowFriendDestinations: false,
                context: 'shared_wallet_funding',
                customRecipientInfo: {
                  name: wallet.name || 'Shared Wallet',
                  address: wallet.id,
                  type: 'shared_wallet'
                },
                onSuccess: async (result) => {
                  logger.info('Shared wallet funding successful - starting UI refresh', {
                    result,
                    walletId: wallet.id,
                    currentBalance: wallet.totalBalance
                  }, 'SharedWalletDetailsScreen');

                  setIsProcessingTransaction(true);
                  try {
                    // Reload wallet data from database with on-chain verification
                    const updatedWallet = await loadWalletData(wallet.id);
                    logger.info('Wallet data reloaded after funding', {
                      walletId: wallet.id,
                      oldBalance: wallet.totalBalance,
                      newBalance: updatedWallet?.totalBalance
                    }, 'SharedWalletDetailsScreen');

                    // Refresh transactions
                    await loadTransactions();
                    logger.info('Transactions refreshed after funding', {
                      walletId: wallet.id
                    }, 'SharedWalletDetailsScreen');
                  } catch (error) {
                    logger.error('Error refreshing wallet data after funding', {
                      error: error instanceof Error ? error.message : String(error),
                      walletId: wallet.id
                    }, 'SharedWalletDetailsScreen');
                  } finally {
                    setIsProcessingTransaction(false);
                    setTransactionModalConfig(null);
                    logger.info('Funding UI refresh completed', { walletId: wallet.id }, 'SharedWalletDetailsScreen');
                  }
                },
                onError: (error) => {
                  logger.error('Shared wallet funding failed', { error });
                  Alert.alert('Top Up Failed', error);
                  setTransactionModalConfig(null);
                  setIsProcessingTransaction(false);
                },
                onClose: () => {
                  setTransactionModalConfig(null);
                  setIsProcessingTransaction(false);
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
                    (navigation as any).navigate('MemberRights', {
                      walletId: wallet.id,
                      wallet: wallet,
                    });
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
              walletId={wallet.id}
              onMemberUpdate={() => {
                // Reload wallet data when member status changes
                loadWalletData(wallet.id);
              }}
            />
                    </View>
        )}
      </ScrollView>

      {/* Transaction Processing Loading Overlay */}
      {isProcessingTransaction && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ModernLoader size="large" text="Processing transaction..." />
          </View>
        </View>
      )}

      {/* Centralized Transaction Modal */}
      {transactionModalConfig && (
        <CentralizedTransactionModal
          visible={!!transactionModalConfig}
          config={transactionModalConfig}
          sharedWalletId={wallet.id}
          currentUser={currentUser}
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
  processingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContainer: {
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
});

export default SharedWalletDetailsScreen;
