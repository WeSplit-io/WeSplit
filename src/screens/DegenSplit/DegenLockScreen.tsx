/**
 * Degen Lock Screen
 * Users must lock the full bill amount before the degen split can begin
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
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
  
  // Always use unified mockup data for consistency - ignore route params
  const totalAmount = MockupDataService.getBillAmount();
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
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;

  // Debug: Log the received data
  console.log('🔍 DegenLockScreen: Received route params:', {
    billData: billData ? { title: billData.title, totalAmount: billData.totalAmount } : null,
    routeParticipants: routeParticipants ? routeParticipants.length : 'undefined',
    extractedParticipants: participants ? participants.length : 'undefined',
    routeTotalAmount,
    unifiedTotalAmount: totalAmount,
    processedBillData: processedBillData ? { title: processedBillData.title, totalAmount: processedBillData.totalAmount } : null,
    splitData: splitData ? { 
      id: splitData.id, 
      title: splitData.title,
      participants: splitData.participants?.length || 0,
      splitType: splitData.splitType
    } : null,
    existingSplitWallet: existingSplitWallet ? {
      id: existingSplitWallet.id,
      walletAddress: existingSplitWallet.walletAddress,
      participants: existingSplitWallet.participants?.length || 0
    } : 'No existing wallet',
  });
  
  console.log('🔍 DegenLockScreen: Route params keys:', Object.keys(route.params || {}));

  // Validate required data
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    console.error('🔍 DegenLockScreen: Invalid participants data:', participants);
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
      console.log('🔍 DegenLockScreen: Starting degen split wallet creation...');
      console.log('🔍 DegenLockScreen: Participants data:', participants);
      
      // Use existing split wallet - wallet should already be created during bill processing
      let walletToUse = splitWallet;
      
      if (!walletToUse) {
        console.error('🔍 DegenLockScreen: No existing wallet found! Wallet should have been created during bill processing.');
        Alert.alert('Error', 'No split wallet found. Please go back and create the split again.');
        setIsLocking(false);
        return;
      } else {
        console.log('🔍 DegenLockScreen: Using existing split wallet:', walletToUse.id);
      }

      // Sync participants between split data and split wallet
      const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
      const walletParticipantIds = walletToUse.participants.map((p: any) => p.userId);
      
      console.log('🔍 DegenLockScreen: Participant sync check:', {
        splitParticipantIds,
        walletParticipantIds,
        needsSync: splitParticipantIds.length !== walletParticipantIds.length || 
                   !splitParticipantIds.every(id => walletParticipantIds.includes(id))
      });
      
      // If participants don't match, sync them
      if (splitParticipantIds.length !== walletParticipantIds.length || 
          !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
        console.log('🔍 DegenLockScreen: Syncing participants to split wallet...');
        
        const { SplitWalletService } = await import('../../services/splitWalletService');
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
          console.error('🔍 DegenLockScreen: Failed to sync participants:', syncResult.error);
          Alert.alert('Error', 'Failed to sync participants. Please try again.');
          setIsLocking(false);
          return;
        }
        
        // Reload the wallet to get updated participants
        const reloadResult = await SplitWalletService.getSplitWallet(walletToUse.id);
        if (reloadResult.success && reloadResult.wallet) {
          walletToUse = reloadResult.wallet;
          setSplitWallet(walletToUse);
          console.log('🔍 DegenLockScreen: Wallet participants synced successfully');
        }
      }

      if (!walletToUse) {
        Alert.alert('Error', 'No split wallet available');
        setIsLocking(false);
        return;
      }

      // Lock the current user's amount in the split wallet
      const lockResult = await SplitWalletService.lockParticipantAmount(
        walletToUse.id,
        currentUser!.id.toString(),
        totalAmount
      );

      if (!lockResult.success) {
        console.error('🔍 DegenLockScreen: Lock failed:', lockResult.error);
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
      
      const billName = MockupDataService.getBillName(); // Use unified mockup data

      if (otherParticipantIds.length > 0) {
        console.log('🔍 DegenLockScreen: Sending notifications with data:', {
          otherParticipantIds,
          splitWalletId: walletToUse.id,
          billName,
          amount: totalAmount,
          amountType: typeof totalAmount
        });
        
        const notificationResult = await NotificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount, // Each participant needs to lock the full amount
          }
        );
        
        console.log('🔍 DegenLockScreen: Notification result:', notificationResult);
        
        if (!notificationResult.success || notificationResult.failed > 0) {
          console.error('🔍 DegenLockScreen: Some notifications failed:', {
            sent: notificationResult.sent,
            failed: notificationResult.failed,
            errors: notificationResult.errors
          });
        }
      }

      console.log('🔍 DegenLockScreen: Successfully locked amount for degen split');

      // Lock the split method in the split data
      if (splitData && splitData.id) {
        try {
          const { SplitStorageService } = await import('../../services/splitStorageService');
          await SplitStorageService.updateSplit(splitData.id, {
            splitType: 'degen',
            status: 'active', // Mark as active when creator locks their share
          });
          console.log('🔍 DegenLockScreen: Split method locked as degen');
        } catch (error) {
          console.error('🔍 DegenLockScreen: Error locking split method:', error);
        }
      }

      // Animate the lock progress
      Animated.timing(lockProgress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start(() => {
        setIsLocked(true);
        setIsLocking(false);
        
        // Check if all participants have locked their funds
        checkAllParticipantsLocked();
      });

    } catch (error) {
      console.error('🔍 DegenLockScreen: Error in degen split:', error);
      Alert.alert('Error', 'Failed to lock amount. Please try again.');
      setIsLocking(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Function to check if all participants have locked their funds
  const checkAllParticipantsLocked = async () => {
    if (!splitWallet || !currentUser?.id) {
      return;
    }

    setIsCheckingLocks(true);
    try {
      console.log('🔍 DegenLockScreen: Checking if all participants have locked funds...');
      
      // Get the current wallet status to check locked participants
      const walletResult = await SplitWalletService.getSplitWallet(splitWallet.id);
      
      if (walletResult.success && walletResult.wallet) {
        const wallet = walletResult.wallet;
        const totalParticipants = participants.length;
        
        console.log('🔍 DegenLockScreen: Wallet participants data:', {
          participants: wallet.participants.map(p => ({
            userId: p.userId,
            amountPaid: p.amountPaid,
            amountOwed: p.amountOwed
          }))
        });
        
        const lockedCount = wallet.participants.filter(p => p.amountPaid > 0).length;
        
        console.log('🔍 DegenLockScreen: Lock status check:', {
          totalParticipants,
          lockedCount,
          allLocked: lockedCount === totalParticipants,
          walletParticipants: wallet.participants.length
        });
        
        // Update locked participants list for UI
        const lockedParticipantIds = wallet.participants
          .filter(p => p.amountPaid > 0)
          .map(p => p.userId);
        
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
            console.log('🔍 DegenLockScreen: All participants locked status changed:', allLocked);
            return allLocked;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('🔍 DegenLockScreen: Error checking participant locks:', error);
    } finally {
      setIsCheckingLocks(false);
    }
  };

  // Function to handle roulette button press
  const handleRollRoulette = () => {
    if (!allParticipantsLocked || !splitWallet) {
      console.log('🔍 DegenLockScreen: Cannot start roulette - conditions not met:', {
        allParticipantsLocked,
        hasSplitWallet: !!splitWallet
      });
      return;
    }

    console.log('🔍 DegenLockScreen: Rolling roulette - all participants locked!');
    console.log('🔍 DegenLockScreen: Navigation data:', {
      hasBillData: !!billData,
      hasParticipants: !!participants,
      totalAmount,
      hasSplitWallet: !!splitWallet,
      hasProcessedBillData: !!processedBillData,
      hasSplitData: !!splitData,
    });
    
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
      console.error('🔍 DegenLockScreen: Error navigating to DegenSpin:', error);
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
            console.log('🔍 DegenLockScreen: Loaded split wallet:', walletResult.wallet.id);
            
            // Check if current user has already locked their funds
            if (currentUser?.id) {
              const userParticipant = walletResult.wallet.participants.find(
                p => p.userId === currentUser.id.toString()
              );
              
              if (userParticipant && userParticipant.amountPaid > 0) {
                console.log('🔍 DegenLockScreen: User has already locked funds:', {
                  userId: currentUser.id.toString(),
                  amountPaid: userParticipant.amountPaid,
                  status: userParticipant.status
                });
                setIsLocked(true);
                setLockedParticipants(prev => [...prev, currentUser.id.toString()]);
              }
            }
            
            // Immediately check all participants' lock status to avoid flicker
            await checkAllParticipantsLocked();
          } else {
            console.error('🔍 DegenLockScreen: Failed to load split wallet:', walletResult.error);
          }
        } catch (error) {
          console.error('🔍 DegenLockScreen: Error loading split wallet:', error);
        } finally {
          setIsLoadingWallet(false);
        }
      }
    };

    loadSplitWallet();
  }, [splitData?.walletId, currentUser?.id]);

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
            <Text style={styles.billTitle}>{MockupDataService.getBillName()}</Text>
          </View>
          <Text style={styles.billDate}>
            {(() => {
              try {
                const date = FallbackDataService.generateBillDate(processedBillData, billData, true);
                console.log('🔍 DegenLockScreen: Generated date:', date);
                return date;
              } catch (error) {
                console.error('🔍 DegenLockScreen: Error generating date:', error);
                return new Date().toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
              }
            })()}
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
                {lockedParticipants.length}/{participants.length}
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
            const isParticipantLocked = lockedParticipants.includes(participant.userId || participant.id);
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
                      : `Waiting for ${participants.length - lockedParticipants.length} more participant${participants.length - lockedParticipants.length !== 1 ? 's' : ''}`
                  }
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Status indicator */}
            <View style={styles.rouletteStatusContainer}>
              <Text style={styles.rouletteStatusText}>
                {lockedParticipants.length} of {participants.length} participants locked
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



