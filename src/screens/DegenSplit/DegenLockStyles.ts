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
    paddingHorizontal: spacing.md,
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
    marginHorizontal: spacing.md,
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
  // Lock button at bottom of screen
  lockButtonContainer: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.black,
    marginTop: 'auto', // Push to bottom
  },
  lockButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    // Add gradient effect shadow
    shadowColor: colors.green,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  lockButtonDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  lockButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  lockButtonTextDisabled: {
    color: colors.textSecondary,
  },
  slideProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colors.white,
    opacity: 0.3,
  },

  // === ROULETTE BUTTON STYLES ===
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
    paddingHorizontal: spacing.md,
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
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl, // Account for safe area
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: spacing.lg,
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLockIcon: {
    width: 28,
    height: 28,
    tintColor: colors.white,
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
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

});
