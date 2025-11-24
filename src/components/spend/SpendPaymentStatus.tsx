/**
 * SPEND Payment Status Component
 * Displays merchant payment status for SPEND orders
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { Split } from '../../services/splits/splitStorageService';
import { SpendPaymentModeService } from '../../services/integrations/spend';
import { SpendMerchantPaymentService } from '../../services/integrations/spend';
import { extractOrderData } from '../../utils/spend/spendDataUtils';

interface SpendPaymentStatusProps {
  split: Split;
  onRetry?: () => void;
}

export const SpendPaymentStatus: React.FC<SpendPaymentStatusProps> = ({
  split,
  onRetry,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!SpendPaymentModeService.requiresMerchantPayment(split)) {
    return null;
  }

  const paymentStatus = SpendPaymentModeService.getPaymentStatus(split);
  const transactionSig = split.externalMetadata?.paymentTransactionSig;
  
  // Extract orderId using centralized utility
  const { orderId } = extractOrderData(split);

  const handleRetry = async () => {
    Alert.alert(
      'Retry Payment',
      'Are you sure you want to retry the payment to SPEND?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          style: 'destructive',
          onPress: async () => {
            setIsRetrying(true);
            try {
              // Get split wallet ID from split
              const { SplitWalletQueries } = await import('@/services/split/SplitWalletQueries');
              const walletResult = await SplitWalletQueries.getSplitWalletByBillId(split.billId);
              
              if (!walletResult.success || !walletResult.wallet) {
                Alert.alert('Error', 'Split wallet not found');
                return;
              }

              const result = await SpendMerchantPaymentService.processMerchantPayment(
                split.id,
                walletResult.wallet.id
              );

              if (result.success) {
                Alert.alert('Success', 'Payment retry initiated successfully');
                onRetry?.();
              } else {
                Alert.alert('Error', result.error || 'Failed to retry payment');
              }
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsRetrying(false);
            }
          },
        },
      ]
    );
  };

  const handleViewTransaction = () => {
    if (!transactionSig) return;

    const explorerUrl = `https://solscan.io/tx/${transactionSig}`;
    Linking.openURL(explorerUrl).catch((err) => {
      console.error('Failed to open transaction explorer:', err);
      Alert.alert('Error', 'Failed to open transaction explorer');
    });
  };

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case 'paid':
        return {
          icon: 'CheckCircle' as const,
          iconColor: colors.green,
          backgroundColor: colors.greenBlue20,
          borderColor: colors.green + '40',
          text: 'Paid to SPEND',
          textColor: colors.green,
        };
      case 'processing':
        return {
          icon: 'CircleDashed' as const,
          iconColor: colors.info,
          backgroundColor: colors.infoBackground,
          borderColor: colors.info + '40',
          text: 'Processing...',
          textColor: colors.info,
        };
      case 'failed':
        return {
          icon: 'XCircle' as const,
          iconColor: colors.error,
          backgroundColor: colors.errorBackground,
          borderColor: colors.error + '40',
          text: 'Payment Failed',
          textColor: colors.error,
        };
      case 'refunded':
        return {
          icon: 'ArrowCounterClockwise' as const,
          iconColor: colors.warning,
          backgroundColor: colors.warningBackground,
          borderColor: colors.warning + '40',
          text: 'Refunded',
          textColor: colors.warning,
        };
      default: // pending
        return {
          icon: 'Clock' as const,
          iconColor: colors.white70,
          backgroundColor: colors.white5,
          borderColor: colors.white10,
          text: 'Pending Payment',
          textColor: colors.white70,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <PhosphorIcon
          name={statusConfig.icon}
          size={18}
          color={statusConfig.iconColor}
          weight="regular"
        />
        <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
          {statusConfig.text}
        </Text>
      </View>

      {orderId && (
        <Text style={styles.orderIdText}>
          Order: {orderId}
        </Text>
      )}

      {transactionSig && (
        <TouchableOpacity
          style={styles.transactionLink}
          onPress={handleViewTransaction}
        >
          <PhosphorIcon
            name="ArrowSquareOut"
            size={14}
            color={colors.info}
            weight="regular"
          />
          <Text style={styles.transactionLinkText}>
            View Transaction
          </Text>
        </TouchableOpacity>
      )}

      {paymentStatus === 'failed' && (
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
        >
          <PhosphorIcon
            name="ArrowClockwise"
            size={14}
            color={colors.white}
            weight="regular"
          />
          <Text style={styles.retryButtonText}>
            {isRetrying ? 'Retrying...' : 'Retry Payment'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  orderIdText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  transactionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.xs,
  },
  transactionLinkText: {
    fontSize: typography.fontSize.xs,
    color: colors.info,
    fontWeight: typography.fontWeight.medium,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    backgroundColor: colors.error,
    marginTop: spacing.xs,
  },
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});

