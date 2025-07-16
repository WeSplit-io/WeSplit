import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  logoIcon: {
    width: 36,
    height: 36,
    marginRight: spacing.sm,
  },
  logoText: {
    fontSize: 35,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: colors.green,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textLight,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
    objectFit: 'contain',
    marginRight: spacing.sm,
  },
  socialText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkBackground,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.darkBorder,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.textLight,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.black,
    marginBottom: spacing.lg,
  },
  nextButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  helpLink: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  modalEmail: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
  },
  modalButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 1,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.green,
  },
  modalButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  modalButtonTextSecondary: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
  },
}); 