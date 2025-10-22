import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.black,
    position: 'relative',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    color: colors.textLight,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textLight,
    marginTop: spacing.md,
  },
  providerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white50,
    marginBottom: spacing.sm,
  },
  providerButtonDisabled: {
    opacity: 0.5,
  },
  providerInfo: {
    flex: 1,
  },
  providerInfoHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  walletLogoContainer: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  providerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  detectedBadge: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  detectedText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  providerUnavailable: {
    color: colors.textLightSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textLightSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  debugButton: {
    padding: 8,
    backgroundColor: colors.primaryGreen,
    borderRadius: 6,
    marginLeft: 8,
  },
  debugButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Debug styles
  debugContainer: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
  },
  debugText: {
    color: colors.primaryGreen,
    fontSize: 12,
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
  },
  sectionContainer: {
    marginVertical: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  alternativeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alternativeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  alternativeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  // Header buttons
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fixButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fixButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  importButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  importButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  // Linked wallet items
  linkedWalletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
  },
  walletAddress: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  walletStatus: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  walletStatusText: {
    color: colors.black,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.textLight,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  importTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: colors.white10,
    borderRadius: 8,
    padding: 4,
  },
  importTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  importTypeButtonActive: {
    backgroundColor: colors.primaryGreen,
  },
  importTypeButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
  },
  importTypeButtonTextActive: {
    color: colors.black,
    fontWeight: typography.fontWeight.bold,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  inputField: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white50,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
    minHeight: 50,
  },
  instructionsContainer: {
    backgroundColor: colors.white10,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    color: colors.textLight,
    fontSize: 14,
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  warningText: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: spacing.sm,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.darkBorder,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white50,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
  },
  importSubmitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
  },
  importSubmitButtonDisabled: {
    opacity: 0.5,
  },
  importSubmitButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  // Error styles
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
}); 