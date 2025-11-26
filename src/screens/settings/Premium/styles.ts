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
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
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
    color: colors.white,
    marginBottom: spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.itemSpacing,
    alignItems: 'center',
  },
  featureIcon: {
    width: spacing.xxl + spacing.screenPadding,
    height: spacing.xxl + spacing.screenPadding,
    borderRadius: spacing.iconSize,
    backgroundColor: colors.white10,
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
    color: colors.white,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    lineHeight: spacing.screenPadding,
  },
  featureStatus: {
    marginLeft: spacing.lg,
  },
  comingSoon: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    backgroundColor: colors.green + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs + spacing.xs / 2,
  },
  pricingSection: {
    marginTop: spacing.xxl + spacing.xl,
  },
  pricingCard: {
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.iconSize,
    alignItems: 'center',
  },
  priceTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: spacing.xxl + spacing.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.green,
    marginBottom: spacing.sm,
  },
  priceDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
    lineHeight: spacing.screenPadding,
    marginBottom: spacing.iconSize,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    opacity: 0.5,
  },
  upgradeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
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
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    lineHeight: spacing.screenPadding,
  },
  ctaSection: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.iconSize,
  },
  ctaButton: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ctaButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  disclaimerText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
  // Subscription status styles
  subscriptionStatus: {
    backgroundColor: colors.white70,
    borderRadius: spacing.itemSpacing,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.green,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subscriptionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.green,
    marginLeft: spacing.sm,
  },
  subscriptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  cancellationNotice: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  cancelButton: {
    backgroundColor: colors.white70 + '33',
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  // Plan selection styles
  selectedPricingCard: {
    borderWidth: 2,
    borderColor: colors.green,
  },
  popularPricingCard: {
    borderWidth: 1,
    borderColor: colors.green,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: spacing.lg,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  popularBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  savings: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
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
    backgroundColor: colors.white70,
    borderRadius: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  selectedPaymentMethod: {
    borderColor: colors.green,
    backgroundColor: colors.green + '11',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.white,
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
    color: colors.white70,
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
    color: colors.white70,
    textDecorationLine: 'underline',
  },
}); 