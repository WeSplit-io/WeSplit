/**
 * Degen Lock Screen
 * Users must lock the full bill amount before the degen split can begin
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './DegenLockStyles';
import { SplitWalletService } from '../../services/splitWalletService';
import { NotificationService } from '../../services/notificationService';
import { useApp } from '../../context/AppContext';

interface DegenLockScreenProps {
  navigation: any;
  route: any;
}

const DegenLockScreen: React.FC<DegenLockScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, processedBillData, splitData } = route.params;
  const { state } = useApp();
  const { currentUser } = state;
  const insets = useSafeAreaInsets();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [splitWallet, setSplitWallet] = useState(null);
  const [lockedParticipants, setLockedParticipants] = useState([]);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;

  // Debug: Log the received data
  console.log('🔍 DegenLockScreen: Received route params:', {
    billData: billData ? { title: billData.title, totalAmount: billData.totalAmount } : null,
    participants: participants ? participants.length : 'undefined',
    totalAmount,
    processedBillData: processedBillData ? { title: processedBillData.title, totalAmount: processedBillData.totalAmount } : null,
    splitData: splitData ? { id: splitData.id, title: splitData.title } : null,
  });

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
      
      // Use existing split data if available, otherwise create new split wallet
      let walletToUse = splitWallet;
      
      if (!walletToUse && splitData) {
        // If we have split data from SplitDetails, use it
        const billId = splitData.billId || processedBillData?.id || `bill_${Date.now()}`;
        const splitWalletResult = await SplitWalletService.createSplitWallet(
          billId,
          currentUser.id.toString(),
          totalAmount,
          'USDC',
          participants.map(p => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress || p.userId,
            amountOwed: totalAmount, // Each participant locks the FULL amount in degen split
          }))
        );

        if (!splitWalletResult.success) {
          Alert.alert('Error', splitWalletResult.error || 'Failed to create split wallet');
          setIsLocking(false);
          return;
        }
        
        walletToUse = splitWalletResult.wallet;
        setSplitWallet(walletToUse);
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
      setLockedParticipants(prev => [...prev, currentUser.id.toString()]);

      // Send lock required notifications to all other participants
      const otherParticipantIds = participants
        .filter(p => p.id !== currentUser.id.toString())
        .map(p => p.id);
      
      const billName = billData?.title || processedBillData?.title || 'Restaurant Night';

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
        
        // Navigate to Degen Spin screen after a short delay
        setTimeout(() => {
          navigation.navigate('DegenSpin', {
            billData,
            participants,
            totalAmount,
            splitWallet: walletToUse,
            processedBillData,
            splitData,
          });
        }, 1000);
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

  const progressPercentage = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

      <View style={styles.content}>
        {/* Bill Info Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <Text style={styles.billIcon}>🍽️</Text>
            <Text style={styles.billTitle}>{billData.name || 'Restaurant Night'}</Text>
          </View>
          <Text style={styles.billDate}>{billData.date || '10 May 2025'}</Text>
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
        <View style={[styles.slideContainer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
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
      </View>
    </SafeAreaView>
  );
};


export default DegenLockScreen;
