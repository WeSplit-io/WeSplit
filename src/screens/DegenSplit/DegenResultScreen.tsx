/**
 * Degen Result Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Linking,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenResultStyles';
import { SplitWalletService } from '../../services/split';
import { SplitWallet } from '../../services/split/types';
import { notificationService } from '../../services/notificationService';
import { useApp } from '../../context/AppContext';

// Import our custom hooks and components
import { useDegenSplitState, useDegenSplitLogic } from './hooks';
import { DegenSplitHeader } from './components';

interface DegenResultScreenProps {
  navigation: any;
  route: any;
}

interface SelectedParticipant {
  id: string;
  name: string;
  userId: string;
}

// AppleSlider component adapted from SendConfirmationScreen
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Slide to Pay' }) => {
  const maxSlideDistance = 300;
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [isSliderActive, setIsSliderActive] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !loading,
    onMoveShouldSetPanResponder: () => !disabled && !loading,
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > maxSlideDistance * 0.6) {
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete) onSlideComplete();
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
          }, 1000);
        });
      } else {
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
    <LinearGradient
      colors={[colors.green, colors.greenBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.appleSliderGradientBorder}
    >
      <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]} {...panResponder.panHandlers}>
        <Animated.View style={styles.appleSliderTrack}>
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: sliderValue.interpolate({ inputRange: [0, maxSlideDistance], outputRange: [0, 1] }) as any,
              borderRadius: 999,
            }}
          >
            <LinearGradient
              colors={[colors.green, colors.greenBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: 999,
              }}
            />
          </Animated.View>
          <Animated.Text
            style={[
              styles.appleSliderText,
              { color: colors.white }
            ]}
          >
            {loading ? 'Processing...' : text}
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
          <LinearGradient
            colors={[colors.green, colors.greenBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 30,
            }}
          />
          <Image 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.appleSliderThumbIcon}
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const DegenResultScreen: React.FC<DegenResultScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, selectedParticipant, splitWallet, processedBillData, splitData } = route.params;
  const { state } = useApp();
  const { currentUser } = state;
  
  // Initialize our custom hooks
  const degenState = useDegenSplitState(splitWallet);
  const degenLogic = useDegenSplitLogic(degenState, (updates) => {
    // Update state function
    Object.keys(updates).forEach(key => {
      const setter = (degenState as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`];
      if (setter) {
        setter(updates[key as keyof typeof updates]);
      }
    });
  });

  // Determine if current user is the winner (selectedParticipant is the winner from the roulette)
  const isWinner = currentUser && selectedParticipant && 
    (selectedParticipant.userId || selectedParticipant.id) === currentUser.id.toString();
  const isLoser = !isWinner;

  // State to track current split wallet data
  const [currentSplitWallet, setCurrentSplitWallet] = React.useState<SplitWallet | null>(null);

  // Check if the current user has already claimed/paid their funds
  const currentUserParticipant = currentSplitWallet?.participants.find((p: any) => p.userId === currentUser?.id.toString());
  const hasAlreadyClaimed = currentUserParticipant?.status === 'paid';

  // Load split wallet data to show current status
  React.useEffect(() => {
    const loadSplitWalletData = async () => {
      if (!splitWallet) return;

      try {
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (result.success && result.wallet) {
          // Update the split wallet data to show current status
          setCurrentSplitWallet(result.wallet);
          console.log('Split wallet data loaded:', result.wallet);
        }
      } catch (error) {
        console.error('Error loading split wallet data:', error);
      }
    };

    loadSplitWalletData();
  }, [splitWallet]);

  // Event handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleExternalPayment = async () => {
    const success = await degenLogic.handleExternalPayment(currentUser, splitWallet, totalAmount);
    if (success) {
      // Handle successful external payment
    }
  };

  const handleClaimFunds = async () => {
    const success = await degenLogic.handleClaimFunds(currentUser, splitWallet, totalAmount);
    if (success) {
      // Refresh split wallet data to show updated status
      try {
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (result.success && result.wallet) {
          setCurrentSplitWallet(result.wallet);
        }
      } catch (error) {
        console.error('Error refreshing split wallet data:', error);
      }

      // Show success message and let user decide what to do next
      Alert.alert(
        '🎉 Funds Claimed Successfully!',
        'Your winnings have been transferred to your wallet. You can now close this screen or continue to view the split details.',
        [
          {
            text: 'Stay Here',
            style: 'cancel'
          },
          {
            text: 'Go to Dashboard',
            onPress: () => navigation.navigate('Dashboard', { refreshBalance: true })
          },
          {
            text: 'Go to Splits List',
            onPress: () => navigation.navigate('SplitsList', { refreshBalance: true })
          }
        ]
      );
    }
  };

  const handleShowPrivateKey = async () => {
    await degenLogic.handleShowPrivateKey(splitWallet, currentUser);
  };

  const handleCopyWalletAddress = (address: string) => {
    degenLogic.handleCopyWalletAddress(address);
  };

  const handleClosePrivateKeyModal = () => {
    degenState.setShowPrivateKeyModal(false);
  };

  const handleCopyPrivateKey = () => {
    if (degenState.privateKey) {
      degenLogic.handleCopyPrivateKey(degenState.privateKey);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <DegenSplitHeader
        title="Degen Result"
        onBackPress={handleBack}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Avatar Container */}
        <View style={styles.avatarContainer}>
          <View style={[
            styles.avatar,
            isWinner ? styles.winnerAvatar : styles.loserAvatar
          ]}>
            <Text style={styles.avatarText}>
              {selectedParticipant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Result Title */}
        <View style={styles.resultTitleContainer}>
          <Text style={styles.resultTitle}>
            {isWinner ? '🎉 You Won!' : '😅 You Lost!'}
          </Text>
        </View>

        {/* Amount Container */}
        <View style={[
          styles.amountContainer,
          isWinner ? styles.winnerAmountContainer : styles.loserAmountContainer
        ]}>
          <Text style={styles.amountLabel}>
            {isWinner ? 'You Get' : 'You Pay'}
          </Text>
          <Text style={styles.amountValue}>
            {totalAmount} USDC
          </Text>
        </View>

        {/* Action Buttons */}
        {isWinner ? (
          // Winner actions
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.claimButton}
              onPress={() => degenState.setShowClaimModal(true)}
              disabled={degenState.isProcessing}
            >
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.claimButtonGradient}
              >
                <Text style={styles.claimButtonText}>
                  {degenState.isProcessing ? 'Processing...' : 'Claim Funds'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // Loser actions
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => degenState.setShowPaymentOptionsModal(true)}
              disabled={degenState.isProcessing}
            >
              <LinearGradient
                colors={[colors.red, colors.red]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payButtonGradient}
              >
                <Text style={styles.payButtonText}>
                  {degenState.isProcessing ? 'Processing...' : 'Pay Your Share'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Split Wallet Info */}
        {splitWallet && (
          <View style={styles.walletInfoContainer}>
            <Text style={styles.walletInfoTitle}>Split Wallet</Text>
            <View style={styles.walletInfoCard}>
              <View style={styles.walletAddressRow}>
                <Text style={styles.walletAddressLabel}>Address:</Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={styles.walletAddressText}>
                    {degenLogic.formatWalletAddress(splitWallet.walletAddress)}
                  </Text>
                  <TouchableOpacity onPress={() => handleCopyWalletAddress(splitWallet.walletAddress)}>
                    <Image
                      source={require('../../../assets/copy-icon.png')}
                      style={styles.copyIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.privateKeyButton}
                onPress={handleShowPrivateKey}
              >
                <Image
                  source={require('../../../assets/id-icon-white.png')}
                  style={styles.privateKeyButtonIcon}
                />
                <Text style={styles.privateKeyButtonText}>View Private Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Claim Modal */}
      {degenState.showClaimModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Text style={styles.modalIcon}>🎉</Text>
              </View>
              <Text style={styles.modalTitle}>
                {hasAlreadyClaimed ? 'Funds Already Claimed' : 'Claim Your Winnings'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {hasAlreadyClaimed 
                  ? `You have already claimed your ${totalAmount} USDC winnings.`
                  : `You won the degen split! Claim your ${totalAmount} USDC winnings.`
                }
              </Text>
              
              {hasAlreadyClaimed ? (
                <View style={styles.claimedStatusContainer}>
                  <Text style={styles.claimedStatusText}>✅ Funds Claimed Successfully</Text>
                  <Text style={styles.claimedStatusSubtext}>
                    Transaction: {currentUserParticipant?.transactionSignature?.slice(0, 8)}...
                  </Text>
                </View>
              ) : (
                <AppleSlider
                  onSlideComplete={handleClaimFunds}
                  disabled={degenState.isProcessing}
                  loading={degenState.isProcessing}
                  text="Slide to Claim"
                />
              )}
            </View>
          </View>
        </View>
      )}

      {/* Payment Options Modal */}
      {degenState.showPaymentOptionsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Text style={styles.modalIcon}>💳</Text>
              </View>
              <Text style={styles.modalTitle}>
                Pay Your Share
              </Text>
              <Text style={styles.modalSubtitle}>
                You need to pay {totalAmount} USDC to complete the degen split.
              </Text>
              
              <View style={styles.paymentOptionsContainer}>
                <TouchableOpacity
                  style={styles.paymentOptionButton}
                  onPress={() => {
                    degenState.setSelectedPaymentMethod('personal-wallet');
                    degenState.setShowPaymentOptionsModal(false);
                    // Handle personal wallet payment
                  }}
                >
                  <Text style={styles.paymentOptionText}>Personal Wallet</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.paymentOptionButton}
                  onPress={() => {
                    degenState.setSelectedPaymentMethod('kast-card');
                    degenState.setShowPaymentOptionsModal(false);
                    // Handle Kast card payment
                  }}
                >
                  <Text style={styles.paymentOptionText}>Kast Card</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Private Key Modal */}
      {degenState.showPrivateKeyModal && degenState.privateKey && (
        <View style={styles.modalOverlay}>
          <View style={styles.privateKeyModal}>
            <Text style={styles.privateKeyModalTitle}>🔑 Private Key</Text>
            <Text style={styles.privateKeyModalSubtitle}>
              This is a shared private key for the Degen Split. All participants have access to this key to withdraw or move funds from the split wallet.
            </Text>
            
            <View style={styles.privateKeyDisplay}>
              <Text style={styles.privateKeyText}>{degenState.privateKey}</Text>
            </View>
            
            <View style={styles.privateKeyWarning}>
              <Text style={styles.privateKeyWarningText}>
                ⚠️ This is a shared private key for the Degen Split. All participants can use this key to access the split wallet funds.
              </Text>
            </View>
            
            <View style={styles.privateKeyButtons}>
              <TouchableOpacity 
                style={styles.copyPrivateKeyButton}
                onPress={handleCopyPrivateKey}
              >
                <Text style={styles.copyPrivateKeyButtonText}>Copy Key</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closePrivateKeyButton}
                onPress={handleClosePrivateKeyModal}
              >
                <Text style={styles.closePrivateKeyButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DegenResultScreen;
