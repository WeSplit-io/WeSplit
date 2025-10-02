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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl, // Add bottom padding for phone UI
    justifyContent: 'space-between',
    flexGrow: 1,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.xl,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: colors.green,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    color: colors.green,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  lockIconContainer: {
    marginBottom: spacing.md,
  },
  lockIcon: {
    fontSize: 32,
  },
  instructionsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  instructionsSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 20,
  },
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
    marginHorizontal: spacing.sm,
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
});
