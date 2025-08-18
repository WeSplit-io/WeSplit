import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';

// Solana network configuration
const CURRENT_NETWORK = 'mainnet-beta';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export interface MobileWalletConnection {
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  connect(): Promise<PublicKey>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export interface MobileWalletAdapterMessage {
  method: string;
  params: any;
  id: string;
}

export interface MobileWalletAdapterResponse {
  id: string;
  result?: any;
  error?: any;
}

class MobileWalletAdapterService {
  private connection: Connection;
  private connectionState: {
    publicKey: PublicKey | null;
    connecting: boolean;
    connected: boolean;
  };

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.connectionState = {
      publicKey: null,
      connecting: false,
      connected: false
    };

    console.log('🔗 MobileWalletAdapterService: Initialized for mobile wallet connections');
  }

  /**
   * Connect to Phantom using mobile Wallet Adapter protocol
   */
  async connectToPhantom(): Promise<PublicKey> {
    try {
      console.log('🔗 MobileWalletAdapterService: Starting mobile Phantom connection...');
      
      this.connectionState.connecting = true;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;

      // Step 1: Create a mobile Wallet Adapter connection request
      const connectionRequest = this.createMobileConnectionRequest();
      console.log('🔗 MobileWalletAdapterService: Created mobile connection request:', connectionRequest);

      // Step 2: Open Phantom with the mobile Wallet Adapter URL
      const mobileWalletUrl = this.buildMobileWalletUrl(connectionRequest);
      console.log('🔗 MobileWalletAdapterService: Opening Phantom with mobile URL:', mobileWalletUrl);

      try {
        await Linking.openURL(mobileWalletUrl);
        console.log('🔗 MobileWalletAdapterService: Phantom opened with mobile Wallet Adapter request');
      } catch (error) {
        console.log('🔗 MobileWalletAdapterService: Mobile URL failed, trying fallback...');
        await this.openPhantomWithFallback();
      }

      // Step 3: Wait for user to approve connection in Phantom
      console.log('🔗 MobileWalletAdapterService: Waiting for user approval in Phantom...');

      // For now, we'll show a message to the user and wait
      const { Alert } = require('react-native');
      
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Phantom Connection',
          'Please check Phantom for a connection request from WeSplit. If you see the request, approve it. If not, the mobile Wallet Adapter protocol may need to be configured.',
          [
            {
              text: 'Cancel',
              onPress: () => {
                this.connectionState.connecting = false;
                this.connectionState.connected = false;
                reject(new Error('User cancelled connection'));
              }
            },
            {
              text: 'Continue (Demo)',
              onPress: async () => {
                try {
                  // Step 4: For demo purposes, use a mock address
                  // In a real implementation, you would get this from Phantom's mobile Wallet Adapter response
                  console.log('🔗 MobileWalletAdapterService: Using demo mode - no real mobile Wallet Adapter response yet');
                  
                  const mockAddress = '11111111111111111111111111111111';
                  const publicKey = new PublicKey(mockAddress);
                  
                  this.connectionState.publicKey = publicKey;
                  this.connectionState.connected = true;
                  this.connectionState.connecting = false;
                  
                  console.log('🔗 MobileWalletAdapterService: Phantom connection established (demo mode) with address:', mockAddress);
                  resolve(publicKey);
                  
                } catch (error) {
                  this.connectionState.connecting = false;
                  this.connectionState.connected = false;
                  reject(error);
                }
              }
            }
          ]
        );
      });

    } catch (error) {
      console.error('🔗 MobileWalletAdapterService: Error connecting to Phantom:', error);
      
      this.connectionState.connecting = false;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;
      
      throw error;
    }
  }

  /**
   * Create a mobile Wallet Adapter connection request
   */
  private createMobileConnectionRequest(): any {
    return {
      method: 'connect',
      params: {
        appName: 'WeSplit',
        appIcon: 'https://your-app-icon-url.com/icon.png',
        network: CURRENT_NETWORK,
        requestId: Date.now().toString(),
        timestamp: Date.now(),
        // Mobile-specific parameters
        platform: Platform.OS,
        version: '1.0.0'
      }
    };
  }

  /**
   * Build mobile Wallet Adapter URL for Phantom
   */
  private buildMobileWalletUrl(request: any): string {
    // Mobile Wallet Adapter protocol URL format
    const baseUrl = 'phantom://';
    const params = new URLSearchParams({
      method: request.method,
      appName: request.params.appName,
      appIcon: request.params.appIcon,
      network: request.params.network,
      requestId: request.params.requestId,
      timestamp: request.params.timestamp.toString(),
      platform: request.params.platform,
      version: request.params.version
    });
    
    return `${baseUrl}mobile-wallet-adapter?${params.toString()}`;
  }

  /**
   * Debug function to test different Phantom deep link schemes
   */
  async debugPhantomSchemes(): Promise<void> {
    console.log('🔗 MobileWalletAdapterService: Testing Phantom deep link schemes...');
    
    const schemes = [
      'phantom://',
      'app.phantom://',
      'phantom://browse',
      'phantom://connect',
      'phantom://mobile',
      'phantom://mobile-connect',
      'phantom://mobile-wallet-adapter',
      'phantom://wallet-adapter',
      'phantom://wallet-adapter?method=connect',
      'phantom://mobile-wallet-adapter?method=connect',
      'phantom://connect?app=WeSplit',
      'phantom://mobile-connect?app=WeSplit'
    ];

    for (const scheme of schemes) {
      try {
        console.log(`🔗 MobileWalletAdapterService: Testing scheme: ${scheme}`);
        const canOpen = await Linking.canOpenURL(scheme);
        console.log(`🔗 MobileWalletAdapterService: ${scheme} - canOpen: ${canOpen}`);
        
        if (canOpen) {
          console.log(`🔗 MobileWalletAdapterService: ✅ ${scheme} is supported`);
        }
      } catch (error) {
        console.log(`🔗 MobileWalletAdapterService: ❌ ${scheme} failed:`, error);
      }
    }
  }

  /**
   * Try to open Phantom using multiple mobile-specific methods
   */
  private async openPhantomWithFallback(): Promise<void> {
    const methods = [
      { name: 'mobile Wallet Adapter', url: 'phantom://mobile-wallet-adapter' },
      { name: 'mobile connection', url: 'phantom://mobile-connect' },
      { name: 'mobile deep link', url: 'phantom://mobile' },
      { name: 'basic scheme', url: 'phantom://' },
      { name: 'package scheme', url: 'app.phantom://' }
    ];

    for (const method of methods) {
      try {
        console.log(`🔗 MobileWalletAdapterService: Trying ${method.name}: ${method.url}`);
        await Linking.openURL(method.url);
        console.log(`🔗 MobileWalletAdapterService: Phantom opened successfully with ${method.name}`);
        return;
      } catch (error) {
        console.log(`🔗 MobileWalletAdapterService: ${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('Phantom wallet is not available or cannot be opened');
  }

  /**
   * Disconnect from Phantom
   */
  async disconnectFromPhantom(): Promise<void> {
    try {
      console.log('🔗 MobileWalletAdapterService: Disconnecting from Phantom...');
      
      this.connectionState.publicKey = null;
      this.connectionState.connected = false;
      this.connectionState.connecting = false;

      console.log('🔗 MobileWalletAdapterService: Disconnected from Phantom successfully');

    } catch (error) {
      console.error('🔗 MobileWalletAdapterService: Error disconnecting from Phantom:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction using Phantom (mobile protocol)
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 MobileWalletAdapterService: Signing transaction with Phantom (mobile)...');

      // In a real implementation, you would:
      // 1. Send the transaction to Phantom via mobile Wallet Adapter protocol
      // 2. Wait for the user to approve in Phantom
      // 3. Receive the signed transaction back

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return transaction;

    } catch (error) {
      console.error('🔗 MobileWalletAdapterService: Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message using Phantom (mobile protocol)
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 MobileWalletAdapterService: Signing message with Phantom (mobile)...');

      // In a real implementation, you would:
      // 1. Send the message to Phantom via mobile Wallet Adapter protocol
      // 2. Wait for the user to approve in Phantom
      // 3. Receive the signed message back

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return message;

    } catch (error) {
      console.error('🔗 MobileWalletAdapterService: Error signing message:', error);
      throw error;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return { ...this.connectionState };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connectionState.connected && this.connectionState.publicKey !== null;
  }

  /**
   * Get connected wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.connectionState.publicKey;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      if (!this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      const balance = await this.connection.getBalance(this.connectionState.publicKey);
      return balance / 1e9; // Convert lamports to SOL

    } catch (error) {
      console.error('🔗 MobileWalletAdapterService: Error getting balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mobileWalletAdapterService = new MobileWalletAdapterService(); 