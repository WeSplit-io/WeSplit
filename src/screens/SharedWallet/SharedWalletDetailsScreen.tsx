/**
 * Shared Wallet Details Screen
 * Complete redesign with top-up, card linking, and withdrawal functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { 
  Container, 
  Header, 
  ModernLoader, 
  Button, 
  Modal, 
  Input, 
  ErrorScreen,
  Avatar,
  PhosphorIcon,
} from '../../components/shared';
import {
  BalanceCard,
  ActionButtons,
  TransactionHistory,
  MembersList,
  UnifiedTransaction,
} from '../../components/sharedWallet';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import { LinkedWalletService, LinkedWallet } from '../../services/blockchain/wallet/LinkedWalletService';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { logger } from '../../services/analytics/loggingService';

const SharedWalletDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletAddress, appWalletBalance, getAppWalletBalance } = useWallet();

  const { walletId, wallet: routeWallet, newlyAddedCard, selectedCard } = route.params || {};
  
  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(!routeWallet);
  const [linkedCards, setLinkedCards] = useState<LinkedWallet[]>([]);
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [appWalletBalanceLocal, setAppWalletBalanceLocal] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Modals
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showLinkCardModal, setShowLinkCardModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Card linking state
  const [isLinkingCard, setIsLinkingCard] = useState(false);
  
  // Top-up state
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpSource, setTopUpSource] = useState<'in-app-wallet' | 'external-wallet' | 'moonpay'>('in-app-wallet');
  const [isFunding, setIsFunding] = useState(false);
  
  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedWithdrawCard, setSelectedWithdrawCard] = useState<LinkedWallet | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Handle back navigation - always go to shared wallets list
  const handleBack = useCallback(() => {
    navigation.navigate('SplitsList', {
      activeTab: 'sharedWallets',
    });
  }, [navigation]);

  // Load wallet - prioritize showing data immediately
  useEffect(() => {
    const loadWallet = async () => {
      if (routeWallet) {
        setWallet(routeWallet);
        setIsLoadingWallet(false);
        // Load secondary data immediately if wallet is available
        if (currentUser?.id) {
          loadSecondaryData();
        }
        return;
      }

      if (!walletId) {
        Alert.alert('Error', 'Wallet ID is required');
        handleBack();
        return;
      }

      setIsLoadingWallet(true);
      try {
        const result = await SharedWalletService.getSharedWallet(walletId);
        if (result.success && result.wallet) {
          setWallet(result.wallet);
          // Load secondary data immediately after wallet loads
          if (currentUser?.id) {
            loadSecondaryData();
          }
        } else {
          Alert.alert('Error', result.error || 'Failed to load shared wallet');
          handleBack();
        }
      } catch (error) {
        logger.error('Error loading shared wallet', error, 'SharedWalletDetailsScreen');
        Alert.alert('Error', 'Failed to load shared wallet');
        handleBack();
      } finally {
        setIsLoadingWallet(false);
      }
    };

    loadWallet();
  }, [walletId, routeWallet]);

  // Load linked cards and wallets
  const loadLinkedCards = useCallback(async () => {
    if (!currentUser?.id) {
      logger.warn('Cannot load linked cards: no current user', null, 'SharedWalletDetailsScreen');
      return;
    }
    
    setIsLoadingCards(true);
    try {
      logger.info('Loading linked cards and wallets for user', { userId: currentUser.id }, 'SharedWalletDetailsScreen');
      const allLinked = await LinkedWalletService.getLinkedWallets(currentUser.id.toString());
      logger.info('Raw linked items from LinkedWalletService', { 
        totalItems: allLinked.length,
        items: allLinked.map(c => ({ id: c.id, type: c.type, label: c.label, isActive: c.isActive, status: c.status }))
      }, 'SharedWalletDetailsScreen');
      
      // Filter for KAST cards
      // Also include cards with status 'active' even if isActive is not explicitly set
      const kastCards = allLinked.filter(card => 
        card.type === 'kast' && 
        (card.isActive === true || card.status === 'active')
      );
      
      // Filter for external wallets
      const externalWallets = allLinked.filter(wallet => 
        wallet.type === 'external' && 
        (wallet.isActive === true || wallet.status === 'active')
      );
      
      logger.info('Filtered linked items', { 
        kastCardsCount: kastCards.length,
        externalWalletsCount: externalWallets.length,
        kastCards: kastCards.map(c => ({ id: c.id, label: c.label })),
        externalWallets: externalWallets.map(w => ({ id: w.id, label: w.label }))
      }, 'SharedWalletDetailsScreen');
      
      setLinkedCards(kastCards);
      setLinkedWallets(externalWallets);
    } catch (error) {
      logger.error('Error loading linked cards and wallets', error, 'SharedWalletDetailsScreen');
      setLinkedCards([]);
      setLinkedWallets([]);
    } finally {
      setIsLoadingCards(false);
    }
  }, [currentUser?.id]);

  // Load app wallet balance
  const loadAppWalletBalance = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const balance = await getAppWalletBalance(currentUser.id.toString());
      setAppWalletBalanceLocal(balance);
      logger.debug('Loaded app wallet balance', { balance }, 'SharedWalletDetailsScreen');
    } catch (error) {
      logger.error('Error loading app wallet balance', error, 'SharedWalletDetailsScreen');
      setAppWalletBalanceLocal(null);
    }
  }, [currentUser?.id, getAppWalletBalance]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!wallet?.id) return;
    
    setIsLoadingTransactions(true);
    try {
      const result = await SharedWalletService.getSharedWalletTransactions(wallet.id, 20);
      if (result.success && result.transactions) {
        // Map shared wallet transactions to UnifiedTransaction format
        const unifiedTransactions: UnifiedTransaction[] = result.transactions.map((tx: any) => ({
          id: tx.id || tx.firebaseDocId,
          firebaseDocId: tx.firebaseDocId,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          userName: tx.userName,
          memo: tx.memo,
          status: tx.status,
          createdAt: tx.createdAt,
          transactionSignature: tx.transactionSignature,
          // Include destination for withdrawals to enable external card/wallet detection
          to_wallet: tx.destination || tx.to_wallet,
          from_wallet: tx.from_wallet,
        }));
        setTransactions(unifiedTransactions);
      }
    } catch (error) {
      logger.error('Error loading transactions', error, 'SharedWalletDetailsScreen');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [wallet?.id]);

  // Load all secondary data in parallel
  const loadSecondaryData = useCallback(async () => {
    if (!wallet || !currentUser?.id) return;
    
    // Load all secondary data in parallel for better performance
    await Promise.all([
      loadLinkedCards(),
      loadAppWalletBalance(),
      loadTransactions(),
    ]);
  }, [wallet, currentUser?.id, loadLinkedCards, loadAppWalletBalance, loadTransactions]);

  // Reload wallet and cards when screen comes into focus (e.g., after adding a card)
  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) return;

      // Reload wallet data
      if (wallet?.id) {
        const reloadWallet = async () => {
          try {
            const result = await SharedWalletService.getSharedWallet(wallet.id);
            if (result.success && result.wallet) {
              setWallet(result.wallet);
            }
          } catch (error) {
            logger.error('Error reloading wallet on focus', error, 'SharedWalletDetailsScreen');
          }
        };
        reloadWallet();
      }

      // Reload all secondary data in parallel
      loadSecondaryData();
    }, [currentUser?.id, wallet?.id, loadLinkedCards, loadAppWalletBalance, loadTransactions])
  );

  // Handle newly added card from LinkedCards screen - auto-link it
  useEffect(() => {
    const handleNewlyAddedCard = async () => {
      if (!newlyAddedCard || !wallet || !currentUser?.id) return;

      // Check if card is already linked
      const userMember = wallet.members.find(m => m.userId === currentUser.id.toString());
      const isAlreadyLinked = userMember?.linkedCards?.includes(newlyAddedCard.id);
      
      if (isAlreadyLinked) {
        // Card already linked, just reload cards
        const cards = await LinkedWalletService.getLinkedWallets(currentUser.id.toString());
        const kastCards = cards.filter(card => card.type === 'kast' && card.isActive);
        setLinkedCards(kastCards);
        return;
      }

      // Auto-link the newly added card
      try {
        const result = await SharedWalletService.linkCardToSharedWallet(
          wallet.id,
          currentUser.id.toString(),
          newlyAddedCard.id
        );

        if (result.success) {
          // Reload wallet and cards
          const [reloadResult, cards] = await Promise.all([
            SharedWalletService.getSharedWallet(wallet.id),
            LinkedWalletService.getLinkedWallets(currentUser.id.toString()),
          ]);
          
          if (reloadResult.success && reloadResult.wallet) {
            setWallet(reloadResult.wallet);
          }
          
          const kastCards = cards.filter(card => card.type === 'kast' && card.isActive);
          setLinkedCards(kastCards);
          
          Alert.alert('Success', `Card "${newlyAddedCard.label}" has been linked to this shared wallet`);
        } else {
          logger.warn('Failed to auto-link newly added card', { error: result.error }, 'SharedWalletDetailsScreen');
        }
      } catch (error) {
        logger.error('Error auto-linking newly added card', error, 'SharedWalletDetailsScreen');
      }
    };

    handleNewlyAddedCard();
  }, [newlyAddedCard, wallet, currentUser?.id]);

  // Handle selected card from LinkedCards screen - link it
  useEffect(() => {
    const handleSelectedCard = async () => {
      if (!selectedCard) {
        logger.debug('No selectedCard in route params', null, 'SharedWalletDetailsScreen');
        return;
      }
      
      if (!wallet || !currentUser?.id) {
        logger.warn('Cannot link card: missing wallet or currentUser', {
          hasWallet: !!wallet,
          hasCurrentUser: !!currentUser?.id
        }, 'SharedWalletDetailsScreen');
        return;
      }

      logger.info('Processing selected card from LinkedCards', {
        cardId: selectedCard.id,
        cardLabel: selectedCard.label,
        walletId: wallet.id
      }, 'SharedWalletDetailsScreen');

      // Check if card is already linked
      const userMember = wallet.members.find(m => m.userId === currentUser.id.toString());
      const isAlreadyLinked = userMember?.linkedCards?.includes(selectedCard.id);
      
      if (isAlreadyLinked) {
        logger.info('Card already linked, skipping', { cardId: selectedCard.id }, 'SharedWalletDetailsScreen');
        Alert.alert('Info', `Card "${selectedCard.label}" is already linked to this shared wallet`);
        // Reload cards
        const cards = await LinkedWalletService.getLinkedWallets(currentUser.id.toString());
        const kastCards = cards.filter(card => card.type === 'kast' && (card.isActive === true || card.status === 'active'));
        setLinkedCards(kastCards);
        return;
      }

      // Link the selected card
      setIsLinkingCard(true);
      try {
        logger.info('Linking card to shared wallet', {
          walletId: wallet.id,
          cardId: selectedCard.id
        }, 'SharedWalletDetailsScreen');
        
        const result = await SharedWalletService.linkCardToSharedWallet(
          wallet.id,
          currentUser.id.toString(),
          selectedCard.id
        );

        if (result.success) {
          logger.info('Card linked successfully', { cardId: selectedCard.id }, 'SharedWalletDetailsScreen');
          
          // Reload wallet and cards
          const [reloadResult, cards] = await Promise.all([
            SharedWalletService.getSharedWallet(wallet.id),
            LinkedWalletService.getLinkedWallets(currentUser.id.toString()),
          ]);
          
          if (reloadResult.success && reloadResult.wallet) {
            setWallet(reloadResult.wallet);
          }
          
          const kastCards = cards.filter(card => card.type === 'kast' && (card.isActive === true || card.status === 'active'));
          setLinkedCards(kastCards);
          
          Alert.alert('Success', `Card "${selectedCard.label}" has been linked to this shared wallet`);
        } else {
          logger.error('Failed to link card', { error: result.error }, 'SharedWalletDetailsScreen');
          Alert.alert('Error', result.error || 'Failed to link card');
        }
      } catch (error) {
        logger.error('Error linking selected card', error, 'SharedWalletDetailsScreen');
        Alert.alert('Error', 'Failed to link card');
      } finally {
        setIsLinkingCard(false);
      }
    };

    handleSelectedCard();
  }, [selectedCard, wallet, currentUser?.id]);

  // Handle top-up
  const handleTopUp = useCallback(async () => {
    if (!wallet || !currentUser?.id) return;
    
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (topUpSource === 'in-app-wallet') {
      if (!appWalletAddress) {
        Alert.alert('Error', 'App wallet not available');
        return;
      }
      
      if (appWalletBalance !== null && amount > appWalletBalance) {
        Alert.alert('Error', 'Insufficient balance in your app wallet');
        return;
      }
    }

    setIsFunding(true);
    try {
      if (topUpSource === 'moonpay') {
        // Navigate to MoonPay with shared wallet address
        navigation.navigate('Deposit', {
          targetWallet: {
            address: wallet.walletAddress,
            name: wallet.name,
            type: 'group',
          },
          prefillAmount: amount,
          onSuccess: () => {
            setShowTopUpModal(false);
            setTopUpAmount('');
            // Reload wallet to get updated balance
            const reloadWallet = async () => {
              const result = await SharedWalletService.getSharedWallet(wallet.id);
              if (result.success && result.wallet) {
                setWallet(result.wallet);
              }
            };
            reloadWallet();
          },
        });
        setIsFunding(false);
        return;
      }

      // For in-app wallet funding
      const result = await SharedWalletService.fundSharedWallet({
        sharedWalletId: wallet.id,
        userId: currentUser.id.toString(),
        amount: amount,
        source: topUpSource,
        memo: `Top-up to ${wallet.name}`,
      });

      if (result.success) {
        Alert.alert('Success', `Successfully added ${formatBalance(amount, wallet.currency)} to the shared wallet`);
        setShowTopUpModal(false);
        setTopUpAmount('');
        // Reload wallet
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to fund shared wallet');
      }
    } catch (error) {
      logger.error('Error funding shared wallet', error, 'SharedWalletDetailsScreen');
      Alert.alert('Error', 'Failed to fund shared wallet');
    } finally {
      setIsFunding(false);
    }
  }, [wallet, currentUser?.id, topUpAmount, topUpSource, appWalletAddress, appWalletBalance, navigation]);

  // Handle link card
  const handleLinkCard = useCallback(() => {
    setShowLinkCardModal(true);
  }, []);

  // Reload cards when modal opens
  useEffect(() => {
    if (showLinkCardModal && wallet && currentUser?.id) {
      logger.info('Link card modal opened, reloading cards', null, 'SharedWalletDetailsScreen');
      loadLinkedCards();
    }
  }, [showLinkCardModal, wallet, currentUser?.id, loadLinkedCards]);

  // Handle link card to shared wallet
  const handleLinkCardToWallet = useCallback(async (card: LinkedWallet) => {
    if (!wallet || !currentUser?.id) return;

    setIsLinkingCard(true);
    try {
      const result = await SharedWalletService.linkCardToSharedWallet(
        wallet.id,
        currentUser.id.toString(),
        card.id
      );

      if (result.success) {
        Alert.alert('Success', `Card "${card.label}" linked to shared wallet`);
        setShowLinkCardModal(false);
        // Reload wallet to get updated linked cards
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to link card');
      }
    } catch (error) {
      logger.error('Error linking card to shared wallet', error, 'SharedWalletDetailsScreen');
      Alert.alert('Error', 'Failed to link card');
    } finally {
      setIsLinkingCard(false);
    }
  }, [wallet, currentUser?.id]);

  // Handle unlink card
  const handleUnlinkCard = useCallback(async (card: LinkedWallet) => {
    if (!wallet || !currentUser?.id) return;

    Alert.alert(
      'Unlink Card',
      `Are you sure you want to unlink "${card.label}" from this shared wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await SharedWalletService.unlinkCardFromSharedWallet(
                wallet.id,
                currentUser.id.toString(),
                card.id
              );

              if (result.success) {
                Alert.alert('Success', `Card "${card.label}" unlinked from shared wallet`);
                // Reload wallet
                const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
                if (reloadResult.success && reloadResult.wallet) {
                  setWallet(reloadResult.wallet);
                }
              } else {
                Alert.alert('Error', result.error || 'Failed to unlink card');
              }
            } catch (error) {
              logger.error('Error unlinking card from shared wallet', error, 'SharedWalletDetailsScreen');
              Alert.alert('Error', 'Failed to unlink card');
            }
          },
        },
      ]
    );
  }, [wallet, currentUser?.id]);

  // Handle withdrawal
  const handleWithdraw = useCallback(async () => {
    if (!wallet || !currentUser?.id || !selectedWithdrawCard) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > wallet.totalBalance) {
      Alert.alert('Error', 'Insufficient balance in shared wallet');
      return;
    }

    const userMember = wallet.members.find(m => m.userId === currentUser.id.toString());
    const userBalance = (userMember?.totalContributed || 0) - (userMember?.totalWithdrawn || 0);
    
    if (amount > userBalance) {
      Alert.alert('Error', 'You can only withdraw up to your available balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await SharedWalletService.withdrawFromSharedWallet({
        sharedWalletId: wallet.id,
        userId: currentUser.id.toString(),
        amount: amount,
        destination: 'linked-card',
        destinationId: selectedWithdrawCard.id,
        memo: `Withdrawal from ${wallet.name} to ${selectedWithdrawCard.label}`,
      });

      if (result.success) {
        Alert.alert('Success', result.message || `Successfully withdrew ${formatBalance(amount, wallet.currency)} to your card`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setSelectedWithdrawCard(null);
        // Reload wallet
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to withdraw from shared wallet');
      }
    } catch (error) {
      logger.error('Error withdrawing from shared wallet', error, 'SharedWalletDetailsScreen');
      Alert.alert('Error', 'Failed to withdraw from shared wallet');
    } finally {
      setIsWithdrawing(false);
    }
  }, [wallet, currentUser?.id, withdrawAmount, selectedWithdrawCard]);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await Clipboard.setString(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      logger.error('Error copying to clipboard', error, 'SharedWalletDetailsScreen');
    }
  }, []);

  // Show loading only if wallet is not available yet
  if (isLoadingWallet && !wallet) {
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
  const userMember = wallet.members.find(m => m.userId === currentUser?.id?.toString());
  const userContribution = userMember?.totalContributed || 0;
  const userWithdrawn = userMember?.totalWithdrawn || 0;
  const userBalance = userContribution - userWithdrawn;
  const userLinkedCards = linkedCards.filter(card => 
    userMember?.linkedCards?.includes(card.id)
  );

  return (
    <Container>
      <Header
        title={wallet.name}
        onBackPress={handleBack}
        showBackButton={true}
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.navigate('SharedWalletSettings', {
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
        {/* Hero Section - Balance Card with Clean Design */}
        <View style={styles.heroSection}>
          <BalanceCard
            balance={wallet.totalBalance}
            currency={wallet.currency}
            status={wallet.status}
            customColor={wallet.customColor}
            customLogo={wallet.customLogo}
          />
        </View>

        {/* Quick Actions - Clean Grid Layout */}
        <View style={styles.actionsSection}>
          <ActionButtons
            onTopUp={() => setShowTopUpModal(true)}
            onLinkCard={handleLinkCard}
            onWithdraw={() => {
              if (userLinkedCards.length === 0) {
                Alert.alert('No Cards', 'Please link a card first to withdraw funds');
                return;
              }
              setShowWithdrawModal(true);
            }}
            canWithdraw={userLinkedCards.length > 0}
          />
        </View>

        {/* Stats Row - Minimalist Horizontal Layout */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{wallet.members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statusBadgeInline}>
              <View style={[styles.statusDot, { backgroundColor: wallet.status === 'active' ? colors.green : colors.white50 }]} />
              <Text style={[styles.statValue, { fontSize: typography.fontSize.sm }]}>{wallet.status}</Text>
            </View>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Your Balance - Clean Card Design */}
        {userMember && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceCardHeader}>
              <Text style={styles.balanceCardTitle}>Your Balance</Text>
              {userBalance > 0 && (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>Available</Text>
                </View>
              )}
            </View>
            <View style={styles.balanceCardContent}>
              <Text style={styles.balanceCardAmount}>
                {formatBalance(userContribution, wallet.currency)}
              </Text>
              {userBalance > 0 && (
                <Text style={styles.balanceCardSubtext}>
                  {formatBalance(userBalance, wallet.currency)} available to withdraw
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Linked Cards - Clean List Design */}
        <View style={styles.cardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Cards</Text>
            <TouchableOpacity onPress={handleLinkCard} activeOpacity={0.7}>
              <View style={styles.addButton}>
                <PhosphorIcon name="Plus" size={14} color={colors.green} weight="bold" />
              </View>
            </TouchableOpacity>
          </View>
          
          {isLoadingCards ? (
            <View style={styles.loadingContainer}>
              <ModernLoader size="small" text="Loading cards..." />
            </View>
          ) : userLinkedCards.length > 0 ? (
            <View style={styles.cardsList}>
              {userLinkedCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.cardItem}
                  onPress={() => {
                    setSelectedWithdrawCard(card);
                    setShowWithdrawModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardItemLeft}>
                    <View style={styles.cardItemInfo}>
                      <Text style={styles.cardItemName}>{card.label}</Text>
                      <Text style={styles.cardItemType}>{card.cardType || 'Card'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardItemRight}>
                    <TouchableOpacity
                      style={styles.cardItemAction}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUnlinkCard(card);
                      }}
                      activeOpacity={0.7}
                    >
                      <PhosphorIcon name="X" size={14} color={colors.white50} weight="bold" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {linkedCards.length > 0 ? 'No cards linked' : 'No cards available'}
              </Text>
              <Button
                title={linkedCards.length > 0 ? "Link a Card" : "Add Card"}
                onPress={linkedCards.length > 0 ? handleLinkCard : () => navigation.navigate('LinkedCards', {
                  returnRoute: 'SharedWalletDetails',
                  returnParams: { walletId: wallet.id, wallet: wallet },
                })}
                variant="secondary"
                size="small"
                style={styles.emptyStateButton}
              />
            </View>
          )}
        </View>

        {/* Members - Clean Section */}
        <View style={styles.membersSection}>
          <MembersList
            members={wallet.members}
            currency={wallet.currency}
            showParticipationCircle={true}
          />
        </View>

        {/* Transactions - Clean Section */}
        <View style={styles.transactionsSection}>
          <TransactionHistory
            transactions={transactions}
            isLoading={isLoadingTransactions}
            variant="sharedWallet"
            onTransactionPress={(tx) => {
              logger.debug('Transaction pressed', { transactionId: tx.id }, 'SharedWalletDetailsScreen');
            }}
          />
        </View>

        {/* Wallet Address - Minimalist Design */}
        <View style={styles.addressSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wallet Address</Text>
            <TouchableOpacity
              onPress={() => handleCopy(wallet.walletAddress, 'Wallet address')}
              activeOpacity={0.7}
              style={styles.copyButtonMinimal}
            >
              <PhosphorIcon name="Copy" size={14} color={colors.green} weight="regular" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => handleCopy(wallet.walletAddress, 'Wallet address')}
            activeOpacity={0.7}
          >
            <Text style={styles.addressText} numberOfLines={1}>
              {wallet.walletAddress}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal
        visible={showTopUpModal}
        onClose={() => {
          setShowTopUpModal(false);
          setTopUpAmount('');
        }}
        title="Top Up Shared Wallet"
      >
        <View style={styles.modalContent}>
          <Input
            label="Amount (USDC)"
            placeholder="0.00"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
            keyboardType="decimal-pad"
            leftIcon="CurrencyDollar"
          />

          <Text style={styles.modalSectionTitle}>Funding Source</Text>
          
          <TouchableOpacity
            style={[styles.sourceOption, topUpSource === 'in-app-wallet' && styles.sourceOptionActive]}
            onPress={() => setTopUpSource('in-app-wallet')}
            activeOpacity={0.7}
          >
            <View style={styles.sourceOptionInfo}>
              <Text style={styles.sourceOptionTitle}>In-App Wallet</Text>
              <Text style={styles.sourceOptionSubtitle}>
                {appWalletBalanceLocal !== null 
                  ? `Balance: ${formatBalance(appWalletBalanceLocal)}` 
                  : appWalletBalance !== null 
                    ? `Balance: ${formatBalance(appWalletBalance)}` 
                    : 'Loading...'}
              </Text>
            </View>
            {topUpSource === 'in-app-wallet' && (
              <View style={styles.checkIndicator} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceOption, topUpSource === 'moonpay' && styles.sourceOptionActive]}
            onPress={() => setTopUpSource('moonpay')}
            activeOpacity={0.7}
          >
            <View style={styles.sourceOptionInfo}>
              <Text style={styles.sourceOptionTitle}>Credit/Debit Card</Text>
              <Text style={styles.sourceOptionSubtitle}>Via MoonPay</Text>
            </View>
            {topUpSource === 'moonpay' && (
              <View style={styles.checkIndicator} />
            )}
          </TouchableOpacity>

          <Button
            title={isFunding ? 'Processing...' : 'Top Up'}
            onPress={handleTopUp}
            variant="primary"
            disabled={!topUpAmount || isFunding}
            loading={isFunding}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          setSelectedWithdrawCard(null);
        }}
        title="Withdraw to Card"
      >
        <View style={styles.modalContent}>
          {!selectedWithdrawCard && (
            <>
              <Text style={styles.modalSectionTitle}>Select Card</Text>
              {userLinkedCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardOption, selectedWithdrawCard?.id === card.id && styles.sourceOptionActive]}
                  onPress={() => setSelectedWithdrawCard(card)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sourceOptionInfo}>
                    <Text style={styles.sourceOptionTitle}>{card.label}</Text>
                    <Text style={styles.sourceOptionSubtitle}>{card.cardType || 'Card'}</Text>
                  </View>
                  {selectedWithdrawCard?.id === card.id && (
                    <View style={styles.checkIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {selectedWithdrawCard && (
            <>
              <TouchableOpacity
                style={styles.selectedCardDisplay}
                onPress={() => setSelectedWithdrawCard(null)}
                activeOpacity={0.7}
              >
                <View style={styles.sourceOptionInfo}>
                  <Text style={styles.sourceOptionTitle}>{selectedWithdrawCard.label}</Text>
                  <Text style={styles.sourceOptionSubtitle}>Tap to change</Text>
                </View>
              </TouchableOpacity>

              <Input
                label="Amount (USDC)"
                placeholder="0.00"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
                leftIcon="CurrencyDollar"
              />

              <Text style={styles.availableBalanceText}>
                Available: {formatBalance(userBalance, wallet.currency)}
              </Text>

              <Button
                title={isWithdrawing ? 'Processing...' : 'Withdraw'}
                onPress={handleWithdraw}
                variant="primary"
                disabled={!withdrawAmount || isWithdrawing}
                loading={isWithdrawing}
                style={styles.modalButton}
              />
            </>
          )}
        </View>
      </Modal>

      {/* Link Card Modal */}
      <Modal
        visible={showLinkCardModal}
        onClose={() => {
          setShowLinkCardModal(false);
          // Reload cards when modal closes
          if (wallet && currentUser?.id) {
            loadLinkedCards();
          }
        }}
        title="Link Card to Shared Wallet"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalSectionTitle}>Select a card or wallet to link</Text>
          {isLoadingCards ? (
            <View style={styles.loadingContainer}>
              <ModernLoader size="small" text="Loading..." />
            </View>
          ) : (() => {
            // Filter out items that are already linked to this shared wallet
            const userMember = wallet?.members.find(m => m.userId === currentUser?.id?.toString());
            
            // Get available cards (not already linked)
            const availableCards = linkedCards.filter(card => {
              const isAlreadyLinked = userMember?.linkedCards?.includes(card.id);
              return !isAlreadyLinked;
            });
            
            // Get available wallets (not already linked)
            const availableWallets = linkedWallets.filter(w => {
              const isAlreadyLinked = userMember?.linkedCards?.includes(w.id);
              return !isAlreadyLinked;
            });
            
            // If we have cards, show them. Otherwise, show wallets if available
            const itemsToShow = availableCards.length > 0 ? availableCards : availableWallets;
            const isShowingWallets = availableCards.length === 0 && availableWallets.length > 0;
            
            logger.info('Link modal items', {
              availableCards: availableCards.length,
              availableWallets: availableWallets.length,
              itemsToShow: itemsToShow.length,
              isShowingWallets
            }, 'SharedWalletDetailsScreen');
            
            if (itemsToShow.length === 0) {
              // No cards or wallets available
              return (
                <View style={styles.noCardsContainer}>
                  <Text style={styles.noCardsText}>
                    {linkedCards.length === 0 && linkedWallets.length === 0
                      ? 'No cards or wallets available'
                      : 'All available items are already linked'}
                  </Text>
                  <Button
                    title="Add Card or Wallet"
                    onPress={() => {
                      setShowLinkCardModal(false);
                      navigation.navigate('LinkedCards', {
                        returnRoute: 'SharedWalletDetails',
                        returnParams: { walletId: wallet?.id, wallet: wallet },
                      });
                    }}
                    variant="primary"
                    style={styles.modalButton}
                  />
                </View>
              );
            }
            
            // Show available items
            return (
              <>
                {isShowingWallets && (
                  <Text style={styles.modalSectionSubtitle}>
                    No cards available. Showing external wallets:
                  </Text>
                )}
                {itemsToShow.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cardOption}
                    onPress={() => handleLinkCardToWallet(item)}
                    disabled={isLinkingCard}
                    activeOpacity={0.7}
                  >
                    <PhosphorIcon 
                      name={item.type === 'kast' ? "CreditCard" : "Wallet"} 
                      size={20} 
                      color={colors.green} 
                      weight="fill" 
                    />
                    <View style={styles.sourceOptionInfo}>
                      <Text style={styles.sourceOptionTitle}>{item.label}</Text>
                      <Text style={styles.sourceOptionSubtitle}>
                        {item.type === 'kast' ? (item.cardType || 'Card') : 'External Wallet'}
                      </Text>
                    </View>
                    {isLinkingCard ? (
                      <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                        <ModernLoader size="small" text="" />
                      </View>
                    ) : (
                      <PhosphorIcon name="Plus" size={18} color={colors.green} weight="bold" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            );
          })()}
        </View>
      </Modal>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  // Hero Section - Clean Balance Display
  heroSection: {
    marginBottom: spacing.xs,
  },
  // Actions Section - Clean Grid
  actionsSection: {
    marginBottom: spacing.xs,
  },
  // Stats Row - Minimalist Horizontal Cards
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
    minHeight: 64,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
    lineHeight: typography.fontSize.lg * 1.2,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontWeight: typography.fontWeight.regular,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: typography.fontSize.xs * 1.2,
  },
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Balance Card - Clean Design
  balanceCard: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    marginBottom: spacing.xs,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceCardTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white50,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs / 2,
    paddingVertical: 1,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.xs / 2,
    borderWidth: 0.5,
    borderColor: colors.green + '25',
  },
  availableBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  balanceCardContent: {
    gap: spacing.xs / 2,
  },
  balanceCardAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    lineHeight: typography.fontSize.xl * 1.2,
  },
  balanceCardSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  // Cards Section - Clean List
  cardsSection: {
    marginBottom: spacing.xs,
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
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    lineHeight: typography.fontSize.sm * 1.3,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenBlue20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  cardsList: {
    gap: spacing.xs,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    marginBottom: spacing.xs,
  },
  cardItemLeft: {
    flex: 1,
  },
  cardItemInfo: {
    flex: 1,
  },
  cardItemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
    lineHeight: typography.fontSize.sm * 1.3,
  },
  cardItemType: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    lineHeight: typography.fontSize.xs * 1.2,
  },
  cardItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardItemAction: {
    padding: spacing.xs / 2,
    borderRadius: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.3,
  },
  emptyStateButton: {
    marginTop: spacing.xs,
  },
  // Members Section
  membersSection: {
    marginBottom: spacing.xs,
  },
  // Transactions Section
  transactionsSection: {
    marginBottom: spacing.xs,
  },
  // Address Section - Minimalist
  addressSection: {
    marginBottom: spacing.xs,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontFamily: 'monospace',
    lineHeight: typography.fontSize.xs * 1.3,
  },
  copyButtonMinimal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.greenBlue20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  // Loading
  loadingContainer: {
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: spacing.xs / 2,
  },
  modalSectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
    marginTop: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  modalSectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginBottom: spacing.xs / 2,
    fontStyle: 'italic',
    lineHeight: typography.fontSize.xs * 1.2,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  sourceOptionActive: {
    backgroundColor: colors.greenBlue20,
    borderWidth: 0.5,
    borderColor: colors.green,
  },
  sourceOptionInfo: {
    flex: 1,
  },
  sourceOptionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  sourceOptionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginTop: 1,
    lineHeight: typography.fontSize.xs * 1.2,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  selectedCardDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
    borderWidth: 0.5,
    borderColor: colors.green + '40',
  },
  availableBalanceText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  checkIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 0.5,
    borderColor: colors.green,
  },
  modalButton: {
    marginTop: spacing.xs / 2,
  },
  // Modal Styles - Keep existing
});

export default SharedWalletDetailsScreen;
