/**
 * Consolidated Transaction Service for WeSplit
 * Combines all transaction processing functionality with company fee handling
 * Replaces: productionPaymentService, productionTransactionService, solanaTransactionService, 
 * existingWalletTransactionService, and parts of solanaAppKitService
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RPC_CONFIG, USDC_CONFIG } from './shared/walletConstants';

// Types
export interface TransactionParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  priority?: 'low' | 'medium' | 'high';
  userId?: string;
}

export interface TransactionResult {
  signature: string;
  txId: string;
  success: boolean;
  error?: string;
  companyFee?: number;
  netAmount?: number;
}

export interface PaymentRequest {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  description?: string;
  groupId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestResult {
  success: boolean;
  requestId?: string;
  transactionId?: string;
  error?: string;
}

// Company fee structure
const COMPANY_FEE_STRUCTURE = {
  percentage: 0.025, // 2.5%
  minimum: 0.001, // 0.001 SOL minimum
  maximum: 0.1 // 0.1 SOL maximum
};

// Transaction configuration
const TRANSACTION_CONFIG = {
  retry: {
    maxRetries: 3,
    retryDelay: 1000
  },
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 10000
  }
};

class ConsolidatedTransactionService {
  private static instance: ConsolidatedTransactionService;
  private connection: Connection;
  private keypair: Keypair | null = null;
  private isProduction: boolean;

  private constructor() {
    this.connection = new Connection(RPC_CONFIG.endpoint, 'confirmed');
    this.isProduction = !__DEV__;
  }

  public static getInstance(): ConsolidatedTransactionService {
    if (!ConsolidatedTransactionService.instance) {
      ConsolidatedTransactionService.instance = new ConsolidatedTransactionService();
    }
    return ConsolidatedTransactionService.instance;
  }

  // ===== TRANSACTION METHODS =====

  /**
   * Send SOL transaction with company fee
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    try {
      if (!this.keypair) {
        throw new Error('No wallet connected');
      }

      console.log('🚀 Sending SOL transaction:', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId,
        priority: params.priority,
        isProduction: this.isProduction,
      });

      // Calculate company fee
      const { fee: companyFee, netAmount } = this.calculateCompanyFee(params.amount);

      console.log('💰 Fee calculation:', {
        originalAmount: params.amount,
        companyFee,
        netAmount,
        feePercentage: COMPANY_FEE_STRUCTURE.percentage,
      });

      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      const lamports = netAmount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

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
      const signature = await this.sendTransactionWithRetry(transaction, params.priority);

      // Save transaction to Firestore
      if (params.userId) {
        await this.saveTransactionToFirestore({
          userId: params.userId,
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          signature,
          companyFee,
          netAmount,
          memo: params.memo
        });
      }

      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount
      };

    } catch (error) {
      console.error('Error sending SOL transaction:', error);
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Send USDC transaction with company fee
   */
  async sendUSDCTransaction(params: TransactionParams): Promise<TransactionResult> {
    try {
      if (!this.keypair) {
        throw new Error('No wallet connected');
      }

      console.log('🚀 Sending USDC transaction:', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId,
        priority: params.priority,
        isProduction: this.isProduction,
      });

      // Calculate company fee
      const { fee: companyFee, netAmount } = this.calculateCompanyFee(params.amount);

      console.log('💰 Fee calculation:', {
        originalAmount: params.amount,
        companyFee,
        netAmount,
        feePercentage: COMPANY_FEE_STRUCTURE.percentage,
      });

      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      const amount = Math.floor(netAmount * 1_000_000); // USDC has 6 decimals

      // Get associated token addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        toPublicKey
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: fromPublicKey
      });

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
      }

      // Check if recipient has USDC token account, create if not
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Token account doesn't exist, create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey, // payer
            toTokenAccount, // ata
            toPublicKey, // owner
            new PublicKey(USDC_CONFIG.mintAddress) // mint
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
      const signature = await this.sendTransactionWithRetry(transaction, params.priority);

      // Save transaction to Firestore
      if (params.userId) {
        await this.saveTransactionToFirestore({
          userId: params.userId,
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          signature,
          companyFee,
          netAmount,
          memo: params.memo
        });
      }

      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount
      };

    } catch (error) {
      console.error('Error sending USDC transaction:', error);
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Send transaction with retry logic
   */
  private async sendTransactionWithRetry(transaction: Transaction, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= TRANSACTION_CONFIG.retry.maxRetries; attempt++) {
      try {
        console.log(`🔄 Transaction attempt ${attempt}/${TRANSACTION_CONFIG.retry.maxRetries} (${priority} priority)`);
        
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [this.keypair!],
          {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
            maxRetries: 0,
            skipPreflight: false,
          }
        );
        
        console.log(`✅ Transaction successful on attempt ${attempt}:`, signature);
        return signature;
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Transaction attempt ${attempt} failed:`, error);
        
        if (attempt < TRANSACTION_CONFIG.retry.maxRetries) {
          const delay = TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Transaction failed after ${TRANSACTION_CONFIG.retry.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Get priority fee based on priority level
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Calculate company fee
   */
  calculateCompanyFee(amount: number): { fee: number; netAmount: number } {
    const fee = Math.max(
      COMPANY_FEE_STRUCTURE.minimum,
      Math.min(amount * COMPANY_FEE_STRUCTURE.percentage, COMPANY_FEE_STRUCTURE.maximum)
    );
    const netAmount = amount - fee;
    return { fee, netAmount };
  }

  // ===== PAYMENT REQUEST METHODS =====

  /**
   * Create a payment request
   */
  async createPaymentRequest(
    senderId: string | number,
    recipientId: string | number,
    amount: number,
    currency: string = 'USDC',
    description?: string,
    groupId?: string | number
  ): Promise<PaymentRequest> {
    try {
      console.log('🔄 Creating payment request:', {
        senderId,
        recipientId,
        amount,
        currency,
        description,
        groupId,
        isProduction: this.isProduction,
      });

      const requestData = {
        senderId: String(senderId),
        recipientId: String(recipientId),
        amount,
        currency,
        description: description || '',
        groupId: groupId ? String(groupId) : null,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const requestRef = await addDoc(collection(db, 'paymentRequests'), requestData);
      
      const request: PaymentRequest = {
        id: requestRef.id,
        senderId: String(senderId),
        recipientId: String(recipientId),
        amount,
        currency,
        description: description || '',
        groupId: groupId ? String(groupId) : undefined,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('✅ Payment request created:', request.id);
      return request;

    } catch (error) {
      console.error('❌ Error creating payment request:', error);
      throw new Error(`Failed to create payment request: ${(error as Error).message}`);
    }
  }

  /**
   * Process a payment request (accept and send payment)
   */
  async processPaymentRequest(
    requestId: string,
    payerId: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<PaymentRequestResult> {
    try {
      console.log('🔄 Processing payment request:', {
        requestId,
        payerId,
        priority,
        isProduction: this.isProduction,
      });

      // Get the payment request
      const requestDoc = await getDoc(doc(db, 'paymentRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Payment request not found');
      }

      const request = requestDoc.data() as PaymentRequest;
      
      // Validate payer
      if (request.recipientId !== String(payerId)) {
        throw new Error('You are not authorized to pay this request');
      }

      // Check if already processed
      if (request.status !== 'pending') {
        throw new Error(`Payment request is already ${request.status}`);
      }

      // Update status to processing
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'processing',
        updated_at: serverTimestamp()
      });

      // Get payer's wallet address
      const payerDoc = await getDoc(doc(db, 'users', String(payerId)));
      if (!payerDoc.exists()) {
        throw new Error('Payer not found');
      }

      const payerData = payerDoc.data();
      const payerWalletAddress = payerData?.wallet_address;
      
      if (!payerWalletAddress) {
        throw new Error('Payer wallet address not found');
      }

      // Get sender's wallet address
      const senderDoc = await getDoc(doc(db, 'users', request.senderId));
      if (!senderDoc.exists()) {
        throw new Error('Sender not found');
      }

      const senderData = senderDoc.data();
      const senderWalletAddress = senderData?.wallet_address;
      
      if (!senderWalletAddress) {
        throw new Error('Sender wallet address not found');
      }

      // Send the transaction
      const transactionResult = await this.sendTransaction({
        to: senderWalletAddress,
        amount: request.amount,
        currency: request.currency as 'SOL' | 'USDC',
        memo: `Payment for: ${request.description || 'Payment request'}`,
        priority,
        userId: String(payerId)
      });

      if (!transactionResult.success) {
        // Update status to failed
        await updateDoc(doc(db, 'paymentRequests', requestId), {
          status: 'failed',
          updated_at: serverTimestamp()
        });
        
        throw new Error(transactionResult.error || 'Transaction failed');
      }

      // Update status to completed
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status: 'completed',
        transactionId: transactionResult.signature,
        updated_at: serverTimestamp()
      });

      console.log('✅ Payment request processed successfully:', requestId);

      return {
        success: true,
        requestId,
        transactionId: transactionResult.signature
      };

    } catch (error) {
      console.error('❌ Error processing payment request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Get payment requests for a user
   */
  async getPaymentRequests(userId: string): Promise<PaymentRequest[]> {
    try {
      const requestsQuery = query(
        collection(db, 'paymentRequests'),
        where('recipientId', '==', userId),
        where('status', '==', 'pending')
      );

      const requestsSnapshot = await getDocs(requestsQuery);
      const requests: PaymentRequest[] = [];

      requestsSnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          senderId: data.senderId,
          recipientId: data.recipientId,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          groupId: data.groupId,
          status: data.status,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      return requests;
    } catch (error) {
      console.error('Error getting payment requests:', error);
      return [];
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Save transaction to Firestore
   */
  private async saveTransactionToFirestore(transactionData: {
    userId: string;
    to: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: transactionData.userId,
        to: transactionData.to,
        amount: transactionData.amount,
        currency: transactionData.currency,
        signature: transactionData.signature,
        companyFee: transactionData.companyFee,
        netAmount: transactionData.netAmount,
        memo: transactionData.memo || '',
        status: 'completed',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving transaction to Firestore:', error);
    }
  }

  /**
   * Set wallet keypair for transactions
   */
  setWalletKeypair(keypair: Keypair): void {
    this.keypair = keypair;
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<{ address: string; publicKey: string } | null> {
    if (!this.keypair) {
      return null;
    }

    return {
      address: this.keypair.publicKey.toBase58(),
      publicKey: this.keypair.publicKey.toBase58(),
    };
  }

  /**
   * Get user wallet balance (stub implementation)
   */
  async getUserWalletBalance(userId: string): Promise<{ usdc: number; sol: number }> {
    console.log('🔗 ConsolidatedTransactionService: Getting wallet balance for user:', userId);
    // TODO: Implement proper balance checking
    return { usdc: 100, sol: 1 }; // Mock balance
  }

  /**
   * Get transaction fee estimate (stub implementation)
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    console.log('🔗 ConsolidatedTransactionService: Getting fee estimate:', { amount, currency, priority });
    // TODO: Implement proper fee estimation
    return amount * COMPANY_FEE_STRUCTURE.percentage; // Mock fee
  }

  /**
   * Send USDC transaction (stub implementation)
   */
  async sendUsdcTransaction(toAddress: string, amount: number, userId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    console.log('🔗 ConsolidatedTransactionService: Sending USDC transaction:', { toAddress, amount, userId });
    // TODO: Implement proper USDC transaction
    return {
      success: false,
      error: 'USDC transaction functionality not yet implemented'
    };
  }

  /**
   * Get user wallet address (stub implementation)
   */
  async getUserWalletAddress(userId: string): Promise<string | null> {
    console.log('🔗 ConsolidatedTransactionService: Getting wallet address for user:', userId);
    // TODO: Implement proper wallet address retrieval
    return '11111111111111111111111111111112'; // Mock address
  }

  /**
   * Check if user has sufficient SOL for gas (stub implementation)
   */
  async hasSufficientSolForGas(userId: string): Promise<boolean> {
    console.log('🔗 ConsolidatedTransactionService: Checking SOL balance for gas:', userId);
    // TODO: Implement proper SOL balance checking
    return true; // Mock result
  }

  /**
   * Get company fee structure
   */
  getCompanyFeeStructure() {
    return COMPANY_FEE_STRUCTURE;
  }
}

// Export singleton instance
export const consolidatedTransactionService = ConsolidatedTransactionService.getInstance();
