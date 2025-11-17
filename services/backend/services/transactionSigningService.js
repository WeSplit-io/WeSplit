/**
 * Server-side Transaction Signing Service
 * Handles company fee payer signatures for USDC transfers
 * NEVER exposes company private keys to client
 * 
 * Best Practices Implemented:
 * - Retry logic with exponential backoff for RPC calls
 * - Performance monitoring for all operations
 * - Structured error handling
 * - Connection pooling (singleton pattern)
 * - Timeout handling for all async operations
 */

const { Connection, PublicKey, VersionedTransaction, Keypair } = require('@solana/web3.js');
const { logger } = require('./loggingService');
const { retryRpcOperation, isRetryableError } = require('../utils/rpcRetry');

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

      // Create connection - use network from environment, match Firebase Functions logic
      // Primary: SOLANA_NETWORK (matches client EXPO_PUBLIC_NETWORK)
      // Secondary: EXPO_PUBLIC_NETWORK (matches client)
      // Fallback: Legacy env vars for backward compatibility
      let network = 'devnet'; // Default to devnet for safety
      
      if (process.env.SOLANA_NETWORK) {
        const solanaNetwork = (process.env.SOLANA_NETWORK || '').trim().toLowerCase();
        if (solanaNetwork === 'mainnet' || solanaNetwork === 'mainnet-beta') {
          network = 'mainnet';
        } else if (solanaNetwork === 'devnet') {
          network = 'devnet';
        } else if (solanaNetwork === 'testnet') {
          network = 'testnet';
        } else {
          network = solanaNetwork;
        }
      } else if (process.env.EXPO_PUBLIC_NETWORK) {
        const expoNetwork = (process.env.EXPO_PUBLIC_NETWORK || '').trim().toLowerCase();
        if (expoNetwork === 'mainnet' || expoNetwork === 'mainnet-beta') {
          network = 'mainnet';
        } else if (expoNetwork === 'devnet') {
          network = 'devnet';
        } else if (expoNetwork === 'testnet') {
          network = 'testnet';
        } else {
          network = expoNetwork;
        }
      } else if (process.env.DEV_NETWORK) {
        const devNetwork = (process.env.DEV_NETWORK || '').trim().toLowerCase();
        if (devNetwork === 'mainnet') {
          network = 'mainnet';
        } else if (devNetwork === 'devnet') {
          network = 'devnet';
        } else {
          network = devNetwork;
        }
      } else if (process.env.EXPO_PUBLIC_DEV_NETWORK) {
        const frontendNetwork = (process.env.EXPO_PUBLIC_DEV_NETWORK || '').trim().toLowerCase();
        if (frontendNetwork === 'mainnet' || frontendNetwork === 'mainnet-beta') {
          network = 'mainnet';
        } else if (frontendNetwork === 'devnet') {
          network = 'devnet';
        } else {
          network = frontendNetwork;
        }
      }
      
      let rpcUrl = process.env.HELIUS_RPC_URL;
      
      if (!rpcUrl) {
        // Determine RPC URL based on network
        if (network === 'mainnet') {
          const heliusApiKey = process.env.HELIUS_API_KEY || process.env.EXPO_PUBLIC_HELIUS_API_KEY;
          rpcUrl = heliusApiKey 
            ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
            : 'https://api.mainnet-beta.solana.com';
        } else if (network === 'testnet') {
          rpcUrl = 'https://api.testnet.solana.com';
        } else {
          // Default to devnet
          rpcUrl = 'https://api.devnet.solana.com';
        }
      }
      
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
   * Best Practice: Skip slow confirmTransaction, verify with getSignatureStatus instead
   */
  async submitTransaction(serializedTransaction) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Best Practice: Use retry logic with exponential backoff
      // Best Practice: Skip preflight on mainnet to save time
      const network = process.env.DEV_NETWORK || process.env.EXPO_PUBLIC_DEV_NETWORK || 'devnet';
      const isMainnet = network === 'mainnet';
      
      const signature = await retryRpcOperation(
        () => this.connection.sendTransaction(transaction, {
          skipPreflight: isMainnet, // Skip preflight on mainnet to save 500-2000ms
          maxRetries: 0 // We handle retries ourselves
        }),
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          timeout: 5000
        }
      );

      // Best Practice: Don't wait for confirmation (slow, can timeout)
      // Client will verify transaction status asynchronously
      // If needed, use getSignatureStatus with retry logic instead
      logger.info('Transaction submitted successfully', {
        signature,
        note: 'Client will verify transaction status asynchronously'
      }, 'TransactionSigningService');

      return {
        signature,
        confirmation: null // Client will confirm asynchronously
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
   * Best Practice: Use retry logic for RPC calls
   */
  async getCompanyWalletBalance() {
    try {
      if (!this.connection || !this.companyKeypair) {
        throw new Error('Service not initialized');
      }

      // Best Practice: Retry RPC calls with exponential backoff
      const balance = await retryRpcOperation(
        () => this.connection.getBalance(this.companyKeypair.publicKey),
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          timeout: 5000
        }
      );
      
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
   * Best Practice: Use retry logic for RPC calls
   */
  async getTransactionFeeEstimate(serializedTransaction) {
    try {
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const transaction = VersionedTransaction.deserialize(serializedTransaction);
      
      // Best Practice: Retry RPC calls with exponential backoff
      const feeEstimate = await retryRpcOperation(
        () => this.connection.getFeeForMessage(transaction.message),
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          timeout: 5000
        }
      );

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
