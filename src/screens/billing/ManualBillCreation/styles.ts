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
    fontWeight: typography.fontWeight.regular,
    color: colors.white80,
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


  dateText: {
    color: colors.white,
    ...typography.textStyles.body,
  },

  amountContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
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
    gap: spacing.sm,
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

  /** ================================ Total Styles ================================ */
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white,
  },
  totalValueContainer: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
  },
  totalValuePlaceholder: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
  },

  /** ================================ Button Styles ================================ */

  buttonContainer: {
    paddingVertical: spacing.md,
  },


  /** ================================ Currency Picker Modal Styles ================================ */
  currencyOption: {
    padding: spacing.md,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
  },
  currencyOptionSelected: {
    backgroundColor: colors.white5,
  },
  currencyOptionText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },

    /** ================================ Date Picker Modal Styles ================================ */

  datePickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  datePicker: {
    width: '100%',
    height: 250,
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
});

