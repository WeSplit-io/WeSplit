/**
 * SPEND Payment Confirmation Modal Component
 * Shows payment confirmation before sliding to pay
 * Matches Figma mockup (Image 3)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { AppleSlider } from '../shared';
import { formatAmountWithComma } from '../../utils/spend/formatUtils';

interface SpendPaymentConfirmationModalProps {
  orderNumber?: string;
  orderId?: string;
  amount: number;
  onSlideComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const SpendPaymentConfirmationModal: React.FC<SpendPaymentConfirmationModalProps> = ({
  orderNumber,
  orderId,
  amount,
  onSlideComplete,
  disabled = false,
  loading = false,
}) => {
  // Calculate network fee (3%)
  const networkFee = amount * 0.03;
  const totalPaid = amount + networkFee;

  const displayOrderNumber = orderNumber || orderId || 'N/A';

  return (
    <View style={styles.container}>
      {/* Teal Circle with Dollar Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <PhosphorIcon name="CurrencyDollar" size={48} color={colors.white} weight="fill" />
        </View>
      </View>

      {/* "Sending to" Text */}
      <Text style={styles.sendingToText}>Sending to</Text>

      {/* Order Number */}
      <Text style={styles.orderNumberText}>Order #{displayOrderNumber}</Text>

      {/* Large Amount Display */}
      <Text style={styles.amountDisplay}>{formatAmountWithComma(amount)} USDC</Text>

      {/* Network Fee and Total */}
      <View style={styles.feeSection}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Network Fee (3%)</Text>
          <Text style={styles.feeAmount}>{formatAmountWithComma(networkFee)} USDC</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Total paid</Text>
          <Text style={styles.feeTotal}>{formatAmountWithComma(totalPaid)} USDC</Text>
        </View>
      </View>

      {/* Slide to Pay Button */}
      <AppleSlider
        onSlideComplete={onSlideComplete}
        disabled={disabled || loading || amount <= 0}
        loading={loading}
        text={loading ? 'Processing payment...' : 'Slide to pay'}
        style={styles.slideButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.greenBlue, // Teal color per specification
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingToText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  orderNumberText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  amountDisplay: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginVertical: spacing.md,
  },
  feeSection: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotal: {
    fontSize: typography.fontSize.lg,
    color: colors.textLight,
    fontWeight: typography.fontWeight.bold,
  },
  slideButton: {
    width: '100%',
    marginTop: spacing.md,
  },
});

export default SpendPaymentConfirmationModal;

