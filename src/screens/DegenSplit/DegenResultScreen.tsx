/**
 * Degen Result Screen
 * Shows the "loser" who has to pay the entire bill
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
import { SplitWalletService } from '../../services/splitWalletService';
import { NotificationService } from '../../services/notificationService';
import { MockupDataService } from '../../data/mockupData';
import { useApp } from '../../context/AppContext';

interface DegenResultScreenProps {
  navigation: any;
  route: any;
}

interface SelectedParticipant {
  id: string;
  name: string;
  userId: string;
  avatar?: string;
}

// AppleSlider component adapted from DegenLockScreen
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Slide to Transfer' }) => {
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
            {loading ? 'Transferring...' : text}
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
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showPaymentOptionsModal, setShowPaymentOptionsModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'personal-wallet' | 'kast-card' | null>(null);
  const [showSignatureStep, setShowSignatureStep] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Determine if current user is the loser (loser pays the full bill, winners get their money back)
  const isLoser = currentUser && selectedParticipant && 
    (selectedParticipant.userId || selectedParticipant.id) === currentUser.id.toString();
  const isWinner = !isLoser;

  // Notifications are now sent from DegenSpinScreen when roulette is rolled
  // No need to send duplicate notifications here

  // Check if all losers have paid their shares
  React.useEffect(() => {
    const checkPaymentCompletion = async () => {
      if (!splitWallet || !selectedParticipant) return;

      try {
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (!result.success || !result.wallet) return;

        const wallet = result.wallet;
        const winnerId = selectedParticipant.id;
        const losers = wallet.participants.filter(p => p.userId !== winnerId);
        const allLosersPaid = losers.every(loser => loser.status === 'paid');

        if (allLosersPaid && losers.length > 0) {
          // Get merchant address if available
          const merchantAddress = processedBillData?.merchant?.address || billData?.merchant?.address;
          
          // Complete the split and send funds to merchant
          const completionResult = await SplitWalletService.completeSplitWallet(
            splitWallet.id,
            merchantAddress
          );

          if (completionResult.success) {
            // Send completion notifications
            const completionRecipients = [
              winnerId, 
              ...losers.map(l => l.userId).filter(id => id)
            ].filter(id => id); // Filter out undefined values
            
            
            if (completionRecipients.length > 0) {
              await NotificationService.sendBulkNotifications(
                completionRecipients,
                'split_payment_required', // Use existing notification type
                {
                  splitWalletId: splitWallet.id,
                  billName: splitData?.title || billData?.title || MockupDataService.getBillName(),
                  amount: totalAmount,
                }
              );
            }

            // Show completion alert
            Alert.alert(
              'Degen Split Complete! 🎉',
              merchantAddress 
                ? `All losers have paid their shares. The total amount of ${wallet.totalAmount} USDC has been sent to the merchant. ${selectedParticipant.name} won and paid nothing!`
                : `All losers have paid their shares. ${selectedParticipant.name} won and paid nothing!`,
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('SplitsList'),
                },
              ]
            );
          } else {
            Alert.alert(
              'Degen Split Complete (Partial)',
              'All losers have paid their shares, but there was an issue sending funds to the merchant. Please contact support.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('SplitsList'),
                },
              ]
            );
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkPaymentCompletion, 5000);
    return () => clearInterval(interval);
  }, [splitWallet, selectedParticipant]);


  const handleShareOnX = async () => {
    try {
      const resultText = isWinner ? 'Win' : 'Lost';
      const message = `${resultText} ${totalAmount} $USDC on @wesplit_io Degen Split 😂\nWho's brave enough to try their luck next? 🎲`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(twitterUrl);
      if (canOpen) {
        await Linking.openURL(twitterUrl);
      } else {
        Alert.alert('Error', 'Unable to open Twitter');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Unable to open Twitter');
    }
  };

  const handleBackToSplits = () => {
    navigation.navigate('SplitsList');
  };

  // Handle loser payment options
  const handlePaymentOption = (option: 'personal-wallet' | 'kast-card') => {
    setSelectedPaymentMethod(option);
    setShowSignatureStep(true);
  };

  // Handle signature step
  const handleSignatureStep = async () => {
    if (!selectedPaymentMethod) return;
    
    setIsSigning(true);
    try {
      // Simulate signature process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process the payment based on selected method
      if (selectedPaymentMethod === 'personal-wallet') {
        await handleInAppPayment();
      } else {
        await handleExternalPayment();
      }
      
      // Close modals
      setShowSignatureStep(false);
      setShowPaymentOptionsModal(false);
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Error during signature process:', error);
      Alert.alert('Error', 'Failed to complete signature. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleInAppPayment = async () => {
    setIsProcessing(true);
    try {
      // Get the loser's in-app wallet address
      const loserParticipant = participants.find((p: any) => 
        (p.userId || p.id) === currentUser!.id.toString()
      );
      
      if (!loserParticipant?.walletAddress) {
        Alert.alert('Error', 'No wallet address found for your account. Please ensure your wallet is connected.');
        return;
      }

      // In degen splits, the loser withdraws their locked funds from the split wallet
      // to their own wallet so they can pay the bill using their preferred method
      const result = await SplitWalletService.extractDegenSplitFunds(
        splitWallet.id,
        currentUser!.id.toString(),
        currentUser!.wallet_address || '', // Use user's wallet address
        totalAmount,
        'Degen Split loser fund extraction'
      );
      
      if (result.success) {
        Alert.alert(
          'Funds Withdrawn! 💰', 
          `Successfully withdrew ${totalAmount} USDC from the split wallet to your personal wallet. You can now use this to pay the bill with your preferred payment method.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SplitsList')
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Failed to complete payment. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExternalPayment = async () => {
    setIsProcessing(true);
    try {
      // In degen splits, the loser withdraws their locked funds from the split wallet
      // to their KAST card wallet so they can pay the bill using their KAST card
      const result = await SplitWalletService.extractDegenSplitFunds(
        splitWallet.id,
        currentUser!.id.toString(),
        currentUser!.wallet_address || '', // Use user's wallet address
        totalAmount,
        'Degen Split loser fund extraction to KAST card'
      );
      
      if (result.success) {
        Alert.alert(
          'Funds Withdrawn to KAST! 💳', 
          `Successfully withdrew ${totalAmount} USDC from the split wallet to your KAST card wallet. You can now use your KAST card to pay the bill.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SplitsList')
            }
          ]
        );
      } else {
        Alert.alert('KAST Payment Failed', result.error || 'Failed to complete KAST payment. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process KAST payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle winner fund claiming
  const handleClaimFunds = async () => {
    setShowClaimModal(false);
    setIsProcessing(true);
    try {
      // In degen splits, each participant locks the full amount
      // Winners get back the full amount they locked
      const winnerAmount = totalAmount;
      
      
      // Transfer funds from split wallet to winner's in-app wallet
      const { SplitWalletService } = await import('../../services/splitWalletService');
      const result = await SplitWalletService.extractDegenSplitFunds(
        splitWallet.id,
        currentUser!.id.toString(),
        currentUser!.wallet_address || '', // Use user's wallet address
        winnerAmount,
        'Degen Split winner fund extraction'
      );
      
      if (result.success) {
        Alert.alert('Success', `Funds claimed! ${winnerAmount} USDC transferred to your in-app wallet.`);
        // Navigate back or to a success screen
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to claim funds. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to claim funds. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToSplits}>
          <Image 
            source={require('../../../assets/chevron-left.png')} 
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Degen Split Result</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isWinner ? styles.winnerAvatar : styles.loserAvatar]}>
            <Text style={styles.avatarText}>🐒</Text>
          </View>
        </View>

        {/* Result Title */}
        <View style={styles.resultTitleContainer}>
          <Text style={styles.resultTitle}>
            {isWinner ? "You're the Winner!" : "You're the Loser!"}
          </Text>
        </View>

        {/* Amount */}
        <View style={[styles.amountContainer, isWinner ? styles.winnerAmountContainer : styles.loserAmountContainer]}>
          <Text style={styles.amountText}>
            {isWinner ? `+${totalAmount} USDC` : `-${totalAmount} USDC`}
          </Text>
        </View>

        {/* Result Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            {isWinner 
              ? `You won! You get your ${totalAmount} USDC back.`
              : `You need to pay the bill: ${totalAmount} USDC. Withdraw your locked funds to pay with your preferred method.`
            }
          </Text>
          <Text style={styles.luckMessage}>
            {isWinner ? "Congratulations! 🎉" : "(Better luck next time 🍀)"}
          </Text>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareOnX}>
          <Text style={styles.shareButtonText}>Share on </Text>
          <Image 
            source={require('../../../assets/twitter-x.png')} 
            style={styles.twitterIcon}
          />
        </TouchableOpacity>

        {/* Claim Button - Only show for winners */}
        {isWinner && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.claimButton,
                isProcessing && styles.actionButtonDisabled
              ]}
              onPress={() => setShowClaimModal(true)}
              disabled={isProcessing}
            >
              <Text style={[
                styles.actionButtonText,
                styles.claimButtonText,
                isProcessing && styles.actionButtonTextDisabled
              ]}>
                {isProcessing ? 'Processing...' : 'Claim'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* Action Buttons - Fixed at bottom */}
      {isLoser && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            onPress={() => setShowPaymentOptionsModal(true)}
            disabled={isProcessing}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={[colors.green, colors.greenBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.settleButton,
                isProcessing && styles.actionButtonDisabled
              ]}
            >
              <Text style={[
                styles.actionButtonText,
                styles.settleButtonText,
                isProcessing && styles.actionButtonTextDisabled
              ]}>
                {isProcessing ? 'Processing...' : 'Transfer to Use'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}


      {/* Claim Confirmation Modal */}
      {showClaimModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalClaimIcon}>🎉</Text>
            </View>
            <Text style={styles.modalTitle}>Claim Your Funds</Text>
            <Text style={styles.modalSubtitle}>
              You can claim {(totalAmount / participants.length).toFixed(1)} USDC back to your in-app wallet.
            </Text>
            
            <TouchableOpacity
              style={styles.modalClaimButton}
              onPress={handleClaimFunds}
              disabled={isProcessing}
            >
              <Text style={styles.modalClaimButtonText}>
                {isProcessing ? 'Claiming...' : 'Claim Funds'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowClaimModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Payment Options Modal */}
      {showPaymentOptionsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {!showSignatureStep ? (
              // Payment Method Selection Step
              <>
                <Text style={styles.modalTitle}>Choose Payment Method</Text>
                <Text style={styles.modalSubtitle}>
                  How would you like to receive the {totalAmount} USDC from the split wallet?
                </Text>
                
                <View style={styles.paymentOptionsModalContainer}>
                  <TouchableOpacity 
                    style={styles.paymentOptionButton}
                    onPress={() => handlePaymentOption('personal-wallet')}
                  >
                    <View style={styles.paymentOptionIcon}>
                      <Text style={styles.paymentOptionIconText}>💳</Text>
                    </View>
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionTitle}>Personal Wallet</Text>
                      <Text style={styles.paymentOptionDescription}>
                        Transfer to your personal wallet address
                      </Text>
                    </View>
                    <Text style={styles.paymentOptionArrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.paymentOptionButton}
                    onPress={() => handlePaymentOption('kast-card')}
                  >
                    <View style={styles.paymentOptionIcon}>
                      <Text style={styles.paymentOptionIconText}>🏦</Text>
                    </View>
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionTitle}>KAST Card</Text>
                      <Text style={styles.paymentOptionDescription}>
                        Transfer to your KAST card wallet
                      </Text>
                    </View>
                    <Text style={styles.paymentOptionArrow}>→</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowPaymentOptionsModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Signature Step
              <>
                <Text style={styles.modalTitle}>
                  Transfer {totalAmount} USDC to your {selectedPaymentMethod === 'personal-wallet' ? 'Personal Wallet' : 'KAST Card'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedPaymentMethod === 'personal-wallet' 
                    ? 'Top up your wallet in a few seconds to cover your share.'
                    : 'Top up your card in a few seconds to cover your share.'
                  }
                </Text>
                
                {/* Transfer Visualization */}
                <View style={styles.transferVisualization}>
                  <View style={styles.transferIcon}>
                    <Image 
                      source={require('../../../assets/wesplit-logo-card.png')} 
                      style={styles.transferIconImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.transferArrows}>
                    <Text style={styles.transferArrowText}>{'>>>>'}</Text>
                  </View>
                  <View style={styles.transferIcon}>
                    <Image 
                      source={require('../../../assets/kast-logo.png')} 
                      style={styles.transferIconImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <AppleSlider
                  onSlideComplete={handleSignatureStep}
                  disabled={isSigning}
                  loading={isSigning}
                  text="Slide to Transfer"
                />

                <TouchableOpacity 
                  style={styles.modalBackButton}
                  onPress={() => {
                    setShowSignatureStep(false);
                    setSelectedPaymentMethod(null);
                  }}
                >
                  <Image 
                    source={require('../../../assets/chevron-left.png')} 
                    style={styles.modalBackButtonIcon}
                  />
                  <Text style={styles.modalBackButtonText}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default DegenResultScreen;
