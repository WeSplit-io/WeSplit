import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: typography.fontSize.gigantic,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.white,
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
    ...(typography.textStyles.h1 as TextStyle),
    lineHeight: typography.textStyles.h1.lineHeight * typography.textStyles.h1.fontSize,
    color: colors.white,
  },
  subtitle: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white80,
    marginTop: spacing.md,
  },
  buttonSection: {
    paddingBottom: spacing.md,
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