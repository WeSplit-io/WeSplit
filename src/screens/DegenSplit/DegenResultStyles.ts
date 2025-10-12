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
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    alignItems: 'center',
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
    borderWidth: 3,
    borderColor: colors.red,
  },
  winnerAvatar: {
    borderColor: colors.green,
  },
  loserAvatar: {
    borderColor: colors.red,
  },
  avatarText: {
    fontSize: 48,
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
    backgroundColor: colors.surface,
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
  },
  twitterIcon: {
    width: 16,
    height: 16,
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
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.md,
    width: '100%',
  },
  // Bottom button container - Fixed at bottom
  bottomButtonContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    width: '100%',
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
    color: colors.textSecondary,
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
  claimButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
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
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
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
});
