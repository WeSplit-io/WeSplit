/**
 * Custom hook for managing shared wallet data and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase/firebase';
import { SharedWalletService, SharedWallet } from '../../../services/sharedWallet';
import { UnifiedTransaction } from '../../../components/sharedWallet';
import { logger } from '../../../services/analytics/loggingService';

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

  // Load wallet data with on-chain verification
  const loadWalletData = useCallback(async (walletId: string): Promise<SharedWallet | null> => {
    if (!walletId) return null;

    try {
      setIsLoadingWallet(true);
      setError(null);

      const { SharedWalletService } = await import('../../../services/sharedWallet');
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
            }, 'useSharedWalletData');

            // Log significant discrepancies
            const difference = Math.abs(updatedWallet.totalBalance - (onChainResult.balance || 0));
            if (difference > 0.01) {
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

        setWallet(updatedWallet);
        return updatedWallet;
      } else {
        const errorMsg = result.error || 'Failed to load shared wallet';
        setError(errorMsg);
        logger.error('Failed to load wallet data', { walletId, error: errorMsg }, 'useSharedWalletData');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load wallet data';
      setError(errorMsg);
      logger.error('Error loading wallet data', { walletId, error: errorMsg }, 'useSharedWalletData');
      return null;
    } finally {
      setIsLoadingWallet(false);
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

      if (result.success && result.transactions) {
        setTransactions(result.transactions);
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
      setIsLoadingTransactions(false);
    }
  }, [walletId]);

  // Set up real-time listeners
  useEffect(() => {
    if (!wallet?.firebaseDocId) return;

    logger.info('Setting up real-time listener for shared wallet', {
      walletId: wallet.id,
      firebaseDocId: wallet.firebaseDocId
    }, 'useSharedWalletData');

    // Wallet listener
    const walletRef = doc(db, 'sharedWallets', wallet.firebaseDocId);
    const walletUnsubscribe = onSnapshot(walletRef, (docSnapshot) => {
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
          updatedAt: updatedWallet.updatedAt
        }, 'useSharedWalletData');

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
      const updatedTransactions = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseDocId: doc.id,
      })) as UnifiedTransaction[];

      logger.debug('Real-time transactions update received', {
        walletId: wallet.id,
        transactionCount: updatedTransactions.length
      }, 'useSharedWalletData');

      setTransactions(updatedTransactions);
    }, (error) => {
      logger.error('Real-time listener error for transactions', {
        walletId: wallet.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'useSharedWalletData');
    });

    return () => {
      logger.info('Cleaning up real-time listeners for shared wallet', {
        walletId: wallet.id
      }, 'useSharedWalletData');
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

