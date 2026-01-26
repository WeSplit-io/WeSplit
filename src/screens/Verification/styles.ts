import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility - now using theme colors
export const BG_COLOR = colors.black;
export const GREEN = colors.green;
export const GRAY = colors.white70;

export const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },

  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 30,
    width: 170,
    objectFit: 'contain',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  mailIconBox: {
    width: spacing.mailIconBoxSize,
    height: spacing.mailIconBoxSize,
    borderRadius: 16,
    backgroundColor: colors.white5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mailIcon: {
    width: spacing.xl,
    height: spacing.xl,
    resizeMode: 'contain',
    tintColor: colors.white,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    marginBottom: spacing.xxl,
    textAlign: 'center',
    opacity: 0.8,
  },
  emailHighlight: {
    color: colors.white,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
    // No flexWrap - we want all inputs in a single row
    // No paddingHorizontal here - parent centerContent already has padding
  },
  codeInput: {
    // Width and height are set dynamically in component based on screen size
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white50,
    backgroundColor: colors.white5,
    // Font size is set dynamically in component
    color: colors.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: spacing.xs, // Only right margin - last input will have marginRight: 0
    fontWeight: typography.fontWeight.semibold,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0, // No horizontal padding to maximize space
    includeFontPadding: false,
  },
  submitButton: {
    borderRadius: 16,
    width: '100%',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 16,
  },
  submitButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
  },
  timerSection: {
    alignItems: 'center',
  },
  timer: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
    marginTop: 0,
    opacity: 1,
  },
  resendLink: {
    marginBottom: 0,
  },
  resendText: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    fontWeight: typography.fontWeight.semibold,
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.red,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  helpSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  helpText: {
    color: colors.white50,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
  },
}); 