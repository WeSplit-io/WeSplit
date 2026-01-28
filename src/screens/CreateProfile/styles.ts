import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility
export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for fixed button at bottom
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
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePictureButton: {
    flex: 1,
  },
  changePictureText: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white80,
    textAlign: 'left',
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...(typography.textStyles.h3 as TextStyle),
    lineHeight: typography.textStyles.h3.lineHeight * typography.textStyles.h3.fontSize,
    color: colors.white,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.black,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  validationText: {
    ...(typography.textStyles.bodySmall as TextStyle),
    lineHeight: typography.textStyles.bodySmall.lineHeight * typography.textStyles.bodySmall.fontSize,
    color: colors.white50,
  },
}); 