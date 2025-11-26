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
  content: {
    flex: 1,
    paddingHorizontal: 0, // No horizontal padding for full screen
    paddingBottom: spacing.sm, // Reduced bottom padding since button is now fixed
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
    color: colors.white70,
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
    backgroundColor: colors.white5,
    borderRadius: 20,
    padding: spacing.lg,
    marginTop: spacing.md, // Reduced top margin since it's now below roulette
    marginBottom: spacing.xl,
    gap: spacing.md,
    position: 'relative',
  },
  billSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  billSummaryIcon: {
    fontSize: typography.fontSize.md,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
  billSummaryIconImage: {
    width: 16,
    height: 16,
    tintColor: colors.black,
  },
  billSummaryTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    flex: 1,
    marginLeft: spacing.sm,
  },
  billSummaryDate: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotalLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
  },
  billTotalAmount: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  // Roulette container styles
  rouletteContainer: {
    height: 400, // Fixed height for roulette area
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
    height: 400, // Match container height
    justifyContent: 'center', // Center the cards
    width: '100%', // Full width
    paddingHorizontal: 0, // No horizontal padding
    backgroundColor: 'transparent',
  },
  rouletteCard: {
    width: 400, // Adjusted width for better fit
    height: 300, // Adjusted height
    backgroundColor: 'transparent',
    borderRadius: 20,
    marginHorizontal: -30, // Negative margin to bring cards closer
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    flexShrink: 0, // Prevent cards from shrinking
    alignSelf: 'center', // Center each card vertically
    transform: [{ rotate: '90deg' }], // Rotate cards 90 degrees
    borderWidth: 12,
    borderColor: colors.white10,
  },
  rouletteCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  rouletteCardHeader: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    flexDirection: 'column',
    height: '100%',
  },
  rouletteCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  selectedCard: {
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.5,
    elevation: 12,
  },
  // Roulette card content styles - removed duplicate
  rouletteCardLogo: {
    width: 24,
    height: 24,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  rouletteCardName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  rouletteCardHash: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    textAlign: 'left',
    opacity: 0.8,
    alignSelf: 'flex-start',
  },
  tiltedCard: {
    opacity: 0.6,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    zIndex: 10,
  },
  selectionText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
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
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingTop: spacing.md,
    backgroundColor: colors.black,
  },
  spinButtonGradient: {
    borderRadius: 16,
    marginHorizontal: spacing.sm,
  },
  spinButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  spinButtonDisabled: {
    opacity: 0.5,
  },
  spinButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  spinButtonTextDisabled: {
    color: colors.white50,
  },
  billCardDotLeft: {
    width: 28,
    height: 28,
    borderRadius: 20,
    marginRight: spacing.xs,
    position: 'absolute',
    bottom: '55%',
    left: -16,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  billCardDotRight: {
    width: 28,
    height: 28,
    borderRadius: 20,
    marginLeft: spacing.xs,
    position: 'absolute',
    bottom: '55%',
    right: -16,
    backgroundColor: colors.black,
    zIndex: 1,
  },
});
