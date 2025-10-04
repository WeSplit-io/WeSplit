import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: colors.darkBackground,
    borderTopLeftRadius: spacing.xxl,
    borderTopRightRadius: spacing.xxl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  grabHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.brandGreen,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  segmentTextActive: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  formContent: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    paddingHorizontal: spacing.md,
  },
  textInput: {
    flex: 1,
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    paddingVertical: spacing.md,
  },
  qrButton: {
    padding: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.brandGreen,
  },
  qrButtonText: {
    fontSize: typography.fontSize.sm,
  },
  selectContainer: {
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
  },
  errorText: {
    color: colors.error || '#FF6B6B',
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});
