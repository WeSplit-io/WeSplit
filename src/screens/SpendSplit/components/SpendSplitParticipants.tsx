/**
 * SPEND Split Participants Component
 * Displays participant list with payment status (read-only for SPEND orders)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import Avatar from '../../../components/shared/Avatar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { SplitParticipant } from '../../../services/splits/splitStorageService';
import { SplitWalletParticipant } from '../../../services/split/types';
import { formatAmountWithComma } from '../../../utils/spend/formatUtils';
import { formatWalletAddress } from '../../../utils/spend/spendDataUtils';

// Union type for participants from either Split or SplitWallet
type Participant = SplitParticipant | SplitWalletParticipant | { id: string; userId?: string; name: string; amountOwed: number; amountPaid: number; avatar?: string };

interface SpendSplitParticipantsProps {
  participants: Participant[];
  currentUserId?: string;
  onAddPress?: () => void; // Callback for "Add" button
}

const SpendSplitParticipants: React.FC<SpendSplitParticipantsProps> = ({
  participants,
  currentUserId,
  onAddPress,
}) => {
  // Use shared formatting utility
  const formatAmount = formatAmountWithComma;
  if (participants.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Participants</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No participants yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
        {onAddPress && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <PhosphorIcon name="Plus" size={16} color={colors.green} weight="bold" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      {participants.map((participant, index) => {
        // Handle different participant structures
        const participantId = 'userId' in participant ? participant.userId : ('id' in participant ? participant.id : `participant-${index}`);
        const isCurrentUser = participantId === currentUserId;
        const isPaid = participant.amountPaid >= participant.amountOwed;
        const hasPartialPayment = participant.amountPaid > 0 && !isPaid;

        return (
          <View key={participantId} style={[styles.participantCard, isPaid && styles.participantCardPaid]}>
            <View style={styles.participantInfo}>
              <View style={[styles.avatarContainer, isPaid && styles.avatarContainerPaid]}>
                <Avatar
                  userId={participantId}
                  userName={participant.name}
                  avatarUrl={'avatar' in participant ? participant.avatar : undefined}
                  size={48}
                  style={styles.avatar}
                />
                {isPaid && (
                  <View style={styles.paidCheckmark}>
                    <Text style={styles.paidCheckmarkText}>✓</Text>
                  </View>
                )}
              </View>
              <View style={styles.participantDetails}>
                <Text style={styles.participantName} numberOfLines={1}>
                  {participant.name}
                </Text>
                <Text style={styles.participantWallet} numberOfLines={1}>
                  {(() => {
                    const wallet = 'walletAddress' in participant 
                      ? participant.walletAddress 
                      : ('wallet_address' in participant ? (participant as any).wallet_address : '');
                    return wallet ? formatWalletAddress(wallet) : 'No wallet address';
                  })()}
                    </Text>
              </View>
            </View>
            <View style={styles.participantAmountContainer}>
              <Text style={styles.amountText}>
                {formatAmount(participant.amountOwed)} USDC
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green + '20',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.green + '40',
    gap: spacing.xs / 2,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  participantCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  participantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  participantCardPaid: {
    backgroundColor: colors.white10,
    borderColor: colors.white20,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarContainerPaid: {
    opacity: 1,
  },
  avatar: {
    borderWidth: 0,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs / 4,
  },
  participantWallet: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.mono,
  },
  participantAmountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
});

export default SpendSplitParticipants;

