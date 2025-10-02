import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  editButton: {
    padding: spacing.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  headerSpacer: {
    width: 40, // Same width as the back button to maintain balance
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  billTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  billAmountContainer: {
    marginBottom: spacing.lg,
  },
  billAmountLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.xs,
  },
  billAmountUSDC: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: colors.green,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    color: colors.green,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  progressSubtext: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  splitMethodContainer: {
    marginBottom: spacing.xl,
  },
  splitMethodLabel: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  splitMethodOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  splitMethodOption: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  splitMethodOptionActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  splitMethodOptionText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  splitMethodOptionTextActive: {
    color: colors.white,
  },
  participantsContainer: {
    marginBottom: spacing.xl,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
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
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
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
  amountInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'right',
    minWidth: 80,
    marginBottom: spacing.xs,
  },
  participantStatus: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
  },
  confirmButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surface,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  confirmButtonTextDisabled: {
    color: colors.textSecondary,
  },
  testButtonsContainer: {
    gap: spacing.sm,
  },
  createWalletButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createWalletButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    gap: spacing.md,
  },
  payButton: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
});
