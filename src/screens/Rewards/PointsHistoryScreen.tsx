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
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';
import { Container, Header, LoadingScreen } from '../../components/shared';
import PhosphorIcon, { PhosphorIconName } from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { pointsService } from '../../services/rewards/pointsService';
import { PointsTransaction } from '../../types/rewards';
import { logger } from '../../services/analytics/loggingService';
import { RewardNavigationHelper } from '../../utils/core/navigationUtils';

const PointsHistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
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
      logger.error('Failed to load points history', { error }, 'PointsHistoryScreen');
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
  const iconMap = useMemo<Record<PointsTransaction['source'], PhosphorIconName>>(() => ({
    transaction_reward: 'CurrencyCircleDollar',
    quest_completion: 'Star',
    season_reward: 'Trophy',
    referral_reward: 'Handshake',
    admin_adjustment: 'Gear',
  }), []);

  const getTransactionIcon = useCallback((source: PointsTransaction['source']) => {
    return iconMap[source];
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
      
      // Check if date is invalid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // Normalize dates to start of day for comparison
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const nowStart = new Date(now);
      nowStart.setHours(0, 0, 0, 0);
      
      // Calculate difference in days
      const diffTime = nowStart.getTime() - dateStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays > 1 && diffDays < 7) {
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

  const getMonthLabel = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
      });
    } catch {
      return '';
    }
  }, []);

  const groupedTransactions = useMemo(() => {
    if (transactions.length === 0) {
      return [];
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const groups: { month: string; items: PointsTransaction[] }[] = [];
    const monthGroups = new Map<string, { month: string; items: PointsTransaction[] }>();

    sortedTransactions.forEach((transaction) => {
      const month = getMonthLabel(transaction.created_at) || 'Unknown';
      const existingGroup = monthGroups.get(month);

      if (existingGroup) {
        existingGroup.items.push(transaction);
      } else {
        const newGroup = {
          month,
          items: [transaction],
        };
        monthGroups.set(month, newGroup);
        groups.push(newGroup);
      }
    });

    return groups;
  }, [transactions, getMonthLabel]);

  const renderTransaction = (transaction: PointsTransaction) => {
    const iconName = getTransactionIcon(transaction.source);
    const title = getTransactionTitle(transaction);
    const date = formatDate(transaction.created_at);
    const time = formatTime(transaction.created_at);

    return (
      <View key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          <PhosphorIcon name={iconName} size={18} color={colors.white} weight="regular" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.transactionDate}>
            {date} {time && `- ${time}`}
          </Text>
          {/*{transaction.season && (
            <Text style={styles.transactionSeason}>
              Season {transaction.season}
            </Text>
          )}*/}
        </View>
        <View style={styles.transactionPoints}>
          <Text style={styles.transactionPointsValue}>
            +{transaction.amount}
          </Text>
          <Text style={styles.transactionPointsLabel}>Split Points</Text>
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
          rightElement={
            <TouchableOpacity
              onPress={() => rewardNav.goToHowItWorks()}
              activeOpacity={0.7}
            >
              <PhosphorIcon name="Info" size={24} color={colors.white} weight="regular" />
            </TouchableOpacity>
          }
        />
        <LoadingScreen
          message="Loading history..."
          showSpinner={true}
        />
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
        rightElement={
          <TouchableOpacity
            onPress={() => rewardNav.goToHowItWorks()}
            activeOpacity={0.7}
          >
            <PhosphorIcon name="Info" size={24} color={colors.white} weight="regular" />
          </TouchableOpacity>
        }
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
        {groupedTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PhosphorIcon name="Receipt" size={48} color={colors.whiteSecondary} />
            <Text style={styles.emptyText}>No points history yet</Text>
            <Text style={styles.emptySubtext}>
              Start earning points by completing quests and making transactions!
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {groupedTransactions.map(({ month, items }) => (
              <View key={month} style={styles.monthSection}>
                <Text style={styles.monthLabel}>{month}</Text>
                <View style={styles.monthTransactions}>
                  {items.map((transaction) => renderTransaction(transaction))}
                </View>
              </View>
            ))}
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
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  transactionsList: {
    gap: spacing.lg,
  },
  monthSection: {
    gap: spacing.sm,
  },
  monthLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  monthTransactions: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: spacing.lg,
    backgroundColor: colors.white10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
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
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  transactionPointsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default PointsHistoryScreen;

