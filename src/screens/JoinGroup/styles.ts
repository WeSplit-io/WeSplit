import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  
  // Input Section
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  input: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    textAlign: 'center',
    letterSpacing: 2,
  },
  
  // Buttons
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  scanButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryGreen,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  joinButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  joinButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textDark,
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.darkBorder,
  },
  dividerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginHorizontal: spacing.lg,
  },
  
  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  createButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
}); 