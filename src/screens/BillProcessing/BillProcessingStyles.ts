import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  processingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
  processingSteps: {
    alignItems: 'flex-start',
  },
  processingStep: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  proceedButton: {
    padding: spacing.sm,
  },
  proceedButtonText: {
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  billImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  resultsContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  confidenceText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  processingTimeText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailsContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },
  itemsContainer: {
    margin: spacing.lg,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  addButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  addButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemIndex: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: '600',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  itemFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemField: {
    flex: 1,
    minWidth: '50%',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldValue: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '500',
  },
  totalContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: '500',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  finalTotalLabel: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: '600',
  },
  finalTotalValue: {
    fontSize: typography.fontSize.lg,
    color: colors.green,
    fontWeight: '700',
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
});
