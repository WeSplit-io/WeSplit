/**
 * Fair Split Participants Component
 * Displays participant list with amounts and edit functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Avatar from '../../../components/shared/Avatar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { styles } from '../styles';
import { Participant } from '../../../services/payments/amountCalculationService';
import BadgeDisplay from '../../../components/profile/BadgeDisplay';
import UserNameWithBadges from '../../../components/profile/UserNameWithBadges';
import { firebaseDataService } from '../../../services/data/firebaseDataService';

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
  const [participantBadges, setParticipantBadges] = useState<Record<string, { badges: string[]; active_badge?: string }>>({});

  // Fetch badges for all participants
  useEffect(() => {
    let isMounted = true;
    
    const fetchBadges = async () => {
      const badgesMap: Record<string, { badges: string[]; active_badge?: string }> = {};
      
      await Promise.all(
        participants.map(async (participant) => {
          try {
            const userData = await firebaseDataService.user.getCurrentUser(participant.id);
            if (isMounted && userData.badges && userData.badges.length > 0) {
              badgesMap[participant.id] = {
                badges: userData.badges,
                active_badge: userData.active_badge
              };
            }
          } catch (error) {
            // Silently fail - badges are optional
          }
        })
      );
      
      if (isMounted) {
        setParticipantBadges(badgesMap);
      }
    };

    if (participants.length > 0) {
      fetchBadges();
    }
    
    return () => {
      isMounted = false;
    };
  }, [participants]);

  return (
    <View style={styles.participantsContainer}>
      {participants.map((participant, index) => {
        const badges = participantBadges[participant.id];
        // ✅ FIX: Use unique key combining ID and index to prevent duplicate key errors
        const uniqueKey = `${participant.id}-${index}`;
        
        return (
          <View key={uniqueKey} style={styles.participantCard}>
            <Avatar
              userId={participant.id}
              userName={participant.name}
              size={40}
              avatarUrl={participant.avatar}
              showProfileBorder={false}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.white10,
              }}
            />
            <View style={styles.participantInfo}>
              <UserNameWithBadges
                userId={participant.id}
                userName={participant.name}
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
        );
      })}
    </View>
  );
};

export default FairSplitParticipants;
