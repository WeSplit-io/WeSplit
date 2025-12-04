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
  ActivityIndicator
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
import { Container, Button, Modal, AppleSlider, PhosphorIcon, ModernLoader } from '../../components/shared';
import CentralizedTransactionModal, { type TransactionModalConfig } from '../../components/shared/CentralizedTransactionModal';
import { roundUsdcAmount, formatUsdcForDisplay } from '../../utils/ui/format/formatUtils';
import { getSplitStatusDisplayText } from '../../utils/statusUtils';


// Category image mapping - using Phosphor icons
const CATEGORY_IMAGES: { [key: string]: any } = {
  trip: 'Suitcase',
  food: 'Coffee',
  house: 'House',
  event: 'Calendar',
  rocket: 'Rocket',
  lamp: 'Lightbulb',
  award: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Faward-icon-black.png?alt=media&token=07283493-afd6-489e-a5c2-7dffc6922f41' },
  user: 'User',
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
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  
  // Use route params if available, otherwise fallback to split data
  const totalAmount = routeTotalAmount || splitData?.totalAmount || 0;
  
  // Debug logging for amount values (development only)
  useEffect(() => {
    if (__DEV__) {
    const testAmount = 0.11599999999999999;
    const testRounded = roundUsdcAmount(testAmount);
    
      logger.debug('Amount debugging', {
      routeTotalAmount,
      splitDataTotalAmount: splitData?.totalAmount,
      finalTotalAmount: totalAmount,
      roundedAmount: roundUsdcAmount(totalAmount),
      isNumber: typeof totalAmount === 'number',
      isFinite: Number.isFinite(totalAmount),
      testAmount,
        testRounded
      }, 'DegenLockScreen');
    }
  }, [totalAmount, routeTotalAmount, splitData?.totalAmount]);
  const { state } = useApp();
  const { currentUser } = state;
  
  // Initialize our custom hooks FIRST - before any code that uses degenState
  const degenState = useDegenSplitState(existingSplitWallet);
  
  const currentUserParticipant = useMemo(() => {
    if (!degenState.splitWallet || !currentUser?.id) {return null;}
    return degenState.splitWallet.participants.find(
      participant => participant.userId === currentUser.id.toString()
    ) || null;
  }, [degenState.splitWallet, currentUser?.id]);
  const hasCurrentUserWithdrawn = currentUserParticipant?.status === 'paid';
  const isPrivateKeyActionDisabled = hasCurrentUserWithdrawn || degenState.isFetchingPrivateKey;
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
        logger.debug('Real-time participant update', { participantsCount: participants.length }, 'DegenLockScreen');
        setParticipants(participants);
      },
      onLockStatusUpdate: (lockedParticipants, allLocked) => {
        logger.debug('Real-time lock status update', { lockedCount: lockedParticipants.length, allLocked }, 'DegenLockScreen');
        degenState.setLockedParticipants(lockedParticipants);
        degenState.setAllParticipantsLocked(allLocked);
      },
      onSplitWalletUpdate: (splitWallet) => {
        logger.debug('Real-time wallet update', { walletId: splitWallet?.id }, 'DegenLockScreen');
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
        logger.error('Real-time error', { error: error.message }, 'DegenLockScreen');
        degenState.setError(error.message);
      }
    }
  );

  // Animation refs are initialized in the useDegenSplitState hook

  // Debug logging for route params (development only)
  useEffect(() => {
    if (__DEV__) {
      logger.debug('Route params', {
      hasRoute: !!route,
      hasParams: !!route?.params,
        participantsCount: participants?.length,
        totalAmount
      }, 'DegenLockScreen');
    }
  }, [route, participants, totalAmount]);

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

  // Show loader while split is initializing
  if (degenState.isInitializing || (!splitData && !billData)) {
    return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ModernLoader size="large" text="Loading split..." />
        </View>
      </Container>
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
    logger.error('Invalid participants data', new Error('Participants data is missing or invalid'), 'DegenLockScreen');
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

  const handleSendMyShare = () => {
    // Show centralized transaction modal
    const modalConfig: TransactionModalConfig = {
      title: `Lock ${formatUsdcForDisplay(totalAmount)} USDC to split the Bill`,
      subtitle: 'Lock your funds to participate in the degen split roulette!',
      showAmountInput: false, // Amount is fixed for degen split
      showMemoInput: false,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'degen_split_lock',
      prefilledAmount: totalAmount,
      customRecipientInfo: {
        name: 'Degen Split Wallet',
        address: degenState.splitWallet?.walletAddress || '',
        type: 'split'
      },
      onSuccess: (result) => {
        logger.info('Degen split lock successful', { result });
        setTransactionModalConfig(null);
        // Update progress immediately
        updateCircleProgress();
        // Show success message and stay on current screen
        Alert.alert('Success', 'Your funds have been locked! Waiting for other participants...');
        // The screen will automatically update to show the roulette button when all participants are locked
      },
      onError: (error) => {
        logger.error('Degen split lock failed', { error });
        Alert.alert('Lock Failed', error);
        setTransactionModalConfig(null);
      },
      onClose: () => {
        setTransactionModalConfig(null);
      }
    };

    setTransactionModalConfig(modalConfig);
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
    if (!degenState.splitWallet || degenState.isFetchingPrivateKey) {return;}
      await degenLogic.handleShowPrivateKey(degenState.splitWallet, currentUser);
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
      // Set initializing state to show loader
      degenState.setIsInitializing(true);
      
      try {
        // Refresh participant data first
        const refreshedParticipants = await degenInit.refreshParticipantData(participants);
        setParticipants(refreshedParticipants);
        
        // Initialize the degen split
        await degenInit.initializeDegenSplit(splitData, currentUser, refreshedParticipants, totalAmount);
      } finally {
        // Initialization will set isInitializing to false when done, but ensure it's cleared here too
        degenState.setIsInitializing(false);
      }
    };

    // OPTIMIZED: Real-time updates will handle wallet refreshes automatically
    // Only initialize if we have the required data and haven't initialized yet
    if (splitData && currentUser && participants && totalAmount && !degenState.splitWallet) {
      initialize();
    }
    // Note: Real-time updates will automatically refresh wallet when participants change
    // No need for manual reload - this prevents duplicate calls and conflicts
  }, [splitData?.id, currentUser?.id, totalAmount, participants?.length]); // CRITICAL FIX: Add participants.length dependency

  // Pre-fetch private key payload when wallet loads to speed up "View Private Key" action
  useEffect(() => {
    if (degenState.splitWallet?.id && currentUser?.id) {
      const { SplitWalletService } = require('../../services/split');
      // Pre-fetch in background - don't await, let it happen asynchronously
      SplitWalletService.preFetchPrivateKeyPayload(degenState.splitWallet.id).catch(() => {
        // Silently fail - pre-fetch is optional optimization
      });
    }
  }, [degenState.splitWallet?.id, currentUser?.id]);

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
    
    // Debug logging to understand the issue (development only)
    if (__DEV__) {
      logger.debug('LockedCount calculation', {
      hasSplitWallet: !!degenState.splitWallet,
      lockedParticipantsLength: degenState.lockedParticipants.length,
      finalLockedCount: lockedCount,
      totalParticipants: participants.length
      }, 'DegenLockScreen');
    }

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
              {typeof getCategoryImage() === 'string' ? (
                <PhosphorIcon
                  name={getCategoryImage() as any}
                  size={32}
                  color={colors.white}
                  style={styles.billIcon}
                />
              ) : (
                <Image 
                  source={getCategoryImage()} 
                  style={styles.billIcon}
                  tintColor={colors.white}
                  resizeMode="contain"
                />
              )}
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
                  isPrivateKeyActionDisabled ? { opacity: 0.5 } : {}
                ]}
                onPress={handleShowPrivateKey}
                disabled={isPrivateKeyActionDisabled}
              >
                {degenState.isFetchingPrivateKey ? (
                  <>
                    <ActivityIndicator color={colors.white} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.privateKeyButtonText}>Retrieving...</Text>
                  </>
                ) : (
                  <>
                <PhosphorIcon
                  name="Eye"
                  size={20}
                  color={colors.white}
                  style={styles.privateKeyButtonIcon}
                />
                <Text style={styles.privateKeyButtonText}>View Private Key</Text>
                  </>
                )}
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

      {/* Centralized Transaction Modal */}
      {transactionModalConfig && (
        <CentralizedTransactionModal
          visible={!!transactionModalConfig}
          config={transactionModalConfig}
          splitWalletId={degenState.splitWallet?.id}
          splitId={splitData?.id}
          billId={splitData?.billId}
        />
      )}

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
              disabled={hasCurrentUserWithdrawn}
              loading={degenState.isFetchingPrivateKey}
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
