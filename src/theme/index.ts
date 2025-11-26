// Import the theme objects
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { spacing } from './spacing';
export { typography } from './typography';


// === THEME OBJECT ===
// Complete theme object for easy importing
export const theme = {
  colors,
  spacing,
  typography,
};

// === TYPE DEFINITIONS ===
// TypeScript types for theme (optional but recommended)
export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeTypography = typeof typography;
export type Theme = typeof theme; 