/**
 * Unified QR Code View Component
 * Maintains existing visual styling while using Solana Pay URIs
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@theme';
import { shareAddress, copyToClipboard } from './share';
import { createUsdcRequestUri, createAddressQr } from './solanaPay';

export interface QrCodeViewProps {
  // QR Code content
  value: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
  
  // Display options
  caption?: string;
  subtext?: string;
  showAddress?: boolean;
  showButtons?: boolean;
  
  // Address display
  address?: string;
  addressLabel?: string;
  
  // Button options
  showCopyButton?: boolean;
  showShareButton?: boolean;
  copyButtonText?: string;
  shareButtonText?: string;
  
  // Solana Pay options
  useSolanaPay?: boolean;
  amount?: number;
  label?: string;
  message?: string;
  reference?: string;
  
  // Styling
  containerStyle?: ViewStyle;
  qrContainerStyle?: ViewStyle;
  textStyle?: TextStyle;
  buttonStyle?: ViewStyle;
  buttonTextStyle?: TextStyle;
  
  // Callbacks
  onCopy?: (text: string) => void;
  onShare?: (text: string) => void;
}

const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 200,
  backgroundColor = colors.white,
  color = colors.black,
  caption,
  subtext,
  showAddress = true,
  showButtons = true,
  address,
  addressLabel = 'Wallet Address',
  showCopyButton = true,
  showShareButton = true,
  copyButtonText = 'Copy',
  shareButtonText = 'Share',
  useSolanaPay = false,
  amount,
  label,
  message,
  reference,
  containerStyle,
  qrContainerStyle,
  textStyle,
  buttonStyle,
  buttonTextStyle,
  onCopy,
  onShare,
}) => {
  // Generate the appropriate QR value
  const getQrValue = (): string => {
    if (useSolanaPay && address) {
      return createUsdcRequestUri({
        recipient: address,
        amount,
        label,
        message,
        reference
      });
    }
    return value;
  };

  // Handle copy action
  const handleCopy = async () => {
    const textToCopy = address || value;
    const success = await copyToClipboard(textToCopy);
    
    if (onCopy) {
      onCopy(textToCopy);
    }
    
    if (success) {
      // You can add a toast notification here if you have one
      console.log('Copied to clipboard:', textToCopy);
    }
  };

  // Handle share action
  const handleShare = async () => {
    const shareText = address || value;
    const success = await shareAddress({
      address: shareText,
      uri: getQrValue(),
      message: message || `Send USDC to: ${shareText}`,
      title: 'Share Wallet Address'
    });
    
    if (onShare) {
      onShare(shareText);
    }
    
    if (success) {
      console.log('Shared:', shareText);
    }
  };

  const qrValue = getQrValue();
  const displayAddress = address || value;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Caption */}
      {caption && (
        <Text style={[styles.caption, textStyle]}>
          {caption}
        </Text>
      )}
      
      {/* QR Code Container */}
      <View style={[styles.qrContainer, qrContainerStyle]}>
        <QRCode
          value={qrValue}
          size={size}
          backgroundColor={backgroundColor}
          color={color}
        />
      </View>
      
      {/* Subtext */}
      {subtext && (
        <Text style={[styles.subtext, textStyle]}>
          {subtext}
        </Text>
      )}
      
      {/* Address Display */}
      {showAddress && displayAddress && (
        <View style={styles.addressContainer}>
          <Text style={[styles.addressLabel, textStyle]}>
            {addressLabel}
          </Text>
          <Text style={[styles.addressValue, textStyle]} numberOfLines={2} ellipsizeMode="middle">
            {displayAddress}
          </Text>
        </View>
      )}
      
      {/* Action Buttons */}
      {showButtons && (
        <View style={styles.buttonContainer}>
          {showCopyButton && (
            <TouchableOpacity
              style={[styles.button, styles.copyButton, buttonStyle]}
              onPress={handleCopy}
            >
              <Text style={[styles.buttonText, buttonTextStyle]}>
                {copyButtonText}
              </Text>
            </TouchableOpacity>
          )}
          
          {showShareButton && (
            <TouchableOpacity
              style={[styles.button, styles.shareButton, buttonStyle]}
              onPress={handleShare}
            >
              <Text style={[styles.buttonText, buttonTextStyle]}>
                {shareButtonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  caption: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  addressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textLight,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: colors.primaryGreen,
  },
  shareButton: {
    backgroundColor: colors.primaryBlue,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QrCodeView;
