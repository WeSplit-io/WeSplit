/**
 * Degen Spin Screen
 * Roulette-style selection to pick who pays the entire bill
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenSpinStyles';
import { logger } from '../../services/loggingService';
import { useApp } from '../../context/AppContext';
import { notificationService } from '../../services/notificationService';

const { width: screenWidth } = Dimensions.get('window');

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
  const { billData, participants, totalAmount, splitWallet, processedBillData, splitData } = route.params;

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
  const isCreator = currentUser && splitData && currentUser.id.toString() === splitData.creatorId;

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
      const participantIds = participants.map((p: any) => p.userId || p.id).filter((id: any) => id);
      const billName = splitData?.title || billData?.title || 'Degen Split';

      if (participantIds.length === 0) {
        return;
      }

      const notificationResult = await notificationService.sendBulkNotifications(
        participantIds,
        'split_spin_available',
        {
          splitWalletId: splitWallet.id,
          billName,
        }
      );

      logger.info('Spin available notification result', { notificationResult }, 'DegenSpinScreen');
    };

    sendSpinNotifications();
  }, [participants, splitData?.title, billData?.title, splitWallet.id]);

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
    ]).start(async () => {
      setSelectedIndex(finalIndex);
      setIsSpinning(false);
      setHasSpun(true);

      // Save the winner information to the split wallet
      try {
        const { SplitWalletService } = await import('../../services/split');
        await SplitWalletService.updateSplitWallet(splitWallet.id, {
          degenWinner: {
            userId: baseParticipantCards[finalIndex].userId,
            name: baseParticipantCards[finalIndex].name,
            selectedAt: new Date().toISOString()
          },
          status: 'spinning_completed'
        });
      } catch (error) {
        console.error('Failed to save winner information:', error);
      }

      // Send notifications to all participants about the roulette result
      try {
        const { notificationService } = await import('../../services/notificationService');
        const billName = splitData?.title || billData?.title || 'Degen Split';
        const winnerId = baseParticipantCards[finalIndex].userId;
        const winnerName = baseParticipantCards[finalIndex].name;

        // Send winner notification
        await notificationService.sendNotification(
          winnerId,
          splitWallet.id,
          billName
        );

        // Send loser notifications to all other participants
        const loserIds = participants
          .filter((p: any) => (p.userId || p.id) !== winnerId)
          .map((p: any) => p.userId || p.id)
          .filter((id: any) => id);

        if (loserIds.length > 0) {
          await notificationService.sendBulkNotifications(
            loserIds,
            'split_loser',
            {
              splitWalletId: splitWallet.id,
              billName,
              amount: totalAmount,
            }
          );
        }
      } catch (error) {
        console.error('Failed to send roulette result notifications:', error);
      }

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
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Degen Split</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
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
                  // Add tilt effect for outer cards
                  Math.abs(index - selectedIndex) > 1 && styles.tiltedCard,
                ]}
              >
                {/* Background Image */}
                <Image
                  source={require('../../../assets/card-split-bg.png')}
                  style={styles.rouletteCardBackground}
                  resizeMode="cover"
                />

                {/* Content */}
                <View style={styles.rouletteCardContent}>
                  {/* WeSplit Logo */}
                  <Image
                    source={require('../../../assets/wesplit-logo-card.png')}
                    style={styles.rouletteCardLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.rouletteCardHeader}>
                    {/* Pseudo */}
                    <Text style={styles.rouletteCardName}>{participant.name}</Text>

                    {/* Hashed Address */}
                    <Text style={styles.rouletteCardHash}>
                      {participant.userId ?
                        `${participant.userId.slice(0, 4)}...${participant.userId.slice(-4)}` :
                        `${participant.id.slice(0, 4)}...${participant.id.slice(-4)}`
                      }
                    </Text>
                  </View>
                </View>

                {/* Selection indicator - only show on selected card */}
                {index === selectedIndex && (
                  <View style={styles.selectionIndicator}>
                    <Text style={styles.selectionText}>SELECTED</Text>
                  </View>
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Bill Summary - Moved below roulette */}
        <View style={styles.billSummaryContainer}>
          <View style={styles.billSummaryRow}>
            <View style={styles.billSummaryIcon}>
              <Image
                source={getCategoryIcon()}
                style={styles.billSummaryIconImage}
              />
            </View>
            <Text style={styles.billSummaryTitle}>Restaurant Night</Text>
            <Text style={styles.billSummaryDate}>10 Mar 2025</Text>
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
            (isSpinning || hasSpun || !isCreator) && styles.spinButtonDisabled
          ]}
        >
          <TouchableOpacity
            style={styles.spinButton}
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
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};


export default DegenSpinScreen;
