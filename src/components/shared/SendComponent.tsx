/**
 * SendComponent - Réutilisable Send Component
 * Composant réutilisable pour l'écran d'envoi avec clavier numérique
 * 
 * ⚠️ DEPRECATED: This component is deprecated in favor of CentralizedTransactionModal/CentralizedTransactionScreen
 * Still in use in: SpendSplitScreen.tsx
 * Migration: Should be replaced with CentralizedTransactionModal for consistency
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
} from 'react-native';
import Button from './Button';
import PhosphorIcon, { PhosphorIconName } from './PhosphorIcon';
import Avatar from './Avatar';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface RecipientInfo {
  name: string;
  address?: string;
  avatarUrl?: string;
  userId?: string;
  icon?: PhosphorIconName;
  iconColor?: string;
  imageUrl?: string; // Direct image URL for logos/external images
}

export interface WalletInfo {
  name: string;
  balance: number;
  balanceFormatted?: string;
  icon?: PhosphorIconName;
  iconColor?: string;
  imageUrl?: string; // Direct image URL for logos/external images
}

interface SendComponentProps {
  // Recipient
  recipient: RecipientInfo;
  onRecipientChange?: () => void;
  showRecipientChange?: boolean;

  // Amount
  amount: string;
  onAmountChange: (amount: string) => void;
  currency?: string;

  // Note
  note?: string;
  onNoteChange?: (note: string) => void;
  showAddNote?: boolean;

  // Wallet
  wallet: WalletInfo;
  onWalletChange?: () => void;
  showWalletChange?: boolean;

  // Send button
  onSendPress: () => void;
  sendButtonDisabled?: boolean;
  sendButtonLoading?: boolean;
  sendButtonTitle?: string;
  sendButtonGradientColors?: string[]; // Custom gradient colors for send button

  // Optional styling
  containerStyle?: any;
}

const SendComponent: React.FC<SendComponentProps> = ({
  recipient,
  onRecipientChange,
  showRecipientChange = true,
  amount,
  onAmountChange,
  currency = 'USDC',
  note,
  onNoteChange,
  showAddNote = true,
  wallet,
  onWalletChange,
  showWalletChange = true,
  onSendPress,
  sendButtonDisabled = false,
  sendButtonLoading = false,
  sendButtonTitle = 'Send',
  sendButtonGradientColors,
  containerStyle,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(!!note);

  const handleAmountTextChange = (text: string) => {
    // Allow only numbers and comma/period
    let cleaned = text.replace(/[^0-9,.]/g, '');

    // Handle comma as decimal separator
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // If both, keep the last one
      const lastComma = cleaned.lastIndexOf(',');
      const lastPeriod = cleaned.lastIndexOf('.');
      if (lastComma > lastPeriod) {
        cleaned = cleaned.replace(/\./g, '');
      } else {
        cleaned = cleaned.replace(/,/g, '');
        cleaned = cleaned.replace('.', ',');
      }
    } else if (cleaned.includes('.')) {
      // Convert period to comma
      cleaned = cleaned.replace('.', ',');
    }

    // Prevent multiple commas
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }

    onAmountChange(cleaned);
  };

  const handleKeypadPress = (value: string) => {
    if (value === 'backspace') {
      // Backspace
      const newAmount = amount.slice(0, -1) || '0';
      onAmountChange(newAmount);
    } else if (value === 'clear') {
      // Clear all
      onAmountChange('0');
    } else if (value === ',') {
      // Decimal separator (comma)
      if (!amount.includes(',') && !amount.includes('.')) {
        const newAmount = amount === '0' ? '0,' : amount + ',';
        onAmountChange(newAmount);
      } else if (amount.includes('.')) {
        // Convert period to comma if present
        onAmountChange(amount.replace('.', ','));
      }
    } else {
      // Number - handle pre-filled amounts intelligently
      let newAmount;

      // If amount is '0' or empty, replace with the digit
      if (amount === '0' || amount === '') {
        newAmount = value;
      }
      // If amount ends with ',00' (formatted default amount like "33,00"), replace it
      else if (amount.match(/^\d+,\d{2}$/)) {
        // This is a formatted amount like "33,00" - replace with new digit
        newAmount = value;
      }
      // Otherwise, append the digit
      else {
        newAmount = amount + value;
      }

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

      onAmountChange(newAmount);
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const formatBalance = (balance: number): string => {
    return balance.toFixed(2).replace('.', ',');
  };

  // Keypad layout
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [',', '0', 'backspace'],
  ];

  const isAmountValid = amount.length > 0 && parseFloat(amount.replace(',', '.')) > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Send to Section */}
      <View style={styles.sendToSection}>
        <View style={styles.sendToHeader}>
          <Text style={styles.sendToLabel}>Send to</Text>
          {showRecipientChange && onRecipientChange && (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={onRecipientChange}
              activeOpacity={0.7}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.recipientCard}>
          {recipient.imageUrl ? (
            <Image
              source={{ uri: recipient.imageUrl }}
              style={styles.recipientImage}
              resizeMode="contain"
            />
          ) : recipient.avatarUrl || recipient.userId ? (
            <Avatar
              userId={recipient.userId}
              userName={recipient.name}
              size={48}
              avatarUrl={recipient.avatarUrl}
              style={styles.recipientAvatar}
            />
          ) : recipient.icon ? (
            <View style={[styles.recipientIcon, { backgroundColor: (recipient.iconColor || colors.green) + '30' }]}>
              <PhosphorIcon
                name={recipient.icon}
                size={24}
                color={colors.white}
                weight="fill"
              />
            </View>
          ) : (
            <View style={styles.recipientIcon}>
              <PhosphorIcon
                name="User"
                size={24}
                color={colors.white}
                weight="fill"
              />
            </View>
          )}
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{recipient.name}</Text>
            {recipient.address && (
              <Text style={styles.recipientAddress}>
                {formatWalletAddress(recipient.address)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Amount Input Section */}
      <View style={styles.amountSection}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          placeholder="0"
          placeholderTextColor={colors.white70}
          textAlign="center"
          selectionColor={colors.green}
          maxLength={12}
          returnKeyType="done"
          blurOnSubmit={true}
          editable={false}
          showSoftInputOnFocus={false}
          pointerEvents="none"
        />
        <Text style={styles.amountCurrency}>{currency}</Text>

        {showAddNote && !showNoteInput && (
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => setShowNoteInput(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addNoteText}>Add note</Text>
          </TouchableOpacity>
        )}


        {showAddNote && showNoteInput && onNoteChange && (
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={onNoteChange}
            placeholder="Add note"
            placeholderTextColor={colors.white50}
            maxLength={100}
            returnKeyType="done"
            blurOnSubmit={true}
            showSoftInputOnFocus={false}
          />
        )}
      </View>

      <View style={styles.sendContainerBottom}>

        {/* Wallet Information */}
        <View style={styles.walletCard}>
          {wallet.imageUrl ? (
            <Image
              source={{ uri: wallet.imageUrl }}
              style={styles.walletImage}
              resizeMode="contain"
            />
          ) : wallet.icon ? (
            <View style={[styles.walletIcon, { backgroundColor: (wallet.iconColor || colors.green) + '30' }]}>
              <PhosphorIcon
                name={wallet.icon}
                size={24}
                color={colors.white}
                weight="fill"
              />
            </View>
          ) : (
            <View style={styles.walletIcon}>
              <PhosphorIcon
                name="Wallet"
                size={24}
                color={colors.white}
                weight="fill"
              />
            </View>
          )}
          <View style={styles.walletInfo}>
            <Text style={styles.walletName}>{wallet.name}</Text>
            <Text style={styles.walletBalance}>
              Balance {wallet.balanceFormatted || formatBalance(wallet.balance)} {currency}
            </Text>
          </View>
          {showWalletChange && onWalletChange && (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={onWalletChange}
              activeOpacity={0.7}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypadContainer}>
          {keypadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.keypadButton}
                  onPress={() => handleKeypadPress(key)}
                  onLongPress={key === 'backspace' ? () => onAmountChange('0') : undefined}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {key === 'backspace' ? (
                    <PhosphorIcon
                      name="ArrowLeft"
                      size={20}
                      color={colors.white}
                      weight="bold"
                    />
                  ) : key === 'clear' ? (
                    <PhosphorIcon
                      name="X"
                      size={20}
                      color={colors.white}
                      weight="bold"
                    />
                  ) : (
                    <Text style={styles.keypadButtonText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Send Button */}
        <Button
          title={sendButtonTitle}
          onPress={onSendPress}
          variant="primary"
          disabled={sendButtonDisabled || !isAmountValid}
          loading={sendButtonLoading}
          fullWidth={true}
          style={styles.sendButton}
          gradientColors={sendButtonGradientColors}
        />
      </View>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  sendToSection: {
    gap: spacing.sm,
  },
  sendToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sendToLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.white70,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
  },
  recipientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: 2,
  },
  recipientAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontFamily: typography.fontFamily.mono,
  },
  amountSection: {
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginVertical: spacing.lg,
  },
  amountInput: {
    fontSize: typography.fontSize.xxl + typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    minWidth: 100,
    padding: 0,
    margin: 0,
  },
  amountCurrency: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
  addNoteButton: {
    marginTop: spacing.xs,
  },
  addNoteText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  noteInput: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.white,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white50,
    paddingBottom: spacing.xs / 2,
    minWidth: 100,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    gap: spacing.sm,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.green + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletImage: {
    width: 40,
    height: 40,
    borderRadius: spacing.radiusSm,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: 2,
  },
  walletBalance: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  changeButton: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  keypadContainer: {
    gap: spacing.xs,
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  keypadButton: {
    flex: 1,
    backgroundColor: colors.white10,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
  },
  keypadButtonText: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  sendButton: {
    marginTop: spacing.sm,
  },
  sendContainerBottom: {
    gap: spacing.md,
  },
});

export default SendComponent;

