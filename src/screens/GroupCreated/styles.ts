import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
    paddingHorizontal: spacing.xl,
  },
  
  // Success Section
  successSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
  },
  
  // Group Preview
  groupPreview: {
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  groupName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
  avatarText: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Sharing Section
  sharingSection: {
    marginBottom: spacing.xl,
  },
  sharingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  shareButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  shareButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.textLightSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Action Buttons
  actionButtons: {
    paddingBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  secondaryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
}); 