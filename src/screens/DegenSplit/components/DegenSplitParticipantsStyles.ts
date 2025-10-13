import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  participantsContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  participantsScrollView: {
    flex: 1,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  participantAvatar: {
    marginRight: spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  participantWallet: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  participantAmountContainer: {
    alignItems: 'flex-end',
  },
  participantAmount: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  lockedIndicator: {
    backgroundColor: colors.green20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.green,
  },
  lockedIndicatorText: {
    color: colors.green,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  unlockedIndicator: {
    backgroundColor: colors.orange20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  unlockedIndicatorText: {
    color: colors.orange,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
});
