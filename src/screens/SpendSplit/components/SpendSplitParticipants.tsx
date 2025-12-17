/**
 * SPEND Split Participants Component
 * Displays participant list with payment status (read-only for SPEND orders)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import Avatar from '../../../components/shared/Avatar';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { SplitParticipant } from '../../../services/splits/splitStorageService';
import { SplitWalletParticipant } from '../../../services/split/types';
import { formatAmountWithComma } from '../../../utils/ui/format/formatUtils';
import { formatWalletAddress } from '../../../utils/spend/spendDataUtils';

// Union type for participants from either Split or SplitWallet
type Participant = SplitParticipant | SplitWalletParticipant | { id: string; userId?: string; name: string; amountOwed: number; amountPaid: number; avatar?: string };

interface SpendSplitParticipantsProps {
  participants: Participant[];
  currentUserId?: string;
  onAddPress?: () => void; // Callback for "Add" button (contacts)
  onSharePress?: () => void; // Callback for "Share" button (QR/link)
}

const SpendSplitParticipants: React.FC<SpendSplitParticipantsProps> = ({
  participants,
  currentUserId,
  onAddPress,
  onSharePress,
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
        <View style={styles.headerButtons}>
          {onSharePress && (
            <TouchableOpacity onPress={onSharePress} activeOpacity={0.8} style={styles.shareButton}>
              <PhosphorIcon name="ShareNetwork" size={16} color={colors.spendGradientStart} weight="bold" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          )}
        {onAddPress && (
          <TouchableOpacity onPress={onAddPress} activeOpacity={0.8}>
            <LinearGradient
              colors={[colors.spendGradientStart, colors.spendGradientEnd]}
              style={styles.addButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <PhosphorIcon name="Plus" size={16} color={colors.black} weight="bold" />
              <Text style={styles.addButtonText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        </View>
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
                    <PhosphorIcon name="Check" size={12} color={colors.white} weight="bold" />
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
    marginVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.spendGradientStart + '40',
  },
  shareButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.spendGradientStart,
    fontWeight: typography.fontWeight.medium,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.black,
    fontWeight: typography.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  participantCount: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
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
    color: colors.white70,
  },
  participantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  participantCardPaid: {
    backgroundColor: colors.white10,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm + 2,
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
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  participantWallet: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: typography.fontFamily.mono,
  },
  participantAmountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  paidCheckmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
});

export default SpendSplitParticipants;

