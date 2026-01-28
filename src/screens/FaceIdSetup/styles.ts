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
    marginBottom: 200,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...(typography.textStyles.h3 as TextStyle),
    lineHeight: typography.textStyles.h3.lineHeight * typography.textStyles.h3.fontSize,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalMessage: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    paddingTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  modalButtonDivider: {
    width: 1,
    backgroundColor: colors.white10,
  },
  modalButtonText: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white70,
  },
  modalButtonTextPrimary: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});
