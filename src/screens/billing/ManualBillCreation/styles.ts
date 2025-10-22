import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({

  content: {
    flex: 1,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    height: spacing.buttonHeight,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    marginHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radiusSm,
    
  },
  categoryText: {
    ...typography.textStyles.buttonSmall,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: colors.white,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    tintColor: colors.white50,
  },
  categoryIconSelected: {
    tintColor: colors.black,
    width: 24,
    height: 24,
  },
  textInput: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    color: colors.white,
    fontSize: typography.fontSize.md,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
    textAlignVertical: 'center',
    paddingBottom: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    ...typography.textStyles.caption,
    marginTop: spacing.xs,
  },
  dateInput: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
  },
  dateText: {
    color: colors.white,
    ...typography.textStyles.body,
  },
  calendarIcon: {
    width: spacing.iconSizeSmall,
    height: spacing.iconSizeSmall,
    tintColor: colors.white50,
  },
  amountContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    color: colors.white,
    ...typography.textStyles.body,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    height: spacing.inputHeight,
    textAlignVertical: 'center',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  currencyButton: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.inputPaddingHorizontal,
    paddingVertical: spacing.inputPaddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
    minWidth: 100,
    height: spacing.inputHeight,
  },
  currencyText: {
    color: colors.white,
    ...typography.textStyles.body,
    marginRight: spacing.xs,
  },
  dropdownIcon: {
    color: colors.textLightSecondary,
    fontSize: spacing.iconSizeSmall,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  totalLabel: {
    ...typography.textStyles.label,
    color: colors.white,
  },
  totalValueContainer: {
    alignItems: 'flex-end',
  },
  totalValue: {
    ...typography.textStyles.amountMedium,
    color: colors.green,
  },
  totalValuePlaceholder: {
    ...typography.textStyles.body,
    color: colors.textLightSecondary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  continueButton: {
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: spacing.buttonPaddingVertical,
    alignItems: 'center',
    justifyContent: 'center',
    height: spacing.buttonHeight,
  },
  buttonText: {
    ...typography.textStyles.button,
    color: colors.black,
    
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.blackOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.blackWhite5,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.textStyles.h6,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  currencyOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.radiusSm,
    marginBottom: spacing.sm,
  },
  currencyOptionSelected: {
    backgroundColor: colors.green + '20',
  },
  currencyOptionText: {
    ...typography.textStyles.body,
    color: colors.white,
  },
  modalCloseButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCloseText: {
    ...typography.textStyles.body,
    color: colors.textLightSecondary,
  },
  datePickerModalContent: {
    backgroundColor: colors.blackWhite5,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  datePickerCloseButton: {
    backgroundColor: colors.white5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
  },
  datePickerCloseText: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,

  },
  datePicker: {
    width: '100%',
    height: 250,
    backgroundColor: 'transparent',
  },
});

