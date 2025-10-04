import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: 16,
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingHorizontal,
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  destinationIcon: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.xxl,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  destinationIconText: {
    fontSize: typography.fontSize.md,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  destinationAddress: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  destinationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
  },
  actionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIconText: {
    fontSize: 32,
  },
  emptyStateTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
});
