import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({

  content: {
    flex: 1, 
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.textStyles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  selectedContactRow: {
    borderColor: colors.primaryGreen,
    backgroundColor: colors.primaryGreenAlpha,
  },
  avatar: {
    width: spacing.xxl + spacing.screenPadding,
    height: spacing.xxl + spacing.screenPadding,
    borderRadius: spacing.iconSize,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.textStyles.body,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  contactEmail: {
    ...typography.textStyles.caption,
    color: colors.darkGray,
    marginTop: spacing.xs / 2,
  },
  amountContainer: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.screenPadding,
    padding: spacing.xl,
    marginVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  currencySymbol: {
    fontSize: spacing.iconSize,
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  amountInput: {
    fontSize: spacing.xxl + spacing.xxxl,
    color: colors.primaryGreen,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    minWidth: 200,
  },
  descriptionContainer: {
    marginVertical: spacing.lg,
  },
  descriptionLabel: {
    ...typography.textStyles.body,
    color: colors.textLight,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  descriptionInput: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.itemSpacing,
    padding: spacing.md,
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    textAlignVertical: 'top',
  },
  confirmationCard: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.screenPadding,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmationLabel: {
    ...typography.textStyles.body,
    color: colors.darkGray,
  },
  confirmationValue: {
    ...typography.textStyles.body,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: spacing.borderWidthThin,
    borderTopColor: colors.textLight,
  },
  totalLabel: {
    ...typography.textStyles.h3,
    color: colors.textLight,
  },
  totalAmount: {
    ...typography.textStyles.h3,
    color: colors.primaryGreen,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successIcon: {
    width: spacing.xxl + spacing.xxxl,
    height: spacing.xxl + spacing.xxxl,
    borderRadius: spacing.xxl + spacing.screenPadding,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successMessage: {
    ...typography.textStyles.body,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: spacing.iconSize,
  },
  actionButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
    minWidth: '80%',
  },
  actionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
    minWidth: '80%',
  },
  secondaryButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  disabledButton: {
    backgroundColor: colors.darkGray,
    opacity: 0.6,
  },
  disabledButtonText: {
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  balanceText: {
    ...typography.textStyles.caption,
    color: colors.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  feesLabel: {
    ...typography.textStyles.caption,
    color: colors.textSecondary,
  },
  feesValue: {
    ...typography.textStyles.caption,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  


  // === REQUEST AMOUNT CARD STYLES (matching SendAmountScreen) ================================
  requestRecipientAvatarContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
  },
  requestRecipientAvatar: {
    width: 70,
    height: 70,
    borderRadius: spacing.xxl + spacing.lg,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  requestRecipientAvatarText: {
    color: colors.black,
    fontSize: 25,
    fontWeight: typography.fontWeight.bold,
  },
  requestRecipientName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  requestRecipientEmail: {
    color: colors.white70,
    fontSize: 14,
  },
  requestAmountCardMockup: {
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
  },
  requestAmountCardHeader: {
    alignItems: 'center',
    backgroundColor: colors.white5,
    padding: 24,
    width: '100%',
  },
  requestAmountCardLabel: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  requestAmountCardInput: {
    color: colors.white,
    fontSize: 50,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    minWidth: 120,
    marginBottom: 10,
  },
  requestAmountCardCurrency: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  requestAmountCardAddNoteRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
  },
  requestAmountCardAddNoteText: {
    color: colors.white50,
    fontSize: 15,
    marginLeft: 8,
  },
  requestAmountCardContinueButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: spacing.md,
    paddingTop: 8,
    alignItems: 'center',
    borderTopWidth: 0,
  },


  // === REQUEST SUCCESS STYLES (matching SendSuccessScreen) ================================
  mockupSuccessContainer: {
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
    objectFit: 'contain',
  },
  mockupSuccessTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mockupSuccessDescription: {
    color: colors.white70,
    fontSize: 16,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  mockupSuccessDate: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  mockupBackHomeButton: {
    width: '100%',
    marginBottom: spacing.md,
  },

}); 