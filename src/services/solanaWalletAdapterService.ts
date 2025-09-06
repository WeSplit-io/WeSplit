import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { phantomWalletLinkingService } from './phantomWalletLinkingService';

export interface WalletAdapter {
  name: string;
  publicKey: PublicKey | null;
  connecting: boolean;
  connected: boolean;
  supportedTransactionVersions: Set<number>;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]>;
}

export interface WalletAdapterNetwork {
  name: string;
  endpoint: string;
}

export class SolanaWalletAdapterService {
  private connection: Connection;
  private adapters: Map<string, WalletAdapter> = new Map();
  private currentAdapter: WalletAdapter | null = null;
  private network: WalletAdapterNetwork;
  private phantomAdapter!: WalletAdapter; // Use definite assignment assertion

  constructor() {
    this.network = {
      name: 'mainnet-beta',
      endpoint: 'https://api.mainnet-beta.solana.com'
    };
    
    this.connection = new Connection(this.network.endpoint, 'confirmed');
    this.initializeAdapters();
    
    console.log('🔗 SolanaWalletAdapterService: Initialized');
  }

  private initializeAdapters() {
    // Initialize Phantom adapter
    this.phantomAdapter = {
      name: 'Phantom',
      publicKey: null,
      connecting: false,
      connected: false,
      supportedTransactionVersions: new Set([0]), // Fix type issue

      connect: async () => {
        try {
          this.phantomAdapter.connecting = true;
          
          // Check if Phantom is available
          const isAvailable = await phantomWalletLinkingService.isPhantomAvailable();
          if (!isAvailable) {
            throw new Error('Phantom wallet is not available');
          }

          // For now, we'll use a mock connection
          // In production, this would implement the full Solana Wallet Adapter protocol
          const mockPublicKey = new PublicKey(Buffer.alloc(32).fill(1));
          
          this.phantomAdapter.publicKey = mockPublicKey;
          this.phantomAdapter.connected = true;
          this.phantomAdapter.connecting = false;
          
          console.log('🔗 SolanaWalletAdapterService: Phantom connected successfully');
          
        } catch (error) {
          this.phantomAdapter.connecting = false;
          throw error;
        }
      },

      disconnect: async () => {
        this.phantomAdapter.publicKey = null;
        this.phantomAdapter.connected = false;
        this.phantomAdapter.connecting = false;
        console.log('🔗 SolanaWalletAdapterService: Phantom disconnected');
      },

      signTransaction: async (transaction: Transaction | VersionedTransaction) => {
        if (!this.phantomAdapter.connected || !this.phantomAdapter.publicKey) {
          throw new Error('Phantom wallet not connected');
        }

        // For now, we'll simulate signing
        // In production, this would use Phantom's actual signing method
        console.log('🔗 SolanaWalletAdapterService: Signing transaction with Phantom');
        
        // Simulate signing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return transaction;
      },

      signMessage: async (message: Uint8Array) => {
        if (!this.phantomAdapter.connected || !this.phantomAdapter.publicKey) {
          throw new Error('Phantom wallet not connected');
        }

        console.log('🔗 SolanaWalletAdapterService: Signing message with Phantom');
        
        // For now, we'll simulate signing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return message;
      },

      signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
        if (!this.phantomAdapter.connected || !this.phantomAdapter.publicKey) {
          throw new Error('Phantom wallet not connected');
        }

        console.log('🔗 SolanaWalletAdapterService: Signing multiple transactions with Phantom');
        
        // Sign each transaction
        const signedTransactions = [];
        for (const transaction of transactions) {
          const signed = await this.phantomAdapter.signTransaction(transaction);
          signedTransactions.push(signed);
        }
        
        return signedTransactions;
      }
    };

    this.adapters.set('phantom', this.phantomAdapter);
  }

  /**
   * Get all available wallet adapters
   */
  getAvailableAdapters(): WalletAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get a specific wallet adapter by name
   */
  getAdapter(name: string): WalletAdapter | undefined {
    return this.adapters.get(name.toLowerCase());
  }

  /**
   * Connect to a specific wallet adapter
   */
  async connectAdapter(name: string): Promise<void> {
    const adapter = this.getAdapter(name);
    if (!adapter) {
      throw new Error(`Wallet adapter '${name}' not found`);
    }

    if (adapter.connected) {
      console.log(`🔗 SolanaWalletAdapterService: ${name} already connected`);
      return;
    }

    try {
      await adapter.connect();
      this.currentAdapter = adapter;
      console.log(`🔗 SolanaWalletAdapterService: Connected to ${name}`);
    } catch (error) {
      console.error(`🔗 SolanaWalletAdapterService: Failed to connect to ${name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from current wallet adapter
   */
  async disconnectAdapter(): Promise<void> {
    if (this.currentAdapter) {
      await this.currentAdapter.disconnect();
      this.currentAdapter = null;
      console.log('🔗 SolanaWalletAdapterService: Disconnected from wallet adapter');
    }
  }

  /**
   * Get current connected adapter
   */
  getCurrentAdapter(): WalletAdapter | null {
    return this.currentAdapter;
  }

  /**
   * Check if any adapter is connected
   */
  isConnected(): boolean {
    return this.currentAdapter?.connected || false;
  }

  /**
   * Get current wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.currentAdapter?.publicKey || null;
  }

  /**
   * Sign a transaction with the current adapter
   */
  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter connected');
    }

    return await this.currentAdapter.signTransaction(transaction);
  }

  /**
   * Sign a message with the current adapter
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter connected');
    }

    return await this.currentAdapter.signMessage(message);
  }

  /**
   * Sign multiple transactions with the current adapter
   */
  async signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.currentAdapter) {
      throw new Error('No wallet adapter connected');
    }

    return await this.currentAdapter.signAllTransactions(transactions);
  }

  /**
   * Get current network configuration
   */
  getNetwork(): WalletAdapterNetwork {
    return this.network;
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(network: WalletAdapterNetwork): Promise<void> {
    if (this.currentAdapter?.connected) {
      throw new Error('Cannot switch networks while wallet is connected');
    }

    this.network = network;
    this.connection = new Connection(network.endpoint, 'confirmed');
    console.log(`🔗 SolanaWalletAdapterService: Switched to network: ${network.name}`);
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
}

// Export singleton instance
export const solanaWalletAdapterService = new SolanaWalletAdapterService(); 