import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

export default StyleSheet.create({

  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl + spacing.xl,
  },
  heroTitle: {
    fontSize: spacing.iconSize,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: spacing.iconSize,
  },
  featuresSection: {
    marginTop: spacing.xxl + spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.itemSpacing,
    alignItems: 'center',
  },
  featureIcon: {
    width: spacing.xxl + spacing.screenPadding,
    height: spacing.xxl + spacing.screenPadding,
    borderRadius: spacing.iconSize,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    lineHeight: spacing.screenPadding,
  },
  featureStatus: {
    marginLeft: spacing.lg,
  },
  comingSoon: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
    backgroundColor: colors.brandGreen + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs + spacing.xs / 2,
  },
  pricingSection: {
    marginTop: spacing.xxl + spacing.xl,
  },
  pricingCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.iconSize,
    alignItems: 'center',
  },
  priceTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: spacing.xxl + spacing.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.brandGreen,
    marginBottom: spacing.sm,
  },
  priceDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: spacing.screenPadding,
    marginBottom: spacing.iconSize,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    opacity: 0.5,
  },
  upgradeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.darkBackground,
    marginLeft: spacing.sm,
  },
  // Additional comprehensive styles
  benefitsList: {
    marginTop: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  benefitIcon: {
    width: spacing.iconSize,
    height: spacing.iconSize,
    borderRadius: spacing.itemSpacing,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textLight,
    lineHeight: spacing.screenPadding,
  },
  ctaSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.iconSize,
  },
  ctaButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ctaButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.darkBackground,
  },
  disclaimerText: {
    fontSize: typography.fontSize.xs,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
  // Subscription status styles
  subscriptionStatus: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscriptionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brandGreen,
    marginLeft: spacing.sm,
  },
  subscriptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  cancellationNotice: {
    fontSize: typography.fontSize.xs,
    color: colors.darkGray,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  cancelButton: {
    backgroundColor: colors.darkGray + '33',
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    fontWeight: typography.fontWeight.medium,
  },
  // Plan selection styles
  selectedPricingCard: {
    borderWidth: 2,
    borderColor: colors.brandGreen,
  },
  popularPricingCard: {
    borderWidth: 1,
    borderColor: colors.brandGreen,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: spacing.lg,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  popularBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.darkBackground,
  },
  savings: {
    fontSize: typography.fontSize.xs,
    color: colors.brandGreen,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  // Payment method styles
  paymentSection: {
    marginTop: spacing.xl,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPaymentMethod: {
    borderColor: colors.brandGreen,
    backgroundColor: colors.brandGreen + '11',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.md,
  },
  // Subscribe section styles
  subscribeSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Restore button styles
  restoreButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.darkGray,
    textDecorationLine: 'underline',
  },
}); 