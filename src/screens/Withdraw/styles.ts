import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  placeholder: {
    width: 40,
  },
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
  amountSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.textSecondary,
  },
  amountInput: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableBalance: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickAmountButton: {
    backgroundColor: colors.darkCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  quickAmountText: {
    fontSize: 12,
    color: colors.textLight,
  },
  walletAddressSection: {
    marginBottom: 20,
  },
  walletAddressInput: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionSummary: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.textLight,
  },
  numberPad: {
    marginTop: 20,
  },
  numberPadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  numberPadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberPadText: {
    fontSize: 18,
    color: colors.textLight,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonActive: {
    backgroundColor: colors.brandGreen,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  continueButtonTextActive: {
    color: colors.textLight,
  },
  // Confirmation screen styles
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
  // Success screen styles
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  // Dev testing styles
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