/**
 * Internal P2P Send Flow - Real On-Chain Transactions
 * Handles user-to-user transfers within the app
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { CURRENT_NETWORK, TRANSACTION_CONFIG, COMPANY_FEE_CONFIG, COMPANY_WALLET_CONFIG } from '../config/chain';
import { solanaWalletService } from '../wallet/solanaWallet';
import { logger } from '../services/loggingService';
import { moneyTransferNotificationService } from '../services/moneyTransferNotificationService';

export interface InternalTransferParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  groupId?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface InternalTransferResult {
  success: boolean;
  signature?: string;
  txId?: string;
  companyFee?: number;
  netAmount?: number;
  blockchainFee?: number;
  error?: string;
}

export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall?: number;
}

class InternalTransferService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
    });
  }

  /**
   * Send internal P2P transfer
   */
  async sendInternalTransfer(params: InternalTransferParams): Promise<InternalTransferResult> {
    try {
      logger.info('Starting internal transfer', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'InternalTransferService');

      // Validate recipient address
      const recipientValidation = this.validateRecipientAddress(params.to);
      if (!recipientValidation.isValid) {
        return {
          success: false,
          error: recipientValidation.error
        };
      }

      // Check balance before proceeding
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${params.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Calculate company fee
      const { fee: companyFee, netAmount } = this.calculateCompanyFee(params.amount);

      // Load wallet using the existing userWalletService
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Failed to load user wallet'
        };
      }

      // Load the wallet into solanaWalletService for signing
      const expectedWalletAddress = walletResult.wallet.address;
      logger.info('Loading wallet into solanaWalletService for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');
      
      // Use the new method that ensures we load the wallet with sufficient balance
      const walletLoaded = await solanaWalletService.loadWalletWithBalance(params.userId, expectedWalletAddress, params.currency);
      if (!walletLoaded) {
        logger.error('Cannot proceed with transaction - no wallet with sufficient balance found', {
          userId: params.userId,
          expectedWalletAddress,
          currency: params.currency,
          issue: 'No wallet with sufficient balance found. Please ensure you have the correct wallet credentials.'
        }, 'InternalTransferService');
        
        return {
          success: false,
          error: 'Wallet mismatch: No wallet with sufficient balance found. Please import your existing wallet or ensure you have the correct credentials.'
        };
      }
      logger.info('Wallet loaded successfully for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');

      // Build and send transaction
      logger.info('Building transaction', {
        currency: params.currency,
        netAmount,
        companyFee
      }, 'InternalTransferService');

      let result: InternalTransferResult;
      if (params.currency === 'SOL') {
        logger.info('Sending SOL transfer', { netAmount, companyFee }, 'InternalTransferService');
        result = await this.sendSolTransfer(params, netAmount, companyFee);
      } else {
        logger.info('Sending USDC transfer', { netAmount, companyFee }, 'InternalTransferService');
        try {
          result = await this.sendUsdcTransfer(params, netAmount, companyFee);
          logger.info('USDC transfer method completed', { 
            success: result.success, 
            signature: result.signature,
            error: result.error 
          }, 'InternalTransferService');
        } catch (error) {
          logger.error('USDC transfer method threw error', error, 'InternalTransferService');
          result = {
            success: false,
            error: error instanceof Error ? error.message : 'USDC transfer method failed'
          };
        }
      }

      logger.info('Transaction result', {
        success: result.success,
        signature: result.signature,
        error: result.error
      }, 'InternalTransferService');

      if (result.success) {
        logger.info('Internal transfer completed successfully', {
          signature: result.signature,
          amount: params.amount,
          netAmount: result.netAmount,
          companyFee: result.companyFee
        }, 'InternalTransferService');

        // Save transaction to Firebase for history
        try {
          await this.saveTransactionToFirebase({
            userId: params.userId,
            toAddress: params.to,
            amount: params.amount,
            currency: params.currency,
            signature: result.signature!,
            companyFee: result.companyFee!,
            netAmount: result.netAmount!,
            memo: params.memo,
            groupId: params.groupId
          });
        } catch (error) {
          logger.warn('Failed to save transaction to Firebase', { error, signature: result.signature }, 'InternalTransferService');
          // Don't fail the transaction if Firebase save fails
        }
      } else {
        logger.error('Internal transfer failed', {
          error: result.error,
          amount: params.amount,
          currency: params.currency
        }, 'InternalTransferService');
      }

      return result;
    } catch (error) {
      logger.error('Internal transfer failed', error, 'InternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user balance
   */
  async checkBalance(userId: string, amount: number, currency: 'SOL' | 'USDC'): Promise<BalanceCheckResult> {
    try {
      // Use the existing userWalletService to get balance
      const { userWalletService } = await import('../services/userWalletService');
      const balance = await userWalletService.getUserWalletBalance(userId);
      
      const currentBalance = currency === 'SOL' ? balance.solBalance : balance.usdcBalance;
      
      // Calculate total required amount (including company fee)
      const { fee: companyFee } = this.calculateCompanyFee(amount);
      const requiredAmount = amount + companyFee;

      logger.info('Balance check completed', {
        userId,
        currency,
        currentBalance,
        requiredAmount,
        hasSufficientBalance: currentBalance >= requiredAmount
      }, 'InternalTransferService');

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
        requiredAmount,
        shortfall: currentBalance < requiredAmount ? requiredAmount - currentBalance : undefined
      };
    } catch (error) {
      logger.error('Failed to check balance', error, 'InternalTransferService');
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        requiredAmount: amount
      };
    }
  }

  /**
   * Get real-time balance from on-chain
   */
  async getRealTimeBalance(userId: string): Promise<{ sol: number; usdc: number }> {
    try {
      return await solanaWalletService.getBalance();
    } catch (error) {
      logger.error('Failed to get real-time balance', error, 'InternalTransferService');
      throw error;
    }
  }

  /**
   * Send SOL transfer
   */
  private async sendSolTransfer(
    params: InternalTransferParams, 
    netAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    try {
      const fromPublicKey = new PublicKey(solanaWalletService.getPublicKey()!);
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
        transaction.add(
          new TransactionInstruction({
            keys: [{ pubkey: fromPublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(params.memo, 'utf8'),
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
          })
        );
      }

      // Get wallet keypair for signing
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        throw new Error('Wallet keypair not available for signing');
      }

      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const keypair = Keypair.fromSecretKey(secretKeyBuffer);

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair], // Use the actual keypair for signing
        {
          commitment: CURRENT_NETWORK.commitment,
          preflightCommitment: CURRENT_NETWORK.commitment
        }
      );

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('SOL transfer failed', error, 'InternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SOL transfer failed'
      };
    }
  }

  /**
   * Send USDC transfer
   */
  private async sendUsdcTransfer(
    params: InternalTransferParams, 
    netAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    try {
      logger.info('Starting USDC transfer', {
        to: params.to,
        netAmount,
        companyFee,
        originalAmount: params.amount
      }, 'InternalTransferService');

      // Get wallet public key
      logger.info('Getting wallet public key', {}, 'InternalTransferService');
      const publicKey = solanaWalletService.getPublicKey();
      if (!publicKey) {
        logger.error('Wallet not loaded - no public key available', {}, 'InternalTransferService');
        throw new Error('Wallet not loaded - no public key available');
      }
      logger.info('Wallet public key retrieved', { publicKey }, 'InternalTransferService');

      const fromPublicKey = new PublicKey(publicKey);
      const toPublicKey = new PublicKey(params.to);
      const usdcMint = new PublicKey(CURRENT_NETWORK.usdcMintAddress);

      logger.info('USDC transfer setup', {
        fromPublicKey: fromPublicKey.toBase58(),
        toPublicKey: toPublicKey.toBase58(),
        usdcMint: usdcMint.toBase58()
      }, 'InternalTransferService');

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      logger.info('Token accounts', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58()
      }, 'InternalTransferService');

      // Check if recipient has USDC token account, create if needed
      let needsTokenAccountCreation = false;
      try {
        await getAccount(this.connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        needsTokenAccountCreation = true;
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      logger.info('Got recent blockhash', { blockhash }, 'InternalTransferService');

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = COMPANY_WALLET_CONFIG.useUserWalletForFees 
        ? fromPublicKey 
        : new PublicKey(COMPANY_WALLET_CONFIG.address);
      
      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // User or company pays fees based on configuration
      });

      logger.info('Transaction created', {
        feePayer: feePayerPublicKey.toBase58(),
        recentBlockhash: blockhash,
        instructionsCount: transaction.instructions.length
      }, 'InternalTransferService');

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
        logger.info('Added priority fee', { priorityFee }, 'InternalTransferService');
      }

      // Add token account creation instruction if needed
      if (needsTokenAccountCreation) {
        logger.info('Adding token account creation instruction', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // Fee payer pays ATA creation
            toTokenAccount, // associated token account
            toPublicKey, // owner
            usdcMint // mint
          )
        );
      }

      // Add USDC transfer instruction
      const transferAmount = Math.floor(netAmount * Math.pow(10, 6)); // USDC has 6 decimals
      logger.info('Adding USDC transfer instruction', { 
        transferAmount, 
        netAmount,
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58(),
        authority: fromPublicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');
      
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey, // User is the authority for the token transfer
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add memo if provided
      if (params.memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [{ pubkey: feePayerPublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(params.memo, 'utf8'),
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
          })
        );
        logger.info('Added memo instruction', { 
          memo: params.memo, 
          memoSigner: feePayerPublicKey.toBase58() 
        }, 'InternalTransferService');
      }

      logger.info('All instructions added to transaction', {
        instructionsCount: transaction.instructions.length,
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash
      }, 'InternalTransferService');

      // Get wallet keypair for signing
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        throw new Error('Wallet keypair not available for signing');
      }

      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);

      // Prepare signers array
      const signers: Keypair[] = [];
      
      // If company wallet is the fee payer, we need to add company wallet keypair
      logger.info('Company wallet configuration check', {
        useUserWalletForFees: COMPANY_WALLET_CONFIG.useUserWalletForFees,
        hasCompanySecretKey: !!COMPANY_WALLET_CONFIG.secretKey,
        companyWalletAddress: COMPANY_WALLET_CONFIG.address,
        feePayerAddress: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');

      if (!COMPANY_WALLET_CONFIG.useUserWalletForFees && COMPANY_WALLET_CONFIG.secretKey) {
        try {
          logger.info('Processing company wallet secret key', {
            secretKeyLength: COMPANY_WALLET_CONFIG.secretKey.length,
            secretKeyPreview: COMPANY_WALLET_CONFIG.secretKey.substring(0, 10) + '...',
            secretKeyFormat: 'base64'
          }, 'InternalTransferService');

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
              logger.info('Successfully decoded secret key as comma-separated array', {
                bufferLength: companySecretKeyBuffer.length,
                arrayLength: keyArray.length
              }, 'InternalTransferService');
            } catch (arrayError) {
              throw new Error(`Failed to parse comma-separated array: ${arrayError instanceof Error ? arrayError.message : String(arrayError)}`);
            }
          } else {
            try {
              // Try base64 first for other formats
              companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
              
              // Check if the length is reasonable for Solana (64 or 65 bytes)
              if (companySecretKeyBuffer.length === 64 || companySecretKeyBuffer.length === 65) {
                logger.info('Successfully decoded secret key as base64', {
                  bufferLength: companySecretKeyBuffer.length
                }, 'InternalTransferService');
              } else {
                throw new Error(`Base64 decoded to unexpected length: ${companySecretKeyBuffer.length}`);
              }
            } catch (base64Error) {
              try {
                // Try hex format
                companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'hex');
                logger.info('Successfully decoded secret key as hex', {
                  bufferLength: companySecretKeyBuffer.length
                }, 'InternalTransferService');
              } catch (hexError) {
                throw new Error('Unable to decode secret key in any supported format');
              }
            }
          }

          // Validate the secret key length (should be 64 or 65 bytes for Solana)
          if (companySecretKeyBuffer.length === 65) {
            // Remove the last byte (public key) to get the 64-byte secret key
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
            logger.info('Trimmed 65-byte keypair to 64-byte secret key', {
              originalLength: 65,
              trimmedLength: companySecretKeyBuffer.length
            }, 'InternalTransferService');
          } else if (companySecretKeyBuffer.length !== 64) {
            throw new Error(`Invalid secret key length: ${companySecretKeyBuffer.length} bytes (expected 64 or 65)`);
          }

          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          
        logger.info('Using company wallet for fees', {
          companyWalletAddress: COMPANY_WALLET_CONFIG.address,
          userWalletAddress: userKeypair.publicKey.toBase58(),
          companyKeypairAddress: companyKeypair.publicKey.toBase58()
        }, 'InternalTransferService');

        // Add both keypairs to signers array
        signers.push(userKeypair, companyKeypair);
        logger.info('Added both keypairs to signers array', {
          signersCount: signers.length,
          signers: signers.map(signer => signer.publicKey.toBase58())
        }, 'InternalTransferService');
        } catch (error) {
          logger.error('Failed to load company wallet keypair', { error }, 'InternalTransferService');
          throw new Error('Company wallet keypair not available for signing');
        }
      } else {
        logger.info('Using user wallet for fees', {
          useUserWalletForFees: COMPANY_WALLET_CONFIG.useUserWalletForFees,
          hasCompanySecretKey: !!COMPANY_WALLET_CONFIG.secretKey
        }, 'InternalTransferService');
        
        // Add only user keypair to signers array
        signers.push(userKeypair);
        logger.info('Added user keypair to signers array', {
          signersCount: signers.length,
          signers: signers.map(signer => signer.publicKey.toBase58())
        }, 'InternalTransferService');
      }

      // Debug transaction before serialization
      logger.info('Transaction ready for signing', {
        signerPublicKey: userKeypair.publicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58(),
        signersCount: signers.length,
        signers: signers.map(signer => signer.publicKey.toBase58()),
        instructionsCount: transaction.instructions.length
      }, 'InternalTransferService');

      logger.info('Signing and sending transaction', {
        signerPublicKey: userKeypair.publicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58(),
        signersCount: signers.length,
        signers: signers.map(signer => signer.publicKey.toBase58())
      }, 'InternalTransferService');

      // Debug transaction structure
      logger.info('Transaction structure debug', {
        instructionsCount: transaction.instructions.length,
        instructions: transaction.instructions.map((ix, index) => ({
          index,
          programId: ix.programId.toBase58(),
          keys: ix.keys.map(key => ({
            pubkey: key.pubkey.toBase58(),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          }))
        }))
      }, 'InternalTransferService');

      // Sign and send transaction
      let signature: string;
      try {
        logger.info('Attempting to sign and send transaction', {
          connectionEndpoint: this.connection.rpcEndpoint,
          commitment: CURRENT_NETWORK.commitment
        }, 'InternalTransferService');
        
        signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
          signers, // Use all required signers
        {
          commitment: CURRENT_NETWORK.commitment,
          preflightCommitment: CURRENT_NETWORK.commitment,
          maxRetries: 3
        }
      );
        
        logger.info('Transaction signed and sent successfully', { signature }, 'InternalTransferService');
      } catch (signingError) {
        logger.error('Transaction signing failed', { 
          error: signingError,
          errorMessage: signingError instanceof Error ? signingError.message : String(signingError),
          signersCount: signers.length,
          signers: signers.map(signer => signer.publicKey.toBase58())
        }, 'InternalTransferService');
        throw signingError;
      }

      logger.info('Transaction sent successfully', { signature }, 'InternalTransferService');

      // Verify transaction was actually successful
      try {
        const transactionStatus = await this.connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });

        if (transactionStatus.value?.err) {
          logger.error('Transaction failed on blockchain', { 
            signature, 
            error: transactionStatus.value.err 
          }, 'InternalTransferService');
          return {
            success: false,
            error: `Transaction failed: ${transactionStatus.value.err.toString()}`
          };
        }

        logger.info('Transaction confirmed on blockchain', { 
          signature, 
          confirmations: transactionStatus.value?.confirmations || 0 
        }, 'InternalTransferService');
      } catch (error) {
        logger.warn('Could not verify transaction status', { signature, error }, 'InternalTransferService');
        // Continue anyway as the transaction might still be processing
      }

      // Create notifications for successful money transfer
      try {
        if (params.groupId) {
          // Group payment notifications
          await moneyTransferNotificationService.createGroupPaymentSentNotification(
            params.userId,
            params.groupId,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
          
          await moneyTransferNotificationService.createGroupPaymentReceivedNotification(
            params.groupId,
            params.amount,
            params.currency,
            signature,
            params.userId,
            params.memo
          );
        } else {
          // Direct P2P payment notifications
          await moneyTransferNotificationService.createMoneySentNotification(
            params.userId,
            params.to,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
          
          await moneyTransferNotificationService.createMoneyReceivedNotification(
            params.userId,
            params.to,
            params.amount,
            params.currency,
            signature,
            params.memo
          );
        }
        logger.info('Money transfer notifications created successfully', { signature }, 'InternalTransferService');
      } catch (notificationError) {
        logger.warn('Failed to create money transfer notifications', { 
          signature, 
          error: notificationError 
        }, 'InternalTransferService');
        // Don't fail the transaction if notifications fail
      }

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('USDC transfer failed', error, 'InternalTransferService');
      
      // Create notification for failed transfer
      try {
        await moneyTransferNotificationService.createMoneyTransferFailedNotification(
          params.userId,
          params.amount,
          params.currency,
          error instanceof Error ? error.message : 'Transfer failed',
          !!params.groupId,
          params.groupId
        );
      } catch (notificationError) {
        logger.warn('Failed to create money transfer failed notification', { 
          error: notificationError 
        }, 'InternalTransferService');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'USDC transfer failed'
      };
    }
  }

  /**
   * Validate recipient address
   */
  private validateRecipientAddress(address: string): { isValid: boolean; error?: string } {
    try {
      // Check if it's a valid Solana address
      new PublicKey(address);
      
      // Check address length and format
      if (address.length < 32 || address.length > 44) {
        return {
          isValid: false,
          error: 'Invalid address length'
        };
      }

      // Check if it's a valid base58 string
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      if (!base58Regex.test(address)) {
        return {
          isValid: false,
          error: 'Invalid address format'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid Solana address'
      };
    }
  }

  /**
   * Calculate company fee
   */
  private calculateCompanyFee(amount: number): { fee: number; netAmount: number } {
    const feePercentage = COMPANY_FEE_CONFIG.percentage / 100;
    let fee = amount * feePercentage;
    
    // Apply min/max fee limits
    fee = Math.max(fee, COMPANY_FEE_CONFIG.minFee);
    fee = Math.min(fee, COMPANY_FEE_CONFIG.maxFee);
    
    const netAmount = amount - fee;
    
    return { fee, netAmount };
  }

  /**
   * Get priority fee
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Estimate blockchain fee
   */
  private estimateBlockchainFee(transaction: Transaction): number {
    // Rough estimate: 5000 lamports per signature + compute units
    const signatureCount = transaction.signatures.length;
    const computeUnits = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
    const feePerComputeUnit = 0.000001; // 1 micro-lamport per compute unit
    
    return (signatureCount * 5000 + computeUnits * feePerComputeUnit) / LAMPORTS_PER_SOL;
  }

  /**
   * Save transaction to Firebase for history
   */
  private async saveTransactionToFirebase(transactionData: {
    userId: string;
    toAddress: string;
    amount: number;
    currency: string;
    signature: string;
    companyFee: number;
    netAmount: number;
    memo?: string;
    groupId?: string;
  }): Promise<void> {
    try {
      const { firebaseTransactionService } = await import('../services/firebaseDataService');
      
      const transaction = {
        id: transactionData.signature,
        type: 'send' as const,
        amount: transactionData.amount,
        currency: transactionData.currency,
        from_user: transactionData.userId,
        to_user: transactionData.toAddress,
        from_wallet: '', // Will be filled by the service
        to_wallet: transactionData.toAddress,
        tx_hash: transactionData.signature,
        note: transactionData.memo || `Payment to ${transactionData.toAddress}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'completed' as const,
        group_id: transactionData.groupId || null,
        company_fee: transactionData.companyFee,
        net_amount: transactionData.netAmount
      };

      await firebaseTransactionService.createTransaction(transaction);
      logger.info('Transaction saved to Firebase', { signature: transactionData.signature }, 'InternalTransferService');
    } catch (error) {
      logger.error('Failed to save transaction to Firebase', error, 'InternalTransferService');
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations?: number;
    error?: string;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (!status.value) {
        return { status: 'pending' };
      }

      if (status.value.err) {
        return { 
          status: 'failed', 
          error: status.value.err.toString() 
        };
      }

      const confirmations = status.value.confirmations || 0;
      if (confirmations >= 32) {
        return { status: 'finalized', confirmations };
      } else if (confirmations > 0) {
        return { status: 'confirmed', confirmations };
      } else {
        return { status: 'pending' };
      }
    } catch (error) {
      logger.error('Failed to get transaction status', error, 'InternalTransferService');
      return { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const internalTransferService = new InternalTransferService();
