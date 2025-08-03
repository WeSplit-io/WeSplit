import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility - now using theme colors
export const BG_COLOR = colors.darkBackground;
export const GREEN = colors.brandGreen;
export const GRAY = colors.darkGray;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    height: 40,
    objectFit: 'contain',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: spacing.xxl,
  },
  mailIconBox: {
    width: spacing.mailIconBoxSize,
    height: spacing.mailIconBoxSize,
    borderRadius: 16,
    backgroundColor: colors.white10,
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
    color: colors.white,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  codeInput: {
    width: spacing.codeInputSize,
    height: spacing.codeInputSize,
    borderRadius: 16,
    borderWidth: spacing.codeInputBorder,
    borderColor: GREEN,
    backgroundColor: colors.background,
    fontSize: typography.fontSize.xxxl,
    color: colors.black,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.white10,
    color: colors.white50,
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
    color: colors.white50,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
  },
}); 