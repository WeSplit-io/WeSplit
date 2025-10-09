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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  backButtonIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  editButton: {
    padding: spacing.sm,
  },
  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  editButtonIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },

  /* === Bill Card Styles === */
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  splitCardDotLeft: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginRight: spacing.xs,
    position: 'absolute',
    bottom: '45%',
    left: -15,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  splitCardDotRight: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginLeft: spacing.xs,
    position: 'absolute',
    bottom: '45%',
    right: -15,
    backgroundColor: colors.black,
    zIndex: 1,
  },
  billCardTop: {
   
  },

  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  billHeaderContent: {
    flex: 1,
  },
  billTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
 },
  billIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  billIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  billTitle: {
    color: colors.black,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    flex: 1,

  },
  billDate: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  billAmountContainer: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billAmountLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    marginTop: spacing.sm,
  },
  billAmountRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  billAmountUSDC: {
    color: colors.black,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  billAmountEUR: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    opacity: 0.9,
  },
  billLocation: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  billCardBottom: {
  },

  splitInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  splitInfoLeft: {
    flex: 1,
  },
  splitInfoLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  avatarOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },


  /*** ==== Participants Section ==== ***/
  participantsSection: {
  },
  participantsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  participantCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    marginRight: spacing.md,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  participantWallet: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  participantStatus: {
    alignItems: 'flex-end',
  },
  statusAccepted: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  statusAcceptedIcon: {
    width: 20,
    height: 20,
    objectFit: 'contain',
    marginRight: spacing.xs,
  },
  statusPending: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  splitButton: {
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  splitButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  splitButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  splitButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  splitButtonTextDisabled: {
    color: colors.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: '65%',
    minHeight: 400,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  modalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  splitOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  splitOption: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 200,
    justifyContent: 'center',
    minWidth: 140,
  },
  splitOptionSelected: {
    borderColor: colors.green,
  },
  splitOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  splitOptionIconText: {
    fontSize: 28,
  },
  splitOptionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  splitOptionDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  riskyModeLabel: {
    position: 'absolute',
    top: -6,
    left: -6,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  riskyModeIcon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  riskyModeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 12,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  continueButtonTextDisabled: {
    color: colors.textSecondary,
  },
  // Add Friends Modal Styles
  addFriendsModalContainer: {
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    minHeight: '60%',
    maxHeight: '85%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: colors.white70,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  addFriendsModalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    flex: 1,
    justifyContent: 'center',
  },
  qrCodeContainer: {
    marginBottom: spacing.xl,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: spacing.md,
    shadowColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',

  },
  qrCodePlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  qrCodeText: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.black,
  },
  qrCodeSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  splitContext: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
  },
  splitContextIcon: {
    fontSize: typography.fontSize.xl,
    marginRight: spacing.md,
    opacity: 0.8,
  },
  splitContextIconImage: {
    width: 36,
    height: 36,
    marginRight: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
    padding: spacing.sm,
  },
  splitContextText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  addFriendsModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    gap: spacing.xs,
  },
  shareLinkButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 0,
  },
  shareLinkButtonText: {
    color: colors.white80,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  addContactsButton: {
    flex: 1,
    borderRadius: spacing.md,
    marginLeft: spacing.md,
    overflow: 'hidden',
  },
  addContactsButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactsButtonDisabled: {
    backgroundColor: colors.GRAY,
    opacity: 0.6,
  },
  addContactsButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  
  // Split Wallet Section Styles
  splitWalletSection: {
    marginBottom: spacing.lg,
  },
  splitWalletTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  splitWalletCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitWalletInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  splitWalletLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitWalletAddress: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  copyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.white80,
  },
  privateKeyButton: {
    backgroundColor: colors.white10,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  privateKeyButtonIcon: {
    width: 20,
    height: 20,
    objectFit: 'contain',
    marginRight: spacing.xs,
  },
  privateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  
  // Private Key Modal Styles
  privateKeyModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  privateKeyModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  privateKeyModalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  privateKeyModalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  privateKeyDisplayContainer: {
    marginBottom: spacing.lg,
  },
  privateKeyLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  privateKeyTextContainer: {
    backgroundColor: colors.black,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privateKeyText: {
    color: colors.green,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  privateKeyWarning: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  privateKeyWarningIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  privateKeyWarningText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    flex: 1,
    lineHeight: 18,
  },
  privateKeyButtonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  copyButton: {
    flex: 1,
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  copyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  closePrivateKeyButton: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  closePrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  processingSubtitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
