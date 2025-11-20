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
import { enrichTransactions } from '../../utils/transactionEnrichment';
import { deduplicateTransactions } from '../../utils/transactionDisplayUtils';
import { useApp } from '../../context/AppContext';

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
          console.error('Error enriching transactions:', error);
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
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
  },
  transactionCount: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  emptySubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    textAlign: 'center',
  },
  transactionsList: {
    gap: spacing.xs,
  },
});

export default TransactionHistory;

