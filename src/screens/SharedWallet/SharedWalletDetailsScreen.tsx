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
  }, [wallet, currentUser?.id, topUpAmount, topUpSource, appWalletAddress, appWalletBalance, formatBalance, navigation]);

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
            <PhosphorIcon name="Gear" size={24} color={colors.white} weight="regular" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <BalanceCard
          balance={wallet.totalBalance}
          currency={wallet.currency}
          status={wallet.status}
          customColor={wallet.customColor}
          customLogo={wallet.customLogo}
        />

        {/* Action Buttons */}
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

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Members</Text>
            <Text style={styles.statValue}>{wallet.members.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValue}>{transactions.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: wallet.status === 'active' ? colors.green : colors.white50 }]} />
              <Text style={styles.statValue}>{wallet.status}</Text>
            </View>
          </View>
        </View>

        {/* Your Contribution */}
        {userMember && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Contribution</Text>
            <View style={styles.contributionContainer}>
              <Text style={styles.contributionValue}>
                {formatBalance(userContribution, wallet.currency)}
              </Text>
              {userBalance > 0 && (
                <View style={styles.availableBalanceContainer}>
                  <PhosphorIcon name="CheckCircle" size={16} color={colors.green} weight="fill" />
                  <Text style={styles.availableBalance}>
                    {formatBalance(userBalance, wallet.currency)} available
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Linked Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Linked Cards</Text>
            <TouchableOpacity onPress={handleLinkCard} activeOpacity={0.7}>
              <View style={styles.linkCardButton}>
                <PhosphorIcon name="Plus" size={16} color={colors.green} weight="bold" />
                <Text style={styles.linkCardText}>Link Card</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {isLoadingCards ? (
            <View style={styles.loadingCardsContainer}>
              <ModernLoader size="small" text="Loading cards..." />
            </View>
          ) : userLinkedCards.length > 0 ? (
            userLinkedCards.map((card) => (
              <View key={card.id} style={styles.cardRowContainer}>
                <TouchableOpacity
                  style={styles.cardRow}
                  onPress={() => {
                    setSelectedWithdrawCard(card);
                    setShowWithdrawModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <PhosphorIcon name="CreditCard" size={24} color={colors.green} weight="fill" />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{card.label}</Text>
                    <Text style={styles.cardType}>{card.cardType || 'Card'}</Text>
                  </View>
                  <PhosphorIcon name="CaretRight" size={20} color={colors.white70} weight="regular" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={() => handleUnlinkCard(card)}
                  activeOpacity={0.7}
                >
                  <PhosphorIcon name="X" size={16} color={colors.error} weight="bold" />
                </TouchableOpacity>
              </View>
            ))
          ) : linkedCards.length > 0 ? (
            <View style={styles.noLinkedCardsContainer}>
              <Text style={styles.noLinkedCardsText}>No cards linked to this wallet</Text>
              <Button
                title="Link a Card"
                onPress={handleLinkCard}
                variant="secondary"
                size="small"
                style={styles.linkCardButton}
              />
            </View>
          ) : (
            <View style={styles.noLinkedCardsContainer}>
              <Text style={styles.noLinkedCardsText}>No cards available</Text>
              <Button
                title="Add Card"
                onPress={() => navigation.navigate('LinkedCards', {
                  returnRoute: 'SharedWalletDetails',
                  returnParams: { walletId: wallet.id, wallet: wallet },
                })}
                variant="secondary"
                size="small"
                style={styles.linkCardButton}
              />
            </View>
          )}
        </View>

        {/* Members List with Participation Circle */}
        <MembersList
          members={wallet.members}
          currency={wallet.currency}
          showParticipationCircle={true}
        />

        {/* Transaction History */}
        <TransactionHistory
          transactions={transactions}
          isLoading={isLoadingTransactions}
          variant="sharedWallet"
          onTransactionPress={(tx) => {
            // Could navigate to transaction details if needed
            logger.debug('Transaction pressed', { transactionId: tx.id }, 'SharedWalletDetailsScreen');
          }}
        />

        {/* Wallet Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wallet Address</Text>
            <TouchableOpacity
              onPress={() => handleCopy(wallet.walletAddress, 'Wallet address')}
              activeOpacity={0.7}
              style={styles.copyButton}
            >
              <PhosphorIcon name="Copy" size={18} color={colors.green} weight="regular" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addressContainer}
            onPress={() => handleCopy(wallet.walletAddress, 'Wallet address')}
            activeOpacity={0.7}
          >
            <PhosphorIcon name="Wallet" size={20} color={colors.white70} weight="regular" />
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
            <PhosphorIcon name="Wallet" size={24} color={topUpSource === 'in-app-wallet' ? colors.green : colors.white70} weight="fill" />
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
              <PhosphorIcon name="CheckCircle" size={20} color={colors.green} weight="fill" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceOption, topUpSource === 'moonpay' && styles.sourceOptionActive]}
            onPress={() => setTopUpSource('moonpay')}
            activeOpacity={0.7}
          >
            <PhosphorIcon name="CreditCard" size={24} color={topUpSource === 'moonpay' ? colors.green : colors.white70} weight="fill" />
            <View style={styles.sourceOptionInfo}>
              <Text style={styles.sourceOptionTitle}>Credit/Debit Card</Text>
              <Text style={styles.sourceOptionSubtitle}>Via MoonPay</Text>
            </View>
            {topUpSource === 'moonpay' && (
              <PhosphorIcon name="CheckCircle" size={20} color={colors.green} weight="fill" />
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
                  style={styles.cardOption}
                  onPress={() => setSelectedWithdrawCard(card)}
                  activeOpacity={0.7}
                >
                  <PhosphorIcon name="CreditCard" size={24} color={colors.green} weight="fill" />
                  <View style={styles.sourceOptionInfo}>
                    <Text style={styles.sourceOptionTitle}>{card.label}</Text>
                    <Text style={styles.sourceOptionSubtitle}>{card.cardType || 'Card'}</Text>
                  </View>
                  <PhosphorIcon name="CaretRight" size={20} color={colors.white70} weight="regular" />
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
                <PhosphorIcon name="CreditCard" size={24} color={colors.green} weight="fill" />
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
                      size={24} 
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
                      <PhosphorIcon name="Plus" size={20} color={colors.green} weight="bold" />
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
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  linkCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.sm,
  },
  linkCardText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  contributionContainer: {
    gap: spacing.xs,
  },
  availableBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs,
  },
  loadingCardsContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  contributionValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  availableBalance: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    marginTop: spacing.xs,
  },
  cardRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
    gap: spacing.sm,
  },
  unlinkButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLinkedCardsContainer: {
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  noLinkedCardsText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  linkCardButton: {
    marginTop: spacing.xs,
  },
  noCardsContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  noCardsText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
  },
  allCardsLinkedText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    padding: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  cardType: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    padding: spacing.md,
    borderRadius: spacing.sm,
    gap: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.sm,
  },
  copyButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  modalContent: {
    gap: spacing.md,
  },
  modalSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalSectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sourceOptionActive: {
    backgroundColor: colors.greenBlue20,
    borderWidth: 1,
    borderColor: colors.green,
  },
  sourceOptionInfo: {
    flex: 1,
  },
  sourceOptionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  sourceOptionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: 2,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  selectedCardDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  availableBalanceText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginBottom: spacing.xs / 2,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.white10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default SharedWalletDetailsScreen;
