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
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import { internalTransferService } from '../transfer/sendInternal';
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
import { COMPANY_WALLET_CONFIG, CURRENT_NETWORK, TRANSACTION_CONFIG as CHAIN_TRANSACTION_CONFIG } from '../config/chain';

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
  percentage: 0.03, // 3% company fee on user currency transfers
  minimum: 0.01, // 0.01 USDC minimum (reduced to allow small transactions)
  maximum: 10.0 // 10.0 USDC maximum
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
  private rpcEndpoints: string[];
  private currentEndpointIndex: number = 0;

  private constructor() {
    this.rpcEndpoints = CURRENT_NETWORK.rpcEndpoints || [CURRENT_NETWORK.rpcUrl];
    this.connection = this.createOptimizedConnection();
    this.isProduction = !__DEV__;
  }

  private createOptimizedConnection(): Connection {
    const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
    
    return new Connection(currentEndpoint, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: CHAIN_TRANSACTION_CONFIG.timeout.transaction,
      wsEndpoint: CURRENT_NETWORK.wsUrl,
      disableRetryOnRateLimit: false,
      // Performance optimizations
      httpHeaders: {
        'User-Agent': 'WeSplit/1.0',
        'Connection': 'keep-alive',
      },
      // Connection pooling with React Native compatible timeout
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CHAIN_TRANSACTION_CONFIG.timeout.connection);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    });
  }

  private async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.connection = this.createOptimizedConnection();
    console.log(`🔄 ConsolidatedTransactionService: Switched to RPC endpoint: ${this.rpcEndpoints[this.currentEndpointIndex]}`);
  }

  /**
   * Get latest blockhash with retry logic and RPC failover
   */
  private async getLatestBlockhashWithRetry(commitment: 'confirmed' | 'finalized' = 'confirmed'): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { blockhash } = await this.connection.getLatestBlockhash(commitment);
        return blockhash;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Failed to get blockhash on attempt ${attempt + 1}/${maxRetries}:`, error);
        
        // Check if it's a network error that might benefit from RPC failover
        if (error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('AbortSignal') ||
          error.message.includes('aborted')
        )) {
          console.log(`🔄 Switching RPC endpoint due to network error...`);
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Send transaction with retry logic and RPC failover
   */
  private async sendTransactionWithRetry(
    transaction: Transaction, 
    signers: Keypair[], 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const maxRetries = CHAIN_TRANSACTION_CONFIG.retry.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get fresh blockhash for each attempt with retry logic
        const blockhash = await this.getLatestBlockhashWithRetry('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign the transaction
        transaction.sign(...signers);

        // Send transaction (faster than sendAndConfirmTransaction)
        const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 0, // We handle retries ourselves
        });

        console.log('🔗 ConsolidatedTransactionService: Transaction sent successfully', { 
          signature, 
          attempt: attempt + 1,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        });

        return signature;

      } catch (error) {
        lastError = error as Error;
        console.warn(`🔗 ConsolidatedTransactionService: Transaction send attempt ${attempt + 1} failed`, { 
          error: lastError.message,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        });

        // Switch to next RPC endpoint if available
        if (this.rpcEndpoints.length > 1) {
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = CHAIN_TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Confirm transaction with timeout and retry logic
   */
  private async confirmTransactionWithTimeout(signature: string): Promise<boolean> {
    const timeout = CHAIN_TRANSACTION_CONFIG.timeout.confirmation;
    
    try {
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeout);
      });

      const result = await Promise.race([confirmationPromise, timeoutPromise]);
      
      if (result.value?.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      return true;
    } catch (error) {
      console.warn('🔗 ConsolidatedTransactionService: Transaction confirmation failed or timed out', { 
        signature, 
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public static getInstance(): ConsolidatedTransactionService {
    if (!ConsolidatedTransactionService.instance) {
      ConsolidatedTransactionService.instance = new ConsolidatedTransactionService();
    }
    return ConsolidatedTransactionService.instance;
  }

  // ===== WALLET MANAGEMENT METHODS =====

  /**
   * Load wallet from secure storage (cybersecurity compliant)
   */
  async loadWallet(): Promise<boolean> {
    try {
      console.log('🔗 ConsolidatedTransactionService: Loading wallet from secure storage');
      
      // Use the existing solanaWalletService to load the wallet securely
      const { solanaWalletService } = await import('../wallet/solanaWallet');
      const walletLoaded = await solanaWalletService.loadWallet();
      
      if (walletLoaded) {
        // Get the keypair from solanaWalletService
        const walletInfo = await solanaWalletService.getWalletInfo();
        if (walletInfo && walletInfo.secretKey) {
          // Convert secret key back to keypair for this service
          const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
          this.keypair = Keypair.fromSecretKey(secretKeyBuffer);
          
          console.log('🔗 ConsolidatedTransactionService: Wallet loaded successfully', {
            address: this.keypair.publicKey.toBase58()
          });
          
          return true;
        }
      }
      
      console.warn('🔗 ConsolidatedTransactionService: Failed to load wallet');
      return false;
    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Error loading wallet:', error);
      return false;
    }
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

      // Calculate company fee - NEW APPROACH
      const { fee: companyFee, totalAmount, recipientAmount } = this.calculateCompanyFee(params.amount);

      console.log('💰 Fee calculation:', {
        originalAmount: params.amount,
        companyFee,
        recipientAmount,
        totalAmount,
        feePercentage: COMPANY_FEE_STRUCTURE.percentage,
      });

      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      
      // Recipient gets the full amount
      const lamports = recipientAmount * LAMPORTS_PER_SOL;

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

      // Add transfer instruction for recipient (full amount)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );

      // Add company fee transfer instruction to admin wallet
      if (companyFee > 0) {
        const companyFeeLamports = companyFee * LAMPORTS_PER_SOL;
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: new PublicKey(COMPANY_WALLET_CONFIG.address),
            lamports: companyFeeLamports
          })
        );
      }

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
      const signature = await this.sendTransactionWithRetry(transaction, [this.keypair!], params.priority);

      // Save transaction to Firestore
      if (params.userId) {
        await this.saveTransactionToFirestore({
          userId: params.userId,
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          signature,
          companyFee,
          netAmount: recipientAmount, // This is now the recipient amount
          memo: params.memo
        });
      }

      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount: recipientAmount
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

      // Calculate company fee - NEW APPROACH
      const { fee: companyFee, totalAmount, recipientAmount } = this.calculateCompanyFee(params.amount);

      console.log('💰 Fee calculation:', {
        originalAmount: params.amount,
        companyFee,
        recipientAmount,
        totalAmount,
        feePercentage: COMPANY_FEE_STRUCTURE.percentage,
      });

      const fromPublicKey = this.keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      
      // Recipient gets the full amount
      const recipientAmountInSmallestUnit = Math.floor(recipientAmount * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      // Company fee amount
      const companyFeeAmount = Math.floor(companyFee * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = COMPANY_WALLET_CONFIG.useUserWalletForFees 
        ? fromPublicKey 
        : new PublicKey(COMPANY_WALLET_CONFIG.address);

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
        feePayer: feePayerPublicKey // User or company pays fees based on configuration
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
            feePayerPublicKey, // Fee payer pays ATA creation
            toTokenAccount, // ata
            toPublicKey, // owner
            new PublicKey(USDC_CONFIG.mintAddress) // mint
          )
        );
      }

      // Add transfer instruction for recipient (full amount)
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          recipientAmountInSmallestUnit
        )
      );

      // Add company fee transfer instruction to admin wallet
      if (companyFee > 0) {
        
        // Get company wallet's USDC token account
        const companyTokenAccount = await getAssociatedTokenAddress(
          new PublicKey(USDC_CONFIG.mintAddress),
          new PublicKey(COMPANY_WALLET_CONFIG.address)
        );
        
        console.log('💰 Adding company fee transfer instruction:', {
          companyFeeAmount,
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: COMPANY_WALLET_CONFIG.address
        });
        
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey,
            companyFeeAmount
          )
        );
      }

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
      const signature = await this.sendTransactionWithRetry(transaction, [this.keypair!], params.priority);

      // Save transaction to Firestore
      if (params.userId) {
        await this.saveTransactionToFirestore({
          userId: params.userId,
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          signature,
          companyFee,
          netAmount: recipientAmount, // This is now the recipient amount
          memo: params.memo
        });
      }

      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount: recipientAmount
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
   * Get priority fee based on priority level
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return CHAIN_TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Calculate company fee - NEW APPROACH: Recipient gets full amount, sender pays amount + fees
   */
  calculateCompanyFee(amount: number): { fee: number; totalAmount: number; recipientAmount: number } {
    // Calculate 3% fee on the transaction amount
    const fee = Math.min(amount * COMPANY_FEE_STRUCTURE.percentage, COMPANY_FEE_STRUCTURE.maximum);
    
    // Recipient gets the full amount they expect
    const recipientAmount = amount;
    
    // Sender pays the amount + fees
    const totalAmount = amount + fee;
    
    console.log('💰 NEW Fee calculation:', {
      requestedAmount: amount,
      fee,
      recipientAmount,
      totalAmount,
      feePercentage: COMPANY_FEE_STRUCTURE.percentage,
    });
    
    return { fee, totalAmount, recipientAmount };
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
      const transactionResult = await this.sendUSDCTransaction({
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
   * Save transaction to Firestore and send notification to recipient
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
      // Save transaction to Firestore
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

      // Send notification to recipient
      await this.sendReceivedFundsNotification(transactionData);
    } catch (error) {
      console.error('Error saving transaction to Firestore:', error);
    }
  }

  /**
   * Send notification to recipient when they receive funds
   */
  private async sendReceivedFundsNotification(transactionData: {
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
      console.log('🔔 Sending received funds notification:', {
        to: transactionData.to,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      });

      // Find recipient user by wallet address
      const { firebaseDataService } = await import('./firebaseDataService');
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(transactionData.to);

      if (!recipientUser) {
        console.log('🔔 No user found with wallet address:', transactionData.to);
        return; // External wallet, no notification needed
      }

      // Get sender user info
      const senderUser = await firebaseDataService.user.getCurrentUser(transactionData.userId);

      // Create notification data
      const notificationData = {
        userId: recipientUser.id.toString(),
        title: '💰 Funds Received',
        message: `You received ${transactionData.netAmount} ${transactionData.currency} from ${senderUser.name}`,
        type: 'money_received' as const,
        data: {
          transactionId: transactionData.signature,
          amount: transactionData.netAmount,
          currency: transactionData.currency,
          senderId: transactionData.userId,
          senderName: senderUser.name,
          memo: transactionData.memo || '',
          timestamp: new Date().toISOString()
        },
        is_read: false
      };

      // Send notification
      const { sendNotification } = await import('./firebaseNotificationService');
      await sendNotification(
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data
      );

      console.log('✅ Received funds notification sent successfully:', {
        recipientId: recipientUser.id,
        recipientName: recipientUser.name,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      });

    } catch (error) {
      console.error('❌ Error sending received funds notification:', error);
      // Don't throw error - notification failure shouldn't break the transaction
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
   * Get user wallet balance from on-chain
   */
  async getUserWalletBalance(userId: string): Promise<{ usdc: number; sol: number }> {
    console.log('🔗 ConsolidatedTransactionService: Getting wallet balance for user:', userId);
    
    try {
      // Use the existing userWalletService to get the balance
      const { userWalletService } = await import('./userWalletService');
      const balance = await userWalletService.getUserWalletBalance(userId);
      
      console.log('🔗 ConsolidatedTransactionService: Balance retrieved:', balance);
      
      return {
        sol: balance?.solBalance || 0,
        usdc: balance?.usdcBalance || 0
      };
    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get USDC balance for a specific wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<{ success: boolean; balance: number; error?: string }> {
    try {
      console.log('🔗 ConsolidatedTransactionService: Getting USDC balance for wallet:', walletAddress);
      
      const connection = new Connection(RPC_CONFIG.endpoint);
      const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);
      
      // Validate wallet address first
      let walletPublicKey: PublicKey;
      try {
        walletPublicKey = new PublicKey(walletAddress);
      } catch (error) {
        console.error('🔗 ConsolidatedTransactionService: Invalid wallet address:', walletAddress);
        return { success: false, balance: 0, error: 'Invalid wallet address format' };
      }
      
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, walletPublicKey);
      
      console.log('🔗 ConsolidatedTransactionService: Token account derivation:', {
        walletAddress,
        usdcMint: usdcMint.toBase58(),
        usdcMintSource: 'USDC_CONFIG.mintAddress',
        networkName: CURRENT_NETWORK.name,
        usdcTokenAccount: usdcTokenAccount.toBase58()
      });
      
      // Additional debugging: Check if the token account exists and get more details
      try {
        const accountInfo = await connection.getAccountInfo(usdcTokenAccount);
        console.log('🔗 ConsolidatedTransactionService: Token account info:', {
          exists: !!accountInfo,
          owner: accountInfo?.owner.toBase58(),
          executable: accountInfo?.executable,
          lamports: accountInfo?.lamports,
          dataLength: accountInfo?.data.length
        });
      } catch (infoError) {
        console.log('🔗 ConsolidatedTransactionService: Could not get account info:', infoError);
      }
      
      try {
        const accountInfo = await getAccount(connection, usdcTokenAccount);
        const balance = Number(accountInfo.amount) / 1000000; // USDC has 6 decimals
        
        console.log('🔗 ConsolidatedTransactionService: USDC balance retrieved:', {
          walletAddress,
          balance,
          rawAmount: accountInfo.amount.toString(),
          tokenAccount: usdcTokenAccount.toBase58()
        });
        
        return { success: true, balance };
      } catch (error) {
        if (error instanceof Error && error.message.includes('TokenAccountNotFoundError')) {
          console.log('🔗 ConsolidatedTransactionService: USDC token account not found (normal for new wallets)');
          return { success: true, balance: 0 };
        } else {
          console.error('🔗 ConsolidatedTransactionService: Failed to get USDC balance:', error);
          
          // Add retry logic for blockchain propagation delays
          console.log('🔗 ConsolidatedTransactionService: Retrying balance check in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            const accountInfo = await getAccount(connection, usdcTokenAccount);
            const balance = Number(accountInfo.amount) / 1000000;
            console.log('🔗 ConsolidatedTransactionService: Balance check retry successful:', {
              balance,
              rawAmount: accountInfo.amount.toString(),
              tokenAccount: usdcTokenAccount.toBase58()
            });
            return { success: true, balance };
          } catch (retryError) {
            console.error('🔗 ConsolidatedTransactionService: Balance check retry also failed:', retryError);
            return { success: false, balance: 0, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      }
    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Failed to get USDC balance:', error);
      return { success: false, balance: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get transaction fee estimate from on-chain
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    console.log('🔗 ConsolidatedTransactionService: Getting fee estimate:', { amount, currency, priority });
    
    try {
      // Calculate company fee
      const companyFee = this.calculateCompanyFee(amount).fee;
      
      // Estimate blockchain fee based on transaction type and priority
      let blockchainFee = 0.000005; // Base fee for simple transfer
      
      if (currency === 'USDC') {
        blockchainFee = 0.00001; // Higher fee for token transfer
      }
      
      // Add priority fee
      const priorityFee = this.getPriorityFee(priority as 'low' | 'medium' | 'high');
      const priorityFeeInSol = priorityFee / 1000000; // Convert micro-lamports to SOL
      
      const totalFee = companyFee + blockchainFee + priorityFeeInSol;
      
      console.log('Fee breakdown:', {
        companyFee,
        blockchainFee,
        priorityFee: priorityFeeInSol,
        totalFee
      });
      
      return totalFee;
    } catch (error) {
      console.error('Failed to get fee estimate:', error);
      // Fallback to simple calculation
      return amount * COMPANY_FEE_STRUCTURE.percentage;
    }
  }

  /**
   * Send USDC transaction (real implementation)
   */
  async sendUsdcTransaction(
    toAddress: string, 
    amount: number, 
    userId: string, 
    memo?: string, 
    groupId?: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ 
    success: boolean; 
    transactionId?: string; 
    signature?: string;
    companyFee?: number;
    netAmount?: number;
    fee?: number;
    error?: string 
  }> {
    console.log('🔗 ConsolidatedTransactionService: Sending USDC transaction:', { toAddress, amount, userId });
    
    try {
      // Use the internal transfer service for real USDC transactions
      const result = await internalTransferService.sendInternalTransfer({
        to: toAddress,
        amount,
        currency: 'USDC',
        memo: memo || `Payment from ${userId}`,
        groupId,
        userId,
        priority
      });

      if (result.success) {
        return {
          success: true,
          transactionId: result.txId,
          signature: result.signature,
          companyFee: result.companyFee,
          netAmount: result.netAmount,
          fee: result.blockchainFee
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Failed to send USDC transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send USDC to any address (for split wallets, external addresses, etc.)
   * This method doesn't try to find the recipient as a user in the database
   */
  async sendUsdcToAddress(
    toAddress: string, 
    amount: number, 
    userId: string, 
    memo?: string, 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ 
    success: boolean; 
    transactionId?: string; 
    signature?: string;
    companyFee?: number;
    netAmount?: number;
    fee?: number;
    error?: string 
  }> {
    console.log('🔗 ConsolidatedTransactionService: Sending USDC to address:', { toAddress, amount, userId });
    
    try {
      // Use the internal transfer service but with a flag to skip user lookup
      const result = await internalTransferService.sendInternalTransferToAddress({
        to: toAddress,
        amount,
        currency: 'USDC',
        memo: memo || `Payment from ${userId}`,
        userId,
        priority
      });

      if (result.success) {
        return {
          success: true,
          transactionId: result.txId,
          signature: result.signature,
          companyFee: result.companyFee,
          netAmount: result.netAmount,
          fee: result.blockchainFee
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Failed to send USDC to address:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user wallet address (real implementation)
   */
  async getUserWalletAddress(userId: string): Promise<string | null> {
    console.log('🔗 ConsolidatedTransactionService: Getting wallet address for user:', userId);
    
    try {
      // Use the existing userWalletService to get the wallet address
      const { userWalletService } = await import('./userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (walletResult.success && walletResult.wallet) {
        console.log('🔗 ConsolidatedTransactionService: Wallet address retrieved:', walletResult.wallet.address);
        return walletResult.wallet.address;
      }
      
      console.warn('🔗 ConsolidatedTransactionService: No wallet found for user:', userId);
      return null;
    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Failed to get wallet address:', error);
      return null;
    }
  }

  /**
   * Send USDC from a specific wallet (like a split wallet) to a recipient
   * This method allows sending from any wallet using its secret key
   */
  async sendUsdcFromSpecificWallet(
    fromWalletAddress: string,
    fromWalletSecretKey: string,
    toAddress: string,
    amount: number,
    memo?: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    isPartialWithdrawal: boolean = false
  ): Promise<{
    success: boolean;
    transactionId?: string;
    signature?: string;
    error?: string;
  }> {
    console.log('🔗 ConsolidatedTransactionService: Sending USDC from specific wallet:', {
      fromWalletAddress,
      toAddress,
      amount
    });

    try {
      // Create keypair from the wallet's secret key
      const secretKeyBuffer = Buffer.from(fromWalletSecretKey, 'base64');
      const walletKeypair = Keypair.fromSecretKey(secretKeyBuffer);
      
      console.log('🔗 ConsolidatedTransactionService: Wallet keypair verification:', {
        expectedAddress: fromWalletAddress,
        actualAddress: walletKeypair.publicKey.toBase58(),
        addressesMatch: walletKeypair.publicKey.toBase58() === fromWalletAddress,
        secretKeyLength: fromWalletSecretKey.length
      });
      
      // Verify the keypair matches the expected address
      if (walletKeypair.publicKey.toBase58() !== fromWalletAddress) {
        return {
          success: false,
          error: `Wallet secret key does not match the provided address. Expected: ${fromWalletAddress}, Actual: ${walletKeypair.publicKey.toBase58()}`
        };
      }

      // Create a direct Solana transaction with multiple RPC endpoints for better reliability
      const rpcEndpoints = CURRENT_NETWORK.rpcEndpoints || [CURRENT_NETWORK.rpcUrl];
      
      let connection = new Connection(rpcEndpoints[0], CURRENT_NETWORK.commitment);
      
      // Get the wallet's USDC token account - use the configured mint address
      const usdcMint = new PublicKey(USDC_CONFIG.mintAddress); // Use configured USDC mint
      const walletUsdcAccount = await getAssociatedTokenAddress(usdcMint, walletKeypair.publicKey);
      const recipientUsdcAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(toAddress));
      
      console.log('🔗 ConsolidatedTransactionService: Token account derivation:', {
        usdcMint: usdcMint.toBase58(),
        usdcMintSource: 'USDC_CONFIG.mintAddress',
        networkName: CURRENT_NETWORK.name,
        walletPublicKey: walletKeypair.publicKey.toBase58(),
        walletUsdcAccount: walletUsdcAccount.toBase58(),
        recipientPublicKey: toAddress,
        recipientUsdcAccount: recipientUsdcAccount.toBase58()
      });

      // Check the split wallet's SOL balance (for logging only - company wallet pays fees)
      const solBalance = await connection.getBalance(walletKeypair.publicKey);
      console.log('🔗 ConsolidatedTransactionService: Split wallet SOL balance:', {
        address: walletKeypair.publicKey.toBase58(),
        solBalance: solBalance / LAMPORTS_PER_SOL,
        solBalanceLamports: solBalance,
        note: 'Company wallet will pay transaction fees'
      });
      
      // Check if split wallet has minimum SOL for transaction (even though company pays fees)
      const minimumSolRequired = 0.0001; // 0.0001 SOL minimum for account rent
      if (solBalance / LAMPORTS_PER_SOL < minimumSolRequired) {
        console.warn('🔗 ConsolidatedTransactionService: Split wallet has very low SOL balance:', {
          solBalance: solBalance / LAMPORTS_PER_SOL,
          minimumRequired: minimumSolRequired,
          note: 'This might cause transaction issues even though company wallet pays fees'
        });
      }

      // Check the split wallet's USDC balance and account state before attempting transfer
      let transferAmount: number = amount * 1000000; // Default to requested amount
      try {
        const walletAccount = await getAccount(connection, walletUsdcAccount);
        console.log('🔗 ConsolidatedTransactionService: Split wallet USDC account details:', {
          address: walletUsdcAccount.toBase58(),
          balance: walletAccount.amount.toString(),
          balanceInUSDC: (Number(walletAccount.amount) / 1000000).toFixed(6),
          owner: walletAccount.owner.toBase58(),
          mint: walletAccount.mint.toBase58(),
          isFrozen: walletAccount.isFrozen,
          isNative: walletAccount.isNative,
        });
        
        // CRITICAL: Verify that the split wallet is the owner of the token account
        if (!walletAccount.owner.equals(walletKeypair.publicKey)) {
          return {
            success: false,
            error: `Split wallet token account owner mismatch. Expected: ${walletKeypair.publicKey.toBase58()}, Actual: ${walletAccount.owner.toBase58()}`
          };
        }
        
        // Check if the token account is properly initialized
        if (Number(walletAccount.amount) > 0 && walletAccount.amount.toString() === "0") {
          console.log('🔗 ConsolidatedTransactionService: Token account has balance but amount shows as 0 - possible initialization issue');
        }
        
        // CRITICAL: Check if the token account was created by the split wallet itself
        // If not, we might need to recreate it with proper authority
        console.log('🔗 ConsolidatedTransactionService: Token account authority verification:', {
          tokenAccountOwner: walletAccount.owner.toBase58(),
          splitWalletAddress: walletKeypair.publicKey.toBase58(),
          isOwnerCorrect: walletAccount.owner.equals(walletKeypair.publicKey),
          tokenAccountAddress: walletAccount.address.toBase58()
        });
        
        // Check if wallet has enough USDC with a small buffer for precision
        const requiredAmount = amount * 1000000;
        const availableAmount = Number(walletAccount.amount);
        const bufferAmount = 1; // 1 unit buffer (0.000001 USDC)
        const minimumThreshold = 1000; // 0.001 USDC minimum threshold (1000 units)
        
        // Check if wallet has any meaningful balance
        if (availableAmount < minimumThreshold) {
          return {
            success: false,
            error: `Split wallet has insufficient USDC balance. Required: ${amount} USDC, Available: ${(availableAmount / 1000000).toFixed(6)} USDC (below ${(minimumThreshold / 1000000).toFixed(3)} USDC threshold)`
          };
        }
        
        if (availableAmount < requiredAmount) {
          return {
            success: false,
            error: `Insufficient USDC balance in split wallet. Required: ${amount} USDC, Available: ${(availableAmount / 1000000).toFixed(6)} USDC`
          };
        }
        
        // Use the exact available amount to avoid leaving any funds behind
        // No buffer needed since we're using consistent rounding throughout the system
        transferAmount = Math.min(requiredAmount, availableAmount);
        
        console.log('🔗 ConsolidatedTransactionService: Transfer amount calculation:', {
          requestedAmount: amount,
          requiredAmount,
          availableAmount,
          transferAmount,
          finalTransferAmount: transferAmount / 1000000,
          note: 'Using exact available amount to avoid leaving funds behind'
        });
        
        // Check if account is frozen or in invalid state
        if (walletAccount.isFrozen) {
          return {
            success: false,
            error: 'Split wallet USDC token account is frozen and cannot be used for transfers'
          };
        }
        
        // Additional debugging for token account state
        console.log('🔗 ConsolidatedTransactionService: Detailed token account analysis:', {
          accountAddress: walletAccount.address.toBase58(),
          owner: walletAccount.owner.toBase58(),
          mint: walletAccount.mint.toBase58(),
          amount: walletAccount.amount.toString(),
          amountNumber: Number(walletAccount.amount),
          isFrozen: walletAccount.isFrozen,
          isNative: walletAccount.isNative,
          closeAuthority: walletAccount.closeAuthority?.toBase58(),
          delegate: walletAccount.delegate?.toBase58(),
          delegatedAmount: walletAccount.delegatedAmount?.toString()
        });
        
        // Note: Account state check removed as it's not reliable - focus on balance and frozen status instead
        
        // CRITICAL: Verify that the account actually has the tokens and can be debited
        if (Number(walletAccount.amount) === 0) {
          return {
            success: false,
            error: 'Split wallet USDC token account has zero balance - tokens may not have been sent correctly'
          };
        }
        
      } catch (error) {
        console.error('🔗 ConsolidatedTransactionService: Failed to check split wallet USDC balance:', error);
        
        // The token account doesn't exist, we need to create it first
        console.log('🔧 Split wallet USDC token account does not exist, creating it...');
        
        try {
          // Use company wallet as payer for token account creation (split wallet has 0 SOL)
          const { COMPANY_WALLET_CONFIG } = require('../config/chain');
          if (!COMPANY_WALLET_CONFIG.secretKey) {
            throw new Error('Company wallet secret key not found in configuration');
          }
          
          // Parse the company wallet secret key (it's stored as JSON array)
          const secretKeyArray = JSON.parse(COMPANY_WALLET_CONFIG.secretKey);
          const companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
          
          // Check company wallet SOL balance before attempting transaction
          const companySolBalance = await connection.getBalance(companyKeypair.publicKey);
          if (companySolBalance < 5000000) { // Less than 0.005 SOL
            throw new Error(`Company wallet has insufficient SOL balance: ${companySolBalance / 1000000000} SOL. Need at least 0.005 SOL for transaction fees.`);
          }
          
          const createAccountInstruction = createAssociatedTokenAccountInstruction(
            companyKeypair.publicKey, // payer (company wallet pays fees)
            walletUsdcAccount, // associated token account
            walletKeypair.publicKey, // owner (the split wallet itself)
            usdcMint // mint
          );
          
          const { blockhash } = await connection.getLatestBlockhash();
          const createTransaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: companyKeypair.publicKey
          }).add(createAccountInstruction);
          
          createTransaction.sign(companyKeypair);
          
          // Use optimized transaction sending approach
          const signature = await this.sendTransactionWithRetry(createTransaction, [companyKeypair], 'medium');
          
          console.log('✅ Created USDC token account for split wallet:', walletUsdcAccount.toBase58());
          
          // Now try to get the account again with retry logic for blockchain propagation
          let walletAccount;
          let retryCount = 0;
          const maxRetries = 5; // Increased from 3 to 5
          
          while (retryCount < maxRetries) {
            try {
              walletAccount = await getAccount(connection, walletUsdcAccount);
              console.log('🔗 ConsolidatedTransactionService: Split wallet USDC account created successfully:', {
                address: walletAccount.address.toBase58(),
                owner: walletAccount.owner.toBase58(),
                amount: walletAccount.amount.toString(),
                retryAttempt: retryCount + 1
              });
              break; // Success, exit retry loop
            } catch (error) {
              retryCount++;
              if (retryCount < maxRetries) {
                const delay = 3000 * retryCount; // Progressive delay: 3s, 6s, 9s, 12s
                console.log(`🔗 ConsolidatedTransactionService: Balance check failed, retrying in ${delay/1000} seconds... (attempt ${retryCount}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                console.warn('🔗 ConsolidatedTransactionService: Balance check failed after all retries, but account was created');
                // Account was created but we can't verify it yet - this is acceptable
                // Continue with the transfer logic - the fallback will handle the balance
                console.log('🔗 ConsolidatedTransactionService: Token account created but verification failed, continuing with transfer...');
              }
            }
          }
          
          // Verify ownership (only if we successfully retrieved the account)
          if (walletAccount && !walletAccount.owner.equals(walletKeypair.publicKey)) {
            return {
              success: false,
              error: `Created token account has wrong owner. Expected: ${walletKeypair.publicKey.toBase58()}, Actual: ${walletAccount.owner.toBase58()}`
            };
          }
          
          // If we successfully created the account but couldn't verify it, continue with transfer
          // The fallback logic in the calling method will handle the balance
          if (!walletAccount) {
            console.log('🔗 ConsolidatedTransactionService: Token account created but verification failed, continuing with transfer...');
          }
          
        } catch (createError) {
          console.error('❌ Failed to create USDC token account for split wallet:', createError);
          
          // Check if this is actually a balance verification error, not a creation error
          if (createError instanceof Error && createError.message.includes('TokenAccountNotFoundError')) {
            console.log('🔗 ConsolidatedTransactionService: Token account creation succeeded but balance verification failed - continuing with transfer');
            // Continue with transfer logic - the fallback will handle the balance
          } else {
            return {
              success: false,
              error: 'Failed to create USDC token account for split wallet'
            };
          }
        }
      }

      // Check if recipient has USDC token account, create if not
      try {
        await getAccount(connection, recipientUsdcAccount);
        console.log('✅ Recipient USDC token account exists');
      } catch (error) {
        console.log('🔧 Creating USDC token account for recipient...');
        // Token account doesn't exist, create it using company wallet as payer
        if (!COMPANY_WALLET_CONFIG.secretKey) {
          throw new Error('Company wallet secret key not found in configuration');
        }
        
        // Parse the company wallet secret key (it's stored as JSON array)
        const secretKeyArray = JSON.parse(COMPANY_WALLET_CONFIG.secretKey);
        const companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
        
        // Check company wallet SOL balance before attempting transaction
        const companySolBalance = await connection.getBalance(companyKeypair.publicKey);
        console.log('🔗 ConsolidatedTransactionService: Company wallet SOL balance check for token account creation:', {
          address: companyKeypair.publicKey.toBase58(),
          solBalance: companySolBalance / 1000000000, // Convert lamports to SOL
          solBalanceLamports: companySolBalance
        });
        
        if (companySolBalance < 5000000) { // Less than 0.005 SOL (5 million lamports)
          throw new Error(`Company wallet has insufficient SOL balance: ${companySolBalance / 1000000000} SOL. Need at least 0.005 SOL for transaction fees.`);
        }
        
        const createAccountInstruction = createAssociatedTokenAccountInstruction(
          companyKeypair.publicKey, // payer (company wallet pays fees)
          recipientUsdcAccount, // associated token account
          new PublicKey(toAddress), // owner (recipient)
          usdcMint // mint
        );
        
        // Create the transfer instruction manually to ensure proper key flags
        const usdcAmount = transferAmount; // Use the calculated transfer amount with buffer
        const transferInstruction = new TransactionInstruction({
          keys: [
            {
              pubkey: walletUsdcAccount,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: recipientUsdcAccount,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: walletKeypair.publicKey,
              isSigner: true,
              isWritable: true, // CRITICAL: Authority must be writable when it's the fee payer
            },
          ],
          programId: TOKEN_PROGRAM_ID,
          data: Buffer.from([
            3, // Transfer instruction discriminator
            ...new Uint8Array(new BigUint64Array([BigInt(usdcAmount)]).buffer).reverse(),
          ]),
        });

        // Get recent blockhash and create properly structured transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const transaction = new Transaction({
          recentBlockhash: blockhash,
          feePayer: companyKeypair.publicKey // Company wallet pays fees
        }).add(createAccountInstruction).add(transferInstruction);
        
        // Use multi-endpoint approach for account creation + transfer
        console.log('🔗 ConsolidatedTransactionService: Sending transaction with account creation using multi-endpoint approach:', {
          recentBlockhash: blockhash,
          feePayer: companyKeypair.publicKey.toBase58(),
          instructionCount: transaction.instructions.length
        });
        
        let signature;
        let lastError;
        
        // Try each RPC endpoint until one works
        for (let i = 0; i < rpcEndpoints.length; i++) {
          try {
            console.log(`🔗 ConsolidatedTransactionService: Trying RPC endpoint ${i + 1}/${rpcEndpoints.length} for account creation: ${rpcEndpoints[i]}`);
            
            // Create new connection for this attempt
            const currentConnection = new Connection(rpcEndpoints[i], 'confirmed');
            
          // Get fresh blockhash for this attempt
          const { blockhash: freshBlockhash } = await currentConnection.getLatestBlockhash();
          transaction.recentBlockhash = freshBlockhash;
          
          // CRITICAL: Sign the transaction before sending
          // Company wallet is fee payer, wallet is authority for the transfer
          transaction.sign(companyKeypair, walletKeypair);
          
          console.log(`🔗 ConsolidatedTransactionService: Account creation transaction signed for endpoint ${i + 1}:`, {
            endpoint: rpcEndpoints[i],
            freshBlockhash: freshBlockhash,
            transactionSize: transaction.serialize().length,
            instructionCount: transaction.instructions.length,
            isSigned: transaction.signatures.length > 0
          });
          
          // Send transaction with optimized approach
          signature = await currentConnection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 0, // We handle retries ourselves
          });
          
          // Confirm transaction with timeout
          const confirmed = await this.confirmTransactionWithTimeout(signature);
          if (!confirmed) {
            console.warn('🔗 ConsolidatedTransactionService: Account creation confirmation timed out, but transaction was sent', { signature });
          }
            
            console.log(`🔗 ConsolidatedTransactionService: Account creation transaction successful with endpoint ${i + 1}:`, signature);
            break;
            
          } catch (error) {
            lastError = error;
            console.log(`🔗 ConsolidatedTransactionService: Account creation endpoint ${i + 1} failed:`, error);
            
            if (i === rpcEndpoints.length - 1) {
              // All endpoints failed
              return {
                success: false,
                error: `All RPC endpoints failed for account creation. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
              };
            }
            
            // Wait before trying next endpoint
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log('🔗 ConsolidatedTransactionService: Account creation transaction confirmed successfully:', signature);
        
        return {
          success: true,
          signature,
          transactionId: signature
        };
      }

      // Final balance check right before transaction creation
      let senderBalanceBefore: number = 0; // Initialize with default value
      try {
        const finalBalanceCheck = await getAccount(connection, walletUsdcAccount);
        const finalAvailableAmount = Number(finalBalanceCheck.amount);
        senderBalanceBefore = finalAvailableAmount / 1000000; // Convert to USDC units
        
        console.log('🔗 ConsolidatedTransactionService: Final balance check before transaction:', {
          finalAvailableAmount,
          senderBalanceBefore,
          calculatedTransferAmount: transferAmount,
          difference: finalAvailableAmount - transferAmount,
          isSufficient: finalAvailableAmount >= transferAmount
        });
        
        // If final balance is less than our calculated transfer amount, adjust it
        if (finalAvailableAmount < transferAmount) {
          // Use exact available amount to avoid leaving funds behind
          transferAmount = finalAvailableAmount;
          console.log('🔗 ConsolidatedTransactionService: Adjusted transfer amount due to balance change:', {
            originalTransferAmount: transferAmount,
            newTransferAmount: transferAmount,
            finalAvailableAmount,
            note: 'Using exact available amount to avoid leaving funds behind'
          });
        }
      } catch (finalCheckError) {
        console.warn('🔗 ConsolidatedTransactionService: Final balance check failed, proceeding with calculated amount:', finalCheckError);
        // If we can't get the balance, we'll skip the balance verification later
        senderBalanceBefore = -1; // Use -1 to indicate we couldn't get the balance
      }

      // Create the transfer instruction using the calculated transfer amount
      const usdcAmount = transferAmount; // Use the calculated transfer amount with buffer
      console.log('🔗 ConsolidatedTransactionService: Creating USDC transfer instruction:', {
        fromAccount: walletUsdcAccount.toBase58(),
        toAccount: recipientUsdcAccount.toBase58(),
        authority: walletKeypair.publicKey.toBase58(),
        originalAmount: amount,
        calculatedTransferAmount: transferAmount,
        usdcAmount,
        amountInSmallestUnit: usdcAmount
      });
      
      // Try using the standard SPL Token transfer instruction first
      let transferInstruction;
      try {
        console.log('🔗 ConsolidatedTransactionService: Attempting to create standard SPL Token transfer instruction');
        transferInstruction = createTransferInstruction(
          walletUsdcAccount, // source
          recipientUsdcAccount, // destination
          walletKeypair.publicKey, // authority
          usdcAmount // amount
        );
        
        console.log('🔗 ConsolidatedTransactionService: Transfer instruction details:', {
          fromAccount: walletUsdcAccount.toBase58(),
          toAccount: recipientUsdcAccount.toBase58(),
          authority: walletKeypair.publicKey.toBase58(),
          amount: usdcAmount,
          programId: TOKEN_PROGRAM_ID.toBase58(),
          instructionKeys: transferInstruction.keys.map(key => ({
            pubkey: key.pubkey.toBase58(),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          }))
        });
        
        console.log('🔗 ConsolidatedTransactionService: Standard SPL Token transfer instruction created successfully');
      } catch (standardError) {
        console.warn('🔗 ConsolidatedTransactionService: Standard transfer instruction failed, using manual instruction:', standardError);
        
        // Fallback to manual transfer instruction
        transferInstruction = new TransactionInstruction({
          keys: [
            {
              pubkey: walletUsdcAccount,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: recipientUsdcAccount,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: walletKeypair.publicKey,
              isSigner: true,
              isWritable: true, // CRITICAL: Authority must be writable when it's the fee payer
            },
          ],
          programId: TOKEN_PROGRAM_ID,
          data: Buffer.from([
            3, // Transfer instruction discriminator
            ...new Uint8Array(new BigUint64Array([BigInt(usdcAmount)]).buffer).reverse(),
          ]),
        });
        console.log('🔗 ConsolidatedTransactionService: Manual transfer instruction created as fallback');
      }
      
      console.log('🔗 ConsolidatedTransactionService: Transfer instruction created:', {
        programId: transferInstruction.programId.toBase58(),
        keys: transferInstruction.keys.map(key => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable
        })),
        dataLength: transferInstruction.data.length
      });
      
      // Verify the instruction is valid by checking the keys
      const sourceKey = transferInstruction.keys[0];
      const destinationKey = transferInstruction.keys[1];
      const authorityKey = transferInstruction.keys[2];
      
      console.log('🔗 ConsolidatedTransactionService: Transfer instruction key verification:', {
        sourceAccount: sourceKey.pubkey.toBase58(),
        sourceIsWritable: sourceKey.isWritable,
        sourceIsSigner: sourceKey.isSigner,
        destinationAccount: destinationKey.pubkey.toBase58(),
        destinationIsWritable: destinationKey.isWritable,
        destinationIsSigner: destinationKey.isSigner,
        authorityAccount: authorityKey.pubkey.toBase58(),
        authorityIsWritable: authorityKey.isWritable,
        authorityIsSigner: authorityKey.isSigner
      });

      // Get recent blockhash and create properly structured transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Use company wallet as fee payer if available, otherwise use split wallet
      const feePayer = COMPANY_WALLET_CONFIG.address && !COMPANY_WALLET_CONFIG.useUserWalletForFees 
        ? new PublicKey(COMPANY_WALLET_CONFIG.address)
        : walletKeypair.publicKey;
        
      console.log('🔗 ConsolidatedTransactionService: Fee payer configuration:', {
        companyWalletAddress: COMPANY_WALLET_CONFIG.address,
        useUserWalletForFees: COMPANY_WALLET_CONFIG.useUserWalletForFees,
        selectedFeePayer: feePayer.toBase58(),
        isCompanyWallet: feePayer.equals(new PublicKey(COMPANY_WALLET_CONFIG.address))
      });
      
      // If using company wallet as fee payer, check its SOL balance
      if (feePayer.equals(new PublicKey(COMPANY_WALLET_CONFIG.address))) {
        const companySolBalance = await connection.getBalance(feePayer);
        console.log('🔗 ConsolidatedTransactionService: Company wallet SOL balance:', {
          address: feePayer.toBase58(),
          solBalance: companySolBalance / LAMPORTS_PER_SOL,
          solBalanceLamports: companySolBalance
        });
        
        const minSolForFees = 0.001 * LAMPORTS_PER_SOL;
        if (companySolBalance < minSolForFees) {
          return {
            success: false,
            error: `Company wallet has insufficient SOL for transaction fees. Required: 0.001 SOL, Available: ${(companySolBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`
          };
        }
      }
        
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayer
      }).add(transferInstruction);
      
      // Verify the transaction fee payer is set correctly
      console.log('🔗 ConsolidatedTransactionService: Transaction fee payer verification:', {
        transactionFeePayer: transaction.feePayer?.toBase58(),
        expectedFeePayer: feePayer.toBase58(),
        feePayerMatches: transaction.feePayer?.equals(feePayer)
      });
      
      // Use sendAndConfirmTransaction with retry logic for different RPC endpoints
      console.log('🔗 ConsolidatedTransactionService: NEW MULTI-ENDPOINT APPROACH - Sending transaction with confirmation:', {
        recentBlockhash: blockhash,
        feePayer: feePayer.toBase58(), // Use the actual feePayer variable
        instructionCount: transaction.instructions.length,
        fromTokenAccount: walletUsdcAccount.toBase58(),
        toTokenAccount: recipientUsdcAccount.toBase58(),
        transferAmount: usdcAmount,
        rpcEndpoints: rpcEndpoints
      });
      
      let signature;
      let lastError;
      
      // Try each RPC endpoint until one works
      for (let i = 0; i < rpcEndpoints.length; i++) {
        try {
          console.log(`🔗 ConsolidatedTransactionService: Trying RPC endpoint ${i + 1}/${rpcEndpoints.length}: ${rpcEndpoints[i]}`);
          
          // Create new connection for this attempt
          const currentConnection = new Connection(rpcEndpoints[i], 'confirmed');
          
          // Get fresh blockhash for this attempt
          const { blockhash: freshBlockhash } = await currentConnection.getLatestBlockhash();
          transaction.recentBlockhash = freshBlockhash;
          
          // CRITICAL: Sign the transaction before sending
          // If company wallet is fee payer, we need to sign with both wallets
          let companyKeypair;
          if (feePayer.equals(new PublicKey(COMPANY_WALLET_CONFIG.address))) {
            // Get company wallet keypair with proper error handling
            
            // Debug the secret key format
            console.log('🔗 ConsolidatedTransactionService: Company wallet secret key debug:', {
              secretKeyType: typeof COMPANY_WALLET_CONFIG.secretKey,
              secretKeyLength: COMPANY_WALLET_CONFIG.secretKey?.length,
              secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey?.substring(0, 100) + '...',
              startsWithBracket: COMPANY_WALLET_CONFIG.secretKey?.startsWith('['),
              endsWithBracket: COMPANY_WALLET_CONFIG.secretKey?.endsWith(']')
            });
            
            try {
              // Try JSON array format first (since it's stored as [80, 80, 80, ...] in env)
              const secretKeyArray = JSON.parse(COMPANY_WALLET_CONFIG.secretKey);
              if (Array.isArray(secretKeyArray)) {
                companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
                console.log('🔗 ConsolidatedTransactionService: Company wallet keypair created from JSON array:', {
                  arrayLength: secretKeyArray.length,
                  firstFewBytes: secretKeyArray.slice(0, 5),
                  lastFewBytes: secretKeyArray.slice(-5),
                  derivedPublicKey: companyKeypair.publicKey.toBase58(),
                  expectedPublicKey: COMPANY_WALLET_CONFIG.address,
                  addressesMatch: companyKeypair.publicKey.toBase58() === COMPANY_WALLET_CONFIG.address
                });
              } else {
                throw new Error('Secret key is not an array');
              }
            } catch (jsonError) {
              try {
                // Try base64 as fallback
                companyKeypair = Keypair.fromSecretKey(
                  Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64')
                );
                console.log('🔗 ConsolidatedTransactionService: Company wallet keypair created from base64');
              } catch (base64Error) {
                console.error('🔗 ConsolidatedTransactionService: Failed to parse company wallet secret key:', {
                  jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
                  base64Error: base64Error instanceof Error ? base64Error.message : String(base64Error),
                  secretKeyLength: COMPANY_WALLET_CONFIG.secretKey?.length,
                  secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey?.substring(0, 50) + '...',
                  secretKeyType: typeof COMPANY_WALLET_CONFIG.secretKey
                });
                throw new Error('Failed to parse company wallet secret key');
              }
            }
            
            // Sign the transaction with both keypairs
            transaction.sign(walletKeypair, companyKeypair);
            
            // Verify signatures are present
            console.log('🔗 ConsolidatedTransactionService: Transaction signature verification:', {
              signatureCount: transaction.signatures.length,
              signatures: transaction.signatures.map(sig => ({
                publicKey: sig.publicKey.toBase58(),
                signature: sig.signature ? 'Present' : 'Missing'
              })),
              isFullySigned: transaction.signatures.every(sig => sig.signature !== null)
            });
            
            if (!transaction.signatures.every(sig => sig.signature !== null)) {
              throw new Error('Transaction is not fully signed');
            }
            
            console.log('🔗 ConsolidatedTransactionService: Transaction signed with both split wallet and company wallet');
          } else {
            transaction.sign(walletKeypair);
            console.log('🔗 ConsolidatedTransactionService: Transaction signed with split wallet only');
          }
          
          console.log(`🔗 ConsolidatedTransactionService: Attempting transaction with endpoint ${i + 1}:`, {
            endpoint: rpcEndpoints[i],
            freshBlockhash: freshBlockhash,
            transactionSize: transaction.serialize().length,
            instructionCount: transaction.instructions.length,
            isSigned: transaction.signatures.length > 0
          });
          
          // Use the correct signers based on fee payer
          const signers = feePayer.equals(new PublicKey(COMPANY_WALLET_CONFIG.address)) 
            ? [walletKeypair, companyKeypair!]
            : [walletKeypair];
            
          console.log('🔗 ConsolidatedTransactionService: Using signers for sendAndConfirmTransaction:', {
            signerCount: signers.length,
            signers: signers.map(signer => signer.publicKey.toBase58()),
            feePayer: feePayer.toBase58()
          });
          
          // Send transaction with optimized approach
          signature = await currentConnection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 0, // We handle retries ourselves
          });
          
          // Confirm transaction with timeout
          const confirmed = await this.confirmTransactionWithTimeout(signature);
          if (!confirmed) {
            console.warn('🔗 ConsolidatedTransactionService: Transaction confirmation timed out, but transaction was sent', { signature });
            
            // Even if confirmation timed out, check if the transaction actually succeeded
            try {
              const status = await currentConnection.getSignatureStatus(signature, {
                searchTransactionHistory: true
              });
              
              if (status.value?.err) {
                console.error('🔗 ConsolidatedTransactionService: Transaction actually failed:', status.value.err);
                throw new Error(`Transaction failed: ${status.value.err.toString()}`);
              } else if (status.value?.confirmationStatus) {
                console.log('🔗 ConsolidatedTransactionService: Transaction actually succeeded despite timeout:', {
                  signature,
                  confirmationStatus: status.value.confirmationStatus,
                  confirmations: status.value.confirmations
                });
              } else {
                console.warn('🔗 ConsolidatedTransactionService: Transaction status unknown - may still be processing');
              }
            } catch (statusError) {
              console.warn('🔗 ConsolidatedTransactionService: Could not verify transaction status:', statusError);
              // Don't fail the transaction if we can't verify status
            }
          }
          
          console.log(`🔗 ConsolidatedTransactionService: Transaction successful with endpoint ${i + 1}:`, signature);
          
          // Verify the transfer actually succeeded by checking balances
          try {
            console.log('🔗 ConsolidatedTransactionService: Verifying transfer by checking balances...');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for blockchain propagation
            
            // Check sender balance (should be reduced)
            const senderAccount = await getAccount(currentConnection, walletUsdcAccount);
            const senderBalanceAfter = Number(senderAccount.amount) / 1000000;
            
            // Check recipient balance (should be increased)
            const recipientAccount = await getAccount(currentConnection, recipientUsdcAccount);
            const recipientBalanceAfter = Number(recipientAccount.amount) / 1000000;
            
            console.log('🔗 ConsolidatedTransactionService: Balance verification after transfer:', {
              senderAddress: fromWalletAddress,
              senderTokenAccount: walletUsdcAccount.toBase58(),
              senderBalanceAfter: senderBalanceAfter,
              recipientAddress: toAddress,
              recipientTokenAccount: recipientUsdcAccount.toBase58(),
              recipientBalanceAfter: recipientBalanceAfter,
              transferAmount: amount,
              expectedSenderBalance: 0, // Should be 0 after full withdrawal
              expectedRecipientIncrease: amount
            });
            
            // Verify the transfer actually happened
            if (isPartialWithdrawal) {
              // For partial withdrawals (like degen splits), just verify the amount was deducted
              if (senderBalanceBefore >= 0) {
                const expectedSenderBalance = senderBalanceBefore - amount;
                const balanceDifference = Math.abs(senderBalanceAfter - expectedSenderBalance);
                
                if (balanceDifference > 0.001) { // Allow for small rounding differences
                  console.error('🔗 ConsolidatedTransactionService: CRITICAL - Sender balance not reduced by expected amount!', {
                    senderBalanceBefore,
                    senderBalanceAfter,
                    expectedSenderBalance,
                    transferAmount: amount,
                    balanceDifference
                  });
                  throw new Error(`Transfer verification failed: Sender balance not reduced by expected amount. Expected: ${expectedSenderBalance}, Actual: ${senderBalanceAfter}`);
                }
                
                console.log('✅ ConsolidatedTransactionService: Partial withdrawal verification successful - sender balance reduced by expected amount');
              } else {
                console.log('⚠️ ConsolidatedTransactionService: Skipping partial withdrawal verification - initial balance not available');
              }
            } else {
              // For complete withdrawals (like fair splits), verify sender balance is zero
              if (senderBalanceAfter > 0.001) { // Allow for small rounding differences
                console.error('🔗 ConsolidatedTransactionService: CRITICAL - Sender still has funds after transfer!', {
                  senderBalanceAfter,
                  expectedBalance: 0,
                  transferAmount: amount
                });
                throw new Error(`Transfer verification failed: Sender still has ${senderBalanceAfter} USDC after transfer`);
              }
              
              console.log('✅ ConsolidatedTransactionService: Complete withdrawal verification successful - sender balance is zero');
            }
            
          } catch (balanceError) {
            console.error('🔗 ConsolidatedTransactionService: Transfer verification failed:', balanceError);
            throw new Error(`Transfer verification failed: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`);
          }
          
          break;
          
        } catch (error) {
          lastError = error;
          console.log(`🔗 ConsolidatedTransactionService: Endpoint ${i + 1} failed:`, error);
          
          if (i === rpcEndpoints.length - 1) {
            // All endpoints failed
            return {
              success: false,
              error: `All RPC endpoints failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
            };
          }
          
          // Wait before trying next endpoint
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('🔗 ConsolidatedTransactionService: Transaction confirmed successfully:', signature);

      return {
        success: true,
        signature,
        transactionId: signature
      };

    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Error sending from specific wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if user has sufficient SOL for gas (company covers all blockchain fees)
   */
  async hasSufficientSolForGas(userId: string): Promise<{ hasSufficient: boolean; currentSol: number; requiredSol: number }> {
    console.log('🔗 ConsolidatedTransactionService: SOL gas check - company covers all blockchain fees');
    
    try {
      const balance = await this.getUserWalletBalance(userId);
      
      // Company covers all blockchain fees, so SOL check always passes
      console.log('🔗 ConsolidatedTransactionService: SOL gas check result (company covers fees):', {
        hasSufficient: true,
        currentSol: balance.sol,
        requiredSol: 0
      });
      
      return {
        hasSufficient: true, // Company covers all blockchain fees
        currentSol: balance.sol,
        requiredSol: 0
      };
    } catch (error) {
      console.error('🔗 ConsolidatedTransactionService: Failed to check SOL balance for gas:', error);
      // Even on error, company covers fees so we allow the transaction
      return {
        hasSufficient: true,
        currentSol: 0,
        requiredSol: 0
      };
    }
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
