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
import { Container, Button, Modal, AppleSlider, PhosphorIcon } from '../../components/shared';
import { roundUsdcAmount, formatUsdcForDisplay } from '../../utils/ui/format/formatUtils';
import { getSplitStatusDisplayText } from '../../utils/statusUtils';


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
  
  // Debug logging for amount values
  useEffect(() => {
    const testAmount = 0.11599999999999999;
    const testRounded = roundUsdcAmount(testAmount);
    
    console.log('🔍 DegenLockScreen amount debugging:', {
      routeTotalAmount,
      splitDataTotalAmount: splitData?.totalAmount,
      finalTotalAmount: totalAmount,
      roundedAmount: roundUsdcAmount(totalAmount),
      isNumber: typeof totalAmount === 'number',
      isFinite: Number.isFinite(totalAmount),
      testAmount,
      testRounded,
      testAmountString: testAmount.toString(),
      testRoundedString: testRounded.toString()
    });
  }, [totalAmount, routeTotalAmount, splitData?.totalAmount]);
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
        
        // CRITICAL FIX: Check if current user has locked their funds when wallet is updated
        if (splitWallet && currentUser) {
          const userHasLocked = degenLogic.checkUserLockStatus(splitWallet, currentUser);
          degenState.setIsLocked(userHasLocked);
          
          // Update locked participants list
          if (userHasLocked) {
            const userId = currentUser.id.toString();
            if (!degenState.lockedParticipants.includes(userId)) {
              degenState.setLockedParticipants([...degenState.lockedParticipants, userId]);
            }
          } else {
            const userId = currentUser.id.toString();
            degenState.setLockedParticipants(degenState.lockedParticipants.filter(id => id !== userId));
          }
          
          logger.info('Lock status synced from real-time wallet update', {
            userId: currentUser.id.toString(),
            hasLocked: userHasLocked
          }, 'DegenLockScreen');
        }
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
      // CRITICAL FIX: Use wallet participants for accurate count - check if they've paid their full amount AND are locked AND have transaction signature
      lockedCount = degenState.splitWallet.participants.filter((p: any) => 
        p.status === 'locked' && 
        p.amountPaid >= p.amountOwed &&
        p.transactionSignature // Ensure they have a valid transaction signature
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

  // CRITICAL FIX: Sync isLocked state whenever splitWallet changes
  // This ensures that when user returns to the screen, isLocked reflects their actual lock status
  useEffect(() => {
    if (degenState.splitWallet && currentUser) {
      const userHasLocked = degenLogic.checkUserLockStatus(degenState.splitWallet, currentUser);
      
      // Only update if the state is different to avoid unnecessary re-renders
      if (degenState.isLocked !== userHasLocked) {
        degenState.setIsLocked(userHasLocked);
        
        // Update locked participants list
        const userId = currentUser.id.toString();
        if (userHasLocked) {
          if (!degenState.lockedParticipants.includes(userId)) {
            degenState.setLockedParticipants([...degenState.lockedParticipants, userId]);
          }
        } else {
          degenState.setLockedParticipants(degenState.lockedParticipants.filter(id => id !== userId));
        }
        
        logger.info('Lock status synced from wallet change', {
          userId: currentUser.id.toString(),
          hasLocked: userHasLocked,
          walletId: degenState.splitWallet?.id
        }, 'DegenLockScreen');
      }
    }
  }, [degenState.splitWallet, currentUser?.id, degenLogic]);
  
  const insets = useSafeAreaInsets();
  const isResultReady = degenState.splitWallet?.status === 'spinning_completed' || degenState.splitWallet?.status === 'completed';

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
  // CRITICAL FIX: Also reload wallet when participants change (e.g., after inviting users)
  useEffect(() => {
    const initialize = async () => {
      // Refresh participant data first
      const refreshedParticipants = await degenInit.refreshParticipantData(participants);
      setParticipants(refreshedParticipants);
      
      // Initialize the degen split
      await degenInit.initializeDegenSplit(splitData, currentUser, refreshedParticipants, totalAmount);
    };

    // CRITICAL FIX: Reload wallet if participants change (e.g., after inviting users)
    // This ensures wallet is refreshed when new participants are added
        const reloadWallet = async () => {
      if (degenState.splitWallet && splitData && currentUser) {
        try {
          const { SplitWalletService } = await import('../../services/split');
          const walletResult = await SplitWalletService.getSplitWallet(degenState.splitWallet.id);
          if (walletResult.success && walletResult.wallet) {
            degenState.setSplitWallet(walletResult.wallet);
            
            // CRITICAL FIX: Check lock status when wallet is reloaded
            const userHasLocked = degenLogic.checkUserLockStatus(walletResult.wallet, currentUser);
            degenState.setIsLocked(userHasLocked);
            
            console.log('🔍 DegenLockScreen: Wallet reloaded after participant change:', {
              walletId: walletResult.wallet.id,
              participantsCount: walletResult.wallet.participants.length,
              userHasLocked
            });
          }
        } catch (error) {
          console.error('🔍 DegenLockScreen: Error reloading wallet:', error);
        }
      }
    };

    // Only initialize if we have the required data and haven't initialized yet
    if (splitData && currentUser && participants && totalAmount && !degenState.splitWallet) {
      initialize();
    } else if (degenState.splitWallet && participants && participants.length > 0) {
      // CRITICAL FIX: Reload wallet when participants change (e.g., after inviting users)
      // Check if wallet participants count differs from current participants count
      const walletParticipantsCount = degenState.splitWallet.participants?.length || 0;
      const currentParticipantsCount = participants.length;
      
      if (currentParticipantsCount !== walletParticipantsCount) {
        console.log('🔍 DegenLockScreen: Participant count changed, reloading wallet:', {
          walletParticipantsCount,
          currentParticipantsCount
        });
        reloadWallet();
      }
    }
  }, [splitData?.id, currentUser?.id, totalAmount, participants?.length]); // CRITICAL FIX: Add participants.length dependency

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

    // Calculate progress - check if participants have locked their funds
    // CRITICAL FIX: Only count participants who have actually sent their share
    // Must have: status 'locked' AND amountPaid >= amountOwed AND transactionSignature
    // This ensures we only count participants who have valid transaction signatures
    let lockedCount = 0;
    
    if (degenState.splitWallet?.participants) {
      // Use wallet participants for accurate count - check if they've paid their full amount AND are locked AND have transaction signature
      lockedCount = degenState.splitWallet.participants.filter((p: any) => 
        p.status === 'locked' && 
        p.amountPaid >= p.amountOwed &&
        p.transactionSignature // Ensure they have a valid transaction signature
      ).length;
    } else {
      // Fallback to local state - but ensure it's accurate
      lockedCount = degenState.lockedParticipants.length;
    }
    
    // Debug logging to understand the issue
    console.log('🔍 DegenLockScreen lockedCount calculation:', {
      hasSplitWallet: !!degenState.splitWallet,
      splitWalletParticipants: degenState.splitWallet?.participants?.map((p: any) => ({
        userId: p.userId,
        status: p.status,
        amountPaid: p.amountPaid,
        amountOwed: p.amountOwed,
        hasTransactionSignature: !!p.transactionSignature
      })),
      lockedParticipantsLength: degenState.lockedParticipants.length,
      finalLockedCount: lockedCount,
      totalParticipants: participants.length
    });

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <DegenSplitHeader
        title="Degen Split"
        onBackPress={handleBack}
        isRealtimeActive={realtimeState.hasReceivedRealtimeData}
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
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
            <Text style={styles.totalBillAmount}>{formatUsdcForDisplay(totalAmount)} USDC</Text>
          </View>

        </LinearGradient>

        {/* Split Wallet Section */}
        {degenState.splitWallet && (
          <View style={styles.splitWalletSection}>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Split Wallet Address</Text>
                <TouchableOpacity 
                  style={styles.walletAddressContainer}
                  onPress={() => degenState.splitWallet && handleCopyWalletAddress(degenState.splitWallet.walletAddress)}
                >
                  <Text style={styles.splitWalletAddress}>
                    {degenState.splitWallet ? degenLogic.formatWalletAddress(degenState.splitWallet.walletAddress) : 'Wallet not created yet'}
                  </Text>
                  <PhosphorIcon
                    name="Copy"
                    size={20}
                    color={colors.white}
                    weight="regular"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.privateKeyButton,
                  // CRITICAL: Disable if user has already withdrawn (single withdrawal rule)
                  (() => {
                    const currentUserParticipant = degenState.splitWallet?.participants.find(
                      p => p.userId === currentUser?.id.toString()
                    );
                    return currentUserParticipant?.status === 'paid' ? { opacity: 0.5 } : {};
                  })()
                ]}
                onPress={handleShowPrivateKey}
                disabled={(() => {
                  const currentUserParticipant = degenState.splitWallet?.participants.find(
                    p => p.userId === currentUser?.id.toString()
                  );
                  return currentUserParticipant?.status === 'paid';
                })()}
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
        <View style={styles.participantsContainer}>
        <Text style={styles.splitMethodLabel}>Split Participants:</Text>

          <DegenSplitParticipants
            participants={participants}
            totalAmount={totalAmount}
            currentUserId={currentUser?.id?.toString()}
            splitWallet={degenState.splitWallet}
          />
        </View>

      </ScrollView>

      {/* Fixed Bottom Lock Button */}
      <View style={styles.fixedBottomButtonContainer}>
        {!degenState.splitWallet && degenLogic.isCurrentUserCreator(currentUser, splitData) ? (
          // Creator and no wallet yet - show "Lock the Split" button
          <Button
            title={degenState.isCreatingWallet ? 'Creating Split...' : 'Continue'}
            onPress={handleLockTheSplit}
            variant="primary"
            disabled={degenState.isCreatingWallet}
            loading={degenState.isCreatingWallet}
          />
        ) : !degenState.isLocked ? (
          // Not locked yet - show "Send My Share" button
          <Button
            title={degenState.isLocking ? 'Sending Share...' : degenState.isLoadingWallet ? 'Loading...' : 'Send My Share'}
            onPress={() => degenState.setShowLockModal(true)}
            variant="primary"
            disabled={degenState.isLocking || degenState.isLoadingWallet}
            loading={degenState.isLocking || degenState.isLoadingWallet}
          />
        ) : degenLogic.isCurrentUserCreator(currentUser, splitData) ? (
          // Creator and locked - show waiting or start spinning
          isResultReady ? (
            // Roulette completed - show view results button
            <Button
              title="View Results"
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
              variant="primary"
            />
          ) : degenState.allParticipantsLocked ? (
            // All locked - show start spinning button
            <Button
              title={degenState.isCheckingLocks ? `${getSplitStatusDisplayText('pending')}...` : 'Start Spinning'}
              onPress={handleRollRoulette}
              variant="primary"
              disabled={degenState.isCheckingLocks}
              loading={degenState.isCheckingLocks}
            />
          ) : (
            // Not all locked - show waiting message
            <Button
              title={(() => {
                const remaining = participants.length - lockedCount;
                return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
              })()}
              onPress={() => {}}
              variant="primary"
              disabled={true}
            />
          )
        ) : (
          // Not creator but locked - show waiting message or view results
          isResultReady ? (
            // Roulette completed - show view results button
            <Button
              title="🎯 View Results"
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
              variant="primary"
            />
          ) : (
            // Roulette not completed - show waiting message
            <Button
              title={degenState.allParticipantsLocked 
                ? 'Waiting for the creator to spin!' 
                : (() => {
                    const remaining = participants.length - lockedCount;
                    return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                  })()
              }
              onPress={() => {}}
              variant="primary"
              disabled={true}
            />
          )
        )}
      </View>

      {/* Lock Confirmation Modal */}
      <Modal
        visible={degenState.showLockModal}
        onClose={() => degenState.setShowLockModal(false)}
        showHandle={true}
        title={`Lock ${formatUsdcForDisplay(totalAmount)} USDC to split the Bill`}
        description="Lock your funds to participate in the degen split roulette!"
      >
        <View style={styles.modalIconContainer}>
          <PhosphorIcon 
            name="Lock" 
            size={32} 
            color={colors.white} 
            weight="fill"
          />
        </View>
        
        <AppleSlider
          onSlideComplete={handleSendMyShare}
          disabled={degenState.isLocking}
          loading={degenState.isLocking}
          text="Slide to Send My Share"
        />
      </Modal>

      {/* Wallet Recap Modal */}
      <Modal
        visible={degenState.showWalletRecapModal}
        onClose={() => degenState.setShowWalletRecapModal(false)}
        showHandle={true}
        title="🎉 Split Wallet Created!"
        description="Your Degen Split wallet has been created with shared private key access. All participants can access the private key to withdraw or move funds."
      >
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
            
            <Button
              title="View Private Key"
              onPress={handleShowPrivateKey}
              variant="secondary"
              size="small"
              icon="Key"
              iconPosition="left"
              disabled={(() => {
                // CRITICAL: Disable if user has already withdrawn (single withdrawal rule)
                const currentUserParticipant = degenState.splitWallet?.participants.find(
                  p => p.userId === currentUser?.id.toString()
                );
                return currentUserParticipant?.status === 'paid';
              })()}
            />
          </View>
        )}
        
        <View style={styles.walletRecapButtons}>
          <Button
            title="Continue"
            onPress={() => degenState.setShowWalletRecapModal(false)}
            variant="primary"
          />
        </View>
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={degenState.showPrivateKeyModal && !!degenState.privateKey}
        onClose={handleClosePrivateKeyModal}
        showHandle={true}
        title="Private Key"
        description="This is a shared private key for the Degen Split. All participants have access to this key to withdraw or move funds from the split wallet."
      >
        <View style={styles.privateKeyDisplay}>
          <Text style={styles.privateKeyText}>{degenState.privateKey}</Text>
        </View>
        
        <View style={styles.privateKeyWarning}>
          <Text style={styles.privateKeyWarningText}>
            ⚠️ This is a shared private key for the Degen Split. All participants can use this key to access the split wallet funds.
          </Text>
        </View>
        
        <View style={styles.privateKeyButtons}>
          <Button
            title="Copy Key"
            onPress={handleCopyPrivateKey}
            variant="primary"
            style={{flex: 1}}
          />
          <Button
            title="Close"
            onPress={handleClosePrivateKeyModal}
            variant="secondary"
            style={{flex: 1}}
          />
        </View>
      </Modal>
    </Container>
  );
};

export default DegenLockScreen;
