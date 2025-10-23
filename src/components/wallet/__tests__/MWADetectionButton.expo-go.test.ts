/**
 * Test MWA Detection Button in Expo Go environment
 * Ensures the component works correctly when MWA is not available
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MWADetectionButton from '../MWADetectionButton';
import { getPlatformInfo } from '../../../utils/core/platformDetection';

// Mock the platform detection to simulate Expo Go
jest.mock('../../../utils/core/platformDetection', () => ({
  getPlatformInfo: jest.fn(() => ({
    isExpoGo: true,
    isDevelopmentBuild: false,
    isProduction: false,
    isWeb: false,
    isNative: true,
    hasNativeModules: false,
    canUseMWA: false,
    environment: 'expo-go'
  }))
}));

// Mock the mock MWA service
jest.mock('../../../services/blockchain/wallet/mockMWAService', () => ({
  mockMWAService: {
    getAvailableWallets: jest.fn(() => [
      {
        name: 'Phantom',
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        isConnected: true,
        balance: 1.5
      }
    ]),
    connectWallet: jest.fn(() => Promise.resolve({
      success: true,
      wallet: {
        name: 'Phantom',
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        isMock: true
      }
    }))
  }
}));

describe('MWADetectionButton in Expo Go', () => {
  const mockOnWalletDetected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing in Expo Go', () => {
    const { getByText } = render(
      <MWADetectionButton onWalletDetected={mockOnWalletDetected} />
    );

    expect(getByText('Detect Wallets')).toBeTruthy();
  });

  it('should show mock wallets when detect button is pressed', async () => {
    const { getByText } = render(
      <MWADetectionButton onWalletDetected={mockOnWalletDetected} />
    );

    const detectButton = getByText('Detect Wallets');
    fireEvent.press(detectButton);

    await waitFor(() => {
      expect(getByText('Available Wallets')).toBeTruthy();
    });
  });

  it('should handle mock wallet selection', async () => {
    const { getByText } = render(
      <MWADetectionButton onWalletDetected={mockOnWalletDetected} />
    );

    const detectButton = getByText('Detect Wallets');
    fireEvent.press(detectButton);

    await waitFor(() => {
      const phantomWallet = getByText('Phantom');
      fireEvent.press(phantomWallet);
    });

    await waitFor(() => {
      expect(mockOnWalletDetected).toHaveBeenCalledWith({
        name: 'Phantom',
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        isMock: true
      });
    });
  });
});
