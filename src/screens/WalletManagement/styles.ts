import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    position: 'relative',
  },
  
  navBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,  
    bottom: 0,
    zIndex: 9999,
  },


  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  welcomeText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs,
  },

  userName: {
    color: colors.white,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },

  bellContainer: {
    position: 'relative',
    padding: spacing.sm,
  },

  bellIcon: {
    width: 23,
    height: 23,
    color: colors.white,
  },

  priceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },

  priceLoadingText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },

  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
  },

  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },

  copyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.white,
    marginLeft: spacing.xs,
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
    width: 20,
    height: 20,
  },
  
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  
  placeholder: {
    width: 40,
    flexShrink: 0,
  },

  debugButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusSm,
    flexShrink: 0,
  },

  debugButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
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
    borderRadius: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    minHeight: spacing.balanceCardMinHeight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
    elevation: 4,
    overflow: 'hidden',
  },
  // Header row of balance card (label + QR icon)
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  
  // "Your Balance" label
  balanceLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.light,
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
    tintColor: colors.white,
  },
  
  // Large dollar amount display
  balanceAmount: {
    color: colors.white,
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    letterSpacing: -2,
    lineHeight: typography.fontSize.hero + spacing.xs,
  },
  
  // Small limit text below amount
  balanceLimitText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    opacity: 0.8,
  },
  // === ACTION BUTTONS GRID ===
  // Container for action buttons below balance card
  actionsGrid: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxxl,
    marginTop: 0,
    position: 'relative',
  },
  
  // Row containing all action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 5,
  },
  
  // Individual action button container
  actionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 80,
  },
  
  // === ACTION BUTTON CIRCLES ===
  // Circular button background (default style)
  actionButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    display: 'flex',
    position: 'relative',
    // Border to simulate inset shadow effect
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(10, 138, 90, 0.15)',
    borderBottomColor: 'rgba(10, 138, 90, 0.15)',
  },
  
  // === ACTION BUTTON ICONS & TEXT ===
  // Icon inside action button (default)
  actionButtonIcon: {
    width: 30,
    height: 30,

  },

  // Icon inside action button (no tint)
  actionButtonIconNoTint: {
    width: 32,
    height: 32,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  
  // Sections
  section: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
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

  // Row with two side-by-side mini cards
  externalCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  externalMiniCard: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white50,
  },

  // Styles pour les cartes connectées (avec détails d'adresse)
  externalMiniCardConnected: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
  },

  // Styles pour les cartes non-connectées (design centré simple)
  externalMiniCardSimple: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  externalMiniCardLeft: {},
  externalMiniCardRight: {},

  externalMiniHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  externalMiniIcon: {
    width: 15,
    height: 15,
    tintColor: colors.white70,
  },

  externalMiniTitle: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },

  externalMiniBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  externalMiniAddress: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },

  externalMiniCopyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.white70,
  },

  externalMiniFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  externalMiniProvider: {
    color: colors.white50,
    fontSize: typography.fontSize.sm,
  },

  kastIconBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,

  },
  kastIconBoxSmall: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  kastIconText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  kastCardText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },

  // Styles for link wallet state
  linkWalletBodyRow: {
    marginBottom: spacing.md,
  },

  linkWalletMainText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
  },

  linkWalletFooterRow: {
    justifyContent: 'flex-start',
  },

  linkWalletSubText: {
    color: colors.white50,
    fontSize: typography.fontSize.sm,
  },

  // Styles pour les cartes de lien simple
  linkCardIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  linkCardIcon: {
    width: 30,
    height: 30,
    tintColor: colors.white70,
  },

  linkCardText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    textAlign: 'center',
  },

  kastIconImage: {
    width: 30,
    height: 30,
  },
  kastIconImageSmall: {
    width: 20,
    height: 20,
    marginBottom: 0,
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
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white5,
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
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
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
  loaderSeedPhraseContainer: {
    alignItems: 'center',
    paddingVertical: 300,
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
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md, // réduit l'écart vertical
    marginBottom: spacing.sm, // ajoute un petit espace sous les instructions
  },
  
  instructionsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
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
    minHeight: 200, // Increased for 24 words
    marginTop: spacing.md, // Reduced margin
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white5,
  },
  
  blurredContainer: {
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
    rowGap: spacing.xs, // Reduced vertical spacing for 24 words
    columnGap: spacing.xs, // Reduced horizontal spacing
  },
  
  seedWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm, // Reduced padding
    paddingVertical: spacing.xs, // Reduced padding
    borderRadius: 8, // Slightly smaller radius
    marginBottom: 0, // géré par rowGap
    width: '48%', // two columns
    marginVertical: 1, // Minimal margin
    marginHorizontal: 0,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: colors.white50,
    minHeight: 36, // Fixed height for consistency
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
    justifyContent: 'center',
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
    alignSelf: 'center',
  },
  
  copyButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },


  // Scrollable container styles
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for fixed button
  },

  // Bottom spacer to ensure content doesn't get covered
  bottomSpacer: {
    height: 20,
  },

  // Fixed done button at bottom of screen
  doneButtonFixed: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.green,
  },
  doneButtonText: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },


}); 
