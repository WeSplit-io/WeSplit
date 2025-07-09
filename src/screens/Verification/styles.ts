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
    paddingHorizontal: 0,
  },
  logoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.logoTopMargin,
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: spacing.logoIconSize,
    height: spacing.logoIconSize,
    marginRight: spacing.itemSpacing,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: typography.fontSize.title,
    fontFamily: 'Satoshi',
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: GREEN,
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
  submitButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal,
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
  helpLink: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  helpText: {
    color: GRAY,
    fontSize: typography.fontSize.md,
    opacity: 0.7,
  },
}); 