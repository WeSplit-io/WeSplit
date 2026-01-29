/**
 * Custom hook for managing shared wallet data and real-time updates.
 *
 * NOTE: The primary shared wallet details screen currently manages its own
 * wallet + transaction loading and listeners. This hook is kept for potential
 * reuse in other screens, but should not introduce additional listeners for
 * the same wallet when the details screen is mounted.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase/firebase';
import { SharedWalletService, SharedWallet } from '../../../services/sharedWallet';
import { UnifiedTransaction } from '../../../components/sharedWallet';
import { logger } from '../../../services/analytics/loggingService';
import { recordCountMetric } from '../../../utils/performance/metrics';

const ENABLE_VERBOSE_SHARED_WALLET_LOGS =
  __DEV__ && (process.env.ENABLE_VERBOSE_SHARED_WALLET_LOGS === '1' || process.env.ENABLE_VERBOSE_SPLIT_LOGS === '1');

// Simple in-memory throttle map to avoid spamming discrepancy logs
const DISCREPANCY_LOG_THROTTLE_MS = 60_000; // 60 seconds
const lastDiscrepancyLogByWallet: Record<string, number> = {};

function shouldLogDiscrepancy(walletId: string, difference: number): boolean {
  if (!walletId) return false;
  const now = Date.now();
  const last = lastDiscrepancyLogByWallet[walletId] || 0;
  const shouldLog = now - last >= DISCREPANCY_LOG_THROTTLE_MS;

  if (shouldLog) {
    lastDiscrepancyLogByWallet[walletId] = now;
  } else {
    logger.debug('Shared wallet balance discrepancy detected but throttled', {
      walletId,
      difference,
      secondsSinceLastLog: (now - last) / 1000,
    }, 'useSharedWalletData');
  }

  return shouldLog;
}

export interface UseSharedWalletDataResult {
  wallet: SharedWallet | null;
  transactions: UnifiedTransaction[];
  isLoadingWallet: boolean;
  isLoadingTransactions: boolean;
  error: string | null;
  loadWalletData: (walletId: string) => Promise<SharedWallet | null>;
  loadTransactions: () => Promise<void>;
}

export const useSharedWalletData = (
  walletId: string | null,
  currentUserId?: string
): UseSharedWalletDataResult => {
  const [wallet, setWallet] = useState<SharedWallet | null>(null);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load wallet data with on-chain verification
  const loadWalletData = useCallback(async (walletId: string): Promise<SharedWallet | null> => {
    if (!walletId) return null;

    try {
      setIsLoadingWallet(true);
      setError(null);

      const { SharedWalletService } = await import('../../../services/sharedWallet');
      const result = await SharedWalletService.getSharedWallet(walletId);
      if (!isMountedRef.current) return null;

      if (result.success && result.wallet) {
        let updatedWallet = result.wallet;

        // Fetch on-chain balance for verification
        try {
          const onChainResult = await SharedWalletService.getSharedWalletOnChainBalance(walletId);
          if (!isMountedRef.current) return null;

          if (onChainResult.success) {
            if (ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
              logger.info('On-chain balance check for shared wallet', {
                walletId,
                databaseBalance: updatedWallet.totalBalance,
                onChainBalance: onChainResult.balance,
                accountExists: onChainResult.accountExists,
                difference: updatedWallet.totalBalance - (onChainResult.balance || 0)
              }, 'useSharedWalletData');
            }

            // Log significant discrepancies with simple throttling per wallet to avoid log spam
            const difference = Math.abs(updatedWallet.totalBalance - (onChainResult.balance || 0));
            if (difference > 0.01 && shouldLogDiscrepancy(walletId, difference) && ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
              logger.warn('Balance discrepancy detected', {
                walletId,
                databaseBalance: updatedWallet.totalBalance,
                onChainBalance: onChainResult.balance,
                difference
              }, 'useSharedWalletData');
            }
          } else {
            logger.error('Failed to fetch on-chain balance', {
              walletId,
              error: onChainResult.error
            }, 'useSharedWalletData');
          }
        } catch (balanceError) {
          logger.error('Failed to fetch on-chain balance', {
            walletId,
            error: balanceError instanceof Error ? balanceError.message : String(balanceError)
          }, 'useSharedWalletData');
        }

        if (isMountedRef.current) setWallet(updatedWallet);
        return updatedWallet;
      } else {
        const errorMsg = result.error || 'Failed to load shared wallet';
        if (isMountedRef.current) setError(errorMsg);
        logger.error('Failed to load wallet data', { walletId, error: errorMsg }, 'useSharedWalletData');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load wallet data';
      if (isMountedRef.current) setError(errorMsg);
      logger.error('Error loading wallet data', { walletId, error: errorMsg }, 'useSharedWalletData');
      return null;
    } finally {
      if (isMountedRef.current) setIsLoadingWallet(false);
    }
  }, []);

  // Load transaction history
  const loadTransactions = useCallback(async () => {
    if (!walletId) return;

    try {
      setIsLoadingTransactions(true);

      const result = await SharedWalletService.getSharedWalletTransactions(
        walletId, 
        currentUserId, // ✅ FIX: Pass userId for permission check
        50
      );
      if (!isMountedRef.current) return;

      if (result.success && result.transactions) {
        if (isMountedRef.current) setTransactions(result.transactions);
      } else {
        logger.error('Failed to load transactions', {
          walletId,
          error: result.error
        }, 'useSharedWalletData');
      }
    } catch (err) {
      logger.error('Error loading transactions', {
        walletId,
        error: err instanceof Error ? err.message : String(err)
      }, 'useSharedWalletData');
    } finally {
      if (isMountedRef.current) setIsLoadingTransactions(false);
    }
  }, [walletId]);

  // Set up real-time listeners
  useEffect(() => {
    if (!wallet?.firebaseDocId) return;

    if (ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
      logger.info('Setting up real-time listener for shared wallet', {
        walletId: wallet.id,
        firebaseDocId: wallet.firebaseDocId
      }, 'useSharedWalletData');
    }

    // Wallet listener
    const walletRef = doc(db, 'sharedWallets', wallet.firebaseDocId);
    const walletUnsubscribe = onSnapshot(walletRef, (docSnapshot) => {
      if (!isMountedRef.current) return;
      if (docSnapshot.exists()) {
        const updatedWallet = {
          ...docSnapshot.data(),
          firebaseDocId: docSnapshot.id,
        } as SharedWallet;

        if (ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
          logger.info('Real-time wallet update received', {
            walletId: wallet.id,
            oldBalance: wallet.totalBalance,
            newBalance: updatedWallet.totalBalance,
            balanceDifference: updatedWallet.totalBalance - wallet.totalBalance,
            updatedAt: updatedWallet.updatedAt
          }, 'useSharedWalletData');
        }

        setWallet(updatedWallet);
      }
    }, (error) => {
      logger.error('Real-time listener error for shared wallet', {
        walletId: wallet.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'useSharedWalletData');
    });

    // Transactions listener
    const transactionsRef = collection(db, 'sharedWalletTransactions');
    const q = query(
      transactionsRef,
      where('sharedWalletId', '==', wallet.id),
      orderBy('createdAt', 'desc'),
      // limit(50) - Firestore doesn't support limit in real-time queries
    );

    const transactionsUnsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!isMountedRef.current) return;
      const updatedTransactions = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseDocId: doc.id,
      })) as UnifiedTransaction[];

      const boundedTransactions = updatedTransactions.slice(0, 100);
      recordCountMetric('sharedWallet.hook.transactions.count', boundedTransactions.length, wallet.id);

      if (ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
        logger.debug('Real-time transactions update received', {
          walletId: wallet.id,
          transactionCount: boundedTransactions.length
        }, 'useSharedWalletData');
      }

      setTransactions(boundedTransactions);
    }, (error) => {
      logger.error('Real-time listener error for transactions', {
        walletId: wallet.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'useSharedWalletData');
    });

    return () => {
      if (ENABLE_VERBOSE_SHARED_WALLET_LOGS) {
        logger.info('Cleaning up real-time listeners for shared wallet', {
          walletId: wallet.id
        }, 'useSharedWalletData');
      }
      walletUnsubscribe();
      transactionsUnsubscribe();
    };
  }, [wallet?.firebaseDocId, wallet?.id]);

  return {
    wallet,
    transactions,
    isLoadingWallet,
    isLoadingTransactions,
    error,
    loadWalletData,
    loadTransactions,
  };
};

