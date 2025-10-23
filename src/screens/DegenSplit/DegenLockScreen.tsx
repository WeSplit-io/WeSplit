/**
 * Degen Lock Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenLockStyles';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { splitRealtimeService, SplitRealtimeUpdate } from '../../services/splits';
import { FallbackDataService } from '../../services/data/mockupData';

// Import our custom hooks and components
import { useDegenSplitState, useDegenSplitLogic, useDegenSplitInitialization, useDegenSplitRealtime } from './hooks';
import { DegenSplitHeader, DegenSplitProgress, DegenSplitParticipants } from './components';
import { Container } from '../../components/shared';

// AppleSlider component adapted from SendConfirmationScreen
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Slide to Lock' }) => {
  const maxSlideDistance = 300;
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [isSliderActive, setIsSliderActive] = useState(false);

  const panResponder = require('react-native').PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !loading,
    onMoveShouldSetPanResponder: () => !disabled && !loading,
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_: any, gestureState: any) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_: any, gestureState: any) => {
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
              ...require('react-native').StyleSheet.absoluteFillObject,
              opacity: sliderValue.interpolate({ inputRange: [0, maxSlideDistance], outputRange: [0, 1] }) as any,
              borderRadius: 999,
            }}
          >
            <LinearGradient
              colors={[colors.green, colors.greenBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                ...require('react-native').StyleSheet.absoluteFillObject,
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
            {loading ? 'Locking...' : text}
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
              ...require('react-native').StyleSheet.absoluteFillObject,
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

// Category image mapping
const CATEGORY_IMAGES: { [key: string]: any } = {
  trip: require('../../../assets/trip-icon-black.png'),
  food: require('../../../assets/food-icon-black.png'),
  house: require('../../../assets/house-icon-black.png'),
  event: require('../../../assets/event-icon-black.png'),
  rocket: require('../../../assets/rocket-icon-black.png'),
  lamp: require('../../../assets/lamp-icon-black.png'),
  award: require('../../../assets/award-icon-black.png'),
  user: require('../../../assets/user-icon-black.png'),
};

interface DegenLockScreenProps {
  navigation: any;
  route: any;
}

const DegenLockScreen: React.FC<DegenLockScreenProps> = ({ navigation, route }) => {
  // Safely destructure route params with fallbacks
  const routeParams = route?.params || {};
  const { 
    billData, 
    participants: routeParticipants, 
    totalAmount: routeTotalAmount, 
    processedBillData, 
    splitData, 
    splitWallet: existingSplitWallet 
  } = routeParams;
  
  // Extract participants from splitData if not provided directly
  const [participants, setParticipants] = useState(routeParticipants || splitData?.participants || []);
  
  // Use route params if available, otherwise fallback to split data
  const totalAmount = routeTotalAmount || splitData?.totalAmount || 0;
  const { state } = useApp();
  const { currentUser } = state;
  
  // Initialize our custom hooks
  const degenState = useDegenSplitState(existingSplitWallet);
  const degenLogic = useDegenSplitLogic(degenState, (updates) => {
    // Update state function
    Object.keys(updates).forEach(key => {
      const setter = (degenState as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`];
      if (setter) {
        setter(updates[key as keyof typeof updates]);
      }
    });
  });
  const degenInit = useDegenSplitInitialization(degenState, (updates) => {
    // Update state function
    Object.keys(updates).forEach(key => {
      const setter = (degenState as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`];
      if (setter) {
        setter(updates[key as keyof typeof updates]);
      }
    });
  }, degenLogic);

  // Initialize real-time updates
  const realtimeState = useDegenSplitRealtime(
    splitData?.id,
    degenState.splitWallet?.id,
    {
      onParticipantUpdate: (participants) => {
        console.log('🔍 DegenLockScreen: Real-time participant update:', participants);
        setParticipants(participants);
      },
      onLockStatusUpdate: (lockedParticipants, allLocked) => {
        console.log('🔍 DegenLockScreen: Real-time lock status update:', { lockedParticipants, allLocked });
        degenState.setLockedParticipants(lockedParticipants);
        degenState.setAllParticipantsLocked(allLocked);
      },
      onSplitWalletUpdate: (splitWallet) => {
        console.log('🔍 DegenLockScreen: Real-time wallet update:', splitWallet);
        degenState.setSplitWallet(splitWallet);
      },
      onError: (error) => {
        console.error('🔍 DegenLockScreen: Real-time error:', error);
        degenState.setError(error.message);
      }
    }
  );

  // Animation refs are initialized in the useDegenSplitState hook

  // Debug logging for route params
  useEffect(() => {
    console.log('🔍 DegenLockScreen route params:', {
      hasRoute: !!route,
      hasParams: !!route?.params,
      routeParams: routeParams,
      splitData: splitData,
      participants: participants,
      totalAmount: totalAmount
    });
  }, [route, routeParams, splitData, participants, totalAmount]);

  // Calculate progress percentage and update animation
  const updateCircleProgress = useCallback(() => {
    let lockedCount = 0;
    
    if (degenState.splitWallet?.participants) {
      // Use wallet participants for accurate count - check if they've paid their full amount AND are locked
      lockedCount = degenState.splitWallet.participants.filter((p: any) => 
        p.amountPaid >= p.amountOwed && p.status === 'locked'
      ).length;
    } else {
      // Fallback to local state
      lockedCount = degenState.lockedParticipants.length;
    }
    
    const totalCount = participants.length;
    const progressPercentage = totalCount > 0 ? lockedCount / totalCount : 0;
    
    logger.debug('Updating circle progress', {
      lockedCount,
      totalCount,
      progressPercentage: (progressPercentage * 100).toFixed(1) + '%',
      animatedValue: progressPercentage,
      shouldShowGreen: progressPercentage > 0
    });
    
    // Animate to the new progress value
    if (degenState.circleProgressRef.current) {
      Animated.timing(degenState.circleProgressRef.current, {
        toValue: progressPercentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [degenState.splitWallet?.participants, degenState.lockedParticipants.length, participants.length, degenState.circleProgressRef]);

  // Update circle progress when split wallet changes
  useEffect(() => {
    updateCircleProgress();
  }, [degenState.splitWallet, updateCircleProgress]);
  
  const insets = useSafeAreaInsets();

  // Early return if essential data is missing
  if (!splitData && !billData) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading split data...</Text>
      </SafeAreaView>
    );
  }

  // Memoize the bill date to prevent excessive FallbackDataService calls
  const billDate = useMemo(() => {
    try {
      return FallbackDataService.getBillDate();
    } catch (error) {
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }, []);

  // Get category image based on data
  const getCategoryImage = () => {
    const category = splitData?.category || 
                    billData?.category || 
                    processedBillData?.category || 
                    'food';
    
    return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['food'];
  };

  // Validate required data
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    // Log error but don't show popup
    console.error('Invalid participants data');
    navigation.navigate('SplitsList');
    return null;
  }

  // Event handlers
  const handleBack = () => {
    navigation.navigate('SplitsList');
  };

  const handleLockMyShare = async () => {
    const success = await degenLogic.handleLockMyShare(currentUser, totalAmount, participants);
    if (!success) {
      return;
    }
  };

  const handleLockTheSplit = async () => {
    const success = await degenLogic.handleLockTheSplit(splitData, currentUser, totalAmount, participants);
    if (success) {
      // Success handled by the logic - no popup needed
    }
  };

  const handleSendMyShare = async () => {
    const success = await degenLogic.handleSendMyShare(splitData, currentUser, totalAmount, participants);
    if (success) {
      // Update progress immediately
      updateCircleProgress();
      // Show success message and stay on current screen
      Alert.alert('Success', 'Your funds have been locked! Waiting for other participants...');
      // The screen will automatically update to show the roulette button when all participants are locked
    }
  };

  const handleRollRoulette = () => {
    if (!degenState.allParticipantsLocked || !degenState.splitWallet) {
      return;
    }
    
    try {
      navigation.navigate('DegenSpin', {
        billData,
        participants,
        totalAmount,
        splitWallet: degenState.splitWallet,
        processedBillData,
        splitData,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start the roulette. Please try again.');
    }
  };

  const handleShowPrivateKey = async () => {
    if (degenState.splitWallet) {
      await degenLogic.handleShowPrivateKey(degenState.splitWallet, currentUser);
    }
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

  // Initialize the degen split when component mounts
  useEffect(() => {
    const initialize = async () => {
      // Refresh participant data first
      const refreshedParticipants = await degenInit.refreshParticipantData(participants);
      setParticipants(refreshedParticipants);
      
      // Initialize the degen split
      await degenInit.initializeDegenSplit(splitData, currentUser, refreshedParticipants, totalAmount);
    };

    initialize();
  }, []);

  // Start periodic checks
  useEffect(() => {
    const cleanupLockCheck = degenInit.startPeriodicLockCheck(
      degenState.splitWallet,
      currentUser,
      participants
    );

    const cleanupWalletCheck = degenInit.startPeriodicWalletCheck(
      splitData,
      currentUser
    );

    return () => {
      cleanupLockCheck();
      cleanupWalletCheck();
    };
  }, [degenState.splitWallet, degenState.isLocked, degenState.allParticipantsLocked]);

    // Calculate progress - check if participants have locked their funds (status 'locked' or amountPaid >= amountOwed)
    // Only count participants who have actually sent their share, not just locked status
    const lockedCount = degenState.splitWallet?.participants?.filter((p: any) => 
      p.amountPaid >= p.amountOwed && p.status === 'locked'
    ).length || degenState.lockedParticipants.length;

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <DegenSplitHeader
        title="Degen Split"
        onBackPress={handleBack}
        isRealtimeActive={realtimeState.isRealtimeActive}
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Bill Info Card with Gradient */}
        <LinearGradient
          colors={[colors.green, colors.greenBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.billCard}
        >
          <View style={styles.billCardHeader}>
            <View style={styles.billIconContainer}>
              <Image 
                source={getCategoryImage()} 
                style={styles.billIcon}
                tintColor={colors.white}
                resizeMode="contain"
              />
            </View>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billTitle}>{splitData?.title || billData?.title || 'Degen Split'}</Text>
              <Text style={styles.billDate}>
                {billDate}
              </Text>
            </View>
          </View>
          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Total Bill</Text>
            <Text style={styles.totalBillAmount}>{totalAmount} USDC</Text>
          </View>
          <View style={styles.billCardDotLeft}/>
          <View style={styles.billCardDotRight}/>
        </LinearGradient>

        {/* Split Wallet Section */}
        {(degenState.splitWallet || (splitData?.splitType === 'degen' && splitData)) && (
          <View style={styles.splitWalletSection}>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Split Wallet Address</Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={styles.splitWalletAddress}>
                    {degenState.splitWallet ? degenLogic.formatWalletAddress(degenState.splitWallet.walletAddress) : 'Wallet not created yet'}
                  </Text>
                  <TouchableOpacity onPress={() => degenState.splitWallet && handleCopyWalletAddress(degenState.splitWallet.walletAddress)}>
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
                  source={require('../../../assets/eye-icon.png')}
                  style={styles.privateKeyButtonIcon}
                />
                <Text style={styles.privateKeyButtonText}>View Private Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lock Progress Circle - Only show when split wallet exists (split is locked) */}
        {degenState.splitWallet && (
          <DegenSplitProgress
            lockedCount={lockedCount}
            totalCount={participants.length}
            circleProgressRef={degenState.circleProgressRef}
          />
        )}

        {/* Participants List */}
        <DegenSplitParticipants
          participants={participants}
          totalAmount={totalAmount}
          currentUserId={currentUser?.id?.toString()}
          splitWallet={degenState.splitWallet}
        />

        {/* Lock Button */}
        <View style={[styles.lockButtonContainer]}>
          {!degenState.splitWallet && degenLogic.isCurrentUserCreator(currentUser, splitData) ? (
            // Creator and no wallet yet - show "Lock the Split" button
            <TouchableOpacity
              onPress={handleLockTheSplit}
              disabled={degenState.isCreatingWallet}
            >
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lockButton}
              >
                <Text style={styles.lockButtonText}>
                  {degenState.isCreatingWallet ? 'Creating Split...' : 'Continue'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : !degenState.isLocked ? (
            // Not locked yet - show "Send My Share" button
            <TouchableOpacity
              onPress={() => degenState.setShowLockModal(true)}
              disabled={degenState.isLocking || degenState.isLoadingWallet}
            >
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lockButton}
              >
                <Text style={styles.lockButtonText}>
                  {degenState.isLocking ? 'Sending Share...' : degenState.isLoadingWallet ? 'Loading...' : 'Send My Share'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : degenLogic.isCurrentUserCreator(currentUser, splitData) ? (
            // Creator and locked - show waiting or start spinning
            degenState.splitWallet?.status === 'spinning_completed' ? (
              // Roulette completed - show view results button
              <TouchableOpacity
                style={styles.lockButton}
                onPress={() => {
                  // Navigate to results screen with the winner information
                  if (degenState.splitWallet?.degenWinner) {
                    navigation.navigate('DegenResult', {
                      billData,
                      participants,
                      totalAmount,
                      selectedParticipant: {
                        id: degenState.splitWallet.degenWinner.userId,
                        name: degenState.splitWallet.degenWinner.name,
                        userId: degenState.splitWallet.degenWinner.userId
                      },
                      splitWallet: degenState.splitWallet,
                      processedBillData,
                      splitData,
                    });
                  }
                }}
              >
                <LinearGradient
                  colors={[colors.red, colors.red]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.lockButton}
                >
                  <Text style={styles.lockButtonText}>
                    🎯 View Results
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : degenState.allParticipantsLocked ? (
              // All locked - show start spinning button
              <TouchableOpacity
                style={styles.lockButton}
                onPress={handleRollRoulette}
                disabled={degenState.isCheckingLocks}
              >
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.lockButton}
                >
                  <Text style={styles.lockButtonText}>
                    {degenState.isCheckingLocks ? 'Checking...' : 'Start Spinning'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // Not all locked - show waiting message
              <View style={[styles.lockButton, styles.lockButtonDisabled]}>
                <Text style={[styles.lockButtonText, styles.lockButtonTextDisabled]}>
                  {(() => {
                    const remaining = participants.length - lockedCount;
                    return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                  })()}
                </Text>
              </View>
            )
          ) : (
            // Not creator but locked - show waiting message or view results
            degenState.splitWallet?.status === 'spinning_completed' ? (
              // Roulette completed - show view results button
              <TouchableOpacity
                style={styles.lockButton}
                onPress={() => {
                  // Navigate to results screen with the winner information
                  if (degenState.splitWallet?.degenWinner) {
                    navigation.navigate('DegenResult', {
                      billData,
                      participants,
                      totalAmount,
                      selectedParticipant: {
                        id: degenState.splitWallet.degenWinner.userId,
                        name: degenState.splitWallet.degenWinner.name,
                        userId: degenState.splitWallet.degenWinner.userId
                      },
                      splitWallet: degenState.splitWallet,
                      processedBillData,
                      splitData,
                    });
                  }
                }}
              >
                <LinearGradient
                  colors={[colors.red, colors.red]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.lockButton}
                >
                  <Text style={styles.lockButtonText}>
                    🎯 View Results
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // Roulette not completed - show waiting message
              <View style={[styles.lockButton, styles.lockButtonDisabled]}>
                <Text style={[styles.lockButtonText, styles.lockButtonTextDisabled]}>
                  {degenState.allParticipantsLocked 
                    ? 'Waiting for the creator to spin!' 
                    : (() => {
                        const remaining = participants.length - lockedCount;
                        return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                      })()
                  }
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Lock Confirmation Modal */}
      {degenState.showLockModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Image 
                  source={require('../../../assets/lock-check-icon.png')} 
                  style={styles.modalLockIcon}
                />
              </View>
              <Text style={styles.modalTitle}>
                Lock {totalAmount} USDC to split the Bill
              </Text>
              <Text style={styles.modalSubtitle}>
                Lock your funds to participate in the degen split roulette!
              </Text>
              
              <AppleSlider
                onSlideComplete={handleSendMyShare}
                disabled={degenState.isLocking}
                loading={degenState.isLocking}
                text="Slide to Send My Share"
              />
            </View>
          </View>
        </View>
      )}

      {/* Wallet Recap Modal */}
      {degenState.showWalletRecapModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.walletRecapModal}>
            <Text style={styles.walletRecapTitle}>🎉 Split Wallet Created!</Text>
            <Text style={styles.walletRecapSubtitle}>
              Your Degen Split wallet has been created with shared private key access. All participants can access the private key to withdraw or move funds.
            </Text>
            
            {degenState.splitWallet && (
              <View style={styles.walletRecapContent}>
                <View style={styles.walletInfoCard}>
                  <Text style={styles.walletInfoLabel}>Wallet Address</Text>
                  <View style={styles.walletAddressContainer}>
                    <Text style={styles.walletAddressText}>
                      {degenLogic.formatWalletAddress(degenState.splitWallet.walletAddress)}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const { Clipboard } = require('react-native');
                        Clipboard.setString(degenState.splitWallet!.walletAddress);
                        Alert.alert('Copied', 'Wallet address copied to clipboard');
                      }}
                      style={styles.copyButton}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.privateKeyButton} 
                  onPress={handleShowPrivateKey}
                >
                  <Text style={styles.privateKeyButtonText}>🔑 View Private Key</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.walletRecapButtons}>
              <TouchableOpacity 
                style={styles.walletRecapButton}
                onPress={() => degenState.setShowWalletRecapModal(false)}
              >
                <Text style={styles.walletRecapButtonText}>Continue</Text>
              </TouchableOpacity>
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
    </Container>
  );
};

export default DegenLockScreen;
