import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default StyleSheet.create({
  // Header - identique à Send
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: 20,
    height: 20,
  },
  headerTitle: {
    ...typography.textStyles.h6,
    color: colors.white,
  },
  placeholder: {
    width: spacing.xxl + spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  // Tab Container - identique à Notifications
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: 5,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  activeTabButtonText: {
    color: colors.black,
  },
  transactionsList: {
    paddingTop: 8,
  },
  // Styles pour les transactions de groupes (identiques au Dashboard)
  requestItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  transactionAvatarNew: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGreen + '10',
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconNew: {
    width: 24,
    height: 24,
    tintColor: colors.white,
  },
  requestContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  requestSenderName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs / 2,
  },
  requestMessageWithAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },
  requestAmountGreen: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  requestSource: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
  },
  // Styles pour les transactions individuelles (ancien style)
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white5,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionIconContainerIncome: {
    backgroundColor: colors.white5,
  },
  transactionIcon: {
    width: 24,
    height: 24,
  },
  transactionIconIncome: {
    tintColor: colors.darkBackground,
  },
  transactionContent: {
    flex: 1,
    marginRight: 16,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 10,
  },
  transactionSource: {
    fontSize: 12,
    color: colors.white70,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionAmountIncome: {
    color: colors.primaryGreen,
  },
  transactionAmountExpense: {
    color: colors.textLight,
  },
  transactionTime: {
    fontSize: 12,
    color: colors.textLightSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textLightSecondary,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateImage: {
    height: 160,
    marginBottom: spacing.xl,
    objectFit: 'contain',
  },
  emptyStateCards: {
    position: 'relative',
    marginBottom: 32,
  },
  emptyStateCard1: {
    width: 120,
    height: 80,
    backgroundColor: colors.primaryGreen,
    opacity: 0.3,
    borderRadius: 8,
    transform: [{ rotate: '-15deg' }],
  },
  emptyStateCard2: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 120,
    height: 80,
    backgroundColor: colors.primaryGreen,
    opacity: 0.2,
    borderRadius: 8,
    transform: [{ rotate: '15deg' }],
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.textLightSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 