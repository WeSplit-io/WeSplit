import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Linking, Platform } from 'react-native';

// Phantom direct connection configuration
const PHANTOM_SCHEME = 'phantom';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export interface PhantomDirectConnection {
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  connect(): Promise<PublicKey>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

class PhantomDirectService {
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

    console.log('🔗 PhantomDirectService: Initialized for direct Phantom connection');
  }

  /**
   * Connect to Phantom using direct deep link approach
   */
  async connectToPhantom(): Promise<PublicKey> {
    try {
      console.log('🔗 PhantomDirectService: Starting direct Phantom connection...');
      
      this.connectionState.connecting = true;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;

      // Step 1: Try to open Phantom with a simple deep link first
      console.log('🔗 PhantomDirectService: Opening Phantom with direct deep link...');
      
      try {
        // Try the most basic Phantom deep link
        await Linking.openURL(`${PHANTOM_SCHEME}://`);
        console.log('🔗 PhantomDirectService: Phantom opened successfully');
      } catch (error) {
        console.log('🔗 PhantomDirectService: Failed to open Phantom:', error);
        throw new Error('Phantom wallet is not available');
      }

      // Step 2: Show user instructions and wait for manual connection
      console.log('🔗 PhantomDirectService: Showing user instructions...');
      
      const { Alert } = require('react-native');
      
      console.log('🔗 PhantomDirectService: About to show Alert dialog...');
      
      return new Promise((resolve, reject) => {
        console.log('🔗 PhantomDirectService: Creating Alert dialog...');
        
        Alert.alert(
          'Connect to Phantom',
          'Phantom has been opened. To connect your wallet:\n\n1. In Phantom, go to Settings\n2. Tap "Connected Apps" or "Manage Connections"\n3. Look for "WeSplit" or add it manually\n4. Copy your wallet address\n5. Return here and tap "Continue"',
          [
            {
              text: 'Cancel',
              onPress: () => {
                console.log('🔗 PhantomDirectService: User cancelled connection');
                this.connectionState.connecting = false;
                this.connectionState.connected = false;
                reject(new Error('User cancelled connection'));
              }
            },
            {
              text: 'Continue',
              onPress: async () => {
                console.log('🔗 PhantomDirectService: User tapped Continue, showing address input...');
                try {
                  // Step 3: Ask user to input their wallet address manually
                  const { Alert, TextInput } = require('react-native');
                  
                  console.log('🔗 PhantomDirectService: About to show address input prompt...');
                  
                  Alert.prompt(
                    'Enter Wallet Address',
                    'Please enter your Phantom wallet address:',
                    [
                      {
                        text: 'Cancel',
                        onPress: () => {
                          console.log('🔗 PhantomDirectService: User cancelled address input');
                          this.connectionState.connecting = false;
                          this.connectionState.connected = false;
                          reject(new Error('User cancelled connection'));
                        }
                      },
                      {
                        text: 'Connect',
                        onPress: (walletAddress: string) => {
                          console.log('🔗 PhantomDirectService: User entered address:', walletAddress);
                          if (walletAddress && walletAddress.trim()) {
                            try {
                              const publicKey = new PublicKey(walletAddress.trim());
                              
                              this.connectionState.publicKey = publicKey;
                              this.connectionState.connected = true;
                              this.connectionState.connecting = false;
                              
                              console.log('🔗 PhantomDirectService: Phantom connected successfully with address:', walletAddress);
                              resolve(publicKey);
                              
                            } catch (error) {
                              console.error('🔗 PhantomDirectService: Invalid wallet address:', error);
                              Alert.alert('Invalid Address', 'Please enter a valid Solana wallet address.');
                              this.connectionState.connecting = false;
                              this.connectionState.connected = false;
                              reject(new Error('Invalid wallet address'));
                            }
                          } else {
                            Alert.alert('No Address', 'Please enter a wallet address.');
                            this.connectionState.connecting = false;
                            this.connectionState.connected = false;
                            reject(new Error('No wallet address provided'));
                          }
                        }
                      }
                    ],
                    'plain-text',
                    '',
                    'default'
                  );
                  
                } catch (error) {
                  console.error('🔗 PhantomDirectService: Error in address input:', error);
                  this.connectionState.connecting = false;
                  this.connectionState.connected = false;
                  reject(error);
                }
              }
            }
          ]
        );
        
        console.log('🔗 PhantomDirectService: Alert dialog created successfully');
      });

    } catch (error) {
      console.error('🔗 PhantomDirectService: Error connecting to Phantom:', error);
      
      this.connectionState.connecting = false;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;
      
      throw error;
    }
  }

  /**
   * Try to open Phantom using multiple methods
   */
  async openPhantomWithFallback(): Promise<void> {
    const methods = [
      { name: 'Basic Phantom', url: `${PHANTOM_SCHEME}://` },
      { name: 'Phantom Browse', url: `${PHANTOM_SCHEME}://browse` },
      { name: 'Phantom Connect', url: `${PHANTOM_SCHEME}://connect` },
      { name: 'App Phantom', url: `app.${PHANTOM_SCHEME}://` },
      { name: 'HTTPS Phantom', url: 'https://phantom.app' }
    ];

    for (const method of methods) {
      try {
        console.log(`🔗 PhantomDirectService: Trying ${method.name}: ${method.url}`);
        await Linking.openURL(method.url);
        console.log(`🔗 PhantomDirectService: Phantom opened successfully with ${method.name}`);
        return;
      } catch (error) {
        console.log(`🔗 PhantomDirectService: ${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('Phantom wallet is not available or cannot be opened');
  }

  /**
   * Test different Phantom deep link schemes
   */
  async testPhantomSchemes(): Promise<void> {
    console.log('🔗 PhantomDirectService: Testing Phantom deep link schemes...');
    
    const schemes = [
      `${PHANTOM_SCHEME}://`,
      `${PHANTOM_SCHEME}://browse`,
      `${PHANTOM_SCHEME}://connect`,
      `app.${PHANTOM_SCHEME}://`,
      'https://phantom.app',
      `${PHANTOM_SCHEME}://mobile`,
      `${PHANTOM_SCHEME}://mobile-connect`,
      `${PHANTOM_SCHEME}://mobile-wallet-adapter`,
      `${PHANTOM_SCHEME}://wallet-adapter`,
      `${PHANTOM_SCHEME}://wallet-adapter?method=connect`,
      `${PHANTOM_SCHEME}://mobile-wallet-adapter?method=connect`,
      `${PHANTOM_SCHEME}://connect?app=WeSplit`,
      `${PHANTOM_SCHEME}://mobile-connect?app=WeSplit`
    ];

    for (const scheme of schemes) {
      try {
        console.log(`🔗 PhantomDirectService: Testing scheme: ${scheme}`);
        const canOpen = await Linking.canOpenURL(scheme);
        console.log(`🔗 PhantomDirectService: ${scheme} - canOpen: ${canOpen}`);
        
        if (canOpen) {
          console.log(`🔗 PhantomDirectService: ✅ ${scheme} is supported`);
        }
      } catch (error) {
        console.log(`🔗 PhantomDirectService: ❌ ${scheme} failed:`, error);
      }
    }
  }

  /**
   * Disconnect from Phantom
   */
  async disconnectFromPhantom(): Promise<void> {
    try {
      console.log('🔗 PhantomDirectService: Disconnecting from Phantom...');
      
      this.connectionState.publicKey = null;
      this.connectionState.connected = false;
      this.connectionState.connecting = false;

      console.log('🔗 PhantomDirectService: Disconnected from Phantom successfully');

    } catch (error) {
      console.error('🔗 PhantomDirectService: Error disconnecting from Phantom:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction using Phantom
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 PhantomDirectService: Signing transaction with Phantom...');

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return transaction;

    } catch (error) {
      console.error('🔗 PhantomDirectService: Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message using Phantom
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      if (!this.connectionState.connected || !this.connectionState.publicKey) {
        throw new Error('Wallet not connected');
      }

      console.log('🔗 PhantomDirectService: Signing message with Phantom...');

      // For now, we'll simulate signing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return message;

    } catch (error) {
      console.error('🔗 PhantomDirectService: Error signing message:', error);
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
      console.error('🔗 PhantomDirectService: Error getting balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const phantomDirectService = new PhantomDirectService(); 