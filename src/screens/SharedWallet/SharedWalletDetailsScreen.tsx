/**
 * Shared Wallet Details Screen
 * Clean wallet interface with balance display and tabbed content
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
  ListRenderItem
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
  TransactionHistoryItem
} from '../../components/sharedWallet';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import { MemberRightsService } from '../../services/sharedWallet/MemberRightsService';
import SharedWalletHeroCard from '../../components/SharedWalletHeroCard';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import CentralizedTransactionModal, { type TransactionModalConfig } from '../../components/shared/CentralizedTransactionModal';
import { db } from '../../config/firebase/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { recordCountMetric } from '../../utils/performance/metrics';

// Simple in-memory throttle map to avoid spamming discrepancy logs for a wallet
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
    }, 'SharedWalletDetailsScreen');
  }

  return shouldLog;
}

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

  // Bound the number of transactions we keep in memory for a single wallet
  const MAX_SHARED_WALLET_TRANSACTIONS = 100;

  // Handle back navigation
  const handleBack = useCallback(() => {
    (navigation as any).navigate('SplitsList', {
      activeTab: 'sharedWallets',
    });
  }, [navigation]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!wallet?.id) {
      logger.warn('Cannot load transactions - wallet ID missing', {
        walletId: wallet?.id,
        hasWallet: !!wallet
      }, 'SharedWalletDetailsScreen');
      return;
    }

    logger.info('Loading transactions for shared wallet', {
      walletId: wallet.id,
      walletFirebaseDocId: wallet.firebaseDocId
    }, 'SharedWalletDetailsScreen');

    setIsLoadingTransactions(true);
    try {
      const { SharedWalletService } = await import('../../services/sharedWallet');
      const result = await SharedWalletService.getSharedWalletTransactions(
        wallet.id, 
        currentUser?.id?.toString(), // ✅ FIX: Pass userId for permission check
        50
      );
      
      logger.info('Transaction load result', {
        walletId: wallet.id,
        success: result.success,
        transactionCount: result.transactions?.length || 0,
        error: result.error
      }, 'SharedWalletDetailsScreen');

      if (result.success && result.transactions) {
        logger.info('Transactions loaded from service', {
          walletId: wallet.id,
          transactionCount: result.transactions.length
        }, 'SharedWalletDetailsScreen');
        
        // Transform transactions to match the UnifiedTransaction interface
        const unifiedTransactions = result.transactions.map((tx: any) => {
          // ✅ FIX: Handle createdAt field - it might be a Timestamp or ISO string
          let createdAtValue: string;
          if (tx.createdAt) {
            if (tx.createdAt.toDate) {
              // It's a Firestore Timestamp
              createdAtValue = tx.createdAt.toDate().toISOString();
            } else if (typeof tx.createdAt === 'string') {
              // It's already an ISO string
              createdAtValue = tx.createdAt;
            } else {
              // Fallback
              createdAtValue = new Date().toISOString();
            }
          } else {
            createdAtValue = new Date().toISOString();
          }
          
          return {
            id: tx.id,
            firebaseDocId: tx.firebaseDocId,
            type: tx.type as 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund',
            amount: tx.amount,
            currency: tx.currency || 'USDC',
            userName: tx.userName,
            memo: tx.memo,
            status: tx.status as 'confirmed' | 'pending' | 'failed' | 'completed',
            createdAt: createdAtValue,
            transactionSignature: tx.transactionSignature,
            sharedWalletId: tx.sharedWalletId,
            // Additional fields for shared wallet context
            userId: tx.userId,
            // For withdrawal transactions, mark as external if destination is different from wallet
            isExternalWallet: tx.type === 'withdrawal' && tx.destination ? true : false,
          };
        });

        logger.info('Transactions transformed and set', {
          walletId: wallet.id,
          transactionCount: unifiedTransactions.length
        }, 'SharedWalletDetailsScreen');

        setTransactions(unifiedTransactions);
      } else {
        logger.warn('No transactions returned from service', {
          walletId: wallet.id,
          success: result.success,
          error: result.error
        }, 'SharedWalletDetailsScreen');
        setTransactions([]);
      }
    } catch (error) {
      logger.error('Error loading transactions', { error: String(error) }, 'SharedWalletDetailsScreen');
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [wallet?.id]);

  // ✅ FIX: Redirect to members tab if user can't view transactions
  useEffect(() => {
    if (activeTab === 'transactions' && wallet && currentUser?.id) {
      const currentUserMember = wallet.members?.find(m => m.userId === currentUser?.id?.toString());
      const userPermissions = currentUserMember 
        ? MemberRightsService.getMemberPermissions(currentUserMember, wallet)
        : null;
      const canViewTransactions = userPermissions?.canViewTransactions ?? false;
      const isCreator = wallet.creatorId === currentUser?.id?.toString();
      
      if (!canViewTransactions && !isCreator) {
        setActiveTab('members');
      }
    }
  }, [activeTab, wallet, currentUser?.id]);

  // Set up real-time listener for wallet updates
  useEffect(() => {
    if (!wallet?.firebaseDocId || !wallet.id) return;

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
    if (!wallet?.id) {
      return;
    }

    logger.info('Setting up real-time listener for shared wallet transactions', {
      walletId: wallet.id,
      walletFirebaseDocId: wallet.firebaseDocId
    }, 'SharedWalletDetailsScreen');

    const transactionsRef = collection(db, 'sharedWalletTransactions');
    
    // ✅ FIX: Try query with orderBy + limit first, fallback to query without orderBy if index missing.
    // We still enforce an in-memory cap to avoid unbounded arrays.
    let q;
    try {
      q = query(
        transactionsRef,
        where('sharedWalletId', '==', wallet.id),
        orderBy('createdAt', 'desc'),
        limit(MAX_SHARED_WALLET_TRANSACTIONS * 2) // small buffer before in-memory cap
      );
    } catch (indexError) {
      // If index doesn't exist, query without orderBy and sort in memory
      logger.warn('Firestore index missing for transactions query, using fallback', {
        walletId: wallet.id,
        error: indexError instanceof Error ? indexError.message : String(indexError)
      }, 'SharedWalletDetailsScreen');
      q = query(
        transactionsRef,
        where('sharedWalletId', '==', wallet.id),
        limit(MAX_SHARED_WALLET_TRANSACTIONS * 2)
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      logger.info('Real-time listener snapshot received', {
        walletId: wallet.id,
        docCount: querySnapshot.docs.length,
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
        isEmpty: querySnapshot.empty,
        // Log first few transaction IDs for debugging
        transactionIds: querySnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          data: {
            sharedWalletId: doc.data().sharedWalletId,
            type: doc.data().type,
            amount: doc.data().amount,
            createdAt: doc.data().createdAt
          }
        }))
      }, 'SharedWalletDetailsScreen');

      let updatedTransactions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        
        // ✅ FIX: Handle createdAt field - it might be a Timestamp or ISO string
        let createdAtValue: string;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            // It's a Firestore Timestamp
            createdAtValue = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            // It's already an ISO string
            createdAtValue = data.createdAt;
          } else {
            // Fallback
            createdAtValue = new Date().toISOString();
          }
        } else {
          createdAtValue = new Date().toISOString();
        }
        
        return {
          id: data.id || doc.id,
          firebaseDocId: doc.id,
          type: data.type as 'funding' | 'withdrawal' | 'transfer' | 'fee' | 'send' | 'receive' | 'deposit' | 'payment' | 'refund',
          amount: data.amount,
          currency: data.currency || 'USDC',
          userName: data.userName,
          memo: data.memo,
          status: data.status as 'confirmed' | 'pending' | 'failed' | 'completed',
          createdAt: createdAtValue,
          transactionSignature: data.transactionSignature,
          sharedWalletId: data.sharedWalletId,
          userId: data.userId,
          isExternalWallet: data.type === 'withdrawal' && data.destination ? true : false,
        } as UnifiedTransaction;
      });

      // ✅ FIX: Sort by createdAt in memory (createdAt is stored as ISO string)
      updatedTransactions.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });

      // ✅ MEMORY CAP: Keep only the latest N transactions in state
      const boundedTransactions = updatedTransactions.slice(0, MAX_SHARED_WALLET_TRANSACTIONS);

      // Lightweight dev-only metric
      recordCountMetric('sharedWallet.transactions.count', boundedTransactions.length, wallet.id);

      logger.info('Real-time transactions update received', {
        walletId: wallet.id,
        transactionCount: boundedTransactions.length,
        // Log only summary information to avoid large payloads
        transactionTypesSample: boundedTransactions.slice(0, 5).map(t => t.type),
        transactionIdsSample: boundedTransactions.slice(0, 5).map(t => t.id)
      }, 'SharedWalletDetailsScreen');

      setTransactions(boundedTransactions);
    }, (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Real-time listener error for shared wallet transactions', {
        walletId: wallet.id,
        error: errorMessage,
        errorCode: (error as any)?.code,
        // Check if it's an index error
        isIndexError: errorMessage.includes('index') || errorMessage.includes('indexes'),
        isPermissionError: errorMessage.includes('permission') || errorMessage.includes('Permission')
      }, 'SharedWalletDetailsScreen');
      
      // ✅ FIX: If it's an index error, try fallback query without orderBy
      if (errorMessage.includes('index') || errorMessage.includes('indexes')) {
        logger.info('Attempting fallback query without orderBy', {
          walletId: wallet.id
        }, 'SharedWalletDetailsScreen');
        
        const fallbackQ = query(
          transactionsRef,
          where('sharedWalletId', '==', wallet.id),
          limit(MAX_SHARED_WALLET_TRANSACTIONS * 2)
        );
        
        const fallbackUnsubscribe = onSnapshot(fallbackQ, (querySnapshot) => {
          let updatedTransactions = querySnapshot.docs.map((doc) => {
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

          // Sort in memory
          updatedTransactions.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          const boundedTransactions = updatedTransactions.slice(0, MAX_SHARED_WALLET_TRANSACTIONS);
          recordCountMetric('sharedWallet.transactions.count', boundedTransactions.length, wallet.id);
          setTransactions(boundedTransactions);
        }, (fallbackError) => {
          logger.error('Fallback query also failed', {
            walletId: wallet.id,
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }, 'SharedWalletDetailsScreen');
          setTransactions([]);
        });
        
        return () => {
          fallbackUnsubscribe();
        };
      } else {
        setTransactions([]);
      }
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

            // If there's a significant difference, log it for monitoring with simple throttling per wallet
            const difference = Math.abs(updatedWallet.totalBalance - (onChainResult.balance || 0));
            if (difference > 0.01 && shouldLogDiscrepancy(walletId, difference)) { // More than 1 cent difference
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
        
        // CRITICAL FIX: Also load user wallet address when routeWallet is provided
        if (currentUser?.id) {
          try {
            const { consolidatedTransactionService } = await import('../../services/blockchain/transaction');
            const userWalletAddress = await consolidatedTransactionService.getUserWalletAddress(currentUser.id);
            setUserWalletAddress(userWalletAddress || '');
          } catch (error) {
            logger.warn('Failed to get user wallet address', { error }, 'SharedWalletDetailsScreen');
          }
        }
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
  
  // ✅ FIX: Get current user's member data and permissions
  const currentUserMember = wallet.members?.find(m => m.userId === currentUser?.id?.toString());
  const userPermissions = currentUserMember 
    ? MemberRightsService.getMemberPermissions(currentUserMember, wallet)
    : null;
  
  // Permission checks for UI visibility
  const canWithdraw = userPermissions?.canWithdraw ?? false;
  const canFund = userPermissions?.canFund ?? false;
  const canInviteMembers = userPermissions?.canInviteMembers ?? false;
  const canManageSettings = userPermissions?.canManageSettings ?? false;
  const canViewTransactions = userPermissions?.canViewTransactions ?? false;
  
  const goalAmount = wallet.settings?.goalAmount;
  const hasGoal = typeof goalAmount === 'number' && goalAmount > 0;
  const goalTargetAmount = goalAmount ?? 0;
  const goalCollectedAmount = wallet.totalBalance;
  const shouldShowGoalProgress = hasGoal;

  const renderTransactionItem: ListRenderItem<UnifiedTransaction> = ({ item: tx }) => (
    <TransactionHistoryItem
      transaction={tx}
      variant="sharedWallet"
    />
  );

  const renderListEmptyComponent = () => {
    if (activeTab !== 'transactions') {
      return null;
    }

    if (isLoadingTransactions) {
      return (
        <View style={styles.loadingContainer}>
          <ModernLoader size="medium" text="Loading transactions..." />
        </View>
      );
    }

    return (
      <View style={styles.emptyTransactions}>
        <View style={styles.emptyTransactionsIcon}>
          <PhosphorIcon name="Receipt" size={24} color={colors.white70} weight="regular" />
        </View>
        <Text style={styles.emptyTransactionsTitle}>No transactions yet</Text>
        <TouchableOpacity
          onPress={loadTransactions}
          style={styles.refreshButton}
        >
          <PhosphorIcon name="ArrowClockwise" size={16} color={colors.white70} weight="regular" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Wallet Balance Display - Real Wallet Style */}
      <View style={styles.walletBalanceContainer}>
        <SharedWalletHeroCard wallet={wallet} />
      </View>

      {/* Action Buttons - Withdraw and Top Up */}
      {/* ✅ FIX: Only show buttons if user has the required permissions */}
      <View style={styles.actionButtonsContainer}>
        {canWithdraw && (
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
                const currentUserMemberInner = wallet.members?.find(m => m.userId === currentUser?.id);
                if (currentUserMemberInner) {
                  // Use standardized balance calculation (pool-based approach)
                  const balanceResult = MemberRightsService.getAvailableBalance(currentUserMemberInner, wallet);
                  return balanceResult.error ? 0 : balanceResult.availableBalance;
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
        )}

        {canFund && (
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
              sharedWalletId: wallet.id, // ✅ FIX: Explicitly set sharedWalletId
              customRecipientInfo: {
                name: wallet.name || 'Shared Wallet',
                // ✅ FIX: Use actual wallet address instead of document ID
                // The modal will also resolve from sharedWalletId, but this ensures proper display
                address: wallet.walletAddress || '',
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
        )}
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
      {/* ✅ FIX: Only show transactions tab if user can view transactions */}
      <View style={styles.tabsContainer}>
        <TabSecondary
          tabs={[
            ...(canViewTransactions || isCreator ? [{ label: `Transactions (${transactions.length})`, value: 'transactions' }] : []),
            { label: `Members (${wallet.members?.length || 0})`, value: 'members' }
          ]}
          activeTab={activeTab}
          onTabChange={(tabValue) => setActiveTab(tabValue as 'transactions' | 'members')}
          fullWidthTabs
        />
      </View>

      {/* Members tab content lives in the header so that the main FlatList
          always controls vertical scrolling. */}
      {activeTab === 'members' && (
        <View style={styles.tabContent}>
          {(isCreator || canManageSettings) && (
          <View style={styles.memberManagementContainer}>
            {/* Only creator can manage rights */}
            {isCreator && (
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
            )}
            {(canInviteMembers || isCreator) && (
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
            )}
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
    </View>
  );

  return (
    <Container>
      <Header
        title={wallet.name}
        onBackPress={handleBack}
        showBackButton={true}
        rightElement={
          // ✅ FIX: Only show settings button if user can manage settings
          (canManageSettings || isCreator) ? (
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
          ) : null
        }
      />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.scrollViewContent}
        data={activeTab === 'transactions' && (canViewTransactions || isCreator) ? transactions : []}
        keyExtractor={(tx) => tx.id || tx.firebaseDocId || `${tx.type}-${tx.amount}-${tx.createdAt}`}
        renderItem={activeTab === 'transactions' && (canViewTransactions || isCreator) ? renderTransactionItem : undefined}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderListEmptyComponent}
        showsVerticalScrollIndicator={false}
      />

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
  list: {
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
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
    marginTop: spacing.sm,
  },
  refreshButtonText: {
    fontSize: typography.fontSize.sm,
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
  noAccessContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  noAccessText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
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
