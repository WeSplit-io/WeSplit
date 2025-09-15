import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.black,
    position: 'relative',
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    color: colors.textLight,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textLight,
    marginTop: spacing.md,
  },
  providerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white50,
    marginBottom: spacing.sm,
  },
  providerButtonDisabled: {
    opacity: 0.5,
  },
  providerInfo: {
    flex: 1,
  },
  providerInfoHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  walletLogoContainer: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  providerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  detectedBadge: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  detectedText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  providerUnavailable: {
    color: colors.textLightSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textLightSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  debugButton: {
    padding: 8,
    backgroundColor: colors.primaryGreen,
    borderRadius: 6,
    marginLeft: 8,
  },
  debugButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Debug styles
  debugContainer: {
    backgroundColor: colors.gray800,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
  },
  debugText: {
    color: colors.primaryGreen,
    fontSize: 12,
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
  },
  sectionContainer: {
    marginVertical: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  alternativeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alternativeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  alternativeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
}); 