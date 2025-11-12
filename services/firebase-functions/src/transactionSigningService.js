/**
 * Server-side Transaction Signing Service for Firebase Functions
 * Handles company fee payer signatures for USDC transfers
 * NEVER exposes company private keys to client
 */

const { Connection, PublicKey, VersionedTransaction, Keypair } = require('@solana/web3.js');

class TransactionSigningService {
  constructor() {
    this.connection = null;
    this.companyKeypair = null;
    this.initialized = false;
    // Initialize asynchronously - will be called when first function is invoked
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      try {
        await this.initialize();
        this.initialized = true;
        console.log('Transaction signing service initialized successfully', {
          hasConnection: !!this.connection,
          hasKeypair: !!this.companyKeypair,
          connectionType: this.connection?.constructor?.name
        });
      } catch (error) {
        console.error('Failed to initialize transaction signing service:', {
          error: error.message,
          errorStack: error.stack,
          hasConnection: !!this.connection,
          hasKeypair: !!this.companyKeypair
        });
        // Don't set initialized to true if initialization failed
        throw new Error(`Failed to initialize transaction signing service: ${error.message}`);
      }
    }
    
    // Double-check that connection exists after initialization
    if (!this.connection) {
      console.error('Connection is null after initialization', {
        initialized: this.initialized,
        hasKeypair: !!this.companyKeypair
      });
      throw new Error('Connection not initialized - initialization may have failed silently');
    }
  }

  /**
   * Initialize the service with company wallet
   * Uses Firebase Secrets (not deprecated config)
   */
  async initialize() {
    try {
      // Get company wallet configuration from Firebase Secrets
      // Firebase Secrets are automatically available as process.env variables when deployed
      const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS?.trim();
      const companyWalletSecretKey = process.env.COMPANY_WALLET_SECRET_KEY?.trim();
      
      console.log('Initializing transaction signing service', {
        hasAddress: !!companyWalletAddress,
        addressLength: companyWalletAddress?.length,
        addressPreview: companyWalletAddress ? companyWalletAddress.substring(0, 8) + '...' : 'missing',
        hasSecretKey: !!companyWalletSecretKey,
        secretKeyLength: companyWalletSecretKey?.length,
        // SECURITY: Never log secret key previews - even partial keys can be security risk
      });
      
      if (!companyWalletAddress || !companyWalletSecretKey) {
        throw new Error(
          'Company wallet configuration missing. ' +
          'Set COMPANY_WALLET_ADDRESS and COMPANY_WALLET_SECRET_KEY as Firebase Secrets. ' +
          'Use: firebase functions:secrets:set COMPANY_WALLET_ADDRESS'
        );
      }

      // Create company keypair from secret key
      let secretKeyArray;
      try {
        // Parse JSON array, handling potential whitespace
        secretKeyArray = JSON.parse(companyWalletSecretKey);
      } catch (parseError) {
        console.error('Failed to parse secret key as JSON', {
          error: parseError.message
          // SECURITY: Never log secret key previews - even partial keys can be security risk
        });
        throw new Error(`Invalid secret key format: ${parseError.message}`);
      }
      
      if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
        throw new Error(`Invalid secret key: expected array of 64 numbers, got ${Array.isArray(secretKeyArray) ? secretKeyArray.length : typeof secretKeyArray}`);
      }
      
      this.companyKeypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));
      const derivedAddress = this.companyKeypair.publicKey.toBase58();
      
      console.log('Company keypair created', {
        expectedAddress: companyWalletAddress,
        derivedAddress: derivedAddress,
        addressesMatch: derivedAddress === companyWalletAddress
      });

      // Verify the public key matches
      if (derivedAddress !== companyWalletAddress) {
        console.error('Company wallet public key mismatch', {
          expected: companyWalletAddress,
          derived: derivedAddress,
          expectedLength: companyWalletAddress.length,
          derivedLength: derivedAddress.length
        });
        throw new Error(`Company wallet public key mismatch. Expected: ${companyWalletAddress}, Derived: ${derivedAddress}`);
      }

      // Create connection - use network from environment, default to devnet for development
      const network = process.env.DEV_NETWORK || process.env.EXPO_PUBLIC_DEV_NETWORK || 'devnet';
      let rpcUrl = process.env.HELIUS_RPC_URL;
      const heliusApiKey = process.env.HELIUS_API_KEY || process.env.EXPO_PUBLIC_HELIUS_API_KEY;
      
      if (!rpcUrl) {
        // Determine RPC URL based on network
        if (network === 'mainnet') {
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

      const heliusApiKeyForLogging = process.env.HELIUS_API_KEY || process.env.EXPO_PUBLIC_HELIUS_API_KEY || '';
      console.log('Transaction signing service initialized', {
        companyAddress: companyWalletAddress,
        rpcUrl: rpcUrl ? rpcUrl.replace(heliusApiKeyForLogging, '[API_KEY]') : 'default'
      });

    } catch (error) {
      console.error('Failed to initialize transaction signing service:', error);
      throw error;
    }
  }

  /**
   * Add company signature to a partially signed transaction
   */
  async addCompanySignature(serializedTransaction) {
    try {
      await this.ensureInitialized();
      
      if (!this.companyKeypair) {
        throw new Error('Company keypair not initialized');
      }

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Add company signature
      transaction.sign([this.companyKeypair]);

      // Serialize the fully signed transaction
      const fullySignedTransaction = transaction.serialize();

      console.log('Company signature added to transaction', {
        transactionSize: fullySignedTransaction.length,
        companyAddress: this.companyKeypair.publicKey.toBase58()
      });

      return fullySignedTransaction;

    } catch (error) {
      console.error('Failed to add company signature:', error);
      throw new Error(`Failed to add company signature: ${error.message}`);
    }
  }

  /**
   * Submit a fully signed transaction
   */
  async submitTransaction(serializedTransaction) {
    try {
      // Ensure service is initialized (connection, keypair, etc.)
      await this.ensureInitialized();
      
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Validate buffer before deserialization
      if (!serializedTransaction || !Buffer.isBuffer(serializedTransaction)) {
        console.error('Invalid transaction buffer', {
          isBuffer: Buffer.isBuffer(serializedTransaction),
          type: typeof serializedTransaction,
          length: serializedTransaction?.length,
          constructor: serializedTransaction?.constructor?.name
        });
        throw new Error('Invalid transaction buffer format');
      }

      console.log('Deserializing transaction for submission', {
        bufferLength: serializedTransaction.length,
        bufferType: serializedTransaction.constructor.name,
        firstBytes: Array.from(serializedTransaction.slice(0, 10))
      });

      // Deserialize the transaction
      let transaction;
      try {
        transaction = VersionedTransaction.deserialize(serializedTransaction);
      } catch (deserializeError) {
        console.error('Failed to deserialize transaction', {
          error: deserializeError.message,
          bufferLength: serializedTransaction.length,
          firstBytes: Array.from(serializedTransaction.slice(0, 20)),
          lastBytes: Array.from(serializedTransaction.slice(-20))
        });
        throw new Error(`Failed to deserialize transaction: ${deserializeError.message}`);
      }

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

      console.log('Transaction submitted and confirmed', {
        signature,
        confirmation: confirmation.value
      });

      return {
        signature,
        confirmation: confirmation.value
      };

    } catch (error) {
      console.error('Failed to submit transaction:', error);
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

      console.log('USDC transfer processed successfully', {
        signature: result.signature,
        companyAddress: this.companyKeypair.publicKey.toBase58()
      });

      return result;

    } catch (error) {
      console.error('Failed to process USDC transfer:', error);
      throw error;
    }
  }

  /**
   * Get company wallet balance
   */
  async getCompanyWalletBalance() {
    try {
      await this.ensureInitialized();
      
      if (!this.connection || !this.companyKeypair) {
        throw new Error('Service not initialized');
      }

      const balance = await this.connection.getBalance(this.companyKeypair.publicKey);
      const solBalance = balance / 1000000000; // Convert lamports to SOL

      console.log('Company wallet balance retrieved', {
        address: this.companyKeypair.publicKey.toBase58(),
        balance: solBalance
      });

      return {
        address: this.companyKeypair.publicKey.toBase58(),
        balance: solBalance,
        lamports: balance
      };

    } catch (error) {
      console.error('Failed to get company wallet balance:', error);
      throw error;
    }
  }

  /**
   * Validate transaction before signing
   */
  async validateTransaction(serializedTransaction) {
    try {
      // Ensure service is initialized before accessing companyKeypair
      await this.ensureInitialized();
      
      if (!this.companyKeypair) {
        throw new Error('Company keypair not initialized');
      }

      const transaction = VersionedTransaction.deserialize(serializedTransaction);

      // Check if transaction is properly structured
      if (!transaction.message) {
        throw new Error('Invalid transaction: missing message');
      }

      // Check if fee payer is set to company wallet
      // In Solana, the fee payer is typically the first account in staticAccountKeys (index 0)
      // However, we'll check all staticAccountKeys to find the company wallet
      const staticAccountKeys = transaction.message.staticAccountKeys;
      const companyWalletAddress = this.companyKeypair.publicKey.toBase58();
      
      // Log all static account keys for debugging
      console.log('Transaction validation - checking fee payer', {
        companyWalletAddress,
        staticAccountKeysCount: staticAccountKeys.length,
        staticAccountKeys: staticAccountKeys.map(key => key.toBase58()),
        numRequiredSignatures: transaction.message.header.numRequiredSignatures,
        currentSignatures: transaction.signatures.length
      });
      
      // Check if company wallet is in staticAccountKeys
      // Fee payer should be at index 0, but we'll check all required signers
      const feePayer = staticAccountKeys[0];
      if (!feePayer) {
        throw new Error('Invalid transaction: missing fee payer');
      }
      
      // Check if company wallet appears in the first numRequiredSignatures accounts (required signers)
      const requiredSignatures = transaction.message.header.numRequiredSignatures;
      const requiredSignerAccounts = staticAccountKeys.slice(0, requiredSignatures);
      const companyWalletInRequiredSigners = requiredSignerAccounts.some(key => key.toBase58() === companyWalletAddress);
      
      // Fee payer should be at index 0 (first account)
      if (feePayer.toBase58() !== companyWalletAddress) {
        // If company wallet is in required signers but not at index 0, log a warning
        if (companyWalletInRequiredSigners) {
          const companyWalletIndex = requiredSignerAccounts.findIndex(key => key.toBase58() === companyWalletAddress);
          console.warn('Company wallet found in required signers but not at index 0', {
            feePayerAt0: feePayer.toBase58(),
            companyWalletAddress,
            companyWalletIndex,
            requiredSignerAccounts: requiredSignerAccounts.map(key => key.toBase58()),
            staticAccountKeys: staticAccountKeys.map(key => key.toBase58())
          });
        }
        throw new Error(`Transaction fee payer is not company wallet. Expected: ${companyWalletAddress}, Got: ${feePayer.toBase58()}`);
      }

      // Check if transaction has required signatures
      const currentSignatures = transaction.signatures.length;
      
      if (currentSignatures < requiredSignatures - 1) {
        throw new Error(`Transaction missing required user signatures. Required: ${requiredSignatures - 1}, Got: ${currentSignatures}`);
      }

      console.log('Transaction validation passed', {
        feePayer: feePayer.toBase58(),
        companyWalletAddress,
        requiredSignatures,
        currentSignatures,
        staticAccountKeysCount: staticAccountKeys.length
      });

      return true;

    } catch (error) {
      console.error('Transaction validation failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(serializedTransaction) {
    try {
      // Ensure service is initialized (connection, keypair, etc.)
      await this.ensureInitialized();
      
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      const transaction = VersionedTransaction.deserialize(serializedTransaction);
      const feeEstimate = await this.connection.getFeeForMessage(transaction.message);

      if (feeEstimate.value === null) {
        throw new Error('Unable to estimate transaction fee');
      }

      const feeInSol = feeEstimate.value / 1000000000; // Convert lamports to SOL

      console.log('Transaction fee estimated', {
        fee: feeInSol,
        lamports: feeEstimate.value
      });

      return {
        fee: feeInSol,
        lamports: feeEstimate.value
      };

    } catch (error) {
      console.error('Failed to estimate transaction fee:', error);
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

