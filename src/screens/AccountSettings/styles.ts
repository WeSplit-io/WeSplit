import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.lg,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    backgroundColor: colors.darkBackground,
  },
  
  // Profile Picture
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 170,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 170,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    width: 48,
    height: 48,
    tintColor: colors.white70,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: spacing.md,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white,
  },
  
  // Input Groups
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  
  // Delete Account Button
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  deleteAccountText: {
    color: '#FF6B6B',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },
  
  // Save Button
  gradientButton: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButtonTextDisabled: {
    color: colors.white50,
  },
}); 