import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Switch,
  Alert,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const WalletManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const { currentUser } = state;
  const {
    isConnected,
    address,
    balance,
    walletName,
    availableWallets,
    currentWalletId
  } = useWallet();

  const [multiSignEnabled, setMultiSignEnabled] = useState(false);
  const [showMultiSignModal, setShowMultiSignModal] = useState(false);
  const [sliderActive, setSliderActive] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sliderAnim = useRef(new Animated.Value(0)).current;
  const [transactions, setTransactions] = useState([
    {
      id: '1',
      type: 'send',
      recipient: 'Haxoloto',
      note: 'pay for pic...',
      amount: 999.08,
      date: new Date().toISOString(),
    }
  ]);

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

  const handleSeedPhrase = () => {
    navigation.navigate('SeedPhraseView');
  };

  const handleMultiSignToggle = (value: boolean) => {
    if (value) {
      // Show multi-sign explanation modal
      openModal();
    } else {
      setMultiSignEnabled(false);
    }
  };

  const handleCloseMultiSignModal = () => {
    setShowMultiSignModal(false);
  };

  const handleActivateMultiSign = () => {
    setMultiSignEnabled(true);
    closeModal();
    // In a real app, this would activate multi-sign
    // navigation.navigate('MultiSignActivated');
  };

  const handleSliderPress = () => {
    if (!sliderActive && !showLoader && !showSuccess) {
      setSliderActive(true);
      Animated.timing(sliderAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Show loader after slider animation
        setShowLoader(true);

        // Simulate activation process
        setTimeout(() => {
          setShowLoader(false);
          setShowSuccess(true);
          setMultiSignEnabled(true);
        }, 2000); // 2 seconds loader
      });
    }
  };

  const handleGoBack = () => {
    setShowSuccess(false);
    setSliderActive(false);
    setShowLoader(false);
    // Reset slider animation
    sliderAnim.setValue(0);
    closeModal();
  };

  const handleSliderReset = () => {
    setSliderActive(false);
    Animated.timing(sliderAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const openModal = () => {
    console.log('Opening modal, resetting states...');
    setShowMultiSignModal(true);
    setShowSuccess(false);
    setShowLoader(false);
    setSliderActive(false);
    sliderAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMultiSignModal(false);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 10;
    },
    onPanResponderGrant: () => {
      slideAnim.setOffset(0);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      slideAnim.flattenOffset();
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        closeModal();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const handleViewTransactions = () => {
    navigation.navigate('TransactionsList');
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getCurrentWallet = () => {
    return availableWallets.find(w => w.id === currentWalletId);
  };

  const currentWallet = getCurrentWallet();

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
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <TouchableOpacity style={styles.qrCodeIcon} onPress={() => navigation.navigate('Deposit')}>
              <Image
                source={require('../../../assets/qr-code-scan.png')}
                style={styles.qrCodeImage}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            ${balance !== null ? balance.toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.balanceLimitText}>Balance Limit $1000</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SendContacts')}
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

        {/* External Wallet Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>External wallet</Text>
            {isConnected && currentWallet && (
              <TouchableOpacity onPress={handleChangeExternalWallet}>
                <Text style={styles.changeButton}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {isConnected && currentWallet ? (
            <TouchableOpacity style={styles.externalWalletButton}>
              <View style={styles.linkWalletIconBox}>
                <Image source={require('../../../assets/wallet-icon-green.png')} style={styles.linkWalletIcon} />
                <Text style={styles.externalWalletText}>
                  {formatAddress(currentWallet.address)}
                </Text>
              </View>

            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.linkWalletButton}
              onPress={handleLinkExternalWallet}
            >
              <View style={styles.linkWalletIconBox}>
                <Image source={require('../../../assets/wallet-icon-white.png')} style={styles.linkWalletIcon} />
                <Text style={styles.linkWalletText}>Link external wallet</Text>
              </View>

              <Icon name="chevron-right" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet Management Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleSeedPhrase}
          >
            <View style={styles.linkWalletIconBox}>
              <Image source={require('../../../assets/id-icon-white.png')} style={styles.linkWalletIcon} />
              <Text style={styles.optionText}>Seed phrase</Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textLightSecondary} />
          </TouchableOpacity>

          <View style={styles.optionRow}>
            <View style={styles.linkWalletIconBox}>
              <Image source={require('../../../assets/scan-icon-white.png')} style={styles.linkWalletIcon} />
              <Text style={styles.optionText}>Multi-sign</Text>
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

        {/* Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity onPress={handleViewTransactions}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            transactions.slice(0, 3).map((transaction) => {
              const transactionTime = new Date(transaction.date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });

              return (
                <View key={transaction.id} style={styles.requestItemNew}>
                  <View style={styles.transactionAvatarNew}>
                    <Image
                      source={require('../../../assets/icon-send.png')}
                      style={styles.transactionIcon}
                    />
                  </View>
                  <View style={styles.requestContent}>
                    <Text style={styles.requestMessageWithAmount}>
                      <Text style={styles.requestSenderName}>
                        Send to {transaction.recipient}
                      </Text>
                    </Text>
                    <Text style={styles.requestSource}>
                      Note: {transaction.note} • {transactionTime}
                    </Text>
                  </View>
                  <Text style={styles.requestAmountGreen}>
                    {transaction.amount.toFixed(2)} USDC
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyRequestsState}>
              <Text style={styles.emptyRequestsText}>No transactions yet</Text>
            </View>
          )}
        </View>

      </ScrollView>
      <NavBar currentRoute="WalletManagement" navigation={navigation} />

      {/* Multi-Sign Explanation Modal */}
      <Modal
        visible={showMultiSignModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        {/* Animated Background Overlay */}
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Click outside to close */}
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}
          />

          {/* Animated Bottom Sheet */}
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  })
                }]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {/* Handle */}
            <View style={styles.handle} />


            {/* Content */}
            <View style={styles.modalContent}>
              {showSuccess ? (
                // Success State
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Icon name="check" size={32} color={colors.black} />
                  </View>
                  <Text style={styles.successTitle}>Multi-sign Activated!</Text>
                  <Text style={styles.successMessage}>
                    You can now approve multiple payments at once, saving time on each transaction.
                  </Text>
                </View>
              ) : showLoader ? (
                // Loader State
                <View style={styles.loaderContainer}>
                  <ActivityIndicator
                    size="large"
                    color={colors.primaryGreen}
                    style={styles.loader}
                  />
                  <Text style={styles.loaderText}>Activating multi-sign...</Text>
                </View>
              ) : (
                // Initial State
                <>
                  <View style={styles.modalContentHeader}>
                    <Text style={styles.modalTitle}>What is multi-sign?</Text>

                    <Text style={styles.explanationText}>
                      Multisign lets you approve once to authorize multiple payments at the same time,
                      saving you time by avoiding manual approval for each transaction.
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              {showSuccess ? (
                // Success Button
                <TouchableOpacity
                  style={styles.goBackButton}
                  onPress={handleGoBack}
                >
                  <Text style={styles.goBackButtonText}>Go Back</Text>
                </TouchableOpacity>
              ) : !showLoader ? (
                // Apple-style Slider (only show when not loading)
                <TouchableOpacity
                  style={styles.appleSliderContainer}
                  onPress={handleSliderPress}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.appleSliderTrack,
                      sliderActive && styles.appleSliderTrackActive,
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.appleSliderText,
                        sliderActive && styles.appleSliderTextActive,
                      ]}
                    >
                      Activate multisign
                    </Animated.Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.appleSliderThumb,
                      {
                        transform: [{
                          translateX: sliderAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 250], // Increased for bigger slider
                          })
                        }]
                      }
                    ]}
                  >
                    <Icon name="chevron-right" size={24} color={colors.black} />
                  </Animated.View>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
};

export default WalletManagementScreen; 