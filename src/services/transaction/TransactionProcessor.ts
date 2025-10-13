/**
 * Transaction Processor
 * Handles the core transaction processing logic
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
import { USDC_CONFIG } from '../shared/walletConstants';
import { getConfig } from '../../config/unified';
import { TRANSACTION_CONFIG } from '../../config/transactionConfig';
import { FeeService } from '../../config/feeConfig';
import { transactionUtils } from '../shared/transactionUtils';
import { logger } from '../loggingService';
import { TransactionParams, TransactionResult } from './types';

export class TransactionProcessor {
  private connection: Connection;
  private isProduction: boolean;

  constructor() {
    this.connection = new Connection(getConfig().blockchain.rpcUrl, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
    });
    this.isProduction = !__DEV__;
  }

  /**
   * SOL transactions are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    return {
      signature: '',
      txId: '',
      success: false,
      error: 'SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.'
    };
  }

  /**
   * Send USDC transaction with company fee
   */
  async sendUSDCTransaction(params: TransactionParams, keypair: Keypair): Promise<TransactionResult> {
    try {
      logger.info('🚀 TransactionProcessor: Starting USDC transaction', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId,
        priority: params.priority,
        isProduction: this.isProduction,
        fromAddress: keypair.publicKey.toBase58()
      });

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);
      
      logger.info('💰 TransactionProcessor: Fee calculation', {
        transactionType,
        originalAmount: params.amount,
        companyFee,
        totalAmount,
        recipientAmount
      });

      const fromPublicKey = keypair.publicKey;
      
      logger.info('🔍 TransactionProcessor: Creating recipient public key', {
        toAddress: params.to,
        toAddressLength: params.to.length
      });
      
      const toPublicKey = new PublicKey(params.to);
      
      logger.info('✅ TransactionProcessor: Public keys created successfully', {
        fromAddress: fromPublicKey.toBase58(),
        toAddress: toPublicKey.toBase58()
      });
      
      // Recipient gets the full amount
      const recipientAmountInSmallestUnit = Math.floor(recipientAmount * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      // Company fee amount
      const companyFeeAmount = Math.floor(companyFee * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
      
      logger.info('🏦 TransactionProcessor: Fee payer setup', {
        userPublicKey: fromPublicKey.toBase58(),
        feePayerPublicKey: feePayerPublicKey.toBase58(),
        isCompanyWallet: feePayerPublicKey.toBase58() !== fromPublicKey.toBase58()
      });

      // Get associated token addresses
      logger.info('🔍 TransactionProcessor: Creating USDC mint public key', {
        usdcMintAddress: USDC_CONFIG.mintAddress,
        usdcMintLength: USDC_CONFIG.mintAddress.length
      });
      
      const usdcMintPublicKey = new PublicKey(USDC_CONFIG.mintAddress);
      
      logger.info('✅ TransactionProcessor: USDC mint public key created successfully', {
        usdcMintAddress: usdcMintPublicKey.toBase58()
      });
      
      logger.info('🔍 TransactionProcessor: Creating token accounts', {
        fromPublicKey: fromPublicKey.toBase58(),
        toPublicKey: toPublicKey.toBase58(),
        usdcMint: usdcMintPublicKey.toBase58()
      });
      
      const fromTokenAccount = await getAssociatedTokenAddress(
        usdcMintPublicKey,
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        usdcMintPublicKey,
        toPublicKey
      );
      
      logger.info('✅ TransactionProcessor: Token accounts created successfully', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58()
      });

      // Check if recipient has USDC token account, create if needed
      let createTokenAccountInstruction: TransactionInstruction | null = null;
      try {
        logger.info('🔍 TransactionProcessor: Checking if recipient token account exists', {
          toTokenAccount: toTokenAccount.toBase58()
        });
        
        await getAccount(this.connection, toTokenAccount);
        
        logger.info('✅ TransactionProcessor: Recipient token account exists', {
          toTokenAccount: toTokenAccount.toBase58()
        });
      } catch (error) {
        logger.info('ℹ️ TransactionProcessor: Recipient token account does not exist, will create it', {
          toTokenAccount: toTokenAccount.toBase58(),
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Token account doesn't exist, create it
        // Use fee payer (company wallet) as the payer for token account creation
        createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          feePayerPublicKey, // payer - use company wallet to pay for token account creation
          toTokenAccount, // associated token account
          toPublicKey, // owner
          usdcMintPublicKey // mint
        );
      }

      // Get recent blockhash
      logger.info('🔍 TransactionProcessor: Getting recent blockhash', {
        commitment: 'confirmed'
      });
      
      const blockhash = await transactionUtils.getLatestBlockhashWithRetry('confirmed');
      
      logger.info('✅ TransactionProcessor: Blockhash retrieved successfully', {
        blockhash: blockhash.substring(0, 8) + '...',
        blockhashLength: blockhash.length
      });
      
      // Create the transaction with proper setup
      logger.info('🔍 TransactionProcessor: Creating transaction', {
        feePayer: feePayerPublicKey.toBase58(),
        blockhash: blockhash.substring(0, 8) + '...'
      });
      
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey
      });
      
      logger.info('✅ TransactionProcessor: Transaction created successfully');

      // Add compute budget instructions for priority
      const priority = params.priority || 'medium';
      const computeUnitPrice = TRANSACTION_CONFIG.priorityFees[priority as keyof typeof TRANSACTION_CONFIG.priorityFees] || 5000;
      const computeUnitLimit = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
      
      logger.info('🔍 TransactionProcessor: Adding compute budget instructions', {
        priority,
        computeUnitPrice,
        computeUnitLimit
      });
      
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
      );
      
      logger.info('✅ TransactionProcessor: Compute budget instructions added successfully');

      // Add create token account instruction if needed
      if (createTokenAccountInstruction) {
        logger.info('🔍 TransactionProcessor: Adding create token account instruction');
        
        // Check if company wallet has enough SOL for rent exemption
        const companySolBalance = await this.connection.getBalance(feePayerPublicKey);
        const rentExemptionAmount = 2039280; // ~0.00203928 SOL for token account rent exemption
        
        if (companySolBalance < rentExemptionAmount) {
          logger.error('❌ TransactionProcessor: Company wallet has insufficient SOL for rent exemption', {
            companySolBalance,
            rentExemptionAmount,
            needed: rentExemptionAmount - companySolBalance,
            companyWalletAddress: feePayerPublicKey.toBase58()
          });
          
          return {
            success: false,
            error: `Company wallet has insufficient SOL for transaction. Required: ${(rentExemptionAmount / 1e9).toFixed(6)} SOL, Available: ${(companySolBalance / 1e9).toFixed(6)} SOL. Please contact support to fund the company wallet.`,
            signature: '',
            txId: ''
          };
        }
        
        transaction.add(createTokenAccountInstruction);
        logger.info('✅ TransactionProcessor: Create token account instruction added');
      }

      // Add transfer instruction for recipient
      logger.info('🔍 TransactionProcessor: Adding transfer instruction for recipient', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58(),
        amount: recipientAmountInSmallestUnit,
        amountUsdc: recipientAmount
      });
      
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          recipientAmountInSmallestUnit,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      logger.info('✅ TransactionProcessor: Transfer instruction for recipient added successfully');

      // Add company fee transfer if applicable
      if (companyFeeAmount > 0) {
        logger.info('🔍 TransactionProcessor: Adding company fee transfer', {
          companyFeeAmount,
          companyFeeUsdc: companyFee,
          feePayerPublicKey: feePayerPublicKey.toBase58()
        });
        
        const companyTokenAccount = await getAssociatedTokenAddress(
          usdcMintPublicKey,
          feePayerPublicKey
        );
        
        logger.info('✅ TransactionProcessor: Company token account created', {
          companyTokenAccount: companyTokenAccount.toBase58()
        });

        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey,
            companyFeeAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        logger.info('✅ TransactionProcessor: Company fee transfer instruction added successfully');
      }

      // Add memo if provided
      if (params.memo) {
        logger.info('🔍 TransactionProcessor: Adding memo instruction', {
          memo: params.memo,
          memoLength: params.memo.length
        });
        
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(params.memo, 'utf8'),
          })
        );
        
        logger.info('✅ TransactionProcessor: Memo instruction added successfully');
      } else {
        logger.info('ℹ️ TransactionProcessor: No memo provided, skipping memo instruction');
      }

      logger.info('🔍 TransactionProcessor: All instructions added, preparing for signing', {
        instructionCount: transaction.instructions.length,
        feePayer: feePayerPublicKey.toBase58()
      });
      
      // Prepare signers array
      const signers: Keypair[] = [keypair];
      
      logger.info('🔍 TransactionProcessor: Preparing signers array', {
        userKeypairAddress: keypair.publicKey.toBase58(),
        signersCount: signers.length
      });
      
      // Add company wallet keypair for fee payment
      const { COMPANY_WALLET_CONFIG } = await import('../../config/feeConfig');
      
      logger.info('🔍 TransactionProcessor: Loading company wallet keypair', {
        hasSecretKey: !!COMPANY_WALLET_CONFIG.secretKey,
        secretKeyLength: COMPANY_WALLET_CONFIG.secretKey?.length || 0,
        companyWalletAddress: COMPANY_WALLET_CONFIG.address
      });
      
      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          let companySecretKeyBuffer: Buffer;
          
          // Handle different secret key formats
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            logger.info('🔍 TransactionProcessor: Parsing company secret key as JSON array format');
            const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
            const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
            companySecretKeyBuffer = Buffer.from(keyArray);
          } else {
            logger.info('🔍 TransactionProcessor: Parsing company secret key as base64 format');
            companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
          }
          
          logger.info('🔍 TransactionProcessor: Company secret key buffer created', {
            bufferLength: companySecretKeyBuffer.length,
            expectedLength: 64
          });
          
          // Validate and trim if needed
          if (companySecretKeyBuffer.length === 65) {
            logger.info('🔍 TransactionProcessor: Trimming company secret key buffer from 65 to 64 bytes');
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
          }
          
          logger.info('🔍 TransactionProcessor: Creating company keypair from secret key');
          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          
          logger.info('✅ TransactionProcessor: Company keypair created successfully', {
            companyKeypairAddress: companyKeypair.publicKey.toBase58(),
            expectedAddress: COMPANY_WALLET_CONFIG.address,
            addressesMatch: companyKeypair.publicKey.toBase58() === COMPANY_WALLET_CONFIG.address
          });
          
          signers.push(companyKeypair);
          
          logger.info('✅ TransactionProcessor: Company keypair added to signers', {
            totalSigners: signers.length
          });
        } catch (error) {
          logger.error('❌ TransactionProcessor: Failed to load company wallet keypair', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }, 'TransactionProcessor');
          throw new Error('Company wallet keypair not available for signing');
        }
      } else {
        logger.warn('⚠️ TransactionProcessor: No company wallet secret key configured');
      }

      // Send transaction with retry logic
      logger.info('📤 TransactionProcessor: Preparing to send transaction', {
        signersCount: signers.length,
        priority,
        signerAddresses: signers.map(s => s.publicKey.toBase58()),
        instructionCount: transaction.instructions.length
      });
      
      let signature: string;
      try {
        signature = await transactionUtils.sendTransactionWithRetry(
          transaction,
          signers,
          priority as 'low' | 'medium' | 'high'
        );
        
        logger.info('✅ TransactionProcessor: Transaction sent successfully', {
          signature,
          signatureLength: signature.length
        });
      } catch (sendError) {
        logger.error('❌ TransactionProcessor: Transaction send failed', {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          stack: sendError instanceof Error ? sendError.stack : undefined
        }, 'TransactionProcessor');
        throw sendError;
      }
      
      // Confirm transaction
      const confirmed = await transactionUtils.confirmTransactionWithTimeout(signature);
      if (!confirmed) {
        logger.warn('Transaction confirmation timed out, but transaction was sent', { signature }, 'TransactionProcessor');
      }

      logger.info('USDC transaction completed successfully', {
        signature,
        amount: params.amount,
        recipientAmount,
        companyFee,
        to: params.to
      });

      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount: recipientAmount
      };

    } catch (error) {
      logger.error('USDC transaction failed', error, 'TransactionProcessor');
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    try {
      // Base transaction fee
      let baseFee = 0.000005; // 5000 lamports base fee

      // Add priority fee
      const priorityFee = TRANSACTION_CONFIG.priorityFees[priority as keyof typeof TRANSACTION_CONFIG.priorityFees];
      if (priorityFee) {
        baseFee += priorityFee / 1_000_000_000; // Convert micro-lamports to SOL
      }

      // Add company fee for USDC transactions
      if (currency === 'USDC') {
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, 'send');
        baseFee += companyFee;
      }

      return baseFee;
    } catch (error) {
      logger.error('Failed to estimate transaction fee', error, 'TransactionProcessor');
      return 0.001; // Fallback fee
    }
  }
}
