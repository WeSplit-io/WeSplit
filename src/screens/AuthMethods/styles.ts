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


  // Social Login Section ================================
  socialSection: {
    marginBottom: spacing.xl,
  },
  socialButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.white5,
  },
  socialEmoji: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  socialButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialButtonDisabledText: {
    color: colors.white50,
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.white10,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    marginHorizontal: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },


  // Email/Phone Authentication ================================
  inputSection: {
    marginBottom: spacing.lg,
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
    backgroundColor: colors.black,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
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
    color: colors.white70,
    marginTop: spacing.md,
    textAlign: 'center',
  },
}); 