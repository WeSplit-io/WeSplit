/**
 * SPEND Payment Modal Component
 * Matches "Send to" screen mockup with keypad, wallet info, and network fees
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from '../shared/PhosphorIcon';
import { AppleSlider } from '../shared';
import { formatAmountWithComma } from '../../utils/spend/formatUtils';
import { formatWalletAddress } from '../../utils/spend/spendDataUtils';
// Network fee is 3% as per mockup

interface SpendPaymentModalProps {
  orderNumber?: string;
  orderId?: string;
  walletAddress?: string;
  amount: number;
  onAmountChange?: (amount: number) => void;
  onSendPress: () => void; // Changed from onSlideComplete to onSendPress
  onWalletChange?: () => void; // Callback for wallet change button
  disabled?: boolean;
  loading?: boolean;
  balance?: number;
  balanceError?: string | null;
  walletName?: string; // Current wallet name
}

const SpendPaymentModal: React.FC<SpendPaymentModalProps> = ({
  orderNumber,
  orderId,
  walletAddress,
  amount: initialAmount,
  onAmountChange,
  onSendPress,
  onWalletChange,
  disabled = false,
  loading = false,
  balance,
  balanceError,
  walletName = 'WeSplit Wallet',
}) => {
  const [amount, setAmount] = useState(initialAmount > 0 ? formatAmountWithComma(initialAmount) : '0');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const amountInputRef = useRef<TextInput>(null);

  // Handle keypad input
  const handleKeypadPress = (value: string) => {
    if (value === '⌫') {
      // Backspace
      setAmount((prev) => {
        const newAmount = prev.slice(0, -1) || '0';
        // Parse with comma replaced by period for calculation
        const numAmount = parseFloat(newAmount.replace(',', '.'));
        if (onAmountChange && !isNaN(numAmount)) {
          onAmountChange(numAmount);
        }
        return newAmount;
      });
    } else if (value === ',') {
      // Decimal separator (comma for European format)
      if (!amount.includes(',') && !amount.includes('.')) {
        const newAmount = amount === '0' ? '0,' : amount + ',';
        setAmount(newAmount);
      } else if (amount.includes('.')) {
        // Convert period to comma if present
        setAmount(amount.replace('.', ','));
      }
    } else {
      // Number
      let newAmount = amount === '0' ? value : amount + value;
      
      // Limit to 2 decimal places (handle both comma and period)
      if (newAmount.includes(',') || newAmount.includes('.')) {
        const separator = newAmount.includes(',') ? ',' : '.';
        const parts = newAmount.split(separator);
        if (parts[1] && parts[1].length > 2) {
          newAmount = parts[0] + separator + parts[1].substring(0, 2);
        }
        // Normalize to comma
        if (separator === '.') {
          newAmount = newAmount.replace('.', ',');
        }
      }
      
      setAmount(newAmount);
      // Parse with comma replaced by period for calculation
      const numAmount = parseFloat(newAmount.replace(',', '.'));
      if (onAmountChange && !isNaN(numAmount)) {
        onAmountChange(numAmount);
      }
    }
  };

  // Calculate network fee (3%)
  // Parse amount with comma replaced by period for calculation
  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const networkFee = numAmount * 0.03; // 3% network fee
  const totalPaid = numAmount + networkFee;

  // Keypad layout
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [',', '0', '⌫'],
  ];

  const displayOrderNumber = orderNumber || orderId || 'N/A';

  return (
    <View style={styles.container}>
      {/* Send to Section */}
      <View style={styles.sendToSection}>
        <Text style={styles.sendToLabel}>Send to</Text>
        <View style={styles.recipientCard}>
          <View style={styles.recipientIcon}>
            <PhosphorIcon name="CurrencyDollar" size={24} color={colors.white} weight="fill" />
          </View>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientOrder}>Order #{displayOrderNumber}</Text>
            {walletAddress && (
              <Text style={styles.recipientAddress}>{formatWalletAddress(walletAddress)}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Amount Input Area */}
      <View style={styles.amountSection}>
        <TextInput
          ref={amountInputRef}
          style={styles.amountInput}
          value={amount}
          onChangeText={(text) => {
            // Allow only numbers and comma
            const cleaned = text.replace(/[^0-9,]/g, '');
            
            // Handle comma as decimal separator
            let newAmount = cleaned;
            if (cleaned.includes(',')) {
              const parts = cleaned.split(',');
              if (parts.length > 2) {
                // Only allow one comma
                newAmount = parts[0] + ',' + parts.slice(1).join('');
              }
              // Limit to 2 decimal places
              if (parts[1] && parts[1].length > 2) {
                newAmount = parts[0] + ',' + parts[1].substring(0, 2);
              }
            }
            
            setAmount(newAmount);
            // Parse with comma replaced by period for calculation
            const numAmount = parseFloat(newAmount.replace(',', '.')) || 0;
            if (onAmountChange && !isNaN(numAmount)) {
              onAmountChange(numAmount);
            }
          }}
          onFocus={() => setIsAmountFocused(true)}
          onBlur={() => setIsAmountFocused(false)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="0"
          placeholderTextColor={colors.white70}
          selectTextOnFocus
          editable={!disabled && !loading}
        />
        <Text style={styles.amountCurrency}>USDC</Text>
        {!showNote && (
          <TouchableOpacity onPress={() => setShowNote(true)} style={styles.addNoteButton}>
            <Text style={styles.addNoteText}>Add note</Text>
          </TouchableOpacity>
        )}
        {showNote && (
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add note"
            placeholderTextColor={colors.white70}
            autoFocus
          />
        )}
      </View>

      {/* Wallet Information */}
      <View style={styles.walletCard}>
        <View style={styles.walletIcon}>
          <PhosphorIcon name="Wallet" size={24} color={colors.white} weight="fill" />
        </View>
        <View style={styles.walletInfo}>
          <Text style={styles.walletName}>{walletName}</Text>
          <Text style={styles.walletBalance}>
            Balance {balance !== undefined ? formatAmountWithComma(balance) : '0,00'} USDC
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.changeButton,
            (!onWalletChange || disabled || loading) && styles.changeButtonDisabled,
          ]}
          onPress={onWalletChange}
          disabled={!onWalletChange || disabled || loading}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.changeButtonText, (!onWalletChange || disabled || loading) && styles.changeButtonTextDisabled]}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Error */}
      {balanceError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{balanceError}</Text>
        </View>
      )}

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

      {/* Keypad removed - using native keyboard */}

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          (disabled || loading || numAmount <= 0) && styles.sendButtonDisabled,
        ]}
        onPress={onSendPress}
        disabled={disabled || loading || numAmount <= 0}
      >
        <Text style={styles.sendButtonText}>
          {loading ? 'Processing...' : 'Send'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sendToSection: {
    gap: spacing.sm,
  },
  sendToLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  recipientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientOrder: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  recipientAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: typography.fontFamily.mono,
  },
  amountSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountInput: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  amountCurrency: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  addNoteButton: {
    marginTop: spacing.sm,
  },
  addNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  noteInput: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white20,
    paddingBottom: spacing.xs,
    minWidth: 100,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.green + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  walletBalance: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  changeButton: {
    backgroundColor: colors.white5,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeButtonDisabled: {
    opacity: 0.5,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  changeButtonTextDisabled: {
    color: colors.white70,
  },
  errorCard: {
    backgroundColor: colors.red + '20',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.red + '40',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.red,
  },
  feeSection: {
    gap: spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  feeAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  feeTotal: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  keypad: {
    gap: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  keypadKey: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.white10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60,
  },
  keypadKeyText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  sendButton: {
    width: '100%',
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.white10,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
});

export default SpendPaymentModal;

