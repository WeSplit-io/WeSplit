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
import { COMPANY_WALLET_CONFIG } from '../config/chain';
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
          netAmount: recipientAmount, // This is now the recipient amount
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
      const recipientAmountInSmallestUnit = Math.round(recipientAmount * 1_000_000); // USDC has 6 decimals
      // Company fee amount
      const companyFeeAmount = Math.round(companyFee * 1_000_000); // USDC has 6 decimals

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
          netAmount: recipientAmount, // This is now the recipient amount
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
        
        // Prepare signers array
        const signers = [this.keypair!];
        
        // If company wallet is the fee payer, we need to add company wallet keypair
        if (!COMPANY_WALLET_CONFIG.useUserWalletForFees && COMPANY_WALLET_CONFIG.secretKey) {
          try {
            console.log('Processing company wallet secret key', {
              secretKeyLength: COMPANY_WALLET_CONFIG.secretKey.length,
              secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 10) + '...'
            });

            // Try different formats for the secret key
            let companySecretKeyBuffer: Buffer;
            
            // Check if it looks like a comma-separated array first
            if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
              try {
                // Remove square brackets if present and split by comma
                const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
                const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
                
                // Validate that all elements are valid numbers
                if (keyArray.some(num => isNaN(num))) {
                  throw new Error('Invalid comma-separated array format - contains non-numeric values');
                }
                
                companySecretKeyBuffer = Buffer.from(keyArray);
                console.log('Successfully decoded secret key as comma-separated array', {
                  bufferLength: companySecretKeyBuffer.length,
                  arrayLength: keyArray.length
                });
              } catch (arrayError) {
                throw new Error(`Failed to parse comma-separated array: ${arrayError instanceof Error ? arrayError.message : String(arrayError)}`);
              }
            } else {
              try {
                // Try base64 first for other formats
                companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
                
                // Check if the length is reasonable for Solana (64 or 65 bytes)
                if (companySecretKeyBuffer.length === 64 || companySecretKeyBuffer.length === 65) {
                  console.log('Successfully decoded secret key as base64', {
                    bufferLength: companySecretKeyBuffer.length
                  });
                } else {
                  throw new Error(`Base64 decoded to unexpected length: ${companySecretKeyBuffer.length}`);
                }
              } catch (base64Error) {
                try {
                  // Try hex format
                  companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'hex');
                  console.log('Successfully decoded secret key as hex', {
                    bufferLength: companySecretKeyBuffer.length
                  });
                } catch (hexError) {
                  throw new Error('Unable to decode secret key in any supported format');
                }
              }
            }

            // Validate the secret key length (should be 64 or 65 bytes for Solana)
            if (companySecretKeyBuffer.length === 65) {
              // Remove the last byte (public key) to get the 64-byte secret key
              companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
              console.log('Trimmed 65-byte keypair to 64-byte secret key', {
                originalLength: 65,
                trimmedLength: companySecretKeyBuffer.length
              });
            } else if (companySecretKeyBuffer.length !== 64) {
              throw new Error(`Invalid secret key length: ${companySecretKeyBuffer.length} bytes (expected 64 or 65)`);
            }

            const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
            signers.push(companyKeypair);
            
            console.log('Using company wallet for fees', {
              companyWalletAddress: COMPANY_WALLET_CONFIG.address,
              userWalletAddress: this.keypair!.publicKey.toBase58(),
              companyKeypairAddress: companyKeypair.publicKey.toBase58()
            });
          } catch (error) {
            console.error('Failed to load company wallet keypair', error);
            throw new Error('Company wallet keypair not available for signing');
          }
        }

        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          signers, // Use all required signers
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
