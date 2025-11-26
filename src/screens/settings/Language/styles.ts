import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export default StyleSheet.create({


  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
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
    color: colors.white70,
    textAlign: 'center',
    lineHeight: spacing.screenPadding,
  },
  languagesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  selectedLanguageItem: {
    borderColor: colors.green,
    backgroundColor: colors.green + '11',
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
    color: colors.white,
    marginBottom: spacing.xs,
  },
  languageNativeName: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
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
    borderColor: colors.white10,
  },
  currentLanguageSection: {
    marginBottom: spacing.xl,
  },
  currentLanguageCard: {
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentLanguageLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  currentLanguageValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
  },
  helpSection: {
    marginBottom: spacing.xl,
  },
  helpTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    lineHeight: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white70,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.green,
  },
  helpButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
    marginLeft: spacing.sm,
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.green + '22',
    borderRadius: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.green + '44',
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.white,
    lineHeight: spacing.lg,
    marginLeft: spacing.sm,
  },
}); 