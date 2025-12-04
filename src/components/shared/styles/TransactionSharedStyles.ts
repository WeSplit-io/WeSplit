import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';

export const transactionSharedStyles = StyleSheet.create({
  // Screen subtitle style
  subtitle: {
    fontSize: 16,
    color: colors.white70,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },

  // Recipient display styles
  recipientAvatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  recipientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.green,
  },
  recipientName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  recipientEmail: {
    fontSize: 14,
    color: colors.white70,
    textAlign: 'center',
  },
  recipientWalletIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientWalletIconImage: {
    width: 32,
    height: 32,
  },
  recipientKastIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  // Amount input styles
  amountCardMockup: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  amountCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountCardLabel: {
    fontSize: 16,
    color: colors.white70,
    marginBottom: 16,
    textAlign: 'center',
  },
  amountCardInput: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.white,
    textAlign: 'center',
    minWidth: 200,
    marginBottom: 8,
  },
  amountCardCurrency: {
    fontSize: 18,
    color: colors.white70,
    textAlign: 'center',
  },

  // Memo/note styles
  amountCardAddNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.gray,
  },
  amountCardAddNoteText: {
    fontSize: 15,
    color: colors.white50,
    marginLeft: 8,
  },

  // Button container styles
  amountCardContinueButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  mockupContinueButton: {
    marginTop: 20,
  },

  // Apple Slider container
  appleSliderContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },

  // Loading styles
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 16,
    color: colors.white70,
    textAlign: 'center',
  },

  // Error styles
  errorContainer: {
    backgroundColor: '#FF5252',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});
