/**
 * Component Tests for PhantomAuthButton
 *
 * Tests the Phantom authentication button component including:
 * - Rendering states
 * - Production blocking
 * - User interactions
 * - Callbacks
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PhantomAuthButton } from '../PhantomAuthButton';

// Mock the Phantom SDK hooks
const mockOpen = jest.fn();
const mockUsePhantom = jest.fn();
const mockUseModal = jest.fn();
const mockUseConnect = jest.fn();

jest.mock('@phantom/react-native-sdk', () => ({
  usePhantom: () => mockUsePhantom(),
  useModal: () => mockUseModal(),
  useConnect: () => mockUseConnect()
}));

// Mock the PhantomAuthService
const mockProcessAuthenticatedUser = jest.fn();
jest.mock('../../../services/auth/PhantomAuthService', () => ({
  PhantomAuthService: {
    getInstance: () => ({
      processAuthenticatedUser: mockProcessAuthenticatedUser
    })
  }
}));

// Mock the logger
jest.mock('../../../services/analytics/loggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock shared components
jest.mock('../../shared', () => ({
  Button: ({ title, onPress, disabled, loading, ...props }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        testID="phantom-button"
        {...props}
      >
        <Text>{loading ? 'Loading...' : title}</Text>
      </TouchableOpacity>
    );
  }
}));

// Mock theme
jest.mock('../../../theme', () => ({
  colors: {
    green: '#10B981',
    white10: '#FFFFFF1A',
    white70: '#FFFFFFB3'
  }
}));

jest.mock('../../../theme/spacing', () => ({
  spacing: { xs: 4, sm: 8, md: 16 }
}));

jest.mock('../../../theme/typography', () => ({
  typography: { fontSize: { sm: 14 } }
}));

describe('PhantomAuthButton', () => {
  // Store original __DEV__
  const originalDev = (global as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__DEV__ = true;

    // Default mock implementations
    mockUsePhantom.mockReturnValue({
      isConnected: false,
      user: null
    });

    mockUseModal.mockReturnValue({
      open: mockOpen,
      isOpened: false
    });

    mockUseConnect.mockReturnValue({
      isConnecting: false
    });

    mockProcessAuthenticatedUser.mockResolvedValue({
      success: true,
      user: { id: 'user-123', name: 'Test User' }
    });
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
  });

  describe('Production Mode', () => {
    it('should return null in production', () => {
      (global as any).__DEV__ = false;

      const { toJSON } = render(<PhantomAuthButton />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('Rendering', () => {
    it('should render correctly in development mode', () => {
      const { getByTestId } = render(<PhantomAuthButton />);

      expect(getByTestId('phantom-button')).toBeTruthy();
    });

    it('should show default button text when not connected', () => {
      const { getByText } = render(<PhantomAuthButton />);

      expect(getByText('Continue with Phantom')).toBeTruthy();
    });

    it('should show connecting state', () => {
      mockUseConnect.mockReturnValue({ isConnecting: true });

      const { getByText } = render(<PhantomAuthButton />);

      expect(getByText('Connecting to Phantom...')).toBeTruthy();
    });

    it('should show modal open state', () => {
      mockUseModal.mockReturnValue({ open: mockOpen, isOpened: true });

      const { getByText } = render(<PhantomAuthButton />);

      expect(getByText('Select Google or Apple')).toBeTruthy();
    });
  });

  describe('User Interaction', () => {
    it('should open modal when button is pressed', () => {
      const { getByTestId } = render(<PhantomAuthButton />);

      fireEvent.press(getByTestId('phantom-button'));

      expect(mockOpen).toHaveBeenCalled();
    });

    it('should be disabled when connecting', () => {
      mockUseConnect.mockReturnValue({ isConnecting: true });

      const { getByTestId } = render(<PhantomAuthButton />);
      const button = getByTestId('phantom-button');

      expect(button.props.disabled).toBe(true);
    });

    it('should be disabled when modal is open', () => {
      mockUseModal.mockReturnValue({ open: mockOpen, isOpened: true });

      const { getByTestId } = render(<PhantomAuthButton />);
      const button = getByTestId('phantom-button');

      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess after successful authentication', async () => {
      const onSuccess = jest.fn();

      // Simulate the connection flow
      mockUsePhantom.mockReturnValue({
        isConnected: true,
        user: {
          walletId: 'wallet-123',
          authUserId: 'auth-456',
          authProvider: 'google',
          status: 'connected',
          addresses: [{ address: 'TestAddr', type: 'solana' }]
        }
      });

      mockUseModal.mockReturnValue({
        open: mockOpen,
        isOpened: false // Modal closed after selection
      });

      // The component should detect the connection and process it
      render(<PhantomAuthButton onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(mockProcessAuthenticatedUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: 'user-123', name: 'Test User' });
      });
    });

    it('should call onError when authentication fails', async () => {
      const onError = jest.fn();

      mockProcessAuthenticatedUser.mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      });

      mockUsePhantom.mockReturnValue({
        isConnected: true,
        user: {
          walletId: 'wallet-123',
          authUserId: 'auth-456',
          authProvider: 'google',
          status: 'connected'
        }
      });

      mockUseModal.mockReturnValue({
        open: mockOpen,
        isOpened: false
      });

      render(<PhantomAuthButton onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Authentication failed');
      });
    });

    it('should call onError on exception', async () => {
      const onError = jest.fn();

      mockProcessAuthenticatedUser.mockRejectedValue(new Error('Network error'));

      mockUsePhantom.mockReturnValue({
        isConnected: true,
        user: {
          walletId: 'wallet-123',
          authUserId: 'auth-456',
          authProvider: 'google',
          status: 'connected'
        }
      });

      mockUseModal.mockReturnValue({
        open: mockOpen,
        isOpened: false
      });

      render(<PhantomAuthButton onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Auto-Connect Handling', () => {
    it('should ignore auto-connect sessions', async () => {
      const onSuccess = jest.fn();

      mockUsePhantom.mockReturnValue({
        isConnected: true,
        user: {
          walletId: 'wallet-123',
          authUserId: 'auth-456',
          authProvider: 'google',
          status: 'connected',
          source: 'auto-connect' // This is an auto-connect session
        }
      });

      mockUseModal.mockReturnValue({
        open: mockOpen,
        isOpened: false
      });

      render(<PhantomAuthButton onSuccess={onSuccess} />);

      // Wait a bit to ensure no processing happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProcessAuthenticatedUser).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Processing State', () => {
    it('should show processing state while creating account', async () => {
      mockProcessAuthenticatedUser.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, user: {} }), 100))
      );

      mockUsePhantom.mockReturnValue({
        isConnected: true,
        user: {
          walletId: 'wallet-123',
          authUserId: 'auth-456',
          authProvider: 'google',
          status: 'connected'
        }
      });

      mockUseModal.mockReturnValue({
        open: mockOpen,
        isOpened: false
      });

      const { getByText } = render(<PhantomAuthButton />);

      await waitFor(() => {
        expect(getByText('Creating account...')).toBeTruthy();
      });
    });
  });

  describe('Full Width Mode', () => {
    it('should apply full width styling when prop is true', () => {
      const { getByTestId } = render(<PhantomAuthButton fullWidth={true} />);

      // The component should render with fullWidth prop passed to Button
      expect(getByTestId('phantom-button')).toBeTruthy();
    });
  });
});
