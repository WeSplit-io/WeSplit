import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { GREEN } from '../screens/Dashboard/styles';

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
    paddingBottom: spacing.lg,
    borderRadius: 25,
    backgroundColor: colors.black,
    borderWidth: 0.5,
    borderColor: colors.white50,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 95,
  },

  // === SCROLL CONTENT ===
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'flex-end',
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
    color: colors.white70,
    marginTop: 2,
    textAlign: 'center',
  },
  navLabelActive: {
    color: colors.green,
  },

  // === SPECIAL BUTTON (CENTER GROUPS BUTTON) ===
  specialNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.green,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 5,
  },
  specialButtonImage: {
    width: 24,
    height: 24,
    tintColor: colors.black,
  },
  navIcon: {
    width: 40,
    height: 40,
    padding: 7,
    objectFit: 'contain',
    tintColor: colors.white70,
  },
  navIconActive: {
    tintColor: colors.green,
  },
}); 