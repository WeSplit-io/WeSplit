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
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
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
  groupIcon: {
    width: 24,
    height: 24,
    tintColor: colors.textLight,
  },
  groupName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },

  // Total Spending Card
  totalSpendingCard: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  spendingLabel: {
    fontSize: typography.fontSize.sm,
    color: '#212121',
  },
  statusBadge: {
    backgroundColor: '#FF4D4F',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: '#FFF',
  },
  spendingAmount: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: '#212121',
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
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
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
  expenseLentAmount: {
    fontSize: typography.fontSize.sm,
    color: '#A5EA15',
    marginBottom: spacing.xs / 2,
  },
  expenseOwedAmount: {
    fontSize: typography.fontSize.sm,
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
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A5EA15',
    borderRadius: 4,
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
  recentExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backToDashboardButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  expensesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 16,
  },
  expenseCard: {
    backgroundColor: '#212121',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseDescription: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  expenseAmount: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expensePayer: {
    color: '#A89B9B',
    fontSize: 14,
    fontWeight: '400',
  },
  expenseDate: {
    color: '#A89B9B',
    fontSize: 12,
    fontWeight: '400',
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyExpensesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyExpensesSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyStateButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  editText: {
    color: '#A5EA15',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  membersSection: {
    marginBottom: 24,
  },
  memberCard: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberEmail: {
    color: '#A89B9B',
    fontSize: 12,
  },
  balanceSection: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
  },
  positiveBalance: {
    color: '#A5EA15',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  negativeBalance: {
    color: '#FF4D4F',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settledBalance: {
    color: '#A89B9B',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  currencyBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  currencyDetail: {
    color: '#A89B9B',
    fontSize: 11,
    fontWeight: '400',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  payButton: {
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  payButtonText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  requestButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  requestButtonText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  requestSentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(165, 234, 21, 0.2)',
    gap: 4,
  },
  requestSentText: {
    color: '#A5EA15',
    fontSize: 12,
    fontWeight: '600',
  },
  walletSection: {
    marginBottom: 24,
  },
  groupWalletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  walletBalance: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletAddress: {
    color: '#A89B9B',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletActionButton: {
    flex: 1,
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  settleButton: {
    backgroundColor: '#FF6B35',
  },
  walletActionText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '600',
  },
  noWalletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderStyle: 'dashed',
  },
  noWalletText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  noWalletSubtext: {
    color: '#A89B9B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createWalletButton: {
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  createWalletText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  groupInfoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  totalSpendingCard: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  totalSpendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalSpendingLabel: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '500',
  },
  totalSpendingAmount: {
    color: '#212121',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#FF4D4F',
  },
  statusPaid: {
    backgroundColor: '#52C41A',
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
  },
  balanceCardLabel: {
    color: '#A89B9B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceCardAmount: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#A5EA15',
  },
  tabText: {
    color: '#A89B9B',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#A5EA15',
  },
  expensesContent: {
    paddingHorizontal: 20,
  },
  dateHeader: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  expenseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseAvatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseInfo: {
    flex: 1,
  },
  expensePayerInfo: {
    color: '#A89B9B',
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmountInfo: {
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
  settleUpContent: {
    paddingHorizontal: 20,
  },
  settleUpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  balanceText: {
    color: '#A89B9B',
    fontSize: 12,
    marginTop: 2,
  },
  settleButtonText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  addExpenseButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  addExpenseButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Additional styles for the new GroupDetailsScreen
  content: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryCardTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  summaryCardAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  summaryCardSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  oweCard: {
    borderLeftColor: '#FF6B6B',
    borderLeftWidth: 4,
  },
  paidCard: {
    borderLeftColor: '#4ECDC4',
    borderLeftWidth: 4,
  },
  oweAmount: {
    color: '#FF6B6B',
  },
  paidAmount: {
    color: '#4ECDC4',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  expensesContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  settleUpContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  expenseAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  expensePaidBy: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  expenseDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  balanceItem: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  balanceUserName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  balanceAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  balanceStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  settleUpButton: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  settleUpButtonText: {
    color: '#212121',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorButton: {
    backgroundColor: '#A5EA15',
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorButtonText: {
    color: '#212121',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
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
}); 