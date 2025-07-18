import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility - now using theme colors
export const BG_COLOR = colors.darkBackground;
export const GREEN = colors.brandGreen;
export const GRAY = colors.darkGray;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 48,
    height: 48,
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  logoName: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mailIconBox: {
    width: spacing.mailIconBoxSize,
    height: spacing.mailIconBoxSize,
    borderRadius: spacing.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  mailIcon: {
    width: spacing.xl,
    height: spacing.xl,
    resizeMode: 'contain',
    tintColor: GREEN,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
    opacity: 0.8,
  },
  emailHighlight: {
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: spacing.codeInputSize,
    height: spacing.codeInputSize,
    borderRadius: spacing.lg,
    borderWidth: spacing.codeInputBorder,
    borderColor: GREEN,
    backgroundColor: colors.background,
    fontSize: typography.fontSize.xxxl,
    color: GREEN,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
    fontWeight: typography.fontWeight.bold,
  },
  submitButton: {
    backgroundColor: GREEN,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.sm + spacing.xs / 2,
    width: '90%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.darkGray,
    opacity: 0.6,
  },
  submitButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal,
  },
  timerSection: {
    alignItems: 'center',
  },
  timer: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
    marginTop: 0,
    opacity: 0.7,
  },
  resendLink: {
    marginBottom: 0,
  },
  resendText: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    fontWeight: typography.fontWeight.bold,
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  helpSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  helpText: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 