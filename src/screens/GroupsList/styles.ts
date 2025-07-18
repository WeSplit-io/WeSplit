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
    paddingBottom: spacing.md,
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
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: '#A5EA15',
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#A5EA15',
    marginLeft: spacing.xs,
  },
  
  // Prominent Group Cards - Updated to match Dashboard design
  prominentGroupsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  prominentGroupCard: {
    flex: 1,
    borderRadius: spacing.lg,
    padding: 18,
    minHeight: 140,
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
    marginBottom: spacing.sm,
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
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  
  prominentGroupRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  
  prominentGroupRoleIcon: {
    marginRight: spacing.xs,
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
    bottom: 18,
    right: 18,
  },
  
  // Legacy prominent card styles (keeping for compatibility)
  prominentGroupInfo: {
    marginBottom: spacing.sm,
  },
  
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusLg,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#A5EA15',
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: '#212121',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  
  // Regular Group Cards
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  groupMemberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMemberAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.darkGray,
    marginRight: -spacing.xs,
    borderWidth: 1,
    borderColor: colors.darkCard,
  },
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
    paddingVertical: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
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
    borderRadius: spacing.radiusLg,
  },
  createGroupButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
}); 