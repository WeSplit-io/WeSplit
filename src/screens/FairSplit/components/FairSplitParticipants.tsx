/**
 * Fair Split Participants Component
 * Displays participant list with amounts and edit functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import UserAvatar from '@components/UserAvatar';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { typography } from '@theme/typography';
import { styles } from '../styles';
import { Participant } from '@services/amountCalculationService';

interface FairSplitParticipantsProps {
  participants: Participant[];
  isSplitConfirmed: boolean;
  isCurrentUserCreator: boolean;
  splitMethod: 'equal' | 'manual';
  onEditParticipantAmount: (participant: Participant) => void;
}

const FairSplitParticipants: React.FC<FairSplitParticipantsProps> = ({
  participants,
  isSplitConfirmed,
  isCurrentUserCreator,
  splitMethod,
  onEditParticipantAmount
}) => {
  return (
    <View style={styles.participantsContainer}>
      {participants.map((participant) => (
        <View key={participant.id} style={styles.participantCard}>
          <UserAvatar
            displayName={participant.name}
            size={40}
            style={styles.participantAvatar}
          />
          <View style={styles.participantInfo}>
            <Text style={styles.participantName}>{participant.name}</Text>
            <Text style={styles.participantWallet}>
              {participant.walletAddress.length > 10 
                ? `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}`
                : participant.walletAddress
              }
            </Text>
          </View>
          <View style={styles.participantAmountContainer}>
            {!isSplitConfirmed && isCurrentUserCreator && splitMethod === 'manual' ? (
              // Creator can edit amounts in manual mode
              <TouchableOpacity 
                style={styles.editableAmountButton}
                onPress={() => onEditParticipantAmount(participant)}
              >
                <Text style={styles.editableAmountText}>
                  ${participant.amountOwed.toFixed(3)}
                </Text>
              </TouchableOpacity>
            ) : (
              // Read-only amount display
              <View style={styles.readOnlyAmountContainer}>
                <Text style={styles.readOnlyAmountText}>
                  ${participant.amountOwed.toFixed(3)}
                </Text>
                {isSplitConfirmed && (
                  <Text style={styles.lockedIndicator}>🔒</Text>
                )}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default FairSplitParticipants;
