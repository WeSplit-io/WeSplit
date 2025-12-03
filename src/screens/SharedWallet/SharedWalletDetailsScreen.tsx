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
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Container, 
  Header, 
  ModernLoader, 
  Button, 
  ErrorScreen,
  PhosphorIcon,
  TabSecondary,
} from '../../components/shared';
import {
  TransactionHistory,
  MembersList,
  UnifiedTransaction,
} from '../../components/sharedWallet';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';

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
      // For now, we'll show empty transactions
      // In a real implementation, this would load from blockchain/API
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
          >
            <PhosphorIcon name="Gear" size={18} color={colors.white} weight="regular" />
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
          <LinearGradient
            colors={wallet.customColor ? [wallet.customColor, wallet.customColor + '80'] : [colors.green, colors.greenBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletIconContainer}>
              <PhosphorIcon
                name="Wallet"
                size={36}
                color={colors.white}
                weight="fill"
              />
            </View>
            <Text style={styles.walletBalanceText}>
              {formatBalance(wallet.totalBalance, wallet.currency)}
              </Text>
            <Text style={styles.walletBalanceLabel}>
              Total Balance
                </Text>
          </LinearGradient>
            </View>

        {/* Action Buttons - Withdraw and Top Up */}
        <View style={styles.actionButtonsContainer}>
          <Button
            title="Withdraw"
            onPress={() => {
              Alert.alert('Coming Soon', 'Withdrawal functionality will be available soon.');
            }}
            variant="secondary"
            size="medium"
            icon="ArrowUp"
            iconPosition="left"
            fullWidth={false}
            style={styles.actionButton}
          />
          <Button
            title="Top Up"
            onPress={() => {
              Alert.alert('Coming Soon', 'Top up functionality will be available soon.');
            }}
            variant="primary"
            size="medium"
            icon="Plus"
            iconPosition="left"
            fullWidth={false}
            style={styles.actionButton}
          />
        </View>

        {/* Tabs - Transactions and Members */}
        <View style={styles.tabsContainer}>
          <TabSecondary
            tabs={[
              { label: `Transactions (${transactions.length})`, value: 'transactions' },
              { label: `Members (${wallet.members?.length || 0})`, value: 'members' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabValue) => setActiveTab(tabValue as 'transactions' | 'members')}
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
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <PhosphorIcon name="Receipt" size={32} color={colors.white50} weight="regular" />
                <Text style={styles.emptyStateTitle}>No transactions yet</Text>
                <Text style={styles.emptyStateText}>
                  Transactions will appear here once members start using the shared wallet.
            </Text>
        </View>
            )}
            </View>
            )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {/* Add Member Button for Creator */}
            {isCreator && (
              <View style={styles.memberManagementContainer}>
                <Button
                  title="Add Member"
                  onPress={() => (navigation as any).navigate('SharedWalletMembers', {
                    walletId: wallet.id,
                    walletName: wallet.name,
                  })}
                  variant="secondary"
                  size="small"
                  icon="UserPlus"
                  iconPosition="left"
                  fullWidth={false}
                  style={styles.managementButton}
                />
                <Button
                  title="Manage Rights"
                  onPress={() => {
                    Alert.alert('Coming Soon', 'Member rights management will be available soon.');
                  }}
                  variant="secondary"
                  size="small"
                  icon="Shield"
                  iconPosition="left"
                  fullWidth={false}
                  style={styles.managementButton}
                />
                </View>
            )}

            <MembersList
              members={wallet.members}
              currency={wallet.currency}
              showParticipationCircle={true}
            />
                    </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.sm,
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
    marginBottom: spacing.lg,
  },
  walletCard: {
    borderRadius: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 180,
    overflow: 'hidden',
  },
  walletIconContainer: {
    marginBottom: spacing.sm,
  },
  walletBalanceText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
  },
  walletBalanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  tabsContainer: {
    marginBottom: spacing.md,
  },
  tabContent: {
    flex: 1,
  },
  memberManagementContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  managementButton: {
    flex: 1,
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
});

export default SharedWalletDetailsScreen;
