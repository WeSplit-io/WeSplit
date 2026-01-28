import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    ...(typography.textStyles.h2 as TextStyle),
    lineHeight: typography.textStyles.h2.lineHeight * typography.textStyles.h2.fontSize,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pinIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
    height: 60,
  },
  pinDot: {
    width: 15,
    height: 15,
    borderRadius: spacing.md,
    borderWidth: 1,
  },
  pinDotEmpty: {
    backgroundColor: 'transparent',
    borderColor: colors.white50,
  },
  pinDotFilled: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  pinDotError: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  keypadButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: spacing.radiusLg,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonEmpty: {
    flex: 1,
    aspectRatio: 1,
  },
  keypadButtonDelete: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    ...(typography.numberStyles.bigNumber as TextStyle),
    lineHeight: typography.numberStyles.bigNumber.lineHeight * typography.numberStyles.bigNumber.fontSize,
    color: colors.white,
  },
  deleteIcon: {
    width: 32,
    height: 32,
    tintColor: colors.white,
  },
  deleteIconDisabled: {
    opacity: 0.5,
  },
});
