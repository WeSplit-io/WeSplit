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
    paddingHorizontal: 0,
  },
  logoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.radiusXl + spacing.xl + spacing.xs, // 60
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: spacing.xl + spacing.sm, // 40
    height: spacing.xl + spacing.sm, // 40
    marginRight: spacing.itemSpacing,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: typography.fontSize.title,
    fontFamily: 'Satoshi',
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: GREEN,
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
  avatarBox: {
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
  avatarIcon: {
    width: 64,
    height: 64,
    tintColor: colors.textLight,
    opacity: 0.9,
  },
  avatarHint: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    opacity: 0.6,
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  editIconBox: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: spacing.xl,
    height: spacing.xl,
  },
  inputLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    alignSelf: 'flex-start',
    marginLeft: spacing.xl,
    marginBottom: 6,
  },
  input: {
    width: '90%',
    backgroundColor: colors.background,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.itemSpacing,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs + 2, // 10
    borderWidth: 1,
    borderColor: GREEN,
  },
  error: {
    color: colors.error,
    fontSize: 15,
    alignSelf: 'flex-start',
    marginLeft: spacing.xl,
    marginBottom: spacing.sm,
  },
  nextButton: {
    backgroundColor: GREEN,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.sm + 2, // 14
    width: '90%',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  nextButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.normal,
  },
  helpLink: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  helpText: {
    color: GRAY,
    fontSize: typography.fontSize.md,
    opacity: 0.7,
  },
}); 