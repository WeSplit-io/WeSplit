import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  Switch,
  Alert,
  ActivityIndicator,
  Clipboard,
  Modal,
  Animated,
  PanResponder,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import NavBar from '../../components/shared/NavBar';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
import { walletService, UserWalletBalance, SolanaAppKitService } from '../../services/blockchain/wallet';
import { multiSignStateService } from '../../services/core';
import { MultiSignStateService } from '../../services/core/multiSignStateService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './styles';
import { QRCodeScreen } from '../QRCode';
import { createUsdcRequestUri } from '../../services/core/solanaPay';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';

const WalletManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { state } = useApp();
  const currentUser = state.currentUser;
  const {
    // External wallet state (for funding/withdrawals)
    walletInfo,
    isConnected: externalWalletConnected,
    balance: externalWalletBalance,
    // App wallet state (for internal transactions)
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet,
    getAppWalletBalance,
    getAppWalletInfo
  } = useWallet();

  // Local state
  const [localAppWalletBalance, setLocalAppWalletBalance] = useState<UserWalletBalance | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [multiSignEnabled, setMultiSignEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [multiSignRemainingDays, setMultiSignRemainingDays] = useState<number>(0);
  const [showMultiSignExplanation, setShowMultiSignExplanation] = useState(false);
  const [showMultiSignActivated, setShowMultiSignActivated] = useState(false);
  const [sliderValue] = useState(new Animated.Value(0));
  const [isSliderActive, setIsSliderActive] = useState(false);
  const [showQRCodeScreen, setShowQRCodeScreen] = useState(false);
  
  // Initialize SolanaAppKitService for multi-signature operations
  const solanaAppKitService = new SolanaAppKitService();

  // Load multi-sign state on component mount
  useEffect(() => {
    const loadMultiSignState = async () => {
      try {
        const isEnabled = await MultiSignStateService.loadMultiSignState();
        setMultiSignEnabled(isEnabled);

        if (isEnabled) {
          const remainingDays = await MultiSignStateService.getRemainingDays();
          setMultiSignRemainingDays(remainingDays);
        }
      } catch (error) {
        console.error('Error loading multi-sign state:', error);
        setMultiSignEnabled(false);
      }
    };

    loadMultiSignState();
  }, []);

  // Load wallet information
  useEffect(() => {
    const loadWalletInfo = async () => {
      if (!currentUser?.id) {return;}

      try {
        setIsLoading(true);

        // Initialize app wallet for the user
        logger.info('Initializing app wallet for user', { userId: currentUser.id }, 'WalletManagementScreen');
        
        // Ensure user has a wallet using context function
        const walletResult = await ensureAppWallet(currentUser.id.toString());

        if (walletResult.success && walletResult.wallet) {
          if (__DEV__) { logger.info('Wallet ensured for user', { address: walletResult.wallet.address }, 'WalletManagementScreen'); }

          // Load app wallet balance using context function
          const balance = await getAppWalletBalance(currentUser.id.toString());
          setLocalAppWalletBalance({ 
            totalUSD: balance, 
            usdcBalance: balance, 
            solBalance: 0,
            address: walletResult.wallet.address,
            isConnected: true
          });

          // Load transactions using consolidated function
          await loadTransactions(false);

          // Load multi-signature wallets and transactions
          await loadMultiSigData();
        } else {
          console.error('❌ Failed to ensure wallet:', walletResult.error);
          // Show error state
          setLocalAppWalletBalance(null);

          // Check if this is an unrecoverable wallet error
          const errorMessage = walletResult.error || '';
          if (errorMessage.includes('unrecoverable')) {
            Alert.alert(
              'Wallet Recovery Failed',
              'Your wallet cannot be recovered with the current seed phrase. You can create a new wallet, but any funds in the old wallet will be lost unless you can recover the private key.\n\nWould you like to create a new wallet?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Create New Wallet',
                  onPress: async () => {
                    try {
                      // Clear existing wallet data first
                      // Note: This would need to be implemented in the wallet service
                      console.log('Clearing wallet data for user:', currentUser.id);

                      // Create a new wallet using context function
                      const newWalletResult = await ensureAppWallet(currentUser.id.toString());

                      if (newWalletResult.success && newWalletResult.wallet) {
                        Alert.alert(
                          'New Wallet Created',
                          `Your new wallet has been created successfully!\n\nAddress: ${newWalletResult.wallet.address}\n\nPlease save your seed phrase securely.`,
                          [{
                            text: 'OK',
                            onPress: () => {
                              // Reload wallet info
                              loadWalletInfo();
                            }
                          }]
                        );
                      } else {
                        Alert.alert(
                          'Error',
                          `Failed to create new wallet: ${newWalletResult.error}`,
                          [{ text: 'OK' }]
                        );
                      }
                    } catch (error) {
                      console.error('Error creating new wallet:', error);
                      Alert.alert(
                        'Error',
                        'Failed to create new wallet. Please try again or contact support.',
                        [{ text: 'OK' }]
                      );
                    }
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              'Wallet Error',
              'Failed to initialize your wallet. Please try again or contact support if the issue persists.',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Error loading wallet info:', error);
        setLocalAppWalletBalance(null);
        Alert.alert(
          'Loading Error',
          'Failed to load wallet information. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletInfo();
  }, [currentUser?.id]);

  // Monitor balance changes
  useEffect(() => {
    if (localAppWalletBalance) {
      logger.info('Balance updated', { totalUSD: localAppWalletBalance.totalUSD, usdcBalance: localAppWalletBalance.usdcBalance }, 'WalletManagementScreen');
    }
  }, [localAppWalletBalance?.totalUSD, localAppWalletBalance?.usdcBalance]);

  // Load multi-signature data
  const loadMultiSigData = async () => {
    if (!currentUser?.id) {return;}

    try {
      // Load user's multi-signature wallets
      const userMultiSigWallets = await solanaAppKitService.getUserMultiSigWallets(currentUser.id.toString());

      if (__DEV__) {
        logger.info('Multi-signature data loaded', {
          walletsCount: userMultiSigWallets.length
        });
      }
    } catch (error) {
      console.error('Error loading multi-signature data:', error);
    }
  };

  // Consolidated transaction loading function
  const loadTransactions = async (showLoading = false) => {
    if (!currentUser?.id) {
      setLoadingTransactions(false);
      return;
    }

    try {
      if (showLoading) {
        setLoadingTransactions(true);
      }

      // Get user's transactions from Firebase
      const userTransactions = await firebaseDataService.transaction.getUserTransactions(
        currentUser.id.toString()
      );

      // Transform transactions for display with enhanced data
      const formattedTransactions = await Promise.all(
        userTransactions.map(async (tx) => {
          // Determine if this is an incoming or outgoing transaction
          const isIncoming = tx.to_user === currentUser.id.toString();
          const isOutgoing = tx.from_user === currentUser.id.toString();

          // Get recipient/sender name
          let recipientName = 'Unknown';
          let senderName = 'Unknown';

          try {
            // Always fetch both sender and recipient names for proper display
            if (tx.from_user) {
              const sender = await firebaseDataService.user.getCurrentUser(tx.from_user);
              senderName = sender.name || 'Unknown';
              if (__DEV__) {
                logger.debug('Fetched sender', { userId: tx.from_user, name: senderName }, 'WalletManagementScreen');
              }
            }
            if (tx.to_user) {
              const recipient = await firebaseDataService.user.getCurrentUser(tx.to_user);
              recipientName = recipient.name || 'Unknown';
              if (__DEV__) {
                logger.debug('Fetched recipient', { userId: tx.to_user, name: recipientName }, 'WalletManagementScreen');
              }
            }
          } catch (error) {
            logger.warn('Could not fetch user details for transaction', { transactionId: tx.id, error: error instanceof Error ? error.message : String(error) }, 'WalletManagementScreen');
          }

          return {
            id: tx.id,
            type: tx.type || 'send',
            recipient: isIncoming ? senderName : recipientName, // For incoming: show sender name, for outgoing: show recipient name
            sender: isIncoming ? recipientName : senderName,    // For incoming: show recipient name, for outgoing: show sender name
            note: tx.note || '',
            amount: tx.amount || 0,
            date: tx.created_at || new Date().toISOString(),
            status: tx.status || 'pending',
            currency: tx.currency || 'USDC',
            from_user: tx.from_user,
            to_user: tx.to_user,
            isIncoming,
            isOutgoing
          };
        })
      );

      setTransactions(formattedTransactions);

      if (__DEV__) {
        logger.info('Loaded transactions', { count: formattedTransactions.length }, 'WalletManagementScreen');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to empty array
      setTransactions([]);
    } finally {
      if (showLoading) {
        setLoadingTransactions(false);
      }
    }
  };

  // Load transactions on component mount
  useEffect(() => {
    loadTransactions(true);
  }, [currentUser?.id]);

  const handleBack = () => {
    navigation.goBack();
  };


  const handleCopyAddress = async (address: string) => {
    try {
      await Clipboard.setString(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (!currentUser?.id) {return;}

      logger.info('Manual refresh triggered', null, 'WalletManagementScreen');

      // Ensure user has a wallet first
      const walletResult = await ensureAppWallet(currentUser.id.toString());

      if (walletResult.success && walletResult.wallet) {
        logger.info('Refreshing wallet balance', null, 'WalletManagementScreen');

        // Refresh app wallet balance using context function
        const balance = await getAppWalletBalance(currentUser.id.toString());

        if (balance !== null && balance !== undefined) {
          logger.info('New balance detected', { totalUSD: balance }, 'WalletManagementScreen');

          // Update local balance state
          setLocalAppWalletBalance({ 
            totalUSD: balance, 
            usdcBalance: balance, 
            solBalance: 0,
            address: walletResult.wallet.address,
            isConnected: true
          });
        } else {
          console.error('❌ WalletManagement: Failed to get wallet balance');
        }

        // Refresh transactions using consolidated function
        await loadTransactions(false);

        // Refresh multi-signature data
        await loadMultiSigData();

        // Refresh multi-sign state
        const isEnabled = await MultiSignStateService.loadMultiSignState();
        setMultiSignEnabled(isEnabled);

        if (isEnabled) {
          const remainingDays = await MultiSignStateService.getRemainingDays();
          setMultiSignRemainingDays(remainingDays);
        }

        logger.info('Refresh completed successfully', null, 'WalletManagementScreen');
      } else {
        console.error('❌ Failed to ensure wallet during refresh:', walletResult.error);
      }
    } catch (error) {
      console.error('❌ WalletManagement: Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewTransactions = () => {
    // Navigate to transaction history screen
    navigation.navigate('TransactionHistory');
  };

  const handleMultiSignToggle = async (value: boolean) => {
    if (value) {
      // Show multi-sign explanation modal
      setShowMultiSignExplanation(true);
    } else {
      try {
        await MultiSignStateService.saveMultiSignState(false);
        setMultiSignEnabled(false);
        setMultiSignRemainingDays(0);
      } catch (error) {
        console.error('Error saving multi-sign state:', error);
        Alert.alert('Error', 'Failed to update multi-sign state');
      }
    }
  };


  const handleApproveTransaction = async (transactionId: string) => {
    try {
      if (!currentUser?.id) {return;}

      const result = await solanaAppKitService.approveMultiSigTransaction('', transactionId, currentUser.id.toString());

      if (result) {
        Alert.alert('Success', 'Transaction approved successfully!');
        // Reload multi-signature data
        await loadMultiSigData();
      } else {
        Alert.alert('Error', 'Failed to approve transaction');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      Alert.alert('Error', 'Failed to approve transaction');
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      if (!currentUser?.id) {return;}

      const result = await solanaAppKitService.rejectMultiSigTransaction('', transactionId, currentUser.id.toString());

      if (result) {
        Alert.alert('Success', 'Transaction rejected successfully!');
        // Reload multi-signature data
        await loadMultiSigData();
      } else {
        Alert.alert('Error', 'Failed to reject transaction');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      Alert.alert('Error', 'Failed to reject transaction');
    }
  };


  // Apple-style slider component
  const appleSlider = () => {
    const maxSlideDistance = 300; // Adjusted for container width minus thumb width

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSliderActive(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
        sliderValue.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > maxSlideDistance * 0.6) { // 60% threshold
          // Complete the slide animation
          Animated.timing(sliderValue, {
            toValue: maxSlideDistance,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            // Activate multi-sign
            setShowMultiSignExplanation(false);
            setShowMultiSignActivated(true);
            // Reset slider
            setTimeout(() => {
              sliderValue.setValue(0);
              setIsSliderActive(false);
            }, 1000);
          });
        } else {
          // Reset to start position
          Animated.timing(sliderValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            setIsSliderActive(false);
          });
        }
      },
    });

    return (
      <View style={styles.appleSliderContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.appleSliderTrack,
            {
              backgroundColor: sliderValue.interpolate({
                inputRange: [0, maxSlideDistance],
                outputRange: [colors.green10, colors.primaryGreen],
              }),
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.appleSliderText,
              {
                color: sliderValue.interpolate({
                  inputRange: [0, maxSlideDistance],
                  outputRange: [colors.white50, colors.black],
                }),
              },
            ]}
          >
            Slide to activate
          </Animated.Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.appleSliderThumb,
            {
              transform: [{ translateX: sliderValue }],
            },
          ]}
        >
          <Icon name="chevron-right" size={20} color={colors.black} />
        </Animated.View>
      </View>
    );
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) {return 'No address';}
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Get display balance based on active wallet
  const getDisplayBalance = () => {
    // For wallet management, show app wallet balance as primary
    if (appWalletBalance !== null && appWalletBalance !== undefined) {
      return appWalletBalance;
    }
    // Fallback to local balance if context balance not available
    if (localAppWalletBalance !== null && localAppWalletBalance.totalUSD !== undefined) {
      return localAppWalletBalance.totalUSD;
    }
    // Fallback to external wallet balance if app wallet not available
    if (externalWalletConnected && externalWalletBalance !== null) {
      return externalWalletBalance;
    }
    return 0;
  };

  const renderTransactions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <TouchableOpacity onPress={handleViewTransactions}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      {loadingTransactions ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primaryGreen}
            style={styles.loader}
          />
          <Text style={styles.loaderText}>Loading transactions...</Text>
        </View>
      ) : transactions.length > 0 ? (
        transactions.slice(0, 5).map((transaction) => {
          const transactionTime = new Date(transaction.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const transactionDate = new Date(transaction.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });

          // Determine transaction type and styling using enhanced data
          const isIncoming = transaction.isIncoming || transaction.type === 'receive';
          const isOutgoing = transaction.isOutgoing || transaction.type === 'send';
          const isDeposit = transaction.type === 'deposit';
          const isWithdraw = transaction.type === 'withdraw';

          // Get appropriate icon and color
          let transactionIcon;
          let transactionColor;
          let transactionTitle;
          let transactionSubtitle;

          if (isIncoming) {
            transactionIcon = require('../../../assets/icon-receive.png');
            transactionColor = colors.primaryGreen;
            transactionTitle = `Received from ${transaction.recipient || 'someone'}`;
            transactionSubtitle = `+$${transaction.amount.toFixed(2)}`;
          } else if (isOutgoing) {
              transactionIcon = require('../../../assets/icon-send.png');
              transactionColor = colors.textLight;
            transactionTitle = `Sent to ${transaction.recipient || 'someone'}`;
            transactionSubtitle = `-$${transaction.amount.toFixed(2)}`;
          } else if (isDeposit) {
            transactionIcon = require('../../../assets/card-add.png');
            transactionColor = colors.primaryGreen;
            transactionTitle = 'Deposit';
            transactionSubtitle = `+$${transaction.amount.toFixed(2)}`;
          } else if (isWithdraw) {
            transactionIcon = require('../../../assets/widthdraw-icon.png');
            transactionColor = colors.textLight;
            transactionTitle = 'Withdrawal';
            transactionSubtitle = `-$${transaction.amount.toFixed(2)}`;
          } else {
            transactionIcon = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' };
            transactionColor = colors.textLight;
            transactionTitle = transaction.recipient || 'Unknown';
            transactionSubtitle = `$${transaction.amount.toFixed(2)}`;
          }

          return (
            <TouchableOpacity
              key={transaction.id}
              style={styles.requestItemNew}
              onPress={() => {
                // Navigate to transaction details or show modal
                Alert.alert(
                  'Transaction Details',
                  `Type: ${transaction.type}\nAmount: $${transaction.amount.toFixed(2)}\nStatus: ${transaction.status}\nDate: ${transactionDate} ${transactionTime}\n${transaction.note ? `Note: ${transaction.note}` : ''}`,
                  [{ text: 'OK' }]
                );
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.transactionAvatarNew, { backgroundColor: colors.white5 }]}>
                <Image source={transactionIcon} style={styles.transactionIcon} />
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>{transactionTitle}</Text>
                <Text style={styles.transactionSubtitle}>
                  {transactionDate} • {transactionTime}
                </Text>
                {/*{transaction.note && (
                  <Text style={styles.transactionNote}>{transaction.note}</Text>
                )}*/}
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  styles.transactionAmount,
                  { color: isIncoming || isDeposit ? colors.primaryGreen : colors.textLight }
                ]}>
                  {isIncoming || isDeposit ? '+' : isOutgoing || isWithdraw ? '-' : ''}
                  {transaction.amount.toFixed(2)} USDC
                </Text>
                {/*<Text style={styles.transactionSource}>
                  {transaction.status === 'completed' ? 'Completed' :
                    transaction.status === 'pending' ? 'Pending' :
                      transaction.status === 'failed' ? 'Failed' : 'Unknown'}
                </Text>*/}
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyTransactions}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgroup-enpty-state.png?alt=media&token=c3f4dae7-1628-4d8a-9836-e413e3824ebd' }}
            style={{ width: 80, height: 80, marginBottom: spacing.md, opacity: 0.5 }}
          />
          <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
          <Text style={styles.emptyTransactionsSubtext}>
            Your transaction history will appear here once you start sending or receiving money
          </Text>
        </View>
      )}
    </View>
  );

  const handleExternalWalletConnectionSuccess = (result: any) => {
    logger.info('External wallet connected successfully', { result }, 'WalletManagementScreen');

    Alert.alert(
      'External Wallet Connected',
      `Successfully connected to your external wallet!\n\nYou can now transfer funds to your app wallet.`,
      [{ text: 'OK' }]
    );

    // Refresh the wallet data
    handleRefresh();
  };



  return (
    <Container>

      {/* Header */}
      <Header 
        title="Wallet"
        onBackPress={handleBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primaryGreen]}
            tintColor={colors.primaryGreen}
          />
        }
      >
        {/* Balance Card */}
        <ImageBackground
          source={require('../../../assets/wallet-bg.png')}
          style={[styles.balanceCard, { alignItems: 'flex-start' }]}
          resizeMode="cover"
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>
              WeSplit Wallet
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* QR Code Button for Profile Sharing */}
              <TouchableOpacity
                style={styles.qrCodeIcon}
                onPress={() => setShowQRCodeScreen(true)}
              >
                <Image
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fqr-code-scan.png?alt=media&token=3fc388bd-fdf7-4863-a8b1-9313490d6382' }}
                  style={styles.qrCodeImage}
                />
              </TouchableOpacity>
            </View>
          </View>

          {refreshing ? (
            <View style={styles.priceLoadingContainer}>
              <ActivityIndicator size="small" color={colors.black} />
              <Text style={styles.priceLoadingText}>
                Updating balance...
              </Text>
            </View>
          ) : (
            <View style={styles.balanceContainer}>
              {/* App Wallet Balance Display */}
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                    $ {(getDisplayBalance()).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Wallet Address with Copy Button */}
          <TouchableOpacity
            style={styles.walletAddressContainer}
            onPress={() => handleCopyAddress(appWalletAddress || '')}
          >
            <Text style={styles.balanceLimitText}>
              {formatAddress(appWalletAddress)}
            </Text>
            <Image
              source={require('../../../assets/copy-icon.png')}
              style={styles.copyIcon}
            />
          </TouchableOpacity>
        </ImageBackground>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Send')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/money-send.png')}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/money-recive.png')}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Deposit')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/card-add.png')}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('LinkedCards');
              }}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/link-icon.png')}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Link Wallet</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Transactions Section */}
        {renderTransactions()}

        {/* Add some bottom padding for better scrolling experience */}
        <View style={{ height: 20 }} />

      </ScrollView>

      {/* Multi-Sign Explanation Modal */}
      {showMultiSignExplanation && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMultiSignExplanation(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMultiSignExplanation(false)}
          >
            <TouchableOpacity
              style={styles.bottomSheet}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.handle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>What is multi-sign?</Text>
                <Text style={styles.explanationText}>
                  Multisign lets you approve once to authorize multiple payments at the same time,
                  saving you time by avoiding manual approval for each transaction.
                </Text>
              </View>

              <View style={styles.modalFooter}>
                {appleSlider()}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Multi-Sign Activated Modal */}
      {showMultiSignActivated && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMultiSignActivated(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
              <View style={styles.modalContent}>
                <View style={styles.successContainer}>
                  <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.successIcon} />
                  <Text style={styles.successTitle}>Multi-sign activated</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.goBackButton}
                  onPress={async () => {
                    try {
                      // Save multi-sign state
                      await MultiSignStateService.saveMultiSignState(true);
                      setShowMultiSignActivated(false);
                      // Refresh the multi-sign state
                      handleRefresh();
                    } catch (error) {
                      console.error('Error saving multi-sign state:', error);
                      Alert.alert('Error', 'Failed to activate multi-sign');
                    }
                  }}
                >
                  <Text style={styles.goBackButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <NavBar currentRoute="WalletManagement" navigation={navigation} />

      {/* QR Code Screen */}
      <Modal
        visible={showQRCodeScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQRCodeScreen(false)}
      >
        <QRCodeScreen
          onBack={() => setShowQRCodeScreen(false)}
          userPseudo={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
          userWallet={appWalletAddress || currentUser?.wallet_address || ''}
          qrValue={appWalletAddress || currentUser?.wallet_address || ''}
        />
      </Modal>
    </Container>
  );
};

export default WalletManagementScreen; 