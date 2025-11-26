import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({

  content: {
    flex: 1,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white70,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.iconSize,
  },
  recipientAvatar: {
    width: spacing.xxl + spacing.screenPadding,
    height: spacing.xxl + spacing.screenPadding,
    borderRadius: spacing.iconSize,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  recipientAvatarText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  recipientEmail: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  recipientWallet: {
    color: colors.green,
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  amountSection: {
    marginBottom: spacing.iconSize,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.itemSpacing,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.itemSpacing,
  },
  amountInput: {
    flex: 1,
    color: colors.white,
    fontSize: spacing.iconSize,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'right',
  },
  currencyLabel: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  amountUSD: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  memoSection: {
    marginBottom: spacing.iconSize,
  },
  memoInput: {
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.itemSpacing,
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  walletInfo: {
    marginBottom: spacing.iconSize,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
  },
  walletDetails: {
    marginLeft: spacing.itemSpacing,
  },
  walletName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  walletAddress: {
    color: colors.green,
    fontSize: typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  footer: {
    paddingHorizontal: spacing.iconSize,
    paddingBottom: spacing.iconSize,
  },
  confirmButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.black,
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
    color: colors.white,
    fontSize: spacing.iconSize,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.iconSize,
    marginBottom: spacing.itemSpacing,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: spacing.iconSize,
  },
  successIcon: {
    width: spacing.xxl + spacing.xxxl,
    height: spacing.xxl + spacing.xxxl,
    borderRadius: spacing.xxl + spacing.xl,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: spacing.xxl + spacing.xxxl,
    height: spacing.xxl + spacing.xxxl,
    borderRadius: spacing.xxl + spacing.xl,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.iconSize,
    paddingVertical: spacing.itemSpacing,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  backToDashboardButton: {
    backgroundColor: 'transparent',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.white,
    borderRadius: spacing.itemSpacing,
    paddingHorizontal: spacing.iconSize,
    paddingVertical: spacing.itemSpacing,
    marginTop: spacing.md,
  },
  backToDashboardText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  feeContainer: {
    backgroundColor: colors.white70,
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
    borderTopColor: colors.white10,
  },
  feeLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  feeValue: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotalLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  feeTotalValue: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
}); 