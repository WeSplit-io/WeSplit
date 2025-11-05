import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120, // Space for NavBar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  
  // User Summary Card
  userSummaryCard: {
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  userSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userSummaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  userRankBadge: {
    backgroundColor: colors.brandGreen,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  userRankText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  userPointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  userPointsValue: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
  },
  userPointsLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    marginLeft: spacing.xs,
  },
  
  // Section Styles
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
  },
  
  // Quest Cards
  questsContainer: {
    gap: spacing.sm,
  },
  questCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  questCardCompleted: {
    borderColor: colors.brandGreen,
    opacity: 0.7,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  questIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questIncompleteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLightSecondary,
  },
  questDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 18,
  },
  questPoints: {
    alignItems: 'flex-end',
  },
  questPointsValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
  },
  questPointsValueCompleted: {
    color: colors.textLightSecondary,
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    lineHeight: 18,
  },
  
  // Leaderboard
  leaderboardContainer: {
    gap: spacing.xs,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  leaderboardEntryCurrent: {
    backgroundColor: colors.green10,
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  leaderboardNameCurrent: {
    color: colors.brandGreen,
    fontWeight: typography.fontWeight.semibold,
  },
  leaderboardYouLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.brandGreen,
    marginTop: 2,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
  },
  leaderboardPointsValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
  },
  leaderboardPointsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    marginTop: 2,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
  },
});

