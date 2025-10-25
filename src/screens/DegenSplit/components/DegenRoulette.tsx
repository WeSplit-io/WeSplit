/**
 * Degen Roulette Component
 * Handles the spinning animation and participant selection
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, Dimensions, Image } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { styles } from './DegenRouletteStyles';
import Avatar from '../../../components/shared/Avatar';
import { getUserAvatar } from '../../../services/shared/dataUtils';

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
  // State for storing fetched avatars
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, string>>({});

  // Data processing
  const MIN_CARDS_FOR_CAROUSEL = 80; // Increased to 50 for better infinite effect and to prevent disappearing

  // Fetch avatars for participants
  useEffect(() => {
    const fetchAvatars = async () => {
      const avatarPromises = participants.map(async (participant) => {
        const userId = participant.userId || participant.id;
        if (userId) {
          try {
            const avatar = await getUserAvatar(userId);
            return { userId, avatar };
          } catch (error) {
            console.warn('Failed to fetch avatar for user:', userId);
            return { userId, avatar: undefined };
          }
        }
        return { userId: participant.id, avatar: undefined };
      });

      const avatarResults = await Promise.all(avatarPromises);
      const avatarMap: Record<string, string> = {};
      
      avatarResults.forEach(({ userId, avatar }) => {
        if (avatar) {
          avatarMap[userId] = avatar;
        }
      });

      setParticipantAvatars(avatarMap);
    };

    if (participants.length > 0) {
      fetchAvatars();
    }
  }, [participants]);

  // Convert participants to card format
  const baseParticipantCards: Participant[] = participants.map((p: any, index: number) => ({
    id: p.id || `participant_${index}`,
    name: p.name || `User ${index + 1}`,
    userId: p.userId || p.id || `user_${index}`,
    avatar: participantAvatars[p.userId || p.id] || p.avatar,
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
  const CARD_WIDTH = 180 + (spacing.md * 2);
  const TOTAL_CARDS = participantCards.length;
  const BASE_PARTICIPANTS = baseParticipantCards.length;
  
  // Calculate center position for the selected card
  const centerOffset = screenWidth / 2 - (CARD_WIDTH / 2);
  
  // Simple slider: start from right, end with selected card centered
  const startPosition = screenWidth; // Start off-screen to the right
  const endPosition = -(selectedIndex * CARD_WIDTH) - centerOffset;
  
  // Ensure we don't go too far left
  const maxLeftPosition = -(TOTAL_CARDS * CARD_WIDTH - screenWidth);
  const finalPosition = Math.max(endPosition, maxLeftPosition);
  
  // Simple slider animation
  const sliderTranslation = spinAnimationRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [startPosition, finalPosition],
  });

  return (
    <View style={styles.rouletteContainer}>
      {/* Horizontal slider */}
      <Animated.View
        style={[
          styles.sliderContainer,
          {
            transform: [
              { translateX: sliderTranslation },
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
            ]}
          >
            {/* Background Image */}
            <Image
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcard-split-bg.png?alt=media&token=642efc16-ee03-410d-943c-d6e16378c106' }}
              style={styles.rouletteCardBackground}
              resizeMode="cover"
            />

            {/* Content */}
            <View style={styles.rouletteCardContent}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <Avatar
                  userId={participant.userId}
                  userName={participant.name}
                  size={80}
                  avatarUrl={participant.avatar}
                  style={styles.avatar}
                />
              </View>

              {/* Name */}
              <Text style={styles.rouletteCardName}>{participant.name}</Text>

              {/* Wallet Address */}
              <Text style={styles.rouletteCardHash}>
                {participant.userId ?
                  `${participant.userId.slice(0, 4)}...${participant.userId.slice(-4)}` :
                  `${participant.id.slice(0, 4)}...${participant.id.slice(-4)}`
                }
              </Text>
            </View>

            {/* Selection indicator */}
            {index === selectedIndex && (
              <View style={styles.loserIndicator}>
                <Text style={styles.loserText}>🎯 LOSER</Text>
              </View>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

export default DegenRoulette;
