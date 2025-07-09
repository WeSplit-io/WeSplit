import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  createTransferInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  getAccount, 
  TOKEN_PROGRAM_ID 
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
const CURRENT_NETWORK = 'devnet';
const RPC_ENDPOINT = SOLANA_RPC_ENDPOINTS[CURRENT_NETWORK];
const USDC_MINT_ADDRESS = USDC_MINT_ADDRESSES[CURRENT_NETWORK];

// Create connection to Solana cluster
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

export interface SolanaTransactionParams {
  to: string;
  amount: number;
  currency: string;
  memo?: string;
  groupId?: string;
}

export interface SolanaTransactionResult {
  signature: string;
  txId: string;
  blockTime?: number;
  slot?: number;
  confirmationStatus?: string;
}

export interface SolanaWalletInfo {
  address: string;
  publicKey: PublicKey;
  balance: number;
  usdcBalance?: number;
  isConnected: boolean;
}

export class SolanaTransactionService {
  private keypair: Keypair | null = null;
  private connection: Connection;
  private usdcMint: PublicKey;

  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.usdcMint = new PublicKey(USDC_MINT_ADDRESS);
  }

  // Generate a new wallet
  async generateWallet(): Promise<{ address: string; publicKey: string; secretKey: string }> {
    try {
      const newKeypair = Keypair.generate();
      this.keypair = newKeypair;
      
      const secretKeyArray = Array.from(newKeypair.secretKey);
      const secretKeyBase64 = Buffer.from(newKeypair.secretKey).toString('base64');
      
      return {
        address: newKeypair.publicKey.toBase58(),
        publicKey: newKeypair.publicKey.toBase58(),
        secretKey: secretKeyBase64
      };
    } catch (error) {
      console.error('Error generating wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  // Import wallet from secret key
  async importWallet(secretKey: string): Promise<{ address: string; publicKey: string }> {
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
      
      return {
        address: this.keypair.publicKey.toBase58(),
        publicKey: this.keypair.publicKey.toBase58()
      };
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet: ' + (error as Error).message);
    }
  }

  // Get wallet info
  async getWalletInfo(): Promise<SolanaWalletInfo> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const publicKey = this.keypair.publicKey;
      
      // Get SOL balance
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const usdcTokenAccount = await getAssociatedTokenAddress(
          this.usdcMint,
          publicKey
        );
        
        const accountInfo = await getAccount(this.connection, usdcTokenAccount);
        usdcBalance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist, balance is 0
        console.log('USDC token account does not exist for this wallet');
      }
      
      return {
        address: publicKey.toBase58(),
        publicKey: publicKey,
        balance: solBalance,
        usdcBalance: usdcBalance,
        isConnected: true
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      throw new Error('Failed to get wallet info');
    }
  }

  // Send SOL transaction
  async sendSolTransaction(params: SolanaTransactionParams): Promise<SolanaTransactionResult> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      const lamports = params.amount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add compute budget instruction to handle fees
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        })
      );

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(params.memo, 'utf8'),
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

      // Get transaction details
      const txInfo = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });

      return {
        signature,
        txId: signature,
        blockTime: txInfo?.blockTime || undefined,
        slot: txInfo?.slot || undefined,
        confirmationStatus: 'confirmed'
      };
    } catch (error) {
      console.error('Error sending SOL transaction:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }

  // Send USDC transaction
  async sendUsdcTransaction(params: SolanaTransactionParams): Promise<SolanaTransactionResult> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    try {
      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      const amount = params.amount * 1000000; // USDC has 6 decimals

      // Get associated token addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        fromPublicKey
      );
      
      const toTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        toPublicKey
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add compute budget instruction
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        })
      );

      // Check if recipient token account exists, create if not
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
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
          amount
        )
      );

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(params.memo, 'utf8'),
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

      // Get transaction details
      const txInfo = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });

      return {
        signature,
        txId: signature,
        blockTime: txInfo?.blockTime || undefined,
        slot: txInfo?.slot || undefined,
        confirmationStatus: 'confirmed'
      };
    } catch (error) {
      console.error('Error sending USDC transaction:', error);
      throw new Error('USDC transaction failed: ' + (error as Error).message);
    }
  }

  // Main transaction method
  async sendTransaction(params: SolanaTransactionParams): Promise<SolanaTransactionResult> {
    if (params.currency.toLowerCase() === 'usdc') {
      return await this.sendUsdcTransaction(params);
    } else if (params.currency.toLowerCase() === 'sol') {
      return await this.sendSolTransaction(params);
    } else {
      throw new Error(`Unsupported currency: ${params.currency}`);
    }
  }

  // Request airdrop for testing (devnet only)
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.keypair) {
      throw new Error('No wallet connected');
    }

    if (CURRENT_NETWORK !== 'devnet') {
      throw new Error('Airdrop is only available on devnet');
    }

    try {
      const signature = await this.connection.requestAirdrop(
        this.keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    } catch (error) {
      console.error('Error requesting airdrop:', error);
      throw new Error('Failed to request airdrop: ' + (error as Error).message);
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
}

// Export singleton instance
export const solanaService = new SolanaTransactionService(); 