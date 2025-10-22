import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({


  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.iconSize,
  },
  descriptionSection: {
    paddingVertical: spacing.xl,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: spacing.screenPadding,
  },
  languagesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedLanguageItem: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.brandGreen + '11',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: spacing.iconSize,
    marginRight: spacing.lg,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  languageNativeName: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
  },
  languageAction: {
    marginLeft: spacing.md,
  },
  selectedIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  currentLanguageSection: {
    marginBottom: spacing.xl,
  },
  currentLanguageCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentLanguageLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
  },
  currentLanguageValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
  },
  helpSection: {
    marginBottom: spacing.xl,
  },
  helpTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    lineHeight: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  helpButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.brandGreen,
    marginLeft: spacing.sm,
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.brandGreen + '22',
    borderRadius: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brandGreen + '44',
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    lineHeight: spacing.lg,
    marginLeft: spacing.sm,
  },
}); 