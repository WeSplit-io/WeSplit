import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,

  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.green,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
    marginLeft: spacing.xs,
  },
  addButtonIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },

  // Prominent Group Cards - Updated to match Dashboard design
  prominentGroupsContainer: {
    marginBottom: spacing.lg,
  },

  // Grid layout for prominent groups (horizontal scroll)
  prominentGroupsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  prominentGroupCard: {
    width: 280,
    borderRadius: spacing.lg,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  prominentGroupCardOwner: {
    backgroundColor: '#A5EA15',
  },

  // Background gradient for prominent cards
  prominentGroupCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: spacing.lg,
    backgroundColor: '#A5EA15',
  },

  // Gradient overlay for prominent cards
  prominentGroupCardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: spacing.lg,
  },

  // Header of prominent group card
  prominentGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  prominentGroupIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  prominentGroupIconSvg: {
    width: 20,
    height: 20,
    tintColor: colors.black,
  },

  prominentGroupAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  prominentUsdcLogo: {
    width: 20,
    height: 20,
  },

  prominentGroupName: {
    color: colors.black,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },

  prominentGroupRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: spacing.xs,
  },

  prominentGroupRoleIcon: {
    width: 14,
    height: 14,
  },

  prominentGroupRole: {
    color: colors.black,
    fontSize: 16,
    fontWeight: typography.fontWeight.normal,
  },

  prominentGroupAmount: {
    color: colors.black,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
  },

  prominentMemberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  prominentMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    marginRight: -spacing.xs,
    borderWidth: 2,
    borderColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },

  prominentMemberAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  prominentMemberAvatarText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },

  prominentMemberAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },

  prominentMemberAvatarMoreText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },

  prominentGroupArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },

  // Left prominent card (with special positioning)
  prominentGroupCardLeft: {
    marginRight: spacing.sm / 2,
  },

  // Right prominent card (with special positioning)
  prominentGroupCardRight: {
    marginLeft: spacing.sm / 2,
  },

  // Legacy prominent card styles (keeping for compatibility)
  prominentGroupInfo: {
    marginBottom: spacing.sm,
  },

  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green10,
    borderRadius: 16,
    marginHorizontal: spacing.screenPadding,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 4,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.green,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  filterButtonTextActive: {
    color: colors.black,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl * 3, // Add extra padding for navbar safety
  },

  // Regular Group Cards - Updated to match image design
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkCard,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.white50,
    padding: spacing.md,
  },

  // Left section of group card
  groupCardLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.sm,
  },

  groupCardLeftTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Right section of group card
  groupCardRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.xl,
    justifyContent: 'space-between',
  },

  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs,
  },

  // Member status row
  groupMemberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  groupMemberStatusText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.normal,
  },

  groupMemberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMemberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: colors.black,
    marginRight: -spacing.xs,
    borderWidth: 2,
    borderColor: colors.white50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupMemberAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 16,
    borderColor: colors.white50,
    borderWidth: 1,
  },
  groupMemberAvatarText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  groupMemberAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
    borderColor: colors.white50,
    borderWidth: 1,
  },
  groupMemberAvatarMoreText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },

  // Status indicators
  groupStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  groupStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groupStatusDotActive: {
    backgroundColor: colors.green,
  },
  groupStatusDotClosed: {
    backgroundColor: '#FF4D4F',
  },
  groupStatusText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },

  // Premium/Private icon
  groupPremiumIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPremiumText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },

  // Legacy activity indicator (keeping for compatibility)
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4F',
  },

  // Legacy styles (keeping for compatibility)
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  groupIcon: {
    width: 20,
    height: 20,
    tintColor: colors.textLight,
  },
  groupTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  groupSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  groupAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  groupStatus: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    objectFit: 'contain',
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createGroupButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
  },
  createGroupButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.black,
  },

  // Group member count style
  groupMemberCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  groupBalance: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  positiveBalance: {
    color: colors.green,
  },
  negativeBalance: {
    color: colors.red,
  },
}); 