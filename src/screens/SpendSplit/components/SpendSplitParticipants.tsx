/**
 * SPEND Split Participants Component
 * Displays participant list with payment status (read-only for SPEND orders)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Avatar from '../../../components/shared/Avatar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { SplitParticipant } from '../../../services/splits/splitStorageService';
import { SplitWalletParticipant } from '../../../services/split/types';
import UserNameWithBadges from '../../../components/profile/UserNameWithBadges';

// Union type for participants from either Split or SplitWallet
type Participant = SplitParticipant | SplitWalletParticipant | { id: string; userId?: string; name: string; amountOwed: number; amountPaid: number; avatar?: string };

interface SpendSplitParticipantsProps {
  participants: Participant[];
  currentUserId?: string;
}

const SpendSplitParticipants: React.FC<SpendSplitParticipantsProps> = ({
  participants,
  currentUserId,
}) => {
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
        <Text style={styles.sectionTitle}>Participants</Text>
        <Text style={styles.participantCount}>{participants.length}</Text>
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
                <View style={styles.participantNameRow}>
                  <UserNameWithBadges
                    userId={participantId}
                    userName={participant.name}
                    showBadges={true}
                  />
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
                {/* Payment Status */}
                {isPaid && (
                  <View style={styles.paymentStatusContainer}>
                    <Text style={styles.paymentStatusPaid}>✅ Fully Paid</Text>
                  </View>
                )}
                {hasPartialPayment && (
                  <View style={styles.paymentStatusContainer}>
                    <Text style={styles.paymentStatusPartial}>
                      💰 ${participant.amountPaid.toFixed(2)} / ${participant.amountOwed.toFixed(2)}
                    </Text>
                  </View>
                )}
                {!isPaid && !hasPartialPayment && (
                  <View style={styles.paymentStatusContainer}>
                    <Text style={styles.paymentStatusPending}>⏳ Awaiting Payment</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.participantAmountContainer}>
              <Text style={[styles.amountText, isPaid && styles.amountTextPaid]}>
                ${participant.amountOwed.toFixed(2)}
              </Text>
              {isPaid && (
                <Text style={styles.amountLabel}>Paid</Text>
              )}
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
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  participantCardPaid: {
    backgroundColor: colors.green + '10',
    borderColor: colors.green + '30',
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
    opacity: 0.9,
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.white20,
  },
  paidCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paidCheckmarkText: {
    color: colors.black,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  participantDetails: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  youBadge: {
    backgroundColor: colors.green + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  youBadgeText: {
    fontSize: typography.fontSize.xs - 2,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
  },
  paymentStatusContainer: {
    marginTop: spacing.xs / 2,
  },
  paymentStatusPaid: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
  },
  paymentStatusPartial: {
    fontSize: typography.fontSize.xs,
    color: colors.yellow,
    fontWeight: typography.fontWeight.medium,
  },
  paymentStatusPending: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  participantAmountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs / 4,
  },
  amountTextPaid: {
    color: colors.green,
  },
  amountLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SpendSplitParticipants;

