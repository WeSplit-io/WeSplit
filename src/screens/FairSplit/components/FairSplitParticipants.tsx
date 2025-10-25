/**
 * Fair Split Participants Component
 * Displays participant list with amounts and edit functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Avatar from '../../../components/shared/Avatar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { styles } from '../styles';
import { Participant } from '../../../services/payments/amountCalculationService';

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
          <Avatar
            userId={participant.id}
            userName={participant.name}
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
            <Text style={styles.participantName}>{participant.name}</Text>
            <Text style={styles.participantWallet}>
              {participant.walletAddress && participant.walletAddress.length > 10 
                ? `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}`
                : participant.walletAddress || 'No wallet address'
              }
            </Text>
            {/* Payment Status */}
            {participant.amountPaid > 0 && (
              <View style={styles.paymentStatusContainer}>
                {participant.amountPaid >= participant.amountOwed ? (
                  <Text style={styles.paymentStatusPaid}>✅ Paid: ${participant.amountPaid.toFixed(2)}</Text>
                ) : (
                  <Text style={styles.paymentStatusPartial}>💰 Partial: ${participant.amountPaid.toFixed(2)} / ${participant.amountOwed.toFixed(2)}</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.participantAmountContainer}>
            {!isSplitConfirmed && isCurrentUserCreator && splitMethod === 'manual' ? (
              // Creator can edit amounts in manual mode
              <TouchableOpacity 
                style={styles.editableAmountButton}
                onPress={() => onEditParticipantAmount(participant)}
              >
                <Text style={styles.editableAmountText}>
                  ${participant.amountOwed.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ) : (
              // Read-only amount display
              <View style={styles.readOnlyAmountContainer}>
                <Text style={styles.readOnlyAmountText}>
                  ${participant.amountOwed.toFixed(2)}
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
