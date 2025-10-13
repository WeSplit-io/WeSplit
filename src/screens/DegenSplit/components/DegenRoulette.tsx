/**
 * Degen Roulette Component
 * Handles the spinning animation and participant selection
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Dimensions, Image } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { styles } from './DegenRouletteStyles';

const { width: screenWidth } = Dimensions.get('window');

interface Participant {
  id: string;
  name: string;
  userId: string;
  avatar?: string;
  isDuplicate?: boolean;
}

interface DegenRouletteProps {
  participants: Participant[];
  isSpinning: boolean;
  hasSpun: boolean;
  selectedIndex: number;
  spinAnimationRef: React.MutableRefObject<Animated.Value>;
  cardScaleRef: React.MutableRefObject<Animated.Value>;
  onSpinComplete?: (selectedIndex: number) => void;
}

const DegenRoulette: React.FC<DegenRouletteProps> = ({
  participants,
  isSpinning,
  hasSpun,
  selectedIndex,
  spinAnimationRef,
  cardScaleRef,
  onSpinComplete,
}) => {
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

  // Animation configuration
  const CARD_WIDTH = 140 + (spacing.xs * 2);
  const TOTAL_CARDS = participantCards.length;
  const BASE_PARTICIPANTS = baseParticipantCards.length;
  const ROTATIONS = 5; // Multiple full cycles through all participants
  const TOTAL_ROTATION_DISTANCE = ROTATIONS * BASE_PARTICIPANTS * CARD_WIDTH;

  // Animation interpolations - create infinite cycling effect
  const spinTranslation = spinAnimationRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -TOTAL_ROTATION_DISTANCE],
  });

  return (
    <View style={styles.rouletteContainer}>
      <Animated.View
        style={[
          styles.rouletteCards,
          {
            transform: [
              { translateX: spinTranslation },
              { scale: cardScaleRef.current },
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
              source={require('../../../../assets/card-split-bg.png')}
              style={styles.rouletteCardBackground}
              resizeMode="cover"
            />

            {/* Content */}
            <View style={styles.rouletteCardContent}>
              {/* WeSplit Logo */}
              <Image
                source={require('../../../../assets/wesplit-logo-card.png')}
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
  );
};

export default DegenRoulette;
