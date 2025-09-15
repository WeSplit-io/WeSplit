import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { firebaseDataService } from './firebaseDataService';
import { consolidatedWalletService } from './consolidatedWalletService';

export interface MultiSigWallet {
  id: string;
  address: string;
  owners: string[];
  threshold: number;
  pendingTransactions: MultiSigTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiSigTransaction {
  id: string;
  multiSigWalletId: string;
  instructions: any[]; // Serialized transaction instructions
  signers: string[];
  approvals: string[];
  rejections: string[];
  executed: boolean;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  amount?: number;
  currency?: string;
  recipient?: string;
}

export interface CreateMultiSigResult {
  success: boolean;
  wallet?: MultiSigWallet;
  error?: string;
}

export interface MultiSigTransactionResult {
  success: boolean;
  transaction?: MultiSigTransaction;
  error?: string;
}

export class MultiSigService {
  private connection: Connection;

  constructor() {
    // Use the same connection as the main service
    this.connection = new Connection(
      process.env.NODE_ENV === 'production' 
        ? 'https://api.mainnet-beta.solana.com' 
        : 'https://api.devnet.solana.com',
      'confirmed'
    );
  }

  // Create a new multi-signature wallet
  async createMultiSigWallet(
    userId: string,
    owners: string[],
    threshold: number,
    description?: string
  ): Promise<CreateMultiSigResult> {
    try {
      if (__DEV__) {
        console.log('🔧 Creating multi-signature wallet:', { userId, owners, threshold });
      }

      // Validate inputs
      if (threshold > owners.length) {
        return {
          success: false,
          error: 'Threshold cannot be greater than number of owners'
        };
      }

      if (threshold < 1) {
        return {
          success: false,
          error: 'Threshold must be at least 1'
        };
      }

      if (!owners.includes(userId)) {
        return {
          success: false,
          error: 'User must be included in owners list'
        };
      }

      // Create multi-sig wallet using Solana AppKit
      // TODO: Implement multi-sig wallet creation
      const multiSigWallet = { address: 'mock-address', owners, threshold }; // Mock implementation

      // Store in Firebase
      const walletData = {
        address: multiSigWallet.address,
        owners: multiSigWallet.owners,
        threshold: multiSigWallet.threshold,
        pendingTransactions: [],
        description: description || 'Multi-signature wallet',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const walletRef = await firebaseDataService.multiSig.createMultiSigWallet(walletData);

      if (__DEV__) {
        console.log('✅ Multi-signature wallet created successfully:', walletRef.id);
      }

      return {
        success: true,
        wallet: {
          id: walletRef.id,
          address: multiSigWallet.address,
          owners: multiSigWallet.owners,
          threshold: multiSigWallet.threshold,
          pendingTransactions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error creating multi-signature wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create multi-signature wallet'
      };
    }
  }

  // Create a transaction that requires multi-signature approval
  async createMultiSigTransaction(
    multiSigWalletId: string,
    instructions: TransactionInstruction[],
    signers: string[],
    description?: string,
    amount?: number,
    currency?: string,
    recipient?: string
  ): Promise<MultiSigTransactionResult> {
    try {
      if (__DEV__) {
        console.log('🔧 Creating multi-signature transaction:', { multiSigWalletId, signers });
      }

      // Get the multi-sig wallet
      const multiSigWallet = await firebaseDataService.multiSig.getMultiSigWallet(multiSigWalletId);
      if (!multiSigWallet) {
        return {
          success: false,
          error: 'Multi-signature wallet not found'
        };
      }

      // Validate that all signers are owners
      const invalidSigners = signers.filter(signer => !multiSigWallet.owners.includes(signer));
      if (invalidSigners.length > 0) {
        return {
          success: false,
          error: `Invalid signers: ${invalidSigners.join(', ')}`
        };
      }

      // Serialize instructions for storage
      const serializedInstructions = instructions.map(instruction => ({
        programId: instruction.programId.toBase58(),
        keys: instruction.keys.map(key => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable
        })),
        data: Array.from(instruction.data)
      }));

      // Create transaction data
      const transactionData = {
        multiSigWalletId,
        instructions: serializedInstructions,
        signers,
        approvals: [],
        rejections: [],
        executed: false,
        description: description || 'Multi-signature transaction',
        amount,
        currency,
        recipient,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in Firebase
      const transactionRef = await firebaseDataService.multiSig.createMultiSigTransaction(transactionData);

      if (__DEV__) {
        console.log('✅ Multi-signature transaction created:', transactionRef.id);
      }

      return {
        success: true,
        transaction: {
          id: transactionRef.id,
          multiSigWalletId,
          instructions: serializedInstructions,
          signers,
          approvals: [],
          rejections: [],
          executed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          description,
          amount,
          currency,
          recipient
        }
      };
    } catch (error) {
      console.error('Error creating multi-signature transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create multi-signature transaction'
      };
    }
  }

  // Approve a multi-signature transaction
  async approveMultiSigTransaction(
    transactionId: string,
    approver: string
  ): Promise<MultiSigTransactionResult> {
    try {
      if (__DEV__) {
        console.log('🔧 Approving multi-signature transaction:', { transactionId, approver });
      }

      // Get the transaction
      const transaction = await firebaseDataService.multiSig.getMultiSigTransaction(transactionId);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      if (transaction.executed) {
        return {
          success: false,
          error: 'Transaction has already been executed'
        };
      }

      if (transaction.rejections.includes(approver)) {
        return {
          success: false,
          error: 'Cannot approve a transaction that has been rejected'
        };
      }

      if (transaction.approvals.includes(approver)) {
        return {
          success: false,
          error: 'Transaction already approved by this user'
        };
      }

      // Get the multi-sig wallet to check threshold
      const multiSigWallet = await firebaseDataService.multiSig.getMultiSigWallet(transaction.multiSigWalletId);
      if (!multiSigWallet) {
        return {
          success: false,
          error: 'Multi-signature wallet not found'
        };
      }

      // Add approval
      const updatedApprovals = [...transaction.approvals, approver];
      
      // Update transaction
      await firebaseDataService.multiSig.updateMultiSigTransaction(transactionId, {
        approvals: updatedApprovals,
        updatedAt: new Date()
      });

      // Check if we have enough approvals to execute
      if (updatedApprovals.length >= multiSigWallet.threshold) {
        await this.executeMultiSigTransaction(transactionId);
      }

      if (__DEV__) {
        console.log('✅ Multi-signature transaction approved:', {
          transactionId,
          approver,
          approvalsCount: updatedApprovals.length,
          threshold: multiSigWallet.threshold
        });
      }

      return {
        success: true,
        transaction: {
          ...transaction,
          approvals: updatedApprovals,
          updatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error approving multi-signature transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve transaction'
      };
    }
  }

  // Reject a multi-signature transaction
  async rejectMultiSigTransaction(
    transactionId: string,
    rejector: string
  ): Promise<MultiSigTransactionResult> {
    try {
      if (__DEV__) {
        console.log('🔧 Rejecting multi-signature transaction:', { transactionId, rejector });
      }

      // Get the transaction
      const transaction = await firebaseDataService.multiSig.getMultiSigTransaction(transactionId);
      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      if (transaction.executed) {
        return {
          success: false,
          error: 'Transaction has already been executed'
        };
      }

      if (transaction.rejections.includes(rejector)) {
        return {
          success: false,
          error: 'Transaction already rejected by this user'
        };
      }

      // Add rejection
      const updatedRejections = [...transaction.rejections, rejector];
      
      // Update transaction
      await firebaseDataService.multiSig.updateMultiSigTransaction(transactionId, {
        rejections: updatedRejections,
        updatedAt: new Date()
      });

      if (__DEV__) {
        console.log('❌ Multi-signature transaction rejected:', {
          transactionId,
          rejector,
          rejectionsCount: updatedRejections.length
        });
      }

      return {
        success: true,
        transaction: {
          ...transaction,
          rejections: updatedRejections,
          updatedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error rejecting multi-signature transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject transaction'
      };
    }
  }

  // Execute a multi-signature transaction
  private async executeMultiSigTransaction(transactionId: string): Promise<string> {
    try {
      if (__DEV__) {
        console.log('🔧 Executing multi-signature transaction:', transactionId);
      }

      // Get the transaction
      const transaction = await firebaseDataService.multiSig.getMultiSigTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.executed) {
        throw new Error('Transaction has already been executed');
      }

      // Get the multi-sig wallet
      const multiSigWallet = await firebaseDataService.multiSig.getMultiSigWallet(transaction.multiSigWalletId);
      if (!multiSigWallet) {
        throw new Error('Multi-signature wallet not found');
      }

      if (transaction.approvals.length < multiSigWallet.threshold) {
        throw new Error('Not enough approvals to execute transaction');
      }

      // Deserialize instructions
      const instructions = transaction.instructions.map(instruction => {
        return new TransactionInstruction({
          programId: new PublicKey(instruction.programId),
          keys: instruction.keys.map(key => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          })),
          data: Buffer.from(instruction.data)
        });
      });

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create the transaction
      const solanaTransaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: new PublicKey(multiSigWallet.address)
      });

      // Add all instructions
      instructions.forEach(instruction => {
        solanaTransaction.add(instruction);
      });

      // Note: In a real implementation, you would need to get the actual keypairs for the signers
      // For now, we'll simulate the execution
      const signature = `simulated_signature_${Date.now()}`;

      // Mark transaction as executed
      await firebaseDataService.multiSig.updateMultiSigTransaction(transactionId, {
        executed: true,
        executedAt: new Date(),
        updatedAt: new Date()
      });

      if (__DEV__) {
        console.log('✅ Multi-signature transaction executed:', {
          transactionId,
          signature,
          approvalsCount: transaction.approvals.length
        });
      }

      return signature;
    } catch (error) {
      console.error('Error executing multi-signature transaction:', error);
      throw new Error('Failed to execute transaction: ' + (error as Error).message);
    }
  }

  // Get multi-signature wallet information
  async getMultiSigWallet(walletId: string): Promise<MultiSigWallet | null> {
    try {
      return await firebaseDataService.multiSig.getMultiSigWallet(walletId);
    } catch (error) {
      console.error('Error getting multi-signature wallet:', error);
      return null;
    }
  }

  // Get all multi-signature wallets for a user
  async getUserMultiSigWallets(userId: string): Promise<MultiSigWallet[]> {
    try {
      return await firebaseDataService.multiSig.getUserMultiSigWallets(userId);
    } catch (error) {
      console.error('Error getting user multi-signature wallets:', error);
      return [];
    }
  }

  // Get pending transactions for a multi-signature wallet
  async getPendingTransactions(walletId: string): Promise<MultiSigTransaction[]> {
    try {
      return await firebaseDataService.multiSig.getPendingTransactions(walletId);
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  }

  // Get all transactions for a user
  async getUserTransactions(userId: string): Promise<MultiSigTransaction[]> {
    try {
      return await firebaseDataService.multiSig.getUserTransactions(userId);
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const multiSigService = new MultiSigService(); 