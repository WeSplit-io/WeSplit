/**
 * Points History Screen
 * Displays all point transactions for the user
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { pointsService } from '../../services/rewards/pointsService';
import { PointsTransaction } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const PointsHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const rewardNav = useMemo(() => new RewardNavigationHelper(navigation), [navigation]);
  const { state } = useApp();
  const { currentUser } = state;
  
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      const history = await pointsService.getPointsHistory(currentUser.id, 100);
      setTransactions(history);
    } catch (error) {
      logger.error('Failed to load points history', error, 'PointsHistoryScreen');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  // Memoized icon map to prevent recreation
  const iconMap = useMemo(() => ({
    'transaction_reward': 'CurrencyCircleDollar',
    'quest_completion': 'Star',
    'season_reward': 'Trophy',
    'referral_reward': 'Handshake',
    'admin_adjustment': 'Gear',
  }), []);

  const getTransactionIcon = useCallback((source: PointsTransaction['source']) => {
    return iconMap[source] || 'Circle';
  }, [iconMap]);

  // Memoized title map to prevent recreation
  const titleMap = useMemo(() => ({
    'transaction_reward': 'Transaction Reward',
    'quest_completion': 'Quest Completed',
    'season_reward': 'Season Reward',
    'referral_reward': 'Referral Reward',
    'admin_adjustment': 'Admin Adjustment',
  }), []);

  const getTransactionTitle = useCallback((transaction: PointsTransaction) => {
    if (transaction.description) {
      return transaction.description;
    }
    return titleMap[transaction.source] || 'Points Awarded';
  }, [titleMap]);

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  }, []);

  const formatTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  }, []);

  const renderTransaction = (transaction: PointsTransaction, index: number) => {
    const iconName = getTransactionIcon(transaction.source);
    const title = getTransactionTitle(transaction);
    const date = formatDate(transaction.created_at);
    const time = formatTime(transaction.created_at);

    return (
      <View key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <PhosphorIcon name={iconName} size={24} color={colors.green} weight="regular" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.transactionDate}>
            {date} {time && `- ${time}`}
          </Text>
          {transaction.season && (
            <Text style={styles.transactionSeason}>
              Season {transaction.season}
            </Text>
          )}
        </View>
        <View style={styles.transactionPoints}>
          <Text style={styles.transactionPointsValue}>
            +{transaction.amount}
          </Text>
          <Text style={styles.transactionPointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <Container>
        <Header
          title="Points History"
          showBackButton={true}
          onBackPress={() => rewardNav.goBack()}
          backgroundColor={colors.black}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Points History"
        showBackButton={true}
        onBackPress={() => rewardNav.goBack()}
        backgroundColor={colors.black}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
          />
        }
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PhosphorIcon name="Receipt" size={48} color={colors.textLightSecondary} />
            <Text style={styles.emptyText}>No points history yet</Text>
            <Text style={styles.emptySubtext}>
              Start earning points by completing quests and making transactions!
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((transaction, index) => renderTransaction(transaction, index))}
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
  transactionsList: {
    gap: spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
  },
  transactionSeason: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    marginTop: spacing.xs / 2,
  },
  transactionPoints: {
    alignItems: 'flex-end',
  },
  transactionPointsValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  transactionPointsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default PointsHistoryScreen;

