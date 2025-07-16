import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  backButton: {
    padding: spacing.sm,
  },
  
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  
  placeholder: {
    width: 40,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  
  // Balance Card
  balanceCard: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
    elevation: 4,
  },
  
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  balanceLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
  
  balanceAmount: {
    color: colors.black,
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.extrabold,
    marginBottom: spacing.sm,
    letterSpacing: -2,
    lineHeight: typography.fontSize.hero + spacing.xs,
  },
  
  balanceLimitText: {
    color: colors.black,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.normal,
    opacity: 0.8,
  },
  
  // Action Buttons
  actionsGrid: {
    marginBottom: spacing.lg,
  },
  
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  actionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  
  actionButtonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  
  changeButton: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  
  seeAllText: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  
  // External Wallet
  externalWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
  },
  
  externalWalletText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },
  
  linkWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkCard,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
  },
  
  linkWalletText: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkCard,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
  },
  
  optionText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Transactions
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkCard,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
  },
  
  transactionInfo: {
    flex: 1,
  },
  
  transactionTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  
  transactionNote: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
  },
  
  transactionAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  
  emptyText: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    padding: spacing.lg,
  },
  
  // Seed Phrase Styles
  instructionsContainer: {
    marginBottom: spacing.xl,
  },
  
  instructionsTitle: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  
  instructionsText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    lineHeight: 24,
  },
  
  seedPhraseContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  blurredContainer: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
  },
  
  blurredText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  blurredSubtext: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
  },
  
  revealButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },
  
  seedPhraseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  seedWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
    width: '48%',
  },
  
  seedWordNumber: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.xs,
  },
  
  seedWord: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: spacing.radiusMd,
    marginTop: spacing.xl,
  },
  
  nextButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.sm,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  
  closeButton: {
    padding: spacing.sm,
  },
  
  modalContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  
  explanationText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  
  modalFooter: {
    padding: spacing.lg,
  },
  
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: spacing.radiusMd,
  },
  
  activateButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.sm,
  },
  
  // Success Styles
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  
  successText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },

  // Seed Phrase Verification Styles
  progressContainer: {
    marginBottom: spacing.xl,
  },

  progressText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryGreen,
    borderRadius: 2,
  },

  currentWordContainer: {
    backgroundColor: colors.darkCard,
    padding: spacing.lg,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },

  currentWordLabel: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },

  currentWordText: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },

  enteredWordsContainer: {
    marginBottom: spacing.xl,
  },

  enteredWordsLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },

  enteredWordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  enteredWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
    width: '48%',
  },

  enteredWordNumber: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.xs,
  },

  enteredWord: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },

  wordSelectionContainer: {
    marginBottom: spacing.xl,
  },

  wordSelectionLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },

  wordSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  wordSelectionButton: {
    backgroundColor: colors.darkCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.sm,
    width: '48%',
    alignItems: 'center',
  },

  wordSelectionButtonSelected: {
    backgroundColor: colors.primaryGreen,
  },

  wordSelectionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },

  wordSelectionButtonTextSelected: {
    color: colors.black,
  },

  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },

  clearButton: {
    backgroundColor: colors.darkCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    flex: 1,
    marginRight: spacing.sm,
    alignItems: 'center',
  },

  clearButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },

  confirmButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    flex: 1,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },

  confirmButtonDisabled: {
    backgroundColor: colors.border,
  },

  confirmButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 