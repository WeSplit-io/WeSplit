import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.textLight,
  },
  settleButton: {
    padding: spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  groupInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  groupName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  groupDescription: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  emptyBalances: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyBalancesText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyBalancesSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  backToGroupButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backToGroupButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.darkBackground,
    marginLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
  },
  backToDashboardButton: {
    backgroundColor: colors.textLightSecondary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backToDashboardButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.darkBackground,
    marginLeft: spacing.sm,
  },
}); 