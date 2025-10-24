import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
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
    marginVertical: spacing.xl,
  },
  destinationItemContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
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
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.md,
  },
  destinationIcon: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.xxl,
    backgroundColor: colors.white10,
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
  emptyCategoryText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  destinationIconImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  kastCardIcon: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.xxl,
    marginRight: spacing.md,
    resizeMode: 'contain',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: '#121D1F',
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
    zIndex: 1000,
    minWidth: 110,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  dropdownItemIcon: {
    width: 16,
    height: 16,
    marginRight: spacing.sm,
    resizeMode: 'contain',
  },
  dropdownItemText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
  },
  globalEmptyState: {
    alignItems: 'center',
    paddingTop: 150,
    paddingHorizontal: spacing.md,
  },
  globalEmptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  globalEmptyStateIconImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  globalEmptyStateTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  globalEmptyStateSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: spacing.lg,
    marginBottom: spacing.xl,
  },
  globalEmptyStateButton: {
    backgroundColor: colors.brandGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    width: '100%',
  },
  globalEmptyStateButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
});
