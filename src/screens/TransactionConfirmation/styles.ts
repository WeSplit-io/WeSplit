import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({

  content: {
    flex: 1,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.iconSize,
  },
  recipientAvatar: {
    width: spacing.xxl + spacing.screenPadding,
    height: spacing.xxl + spacing.screenPadding,
    borderRadius: spacing.iconSize,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  recipientAvatarText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  recipientEmail: {
    color: colors.darkGray,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  recipientWallet: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  amountSection: {
    marginBottom: spacing.iconSize,
  },
  sectionTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.itemSpacing,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.itemSpacing,
  },
  amountInput: {
    flex: 1,
    color: colors.textLight,
    fontSize: spacing.iconSize,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  currencyLabel: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  amountUSD: {
    color: colors.darkGray,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  memoSection: {
    marginBottom: spacing.iconSize,
  },
  memoInput: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.itemSpacing,
    color: colors.textLight,
    fontSize: typography.fontSize.md,
  },
  walletInfo: {
    marginBottom: spacing.iconSize,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
  },
  walletDetails: {
    marginLeft: spacing.itemSpacing,
  },
  walletName: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  walletAddress: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  footer: {
    paddingHorizontal: spacing.iconSize,
    paddingBottom: spacing.iconSize,
  },
  confirmButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.iconSize,
  },
  statusTitle: {
    color: colors.textLight,
    fontSize: spacing.iconSize,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.iconSize,
    marginBottom: spacing.itemSpacing,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: colors.darkGray,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: spacing.iconSize,
  },
  successIcon: {
    width: spacing.xxl + spacing.xxxl,
    height: spacing.xxl + spacing.xxxl,
    borderRadius: spacing.xxl + spacing.xl,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: spacing.xxl + spacing.xxxl,
    height: spacing.xxl + spacing.xxxl,
    borderRadius: spacing.xxl + spacing.xl,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.iconSize,
    paddingVertical: spacing.itemSpacing,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  backToDashboardButton: {
    backgroundColor: 'transparent',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.iconSize,
    paddingVertical: spacing.itemSpacing,
    marginTop: spacing.md,
  },
  backToDashboardText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  feeContainer: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  feeRowLast: {
    marginBottom: 0,
    paddingTop: spacing.sm,
    borderTopWidth: spacing.borderWidthThin,
    borderTopColor: colors.border,
  },
  feeLabel: {
    color: colors.darkGray,
    fontSize: typography.fontSize.sm,
  },
  feeValue: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotalLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  feeTotalValue: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
}); 