/**
 * Degen Lock Screen
 * Users must lock the full bill amount before the degen split can begin
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenLockStyles';
import { SplitWalletService } from '../../services/splitWalletService';
import { NotificationService } from '../../services/notificationService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { MockupDataService } from '../../data/mockupData';
import { useApp } from '../../context/AppContext';

interface DegenLockScreenProps {
  navigation: any;
  route: any;
}

const DegenLockScreen: React.FC<DegenLockScreenProps> = ({ navigation, route }) => {
  const { billData, participants: routeParticipants, totalAmount: routeTotalAmount, processedBillData, splitData, splitWallet: existingSplitWallet } = route.params;
  
  // Extract participants from splitData if not provided directly
  const participants = routeParticipants || splitData?.participants || [];
  
  // Use route params if available, otherwise fallback to mockup data
  const totalAmount = routeTotalAmount || MockupDataService.getBillAmount();
  const { state } = useApp();
  const { currentUser } = state;
  const insets = useSafeAreaInsets();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [splitWallet, setSplitWallet] = useState(existingSplitWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [lockedParticipants, setLockedParticipants] = useState<string[]>([]);
  const [allParticipantsLocked, setAllParticipantsLocked] = useState(false);
  const [isCheckingLocks, setIsCheckingLocks] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  
  const lockProgress = useRef(new Animated.Value(0)).current;

  // Memoize the bill date to prevent excessive FallbackDataService calls
  const billDate = useMemo(() => {
    try {
      return FallbackDataService.generateBillDate(processedBillData, billData, true);
    } catch (error) {
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }, [processedBillData, billData]);

  

  // Validate required data
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    Alert.alert('Error', 'Invalid participants data. Please try again.');
    navigation.goBack();
    return null;
  }

  const handleLockMyShare = () => {
    if (isLocked || isLocking || isLoadingWallet) return;
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Additional validation for participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      Alert.alert('Error', 'No participants found. Please try again.');
      return;
    }

    // Check if user has sufficient funds (this is a basic check - in real app you'd check actual balance)
    // For now, we'll show a warning but still allow the lock attempt
    Alert.alert(
      'Insufficient Funds',
      `You need ${totalAmount} USDC to lock your share, but your current balance is 0 USD. You can still attempt to lock, but the transaction may fail.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue Anyway', onPress: () => setShowLockModal(true) }
      ]
    );
  };

  const handleConfirmLock = async () => {
    setIsLocking(true);
    setShowLockModal(false);
    
    try {
      // Use existing split wallet - wallet should already be created during bill processing
      let walletToUse = splitWallet;
      
      if (!walletToUse) {
        Alert.alert('Error', 'No split wallet found. Please go back and create the split again.');
        setIsLocking(false);
        return;
      }

      // Sync participants between split data and split wallet if needed
      const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
      const walletParticipantIds = walletToUse.participants.map((p: any) => p.userId);
      
      if (splitParticipantIds.length !== walletParticipantIds.length || 
          !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
        const participantsForUpdate = participants.map(p => ({
          userId: p.userId || p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: totalAmount, // Each participant needs to lock the full amount for degen split
        }));
        
        const syncResult = await SplitWalletService.updateSplitWalletParticipants(
          walletToUse.id,
          participantsForUpdate
        );
        
        if (!syncResult.success) {
          Alert.alert('Error', 'Failed to sync participants. Please try again.');
          setIsLocking(false);
          return;
        }
        
        // Reload the wallet to get updated participants
        const reloadResult = await SplitWalletService.getSplitWallet(walletToUse.id);
        if (reloadResult.success && reloadResult.wallet) {
          walletToUse = reloadResult.wallet;
          setSplitWallet(walletToUse);
        }
      }

      // Lock the current user's amount in the split wallet
      const lockResult = await SplitWalletService.lockParticipantAmount(
        walletToUse.id,
        currentUser!.id.toString(),
        totalAmount
      );

      if (!lockResult.success) {
        Alert.alert(
          'Lock Failed', 
          lockResult.error || 'Failed to lock amount. This might be due to insufficient funds or network issues.',
          [{ text: 'OK' }]
        );
        setIsLocking(false);
        return;
      }

      // Update locked participants list
      setLockedParticipants((prev: string[]) => [...prev, currentUser!.id.toString()]);

      // Send lock required notifications to all other participants
      const otherParticipantIds = participants
        .filter(p => (p.userId || p.id) !== currentUser!.id.toString())
        .map(p => p.userId || p.id);
      
      const billName = splitData?.title || billData?.title || MockupDataService.getBillName();

      if (otherParticipantIds.length > 0) {
        await NotificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount,
          }
        );
      }

      // Lock the split method in the split data
      if (splitData && splitData.id) {
        try {
          const { SplitStorageService } = await import('../../services/splitStorageService');
          await SplitStorageService.updateSplit(splitData.id, {
            splitType: 'degen',
            status: 'active',
          });
        } catch (error) {
          // Non-critical error, continue
        }
      }

      // Animate the lock progress
      Animated.timing(lockProgress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start(async () => {
        setIsLocked(true);
        setIsLocking(false);
        
        // Reload wallet to get updated participant status
        const updatedWalletResult = await SplitWalletService.getSplitWallet(walletToUse.id);
        if (updatedWalletResult.success && updatedWalletResult.wallet) {
          setSplitWallet(updatedWalletResult.wallet);
        }
        
        // Check if all participants have locked their funds
        checkAllParticipantsLocked();
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to lock amount. Please try again.');
      setIsLocking(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Function to check if all participants have locked their funds
  const checkAllParticipantsLocked = useCallback(async () => {
    if (!splitWallet || !currentUser?.id) {
      return;
    }

    setIsCheckingLocks(true);
    try {
      // Get the current wallet status to check locked participants
      const walletResult = await SplitWalletService.getSplitWallet(splitWallet.id);
      
      if (walletResult.success && walletResult.wallet) {
        const wallet = walletResult.wallet;
        const totalParticipants = participants.length;
        
        const lockedCount = wallet.participants.filter((p: any) => 
          p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
        ).length;
        
        // Update locked participants list for UI
        const lockedParticipantIds = wallet.participants
          .filter((p: any) => p.amountPaid > 0 || (__DEV__ && p.status === 'locked'))
          .map((p: any) => p.userId);
        
        // Only update state if there's a change to avoid unnecessary re-renders
        setLockedParticipants(prev => {
          const prevIds = prev.sort();
          const newIds = lockedParticipantIds.sort();
          if (prevIds.length !== newIds.length || !prevIds.every((id, index) => id === newIds[index])) {
            return lockedParticipantIds;
          }
          return prev;
        });
        
        // Check if all participants are locked
        const allLocked = lockedCount === totalParticipants;
        setAllParticipantsLocked(prev => {
          if (prev !== allLocked) {
            return allLocked;
          }
          return prev;
        });

        // Update the splitWallet state with fresh data
        setSplitWallet(wallet);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsCheckingLocks(false);
    }
  }, [splitWallet, currentUser?.id, participants.length]);

  // Function to handle roulette button press
  const handleRollRoulette = () => {
    if (!allParticipantsLocked || !splitWallet) {
      return;
    }
    
    try {
      // Navigate to Degen Spin screen
      navigation.navigate('DegenSpin', {
        billData,
        participants,
        totalAmount,
        splitWallet,
        processedBillData,
        splitData,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start the roulette. Please try again.');
    }
  };

  const progressPercentage = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Load split wallet if not provided and check lock status
  useEffect(() => {
    const loadSplitWallet = async () => {
      if (!splitWallet && splitData?.walletId) {
        setIsLoadingWallet(true);
        try {
          const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            
            // Check if current user has already locked their funds
            if (currentUser?.id) {
              const userParticipant = walletResult.wallet.participants.find(
                p => p.userId === currentUser.id.toString()
              );
              
              if (userParticipant && (userParticipant.amountPaid > 0 || (__DEV__ && userParticipant.status === 'locked'))) {
                setIsLocked(true);
                setLockedParticipants(prev => [...prev, currentUser.id.toString()]);
              }
            }
            
            // Immediately check all participants' lock status to avoid flicker
            await checkAllParticipantsLocked();
          }
        } catch (error) {
          // Silent error handling
        } finally {
          setIsLoadingWallet(false);
        }
      }
    };

    loadSplitWallet();
  }, [splitData?.walletId, checkAllParticipantsLocked]);

  // Update allParticipantsLocked when splitWallet changes
  useEffect(() => {
    if (splitWallet?.participants) {
      // In dev mode, also check for 'locked' status in addition to amountPaid
      const lockedCount = splitWallet.participants.filter((p: any) => 
        p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
      ).length;
      const allLocked = lockedCount === participants.length;
      setAllParticipantsLocked(allLocked);
    }
  }, [splitWallet, participants.length]);

  // Periodic check for participant locks when user has locked their funds
  useEffect(() => {
    if (!isLocked || allParticipantsLocked) {
      return;
    }

    const interval = setInterval(() => {
      checkAllParticipantsLocked();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isLocked, allParticipantsLocked]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Degen Split</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Bill Info Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <Text style={styles.billIcon}>🍽️</Text>
            <Text style={styles.billTitle}>{splitData?.title || billData?.title || MockupDataService.getBillName()}</Text>
          </View>
          <Text style={styles.billDate}>
            {billDate}
          </Text>
          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Total Bill</Text>
            <Text style={styles.totalBillAmount}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Lock Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  transform: [{
                    rotate: lockProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]} 
            />
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>
                {(() => {
                  // Use wallet data for accurate count if available
                  if (splitWallet?.participants) {
                    const lockedCount = splitWallet.participants.filter((p: any) => 
                      p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
                    ).length;
                    return `${lockedCount}/${participants.length}`;
                  }
                  return `${lockedParticipants.length}/${participants.length}`;
                })()}
              </Text>
              <Text style={styles.progressAmount}>
                Locked
              </Text>
            </View>
          </View>
        </View>

        {/* Participants List */}
        <View style={styles.participantsContainer}>
          {participants.map((participant, index) => {
            // Use wallet participant data if available for accurate lock status
            const walletParticipant = splitWallet?.participants?.find((p: any) => p.userId === (participant.userId || participant.id));
            const isParticipantLocked = walletParticipant ? 
              (walletParticipant.amountPaid > 0 || (__DEV__ && walletParticipant.status === 'locked')) : 
              lockedParticipants.includes(participant.userId || participant.id);
            
            return (
              <View key={participant.userId || participant.id || `participant_${index}`} style={styles.participantCard}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name || `Participant ${index + 1}`}</Text>
                  <Text style={styles.participantWallet}>
                    {participant.walletAddress ? 
                      `${participant.walletAddress.slice(0, 4)}.....${participant.walletAddress.slice(-4)}` : 
                      'No wallet address'
                    }
                  </Text>
                </View>
                <View style={styles.participantAmountContainer}>
                  <Text style={styles.participantAmount}>{totalAmount} USDC</Text>
                  {isParticipantLocked && (
                    <View style={styles.lockedIndicator}>
                      <Text style={styles.lockedIndicatorText}>🔒</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Lock Instructions - Bottom Sheet Style */}
        <View style={styles.instructionsContainer}>
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.instructionsTitle}>
            Lock {totalAmount} USDC for Degen Split
          </Text>
          <Text style={styles.instructionsSubtitle}>
            Everyone locks the full amount. Winner pays nothing, losers pay their share!
          </Text>
        </View>

        {/* Slide to Lock Button */}
        <View style={[styles.slideContainer, { paddingBottom: isLocked ? spacing.md : Math.max(insets.bottom, spacing.lg) }]}>
          <TouchableOpacity
            style={[
              styles.slideButton,
              (isLocked || isLocking || isLoadingWallet) && styles.slideButtonDisabled
            ]}
            onPress={handleLockMyShare}
            disabled={isLocked || isLocking || isLoadingWallet}
          >
            <View style={styles.slideButtonContent}>
              <Text style={[
                styles.slideButtonText,
                (isLocked || isLocking || isLoadingWallet) && styles.slideButtonTextDisabled
              ]}>
                {isLocked ? 'Locked ✓' : isLocking ? 'Locking...' : isLoadingWallet ? 'Loading...' : 'Lock my share'}
              </Text>
              {!isLocked && !isLocking && !isLoadingWallet && (
                <Text style={styles.slideButtonArrow}>→</Text>
              )}
            </View>
            
            {/* Progress bar inside button */}
            {isLocking && (
              <Animated.View 
                style={[
                  styles.slideProgress,
                  { width: progressPercentage }
                ]} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Roll Roulette Button - Show for all participants who have locked their funds */}
        {isLocked && (
          <View style={[styles.rouletteContainer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            {/* Creator can roll roulette */}
            {currentUser?.id === splitData?.creatorId ? (
              <TouchableOpacity
                style={[
                  styles.rouletteButton,
                  (!allParticipantsLocked || isCheckingLocks) && styles.rouletteButtonDisabled
                ]}
                onPress={handleRollRoulette}
                disabled={!allParticipantsLocked || isCheckingLocks}
              >
                <View style={styles.rouletteButtonContent}>
                  <Text style={styles.rouletteButtonIcon}>🎲</Text>
                  <Text style={[
                    styles.rouletteButtonText,
                    (!allParticipantsLocked || isCheckingLocks) && styles.rouletteButtonTextDisabled
                  ]}>
                    {isCheckingLocks 
                      ? 'Checking...' 
                      : allParticipantsLocked 
                        ? 'Roll Roulette!' 
                        : (() => {
                            // Use wallet data for accurate count
                            if (splitWallet?.participants) {
                              const lockedCount = splitWallet.participants.filter((p: any) => 
                                p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
                              ).length;
                              const remaining = participants.length - lockedCount;
                              return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''}`;
                            }
                            const remaining = participants.length - lockedParticipants.length;
                            return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''}`;
                          })()
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* Non-creators see waiting message */
              <View style={[styles.rouletteButton, styles.rouletteButtonDisabled]}>
                <View style={styles.rouletteButtonContent}>
                  <Text style={styles.rouletteButtonIcon}>⏳</Text>
                  <Text style={[styles.rouletteButtonText, styles.rouletteButtonTextDisabled]}>
                    {allParticipantsLocked 
                      ? 'Waiting for the creator to roll!' 
                      : (() => {
                          // Use wallet data for accurate count
                          if (splitWallet?.participants) {
                            const lockedCount = splitWallet.participants.filter((p: any) => 
                              p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
                            ).length;
                            const remaining = participants.length - lockedCount;
                            return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''}`;
                          }
                          const remaining = participants.length - lockedParticipants.length;
                          return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''}`;
                        })()
                    }
                  </Text>
                </View>
              </View>
            )}
            
            {/* Status indicator */}
            <View style={styles.rouletteStatusContainer}>
              <Text style={styles.rouletteStatusText}>
                {(() => {
                  // Use wallet data for accurate count, same as lock icons
                  if (splitWallet?.participants) {
                    const lockedCount = splitWallet.participants.filter((p: any) => 
                      p.amountPaid > 0 || (__DEV__ && p.status === 'locked')
                    ).length;
                    return `${lockedCount} of ${participants.length} participants locked`;
                  }
                  return `${lockedParticipants.length} of ${participants.length} participants locked`;
                })()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Text style={styles.modalLockIcon}>🔒</Text>
              </View>
              <Text style={styles.modalTitle}>
                Lock {totalAmount} USDC to split the Bill
              </Text>
              <Text style={styles.modalSubtitle}>
                Your share is unlocked after the split is done!
              </Text>
              
              <TouchableOpacity
                style={styles.modalSlideButton}
                onPress={handleConfirmLock}
                disabled={isLocking}
              >
                <View style={styles.modalSlideButtonContent}>
                  <Text style={styles.modalSlideButtonIcon}>→</Text>
                  <Text style={styles.modalSlideButtonText}>
                    {isLocking ? 'Locking...' : 'Slide to Lock'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default DegenLockScreen;



