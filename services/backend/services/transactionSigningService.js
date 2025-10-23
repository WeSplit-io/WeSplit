/**
 * Server-side Transaction Signing Service
 * Handles company fee payer signatures for USDC transfers
 * NEVER exposes company private keys to client
 */

const { Connection, PublicKey, VersionedTransaction, Keypair } = require('@solana/web3.js');
const { logger } = require('./loggingService');

class TransactionSigningService {
  constructor() {
    this.connection = null;
    this.companyKeypair = null;
    this.initialize();
  }

  /**
   * Initialize the service with company wallet
   */
  initialize() {
    try {
      // Get company wallet configuration
      const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS;
      const companyWalletSecretKey = process.env.COMPANY_WALLET_SECRET_KEY;

      if (!companyWalletAddress || !companyWalletSecretKey) {
        throw new Error('Company wallet configuration missing');
      }

      // Create company keypair from secret key
      const secretKeyArray = JSON.parse(companyWalletSecretKey);
      this.companyKeypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));

      // Verify the public key matches
      if (this.companyKeypair.publicKey.toBase58() !== companyWalletAddress) {
        throw new Error('Company wallet public key mismatch');
      }

      // Create connection
      const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
      this.connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000,
      });

      logger.info('Transaction signing service initialized', {
        companyAddress: companyWalletAddress,
        rpcUrl: rpcUrl.replace(process.env.HELIUS_API_KEY || '', '[API_KEY]')
      }, 'TransactionSigningService');

    } catch (error) {
      logger.error('Failed to initialize transaction signing service', error, 'TransactionSigningService');
      throw error;
    }
  }

  /**
   * Add company signature to a partially signed transaction
   */
  async addCompanySignature(serializedTransaction) {
    try {
      if (!this.companyKeypair) {
        throw new Error('Company keypair not initialized');
      }

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Add company signature
      transaction.sign([this.companyKeypair]);

      // Serialize the fully signed transaction
      const fullySignedTransaction = transaction.serialize();

      logger.info('Company signature added to transaction', {
        transactionSize: fullySignedTransaction.length,
        companyAddress: this.companyKeypair.publicKey.toBase58()
      }, 'TransactionSigningService');

      return fullySignedTransaction;

    } catch (error) {
      logger.error('Failed to add company signature', error, 'TransactionSigningService');
      throw new Error(`Failed to add company signature: ${error.message}`);
    }
  }

  /**
   * Submit a fully signed transaction
   */
  async submitTransaction(serializedTransaction) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Submit the transaction
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info('Transaction submitted and confirmed', {
        signature,
        confirmation: confirmation.value
      }, 'TransactionSigningService');

      return {
        signature,
        confirmation: confirmation.value
      };

    } catch (error) {
      logger.error('Failed to submit transaction', error, 'TransactionSigningService');
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Process a USDC transfer with company fee payer
   */
  async processUsdcTransfer(serializedTransaction) {
    try {
      // Add company signature
      const fullySignedTransaction = await this.addCompanySignature(serializedTransaction);

      // Submit the transaction
      const result = await this.submitTransaction(fullySignedTransaction);

      logger.info('USDC transfer processed successfully', {
        signature: result.signature,
        companyAddress: this.companyKeypair.publicKey.toBase58()
      }, 'TransactionSigningService');

      return result;

    } catch (error) {
      logger.error('Failed to process USDC transfer', error, 'TransactionSigningService');
      throw error;
    }
  }

  /**
   * Get company wallet balance
   */
  async getCompanyWalletBalance() {
    try {
      if (!this.connection || !this.companyKeypair) {
        throw new Error('Service not initialized');
      }

      const balance = await this.connection.getBalance(this.companyKeypair.publicKey);
      const solBalance = balance / 1000000000; // Convert lamports to SOL

      logger.info('Company wallet balance retrieved', {
        address: this.companyKeypair.publicKey.toBase58(),
        balance: solBalance
      }, 'TransactionSigningService');

      return {
        address: this.companyKeypair.publicKey.toBase58(),
        balance: solBalance,
        lamports: balance
      };

    } catch (error) {
      logger.error('Failed to get company wallet balance', error, 'TransactionSigningService');
      throw error;
    }
  }

  /**
   * Validate transaction before signing
   */
  async validateTransaction(serializedTransaction) {
    try {
      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Check if transaction is properly structured
      if (!transaction.message) {
        throw new Error('Invalid transaction: missing message');
      }

      // Check if fee payer is set to company wallet
      const feePayer = transaction.message.staticAccountKeys[transaction.message.header.numRequiredSignatures - 1];
      if (feePayer.toBase58() !== this.companyKeypair.publicKey.toBase58()) {
        throw new Error('Transaction fee payer is not company wallet');
      }

      // Check if transaction has required signatures
      const requiredSignatures = transaction.message.header.numRequiredSignatures;
      if (transaction.signatures.length < requiredSignatures - 1) {
        throw new Error('Transaction missing required user signatures');
      }

      logger.info('Transaction validation passed', {
        feePayer: feePayer.toBase58(),
        requiredSignatures,
        currentSignatures: transaction.signatures.length
      }, 'TransactionSigningService');

      return true;

    } catch (error) {
      logger.error('Transaction validation failed', error, 'TransactionSigningService');
      throw error;
    }
  }

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(serializedTransaction) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const transaction = VersionedTransaction.deserialize(serializedTransaction);
      const feeEstimate = await this.connection.getFeeForMessage(transaction.message);

      if (feeEstimate.value === null) {
        throw new Error('Unable to estimate transaction fee');
      }

      const feeInSol = feeEstimate.value / 1000000000; // Convert lamports to SOL

      logger.info('Transaction fee estimated', {
        fee: feeInSol,
        lamports: feeEstimate.value
      }, 'TransactionSigningService');

      return {
        fee: feeInSol,
        lamports: feeEstimate.value
      };

    } catch (error) {
      logger.error('Failed to estimate transaction fee', error, 'TransactionSigningService');
      throw error;
    }
  }
}

// Create singleton instance
const transactionSigningService = new TransactionSigningService();

module.exports = {
  TransactionSigningService,
  transactionSigningService
};
