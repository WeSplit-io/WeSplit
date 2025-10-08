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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl, // Add bottom padding for phone UI
  },
  // Main participant card styles (matching the design)
  mainParticipantCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginHorizontal: spacing.sm,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
  },
  participantNameContainer: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    bottom: spacing.lg,
    justifyContent: 'center',
  },
  participantName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    marginBottom: spacing.md,
  },
  participantId: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    transform: [{ rotate: '-90deg' }],
  },
  cardIcon: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  cardIconText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
  },
  // Bill summary styles
  billSummaryContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.lg,
    marginHorizontal: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  billSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  billSummaryIcon: {
    fontSize: typography.fontSize.md,
  },
  billSummaryTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    flex: 1,
    marginLeft: spacing.sm,
  },
  billSummaryDate: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotalLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  billTotalAmount: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Roulette container styles
  rouletteContainer: {
    height: 280,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden', // Hide cards that go out of bounds for cleaner look
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  rouletteCards: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 180, // Match card height
    justifyContent: 'flex-start', // Start from left for infinite effect
    width: '200%', // Wider to accommodate more cards
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0, 255, 0, 0.1)', // Temporary green background for debugging
  },
  rouletteCard: {
    width: 140,
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.xs,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexShrink: 0, // Prevent cards from shrinking
    alignSelf: 'center', // Center each card vertically
    borderWidth: 2, // Temporary border for debugging
    borderColor: 'yellow', // Temporary border color for debugging
  },
  selectedCard: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.5,
    elevation: 12,
  },
  // Roulette card content styles
  rouletteCardContent: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    bottom: spacing.lg,
    justifyContent: 'center',
  },
  rouletteCardName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    transform: [{ rotate: '-90deg' }],
    marginBottom: spacing.md,
  },
  rouletteCardId: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    transform: [{ rotate: '-90deg' }],
  },
  rouletteCardIcon: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  rouletteCardIconText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
  },
  // Green gradient for roulette cards
  rouletteCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: colors.green,
    opacity: 0.8,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: colors.green,
    opacity: 0.3,
  },
  centerIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  buttonContainer: {
    marginBottom: spacing.xxl,
    paddingBottom: spacing.lg, // Extra padding for phone UI elements
  },
  spinButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  spinButtonDisabled: {
    backgroundColor: colors.surface,
  },
  spinButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  spinButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
