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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatAmountWithComma } from '../../utils/ui/format/formatUtils';

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

  const successIconUrl = 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Ficon-sucess-sp3nd.png?alt=media&token=c52afbe5-3550-4efb-b276-0b5935ebf082';

  return (
    <View style={styles.container}>
      {/* Success Icon */}
      <Image
        source={{ uri: successIconUrl }}
        style={styles.successIcon}
        resizeMode="contain"
      />

      {/* Success Title */}
      <Text style={styles.title}>
        Payment Successful!
      </Text>

      {/* Success Message */}
      <Text style={styles.message}>
        You have successfully paid {formatAmountWithComma(amount)} USDC for your Order #{displayOrderNumber}!
      </Text>

      {/* OK Button with SPEND Gradient */}
      <TouchableOpacity
        style={styles.okButtonContainer}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.spendGradientStart, colors.spendGradientEnd]}
          style={styles.okButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.okButtonText}>
            Done
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
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
    paddingHorizontal: spacing.sm,
  },
  okButtonContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  okButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
});

export default SpendPaymentSuccessModal;

