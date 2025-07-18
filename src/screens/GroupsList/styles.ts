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
  
  // Prominent Group Cards
  prominentGroupsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  prominentGroupCard: {
    flex: 1,
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prominentGroupCardOwner: {
    backgroundColor: '#A5EA15',
  },
  prominentGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  prominentGroupInfo: {
    marginBottom: spacing.sm,
  },
  prominentGroupName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  prominentGroupRole: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  prominentGroupAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  prominentMemberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prominentMemberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.darkGray,
    marginRight: -spacing.xs,
    borderWidth: 1,
    borderColor: colors.darkCard,
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
  groupHeaderInfo: {
    flex: 1,
  },
  groupDate: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: '#FFF',
  },
  spendingSection: {
    marginBottom: spacing.md,
  },
  spendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  spendingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  spendingAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  balanceAmount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#FF4D4F',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.darkGray,
    marginRight: -spacing.xs,
    borderWidth: 2,
    borderColor: colors.darkCard,
  },
  memberAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  memberAvatarMoreText: {
    fontSize: typography.fontSize.tiny,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  settleButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusSm,
  },
  settleButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#212121',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2, // 96
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
  createGroupButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
  },
  createGroupButtonText: {
    color: '#212121',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 