import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 28,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: colors.brandGreen,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 300,
    height: 300,
  },
  messageSection: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  headline: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    lineHeight: 22,
    opacity: 0.8,
    marginTop: spacing.md,
  },
  buttonSection: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  getStartedButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
}); 