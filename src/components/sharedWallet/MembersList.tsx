/**
 * Members List Component
 * Displays the list of members in a shared wallet
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Member {
  userId: string;
  name: string;
  walletAddress: string;
  role: 'creator' | 'admin' | 'member';
  totalContributed: number;
  totalWithdrawn: number;
}

interface MembersListProps {
  members?: Member[];
  currentUserId?: string;
}

const MembersList: React.FC<MembersListProps> = ({
  members = [],
  currentUserId,
}) => {
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

  return (
    <View style={styles.listContainer}>
      {members.map((member) => {
        const roleLabel = getRoleLabel(member.role);
        const isCurrentUser = currentUserId && member.userId === currentUserId;

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
            </View>
            <Text style={styles.memberRole}>
              {roleLabel}
              {isCurrentUser ? ' (You)' : ''}
            </Text>
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
});

export default MembersList;

