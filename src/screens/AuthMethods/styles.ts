import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({

  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  // Social Login Buttons ================================
  socialSection: {
    marginBottom: spacing.xl,
  },
  socialButtonLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textLight,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  socialImageIcon: {
    width: 24,
    height: 24,
    objectFit: 'contain',
    marginRight: spacing.sm,
  },
  socialButtonTextDark: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkBackground,
  },
  socialButtonLightDisabled: {
    opacity: 0.6,
  },
  socialOptions: {
    gap: spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialIconContainer: {
    marginRight: spacing.sm,
  },
  socialEmoji: {
    fontSize: 20,
  },
  socialButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.darkBorder,
  },
  separatorText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },

  // Email Authentication ================================
  emailSection: {
    marginBottom: spacing.lg,
  },
  emailLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  emailInput: {
    backgroundColor: colors.textLight,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.black,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  gradientNextButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 16,
  },
  nextButtonDisabled: {
    backgroundColor: colors.white10,
    alignItems: 'center',
    paddingVertical: 15,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  nextButtonTextDisabled: {
    color: colors.white50,
  },
  helpSection: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    fontWeight: typography.fontWeight.regular,
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

  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
}); 