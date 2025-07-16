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
}

export interface CreateWalletResult {
  wallet: WalletInfo;
  mnemonic?: string;
}

export class SolanaAppKitService {
  private connection: Connection;
  private keypair: Keypair | null = null;
  private usdcMint: PublicKey;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.usdcMint = new PublicKey(USDC_MINT_ADDRESS);
  }

  // Create a new wallet using AppKit
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
        isConnected: true
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
        isConnected: true
      };
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet: ' + (error as Error).message);
    }
  }

  // Get wallet information
  async getWalletInfo(): Promise<WalletInfo> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const address = this.keypair.publicKey.toBase58();
      const publicKey = this.keypair.publicKey.toBase58();
      
      // Get SOL balance
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      const usdcBalance = await this.getUsdcBalance(this.keypair.publicKey);
      
      return {
        address,
        publicKey,
        balance: solBalance,
        usdcBalance,
        isConnected: true
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
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair.publicKey;
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

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
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
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(to);
      const amountInSmallestUnit = Math.floor(amount * 1000000); // USDC has 6 decimals

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Get or create associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        toPublicKey
      );

      // Check if recipient token account exists
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch {
        // Create recipient token account if it doesn't exist
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
          amountInSmallestUnit
        )
      );

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
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
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.keypair !== null;
  }

  // Get current network
  getCurrentNetwork(): string {
    return CURRENT_NETWORK;
  }

  // Get RPC endpoint
  getRpcEndpoint(): string {
    return RPC_ENDPOINT;
  }
}

// Export singleton instance
export const solanaAppKitService = new SolanaAppKitService(); 