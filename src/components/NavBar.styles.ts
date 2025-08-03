import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography } from '../theme';
import platformUtils from '../utils/platformUtils';

/**
 * =======================================================================
 * NAVBAR COMPONENT STYLES - HARMONIZED FOR iOS & ANDROID
 * =======================================================================
 * Bottom navigation bar styles optimized for consistent display across platforms
 * 
 * DESIGN NOTES:
 * - Platform-specific safe area handling
 * - Consistent shadow rendering across platforms
 * - Optimized spacing and alignment
 * - Cross-platform font handling
 * - Consistent icon sizes and alignment
 * - Bottom-aligned icons with text on same line
 * 
 * FIGMA REFERENCE: Navigation bar component
 * =======================================================================
 */

export const styles = StyleSheet.create({
  // === MAIN CONTAINER ===
  container: {
    paddingBottom: platformUtils.navBar.paddingBottom,
    borderRadius: 25,
    backgroundColor: colors.black,
    borderWidth: 0.5,
    borderColor: colors.white50,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: platformUtils.navBar.height,
    // Platform-specific shadow handling
    ...platformUtils.shadows.large,
  },

  // === SCROLL CONTENT ===
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'flex-end', // Align items to bottom
    justifyContent: 'space-around',
    flexDirection: 'row',
    flex: 1,
    paddingTop: platformUtils.navBar.contentPaddingTop,
    paddingBottom: platformUtils.navBar.contentPaddingBottom,
  },

  // === NAV ITEMS ===
  navItem: {
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to bottom
    minWidth: 72,
    flex: 1,
    height: '100%', // Take full height
    paddingVertical: 0,
  },

  // === NAV LABELS ===
  navLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: platformUtils.navBar.labelMarginTop,
    textAlign: 'center',
    fontFamily: platformUtils.typography.fontFamily,
    fontWeight: '500' as const,
    letterSpacing: platformUtils.typography.letterSpacing.small,
    lineHeight: platformUtils.typography.lineHeight.navLabel,
  },
  navLabelActive: {
    color: colors.green,
    fontWeight: '600' as const,
  },

  // === SPECIAL BUTTON (CENTER GROUPS BUTTON) ===
  specialNavItem: {
    alignItems: 'center',
    justifyContent: 'flex-end', // Align to bottom like other items
    height: '100%', // Take full height
    marginBottom: 0,
  },
  specialButton: {
    width: platformUtils.navBar.specialButtonSize,
    height: platformUtils.navBar.specialButtonSize,
    borderRadius: platformUtils.navBar.specialButtonSize / 2,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    // Platform-specific shadow for special button
    ...Platform.select({
      ios: {
        shadowColor: colors.green,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
    marginBottom: 0, // Remove margin for better alignment
  },
  specialButtonImage: {
    width: platformUtils.iconSizes.specialButtonIcon,
    height: platformUtils.iconSizes.specialButtonIcon,
    tintColor: colors.black,
    resizeMode: 'contain' as const,
  },
  navIcon: {
    width: platformUtils.iconSizes.navIcon,
    height: platformUtils.iconSizes.navIcon,
    tintColor: colors.white70,
    resizeMode: 'contain' as const,
    // Remove padding to ensure consistent sizing
  },
  navIconActive: {
    tintColor: colors.green,
  },
}); 