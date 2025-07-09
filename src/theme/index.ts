// === DESIGN TOKEN EXPORTS ===
export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';

// === THEME UTILITIES ===
// Helper functions for creating consistent styles

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

// Shadow presets based on material design elevation
export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

// Common button styles
export const buttonStyles = {
  primary: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.buttonPaddingHorizontal,
    paddingVertical: spacing.buttonPaddingVertical,
    height: spacing.buttonHeight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.small,
  },
  secondary: {
    backgroundColor: colors.buttonSecondary,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.buttonPaddingHorizontal,
    paddingVertical: spacing.buttonPaddingVertical,
    height: spacing.buttonHeight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
  },
  disabled: {
    backgroundColor: colors.buttonDisabled,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.buttonPaddingHorizontal,
    paddingVertical: spacing.buttonPaddingVertical,
    height: spacing.buttonHeight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

// Common input styles
export const inputStyles = {
  default: {
    backgroundColor: colors.inputBackground,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    height: spacing.inputHeight,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.inputBorder,
    fontSize: typography.fontSize.input,
    color: colors.textLight,
  },
  focused: {
    borderColor: colors.inputFocus,
    borderWidth: spacing.borderWidthMedium,
  },
  error: {
    borderColor: colors.inputError,
    borderWidth: spacing.borderWidthMedium,
  },
};

// Common card styles
export const cardStyles = {
  default: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.radiusLg,
    padding: spacing.cardPadding,
    ...shadows.small,
  },
  elevated: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.radiusLg,
    padding: spacing.cardPadding,
    ...shadows.medium,
  },
  bordered: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.radiusLg,
    padding: spacing.cardPadding,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.cardBorder,
  },
};

// Common layout styles
export const layoutStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  screenPadding: {
    paddingHorizontal: spacing.screenPadding,
  },
  centerContent: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
};

// === THEME OBJECT ===
// Complete theme object for easy importing
export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  buttonStyles,
  inputStyles,
  cardStyles,
  layoutStyles,
};

// === TYPE DEFINITIONS ===
// TypeScript types for theme (optional but recommended)
export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeTypography = typeof typography;
export type Theme = typeof theme; 