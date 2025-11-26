/**
 * SPEND Payment Success Modal Component
 * Displays success confirmation after payment
 * Matches Figma mockup specification
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { formatAmountWithComma } from '../../utils/spend/formatUtils';

interface SpendPaymentSuccessModalProps {
  amount: number;
  orderNumber?: string;
  orderId?: string;
  onClose: () => void;
}

const SpendPaymentSuccessModal: React.FC<SpendPaymentSuccessModalProps> = ({
  amount,
  orderNumber,
  orderId,
  onClose,
}) => {
  const displayOrderNumber = orderNumber || orderId || 'N/A';

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <View style={styles.iconCircle}>
        <PhosphorIcon name="Check" size={48} color={colors.white} weight="bold" />
      </View>

      {/* Success Title */}
      <Text style={styles.title}>
        Payment Successful!
      </Text>

      {/* Success Message */}
      <Text style={styles.message}>
        You have successfully paid {formatAmountWithComma(amount)} USDC for your Order #{displayOrderNumber}!
      </Text>

      {/* OK Button */}
      <TouchableOpacity
        style={styles.okButton}
        onPress={onClose}
      >
        <Text style={styles.okButtonText}>
          OK
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
    lineHeight: typography.fontSize.md * 1.5,
  },
  okButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  okButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
});

export default SpendPaymentSuccessModal;

