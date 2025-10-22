import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  logoSection: {
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: typography.fontSize.gigantic,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: colors.green,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 580,
    height: 580,
  },
  messageSection: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  headline: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.white70,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  buttonSection: {
    paddingBottom: spacing.md,
  },
  getStartedButton: {
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: spacing.md2,
    alignItems: 'center',
    borderRadius: spacing.lg,
  },
  getStartedButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
  },
  helpSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  helpText: {
    color: colors.white50,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
}); 