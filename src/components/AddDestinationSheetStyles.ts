import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#121D1F',
    borderTopLeftRadius: spacing.xxl,
    borderTopRightRadius: spacing.xxl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
    minHeight: 500,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  grabHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
    
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.brandGreen,
  },
  segmentText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  segmentTextActive: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  formContent: {
    marginBottom: spacing.md,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  inputField: {
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    height: 50,
    marginBottom: spacing.sm,
    minHeight: 50,
  },
  errorText: {
    color: colors.error || '#FF6B6B',
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  modalActions: {
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  saveButtonDisabled: {
    backgroundColor: colors.white10,
  },
  saveButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButtonTextDisabled: {
    color: colors.textSecondary,
  },
});
