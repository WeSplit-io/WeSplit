import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
    padding: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
  },
  placeholder: {
    width: spacing.xxl + spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Icon Selection Styles
  iconScrollView: {
    marginBottom: spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelected: {
    borderColor: colors.textLight,
    borderWidth: 3,
  },
  
  // Color Selection Styles
  colorScrollView: {
    marginBottom: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: colors.textLight,
    borderWidth: 3,
  },
  
  // Legacy category styles (keeping for compatibility)
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  catIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.darkBackground,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    width: '30%',
  },
  catIconSelected: {
    borderWidth: spacing.xs / 2,
    borderColor: colors.brandGreen,
    backgroundColor: colors.darkBackground,
  },
  catIconLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.darkGray,
    marginTop: spacing.xs / 2,
  },
  
  // Input Styles
  input: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    marginBottom: spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Members Section
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  addMembersText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.md,
    flex: 1,
  },
  
  // Create Button
  createButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  createButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  
  // Legacy styles (keeping for compatibility)
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
  },
  currencyPicker: {
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  currencyOption: {
    padding: spacing.md,
    borderBottomWidth: spacing.borderWidthThin,
    borderBottomColor: colors.textLight,
  },
  currencyOptionSelected: {
    backgroundColor: colors.brandGreen,
  },
  currencyOptionText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
  },
  currencyOptionTextSelected: {
    color: colors.darkBackground,
    fontWeight: typography.fontWeight.semibold,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  linkText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.md,
  },
  doneBtn: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  doneBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.darkBackground,
  },
  inviteOptions: {
    marginBottom: spacing.md,
  },
  addPhoneBtn: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addPhoneBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.darkBackground,
  },
}); 