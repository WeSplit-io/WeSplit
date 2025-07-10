import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darkened overlay
    justifyContent: 'flex-end', // Align modal to bottom
  },
  modalContent: {
    height: '90%', // Cover 90% of screen
    backgroundColor: colors.darkBackground,
    borderTopLeftRadius: spacing.radiusMd,
    borderTopRightRadius: spacing.radiusMd,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeIcon: {
    fontSize: 24,
    color: colors.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },

  // Amount Header
  amountHeader: {
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  amountHeaderRed: {
    backgroundColor: '#FF4D4F',
  },
  amountHeaderGreen: {
    backgroundColor: '#A5EA15',
  },
  amountHeaderText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: '#FFF',
    marginBottom: spacing.xs,
  },
  amountHeaderValue: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: '#FFF',
  },

  // Settlement Cards
  settlementCards: {
    marginBottom: spacing.lg,
  },
  settlementCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settlementCardHeader: {
    marginBottom: spacing.md,
  },
  settlementCardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  settlementCardAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  settlementActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: '#212121',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },

  // Bottom Action Button
  bottomActionButton: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bottomActionButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: '#212121',
  },

  // Section Toggle
  sectionToggle: {
    position: 'absolute',
    bottom: 100,
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    flexDirection: 'row',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: spacing.radiusSm,
  },
  toggleButtonActive: {
    backgroundColor: '#A5EA15',
  },
  toggleButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: '#212121',
  },

  // Disabled state for buttons
  disabledButton: {
    opacity: 0.6,
  },

  // Empty State
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  debugText: {
    color: colors.textGray,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  debugTextSmall: {
    color: colors.textGray,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  debugTextTiny: {
    color: colors.textGray,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.iconSize,
    lineHeight: spacing.iconSize,
  },
  balanceContainer: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.screenPadding,
    marginBottom: spacing.iconSize,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    fontSize: spacing.xxl + spacing.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
  },
  balanceAmountNegative: {
    color: colors.error,
  },
  membersList: {
    marginBottom: spacing.iconSize,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.screenPadding,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.itemSpacing,
  },
  avatarText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  memberEmail: {
    fontSize: typography.fontSize.xs,
    color: colors.darkGray,
    marginTop: spacing.xs / 2,
  },
  memberBalance: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  positiveBalance: {
    color: colors.brandGreen,
  },
  negativeBalance: {
    color: colors.error,
  },
  zeroBalance: {
    color: colors.darkGray,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.itemSpacing,
    marginTop: spacing.lg,
  },
  sendButton: {
    flex: 1,
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  sendButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  requestButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: spacing.xs / 2,
    borderColor: colors.brandGreen,
  },
  requestButtonText: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  settleUpButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.itemSpacing,
  },
  settleUpButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    marginTop: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
  // Additional styles for comprehensive coverage
  sectionHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  refreshButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  divider: {
    height: spacing.borderWidthThin,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
}); 