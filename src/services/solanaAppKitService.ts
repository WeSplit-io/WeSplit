import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com'
};

// USDC Token mint addresses
const USDC_MINT_ADDRESSES = {
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
  testnet: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp', // Testnet USDC
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
};

// Current network configuration
const CURRENT_NETWORK = process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet';
const RPC_ENDPOINT = SOLANA_RPC_ENDPOINTS[CURRENT_NETWORK];
const USDC_MINT_ADDRESS = USDC_MINT_ADDRESSES[CURRENT_NETWORK];

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance: number;
  usdcBalance: number;
  isConnected: boolean;
  walletName?: string;
  walletType?: 'app-generated' | 'external';
}

export interface CreateWalletResult {
  wallet: WalletInfo;
  mnemonic?: string;
}

export interface WalletProvider {
  name: string;
  icon: string;
  isAvailable: boolean;
  connect(): Promise<WalletInfo>;
  disconnect(): Promise<void>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

// Supported wallet providers
export const SUPPORTED_WALLET_PROVIDERS = {
  PHANTOM: 'phantom',
  SOLFLARE: 'solflare',
  BACKPACK: 'backpack',
  SLOPE: 'slope',
  GLOW: 'glow',
  EXODUS: 'exodus',
  COINBASE: 'coinbase',
  OKX: 'okx',
  BRAVE: 'brave',
  CLUSTER: 'cluster',
  MAGIC_EDEN: 'magic-eden',
  TALISMAN: 'talisman',
  XDEFI: 'xdefi',
  ZERION: 'zerion',
  TRUST: 'trust',
  SAFEPAL: 'safepal',
  BITGET: 'bitget',
  BYBIT: 'bybit',
  GATE: 'gate',
  HUOBI: 'huobi',
  KRAKEN: 'kraken',
  BINANCE: 'binance',
  MATH: 'math',
  TOKENPOCKET: 'tokenpocket',
  ONTO: 'onto',
  IMTOKEN: 'imtoken',
  COIN98: 'coin98',
  BLOCTO: 'blocto',
  PEAK: 'peak',
  NIGHTLY: 'nightly',
  NIGHTLY_CONNECT: 'nightly-connect',
  CLOVER: 'clover',
  CLOVER_CONNECT: 'clover-connect',
  WALLET_CONNECT: 'wallet-connect',
  WALLET_CONNECT_V2: 'wallet-connect-v2',
  METAMASK: 'metamask',
  RAINBOW: 'rainbow',
  ARGENT: 'argent',
  BRAVOS: 'bravos',
  MYRIA: 'myria',
  ZERION_CONNECT: 'zerion-connect',
  OKX_CONNECT: 'okx-connect',
  BYBIT_CONNECT: 'bybit-connect',
  GATE_CONNECT: 'gate-connect',
  HUOBI_CONNECT: 'huobi-connect',
  KRAKEN_CONNECT: 'kraken-connect',
  BINANCE_CONNECT: 'binance-connect',
  MATH_CONNECT: 'math-connect',
  TOKENPOCKET_CONNECT: 'tokenpocket-connect',
  ONTO_CONNECT: 'onto-connect',
  IMTOKEN_CONNECT: 'imtoken-connect',
  COIN98_CONNECT: 'coin98-connect',
  BLOCTO_CONNECT: 'blocto-connect',
  PEAK_CONNECT: 'peak-connect',
  NIGHTLY_CONNECT_V2: 'nightly-connect-v2',
  CLOVER_CONNECT_V2: 'clover-connect-v2',
  WALLET_CONNECT_V3: 'wallet-connect-v3',
  METAMASK_CONNECT: 'metamask-connect',
  RAINBOW_CONNECT: 'rainbow-connect',
  ARGENT_CONNECT: 'argent-connect',
  BRAVOS_CONNECT: 'bravos-connect',
  MYRIA_CONNECT: 'myria-connect'
};

export class SolanaAppKitService {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private usdcMint: PublicKey;
  private connectedProvider: WalletProvider | null = null;
  private availableProviders: Map<string, WalletProvider> = new Map();

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.usdcMint = new PublicKey(USDC_MINT_ADDRESS);
    this.initializeWalletProviders();
  }

  // Initialize available wallet providers
  private initializeWalletProviders() {
    // For now, we'll create mock providers
    // In a real implementation, these would be actual wallet adapters
    this.createMockProviders();
  }

  // Create mock wallet providers for development
  private createMockProviders() {
    const mockProviders = [
      { name: 'Phantom', key: SUPPORTED_WALLET_PROVIDERS.PHANTOM },
      { name: 'Solflare', key: SUPPORTED_WALLET_PROVIDERS.SOLFLARE },
      { name: 'Backpack', key: SUPPORTED_WALLET_PROVIDERS.BACKPACK },
      { name: 'Slope', key: SUPPORTED_WALLET_PROVIDERS.SLOPE },
      { name: 'Glow', key: SUPPORTED_WALLET_PROVIDERS.GLOW },
      { name: 'Exodus', key: SUPPORTED_WALLET_PROVIDERS.EXODUS },
      { name: 'Coinbase', key: SUPPORTED_WALLET_PROVIDERS.COINBASE },
      { name: 'OKX', key: SUPPORTED_WALLET_PROVIDERS.OKX },
      { name: 'Brave', key: SUPPORTED_WALLET_PROVIDERS.BRAVE },
      { name: 'Cluster', key: SUPPORTED_WALLET_PROVIDERS.CLUSTER },
      { name: 'Magic Eden', key: SUPPORTED_WALLET_PROVIDERS.MAGIC_EDEN },
      { name: 'Talisman', key: SUPPORTED_WALLET_PROVIDERS.TALISMAN },
      { name: 'XDeFi', key: SUPPORTED_WALLET_PROVIDERS.XDEFI },
      { name: 'Zerion', key: SUPPORTED_WALLET_PROVIDERS.ZERION },
      { name: 'Trust', key: SUPPORTED_WALLET_PROVIDERS.TRUST },
      { name: 'SafePal', key: SUPPORTED_WALLET_PROVIDERS.SAFEPAL },
      { name: 'Bitget', key: SUPPORTED_WALLET_PROVIDERS.BITGET },
      { name: 'Bybit', key: SUPPORTED_WALLET_PROVIDERS.BYBIT },
      { name: 'Gate', key: SUPPORTED_WALLET_PROVIDERS.GATE },
      { name: 'Huobi', key: SUPPORTED_WALLET_PROVIDERS.HUOBI },
      { name: 'Kraken', key: SUPPORTED_WALLET_PROVIDERS.KRAKEN },
      { name: 'Binance', key: SUPPORTED_WALLET_PROVIDERS.BINANCE },
      { name: 'Math', key: SUPPORTED_WALLET_PROVIDERS.MATH },
      { name: 'TokenPocket', key: SUPPORTED_WALLET_PROVIDERS.TOKENPOCKET },
      { name: 'ONTO', key: SUPPORTED_WALLET_PROVIDERS.ONTO },
      { name: 'imToken', key: SUPPORTED_WALLET_PROVIDERS.IMTOKEN },
      { name: 'Coin98', key: SUPPORTED_WALLET_PROVIDERS.COIN98 },
      { name: 'Blocto', key: SUPPORTED_WALLET_PROVIDERS.BLOCTO },
      { name: 'Peak', key: SUPPORTED_WALLET_PROVIDERS.PEAK },
      { name: 'Nightly', key: SUPPORTED_WALLET_PROVIDERS.NIGHTLY },
      { name: 'Clover', key: SUPPORTED_WALLET_PROVIDERS.CLOVER },
      { name: 'WalletConnect', key: SUPPORTED_WALLET_PROVIDERS.WALLET_CONNECT },
      { name: 'MetaMask', key: SUPPORTED_WALLET_PROVIDERS.METAMASK },
      { name: 'Rainbow', key: SUPPORTED_WALLET_PROVIDERS.RAINBOW },
      { name: 'Argent', key: SUPPORTED_WALLET_PROVIDERS.ARGENT },
      { name: 'Bravos', key: SUPPORTED_WALLET_PROVIDERS.BRAVOS },
      { name: 'Myria', key: SUPPORTED_WALLET_PROVIDERS.MYRIA }
    ];

    mockProviders.forEach(({ name, key }) => {
      const provider: WalletProvider = {
        name,
        icon: `${key.toLowerCase()}-icon`,
        isAvailable: true, // Mock availability
        connect: async () => {
          // Mock connection - in real implementation, this would connect to actual wallet
          const mockKeypair = Keypair.generate();
          const address = mockKeypair.publicKey.toBase58();
          const balance = await this.connection.getBalance(mockKeypair.publicKey);
          const usdcBalance = await this.getUsdcBalance(mockKeypair.publicKey);
          
          return {
            address,
            publicKey: address,
            balance: balance / LAMPORTS_PER_SOL,
            usdcBalance,
            isConnected: true,
            walletName: name,
            walletType: 'external'
          };
        },
        disconnect: async () => {
          // Mock disconnect
          this.connectedProvider = null;
          this.keypair = null;
        },
        signTransaction: async (transaction: Transaction) => {
          // Mock transaction signing
          if (!this.keypair) {
            throw new Error('No wallet connected');
          }
          transaction.sign(this.keypair);
          return transaction;
        },
        signMessage: async (message: Uint8Array) => {
          // Mock message signing
          if (!this.keypair) {
            throw new Error('No wallet connected');
          }
          // In real implementation, this would use the wallet's signing method
          return message;
        }
      };
      
      this.availableProviders.set(key, provider);
    });
  }

  // Get available wallet providers
  getAvailableProviders(): WalletProvider[] {
    return Array.from(this.availableProviders.values()).filter(p => p.isAvailable);
  }

  // Connect to a specific wallet provider
  async connectToProvider(providerKey: string): Promise<WalletInfo> {
    const provider = this.availableProviders.get(providerKey);
    if (!provider) {
      throw new Error(`Wallet provider '${providerKey}' not found`);
    }

    if (!provider.isAvailable) {
      throw new Error(`Wallet provider '${providerKey}' is not available`);
    }

    try {
      const walletInfo = await provider.connect();
      this.connectedProvider = provider;
      
      // For mock implementation, we'll create a keypair for the connected wallet
      if (walletInfo.walletType === 'external') {
        // In real implementation, you wouldn't have the secret key for external wallets
        // This is just for mock purposes
        const mockKeypair = Keypair.generate();
        this.keypair = mockKeypair;
      }

      return walletInfo;
    } catch (error) {
      console.error(`Error connecting to ${provider.name}:`, error);
      throw new Error(`Failed to connect to ${provider.name}: ${(error as Error).message}`);
    }
  }

  // Disconnect from current wallet provider
  async disconnectFromProvider(): Promise<void> {
    if (this.connectedProvider) {
      await this.connectedProvider.disconnect();
      this.connectedProvider = null;
      this.keypair = null;
    }
  }

  // Create a new wallet using AppKit (app-generated wallet)
  async createWallet(): Promise<CreateWalletResult> {
    try {
      // Generate a new keypair
      const newKeypair = Keypair.generate();
      this.keypair = newKeypair;

      const address = newKeypair.publicKey.toBase58();
      const publicKey = newKeypair.publicKey.toBase58();
      const secretKey = Buffer.from(newKeypair.secretKey).toString('base64');

      // Get initial balance
      const balance = await this.connection.getBalance(newKeypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Get USDC balance (will be 0 for new wallet)
      const usdcBalance = await this.getUsdcBalance(newKeypair.publicKey);

      const walletInfo: WalletInfo = {
        address,
        publicKey,
        secretKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Generated Wallet',
        walletType: 'app-generated'
      };

      return {
        wallet: walletInfo,
        mnemonic: undefined // AppKit doesn't provide mnemonic by default
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  // Import wallet from secret key
  async importWallet(secretKey: string): Promise<WalletInfo> {
    try {
      let keyData: Uint8Array;
      
      // Try to parse as base64 first
      try {
        keyData = new Uint8Array(Buffer.from(secretKey, 'base64'));
      } catch {
        // If base64 fails, try to parse as JSON array
        try {
          const keyArray = JSON.parse(secretKey);
          keyData = new Uint8Array(keyArray);
        } catch {
          throw new Error('Invalid secret key format');
        }
      }
      
      this.keypair = Keypair.fromSecretKey(keyData);
      
      const address = this.keypair.publicKey.toBase58();
      const publicKey = this.keypair.publicKey.toBase58();
      
      // Get balance
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      const usdcBalance = await this.getUsdcBalance(this.keypair.publicKey);

      return {
        address,
        publicKey,
        secretKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'Imported Wallet',
        walletType: 'app-generated'
      };
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet: ' + (error as Error).message);
    }
  }

  // Get wallet information
  async getWalletInfo(): Promise<WalletInfo> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      if (this.connectedProvider) {
        // For external wallets, we need to get info from the provider
        // This is a simplified mock implementation
        const mockKeypair = Keypair.generate();
        const address = mockKeypair.publicKey.toBase58();
        const balance = await this.connection.getBalance(mockKeypair.publicKey);
        const usdcBalance = await this.getUsdcBalance(mockKeypair.publicKey);
        
        return {
          address,
          publicKey: address,
          balance: balance / LAMPORTS_PER_SOL,
          usdcBalance,
          isConnected: true,
          walletName: this.connectedProvider.name,
          walletType: 'external'
        };
      }

      // For app-generated wallets
      const address = this.keypair!.publicKey.toBase58();
      const publicKey = this.keypair!.publicKey.toBase58();
      
      // Get SOL balance
      const balance = await this.connection.getBalance(this.keypair!.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      const usdcBalance = await this.getUsdcBalance(this.keypair!.publicKey);
      
      return {
        address,
        publicKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Generated Wallet',
        walletType: 'app-generated'
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw new Error('Failed to get wallet info');
    }
  }

  // Get USDC balance for a wallet
  private async getUsdcBalance(publicKey: PublicKey): Promise<number> {
    try {
      const usdcTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        publicKey
      );
      
      const accountInfo = await getAccount(this.connection, usdcTokenAccount);
      return Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
    } catch (error) {
      // Token account doesn't exist, balance is 0
      return 0;
    }
  }

  // Request airdrop for development
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const signature = await this.connection.requestAirdrop(
        this.keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );
      
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      throw new Error('Failed to request airdrop');
    }
  }

  // Send SOL transaction
  async sendSolTransaction(to: string, amount: number, memo?: string): Promise<string> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair ? this.keypair.publicKey : new PublicKey(to);
      const toPublicKey = new PublicKey(to);
      const lamports = amount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      // Add memo if provided
      if (memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign transaction
      if (this.connectedProvider) {
        // For external wallets, use the provider's signing method
        await this.connectedProvider.signTransaction(transaction);
      } else if (this.keypair) {
        // For app-generated wallets, sign directly
        transaction.sign(this.keypair);
      }

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        this.keypair ? [this.keypair] : [],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      return signature;
    } catch (error) {
      console.error('Error sending SOL transaction:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  // Send USDC transaction
  async sendUsdcTransaction(to: string, amount: number, memo?: string): Promise<string> {
    if (!this.keypair && !this.connectedProvider) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair ? this.keypair.publicKey : new PublicKey(to);
      const toPublicKey = new PublicKey(to);
      const usdcAmount = amount * 1000000; // USDC has 6 decimals

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Get or create associated token account for sender
      const fromTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        fromPublicKey
      );

      // Get or create associated token account for recipient
      const toTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        toPublicKey
      );

      // Add create token account instruction if needed
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        // Token account doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            toTokenAccount,
            toPublicKey,
            this.usdcMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          usdcAmount
        )
      );

      // Add memo if provided
      if (memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, 'utf8'),
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
        });
        transaction.add(memoInstruction);
      }

      // Sign transaction
      if (this.connectedProvider) {
        // For external wallets, use the provider's signing method
        await this.connectedProvider.signTransaction(transaction);
      } else if (this.keypair) {
        // For app-generated wallets, sign directly
        transaction.sign(this.keypair);
      }

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        this.keypair ? [this.keypair] : [],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );

      return signature;
    } catch (error) {
      console.error('Error sending USDC transaction:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  // Disconnect wallet
  disconnect(): void {
    this.keypair = null;
    this.connectedProvider = null;
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.keypair !== null || this.connectedProvider !== null;
  }

  // Get current network
  getCurrentNetwork(): string {
    return CURRENT_NETWORK;
  }

  // Get RPC endpoint
  getRpcEndpoint(): string {
    return RPC_ENDPOINT;
  }

  // Get connected provider info
  getConnectedProvider(): WalletProvider | null {
    return this.connectedProvider;
  }

  // Check if a specific provider is available
  isProviderAvailable(providerKey: string): boolean {
    const provider = this.availableProviders.get(providerKey);
    return provider ? provider.isAvailable : false;
  }
}

// Export singleton instance
export const solanaAppKitService = new SolanaAppKitService(); 