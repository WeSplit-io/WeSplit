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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0, // Remove horizontal padding to match design
    paddingBottom: spacing.xxl, // Add bottom padding for phone UI
    justifyContent: 'space-between',
    flexGrow: 1,
  },
  billCard: {
    // Ticket-style card with semi-circular notches
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    // Create ticket effect with pseudo-elements using border radius
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
  billIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBillLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  totalBillAmount: {
    color: colors.white,
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
    backgroundColor: colors.surface, // Dark gray background
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 8,
    borderColor: colors.white70, // Light gray border for the filled portion
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: colors.white70, // Light gray for progress
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.white70,
    transform: [{ rotate: '-90deg' }], // Start from top
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
  // Removed instructions container as it's not in the design
  slideContainer: {
    marginBottom: spacing.xxl,
    paddingBottom: spacing.lg, // Extra padding for phone UI elements
  },
  slideButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    // Add gradient effect shadow
    shadowColor: colors.green,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  slideButtonDisabled: {
    backgroundColor: colors.surface,
  },
  slideButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  slideButtonTextDisabled: {
    color: colors.textSecondary,
  },
  slideButtonArrow: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
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
    // Remove background to match design
    textAlign: 'right',
  },
  lockedIndicator: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  lockedIndicatorText: {
    color: colors.black,
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: Math.max(spacing.xl, 34), // Account for safe area
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
  },
  modalLockIcon: {
    fontSize: 48,
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
});
