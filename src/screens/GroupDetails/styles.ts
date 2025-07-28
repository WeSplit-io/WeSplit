import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    padding: spacing.sm,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  headerIcon: {
    padding: spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  
  // Group Info Section
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  groupName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },

  // Total Spending Card - Updated for new design
  totalSpendingCard: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    marginTop: 30,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    padding: spacing.lg,
    position: 'relative',
  },
  activeStatusContainer: {
    position: 'absolute',
    top: -30,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  activeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A5EA15',
    marginRight: spacing.xs,
  },
  activeStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  groupIconBadgeContainer: {
    position: 'absolute',
    top: -25,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  groupIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.green,
    
  },
  eventName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  spendingProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingInfo: {
    flex: 1,
  },
  spendingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  spendingAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spendingAmountIcon: {
    width: 24,
    height: 24,
  },
  spendingAmount: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginLeft: spacing.xs,
  },
  circularProgressContainer: {
    alignItems: 'center',
  },
  circularProgress: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  circularProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: colors.black,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  circularProgressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  circularProgressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.black,
    textAlign: 'center',
  },

  // Balance Cards
  balanceCards: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  
  // Progress Bar Styles
  progressBarContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    position: 'relative',
  },
  progressBarFillGreen: {
    height: '100%',
    backgroundColor: '#A5EA15',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  progressBarFillRed: {
    height: '100%',
    backgroundColor: '#FF4D4F',
    borderRadius: 4,
    position: 'absolute',
  },
  progressBarThumb: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    backgroundColor: '#FFF',
    borderRadius: 6,
    transform: [{ translateX: -6 }],
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#A5EA15',
  },
  tabText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#A5EA15',
  },

  // Tab Content
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  
  // Expenses Content
  expensesContent: {
    paddingBottom: spacing.xl,
  },
  todayLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expenseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkGray,
    marginRight: spacing.md,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.xs / 2,
  },
  expenseCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  expenseAmounts: {
    alignItems: 'flex-end',
  },
  expenseUserStatus: {
    color: '#A89B9B',
    fontSize: 10,
    textAlign: 'right',
  },
  expenseUserAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  positiveAmount: {
    color: '#A5EA15',
  },
  negativeAmount: {
    color: '#FF4D4F',
  },

  // Settleup Content
  settleupContent: {
    paddingBottom: spacing.xl,
  },
  settlementCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  settlementTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  settlementSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  settlementActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  settleButton: {
    flex: 1,
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  settleButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: '#212121',
  },
  settledButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settledButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  settledState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  settledText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },

  // Add Expense Button
  addExpenseButton: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  addExpenseButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: '#212121',
  },

  // Empty States
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyExpensesText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },

  // Settleup specific styles
  settlementAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkGray,
    marginRight: spacing.md,
  },
  settlementInfo: {
    flex: 1,
  },

  // Balance section
  balanceSection: {
    marginTop: spacing.lg,
  },
  balanceSectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  memberBalanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberBalanceAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.darkGray,
    marginRight: spacing.md,
  },
  memberBalanceInfo: {
    flex: 1,
  },
  memberBalanceName: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
  },
  memberBalanceAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },

  // Error and Empty States
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyStateButtonText: {
    color: '#212121',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  errorTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 