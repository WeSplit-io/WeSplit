import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Linking, Platform } from 'react-native';

// Solana network configuration
const CURRENT_NETWORK = WalletAdapterNetwork.Mainnet;
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export interface WalletConnectionState {
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  disconnecting: boolean;
}

export interface WalletAdapterMessage {
  method: string;
  params: any;
  id: string;
}

export interface WalletAdapterResponse {
  id: string;
  result?: any;
  error?: any;
}

class RealWalletAdapterService {
  private connection: Connection;
  private phantomAdapter: PhantomWalletAdapter;
  private connectionState: WalletConnectionState;
  private messageIdCounter: number = 0;
  private responseHandlers: Map<string, (response: WalletAdapterResponse) => void> = new Map();

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.phantomAdapter = new PhantomWalletAdapter();
    this.connectionState = {
      publicKey: null,
      connecting: false,
      connected: false,
      disconnecting: false
    };

    console.log('🔗 RealWalletAdapterService: Initialized with Phantom adapter');
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WalletConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Connect to Phantom wallet using real Wallet Adapter protocol
   */
  async connectToPhantom(): Promise<PublicKey> {
    try {
      console.log('🔗 RealWalletAdapterService: Starting real Phantom connection...');
      
      this.connectionState.connecting = true;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;

      // Step 1: Initialize the Phantom adapter
      await this.phantomAdapter.connect();
      
      console.log('🔗 RealWalletAdapterService: Phantom adapter connected');

      // Step 2: Get the wallet public key
      const publicKey = this.phantomAdapter.publicKey;
      if (!publicKey) {
        throw new Error('Failed to get public key from Phantom');
      }

      console.log('🔗 RealWalletAdapterService: Got public key from Phantom:', publicKey.toBase58());

      // Step 3: Update connection state
      this.connectionState.publicKey = publicKey;
      this.connectionState.connected = true;
      this.connectionState.connecting = false;

      console.log('🔗 RealWalletAdapterService: Phantom connection established successfully');

      return publicKey;

    } catch (error) {
      console.error('🔗 RealWalletAdapterService: Error connecting to Phantom:', error);
      
      this.connectionState.connecting = false;
      this.connectionState.connected = false;
      this.connectionState.publicKey = null;
      
      throw error;
    }
  }

  /**
   * Disconnect from Phantom wallet
   */
  async disconnectFromPhantom(): Promise<void> {
    try {
      console.log('🔗 RealWalletAdapterService: Disconnecting from Phantom...');
      
      this.connectionState.disconnecting = true;

      if (this.phantomAdapter) {
        await this.phantomAdapter.disconnect();
      }

      this.connectionState.publicKey = null;
      this.connectionState.connected = false;
      this.connectionState.disconnecting = false;

      console.log('🔗 RealWalletAdapterService: Disconnected from Phantom successfully');

    } catch (error) {
      console.error('🔗 RealWalletAdapterService: Error disconnecting from Phantom:', error);
      this.connectionState.disconnecting = false;
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

      console.log('🔗 RealWalletAdapterService: Signing transaction with Phantom...');

      const signedTransaction = await this.phantomAdapter.signTransaction(transaction);
      
      console.log('🔗 RealWalletAdapterService: Transaction signed successfully');
      
      return signedTransaction;

    } catch (error) {
      console.error('🔗 RealWalletAdapterService: Error signing transaction:', error);
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

      console.log('🔗 RealWalletAdapterService: Signing message with Phantom...');

      const signedMessage = await this.phantomAdapter.signMessage(message);
      
      console.log('🔗 RealWalletAdapterService: Message signed successfully');
      
      return signedMessage;

    } catch (error) {
      console.error('🔗 RealWalletAdapterService: Error signing message:', error);
      throw error;
    }
  }

  /**
   * Send a message to Phantom using Wallet Adapter protocol
   */
  private async sendMessageToPhantom(message: WalletAdapterMessage): Promise<WalletAdapterResponse> {
    return new Promise((resolve, reject) => {
      const messageId = message.id;
      
      // Store the response handler
      this.responseHandlers.set(messageId, (response: WalletAdapterResponse) => {
        this.responseHandlers.delete(messageId);
        if (response.error) {
          reject(new Error(response.error.message || 'Wallet adapter error'));
        } else {
          resolve(response);
        }
      });

      // Send the message to Phantom
      this.sendMessageToWallet(message);
    });
  }

  /**
   * Send message to wallet via deep link
   */
  private async sendMessageToWallet(message: WalletAdapterMessage): Promise<void> {
    try {
      const messageUrl = this.buildWalletMessageUrl(message);
      console.log('🔗 RealWalletAdapterService: Sending message to Phantom:', messageUrl);
      
      await Linking.openURL(messageUrl);
      
    } catch (error) {
      console.error('🔗 RealWalletAdapterService: Error sending message to wallet:', error);
      throw error;
    }
  }

  /**
   * Build URL for sending messages to Phantom
   */
  private buildWalletMessageUrl(message: WalletAdapterMessage): string {
    const baseUrl = 'phantom://';
    const params = new URLSearchParams({
      method: message.method,
      params: JSON.stringify(message.params),
      id: message.id
    });
    
    return `${baseUrl}wallet-adapter?${params.toString()}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }

  /**
   * Send connection request to Phantom
   */
  async sendConnectionRequest(): Promise<WalletAdapterResponse> {
    const message: WalletAdapterMessage = {
      method: 'connect',
      params: {
        appName: 'WeSplit',
        appIcon: 'https://your-app-icon-url.com/icon.png',
        network: CURRENT_NETWORK
      },
      id: this.generateMessageId()
    };

    console.log('🔗 RealWalletAdapterService: Sending connection request:', message);
    
    return this.sendMessageToPhantom(message);
  }

  /**
   * Send transaction signing request to Phantom
   */
  async sendTransactionSignRequest(transaction: Transaction): Promise<WalletAdapterResponse> {
    const message: WalletAdapterMessage = {
      method: 'signTransaction',
      params: {
        transaction: transaction.serialize().toString('base64')
      },
      id: this.generateMessageId()
    };

    console.log('🔗 RealWalletAdapterService: Sending transaction sign request:', message);
    
    return this.sendMessageToPhantom(message);
  }

  /**
   * Send message signing request to Phantom
   */
  async sendMessageSignRequest(message: Uint8Array): Promise<WalletAdapterResponse> {
    const adapterMessage: WalletAdapterMessage = {
      method: 'signMessage',
      params: {
        message: Buffer.from(message).toString('base64')
      },
      id: this.generateMessageId()
    };

    console.log('🔗 RealWalletAdapterService: Sending message sign request:', adapterMessage);
    
    return this.sendMessageToPhantom(adapterMessage);
  }

  /**
   * Handle response from Phantom
   */
  handleWalletResponse(response: WalletAdapterResponse): void {
    console.log('🔗 RealWalletAdapterService: Received response from Phantom:', response);
    
    const handler = this.responseHandlers.get(response.id);
    if (handler) {
      handler(response);
    } else {
      console.warn('🔗 RealWalletAdapterService: No handler found for response ID:', response.id);
    }
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
      console.error('🔗 RealWalletAdapterService: Error getting balance:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const realWalletAdapterService = new RealWalletAdapterService(); 