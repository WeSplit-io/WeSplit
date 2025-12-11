import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  backButtonIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    paddingTop: 50,
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  avatarContainer: {
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white50,

  },
  winnerAvatar: {
    borderColor: colors.green,
    shadowColor: colors.green,
  },
  loserAvatar: {
    borderColor: colors.red,
    shadowColor: colors.red,
  },
  avatarText: {
    fontSize: 48,
    color: colors.white,
    fontWeight: '700',
  },
  resultTitleContainer: {
    marginBottom: spacing.xl,
  },
  resultTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.red,
    width: '80%',
  },
  winnerAmountContainer: {
    borderColor: colors.green,
    backgroundColor: colors.greenBlue20,
  },
  loserAmountContainer: {
    borderColor: colors.red,
    backgroundColor: colors.red20,
  },
  amountText: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  amountLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  amountValue: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  messageText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  luckMessage: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  shareButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  twitterIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  paymentOptionsContainer: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg, // Extra padding for phone UI elements
  },
  paymentButton: {
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  settlePaymentButton: {
    backgroundColor: colors.surface,
  },
  payWithKastButton: {
    backgroundColor: colors.green,
  },
  paymentButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  settlePaymentButtonText: {
    color: colors.white,
  },
  payWithKastButtonText: {
    color: colors.white,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  // Action buttons container
  actionButtonsContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  // New design action buttons
  splitWalletButton: {
    width: '100%',
  },
  primaryActionButton: {
    width: '100%',
  },
  paymentOptionButtonDisabled: {
    opacity: 0.5,
  },
  paymentOptionWarning: {
    marginTop: spacing.xs,
    color: colors.red,
    fontSize: typography.fontSize.sm,
  },
  transferInfoBanner: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferInfoText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentInfoContainer: {
    width: '100%',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  paymentInfoText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  missingDestinationBanner: {
    width: '100%',
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.red,
    marginTop: spacing.lg,
  },
  missingDestinationTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  missingDestinationText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkCardButton: {
    marginTop: spacing.md,
  },
  selectedCardContainer: {
    width: '100%',
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white50,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  selectedCardLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedCardName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  selectedCardMeta: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  manageCardsButton: {
    marginTop: spacing.sm,
  },
  cardSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white50,
    marginBottom: spacing.sm,
  },
  cardSelectionItemSelected: {
    backgroundColor: colors.green + '20',
    borderColor: colors.green,
  },
  cardSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardSelectionInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  cardSelectionName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  cardSelectionNameSelected: {
    color: colors.green,
  },
  cardSelectionAddress: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  claimButtonNew: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
  },
  claimButtonNewText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  // Bottom button container - Fixed at bottom
  bottomActionButtonsContainer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.black,
  },
  actionButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: colors.white70,
  },
  // Settle button styles
  settleButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  // KAST button styles
  kastButton: {
    backgroundColor: colors.green,
  },
  kastButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  // Claim button styles
  claimButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonGradient: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Pay button styles
  payButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonGradient: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Wallet info styles
  walletInfoContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  walletInfoTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  walletInfoCard: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  walletAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  walletAddressLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginRight: spacing.sm,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletAddressText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    flex: 1,
  },
  copyIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white70,
    marginLeft: spacing.sm,
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
    borderRadius: 20,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white50,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalClaimIcon: {
    fontSize: 48,
  },
  // Payment options modal styles
  paymentOptionsModalContainer: {
    marginBottom: spacing.xl,
  },
  paymentOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  paymentOptionIconText: {
    fontSize: typography.fontSize.lg,
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  paymentOptionDescription: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  paymentOptionText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  paymentOptionArrow: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  // Modal buttons
  modalClaimButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalClaimButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  modalCancelButton: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
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
    borderColor: colors.white10,
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
    backgroundColor: colors.white10,
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
  // Apple slider styles (adapted from DegenLockScreen)
  appleSliderGradientBorder: {
    borderRadius: 999,
    padding: 2,
    marginBottom: spacing.lg,
  },
  appleSliderContainer: {
    backgroundColor: colors.blackWhite5,
    borderRadius: 999,
    height: 60,
    overflow: 'hidden',
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
    width: 56,
    height: 56,
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
    tintColor: colors.white,
  },
  // Private key modal styles
  privateKeyModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.lg,
    maxHeight: '80%',
  },
  privateKeyModalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  privateKeyModalSubtitle: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  // Wallet address section in modal
  walletAddressSection: {
    marginBottom: spacing.lg,
  },
  walletAddressLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  // Private key section in modal
  privateKeySection: {
    marginBottom: spacing.lg,
  },
  privateKeyLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  privateKeyDisplay: {
    backgroundColor: colors.white5,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privateKeyText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  privateKeyWarning: {
    backgroundColor: colors.red20,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.red,
  },
  privateKeyWarningText: {
    color: colors.red,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  privateKeyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  copyPrivateKeyButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  copyPrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  closePrivateKeyButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closePrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  // Private key button styles (for wallet info section)
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
  claimedStatusContainer: {
    backgroundColor: colors.green + '20',
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  claimedStatusText: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  claimedStatusSubtext: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
});
