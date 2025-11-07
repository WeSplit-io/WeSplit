import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({

  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  realtimeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  realtimeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
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
  },
  participantInfo: {
    flex: 1,
    marginLeft: spacing.md,
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  addButtonLong: {
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonTextLong: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
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
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    height: '55%',
    minHeight: 400,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white50,
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
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.white80,
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
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 200,
    justifyContent: 'center',
    minWidth: 140,
  },
  splitOptionSelected: {
    borderColor: colors.white80,
    backgroundColor: colors.white10,
  },
  splitOptionDisabled: {
    opacity: 0.8,
    backgroundColor: colors.white5,
  },

  splitOptionIconImage: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  splitOptionIconText: {
    fontSize: 28,
  },
  splitOptionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  splitOptionDescription: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  riskyModeLabel: {
    position: 'absolute',
    top: 5,
    left: 5,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: colors.green,
  },
  riskyModeIcon: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  riskyModeText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.black,
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
    width: 250,
    height: 250,
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
    width: '100%',
  },
  shareLinkButton: {
    flex: 1,

  },
  shareLinkButtonText: {
    color: colors.white80,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
  },
  doneButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.black,
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
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: '60%',
  },
  privateKeyModalContent: {
    flex: 1,
    paddingTop: spacing.sm,
    justifyContent: 'space-between',
  },
  privateKeyMainContent: {
    flex: 1,
  },
  privateKeyModalTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  privateKeyModalSubtitle: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  privateKeyDisplayContainer: {
    marginBottom: spacing.lg,
  },
  privateKeyLabel: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  privateKeyTextContainer: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  privateKeyText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  privateKeyWarning: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    alignItems: 'flex-start',
  },
  privateKeyWarningIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.md,
    marginTop: 2,
  },
  privateKeyWarningText: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  privateKeyButtonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  copyButton: {
    flex: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  closePrivateKeyButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white5,
  },
  closePrivateKeyButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
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
