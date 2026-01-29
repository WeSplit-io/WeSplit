import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for button
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
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
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
  },
});
