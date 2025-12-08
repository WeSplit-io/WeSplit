/**
 * Members List Component
 * Displays the list of members in a shared wallet
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Avatar, Button } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWalletMember } from '../../services/sharedWallet';
import { logger } from '../../services/analytics/loggingService';

interface MembersListProps {
  members?: SharedWalletMember[];
  currentUserId?: string;
  walletId?: string;
  onMemberUpdate?: () => void;
}

const MembersList: React.FC<MembersListProps> = ({
  members = [],
  currentUserId,
  walletId,
  onMemberUpdate,
}) => {
  const handleAcceptInvitation = async (member: SharedWalletMember) => {
    if (!walletId) return;

    try {
      const result = await SharedWalletService.acceptSharedWalletInvitation(walletId, member.userId);
      if (result.success) {
        Alert.alert('Success', 'You have joined the shared wallet!');
        onMemberUpdate?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to join shared wallet');
      }
    } catch (error) {
      logger.error('Failed to accept invitation', { walletId, userId: member.userId, error });
      Alert.alert('Error', 'Failed to join shared wallet');
    }
  };
  const formatWalletAddress = (address?: string) => {
    if (!address) return 'No wallet address';
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getRoleLabel = (role?: Member['role']) => {
    switch (role) {
      case 'creator':
        return 'Owner';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  const getStatusInfo = (status?: SharedWalletMember['status']) => {
    switch (status) {
      case 'invited':
        return { label: 'Invited', color: colors.warning };
      case 'left':
        return { label: 'Left', color: colors.error };
      case 'active':
      default:
        return { label: 'Active', color: colors.success };
    }
  };

  return (
    <View style={styles.listContainer}>
      {members.map((member) => {
        const roleLabel = getRoleLabel(member.role);
        const statusInfo = getStatusInfo(member.status);
        const isCurrentUser = currentUserId && member.userId === currentUserId;
        const canAcceptInvitation = isCurrentUser && member.status === 'invited';

        return (
          <View key={member.userId} style={styles.memberCard}>
            <Avatar
              userId={member.userId}
              userName={member.name}
              size={48}
              style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberWalletAddress}>
                {formatWalletAddress(member.walletAddress)}
              </Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.statusText}>{statusInfo.label}</Text>
                </View>
                <Text style={styles.memberRole}>
                  {roleLabel}
                  {isCurrentUser ? ' (You)' : ''}
                </Text>
              </View>
            </View>
            {canAcceptInvitation && (
              <Button
                title="Join"
                onPress={() => handleAcceptInvitation(member)}
                size="small"
                style={styles.joinButton}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  memberName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    lineHeight: typography.fontSize.md * 1.3,
  },
  memberWalletAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: typography.fontFamily.mono,
  },
  memberRole: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.regular,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  joinButton: {
    minWidth: 60,
  },
});

export default MembersList;

