/**
 * Degen Spin Screen
 * Roulette-style selection to pick who pays the entire bill
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
  Dimensions,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './DegenSpinStyles';
import { NotificationService } from '../../services/notificationService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { MockupDataService } from '../../data/mockupData';

const { width: screenWidth } = Dimensions.get('window');

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
  const { billData, participants, totalAmount, splitWallet, processedBillData, splitData } = route.params;
  
  // Get current user from context (you'll need to import this)
  // For now, we'll assume the first participant is the creator
  const isCreator = true; // TODO: Get from actual user context
  
  // Animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  
  // Animation references
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // Effects
  useEffect(() => {
    const sendSpinNotifications = async () => {
      const participantIds = participants.map(p => p.userId || p.id).filter(id => id);
      const billName = MockupDataService.getBillName();

      if (participantIds.length === 0) {
        return;
      }

      await NotificationService.sendBulkNotifications(
        participantIds,
        'split_spin_available',
        {
          splitWalletId: splitWallet.id,
          billName,
        }
      );
    };

    sendSpinNotifications();
  }, []);

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
    if (isSpinning || hasSpun) return;
    
    setIsSpinning(true);
    
    // Select random participant from original participants (not duplicates)
    const finalIndex = Math.floor(Math.random() * baseParticipantCards.length);
    
    console.log('🎰 Starting infinite roulette:', {
      baseParticipants: BASE_PARTICIPANTS,
      totalCards: TOTAL_CARDS,
      finalIndex,
      selectedParticipant: baseParticipantCards[finalIndex]?.name,
      cardWidth: CARD_WIDTH,
      rotations: ROTATIONS,
      totalRotationDistance: TOTAL_ROTATION_DISTANCE,
      animationRange: [0, -TOTAL_ROTATION_DISTANCE]
    });
    
    // Reset animation values
    spinAnimation.setValue(0);
    cardScale.setValue(1);
    
    // Animate the spin sequence
    Animated.sequence([
      // Scale down during spin
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      // Main spin animation
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      // Scale back up
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedIndex(finalIndex);
      setIsSpinning(false);
      setHasSpun(true);
      
      // Navigate to result screen after delay
      setTimeout(() => {
        navigation.navigate('DegenResult', {
          billData,
          participants,
          totalAmount,
          selectedParticipant: baseParticipantCards[finalIndex],
          splitWallet,
          processedBillData,
        });
      }, 2000);
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Animation configuration
  const CARD_WIDTH = 140 + (spacing.xs * 2);
  const TOTAL_CARDS = participantCards.length;
  const BASE_PARTICIPANTS = baseParticipantCards.length;
  const ROTATIONS = 5; // Multiple full cycles through all participants
  const TOTAL_ROTATION_DISTANCE = ROTATIONS * BASE_PARTICIPANTS * CARD_WIDTH;
  
  // Animation interpolations - create infinite cycling effect
  const spinTranslation = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -TOTAL_ROTATION_DISTANCE],
  });


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

      <View style={styles.content}>
        {/* Roulette Cards Container - Main Focus */}
        <View style={styles.rouletteContainer}>
          <Animated.View 
            style={[
              styles.rouletteCards,
              {
                transform: [
                  { translateX: spinTranslation },
                  { scale: cardScale },
                ],
              },
            ]}
          >
            {participantCards.map((participant, index) => (
              <View
                key={participant.id}
                style={[
                  styles.rouletteCard,
                  index === selectedIndex && styles.selectedCard,
                ]}
              >
                <View style={styles.rouletteCardContent}>
                  <Text style={styles.rouletteCardName}>{participant.name}</Text>
                  <Text style={styles.rouletteCardId}>
                    {participant.userId ? 
                      `${participant.userId.slice(0, 8)}...${participant.userId.slice(-8)}` : 
                      participant.id
                    }
                  </Text>
                </View>
                <View style={styles.rouletteCardIcon}>
                  <Text style={styles.rouletteCardIconText}>📄</Text>
                </View>
                {/* Green gradient effect */}
                <View style={styles.rouletteCardGradient} />
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Bill Summary */}
        <View style={styles.billSummaryContainer}>
          <View style={styles.billSummaryRow}>
            <Text style={styles.billSummaryIcon}>🍽️</Text>
            <Text style={styles.billSummaryTitle}>Restaurant Night</Text>
            <Text style={styles.billSummaryDate}>10 Mar 2025</Text>
          </View>
          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Bill</Text>
            <Text style={styles.billTotalAmount}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Spin Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.spinButton,
              (isSpinning || hasSpun || !isCreator) && styles.spinButtonDisabled
            ]}
            onPress={handleStartSpinning}
            disabled={isSpinning || hasSpun || !isCreator}
          >
            <Text style={[
              styles.spinButtonText,
              (isSpinning || hasSpun) && styles.spinButtonTextDisabled
            ]}>
              {isSpinning ? 'Spinning...' : 
               hasSpun ? 'Spinning Complete!' : 
               isCreator ? 'Start spinning' : 'Waiting for owner to spin...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default DegenSpinScreen;
