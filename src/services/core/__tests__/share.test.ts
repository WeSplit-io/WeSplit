/**
 * Share Tests
 * Unit tests for sharing functionality
 */

import { Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import {
  shareAddress,
  copyToClipboard,
  shareSolanaPayUri,
  shareWalletAddress,
  shareProfileLink,
  isTelegramAvailable,
  isNativeSharingAvailable,
} from '../share';

// Mock dependencies
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('Share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareAddress', () => {
    it('should use Telegram when available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareAddress({
        address: 'test-address',
        message: 'Test message'
      });

      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('tg://');
      expect(Linking.openURL).toHaveBeenCalledWith(
        'tg://msg?text=Test%20message'
      );
    });

    it('should fallback to native share when Telegram unavailable', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await shareAddress({
        address: 'test-address',
        message: 'Test message'
      });

      expect(result).toBe(true);
      expect(Sharing.shareAsync).toHaveBeenCalledWith('Test message', {
        dialogTitle: 'Share Wallet Address',
        mimeType: 'text/plain'
      });
    });

    it('should fallback to clipboard when sharing fails', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Alert.alert as jest.Mock).mockImplementation(() => {});

      const result = await shareAddress({
        address: 'test-address',
        message: 'Test message'
      });

      expect(result).toBe(true);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Test message');
      expect(Alert.alert).toHaveBeenCalledWith('Copied', 'Address copied to clipboard');
    });

    it('should handle errors gracefully', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Network error'));
      (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined);
      (Alert.alert as jest.Mock).mockImplementation(() => {});

      const result = await shareAddress({
        address: 'test-address',
        message: 'Test message'
      });

      expect(result).toBe(true);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Test message');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy text to clipboard', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('test text');
    });

    it('should handle clipboard errors', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });
  });

  describe('shareSolanaPayUri', () => {
    it('should share Solana Pay URI with amount', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareSolanaPayUri(
        'solana:address?spl-token=usdc&amount=1000000',
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        1.0
      );

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('Send%201%20USDC%20to%209WzDXw...tAWWM')
      );
    });

    it('should share Solana Pay URI without amount', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareSolanaPayUri(
        'solana:address?spl-token=usdc',
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
      );

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('Send%20USDC%20to%209WzDXw...tAWWM')
      );
    });
  });

  describe('shareWalletAddress', () => {
    it('should share wallet address with label', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareWalletAddress(
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        'My Wallet'
      );

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('Send%20USDC%20to%20My%20Wallet')
      );
    });

    it('should share wallet address without label', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareWalletAddress(
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
      );

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('Send%20USDC%20to%3A%209WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')
      );
    });
  });

  describe('shareProfileLink', () => {
    it('should share profile link', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(undefined);

      const result = await shareProfileLink(
        'wesplit://profile/user123',
        'John Doe'
      );

      expect(result).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('Add%20John%20Doe%20on%20WeSplit')
      );
    });
  });

  describe('isTelegramAvailable', () => {
    it('should return true when Telegram is available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

      const result = await isTelegramAvailable();

      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('tg://');
    });

    it('should return false when Telegram is not available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const result = await isTelegramAvailable();

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await isTelegramAvailable();

      expect(result).toBe(false);
    });
  });

  describe('isNativeSharingAvailable', () => {
    it('should return true when native sharing is available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      const result = await isNativeSharingAvailable();

      expect(result).toBe(true);
    });

    it('should return false when native sharing is not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await isNativeSharingAvailable();

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockRejectedValue(new Error('Sharing error'));

      const result = await isNativeSharingAvailable();

      expect(result).toBe(false);
    });
  });
});
