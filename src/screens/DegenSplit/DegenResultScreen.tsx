/**
 * Degen Result Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useState, useRef, useCallback } from 'react';
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
import { useDegenSplitState, useDegenSplitLogic, useDegenSplitRealtime } from './hooks';
import { DegenSplitHeader } from './components';
import { Container } from '@/components/shared';

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
          if (onSlideComplete) {onSlideComplete();}
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

  // Initialize real-time updates
  const realtimeState = useDegenSplitRealtime(
    splitData?.id,
    degenState.splitWallet?.id,
    {
      onParticipantUpdate: (participants) => {
        console.log('🔍 DegenResultScreen: Real-time participant update:', participants);
        
        // Check if current user's status changed to 'paid' and exit loading state
        if (currentUser && degenState.isProcessing) {
          const currentUserParticipant = participants.find(
            (p: any) => p.userId === currentUser.id.toString()
          );
          
          if (currentUserParticipant?.status === 'paid') {
            console.log('✅ Real-time update: User status changed to paid, exiting loading state');
            
            // OPTIMIZED: Only show success message if we were actually processing
            // This prevents duplicate alerts when the user navigates back to the screen
            const wasProcessing = degenState.isProcessing;
            degenState.setIsProcessing(false);
            
            if (wasProcessing) {
              if (isWinner) {
                Alert.alert(
                  '🎉 Winner Payout Complete!', 
                  `Congratulations! You've received the full amount of ${totalAmount} USDC from the degen split. Your locked funds have been returned to you.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  '✅ Payment Confirmed!', 
                  `Your locked funds (${totalAmount} USDC) have been successfully withdrawn from the split wallet to your in-app wallet.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('SplitsList')
                    }
                  ]
                );
              }
            }
          }
        }
      },
      onSplitWalletUpdate: (splitWallet) => {
        console.log('🔍 DegenResultScreen: Real-time wallet update:', splitWallet);
        degenState.setSplitWallet(splitWallet);
        setCurrentSplitWallet(splitWallet);
      },
      onError: (error) => {
        console.error('🔍 DegenResultScreen: Real-time error:', error);
        degenState.setError(error.message);
      }
    }
  );

  // Determine if current user is the winner (selectedParticipant is the winner from the roulette)
  const isWinner = currentUser && selectedParticipant && 
    (selectedParticipant.userId || selectedParticipant.id) === currentUser.id.toString();
  const isLoser = !isWinner;

  // State to track current split wallet data
  const [currentSplitWallet, setCurrentSplitWallet] = React.useState<SplitWallet | null>(null);

  // OPTIMIZED: Efficient state reset with proper dependency management
  React.useEffect(() => {
    if (currentSplitWallet && currentUser?.id) {
      const currentUserParticipant = currentSplitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
      
      // Only update state if there's actually a change needed
      if (currentUserParticipant?.status === 'paid' && degenState.isProcessing) {
        degenState.setIsProcessing(false);
      } else if (!currentUserParticipant && degenState.isProcessing) {
        // Reset processing state if user is not found in participants
        degenState.setIsProcessing(false);
      }
    }
  }, [currentSplitWallet?.participants, currentUser?.id, degenState.isProcessing]);

  // OPTIMIZED: Centralized claim validation
  const currentUserParticipant = currentSplitWallet?.participants.find((p: any) => p.userId === currentUser?.id.toString());
  const hasAlreadyClaimed = currentUserParticipant?.status === 'paid';
  const hasValidTransaction = currentUserParticipant?.transactionSignature && 
    !currentUserParticipant.transactionSignature.includes('timeout') &&
    !currentUserParticipant.transactionSignature.includes('failed');
  
  // Centralized function to check if user can claim funds
  const canUserClaimFunds = useCallback(() => {
    if (!currentUser || !currentSplitWallet) {return false;}
    
    const participant = currentSplitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
    return participant && participant.status !== 'paid';
  }, [currentUser, currentSplitWallet]);
  
  // Debug logging
  React.useEffect(() => {
    if (currentSplitWallet && currentUser) {
      console.log('🔍 DegenResultScreen Debug:', {
        splitWalletId: currentSplitWallet.id,
        currentUserId: currentUser.id,
        currentUserParticipant: currentUserParticipant,
        hasAlreadyClaimed,
        allParticipants: currentSplitWallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status,
          amountPaid: p.amountPaid,
          amountOwed: p.amountOwed
        }))
      });
    }
  }, [currentSplitWallet, currentUser, currentUserParticipant, hasAlreadyClaimed]);

  // OPTIMIZED: Real-time updates will handle data loading automatically
  // No need for manual data loading - this causes conflicts with real-time updates

  // Event handlers
  const handleBack = () => {
    navigation.navigate('SplitsList');
  };

  const handleExternalPayment = async () => {
    degenState.setIsProcessing(true);
    try {
      // NEW Degen Logic: Loser receives funds from split wallet to their KAST card/external wallet
      const { SplitWalletService } = await import('../../services/split');
      const result = await SplitWalletService.processDegenLoserPayment(
        splitWallet.id,
        currentUser!.id.toString(),
        'kast-card', // Payment method
        totalAmount, // Loser receives their locked funds back
        'Degen Split Loser Payment (KAST Card)'
      );
      
      if (result.success) {
        // Check if this is a withdrawal request (for non-creators)
        if (result.transactionSignature?.startsWith('WITHDRAWAL_REQUEST_')) {
          Alert.alert(
            '📋 Withdrawal Request Submitted', 
            result.message || 'Your withdrawal request has been submitted. The split creator will process your request.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        } else {
          Alert.alert(
            '✅ Payment Confirmed!', 
            `Your locked funds (${totalAmount} USDC) have been successfully withdrawn from the split wallet to your KAST card.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        }
      } else {
        Alert.alert('KAST Payment Failed', result.error || 'Failed to complete KAST payment. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process KAST payment. Please try again.');
    } finally {
      degenState.setIsProcessing(false);
    }
  };

  // Handle signature step
  const handleSignatureStep = async () => {
    if (!degenState.selectedPaymentMethod) {return;}
    
    degenState.setIsSigning(true);
    try {
      // Simulate signature process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process the payment based on selected method
      if (degenState.selectedPaymentMethod === 'personal-wallet') {
        await handleInAppPayment();
      } else {
        await handleExternalPayment();
      }
      
      // Close modals
      degenState.setShowSignatureStep(false);
      degenState.setShowPaymentOptionsModal(false);
      degenState.setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Error during signature process:', error);
      Alert.alert('Error', 'Failed to complete signature. Please try again.');
    } finally {
      degenState.setIsSigning(false);
    }
  };

  const handleInAppPayment = async () => {
    degenState.setIsProcessing(true);
    try {
      // OPTIMIZED: Use centralized validation
      if (!canUserClaimFunds()) {
        Alert.alert(
          'Already Processed', 
          'Your payment has already been processed for this split.',
          [{ text: 'OK' }]
        );
        degenState.setIsProcessing(false);
        return;
      }
      
      // NEW Degen Logic: Loser receives funds from split wallet to their in-app wallet
      const { SplitWalletService } = await import('../../services/split');
      const result = await SplitWalletService.processDegenLoserPayment(
        splitWallet.id,
        currentUser!.id.toString(),
        'in-app', // Payment method
        totalAmount, // Loser receives their locked funds back
        'Degen Split Loser Payment (In-App Wallet)'
      );
      
      if (result.success) {
        // Check if this is a withdrawal request (for non-creators)
        if (result.transactionSignature?.startsWith('WITHDRAWAL_REQUEST_')) {
          Alert.alert(
            '📋 Withdrawal Request Submitted', 
            result.message || 'Your withdrawal request has been submitted. The split creator will process your request.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        } else {
          Alert.alert(
            '✅ Payment Confirmed!', 
            `Your locked funds (${totalAmount} USDC) have been successfully withdrawn from the split wallet to your in-app wallet.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        }
      } else {
        // OPTIMIZED: Simplified error handling - real-time updates will handle success detection
        if (result.signature && result.error?.includes('confirmation timed out')) {
          // Transaction was sent but confirmation timed out
          console.log('🔍 Loser payment sent but confirmation timed out, real-time updates will handle success detection', {
            signature: result.signature,
            splitWalletId: splitWallet.id
          });
          
          Alert.alert(
            '⏳ Payment Processing', 
            'Your payment has been sent to the blockchain. Real-time updates will notify you when it completes.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Payment Failed', result.error || 'Failed to complete payment. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete payment. Please try again.');
    } finally {
      degenState.setIsProcessing(false);
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
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <DegenSplitHeader
        title="Degen Result"
        onBackPress={handleBack}
        isRealtimeActive={realtimeState.isRealtimeActive}
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
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => degenState.setShowClaimModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
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
                  {hasValidTransaction ? (
                    <>
                      <Text style={styles.claimedStatusText}>✅ Funds Claimed Successfully</Text>
                      <Text style={styles.claimedStatusSubtext}>
                        Transaction: {currentUserParticipant?.transactionSignature?.slice(0, 8)}...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.claimedStatusText}>⚠️ Claim Failed or Timed Out</Text>
                      <Text style={styles.claimedStatusSubtext}>
                        Your previous claim attempt failed. You can try again.
                      </Text>
                      <AppleSlider
                        onSlideComplete={handleClaimFunds}
                        disabled={degenState.isProcessing}
                        loading={degenState.isProcessing}
                        text="Retry Claim"
                      />
                    </>
                  )}
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
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Payment Options Modal */}
      {degenState.showPaymentOptionsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {!degenState.showSignatureStep ? (
              // Payment Method Selection Step
              <>
                <Text style={styles.modalTitle}>Choose Payment Method</Text>
                <Text style={styles.modalSubtitle}>
                  You need to pay the full {totalAmount} USDC bill. How would you like to pay?
                </Text>
                
                <View style={styles.paymentOptionsModalContainer}>
                  <TouchableOpacity 
                    style={styles.paymentOptionButton}
                    onPress={() => {
                      degenState.setSelectedPaymentMethod('personal-wallet');
                      degenState.setShowSignatureStep(true);
                    }}
                  >
                    <View style={styles.paymentOptionIcon}>
                      <Text style={styles.paymentOptionIconText}>💳</Text>
                    </View>
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionTitle}>In-App Wallet</Text>
                      <Text style={styles.paymentOptionDescription}>
                        Withdraw to In-App Wallet
                      </Text>
                    </View>
                    <Text style={styles.paymentOptionArrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.paymentOptionButton}
                    onPress={() => {
                      degenState.setSelectedPaymentMethod('kast-card');
                      degenState.setShowSignatureStep(true);
                    }}
                  >
                    <View style={styles.paymentOptionIcon}>
                      <Text style={styles.paymentOptionIconText}>🏦</Text>
                    </View>
                    <View style={styles.paymentOptionContent}>
                      <Text style={styles.paymentOptionTitle}>KAST Card</Text>
                      <Text style={styles.paymentOptionDescription}>
                        Withdraw to KAST Card
                      </Text>
                    </View>
                    <Text style={styles.paymentOptionArrow}>→</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => degenState.setShowPaymentOptionsModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Signature Step
              <>
                <Text style={styles.modalTitle}>
                  Withdraw Your Locked Funds
                </Text>
                <Text style={styles.modalSubtitle}>
                  Your locked funds will be sent from the split wallet to your chosen destination.
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
                  disabled={degenState.isSigning}
                  loading={degenState.isSigning}
                  text="Slide to Transfer"
                />

                <TouchableOpacity 
                  style={styles.modalBackButton}
                  onPress={() => {
                    degenState.setShowSignatureStep(false);
                    degenState.setSelectedPaymentMethod(null);
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
    </Container>
  );
};

export default DegenResultScreen;
