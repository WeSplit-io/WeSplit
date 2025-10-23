/**
 * Mock MWA Service for Expo Go
 * Provides mock functionality when MWA is not available
 */

import { logger } from '../../analytics/loggingService';
import { getPlatformInfo } from '../../../utils/core/platformDetection';

export interface MockWalletInfo {
  name: string;
  address: string;
  publicKey: string;
  isConnected: boolean;
  balance?: number;
}

export interface MockMWAResult {
  success: boolean;
  wallet?: MockWalletInfo;
  error?: string;
}

class MockMWAService {
  private static instance: MockMWAService;
  private mockWallets: MockWalletInfo[] = [
    {
      name: 'Phantom',
      address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      isConnected: true,
      balance: 1.5
    },
    {
      name: 'Solflare',
      address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      publicKey: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
      isConnected: true,
      balance: 2.3
    },
    {
      name: 'Backpack',
      address: '3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyA',
      publicKey: '3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyA',
      isConnected: false,
      balance: 0
    }
  ];

  public static getInstance(): MockMWAService {
    if (!MockMWAService.instance) {
      MockMWAService.instance = new MockMWAService();
    }
    return MockMWAService.instance;
  }

  /**
   * Check if mock service should be used
   */
  shouldUseMockService(): boolean {
    const platformInfo = getPlatformInfo();
    return platformInfo.isExpoGo || !platformInfo.canUseMWA;
  }

  /**
   * Get available mock wallets
   */
  getAvailableWallets(): MockWalletInfo[] {
    logger.info('Getting mock available wallets', null, 'MockMWAService');
    return this.mockWallets.filter(wallet => wallet.isConnected);
  }

  /**
   * Connect to a mock wallet
   */
  async connectWallet(walletName: string): Promise<MockMWAResult> {
    logger.info('Connecting to mock wallet', { walletName }, 'MockMWAService');
    
    const wallet = this.mockWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
    if (!wallet) {
      return {
        success: false,
        error: `Mock wallet ${walletName} not found`
      };
    }

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark wallet as connected
    wallet.isConnected = true;

    logger.info('Mock wallet connected successfully', { 
      walletName, 
      address: wallet.address 
    }, 'MockMWAService');

    return {
      success: true,
      wallet: { ...wallet }
    };
  }

  /**
   * Disconnect from a mock wallet
   */
  async disconnectWallet(walletName: string): Promise<MockMWAResult> {
    logger.info('Disconnecting from mock wallet', { walletName }, 'MockMWAService');
    
    const wallet = this.mockWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
    if (!wallet) {
      return {
        success: false,
        error: `Mock wallet ${walletName} not found`
      };
    }

    // Mark wallet as disconnected
    wallet.isConnected = false;

    logger.info('Mock wallet disconnected successfully', { walletName }, 'MockMWAService');

    return {
      success: true,
      wallet: { ...wallet }
    };
  }

  /**
   * Get wallet balance (mock)
   */
  async getWalletBalance(address: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    logger.info('Getting mock wallet balance', { address }, 'MockMWAService');
    
    const wallet = this.mockWallets.find(w => w.address === address);
    
    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found'
      };
    }

    // Simulate balance fetch delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      balance: wallet.balance || 0
    };
  }

  /**
   * Sign a message (mock)
   */
  async signMessage(message: string, walletName: string): Promise<{ success: boolean; signature?: string; error?: string }> {
    logger.info('Signing message with mock wallet', { walletName, messageLength: message.length }, 'MockMWAService');
    
    const wallet = this.mockWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
    if (!wallet || !wallet.isConnected) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate mock signature
    const mockSignature = `mock_signature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Message signed successfully with mock wallet', { 
      walletName, 
      signatureLength: mockSignature.length 
    }, 'MockMWAService');

    return {
      success: true,
      signature: mockSignature
    };
  }

  /**
   * Send transaction (mock)
   */
  async sendTransaction(
    toAddress: string, 
    amount: number, 
    walletName: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    logger.info('Sending mock transaction', { 
      toAddress, 
      amount, 
      walletName 
    }, 'MockMWAService');
    
    const wallet = this.mockWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
    if (!wallet || !wallet.isConnected) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    if ((wallet.balance || 0) < amount) {
      return {
        success: false,
        error: 'Insufficient balance'
      };
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update mock balance
    wallet.balance = (wallet.balance || 0) - amount;

    // Generate mock transaction hash
    const mockTxHash = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Mock transaction sent successfully', { 
      walletName, 
      amount, 
      txHash: mockTxHash 
    }, 'MockMWAService');

    return {
      success: true,
      txHash: mockTxHash
    };
  }

  /**
   * Reset mock data (for testing)
   */
  resetMockData(): void {
    logger.info('Resetting mock data', null, 'MockMWAService');
    this.mockWallets = [
      {
        name: 'Phantom',
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        publicKey: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        isConnected: true,
        balance: 1.5
      },
      {
        name: 'Solflare',
        address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        publicKey: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        isConnected: true,
        balance: 2.3
      },
      {
        name: 'Backpack',
        address: '3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyA',
        publicKey: '3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyA',
        isConnected: false,
        balance: 0
      }
    ];
  }

  /**
   * Get mock service status
   */
  getServiceStatus(): {
    isActive: boolean;
    availableWallets: number;
    connectedWallets: number;
    platform: string;
  } {
    const platformInfo = getPlatformInfo();
    const connectedWallets = this.mockWallets.filter(w => w.isConnected).length;

    return {
      isActive: this.shouldUseMockService(),
      availableWallets: this.mockWallets.length,
      connectedWallets,
      platform: platformInfo.environment
    };
  }
}

export const mockMWAService = MockMWAService.getInstance();
