import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: spacing.iconBoxSize,
    height: spacing.iconBoxSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...(typography.textStyles.h2 as TextStyle),
    lineHeight: typography.textStyles.h2.lineHeight * typography.textStyles.h2.fontSize,
    color: colors.white,
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white70,
    textAlign: 'left',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    width: '100%',
  },
  centralImage: {
    width: '100%',
    height: '100%',
    maxHeight: 500,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  skipButtonText: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white50,
  },
});
