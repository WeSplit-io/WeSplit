import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility
export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  logo: {
    height: 30,
    width: 170,
    objectFit: 'contain',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,

  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    marginBottom: spacing.xl,
    textAlign: 'center',
    alignSelf: 'center',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 170,
    backgroundColor: 'rgba(165, 234, 21, 0.10)',
    borderWidth: 0.5,
    borderColor: colors.white50,
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
    borderRadius: 16,
    paddingVertical: 15,
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
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  nextButtonDisabled: {
    backgroundColor: colors.white10,
    color: colors.white50,
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
    color: colors.white50,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
}); 