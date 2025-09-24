/**
 * Share Helpers
 * Telegram-first sharing with fallback to native share
 */

import { Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

export interface ShareOptions {
  address: string;
  uri?: string;
  message?: string;
  title?: string;
}

/**
 * Share address with Telegram-first approach
 */
export async function shareAddress({ address, uri, message, title }: ShareOptions): Promise<boolean> {
  try {
    // Prepare the share message
    const shareMessage = message || `Send USDC to: ${address}`;
    const shareTitle = title || 'Share Wallet Address';
    
    // Try Telegram first
    const telegramSupported = await Linking.canOpenURL('tg://');
    
    if (telegramSupported) {
      const telegramUrl = `tg://msg?text=${encodeURIComponent(shareMessage)}`;
      const canOpenTelegram = await Linking.canOpenURL(telegramUrl);
      
      if (canOpenTelegram) {
        await Linking.openURL(telegramUrl);
        return true;
      }
    }
    
    // Fallback to native share
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareMessage, {
        dialogTitle: shareTitle,
        mimeType: 'text/plain'
      });
      return true;
    }
    
    // Final fallback - copy to clipboard
    await copyToClipboard(shareMessage);
    Alert.alert('Copied', 'Address copied to clipboard');
    return true;
    
  } catch (error) {
    console.error('Share failed:', error);
    
    // Fallback to clipboard
    try {
      await copyToClipboard(message || address);
      Alert.alert('Copied', 'Address copied to clipboard');
      return true;
    } catch (clipboardError) {
      console.error('Clipboard fallback failed:', clipboardError);
      Alert.alert('Error', 'Failed to share address');
      return false;
    }
  }
}

/**
 * Copy text to clipboard with toast notification
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Share QR code image (if available)
 */
export async function shareQrImage(imageUri: string, message?: string): Promise<boolean> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUri, {
        dialogTitle: 'Share QR Code',
        mimeType: 'image/png'
      });
      return true;
    }
    
    // Fallback to sharing the message
    if (message) {
      return await shareAddress({ address: '', message });
    }
    
    return false;
  } catch (error) {
    console.error('Share QR image failed:', error);
    return false;
  }
}

/**
 * Share Solana Pay URI
 */
export async function shareSolanaPayUri(uri: string, recipient: string, amount?: number): Promise<boolean> {
  const message = amount 
    ? `Send ${amount} USDC to ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 6)}`
    : `Send USDC to ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 6)}`;
  
  return await shareAddress({
    address: recipient,
    uri,
    message,
    title: 'Share Payment Request'
  });
}

/**
 * Share wallet address for deposits
 */
export async function shareWalletAddress(address: string, label?: string): Promise<boolean> {
  const message = label 
    ? `Send USDC to ${label}: ${address}`
    : `Send USDC to: ${address}`;
  
  return await shareAddress({
    address,
    message,
    title: 'Share Wallet Address'
  });
}

/**
 * Share profile link
 */
export async function shareProfileLink(profileLink: string, displayName: string): Promise<boolean> {
  const message = `Add ${displayName} on WeSplit: ${profileLink}`;
  
  return await shareAddress({
    address: '',
    message,
    title: 'Share Profile'
  });
}

/**
 * Check if Telegram is available
 */
export async function isTelegramAvailable(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('tg://');
  } catch {
    return false;
  }
}

/**
 * Check if native sharing is available
 */
export async function isNativeSharingAvailable(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}
