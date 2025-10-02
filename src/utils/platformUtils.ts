import { Platform } from 'react-native';

/**
 * Platform-specific utilities for consistent UI across iOS and Android
 */

export const platformUtils = {
  // === PLATFORM DETECTION ===
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  // === NAVIGATION BAR SPECIFIC ===
  navBar: {
    height: Platform.OS === 'ios' ? 80 : 75,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    iconSize: 28, // Consistent icon size across platforms
    specialButtonSize: 54, // Smaller size to fit within NavBar
    contentPaddingTop: 0, // No top padding for bottom alignment
    contentPaddingBottom: 8, // Bottom padding for text spacing
    labelMarginTop: 6, // Fixed margin for consistent spacing
    itemHeight: 60, // Fixed height for all nav items
  },

  // === TYPOGRAPHY ===
  typography: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: {
      regular: Platform.OS === 'ios' ? '400' : '400',
      medium: Platform.OS === 'ios' ? '500' : '500',
      semibold: Platform.OS === 'ios' ? '600' : '600',
      bold: Platform.OS === 'ios' ? '700' : '700',
    },
    letterSpacing: {
      small: Platform.OS === 'ios' ? 0.25 : 0.2,
      medium: Platform.OS === 'ios' ? 0.5 : 0.4,
    },
    lineHeight: {
      navLabel: 16, // Fixed line height for nav labels
    },
  },

  // === SHADOWS ===
  shadows: {
    small: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    large: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // === TOUCH FEEDBACK ===
  touchFeedback: {
    activeOpacity: Platform.OS === 'ios' ? 0.7 : 0.8,
    underlayColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
  },

  // === SAFE AREA ===
  safeArea: {
    bottom: Platform.OS === 'ios' ? 34 : 0,
    top: Platform.OS === 'ios' ? 44 : 0,
  },

  // === BORDER RADIUS ===
  borderRadius: {
    small: Platform.OS === 'ios' ? 6 : 4,
    medium: Platform.OS === 'ios' ? 8 : 6,
    large: Platform.OS === 'ios' ? 12 : 8,
    xlarge: Platform.OS === 'ios' ? 16 : 12,
  },

  // === SPACING ADJUSTMENTS ===
  spacing: {
    xs: Platform.OS === 'ios' ? 4 : 3,
    sm: Platform.OS === 'ios' ? 8 : 6,
    md: Platform.OS === 'ios' ? 16 : 14,
    lg: Platform.OS === 'ios' ? 24 : 20,
    xl: Platform.OS === 'ios' ? 32 : 28,
  },

  // === ICON SIZES ===
  iconSizes: {
    navIcon: 28, // Consistent nav icon size
    specialButtonIcon: 24, // Smaller icon for special button
    small: 16,
    medium: 20,
    large: 32,
    xlarge: 40,
  },
};

export default platformUtils; 