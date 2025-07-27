import { StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  // ===== MAIN CONTAINER & LAYOUT =====
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ===== HEADER STYLES =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },

  // ===== ALERT & NOTIFICATION STYLES =====
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  devAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandGreen,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  devAlertText: {
    color: colors.black,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },

  // ===== AMOUNT SECTION STYLES =====
  amountSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: colors.white,
  },
  amountInput: {
    backgroundColor: colors.green10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountTextInput: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
  },
  usdcLogo: {
    width: 32,
    height: 32,
    marginLeft: 8,
  },
  availableBalance: {
    fontSize: 14,
    color: colors.white50,
    marginBottom: 12,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickAmountButton: {
    backgroundColor: colors.white10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  quickAmountText: {
    fontSize: 14,
    color: colors.white,
  },

  // ===== WALLET ADDRESS SECTION STYLES =====
  walletAddressSection: {
    marginBottom: 20,
  },
  walletAddressInput: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white50,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAddressTextInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    padding: 0,
  },
  sendToConnectedWalletButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  sendToConnectedWalletText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '600',
  },

  // ===== TRANSACTION SUMMARY STYLES =====
  transactionSummary: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDivider: {
    height: 0.5,
    backgroundColor: colors.white50,
    marginVertical: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.white70,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textLight,
  },
  summaryValueBold: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: 'bold',
  },

  // ===== CONTINUE BUTTON STYLES =====
  continueButton: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: colors.green,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white50,
  },
  continueButtonTextActive: {
    color: colors.black,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // ===== SEND CONFIRMATION SCREEN STYLES =====
  sentAmountContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.textLight,
    width: '100%',
  },
  sentAmountValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  sentAmountLabel: {
    color: colors.white,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  sentAmountValue: {
    color: colors.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  mockupTransactionDetails: {
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    width: '100%',
  },
  mockupFeeRowSeparator: {
    height: 0.5,
    backgroundColor: colors.white50,
    marginBottom: spacing.md,
  },
  mockupFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mockupFeeLabel: {
    color: colors.white70,
    fontSize: 14,
  },
  mockupFeeValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  mockupNoteContainer: {
    alignItems: 'center',
  },
  mockupNoteText: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'left',
  },
  walletInfoContainer: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  walletInfoText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },

  // ===== APPLE SLIDER STYLES =====
  appleSliderContainerWrapper: {
    marginHorizontal: spacing.lg,
  },
  appleSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brandGreen,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 70,
    padding: 5,
    height: 70,
    marginTop: 16,
    marginBottom: 8,
  },
  appleSliderTrack: {
    flex: 1,
    height: 60,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  appleSliderThumb: {
    position: 'absolute',
    left: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  appleSliderText: {
    color: colors.white50,
    fontSize: 17,
    fontWeight: '500',
    zIndex: 1,
    textAlign: 'center',
  },

  // ===== SUCCESS SCREEN STYLES =====
  mockupSuccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  mockupSuccessContainerWithSpace: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 0,
  },
  mockupSuccessContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupSuccessIcon: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mockupSuccessIconImage: {
    width: 150,
    height: 150,
  },
  mockupSuccessTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mockupSuccessTitleLarge: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  mockupSuccessDescription: {
    color: colors.white70,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  mockupSuccessDate: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  mockupSuccessDateLarge: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  mockupBackHomeButtonContainer: {
    width: '100%',
    paddingBottom: 24,
    alignItems: 'center',
  },
  mockupBackHomeButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  mockupBackHomeButtonCustom: {
    backgroundColor: colors.brandGreen,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  mockupBackHomeButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '500',
  },
  mockupBackHomeButtonTextCustom: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },

  // ===== OLD CONFIRMATION SCREEN STYLES (DEPRECATED) =====
  withdrawalAmountDisplay: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  withdrawalAmountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  withdrawalAmountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  transactionDetails: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  warningMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  signTransactionButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signTransactionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textLight,
    marginLeft: 8,
  },

  // ===== OLD SUCCESS SCREEN STYLES (DEPRECATED) =====
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 8,
  },
  successLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 30,
  },
  goBackButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textLight,
  },

  // ===== DEV TESTING STYLES =====
  devTestingSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandGreen,
    borderStyle: 'dashed',
  },
  devTestingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.brandGreen,
    marginBottom: 12,
    textAlign: 'center',
  },
  devTestingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  devTestingButton: {
    backgroundColor: colors.darkCardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devTestingButtonText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
  },
}); 