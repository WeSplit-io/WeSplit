/**
 * Members List Component
 * Displays the list of members in a shared wallet
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatBalance } from '../../utils/ui/format/formatUtils';
import { Avatar, PhosphorIcon } from '../shared';
import { ParticipationCircle } from '../shared/ParticipationCircle';
import UserNameWithBadges from '../profile/UserNameWithBadges';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Member {
  userId: string;
  name: string;
  walletAddress: string;
  role: 'creator' | 'member';
  totalContributed: number;
  totalWithdrawn: number;
}

interface MembersListProps {
  members: Member[];
  currency: string;
  showParticipationCircle?: boolean;
}

const MembersList: React.FC<MembersListProps> = ({
  members,
  currency,
  showParticipationCircle = true,
}) => {
  const totalContributed = useMemo(() => {
    return members.reduce((sum, m) => sum + m.totalContributed, 0);
  }, [members]);

  return (
    <>
      {/* Participation Visualization */}
      {showParticipationCircle && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Participation ({members.length} members)
          </Text>
          <ParticipationCircle
            members={members}
            totalContributed={totalContributed}
            size={80}
            strokeWidth={6}
          />
        </View>
      )}

      {/* Members List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        {members.map((member) => {
          const memberPercentage = totalContributed > 0
            ? (member.totalContributed / totalContributed) * 100
            : 0;
          
          return (
            <View key={member.userId} style={styles.memberRow}>
              <Avatar
                userId={member.userId}
                userName={member.name}
                size={40}
                style={styles.memberAvatar}
              />
              <View style={styles.memberInfo}>
                <UserNameWithBadges
                  userId={member.userId}
                  userName={member.name}
                  textStyle={styles.memberName}
                  showBadges={true}
                />
                <Text style={styles.memberWalletAddress}>
                  {member.walletAddress && member.walletAddress.length > 10
                    ? `${member.walletAddress.slice(0, 4)}...${member.walletAddress.slice(-4)}`
                    : member.walletAddress || 'No wallet address'
                  }
                </Text>
              </View>
              <View style={styles.roleContainer}>
                {member.role === 'creator' ? (
                  <View style={[styles.roleBadge, styles.creatorBadge]}>
                    <Text style={[styles.roleText, { color: colors.green }]}>Admin</Text>
                  </View>
                ) : (
                  <View style={[styles.roleBadge, styles.memberBadge]}>
                    <Text style={[styles.roleText, { color: colors.white70 }]}>Member</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    lineHeight: typography.fontSize.md * 1.3,
  },
  memberWalletAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: 'monospace',
  },
  roleContainer: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    borderWidth: 1,
  },
  creatorBadge: {
    backgroundColor: colors.greenBlue20,
    borderColor: colors.green + '40',
  },
  memberBadge: {
    backgroundColor: colors.white10,
    borderColor: colors.white20,
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});

export default MembersList;

