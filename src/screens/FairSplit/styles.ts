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
    marginHorizontal: spacing.sm,
    // Add the cut-out effect on left and right edges
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    borderWidth: 2,
    borderColor: colors.textSecondary,
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
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    minWidth: 80,
    textAlign: 'center',
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
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  payButtonDisabled: {
    backgroundColor: colors.surface,
  },
  payButtonTextDisabled: {
    color: colors.textSecondary,
  },
  waitingContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    fontWeight: '500',
  },
  // New styles for creator-only repartition control
  participantsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  editableAmountButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.green,
    borderStyle: 'dashed',
  },
  editableAmountText: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  readOnlyAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  readOnlyAmountText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  lockedIndicator: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalInputContainer: {
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.black,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.green,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  modalHelperText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // Split button styles
  splitButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  splitButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Split modal styles
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  splitOptionsContainer: {
    marginBottom: spacing.xl,
  },
  splitOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  splitOptionIconText: {
    fontSize: typography.fontSize.lg,
  },
  splitOptionContent: {
    flex: 1,
  },
  splitOptionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  splitOptionDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  splitOptionArrow: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  // Transfer visualization styles
  transferVisualization: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    paddingVertical: spacing.lg,
  },
  transferIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  transferIconText: {
    fontSize: 24,
  },
  transferArrows: {
    marginHorizontal: spacing.lg,
  },
  transferArrowText: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  // Transfer button styles
  transferButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.green,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transferButtonIconText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  transferButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  // Dev button styles
  buttonContainer: {
    gap: spacing.sm,
  },
  devButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.green,
    borderStyle: 'dashed',
  },
  devButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  // Wallet selection styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  noWalletsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noWalletsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
  selectedWalletInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedWalletLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  selectedWalletAddress: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  // Add wallet button styles
  addWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.green,
    borderStyle: 'dashed',
  },
  addWalletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addWalletIconText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  addWalletContent: {
    flex: 1,
  },
  addWalletTitle: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  addWalletDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  addWalletArrow: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
});
