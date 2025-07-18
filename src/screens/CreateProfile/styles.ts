import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility
export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 48,
    height: 48,
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  logoName: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginBottom: spacing.xl,
    textAlign: 'center',
    opacity: 0.8,
    width: '80%',
    alignSelf: 'center',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 170,
    backgroundColor: 'rgba(165, 234, 21, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 170,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    width: 64,
    height: 64,
    tintColor: colors.textLight,
    opacity: 0.9,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: spacing.md,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 16,
    height: 16,
    tintColor: colors.black,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  inputLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },
  input: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: GREEN,
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  nextButton: {
    backgroundColor: GREEN,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.sm + 2, // 14
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  nextButtonDisabled: {
    backgroundColor: colors.darkGray,
    opacity: 0.6,
  },
  nextButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal,
  },
  helpSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  helpText: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 