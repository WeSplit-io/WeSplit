import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility
export const BG_COLOR = '#212121';
export const GREEN = '#A5EA15';
export const GRAY = '#A89B9B';

export const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  buttonContainer: {
  },

  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    flexWrap: 'wrap',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 170,
    backgroundColor: colors.white5,
    borderWidth: 1,
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
    width: 48,
    height: 48,
    tintColor: colors.white70,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: spacing.md,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  inputLabel: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },
  input: {
    width: '100%',
    backgroundColor: colors.white5,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  nextButton: {
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 16,
  },
  nextButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
  },
  helpSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  helpText: {
    color: colors.white50,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
}); 