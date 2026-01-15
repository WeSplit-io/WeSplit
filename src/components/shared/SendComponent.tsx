/**
 * SendComponent - Réutilisable Send Component
 * Composant réutilisable pour l'écran d'envoi avec clavier numérique
 * 
 * ⚠️ DEPRECATED: This component is deprecated in favor of CentralizedTransactionModal/CentralizedTransactionScreen
 * Still in use in: SpendSplitScreen.tsx
 * Migration: Should be replaced with CentralizedTransactionModal for consistency
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  address?: string; // Wallet on-chain address for display
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

  // Network fee
  networkFee?: number;
  totalPaid?: number;
  showNetworkFee?: boolean;

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
  showRecipientChange = false,
  amount,
  onAmountChange,
  currency = 'USDC',
  note,
  onNoteChange,
  showAddNote = true,
  wallet,
  onWalletChange,
  showWalletChange = false,
  networkFee,
  totalPaid,
  showNetworkFee = false,
  onSendPress,
  sendButtonDisabled = false,
  sendButtonLoading = false,
  sendButtonTitle = 'Send',
  sendButtonGradientColors,
  containerStyle,
}) => {
  const [showNoteInput, setShowNoteInput] = useState(!!note);
  const amountInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Auto-focus amount input to open keyboard by default
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const formatBalance = (balance: number): string => {
    return balance.toFixed(2).replace('.', ',');
  };

  const isAmountValid = amount.length > 0 && parseFloat(amount.replace(',', '.')) > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.contentWrapper}>
        {/* Send to Section */}
        <View style={styles.sendToSection}>
        <View style={styles.sendToHeader}>
          <Text style={styles.sendToLabel}>
            {recipient.name === 'Your Personal Wallet' ? 'Withdraw to' : 'Send to'}
          </Text>
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
          ref={amountInputRef}
          style={styles.amountInput}
          value={amount}
          placeholder="0"
          placeholderTextColor={colors.white70}
          textAlign="center"
          selectionColor={colors.green}
          maxLength={12}
          returnKeyType="done"
          blurOnSubmit={true}
          keyboardType="numeric"
          editable={true}
          onChangeText={handleAmountTextChange}
          autoFocus={true}
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

      <View style={styles.middleSection}>
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

        {/* Network Fee and Total - Between wallet and send button */}
        {showNetworkFee && networkFee !== undefined && totalPaid !== undefined && (
          <View style={styles.feeSection}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network Fee (3%)</Text>
              <Text style={styles.feeAmount}>
                {formatBalance(networkFee)} {currency}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Total paid</Text>
              <Text style={styles.feeTotal}>
                {formatBalance(totalPaid)} {currency}
              </Text>
            </View>
          </View>
        )}
      </View>
      </View>

      {/* Send Button - Fixed at bottom */}
      <View style={[styles.sendButtonContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
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
    position: 'relative',
    minHeight: '100%',
    padding: spacing.sm,
    paddingBottom: 0,
  },
  contentWrapper: {
    minHeight: '100%',
    paddingBottom: 120, // Space for button + safe area
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
    gap: spacing.sm,
    marginVertical: spacing.xl,
    justifyContent: 'center',
    minHeight: 200,
  },
  amountInput: {
    fontSize: (typography.fontSize.xxl + typography.fontSize.xxl) * 1.5,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    minWidth: 200,
    padding: spacing.md,
    margin: 0,
    minHeight: 80,
  },
  amountCurrency: {
    fontSize: typography.fontSize.lg,
    color: colors.white70,
    marginTop: spacing.xs,
  },
  addNoteButton: {
    marginTop: spacing.xs,
  },
  addNoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
  },
  noteInput: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.white,
    textAlign: 'center',
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
  middleSection: {
    gap: spacing.md,
  },
  sendButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.blackWhite5, // ✅ FIX: Match modal background instead of darker black
  },
  sendButton: {
    marginTop: 0,
    width: '100%',
  },
  feeSection: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
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
});

export default SendComponent;

