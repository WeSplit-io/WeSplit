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
}

const DegenSpinScreen: React.FC<DegenSpinScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, splitWallet, processedBillData, splitData } = route.params;
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [winner, setWinner] = useState(null);
  
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  // Send spin available notifications when screen loads
  useEffect(() => {
    const sendSpinNotifications = async () => {
      const participantIds = participants.map(p => p.id);
      const billName = billData?.title || 'Restaurant Night';

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

  // Convert participants to the format we need
  const participantCards: Participant[] = participants.map((p: any, index: number) => ({
    id: p.id || `participant_${index}`,
    name: p.name || `User ${index + 1}`,
    userId: p.userId || p.id || `user_${index}`,
    avatar: p.avatar,
  }));

  const handleStartSpinning = () => {
    if (isSpinning || hasSpun) return;
    
    setIsSpinning(true);
    
    // Create a random number of spins (between 3-8 full rotations)
    const randomSpins = Math.random() * 5 + 3;
    const finalIndex = Math.floor(Math.random() * participantCards.length);
    
    console.log('DegenSpinScreen: Starting spin with', participantCards.length, 'participants');
    console.log('DegenSpinScreen: Random spins:', randomSpins, 'Final index:', finalIndex);
    console.log('DegenSpinScreen: Selected participant:', participantCards[finalIndex]);
    
    // Animate the spin
    Animated.sequence([
      // Scale down during spin
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      // Main spin animation
      Animated.timing(spinAnimation, {
        toValue: randomSpins + (finalIndex / participantCards.length),
        duration: 3000,
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
      
      console.log('DegenSpinScreen: Spin complete, navigating to result with participant:', participantCards[finalIndex]);
      
      // Navigate to result screen after a short delay
      setTimeout(() => {
        navigation.navigate('DegenResult', {
          billData,
          participants,
          totalAmount,
          selectedParticipant: participantCards[finalIndex],
          splitWallet,
          processedBillData,
        });
      }, 2000);
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const spinRotation = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getCardStyle = (index: number) => {
    const totalCards = participantCards.length;
    const angle = (360 / totalCards) * index;
    const isSelected = index === selectedIndex && hasSpun;
    
    return {
      transform: [
        { rotate: `${angle}deg` },
        { translateY: -120 },
        isSelected ? { scale: 1.2 } : { scale: 1 },
      ],
      opacity: isSelected ? 1 : 0.7,
    };
  };

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
        {/* Bill Info Card */}
        <View style={styles.billInfoCard}>
          <View style={styles.billInfoHeader}>
            <Text style={styles.billIcon}>🍽️</Text>
            <Text style={styles.billTitle}>{billData.name || 'Restaurant Night'}</Text>
          </View>
          <Text style={styles.billDate}>{billData.date || '10 May 2025'}</Text>
          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Bill</Text>
            <Text style={styles.billTotalAmount}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Spinning Cards Container */}
        <View style={styles.spinContainer}>
          <Animated.View 
            style={[
              styles.cardsWheel,
              {
                transform: [
                  { rotate: spinRotation },
                  { scale: cardScale },
                ],
              },
            ]}
          >
            {participantCards.map((participant, index) => (
              <Animated.View
                key={participant.id}
                style={[
                  styles.participantCard,
                  getCardStyle(index),
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardProfileIcon}>
                    <Text style={styles.cardProfileIconText}>
                      {participant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardName}>{participant.name}</Text>
                    <Text style={styles.cardId}>{participant.userId}</Text>
                  </View>
                </View>
                
                {/* Green gradient effect */}
                <View style={styles.cardGradient} />
              </Animated.View>
            ))}
          </Animated.View>
          
          {/* Center indicator */}
          <View style={styles.centerIndicator}>
            <View style={styles.centerDot} />
          </View>
        </View>

        {/* Spin Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.spinButton,
              (isSpinning || hasSpun) && styles.spinButtonDisabled
            ]}
            onPress={handleStartSpinning}
            disabled={isSpinning || hasSpun}
          >
            <Text style={[
              styles.spinButtonText,
              (isSpinning || hasSpun) && styles.spinButtonTextDisabled
            ]}>
              {isSpinning ? 'Spinning...' : hasSpun ? 'Spinning Complete!' : 'Start spinning'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default DegenSpinScreen;
