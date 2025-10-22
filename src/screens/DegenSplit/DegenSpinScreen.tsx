/**
 * Degen Spin Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenSpinStyles';
import { logger } from '../../services/core';
import { useApp } from '../../context/AppContext';
import { notificationService } from '../../services/notifications';

// Import our custom hooks and components
import { useDegenSplitState, useDegenSplitLogic, useDegenSplitRealtime } from './hooks';
import { DegenSplitHeader, DegenRoulette } from './components';
import { Container } from '../../components/shared';

// Category images mapping for dynamic icons
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: require('../../../assets/trip-icon-black.png'),
  food: require('../../../assets/food-icon-black.png'),
  home: require('../../../assets/house-icon-black.png'),
  event: require('../../../assets/event-icon-black.png'),
  rocket: require('../../../assets/rocket-icon-black.png'),
};

interface DegenSpinScreenProps {
  navigation: any;
  route: any;
}

interface Participant {
  id: string;
  name: string;
  userId: string;
  avatar?: string;
  isDuplicate?: boolean;
}

const DegenSpinScreen: React.FC<DegenSpinScreenProps> = ({ navigation, route }) => {
  const { 
    billData, 
    participants, 
    totalAmount, 
    splitWallet, 
    processedBillData, 
    splitData,
    isFromNotification,
    notificationId
  } = route.params;

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

  // Initialize real-time updates - REDUCED INTERFERENCE DURING SPINNING
  const realtimeState = useDegenSplitRealtime(
    splitData?.id,
    degenState.splitWallet?.id,
    {
      onParticipantUpdate: (participants) => {
        // Only update if not spinning to avoid interference
        if (!degenState.isSpinning) {
          console.log('🔍 DegenSpinScreen: Real-time participant update:', participants);
          // Update participants if needed
        }
      },
      onSplitWalletUpdate: (splitWallet) => {
        // Only update if not spinning to avoid interference
        if (!degenState.isSpinning) {
          console.log('🔍 DegenSpinScreen: Real-time wallet update:', splitWallet);
          degenState.setSplitWallet(splitWallet);
        }
      },
      onError: (error) => {
        console.error('🔍 DegenSpinScreen: Real-time error:', error);
        degenState.setError(error.message);
      }
    }
  );

  // Initialize animation refs
  useEffect(() => {
    degenState.spinAnimationRef.current = new Animated.Value(0);
    degenState.cardScaleRef.current = new Animated.Value(1);
  }, []);

  // Function to get category icon dynamically
  const getCategoryIcon = () => {
    // Try to get category from different data sources
    const category =
      billData?.category ||
      billData?.originalData?.category ||
      processedBillData?.originalAnalysis?.category ||
      splitData?.category;

    // Map common category names to our icon keys
    const categoryMapping: { [key: string]: string } = {
      'Food & Drinks': 'food',
      'food': 'food',
      'restaurant': 'food',
      'dining': 'food',
      'trip': 'trip',
      'travel': 'trip',
      'home': 'home',
      'house': 'home',
      'event': 'event',
      'entertainment': 'event',
      'rocket': 'rocket',
      'shopping': 'rocket',
    };

    if (category) {
      const normalizedCategory = category.toLowerCase();
      const mappedCategory = categoryMapping[normalizedCategory] ||
        Object.keys(CATEGORY_IMAGES_LOCAL).find(key =>
          normalizedCategory.includes(key)
        );

      if (mappedCategory && CATEGORY_IMAGES_LOCAL[mappedCategory]) {
        return CATEGORY_IMAGES_LOCAL[mappedCategory];
      }
    }

    // Default to food icon if no category found
    return CATEGORY_IMAGES_LOCAL.food;
  };

  // Get current user from context
  const { state } = useApp();
  const { currentUser } = state;

  // Check if current user is the creator
  const isCreator = degenLogic.isCurrentUserCreator(currentUser, splitData);

  // Effects
  useEffect(() => {
    const sendSpinNotifications = async () => {
      // Only send notifications if not coming from a notification
      if (isFromNotification) {
        return;
      }

      const participantIds = participants.map((p: any) => p.userId || p.id).filter((id: any) => id);
      const billName = splitData?.title || billData?.title || processedBillData?.title || 'Degen Split';

      if (participantIds.length === 0) {
        return;
      }

      const notificationResult = await notificationService.sendBulkNotifications(
        participantIds,
        'split_spin_available',
        {
          splitWalletId: splitWallet.id,
          splitId: splitData?.id,
          billName,
          amount: totalAmount,
          currency: 'USDC',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Spin available notification result', { notificationResult }, 'DegenSpinScreen');
    };

    sendSpinNotifications();
  }, [participants, splitData?.title, billData?.title, processedBillData?.title, splitWallet.id, isFromNotification, totalAmount]);

  // Data processing
  const MIN_CARDS_FOR_CAROUSEL = 20; // Increased for better infinite effect

  // Convert participants to card format
  const baseParticipantCards: Participant[] = participants.map((p: any, index: number) => ({
    id: p.id || `participant_${index}`,
    name: p.name || `User ${index + 1}`,
    userId: p.userId || p.id || `user_${index}`,
    avatar: p.avatar,
  }));

  // Create infinite roulette by repeating participants multiple times
  const participantCards: Participant[] = Array.from({ length: MIN_CARDS_FOR_CAROUSEL }, (_, index) => {
    const baseIndex = index % baseParticipantCards.length;
    return {
      id: `${baseParticipantCards[baseIndex].id}_${index}`,
      name: baseParticipantCards[baseIndex].name,
      userId: baseParticipantCards[baseIndex].userId,
      avatar: baseParticipantCards[baseIndex].avatar,
      isDuplicate: index >= baseParticipantCards.length,
    };
  });

  // Event handlers
  const handleStartSpinning = () => {
    if (degenState.isSpinning || degenState.hasSpun) {return;}

    // Start spinning - NON-BLOCKING
    degenLogic.handleStartSpinning(
      baseParticipantCards,
      splitWallet,
      splitData,
      billData,
      totalAmount
    );

    // Navigate to result screen after delay - NON-BLOCKING
    setTimeout(() => {
      navigation.navigate('DegenResult', {
        billData,
        participants,
        totalAmount,
        selectedParticipant: baseParticipantCards[degenState.selectedIndex],
        splitWallet,
        processedBillData,
      });
    }, 2000);
  };

  const handleBack = () => {
    navigation.navigate('SplitsList');
  };

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      {/* Header */}
      <DegenSplitHeader
        title="Degen Split"
        onBackPress={handleBack}
        isRealtimeActive={realtimeState.isRealtimeActive}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Roulette Cards Container - Main Focus */}
        <DegenRoulette
          participants={participantCards}
          isSpinning={degenState.isSpinning}
          hasSpun={degenState.hasSpun}
          selectedIndex={degenState.selectedIndex}
          spinAnimationRef={degenState.spinAnimationRef}
          cardScaleRef={degenState.cardScaleRef}
        />

        {/* Bill Summary - Moved below roulette */}
        <View style={styles.billSummaryContainer}>
          <View style={styles.billSummaryRow}>
            <View style={styles.billSummaryIcon}>
              <Image
                source={getCategoryIcon()}
                style={styles.billSummaryIconImage}
              />
            </View>
            <Text style={styles.billSummaryTitle}>
              {splitData?.title || billData?.title || processedBillData?.title || 'Degen Split'}
            </Text>
            <Text style={styles.billSummaryDate}>
              {splitData?.createdAt ? 
                new Date(splitData.createdAt).toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                }) : 
                new Date().toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })
              }
            </Text>
          </View>
          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Bill</Text>
            <Text style={styles.billTotalAmount}>{totalAmount} USDC</Text>
          </View>
          <View style={styles.billCardDotLeft}></View>
          <View style={styles.billCardDotRight}></View>
        </View>

      </View>

      {/* Fixed Bottom Button with Gradient */}
      <View style={styles.bottomButtonContainer}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.spinButtonGradient,
            (degenState.isSpinning || degenState.hasSpun || !isCreator) && styles.spinButtonDisabled
          ]}
        >
          <TouchableOpacity
            style={styles.spinButton}
            onPress={handleStartSpinning}
            disabled={degenState.isSpinning || degenState.hasSpun || !isCreator}
          >
            <Text style={[
              styles.spinButtonText,
              (degenState.isSpinning || degenState.hasSpun) && styles.spinButtonTextDisabled
            ]}>
              {degenState.isSpinning ? 'Spinning...' :
                degenState.hasSpun ? 'Spinning Complete!' :
                  isCreator ? 'Start spinning' : 'Waiting for owner to spin...'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Container>
  );
};

export default DegenSpinScreen;
