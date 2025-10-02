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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl, // Add bottom padding for phone UI
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitleContainer: {
    marginBottom: spacing.xl,
  },
  resultTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.green,
  },
  winnerAvatar: {
    backgroundColor: colors.green,
    borderColor: colors.orange,
  },
  avatarText: {
    fontSize: 48,
  },
  amountContainer: {
    marginBottom: spacing.xl,
  },
  amountText: {
    color: colors.red,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  winnerAmountText: {
    color: colors.green,
  },
  messageContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  messageText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  paymentOptionsContainer: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg, // Extra padding for phone UI elements
  },
  paymentButton: {
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  settlePaymentButton: {
    backgroundColor: colors.surface,
  },
  payWithKastButton: {
    backgroundColor: colors.green,
  },
  paymentButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  settlePaymentButtonText: {
    color: colors.white,
  },
  payWithKastButtonText: {
    color: colors.white,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
});
