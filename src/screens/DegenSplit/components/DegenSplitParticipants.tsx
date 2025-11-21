/**
 * Degen Split Participants Component
 * Shows participant list with lock status
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import Avatar from '../../../components/shared/Avatar';
import { roundUsdcAmount, formatUsdcForDisplay } from '../../../utils/ui/format/formatUtils';
import { styles } from './DegenSplitParticipantsStyles';
import { 
  getParticipantStatusDisplayText, 
  getParticipantStatusColor 
} from '../../../utils/statusUtils';
import BadgeDisplay from '../../../components/profile/BadgeDisplay';
import UserNameWithBadges from '../../../components/profile/UserNameWithBadges';
import { firebaseDataService } from '../../../services/data/firebaseDataService';

interface Participant {
  id: string;
  userId: string;
  name: string;
  walletAddress?: string;
  amountPaid?: number;
  status?: string;
  avatar?: string; // Add avatar property
}

interface DegenSplitParticipantsProps {
  participants: Participant[];
  totalAmount: number;
  currentUserId?: string;
  splitWallet?: any;
}

const DegenSplitParticipants: React.FC<DegenSplitParticipantsProps> = ({
  participants,
  totalAmount,
  currentUserId,
  splitWallet,
}) => {
  const [participantBadges, setParticipantBadges] = useState<Record<string, { badges: string[]; active_badge?: string }>>({});

  // Fetch badges for all participants
  useEffect(() => {
    const fetchBadges = async () => {
      const badgesMap: Record<string, { badges: string[]; active_badge?: string }> = {};
      
      await Promise.all(
        participants.map(async (participant) => {
          try {
            const userId = participant.userId || participant.id;
            if (!userId) return;
            
            const userData = await firebaseDataService.user.getCurrentUser(userId);
            if (userData.badges && userData.badges.length > 0) {
              badgesMap[userId] = {
                badges: userData.badges,
                active_badge: userData.active_badge
              };
            }
          } catch (error) {
            // Silently fail - badges are optional
          }
        })
      );
      
      setParticipantBadges(badgesMap);
    };

    if (participants.length > 0) {
      fetchBadges();
    }
  }, [participants]);

  return (
    <View style={styles.participantsContainer}>
      <ScrollView 
        style={styles.participantsScrollView}
        showsVerticalScrollIndicator={false}
      >
        
        {participants.map((participant, index) => {
          const userId = participant.userId || participant.id;
          const badges = userId ? participantBadges[userId] : undefined;
          // Use wallet participant data if available for accurate lock status
          const walletParticipant = splitWallet?.participants?.find(
            (p: any) => p.userId === (participant.userId || participant.id)
          );
          const isParticipantLocked = walletParticipant ? 
            walletParticipant.status === 'locked' || walletParticipant.amountPaid >= walletParticipant.amountOwed : 
            false;
          
          // Check if this is the current user
          const isCurrentUser = currentUserId && (participant.userId || participant.id) === currentUserId;
          
          return (
            <View 
              key={participant.userId || participant.id || `participant_${index}`} 
              style={styles.participantCard}
            >
              <Avatar
                userId={participant.userId || participant.id}
                userName={participant.name || `Participant ${index + 1}`}
                size={40}
                avatarUrl={participant.avatar}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.white10,
                }}
              />
              
              <View style={styles.participantInfo}>
                <UserNameWithBadges
                  userId={participant.userId || participant.id}
                  userName={`${participant.name || `Participant ${index + 1}`}${isCurrentUser ? ' (You)' : ''}`}
                  textStyle={styles.participantName}
                  showBadges={true}
                />
                {badges && badges.badges.length > 0 && badges.active_badge && (
                  <BadgeDisplay
                    badges={badges.badges}
                    activeBadge={badges.active_badge}
                    showAll={false}
                  />
                )}
                <Text style={styles.participantWallet}>
                  {participant.walletAddress && participant.walletAddress.length > 8 ? 
                    `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}` : 
                    participant.walletAddress || 'No wallet address'
                  }
                </Text>
              </View>
              
              <View style={styles.participantAmountContainer}>
                <Text style={styles.participantAmount}>{formatUsdcForDisplay(totalAmount)} USDC</Text>
                {isParticipantLocked ? (
                  <View style={styles.lockedIndicator}>
                    <Text style={styles.lockedIndicatorText}>
                      🔒 {getParticipantStatusDisplayText('locked')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.unlockedIndicator}>
                    <Text style={styles.unlockedIndicatorText}>
                      ⏳ {getParticipantStatusDisplayText('pending')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DegenSplitParticipants;
