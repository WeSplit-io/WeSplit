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
    width: 300,
    height: 300,
  },
  messageSection: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
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
    paddingBottom: spacing.xl,
  },
  getStartedButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    paddingVertical: 20,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
  },
}); 