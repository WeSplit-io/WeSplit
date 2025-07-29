import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
  Clipboard,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { userWalletService, UserWalletBalance } from '../../services/userWalletService';
import { multiSigService } from '../../services/multiSigService';
import { MultiSignStateService } from '../../services/multiSignStateService';
import { useWalletCreation } from '../../hooks/useWalletCreation';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './styles';
import QRCodeModal from '../../components/QRCodeModal';

const WalletManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { state } = useApp();
  const currentUser = state.currentUser;
  const { 
    // External wallet state (for funding/withdrawals)
    walletInfo, 
    isConnected: externalWalletConnected, 
    address: externalWalletAddress, 
    balance: externalWalletBalance, 
    walletName: externalWalletName, 
    chainId,
    // App wallet state (for internal transactions)
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet,
    getAppWalletBalance
  } = useWallet();
  const { walletExists, walletAddress, isLoading: walletLoading, ensureWallet } = useWalletCreation();

  // Local state
  const [localAppWalletBalance, setLocalAppWalletBalance] = useState<UserWalletBalance | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [multiSignEnabled, setMultiSignEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [multiSigWallets, setMultiSigWallets] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [multiSignRemainingDays, setMultiSignRemainingDays] = useState<number>(0);
  const [showMultiSignExplanation, setShowMultiSignExplanation] = useState(false);
  const [showMultiSignActivated, setShowMultiSignActivated] = useState(false);
  const [sliderValue] = useState(new Animated.Value(0));
  const [isSliderActive, setIsSliderActive] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);


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
      if (!currentUser?.id) return;

      try {
        setIsLoading(true);

        // Initialize app wallet for the user
        console.log('🔍 WalletManagement: Initializing app wallet for user:', currentUser.id);
        await ensureAppWallet(currentUser.id.toString());
        await getAppWalletBalance(currentUser.id.toString());

        // Also ensure user has a wallet for backward compatibility
        const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());

        if (walletResult.success && walletResult.wallet) {
          if (__DEV__) { console.log('✅ Wallet ensured for user:', walletResult.wallet.address); }

          // Load app wallet balance for local state
          const balance = await userWalletService.getUserWalletBalance(currentUser.id.toString());
          setLocalAppWalletBalance(balance);

          // Load transactions
          const userTransactions = await firebaseDataService.transaction.getUserTransactions(
            currentUser.id.toString()
          );

          const formattedTransactions = userTransactions.map(tx => ({
            id: tx.id,
            type: tx.type || 'send',
            recipient: tx.to_user || 'Unknown',
            note: tx.note || '',
            amount: tx.amount || 0,
            date: tx.created_at || new Date().toISOString(),
          }));

          setTransactions(formattedTransactions);

          // Load multi-signature wallets and transactions
          await loadMultiSigData();
        } else {
          console.error('❌ Failed to ensure wallet:', walletResult.error);
          // Show error state
          setLocalAppWalletBalance(null);
        }
      } catch (error) {
        console.error('Error loading wallet info:', error);
        setLocalAppWalletBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletInfo();
  }, [currentUser?.id]);

  // Load multi-signature data
  const loadMultiSigData = async () => {
    if (!currentUser?.id) return;

    try {
      // Load user's multi-signature wallets
      const userMultiSigWallets = await multiSigService.getUserMultiSigWallets(currentUser.id.toString());
      setMultiSigWallets(userMultiSigWallets);

      // Load pending transactions for all wallets
      const allPendingTransactions: any[] = [];
      for (const wallet of userMultiSigWallets) {
        const pending = await multiSigService.getPendingTransactions(wallet.id);
        allPendingTransactions.push(...pending);
      }
      setPendingTransactions(allPendingTransactions);

      if (__DEV__) {
        console.log('✅ Multi-signature data loaded:', {
          walletsCount: userMultiSigWallets.length,
          pendingTransactionsCount: allPendingTransactions.length
        });
      }
    } catch (error) {
      console.error('Error loading multi-signature data:', error);
    }
  };

  // Load transactions from Firebase
  useEffect(() => {
    const loadTransactions = async () => {
      if (!currentUser?.id) {
        setLoadingTransactions(false);
        return;
      }

      try {
        setLoadingTransactions(true);

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
              if (isIncoming && tx.from_user) {
                const sender = await firebaseDataService.user.getCurrentUser(tx.from_user);
                senderName = sender.name || 'Unknown';
              }
              if (isOutgoing && tx.to_user) {
                const recipient = await firebaseDataService.user.getCurrentUser(tx.to_user);
                recipientName = recipient.name || 'Unknown';
              }
            } catch (error) {
              console.log('Could not fetch user details for transaction:', tx.id);
            }

            return {
              id: tx.id,
              type: tx.type || 'send',
              recipient: isIncoming ? senderName : recipientName,
              sender: isOutgoing ? senderName : recipientName,
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
          console.log('✅ Loaded transactions:', formattedTransactions.length);
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
        // Fallback to empty array
        setTransactions([]);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, [currentUser?.id]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangeExternalWallet = () => {
    // This will open the wallet selector modal
    // For now, just show an alert
    Alert.alert('Change External Wallet', 'This will open wallet selection');
  };

  const handleLinkExternalWallet = () => {
    // This will open wallet connection flow
    Alert.alert('Link External Wallet', 'This will open wallet connection');
  };

  const handleSeedPhrase = async () => {
    try {
      if (!currentUser?.id) return;

      console.log('🔍 WalletManagement: Preparing seed phrase for app wallet...');

      // First ensure the app wallet is initialized
      await ensureAppWallet(currentUser.id.toString());

      // Ensure user has a seed phrase for the app wallet
      await userWalletService.ensureUserSeedPhrase(currentUser.id.toString());

      console.log('🔍 WalletManagement: App wallet seed phrase prepared successfully');

      navigation.navigate('SeedPhraseView');
    } catch (error) {
      console.error('Error ensuring app wallet seed phrase:', error);
      Alert.alert('Error', 'Failed to prepare app wallet seed phrase. Please try again.');
    }
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
      if (!currentUser?.id) return;

      // Ensure user has a wallet first
      const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());

      if (walletResult.success && walletResult.wallet) {
        // Refresh app wallet balance
        const balance = await userWalletService.getUserWalletBalance(currentUser.id.toString());
        setLocalAppWalletBalance(balance);

        // Refresh transactions with enhanced data
        const userTransactions = await firebaseDataService.transaction.getUserTransactions(
          currentUser.id.toString()
        );

        const formattedTransactions = await Promise.all(
          userTransactions.map(async (tx) => {
            const isIncoming = tx.to_user === currentUser.id.toString();
            const isOutgoing = tx.from_user === currentUser.id.toString();
            
            let recipientName = 'Unknown';
            let senderName = 'Unknown';
            
            try {
              if (isIncoming && tx.from_user) {
                const sender = await firebaseDataService.user.getCurrentUser(tx.from_user);
                senderName = sender.name || 'Unknown';
              }
              if (isOutgoing && tx.to_user) {
                const recipient = await firebaseDataService.user.getCurrentUser(tx.to_user);
                recipientName = recipient.name || 'Unknown';
              }
            } catch (error) {
              console.log('Could not fetch user details for transaction:', tx.id);
            }

            return {
              id: tx.id,
              type: tx.type || 'send',
              recipient: isIncoming ? senderName : recipientName,
              sender: isOutgoing ? senderName : recipientName,
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

        // Refresh multi-signature data
        await loadMultiSigData();

        // Refresh multi-sign state
        const isEnabled = await MultiSignStateService.loadMultiSignState();
        setMultiSignEnabled(isEnabled);

        if (isEnabled) {
          const remainingDays = await MultiSignStateService.getRemainingDays();
          setMultiSignRemainingDays(remainingDays);
        }

        if (__DEV__) { console.log('✅ Wallet info refreshed successfully'); }
      } else {
        console.error('❌ Failed to ensure wallet during refresh:', walletResult.error);
      }
    } catch (error) {
      console.error('Error refreshing wallet info:', error);
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

  const handleCloseMultiSignModal = () => {
    // This function is no longer needed as modal is handled by separate screens
  };

  const handleActivateMultiSign = () => {
    setMultiSignEnabled(true);
    // In a real app, this would activate multi-sign
    // navigation.navigate('MultiSignActivated');
  };

  const handleApproveTransaction = async (transactionId: string) => {
    try {
      if (!currentUser?.id) return;

      const result = await multiSigService.approveMultiSigTransaction(
        transactionId,
        currentUser.id.toString()
      );

      if (result.success) {
        Alert.alert('Success', 'Transaction approved successfully!');
        // Reload multi-signature data
        await loadMultiSigData();
      } else {
        Alert.alert('Error', result.error || 'Failed to approve transaction');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      Alert.alert('Error', 'Failed to approve transaction');
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    try {
      if (!currentUser?.id) return;

      const result = await multiSigService.rejectMultiSigTransaction(
        transactionId,
        currentUser.id.toString()
      );

      if (result.success) {
        Alert.alert('Success', 'Transaction rejected successfully!');
        // Reload multi-signature data
        await loadMultiSigData();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject transaction');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      Alert.alert('Error', 'Failed to reject transaction');
    }
  };

  const handleSliderPress = () => {
    // This function is no longer needed as slider is removed
  };

  const handleGoBack = () => {
    // This function is no longer needed as slider is removed
  };

  const handleSliderReset = () => {
    // This function is no longer needed as slider is removed
  };

  const openModal = () => {
    // This function is no longer needed as modal is handled by separate screens
  };

  const closeModal = () => {
    // This function is no longer needed as modal is handled by separate screens
  };

  // Apple-style slider component
  const AppleSlider = () => {
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
    if (!addr) return 'No address';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Get display balance based on active wallet
  const getDisplayBalance = () => {
    // For wallet management, show app wallet balance as primary
    if (appWalletBalance !== null) {
      return appWalletBalance;
    }
    // Fallback to external wallet balance if app wallet not available
    if (externalWalletConnected && externalWalletBalance !== null) {
      return externalWalletBalance;
    }
    return 0;
  };

  const renderWalletOverview = () => (
    <View>
      {/* App Wallet Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>App wallet</Text>
        </View>

        {appWalletConnected && appWalletAddress ? (
          <View style={styles.externalWalletCard}>
            <View style={styles.externalWalletAddress}>
              <View style={styles.optionLeft}>
                <Image source={require('../../../assets/wallet-icon-white.png')} style={styles.optionIcon} />
                <Text style={styles.externalWalletAddressText}>
                  {formatAddress(appWalletAddress)}
                </Text>
              </View>
            </View>
           
          </View>
        ) : (
          <View style={styles.linkWalletButton}>
            <View style={styles.optionLeft}>
              <Image source={require('../../../assets/wallet-icon-white.png')} style={styles.optionIcon} />
              <Text style={styles.linkWalletText}>App wallet not connected</Text>
            </View>
          </View>
        )}
      </View>

      {/* External Wallet Section - For funding/withdrawals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>External wallet</Text>
          {externalWalletConnected && walletInfo && (
            <TouchableOpacity onPress={handleChangeExternalWallet}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {externalWalletConnected && walletInfo ? (
          <View style={styles.externalWalletCard}>
            <View style={styles.externalWalletAddress}>
              <View style={styles.optionLeft}>
                <Image source={require('../../../assets/wallet-icon-green.png')} style={styles.optionIcon} />
                <Text style={styles.externalWalletAddressText}>
                {formatAddress(walletInfo.address)}
              </Text>
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: colors.textLightSecondary, fontSize: 12 }}>
                Balance: ${(externalWalletBalance || 0).toFixed(2)} USDC
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.linkWalletButton}
            onPress={() => navigation.navigate('ExternalWalletConnection')}
          >
            <View style={styles.optionLeft}>
              <Image source={require('../../../assets/wallet-icon-white.png')} style={styles.optionIcon} />
              <Text style={styles.linkWalletText}>Link external wallet</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Wallet Management Options - Match mockup exactly */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.optionRow}
          onPress={handleSeedPhrase}
        >
          <View style={styles.optionLeft}>
            <Image source={require('../../../assets/id-icon-white.png')} style={styles.optionIcon} />
            <Text style={styles.optionText}>Seed phrase</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.textLightSecondary} />
        </TouchableOpacity>

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Image source={require('../../../assets/scan-icon-white.png')} style={styles.optionIcon} />
            <View>
              <Text style={styles.optionText}>Multi-sign</Text>
              {multiSignEnabled && multiSignRemainingDays > 0 && (
                <Text style={styles.optionSubtext}>
                  Expires in {multiSignRemainingDays} day{multiSignRemainingDays !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>
          <Switch
            value={multiSignEnabled}
            onValueChange={handleMultiSignToggle}
            trackColor={{ false: colors.border, true: colors.primaryGreen }}
            thumbColor={multiSignEnabled ? colors.white : colors.white}
            ios_backgroundColor={colors.white10}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>
    </View>
  );

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
            transactionTitle = `Received from ${transaction.recipient}`;
            transactionSubtitle = `+$${transaction.amount.toFixed(2)}`;
          } else if (isOutgoing) {
            transactionIcon = require('../../../assets/icon-send.png');
            transactionColor = colors.textLight;
            transactionTitle = `Sent to ${transaction.recipient}`;
            transactionSubtitle = `-$${transaction.amount.toFixed(2)}`;
          } else if (isDeposit) {
            transactionIcon = require('../../../assets/icon-deposit.png');
            transactionColor = colors.primaryGreen;
            transactionTitle = 'Deposit';
            transactionSubtitle = `+$${transaction.amount.toFixed(2)}`;
          } else if (isWithdraw) {
            transactionIcon = require('../../../assets/icon-withdraw.png');
            transactionColor = colors.textLight;
            transactionTitle = 'Withdrawal';
            transactionSubtitle = `-$${transaction.amount.toFixed(2)}`;
          } else {
            transactionIcon = require('../../../assets/icon-send.png');
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
              <View style={[styles.transactionAvatarNew, { backgroundColor: transactionColor }]}>
                <Image source={transactionIcon} style={styles.transactionIcon} />
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>{transactionTitle}</Text>
                <Text style={styles.transactionSubtitle}>
                  {transactionDate} • {transactionTime}
                </Text>
                {transaction.note && (
                  <Text style={styles.transactionNote}>{transaction.note}</Text>
                )}
              </View>
              
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  styles.transactionAmount,
                  { color: isIncoming || isDeposit ? colors.primaryGreen : colors.textLight }
                ]}>
                  {isIncoming || isDeposit ? '+' : isOutgoing || isWithdraw ? '-' : ''}
                  ${transaction.amount.toFixed(2)}
                </Text>
                <Text style={styles.transactionSource}>
                  {transaction.status === 'completed' ? 'Completed' : 
                   transaction.status === 'pending' ? 'Pending' : 
                   transaction.status === 'failed' ? 'Failed' : 'Unknown'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyTransactions}>
          <Image 
            source={require('../../../assets/group-enpty-state.png')} 
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
    console.log('🔐 WalletManagement: External wallet connected successfully:', result);
    
    Alert.alert(
      'External Wallet Connected',
      `Successfully connected to your external wallet!\n\nYou can now transfer funds to your app wallet.`,
      [{ text: 'OK' }]
    );
    
    // Refresh the wallet data
    handleRefresh();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.backButton} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon name="refresh-cw" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>App Wallet Balance</Text>
            <TouchableOpacity style={styles.qrCodeIcon} onPress={() => setQrCodeModalVisible(true)}>
              <Image
                source={require('../../../assets/qr-code-scan.png')}
                style={styles.qrCodeImage}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            ${(appWalletBalance || 0).toFixed(2)}
          </Text>
          <Text style={styles.balanceLimitText}>Balance Limit $1000</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Send')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-send.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Send to</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-receive.png')}
                  style={styles.actionButtonIcon}
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
                  source={require('../../../assets/icon-deposit.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Top up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('WithdrawAmount');
              }}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-withdraw.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Overview */}
        {renderWalletOverview()}

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
                <AppleSlider />
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
                  <Image source={require('../../../assets/success-icon.png')} style={styles.successIcon} />
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

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        onClose={() => setQrCodeModalVisible(false)}
        qrValue={currentUser?.wallet_address || ''}
        title="Show QR code to your friend"
        displayName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
        isGroup={false}
      />
    </SafeAreaView>
  );
};

export default WalletManagementScreen; 