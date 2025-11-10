import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  processingSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  processingMethod: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  // New styles for the redesigned form
  cameraButton: {
    padding: spacing.sm,
  },
  cameraButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  categoryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonSelected: {
    borderColor: colors.green,
    backgroundColor: colors.green + '20',
  },
  categoryIcon: {
    fontSize: 24,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.white,
  },
  calendarButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  calendarIcon: {
    fontSize: typography.fontSize.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.white,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  currencyText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    marginRight: spacing.xs,
  },
  dropdownIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  totalDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  totalAmount: {
    fontSize: typography.fontSize.lg,
    color: colors.green,
    fontWeight: '700',
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textLight,
  },
});
