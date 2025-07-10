import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * =======================================================================
 * GROUP CARD COMPONENT STYLES
 * =======================================================================
 * Card component styles for displaying group information in lists
 * 
 * DESIGN NOTES:
 * - Dark card background with white border
 * - Category-based color coding for icons
 * - Balance status indicators with conditional colors
 * - Responsive layout with proper spacing
 * 
 * FIGMA REFERENCE: Group card component
 * =======================================================================
 */

export const styles = StyleSheet.create({
  // === MAIN CARD CONTAINER ===
  card: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.md,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },

  // === HEADER SECTION ===
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  // === ICON CONTAINER ===
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },

  // === GROUP INFO ===
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textGray,
  },

  // === MENU BUTTON ===
  menuButton: {
    padding: spacing.xs,
  },

  // === AMOUNT SECTION ===
  amountSection: {
    marginBottom: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textGray,
    fontWeight: typography.fontWeight.medium,
  },
  totalAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },

  // === BALANCE ROW ===
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textGray,
    fontWeight: typography.fontWeight.medium,
  },
  userBalance: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // === FOOTER SECTION ===
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: spacing.borderWidthThin,
    borderTopColor: colors.surfaceTertiary,
    paddingTop: spacing.xs,
  },
  lastActivity: {
    fontSize: typography.fontSize.xs,
    color: colors.textGray,
  },

  // === STATUS INDICATOR ===
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    color: colors.textGray,
    fontWeight: typography.fontWeight.medium,
  },
}); 