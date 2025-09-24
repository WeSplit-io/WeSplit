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
    minHeight: 60,
  },
  
  backButton: {
    width: 40,
    height: 40,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radiusSm,
    flexShrink: 0,
  },
  
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  
  placeholder: {
    width: 40,
    flexShrink: 0,
  },
  
  content: {
    flex: 1,
  },
  
  // Content padding to avoid bottom navigation overlap
  scrollContent: {
    paddingBottom: spacing.bottomNavSpace,
  },
  
  // === BALANCE CARD (MAIN FOCAL POINT) ===
  // Large green card displaying user's balance
  balanceCard: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    minHeight: spacing.balanceCardMinHeight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
    elevation: 4,
  },
  // Header row of balance card (label + QR icon)
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.itemSpacing,
  },
  
  // "Your Balance" label
  balanceLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
  
  // QR code icon container
  qrCodeIcon: {
    width: spacing.qrCodeIconSize,
    height: spacing.qrCodeIconSize,
    borderRadius: spacing.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // QR text inside icon
  qrCodeImage: {
    width: 25,
    height: 25,
  },
  
  // Large dollar amount display
  balanceAmount: {
    color: colors.black,
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.extrabold,
    marginBottom: spacing.sm,
    letterSpacing: -2,
    lineHeight: typography.fontSize.hero + spacing.xs,
  },
  
  // Small limit text below amount
  balanceLimitText: {
    color: colors.black,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.normal,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  // === ACTION BUTTONS GRID ===
  // Container for action buttons below balance card
  actionsGrid: {
    marginBottom: spacing.xxl,
    marginTop: 0,
  },
  
  // Row containing all action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Individual action button container
  actionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  
  // === ACTION BUTTON CIRCLES ===
  // Circular button background (default style)
  actionButtonCircle: {
    width: spacing.actionButtonSize,
    height: spacing.actionButtonSize,
    borderRadius: spacing.actionButtonRadius,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    display: 'flex',
    position: 'relative',
  },
  
  // === ACTION BUTTON ICONS & TEXT ===
  // Icon inside action button (default)
  actionButtonIcon: {
    width: 30,
    height: 30,
    tintColor: colors.textLight,
  },
  
  // Icon for request button (dark on green)
  actionButtonIconRequest: {
    width: 24,
    height: 24,
    tintColor: colors.black,
  },
  
  // Label text below action buttons
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Sections
  section: {
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },
  
  changeButton: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },
  
  seeAllText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },
  
  // External Wallet
  externalWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green10,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.green,
  },
  
  externalWalletText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },

  // External wallet card
  externalWalletCard: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  externalWalletAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  externalWalletAddressText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },

  linkWalletIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  linkWalletIcon: {
    width: 24,
    height: 24,
  },
  
  linkWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white10,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  
  linkWalletText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Options
  optionsContainer: {
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white10,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    gap: 10,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: spacing.radiusMd,
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  optionIcon: {
    width: 24,
    height: 24,
  },
  
  optionText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  optionSubtext: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    marginTop: spacing.xs / 2,
  },
  
  // Wallet Information Styles
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryGreen,
    marginLeft: spacing.sm,
  },

  walletCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white50,
    marginBottom: spacing.sm,
  },

  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  walletType: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },

  walletDetails: {
    gap: spacing.sm,
  },

  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  walletLabel: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  walletValue: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  copyableAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
    maxWidth: '60%',
  },

  walletAddress: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.xs,
  },

  // Transaction Styles
  requestItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  
  transactionAvatarNew: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  transactionIcon: {
    width: 20,
    height: 20,
    tintColor: colors.black,
  },

  transactionDetails: {
    flex: 1,
  },
  
  transactionTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },

  transactionSubtitle: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  
  transactionNote: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },

  transactionSource: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    marginTop: spacing.xs / 2,
  },

  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  emptyTransactionsText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  emptyTransactionsSubtext: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },

  loaderContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  loader: {
    marginBottom: spacing.md,
  },

  loaderText: {
    color: colors.textLightSecondary,
    fontSize: typography.fontSize.md,
  },
  
  // Legacy transaction styles (keeping for backward compatibility)
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  
  transactionInfo: {
    flex: 1,
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md, // réduit l'écart vertical
    marginBottom: spacing.sm, // ajoute un petit espace sous les instructions
  },
  
  instructionsTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  
  instructionsText: {
    color: colors.white70,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  
  seedPhraseContainer: {
    alignSelf: 'center', // centré
    borderRadius: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginTop: 50, // réduit l'écart avec les instructions
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.08,
    shadowRadius: spacing.sm,
    elevation: 2,
    marginHorizontal: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  
  blurredContainer: {
    backgroundColor: colors.green10,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Overlay pour simuler l'effet de flou
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: spacing.lg,
  },
  
  blurredText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  blurredSubtext: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
    rowGap: spacing.sm, // espace vertical réduit
    columnGap: spacing.sm, // espace horizontal réduit
  },
  
  seedWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green10, // pill plus claire
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    marginBottom: 0, // géré par rowGap
    width: '48%', // deux colonnes
    marginVertical: 2,
    marginHorizontal: 0,
    justifyContent: 'center',
  },
  
  seedWordNumber: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    marginRight: spacing.xs,
  },
  
  seedWord: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  
  closeButton: {
    padding: spacing.sm,
  },
  
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },

  // Modal content header for initial state
  modalContentHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
    flex: 1,
  },
  
  explanationContainer: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  
  explanationText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  
  modalFooter: {
    paddingVertical: spacing.md,
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

  // === TRANSACTION STYLES (FROM DASHBOARD) ===
  // Empty requests state
  emptyRequestsState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },

  // Empty requests text
  emptyRequestsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },

  // Request content container
  requestContent: {
    flex: 1,
    marginRight: spacing.md,
  },

  // Request sender name
  requestSenderName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs / 2,
  },

  // Request message with amount
  requestMessageWithAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },

  // Request amount in green
  requestAmountGreen: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  // Request source info
  requestSource: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
  },

  // === MODAL STYLES ===
  // Modal overlay with semi-transparent background
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  // Bottom sheet container
  bottomSheet: {
    backgroundColor: colors.darkCard,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
    minHeight: 350,
  },

  // Handle for bottom sheet
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white50,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  // Apple-style slider
  appleSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green10,
    borderRadius: spacing.radiusRound,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 70,
    padding: 5,
    width: '100%',
    height: 70,
  },

  appleSliderTrack: {
    flex: 1,
    height: 60,
    borderRadius: spacing.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  appleSliderTrackActive: {
    backgroundColor: colors.primaryGreen,
  },

  appleSliderThumb: {
    position: 'absolute',
    left: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },

  appleSliderText: {
    color: colors.white50,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    zIndex: 1,
    textAlign: 'center',
  },

  appleSliderTextActive: {
    color: colors.black,
  },

  appleSliderIcon: {
    width: 20, // Bigger icon
    height: 20, // Bigger icon
    tintColor: colors.black,
  },



  // Success styles
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  successTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },

  successMessage: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
  },

  goBackButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
  },

  goBackButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  
  copyButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing.sm,
  },
}); 