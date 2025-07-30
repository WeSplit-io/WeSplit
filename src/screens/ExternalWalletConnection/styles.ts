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
}); 