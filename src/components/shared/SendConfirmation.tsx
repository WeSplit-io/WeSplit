/**
 * SendConfirmation - Réutilisable Send Confirmation Modal Component
 * Modal de confirmation avant l'envoi avec slide to pay
 * 
 * ⚠️ DEPRECATED: This component is deprecated in favor of CentralizedTransactionModal with confirmation flow
 * Still in use in: SpendSplitScreen.tsx
 * Migration: Should be replaced with CentralizedTransactionModal for consistency
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Modal from './Modal';
import AppleSlider from './AppleSlider';
import Avatar from './Avatar';
import { formatAmountWithComma } from '../../utils/ui/format/formatUtils';

export interface SendConfirmationProps {
  visible: boolean;
  onClose: () => void;
  
  // Recipient info
  recipientName: string;
  recipientImageUrl?: string; // Image URL for recipient avatar
  recipientUserId?: string; // User ID for Avatar component (for basic sends)
  recipientUserName?: string; // User name for Avatar component (for basic sends)
  isSplit?: boolean; // Whether this is a split transaction (SP3ND) or basic send
  
  // Amount
  amount: number;
  currency?: string;
  
  // Network fee
  networkFeePercentage?: number; // Default 3%
  showNetworkFee?: boolean; // Default true
  
  // Callback
  onSlideComplete: () => void;
  
  // State
  disabled?: boolean;
  loading?: boolean;
  insufficientFunds?: boolean; // Show insufficient funds message
  
  // Customization
  gradientColors?: string[]; // Custom gradient colors for slider (default: green gradient)
  slideText?: string; // Custom text for slider (default: "Slide to pay")
}

const SendConfirmation: React.FC<SendConfirmationProps> = ({
  visible,
  onClose,
  recipientName,
  recipientImageUrl,
  recipientUserId,
  recipientUserName,
  isSplit = false,
  amount,
  currency = 'USDC',
  networkFeePercentage = 0.03, // 3% by default
  showNetworkFee = true,
  onSlideComplete,
  disabled = false,
  loading = false,
  insufficientFunds = false,
  gradientColors,
  slideText = 'Slide to pay',
}) => {
  // Calculate network fee
  const networkFee = showNetworkFee ? amount * networkFeePercentage : 0;
  const totalPaid = amount + networkFee;

  // Default gradient colors (green)
  const defaultGradientColors = gradientColors || [colors.green, colors.greenBlue];

  // Default recipient image (SP3ND icon) - only for splits
  const defaultRecipientImageUrl = recipientImageUrl || 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-icon.png?alt=media&token=3b2603eb-57cb-4dc6-aafd-0fff463f1579';

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showHandle={true}
      closeOnBackdrop={true}
      maxHeight={500}
    >
      <View style={styles.container}>
        {/* Recipient Avatar */}
        <View style={styles.iconContainer}>
          {isSplit ? (
            // For splits: use SP3ND icon
            <View style={styles.iconCircle}>
              <Image
                source={{ uri: defaultRecipientImageUrl }}
                style={styles.recipientImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            // For basic sends: use Avatar component without border
            <Avatar
              userId={recipientUserId}
              userName={recipientUserName || recipientName}
              avatarUrl={recipientImageUrl}
              size={60}
              showBorder={false}
              showProfileBorder={false}
            />
          )}
        </View>

        {/* "Sending to" Text */}
        <Text style={styles.sendingToText}>Sending to</Text>

        {/* Recipient Name */}
        <Text style={styles.recipientNameText}>{recipientName}</Text>

        {/* Large Amount Display */}
        <Text style={styles.amountDisplay}>
          {formatAmountWithComma(amount)} {currency}
        </Text>

        {/* Network Fee and Total */}
        {showNetworkFee && (
          <View style={styles.feeSection}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>
                Network Fee ({Math.round(networkFeePercentage * 100)}%)
              </Text>
              <Text style={styles.feeAmount}>
                {formatAmountWithComma(networkFee)} {currency}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Total paid</Text>
              <Text style={styles.feeTotal}>
                {formatAmountWithComma(totalPaid)} {currency}
              </Text>
            </View>
          </View>
        )}
{/* Insufficient Funds Message */}
{insufficientFunds && (
          <Text style={styles.insufficientFundsText}>Insufficient funds</Text>
        )}
        {/* Slide to Pay Button */}
        <AppleSlider
          onSlideComplete={onSlideComplete}
          disabled={disabled || loading || amount <= 0}
          loading={loading}
          text={loading ? 'Processing payment...' : slideText}
          style={styles.slideButton}
          gradientColors={defaultGradientColors}
        />
        
        
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 40,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recipientImage: {
    width: 60,
    height: 60,
    borderRadius: 40,
  },
  sendingToText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  recipientNameText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  amountDisplay: {
    fontSize: typography.fontSize.xxxl + typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginVertical: spacing.md,
  },
  feeSection: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
  feeAmount: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotal: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  slideButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  insufficientFundsText: {
    fontSize: typography.fontSize.md,
    color: colors.red,
    textAlign: 'center',
  },
});

export default SendConfirmation;

