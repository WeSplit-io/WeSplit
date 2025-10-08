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
  const { billData, participants, totalAmount: routeTotalAmount, processedBillData, splitData, splitWallet: existingSplitWallet } = route.params;
  
  // Always use unified mockup data for consistency - ignore route params
  const totalAmount = MockupDataService.getBillAmount();
  const { state } = useApp();
  const { currentUser } = state;
  const insets = useSafeAreaInsets();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [splitWallet, setSplitWallet] = useState(existingSplitWallet || null);
  const [lockedParticipants, setLockedParticipants] = useState<string[]>([]);
  const [allParticipantsLocked, setAllParticipantsLocked] = useState(false);
  const [isCheckingLocks, setIsCheckingLocks] = useState(false);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;

  // Debug: Log the received data
  console.log('🔍 DegenLockScreen: Received route params:', {
    billData: billData ? { title: billData.title, totalAmount: billData.totalAmount } : null,
    participants: participants ? participants.length : 'undefined',
    routeTotalAmount,
    unifiedTotalAmount: totalAmount,
    processedBillData: processedBillData ? { title: processedBillData.title, totalAmount: processedBillData.totalAmount } : null,
    splitData: splitData ? { id: splitData.id, title: splitData.title } : null,
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

  const handleSlideToLock = async () => {
    if (isLocked || isLocking) return;
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Additional validation for participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      Alert.alert('Error', 'No participants found. Please try again.');
      return;
    }

    setIsLocking(true);
    
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

      if (!walletToUse) {
        Alert.alert('Error', 'No split wallet available');
        setIsLocking(false);
        return;
      }

      // Lock the current user's amount in the split wallet
      const lockResult = await SplitWalletService.lockParticipantAmount(
        walletToUse.id,
        currentUser.id.toString(),
        totalAmount
      );

      if (!lockResult.success) {
        Alert.alert('Error', lockResult.error || 'Failed to lock amount');
        setIsLocking(false);
        return;
      }

      // Update locked participants list
      setLockedParticipants((prev: string[]) => [...prev, currentUser.id.toString()]);

      // Send lock required notifications to all other participants
      const otherParticipantIds = participants
        .filter(p => p.id !== currentUser.id.toString())
        .map(p => p.id);
      
      const billName = MockupDataService.getBillName(); // Use unified mockup data

      if (otherParticipantIds.length > 0) {
        await NotificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount, // Each participant needs to lock the full amount
          }
        );
      }

      console.log('🔍 DegenLockScreen: Successfully locked amount for degen split');

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
        
        // Special case: if there's only one participant (the current user) and they have locked, enable roulette
        if (totalParticipants === 1 && isLocked) {
          console.log('🔍 DegenLockScreen: Single participant split - enabling roulette since user has locked');
          setAllParticipantsLocked(true);
          setLockedParticipants([currentUser.id.toString()]);
        } else {
          setAllParticipantsLocked(lockedCount === totalParticipants);
          
          // Update locked participants list for UI
          const lockedParticipantIds = wallet.participants
            .filter(p => p.amountPaid > 0)
            .map(p => p.userId);
          setLockedParticipants(lockedParticipantIds);
        }
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
      return;
    }

    console.log('🔍 DegenLockScreen: Rolling roulette - all participants locked!');
    
    // Navigate to Degen Spin screen
    navigation.navigate('DegenSpin', {
      billData,
      participants,
      totalAmount,
      splitWallet,
      processedBillData,
      splitData,
    });
  };

  const progressPercentage = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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
        <Text style={styles.headerTitle}>Split the Bill</Text>
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
                {isLocked ? '100%' : isLocking ? 'Locking...' : '0%'}
              </Text>
              <Text style={styles.progressAmount}>
                {isLocked ? `${totalAmount} USDC Locked` : `${totalAmount} USDC`}
              </Text>
            </View>
          </View>
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
              (isLocked || isLocking) && styles.slideButtonDisabled
            ]}
            onPress={handleSlideToLock}
            disabled={isLocked || isLocking}
          >
            <View style={styles.slideButtonContent}>
              <Text style={[
                styles.slideButtonText,
                (isLocked || isLocking) && styles.slideButtonTextDisabled
              ]}>
                {isLocked ? 'Locked ✓' : isLocking ? 'Locking...' : 'Slide to Lock'}
              </Text>
              {!isLocked && !isLocking && (
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

        {/* Roll Roulette Button - Only show when user has locked their funds */}
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
    </SafeAreaView>
  );
};


export default DegenLockScreen;



