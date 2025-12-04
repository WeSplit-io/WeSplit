/**
 * Transaction History Component
 * Displays transaction history for shared wallets and splits
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { ModernLoader } from '../shared';
import TransactionHistoryItem, { UnifiedTransaction } from './TransactionHistoryItem';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { enrichTransactions } from '../../utils/transactionDisplayUtils';
import { deduplicateTransactions } from '../../utils/transactionDisplayUtils';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';

interface TransactionHistoryProps {
  transactions: UnifiedTransaction[];
  isLoading: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onTransactionPress?: (transaction: UnifiedTransaction) => void;
  variant?: 'sharedWallet' | 'split'; // Variant to customize display
  title?: string; // Custom title
  emptyMessage?: string; // Custom empty message
  emptySubtext?: string; // Custom empty subtext
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading,
  onRefresh,
  refreshing = false,
  onTransactionPress,
  variant = 'sharedWallet',
  title = 'Transaction History',
  emptyMessage = 'No transactions yet',
  emptySubtext,
}) => {
  const { state } = useApp();
  const { currentUser } = state;
  const [enrichedTransactions, setEnrichedTransactions] = useState<UnifiedTransaction[]>(transactions);

  // Enrich transactions with split names and external destination info
  // Also deduplicate transactions by tx_hash to ensure uniqueness
  useEffect(() => {
    // Deduplicate transactions first (using shared utility)
    const uniqueTransactions = deduplicateTransactions(transactions);
    
    if (uniqueTransactions.length > 0 && currentUser?.id) {
      // Enrich with split names and external destination info
      enrichTransactions(uniqueTransactions, currentUser.id.toString())
        .then(setEnrichedTransactions)
        .catch((error) => {
          logger.error('Error enriching transactions', { error: error instanceof Error ? error.message : String(error) }, 'TransactionHistory');
          setEnrichedTransactions(uniqueTransactions);
        });
    } else {
      // If no user ID, just use deduplicated transactions
      setEnrichedTransactions(uniqueTransactions);
    }
  }, [transactions, currentUser?.id]);

  const defaultEmptySubtext = variant === 'sharedWallet'
    ? 'Transactions will appear here when you top up or withdraw funds'
    : 'Transactions will appear here when payments are made';

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ModernLoader size="small" text="Loading transactions..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {transactions.length > 0 && (
          <Text style={styles.transactionCount}>
            {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        )}
      </View>
      
      {enrichedTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          {(emptySubtext || defaultEmptySubtext) && (
            <Text style={styles.emptySubtext}>
              {emptySubtext || defaultEmptySubtext}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.transactionsList}>
          {enrichedTransactions.map((tx) => (
            <TransactionHistoryItem
              key={tx.id || tx.firebaseDocId}
              transaction={tx}
              variant={variant}
              onPress={onTransactionPress ? () => onTransactionPress(tx) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  transactionCount: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.md * 1.3,
  },
  emptySubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    textAlign: 'center',
    lineHeight: typography.fontSize.xs * 1.3,
  },
  transactionsList: {
    gap: spacing.xs,
  },
});

export default TransactionHistory;

