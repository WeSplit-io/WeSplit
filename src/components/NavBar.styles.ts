import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography } from '../theme';
import platformUtils from '../utils/core/platformUtils';

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
    paddingBottom: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#121D1F',
    borderWidth: 0.5,
    borderColor: colors.white50,
    position: 'absolute',
    left: spacing.md, // Float: add horizontal insets
    right: spacing.md, // Float: add horizontal insets
    bottom: 20, // Lift from bottom for floating effect
    height: platformUtils.navBar.height,
    zIndex: 9999, // Maximum layer priority
    elevation: 9999, // Maximum Android elevation
    width: undefined, // Prevent width inheritance
    top: undefined, // Explicitly undefined to prevent layout issues
    // Platform-specific shadow handling
    ...platformUtils.shadows.large,
  },

  // === SCROLL CONTENT ===
  scrollContent: {
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end', // Align items to bottom
    justifyContent: 'space-around',
    flexDirection: 'row',
    flex: 1,
    paddingTop: platformUtils.navBar.contentPaddingTop,
    paddingBottom: spacing.sm,
  },

  // === NAV ITEMS ===
  navItem: {
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to bottom
    minWidth: 72,
    flex: 1,
    height: '100%', // Take full height
    paddingVertical: 0,
    position: 'relative', // For top indicator
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
    color: colors.greenBlue,
    fontWeight: '600' as const,
  },

  // === ACTIVE TOP INDICATOR ===
  topIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    width: 35,
    borderRadius: 2,
    // backgroundColor removed in favor of LinearGradient in component
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
    justifyContent: 'center',
    alignItems: 'center',
    // Custom drop shadow for special button
    ...Platform.select({
      ios: {
        shadowColor: '#A5EA15', // rgba(165, 234, 21, 1)
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.2,
        shadowRadius: 29.808,
      },
      android: {
        elevation: 8, // Higher elevation for stronger shadow effect
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
    tintColor: colors.greenBlue,
  },
}); 