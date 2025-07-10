import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

/**
 * =======================================================================
 * NAVBAR COMPONENT STYLES
 * =======================================================================
 * Bottom navigation bar styles for consistent navigation throughout the app
 * 
 * DESIGN NOTES:
 * - Fixed bottom positioning with dark background
 * - Special center button with green circular background
 * - Active state indicators with green color
 * - Responsive layout with equal spacing
 * 
 * FIGMA REFERENCE: Navigation bar component
 * =======================================================================
 */

export const styles = StyleSheet.create({
  // === MAIN CONTAINER ===
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.darkCard,
    borderTopWidth: 1,
    borderTopColor: colors.darkBorder,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },

  // === SCROLL CONTENT ===
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
    flex: 1,
  },

  // === NAV ITEMS ===
  navItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minWidth: 72,
    flex: 1,
  },

  // === NAV LABELS ===
  navLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  navLabelActive: {
    color: colors.brandGreen,
  },

  // === SPECIAL BUTTON (CENTER ADD BUTTON) ===
  specialNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 