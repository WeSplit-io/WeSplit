/**
 * Degen Split Participants Component
 * Shows participant list with lock status
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import UserAvatar from '../../../components/UserAvatar';
import { styles } from './DegenSplitParticipantsStyles';

interface Participant {
  id: string;
  userId: string;
  name: string;
  walletAddress?: string;
  amountPaid?: number;
  status?: string;
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
  return (
    <View style={styles.participantsContainer}>
      <ScrollView 
        style={styles.participantsScrollView}
        showsVerticalScrollIndicator={false}
      >
        {participants.map((participant, index) => {
          // Use wallet participant data if available for accurate lock status
          const walletParticipant = splitWallet?.participants?.find(
            (p: any) => p.userId === (participant.userId || participant.id)
          );
          const isParticipantLocked = walletParticipant ? 
            walletParticipant.amountPaid >= walletParticipant.amountOwed : 
            false;
          
          // Check if this is the current user
          const isCurrentUser = currentUserId && (participant.userId || participant.id) === currentUserId;
          
          return (
            <View 
              key={participant.userId || participant.id || `participant_${index}`} 
              style={styles.participantCard}
            >
              <UserAvatar
                displayName={participant.name || `Participant ${index + 1}`}
                size={40}
                style={styles.participantAvatar}
              />
              
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>
                  {participant.name || `Participant ${index + 1}`}
                  {isCurrentUser && ' (You)'}
                </Text>
                <Text style={styles.participantWallet}>
                  {participant.walletAddress && participant.walletAddress.length > 8 ? 
                    `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}` : 
                    participant.walletAddress || 'No wallet address'
                  }
                </Text>
              </View>
              
              <View style={styles.participantAmountContainer}>
                <Text style={styles.participantAmount}>{totalAmount} USDC</Text>
                {isParticipantLocked ? (
                  <View style={styles.lockedIndicator}>
                    <Text style={styles.lockedIndicatorText}>🔒 Locked</Text>
                  </View>
                ) : (
                  <View style={styles.unlockedIndicator}>
                    <Text style={styles.unlockedIndicatorText}>⏳ Pending</Text>
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
