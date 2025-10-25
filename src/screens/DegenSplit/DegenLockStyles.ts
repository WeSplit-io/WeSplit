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
  },
  contentContainer: {
    paddingHorizontal: 0, // Remove horizontal padding to match design
    flexGrow: 1,
  },
  billCard: {
    // Ticket-style card with semi-circular notches
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.md,
    // Create ticket effect with pseudo-elements using border radius
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: spacing.md,
    // Add gradient effect
    shadowColor: colors.green,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  billCardDotLeft: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginRight: spacing.xs,
    position: 'absolute',
    bottom: '50%',
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
    bottom: '50%',
    right: -15,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  billIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: colors.black,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  billIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  billTitleContainer: {
    flex: 1,
  },
  billTitle: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  billDate: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBillLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  totalBillAmount: {
    color: colors.black,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
    borderColor: colors.white10, // Light gray background border
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
    borderColor: 'transparent', // All borders start transparent
    borderTopColor: 'transparent', // Will be animated
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '400',
    textAlign: 'center',
  },
  // === Lock button at bottom of screen ================================
  lockButtonContainer: {
    marginTop: 'auto',
    width: '100%',
  },

  slideProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colors.white,
    opacity: 0.3,
  },

  // === ROULETTE BUTTON STYLES ================================
  rouletteContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rouletteButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primaryGreen,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rouletteButtonDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  rouletteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rouletteButtonIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  rouletteButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  rouletteButtonTextDisabled: {
    color: colors.textSecondary,
  },
  rouletteStatusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rouletteStatusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  // Participants list styles
  participantsContainer: {
    marginVertical: spacing.lg,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.md,
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
    // Remove background to match design
    textAlign: 'right',
  },
  lockedIndicator: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  lockedIndicatorText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  unlockedIndicator: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.white10,
  },
  unlockedIndicatorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  /** ================================ Modal Styles ================================ */

  modalIconContainer: {
    marginBottom: spacing.lg,
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: 80,
    height: 80,
  },

  modalSlideButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  modalSlideButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSlideButtonIcon: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  modalSlideButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  
  // AppleSlider styles
  appleSliderGradientBorder: {
    borderRadius: 999,
    padding: 3,
    width: '100%',
  },
  appleSliderContainer: {
    borderRadius: 999,
    backgroundColor: colors.blackWhite5,
    overflow: 'hidden',
    position: 'relative',
  },
  appleSliderTrack: {
    height: 60,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  appleSliderText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '500',
    textAlign: 'center',
    zIndex: 1,
  },
  appleSliderThumb: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  appleSliderThumbIcon: {
    width: 20,
    height: 20,
    tintColor: colors.black,
  },

  // Wallet Recap Modal Styles
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
    padding: spacing.md,
  },
  walletRecapModal: {
    backgroundColor: colors.blackWhite5,
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
    backgroundColor: colors.white5,
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
    gap: spacing.sm,
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
    backgroundColor: colors.blackWhite5,
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
    padding: spacing.md,
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
  copyPrivateKeyButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  copyPrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  closePrivateKeyButton: {
    backgroundColor: colors.white5,
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
    marginVertical: spacing.lg,
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
    padding: spacing.md,
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
  privateKeyButton: {
    backgroundColor: colors.white10,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
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

  // Shared Private Key Access Styles
  sharedAccessSection: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white5,
    borderRadius: 12,
  },
  sharedAccessTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sharedAccessSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  participantsList: {
    gap: spacing.sm,
  },
  participantAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 8,
    padding: spacing.md,
  },
  participantAccessAvatar: {
    marginRight: spacing.md,
  },
  participantAccessInfo: {
    flex: 1,
  },
  participantAccessName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  participantAccessStatus: {
    color: colors.green,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },

});
