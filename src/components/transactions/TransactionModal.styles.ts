import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export const styles = StyleSheet.create({
  transactionModalOverlay: {
    flex: 1,
    backgroundColor: colors.blackOverlay,
    justifyContent: 'flex-end',
  },
  transactionOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  transactionModalContent: {
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.bottomSafeArea,
    paddingTop: 24,
    maxHeight: '85%',
    minHeight: 600,
  },
  transactionHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white50,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 25,
  },
  transactionModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 25,
  },
  transactionContent: {
    flex: 1,
  },
  transactionContentContainer: {
    paddingBottom: spacing.bottomSafeArea,
  },
  transactionDetailsContainer: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  transactionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionDetailRowLast: {
    borderBottomWidth: 0,
  },
  transactionDetailLabel: {
    fontSize: 14,
    color: colors.white70,
    fontWeight: '500',
    flex: 1,
  },
  transactionDetailValue: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  transactionDetailValueLink: {
    fontSize: 14,
    color: colors.green,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  transactionDoneButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.green,
    paddingVertical: spacing.md,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  transactionDoneButtonText: {
    color: colors.green,
    fontSize: 20,
    fontWeight: 'semibold',
  },
  groupNavigationButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  groupNavigationButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
}); 