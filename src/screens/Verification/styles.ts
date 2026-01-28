import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility - now using theme colors
export const BG_COLOR = colors.black;
export const GREEN = colors.green;
export const GRAY = colors.white70;

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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  codeInput: {
    flex: 1, // Fill available width dynamically
    height: 48,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.white50,
    backgroundColor: colors.white5,
    fontSize: typography.fontSize.xl,
    color: colors.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: typography.fontWeight.semibold,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    minWidth: 40, // Minimum width to ensure readability
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    backgroundColor: colors.black,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    width: '100%',
  },
  resendLink: {
    flex: 1,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pasteButtonText: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white80,
    textAlign: 'left',
  },
  resendText: {
    ...(typography.textStyles.bodySmall as TextStyle),
    lineHeight: typography.textStyles.bodySmall.lineHeight * typography.textStyles.bodySmall.fontSize,
    color: colors.white80,
    textAlign: 'left',
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.red,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.sm,
    textAlign: 'left',
  },
}); 