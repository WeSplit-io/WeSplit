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
                <View style={styles.memberHeader}>
                  <UserNameWithBadges
                    userId={member.userId}
                    userName={member.name}
                    textStyle={styles.memberName}
                    showBadges={true}
                  />
                  {member.role === 'creator' && (
                    <View style={styles.creatorBadge}>
                      <PhosphorIcon name="Crown" size={12} color={colors.green} weight="fill" />
                      <Text style={styles.creatorText}>Creator</Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberStatsRow}>
                  <Text style={styles.memberStats}>
                    {formatBalance(member.totalContributed, currency)} contributed
                  </Text>
                  <Text style={styles.memberPercentage}>
                    {memberPercentage.toFixed(1)}%
                  </Text>
                </View>
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
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    lineHeight: typography.fontSize.md * 1.3,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  creatorText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  memberStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberStats: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  memberPercentage: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
});

export default MembersList;

