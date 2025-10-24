import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },

  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  realtimeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
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
  },
  billCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    // Add the cut-out effect on left and right edges
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  billCardDotLeft: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginRight: spacing.xs,
    position: 'absolute',
    bottom: '65%',
    left: -15,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  billCardDotRight: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginLeft: spacing.xs,
    position: 'absolute',
    bottom: '65%',
    right: -15,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  billTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  billIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: 8,
    padding: spacing.sm,
  },
  billIconImage: {
    width: 36,
    height: 36,
    marginRight: spacing.sm,
    tintColor: colors.white,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.black,

  },
  billTitle: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  billDate: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    opacity: 0.7,
  },
  billAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billAmountLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
  },
  billAmountUSDC: {
    color: colors.black,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },

  /*** Progress Container ***/
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressDetails: {
    marginTop: spacing.lg,
    width: '100%',
    backgroundColor: colors.blackWhite5,
    borderRadius: 12,
    padding: spacing.lg,
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressDetailLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  progressDetailValue: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
    borderColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
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
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitMethodLabel: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  splitMethodOptions: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  splitMethodOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 30,
  },
  splitMethodOptionTouchable: {
    width: '100%',
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitMethodOptionActive: {
    // backgroundColor handled by LinearGradient
  },
  splitMethodOptionText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  splitMethodOptionTextActive: {
    color: colors.black,
  },
  participantsContainer: {
    marginBottom: spacing.xl,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white10,
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
    marginLeft: spacing.md,
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
  },
  paymentStatusContainer: {
    marginTop: spacing.xs,
  },
  paymentStatusPaid: {
    color: colors.green,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  paymentStatusPartial: {
    color: colors.warning,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
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
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
  },
  confirmButton: {
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: colors.black,
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
  },
  createWalletButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    gap: spacing.md,
  },
  payButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  payButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: colors.black,
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
    backgroundColor: colors.white5,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.white80,
    borderStyle: 'dashed',
  },
  editableAmountText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  readOnlyAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.blackWhite5,
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
  modalSaveButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  modalSaveButtonTouchable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalHelperText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // Split button styles
  splitButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  splitButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  splitButtonText: {
    color: colors.black,
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
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  splitOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white5,
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
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.white10,
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
    backgroundColor: colors.white5,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedWalletLabel: {
    color: colors.white70,
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
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addWalletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addWalletContent: {
    flex: 1,
  },
  addWalletTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  addWalletDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  // Transfer icon image styles
  transferIconImage: {
    width: 50,
    height: 50,
  },
  // Modal back button styles
  modalBackButton: {
    padding: spacing.sm,
    zIndex: 1001,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalBackButtonIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  modalBackButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  // Apple slider styles
  appleSliderGradientBorder: {
    borderRadius: 999,
    padding: 2,
    marginBottom: spacing.lg,
    backgroundColor: colors.blackWhite5,
  },
  appleSliderContainer: {
    backgroundColor: colors.blackWhite5,
    borderRadius: 999,
    height: 60,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.green,

  },
  appleSliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    
  },
  appleSliderFillGradient: {
    flex: 1,
    borderRadius: 999,
  },
  appleSliderTrack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    
  },
  appleSliderText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  appleSliderThumb: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 54,
    height: 54,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  appleSliderThumbIcon: {
    width: 16,
    height: 16,
    tintColor: colors.black,
  },
  
  // Wallet Recap Modal Styles
  walletRecapModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    margin: spacing.lg,
    maxWidth: '90%',
    minWidth: '80%',
  },
  walletRecapTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  walletRecapSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  walletRecapContent: {
    marginBottom: spacing.xl,
  },
  walletInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  walletInfoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletAddressText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: spacing.sm,
  },
  copyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  copyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  privateKeyButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  privateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  walletRecapButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  walletRecapButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  walletRecapButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  
  // Private Key Modal Styles
  privateKeyModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    margin: spacing.lg,
    maxWidth: '90%',
    minWidth: '80%',
    maxHeight: '80%',
  },
  privateKeyModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  privateKeyModalSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  privateKeyDisplay: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  privateKeyText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  privateKeyWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  privateKeyWarningText: {
    fontSize: typography.fontSize.sm,
    color: '#ffc107',
    textAlign: 'center',
    lineHeight: 18,
  },
  privateKeyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.black,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.red,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  copyPrivateKeyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  copyPrivateKeyButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  closePrivateKeyButton: {
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closePrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  
  // Split Wallet Section Styles
  splitWalletSection: {
    marginBottom: spacing.lg,
  },
  splitWalletTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  splitWalletCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitWalletInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  splitWalletLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  splitWalletAddress: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  copyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.white80,
  },
  privateKeyButton: {
    backgroundColor: colors.white10,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  privateKeyButtonIcon: {
    width: 20,
    height: 20,
    objectFit: 'contain',
    marginRight: spacing.xs,
  },
  privateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});
