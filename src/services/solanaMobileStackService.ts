import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';

// Solana Mobile Stack configuration
const SOLANA_MOBILE_STACK_SCHEME = 'solana-wallet';
const PHANTOM_MOBILE_SCHEME = 'phantom';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export interface SolanaMobileConnection {
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  connect(): Promise<PublicKey>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export interface SolanaMobileRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: any[];
}

export interface SolanaMobileResponse {
  jsonrpc: string;
  id: string;
  result?: any;
  error?: any;
}

class SolanaMobileStackService {
  private connection: Connection;
  private connectionState: {
    publicKey: PublicKey | null;
    connecting: boolean;
    connected: boolean;
  };
  private requestId: number;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.connectionState = {
      publicKey: null,
      connecting: false,
      connected: false
    };
    this.requestId = 1;

    console.log('🔗 SolanaMobileStackService: Initialized for Solana Mobile Stack protocol');
  }

  /**
   * Connect to Phantom using Solana Mobile Stack protocol
   */
  async connectToPhantom(): Promise<PublicKey> {
    try {
      console.log('🔗 SolanaMobileStackService: Starting Solana Mobile Stack connection to Phantom...');
      
      this.connectionState.connecting = true;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;

      // Step 1: Create a Solana Mobile Stack connection request
      const connectionRequest = this.createConnectionRequest();
      console.log('🔗 SolanaMobileStackService: Created connection request:', connectionRequest);

      // Step 2: Build the Solana Mobile Stack URL
      const mobileStackUrl = this.buildMobileStackUrl(connectionRequest);
      console.log('🔗 SolanaMobileStackService: Mobile Stack URL:', mobileStackUrl);

      // Step 3: Try to open Phantom with Solana Mobile Stack protocol
      try {
        await Linking.openURL(mobileStackUrl);
        console.log('🔗 SolanaMobileStackService: Phantom opened with Solana Mobile Stack protocol');
      } catch (error) {
        console.log('🔗 SolanaMobileStackService: Mobile Stack URL failed, trying fallback...');
        await this.openPhantomWithFallback();
      }

      // Step 4: Wait for user to approve connection in Phantom
      console.log('🔗 SolanaMobileStackService: Waiting for user approval in Phantom...');

      // For now, we'll show a message to the user and wait
      const { Alert } = require('react-native');
      
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Phantom Connection (Solana Mobile Stack)',
          'Please check Phantom for a connection request from WeSplit. If you see the request, approve it. If not, Phantom may not support the Solana Mobile Stack protocol yet.',
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
                  // Step 5: For demo purposes, use a mock address
                  // In a real implementation, you would get this from Phantom's Solana Mobile Stack response
                  console.log('🔗 SolanaMobileStackService: Using demo mode - no real Solana Mobile Stack response yet');
                  
                  const mockAddress = '11111111111111111111111111111111';
                  const publicKey = new PublicKey(mockAddress);
                  
                  this.connectionState.publicKey = publicKey;
                  this.connectionState.connected = true;
                  this.connectionState.connecting = false;
                  
                  console.log('🔗 SolanaMobileStackService: Phantom connection established (demo mode) with address:', mockAddress);
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
      console.error('🔗 SolanaMobileStackService: Error connecting to Phantom:', error);
      
      this.connectionState.connecting = false;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;
      
      throw error;
    }
  }

  /**
   * Create a Solana Mobile Stack connection request
   */
  private createConnectionRequest(): SolanaMobileRequest {
    return {
      jsonrpc: '2.0',
      id: this.requestId.toString(),
      method: 'connect',
      params: [
        {
          appName: 'WeSplit',
          appIcon: 'https://your-app-icon-url.com/icon.png',
          network: 'mainnet-beta',
          requestId: this.requestId.toString(),
          timestamp: Date.now(),
          // Solana Mobile Stack specific parameters
          platform: Platform.OS,
          version: '1.0.0',
          // Additional parameters for better compatibility
          cluster: 'mainnet-beta',
          commitment: 'confirmed'
        }
      ]
    };
  }

  /**
   * Build Solana Mobile Stack URL for Phantom
   */
  private buildMobileStackUrl(request: SolanaMobileRequest): string {
    // Solana Mobile Stack protocol URL format
    const baseUrl = `${SOLANA_MOBILE_STACK_SCHEME}://`;
    const params = new URLSearchParams({
      jsonrpc: request.jsonrpc,
      id: request.id,
      method: request.method,
      params: JSON.stringify(request.params)
    });
    
    return `${baseUrl}request?${params.toString()}`;
  }

  /**
   * Try to open Phantom using multiple Solana Mobile Stack methods
   */
  private async openPhantomWithFallback(): Promise<void> {
    const methods = [
      { name: 'Solana Mobile Stack', url: `${SOLANA_MOBILE_STACK_SCHEME}://request` },
      { name: 'Phantom Mobile Stack', url: `${PHANTOM_MOBILE_SCHEME}://mobile-stack` },
      { name: 'Phantom Connect', url: `${PHANTOM_MOBILE_SCHEME}://connect` },
      { name: 'Phantom Basic', url: `${PHANTOM_MOBILE_SCHEME}://` },
      { name: 'Phantom Package', url: `app.${PHANTOM_MOBILE_SCHEME}://` }
    ];

    for (const method of methods) {
      try {
        console.log(`🔗 SolanaMobileStackService: Trying ${method.name}: ${method.url}`);
        await Linking.openURL(method.url);
        console.log(`🔗 SolanaMobileStackService: Phantom opened successfully with ${method.name}`);
        return;
      } catch (error) {
        console.log(`🔗 SolanaMobileStackService: ${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('Phantom wallet is not available or cannot be opened');
  }

  /**
   * Test function to try opening Phantom with different approaches
   */
  async testPhantomOpening(): Promise<void> {
    console.log('🔗 SolanaMobileStackService: Testing Phantom opening approaches...');
    
    const approaches = [
      {
        name: 'Basic Phantom',
        url: 'phantom://',
        description: 'Basic Phantom deep link'
      },
      {
        name: 'Phantom Browse',
        url: 'phantom://browse',
        description: 'Phantom browse deep link'
      },
      {
        name: 'Phantom Connect',
        url: 'phantom://connect',
        description: 'Phantom connect deep link'
      },
      {
        name: 'App Phantom',
        url: 'app.phantom://',
        description: 'App package scheme'
      },
      {
        name: 'HTTPS Phantom',
        url: 'https://phantom.app',
        description: 'HTTPS Phantom website'
      },
      {
        name: 'Solana Mobile Stack',
        url: 'solana-wallet://request',
        description: 'Solana Mobile Stack protocol'
      }
    ];

    for (const approach of approaches) {
      try {
        console.log(`🔗 SolanaMobileStackService: Testing ${approach.name}: ${approach.url}`);
        console.log(`🔗 SolanaMobileStackService: Description: ${approach.description}`);
        
        const canOpen = await Linking.canOpenURL(approach.url);
        console.log(`🔗 SolanaMobileStackService: ${approach.name} - canOpen: ${canOpen}`);
        
        if (canOpen) {
          console.log(`🔗 SolanaMobileStackService: ✅ ${approach.name} is supported`);
          
          // Try to actually open it
          try {
            await Linking.openURL(approach.url);
            console.log(`🔗 SolanaMobileStackService: ✅ ${approach.name} opened successfully`);
          } catch (openError) {
            console.log(`🔗 SolanaMobileStackService: ❌ ${approach.name} failed to open:`, openError);
          }
        } else {
          console.log(`🔗 SolanaMobileStackService: ❌ ${approach.name} is not supported`);
        }
        
        console.log('---');
        
      } catch (error) {
        console.log(`🔗 SolanaMobileStackService: ❌ ${approach.name} failed:`, error);
        console.log('---');
      }
    }
  }

  /**
   * Debug function to test different Solana Mobile Stack schemes
   */
  async debugSolanaMobileSchemes(): Promise<void> {
    console.log('🔗 SolanaMobileStackService: Testing Solana Mobile Stack schemes...');
    
    const schemes = [
      `${SOLANA_MOBILE_STACK_SCHEME}://`,
      `${SOLANA_MOBILE_STACK_SCHEME}://request`,
      `${SOLANA_MOBILE_STACK_SCHEME}://connect`,
      `${PHANTOM_MOBILE_SCHEME}://mobile-stack`,
      `${PHANTOM_MOBILE_SCHEME}://connect`,
      `${PHANTOM_MOBILE_SCHEME}://`,
      `app.${PHANTOM_MOBILE_SCHEME}://`,
      `${PHANTOM_MOBILE_SCHEME}://browse`,
      `${PHANTOM_MOBILE_SCHEME}://mobile`,
      `${PHANTOM_MOBILE_SCHEME}://mobile-connect`,
      `${PHANTOM_MOBILE_SCHEME}://mobile-wallet-adapter`,
      `${PHANTOM_MOBILE_SCHEME}://wallet-adapter`,
      `${PHANTOM_MOBILE_SCHEME}://wallet-adapter?method=connect`,
      `${PHANTOM_MOBILE_SCHEME}://mobile-wallet-adapter?method=connect`,
      `${PHANTOM_MOBILE_SCHEME}://connect?app=WeSplit`,
      `${PHANTOM_MOBILE_SCHEME}://mobile-connect?app=WeSplit`
    ];

    for (const scheme of schemes) {
      try {
        console.log(`🔗 SolanaMobileStackService: Testing scheme: ${scheme}`);
        const canOpen = await Linking.canOpenURL(scheme);
        console.log(`🔗 SolanaMobileStackService: ${scheme} - canOpen: ${canOpen}`);
        
        if (canOpen) {
          console.log(`🔗 SolanaMobileStackService: ✅ ${scheme} is supported`);
        }
      } catch (error) {
        console.log(`🔗 SolanaMobileStackService: ❌ ${scheme} failed:`, error);
      }
    }
  }

  /**
   * Disconnect from Phantom
   */
  async disconnectFromPhantom(): Promise<void> {
    try {
      console.log('🔗 SolanaMobileStackService: Disconnecting from Phantom...');
      
      this.connectionState.publicKey = null;
      this.connectionState.connected = false;
      this.connectionState.connecting = false;

      console.log('🔗 SolanaMobileStackService: Disconnected from Phantom successfully');

    } catch (error) {
      console.error('🔗 SolanaMobileStackService: Error disconnecting from Phantom:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction using Phantom (Solana Mobile Stack protocol)
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 SolanaMobileStackService: Signing transaction with Phantom (Solana Mobile Stack)...');

      // In a real implementation, you would:
      // 1. Send the transaction to Phantom via Solana Mobile Stack protocol
      // 2. Wait for the user to approve in Phantom
      // 3. Receive the signed transaction back

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return transaction;

    } catch (error) {
      console.error('🔗 SolanaMobileStackService: Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message using Phantom (Solana Mobile Stack protocol)
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 SolanaMobileStackService: Signing message with Phantom (Solana Mobile Stack)...');

      // In a real implementation, you would:
      // 1. Send the message to Phantom via Solana Mobile Stack protocol
      // 2. Wait for the user to approve in Phantom
      // 3. Receive the signed message back

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return message;

    } catch (error) {
      console.error('🔗 SolanaMobileStackService: Error signing message:', error);
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
      console.error('🔗 SolanaMobileStackService: Error getting balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const solanaMobileStackService = new SolanaMobileStackService(); 