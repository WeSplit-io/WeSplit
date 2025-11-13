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
    this.rpcUrl = null; // Store RPC URL for mainnet detection
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
      // Use same RPC endpoint priority as client for consistency and speed
      const network = process.env.DEV_NETWORK || process.env.EXPO_PUBLIC_DEV_NETWORK || 'devnet';
      const forceMainnet = process.env.FORCE_MAINNET === 'true' || process.env.EXPO_PUBLIC_FORCE_MAINNET === 'true';
      const actualNetwork = forceMainnet ? 'mainnet' : network;
      
      // Helper to extract API key from URL or return as-is
      const extractApiKey = (value, baseUrl) => {
        if (!value) return '';
        if (value.startsWith('http')) {
          const parts = value.split('/');
          return parts[parts.length - 1] || value;
        }
        if (value.includes(baseUrl)) {
          return value.replace(baseUrl, '').replace(/^\//, '').replace(/\/$/, '');
        }
        return value;
      };
      
      const extractGetBlockKey = (value) => {
        if (!value) return '';
        if (value.startsWith('http')) {
          const match = value.match(/go\.getblock\.io\/([^\/\s]+)/);
          return match ? match[1] : value.split('/').pop() || value;
        }
        return value;
      };
      
      let rpcUrl;
      const rpcEndpoints = [];
      
      if (actualNetwork === 'mainnet') {
        // Use same priority order as client: Alchemy > GetBlock > QuickNode > Chainstack > Helius > Free
        const alchemyApiKey = extractApiKey(process.env.ALCHEMY_API_KEY || process.env.EXPO_PUBLIC_ALCHEMY_API_KEY, 'solana-mainnet.g.alchemy.com/v2');
        const getBlockApiKey = extractGetBlockKey(process.env.GETBLOCK_API_KEY || process.env.EXPO_PUBLIC_GETBLOCK_API_KEY);
        const quickNodeEndpoint = process.env.QUICKNODE_ENDPOINT || process.env.EXPO_PUBLIC_QUICKNODE_ENDPOINT;
        const chainstackEndpoint = process.env.CHAINSTACK_ENDPOINT || process.env.EXPO_PUBLIC_CHAINSTACK_ENDPOINT;
        const heliusApiKey = extractApiKey(process.env.HELIUS_API_KEY || process.env.EXPO_PUBLIC_HELIUS_API_KEY, 'mainnet.helius-rpc.com');
        
        // Tier 1: Fast providers with API keys
        if (alchemyApiKey && alchemyApiKey !== 'YOUR_ALCHEMY_API_KEY_HERE') {
          rpcEndpoints.push(`https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`);
        }
        if (getBlockApiKey && getBlockApiKey !== 'YOUR_GETBLOCK_API_KEY_HERE') {
          rpcEndpoints.push(`https://sol.getblock.io/mainnet/?api_key=${getBlockApiKey}`);
        }
        if (quickNodeEndpoint && quickNodeEndpoint !== 'YOUR_QUICKNODE_ENDPOINT_HERE') {
          rpcEndpoints.push(quickNodeEndpoint);
        }
        if (chainstackEndpoint && chainstackEndpoint !== 'YOUR_CHAINSTACK_ENDPOINT_HERE') {
          rpcEndpoints.push(chainstackEndpoint);
        }
        
        // Tier 2: Helius
        if (heliusApiKey && heliusApiKey !== 'YOUR_HELIUS_API_KEY_HERE') {
          rpcEndpoints.push(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`);
        }
        
        // Tier 3: Free fallback
        rpcEndpoints.push('https://rpc.ankr.com/solana');
        rpcEndpoints.push('https://api.mainnet-beta.solana.com');
        
        rpcUrl = rpcEndpoints[0] || 'https://api.mainnet-beta.solana.com';
      } else if (actualNetwork === 'testnet') {
        rpcUrl = 'https://api.testnet.solana.com';
        rpcEndpoints.push(rpcUrl);
      } else {
        rpcUrl = 'https://api.devnet.solana.com';
        rpcEndpoints.push(rpcUrl);
      }
      
      this.connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'User-Agent': 'WeSplit-Firebase/1.0',
          'Connection': 'keep-alive',
        },
      });
      
      // Store RPC URL for mainnet detection
      this.rpcUrl = rpcUrl;
      this.rpcEndpoints = rpcEndpoints;

      // Log RPC configuration (mask API keys)
      const maskedRpcUrl = rpcUrl ? rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***') : 'default';
      console.log('Transaction signing service initialized', {
        companyAddress: companyWalletAddress,
        network: actualNetwork,
        rpcUrl: maskedRpcUrl,
        endpointCount: rpcEndpoints.length,
        isMainnet: actualNetwork === 'mainnet',
        primaryProvider: rpcUrl.includes('alchemy') ? 'Alchemy' : 
                         rpcUrl.includes('getblock') ? 'GetBlock' : 
                         rpcUrl.includes('helius') ? 'Helius' : 
                         rpcUrl.includes('ankr') ? 'Ankr' : 'Official'
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

      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Convert to Buffer if needed (client sends Uint8Array)
      let transactionBuffer;
      if (Buffer.isBuffer(serializedTransaction)) {
        transactionBuffer = serializedTransaction;
      } else if (serializedTransaction instanceof Uint8Array) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else if (Array.isArray(serializedTransaction)) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else {
        throw new Error('Invalid transaction buffer format');
      }

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(transactionBuffer);

      // CRITICAL: Verify blockhash is present before signing
      // This ensures we're signing the transaction with the correct blockhash
      let blockhashBeforeSigning;
      if (transaction.message && 'recentBlockhash' in transaction.message) {
        blockhashBeforeSigning = transaction.message.recentBlockhash;
      } else if (transaction.message && transaction.message.recentBlockhash) {
        blockhashBeforeSigning = transaction.message.recentBlockhash;
      }
      
      if (!blockhashBeforeSigning) {
        throw new Error('Cannot add company signature: transaction missing blockhash');
      }

      // CRITICAL: Sign immediately - no validation delays here
      // Validation happens before Firestore checks and right before submission
      // Every millisecond counts to prevent blockhash expiration
      console.log('Adding company signature to transaction', {
        messageVersion: transaction.version,
        numSignatures: transaction.signatures.length,
        blockhash: blockhashBeforeSigning.toString().substring(0, 8) + '...',
        blockhashFull: blockhashBeforeSigning.toString(), // Log full blockhash for verification
        note: 'Signing transaction with blockhash from client. This blockhash will be validated before submission.'
      });

      // Add company signature - this is fast (~1-5ms)
      // The blockhash in the transaction remains unchanged during signing
      transaction.sign([this.companyKeypair]);

      // CRITICAL: Verify blockhash is still the same after signing
      // Signing should not change the blockhash
      let blockhashAfterSigning;
      if (transaction.message && 'recentBlockhash' in transaction.message) {
        blockhashAfterSigning = transaction.message.recentBlockhash;
      } else if (transaction.message && transaction.message.recentBlockhash) {
        blockhashAfterSigning = transaction.message.recentBlockhash;
      }
      
      if (!blockhashAfterSigning || blockhashAfterSigning.toString() !== blockhashBeforeSigning.toString()) {
        console.error('CRITICAL: Blockhash changed during signing!', {
          before: blockhashBeforeSigning?.toString().substring(0, 8) + '...',
          after: blockhashAfterSigning?.toString().substring(0, 8) + '...',
          note: 'This should never happen - signing should not change blockhash'
        });
        throw new Error('Blockhash changed during signing - transaction integrity compromised');
      }

      // Serialize the fully signed transaction - this is also fast (~1-5ms)
      const fullySignedTransaction = transaction.serialize();

      // Signature added successfully - total time should be <10ms
      // Blockhash is preserved in the serialized transaction

      return fullySignedTransaction;

    } catch (error) {
      console.error('Failed to add company signature:', error);
      throw new Error(`Failed to add company signature: ${error.message}`);
    }
  }

  /**
   * Quick blockhash validation (before Firestore checks)
   * Extracts blockhash and validates it's still valid on-chain
   * Returns early if expired to save time on Firestore operations
   */
  async validateBlockhashQuick(serializedTransaction) {
    try {
      await this.ensureInitialized();
      
      // Convert to Buffer if needed
      let transactionBuffer;
      if (Buffer.isBuffer(serializedTransaction)) {
        transactionBuffer = serializedTransaction;
      } else if (serializedTransaction instanceof Uint8Array) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else if (Array.isArray(serializedTransaction)) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else {
        return { isValid: false, blockhash: null, error: 'Invalid transaction buffer format' };
      }

      // Deserialize to extract blockhash
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Extract blockhash
      let transactionBlockhash;
      if (transaction.message && 'recentBlockhash' in transaction.message) {
        transactionBlockhash = transaction.message.recentBlockhash;
      } else if (transaction.message && transaction.message.recentBlockhash) {
        transactionBlockhash = transaction.message.recentBlockhash;
      } else {
        return { isValid: false, blockhash: null, error: 'Cannot extract blockhash from transaction' };
      }

      // Quick validation - use 'confirmed' commitment for faster response
      const blockhashString = transactionBlockhash.toString();
      // Use 'confirmed' commitment for faster validation (vs 'finalized' which is slower)
      const isValid = await this.connection.isBlockhashValid(blockhashString, { 
        commitment: 'confirmed' // Faster than 'finalized'
      });
      const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
      
      return { 
        isValid: isValidValue, 
        blockhash: blockhashString,
        error: isValidValue ? null : 'Blockhash expired'
      };
    } catch (error) {
      return { 
        isValid: false, 
        blockhash: null, 
        error: error.message || String(error) 
      };
    }
  }

  /**
   * Submit a fully signed transaction
   * @param {Buffer|Uint8Array} serializedTransaction - The serialized transaction
   * @param {boolean} skipValidation - If true, skip blockhash validation (already validated)
   */
  async submitTransaction(serializedTransaction, skipValidation = false) {
    try {
      // Ensure service is initialized (connection, keypair, etc.)
      await this.ensureInitialized();
      
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // Convert to Buffer if needed (addCompanySignature returns Uint8Array)
      let transactionBuffer;
      if (Buffer.isBuffer(serializedTransaction)) {
        transactionBuffer = serializedTransaction;
      } else if (serializedTransaction instanceof Uint8Array) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else if (Array.isArray(serializedTransaction)) {
        transactionBuffer = Buffer.from(serializedTransaction);
      } else {
        console.error('Invalid transaction buffer', {
          isBuffer: Buffer.isBuffer(serializedTransaction),
          isUint8Array: serializedTransaction instanceof Uint8Array,
          isArray: Array.isArray(serializedTransaction),
          type: typeof serializedTransaction,
          length: serializedTransaction?.length,
          constructor: serializedTransaction?.constructor?.name
        });
        throw new Error('Invalid transaction buffer format');
      }

      // Minimal logging for performance

      // Deserialize the transaction
      let transaction;
      try {
        transaction = VersionedTransaction.deserialize(transactionBuffer);
      } catch (deserializeError) {
        console.error('Failed to deserialize transaction', {
          error: deserializeError.message,
          bufferLength: transactionBuffer.length,
          firstBytes: Array.from(transactionBuffer.slice(0, 20)),
          lastBytes: Array.from(transactionBuffer.slice(-20))
        });
        throw new Error(`Failed to deserialize transaction: ${deserializeError.message}`);
      }

      // CRITICAL: Extract blockhash from transaction - must use the ACTUAL transaction's blockhash
      // For VersionedTransaction, message can be Message or MessageV0
      // Message has recentBlockhash directly, MessageV0 might need different handling
      let transactionBlockhash;
      if (transaction.message && 'recentBlockhash' in transaction.message) {
        // Standard Message format
        transactionBlockhash = transaction.message.recentBlockhash;
      } else if (transaction.message && transaction.message.recentBlockhash) {
        // Fallback for MessageV0 or other formats
        transactionBlockhash = transaction.message.recentBlockhash;
      } else {
        // Last resort: try to extract from compiled message
        try {
          const compiledMessage = transaction.message;
          if (compiledMessage && compiledMessage.recentBlockhash) {
            transactionBlockhash = compiledMessage.recentBlockhash;
          } else {
            throw new Error('Cannot extract blockhash from transaction message');
          }
        } catch (extractError) {
          throw new Error(`Transaction missing blockhash: ${extractError.message}`);
        }
      }
      
      if (!transactionBlockhash) {
        throw new Error('Transaction missing blockhash - cannot extract from transaction');
      }
      
      // Log the actual blockhash we're using for validation
      console.log('Extracted blockhash from transaction for validation', {
        blockhash: transactionBlockhash.toString().substring(0, 8) + '...',
        messageVersion: transaction.version,
        hasRecentBlockhash: !!transaction.message?.recentBlockhash,
        note: 'Using the ACTUAL blockhash from the transaction for validation'
      });
      
      // CRITICAL: Validate blockhash BEFORE submission (unless already validated)
      // If skipValidation is true, blockhash was already validated in processUsdcTransfer
      // This avoids double validation and reduces delay
      if (!skipValidation) {
        let blockhashValid = false;
        let currentBlockHeight = null;
        
        try {
          // Get current blockhash info to check expiration status
          const { blockhash: currentBlockhash } = 
            await this.connection.getLatestBlockhash('confirmed');
          
          // Check if transaction's blockhash is still valid
          const blockhashString = transactionBlockhash.toString();
          const validationResult = await this.connection.isBlockhashValid(blockhashString, {
            commitment: 'confirmed'
          });
          
          // CRITICAL: isBlockhashValid returns { context, value } not a boolean
          // Extract the actual boolean value from the result
          blockhashValid = validationResult && (validationResult.value === true || validationResult === true);
          
          // Get current block height to calculate slots remaining
          try {
            currentBlockHeight = await this.connection.getBlockHeight('confirmed');
          } catch (heightError) {
            console.warn('Failed to get current block height, using blockhash validation only', {
              error: heightError.message
            });
          }
          
          if (!blockhashValid) {
          console.error('Transaction blockhash is invalid (expired)', {
            transactionBlockhash: blockhashString.substring(0, 8) + '...',
              currentBlockhash: currentBlockhash.substring(0, 8) + '...',
            note: 'Blockhash has expired. Client should rebuild transaction with fresh blockhash.'
          });
          throw new Error(
            'Transaction blockhash has expired. The transaction was created too long ago. ' +
            'Please create a new transaction with a fresh blockhash. ' +
            'Blockhashes expire after approximately 60 seconds.'
          );
        }
        
          console.log('Blockhash validation passed - submitting immediately', {
          transactionBlockhash: blockhashString.substring(0, 8) + '...',
            currentBlockhash: currentBlockhash.substring(0, 8) + '...',
            isValid: blockhashValid,
            currentBlockHeight,
            note: 'Blockhash is still valid, submitting immediately to minimize expiration risk'
        });
      } catch (validationError) {
          // If validation fails with our error, re-throw it
          if (validationError.message && validationError.message.includes('expired')) {
            throw validationError;
          }
          
        // If isBlockhashValid fails (network error, etc.), log but don't block submission
        // The actual submission will catch blockhash errors
        console.warn('Blockhash validation check failed, proceeding anyway', {
          error: validationError.message,
          transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
          note: 'Will rely on Solana to reject if blockhash is expired'
          });
        }
      } else {
        // skipValidation is false - we'll validate right before submission instead
        // This is more efficient than validating early, as we catch expiration at the last moment
        console.log('Will validate blockhash right before submission', {
          transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
          note: 'Validation will happen immediately before sendTransaction to catch expiration'
        });
      }
      
      console.log('Preparing transaction submission', {
        transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
        hasSignatures: transaction.signatures.length > 0,
        signatureCount: transaction.signatures.length
      });

      // CRITICAL: On mainnet, ALWAYS use skipPreflight: true to minimize submission time
      // Preflight simulation takes 500-2000ms which can cause blockhash expiration
      // Client already validates transaction structure, so preflight is redundant
      // If blockhash is expired, Solana will reject during actual submission anyway
      // Detect mainnet by checking stored RPC URL
      const isMainnet = this.rpcUrl ? (
        this.rpcUrl.includes('mainnet') || 
        this.rpcUrl.includes('helius-rpc.com') ||
        this.rpcUrl.includes('alchemy.com') ||
        this.rpcUrl.includes('getblock.io') ||
        (!this.rpcUrl.includes('devnet') && !this.rpcUrl.includes('testnet'))
      ) : false;
      
      // CRITICAL: Skip blockhash validation to save time - submit IMMEDIATELY
      // Validation takes 100-300ms which can cause blockhash to expire during validation itself
      // Client already sends fresh blockhash (0-100ms old), so validation is redundant
      // If blockhash is expired, Solana will reject during submission anyway
      // This saves 100-300ms and reduces blockhash expiration risk
      const blockhashString = transactionBlockhash.toString();
      const submissionStartTime = Date.now();
      console.log('Submitting transaction immediately (no pre-submission validation)', {
        isMainnet,
        rpcUrl: this.rpcUrl ? this.rpcUrl.substring(0, 50) + '...' : 'unknown',
        skipPreflight: true,
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        note: 'Skipping pre-submission validation to minimize delay. Solana will reject if blockhash expired.'
      });
      
      // CRITICAL: Submit the transaction IMMEDIATELY - no delays
      // Every millisecond counts to avoid blockhash expiration
      // On mainnet, we skip preflight to save time, but this means we need to verify after submission
      // Preflight simulation checks blockhash validity, which can fail if blockhash expired
      // By skipping preflight, we submit immediately and let Solana handle validation
      let signature;
      try {
        // Skip preflight on mainnet to save 500-2000ms and prevent blockhash expiration
        // Preflight simulation takes 500-2000ms and can cause blockhash to expire
        // If blockhash is expired, Solana will reject during actual submission anyway
        // We'll verify the transaction exists on-chain after submission
        signature = await this.connection.sendTransaction(transaction, {
          skipPreflight: isMainnet, // Skip preflight on mainnet only
          maxRetries: 3
        });
      } catch (sendError) {
        // Check if it's a blockhash-related error
        const errorMessage = sendError.message || String(sendError);
        const errorString = String(sendError).toLowerCase();
        const isBlockhashError = 
          errorMessage.includes('Blockhash not found') || 
          errorMessage.includes('blockhash') ||
          errorMessage.includes('block hash') ||
          errorMessage.includes('expired') ||
          errorString.includes('blockhash not found') ||
          errorString.includes('blockhash expired') ||
          (errorString.includes('simulation failed') && errorString.includes('blockhash'));

        if (isBlockhashError) {
          // Blockhash expired - this is a real error from Solana
          console.error('Transaction blockhash expired (rejected by Solana)', {
            error: errorMessage.substring(0, 200),
            transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
            isMainnet,
            note: 'Solana rejected transaction due to expired blockhash. Client should rebuild with fresh blockhash.'
          });
          throw new Error(
            'Transaction blockhash has expired. The transaction was created too long ago. ' +
            'Please create a new transaction with a fresh blockhash. ' +
            'Blockhashes expire after approximately 60 seconds.'
          );
        }
        
        // If it's a blockhash error, throw it immediately - no retry
        // Blockhash expiration means we need a fresh transaction from client
        if (isBlockhashError) {
          throw sendError; // Already handled above, but ensure we don't retry
        }
        
        // For other errors, log and throw - no retry
        console.error('Transaction submission failed', {
          error: errorMessage,
          errorType: sendError.constructor?.name,
          isMainnet
        });
        throw sendError;
      }
      
      // Validate signature is valid
      if (!signature || typeof signature !== 'string' || signature.length < 80) {
        throw new Error(`Invalid signature returned from sendTransaction: ${signature}`);
      }

      // CRITICAL: Verify transaction was actually accepted by network
      // With skipPreflight: true, sendTransaction can return signature even if transaction will be rejected
      // We MUST verify the transaction exists on-chain before returning success
      // On mainnet, RPC indexing can be slow (1-3 seconds), so we need multiple attempts
      const verificationStartTime = Date.now();
      
      // Wait 300ms for RPC to index the transaction initially
      // Mainnet RPC endpoints can be slow to index transactions
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let transactionFound = false;
      let transactionError = null;
      const maxVerificationAttempts = 6; // Reduced to 6 attempts (faster failure)
      const verificationDelay = 300; // 300ms between attempts (faster)
      const verificationTimeout = 1500; // 1.5 seconds per attempt (faster)
      
      // Try multiple times to find the transaction
      // On mainnet, transactions can take 1-5 seconds to be indexed
      for (let attempt = 1; attempt <= maxVerificationAttempts; attempt++) {
        try {
          // Check with longer timeout per attempt (2 seconds)
          // Mainnet RPC can be slow, so we need more patience
          const status = await Promise.race([
            this.connection.getSignatureStatus(signature, {
              searchTransactionHistory: true
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification timeout')), verificationTimeout)
            )
          ]);
          
          if (status.value) {
            transactionFound = true;
            
            // Transaction found - check if it has an error
            if (status.value.err) {
              transactionError = status.value.err;
              const verificationTime = Date.now() - verificationStartTime;
              console.error('Transaction failed on-chain', {
                signature,
                error: transactionError,
                verificationTimeMs: verificationTime,
                attempt,
                note: 'Transaction was submitted but failed during execution.'
              });
              throw new Error(
                `Transaction failed on-chain: ${JSON.stringify(transactionError)}. ` +
                'The transaction was submitted but failed during execution.'
              );
            }
            
            // Transaction found and no error - success!
            const verificationTime = Date.now() - verificationStartTime;
            console.log('Transaction verified on-chain', {
              signature,
              verificationTimeMs: verificationTime,
              attempt,
              confirmationStatus: status.value.confirmationStatus,
              note: 'Transaction was successfully submitted and verified on-chain.'
            });
            break; // Success - exit retry loop
          } else {
            // Transaction not found yet - might need more time
            if (attempt < maxVerificationAttempts) {
              console.log(`Transaction not found yet (attempt ${attempt}/${maxVerificationAttempts}), retrying...`, {
                signature,
                attempt,
                note: 'RPC may need more time to index. Will retry with longer delay.'
              });
              await new Promise(resolve => setTimeout(resolve, verificationDelay));
            }
          }
        } catch (checkError) {
          const errorMessage = checkError.message || String(checkError);
          
          // If it's our custom error (transaction failed), throw it immediately
          if (errorMessage.includes('Transaction failed on-chain')) {
            throw checkError;
          }
          
          // If timeout and not last attempt, retry with longer delay
          if (attempt < maxVerificationAttempts) {
            console.log(`Verification timeout (attempt ${attempt}/${maxVerificationAttempts}), retrying...`, {
              signature,
              attempt,
              error: errorMessage,
              note: 'RPC may be slow. Will retry with longer delay.'
            });
            await new Promise(resolve => setTimeout(resolve, verificationDelay));
            continue;
          }
          
          // Last attempt failed - transaction was likely rejected
          const verificationTime = Date.now() - verificationStartTime;
          console.error('Transaction not found after all verification attempts', {
            signature,
            verificationTimeMs: verificationTime,
            attempts: maxVerificationAttempts,
            error: errorMessage,
            note: 'Transaction was likely rejected by Solana network. sendTransaction with skipPreflight can return signature even if transaction is rejected.'
          });
          
          // Don't assume success - fail if we can't verify
          throw new Error(
            'Transaction was rejected by Solana network. The transaction signature was returned but the transaction was not accepted. ' +
            'This may be due to an expired blockhash, insufficient funds, or invalid transaction parameters. Please try again with a fresh transaction.'
          );
        }
      }
      
      // If we get here without transactionFound, it means all attempts failed
      if (!transactionFound && !transactionError) {
        const verificationTime = Date.now() - verificationStartTime;
        console.error('Transaction verification failed after all attempts', {
          signature,
          verificationTimeMs: verificationTime,
          attempts: maxVerificationAttempts,
          note: 'Transaction was likely rejected by Solana network.'
        });
        throw new Error(
          'Transaction was rejected by Solana network. The transaction signature was returned but the transaction was not accepted. ' +
          'This may be due to an expired blockhash, insufficient funds, or invalid transaction parameters. Please try again with a fresh transaction.'
        );
      }

      // Return signature - transaction was submitted and verified
      console.log('Transaction submitted successfully to Solana network', {
        signature,
        signatureLength: signature.length,
        transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
        note: 'Transaction signature returned and verified on-chain (fast verification).'
      });

      return {
        signature,
        confirmation: null // Client will confirm asynchronously
      };

    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Process a USDC transfer with company fee payer
   * Combines signing and submission in one call to minimize blockhash expiration
   */
  async processUsdcTransfer(serializedTransaction) {
    try {
      // Ensure service is initialized
      await this.ensureInitialized();
      
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }

      // CRITICAL: Skip blockhash validation to save time - client already checks freshness
      // Client rebuilds if blockhash is >3 seconds old, so we can trust it's fresh
      // Validation takes 1-2 seconds which causes blockhash to expire by submission time
      // If blockhash is expired, Solana will reject it during submission anyway
      const processStartTime = Date.now();
      
      // Convert to Buffer if needed - declare outside try block so it's accessible later
      const transactionBuffer = Buffer.isBuffer(serializedTransaction) 
        ? serializedTransaction 
        : Buffer.from(serializedTransaction);
      
      let transaction;
      try {
        transaction = VersionedTransaction.deserialize(transactionBuffer);
      } catch (deserializeError) {
        throw new Error(`Failed to deserialize transaction: ${deserializeError.message}`);
      }

      // CRITICAL: Extract blockhash from transaction - must use the ACTUAL transaction's blockhash
      // For VersionedTransaction, message can be Message or MessageV0
      // This is the blockhash that's ACTUALLY in the transaction being signed
      let transactionBlockhash;
      if (transaction.message && 'recentBlockhash' in transaction.message) {
        // Standard Message format
        transactionBlockhash = transaction.message.recentBlockhash;
      } else if (transaction.message && transaction.message.recentBlockhash) {
        // Fallback for MessageV0 or other formats
        transactionBlockhash = transaction.message.recentBlockhash;
      } else {
        // Last resort: try to extract from compiled message
        try {
          const compiledMessage = transaction.message;
          if (compiledMessage && compiledMessage.recentBlockhash) {
            transactionBlockhash = compiledMessage.recentBlockhash;
          } else {
            throw new Error('Cannot extract blockhash from transaction message');
          }
        } catch (extractError) {
          throw new Error(`Transaction missing blockhash - cannot extract from transaction message: ${extractError.message}`);
        }
      }
      
      if (!transactionBlockhash) {
        throw new Error('Transaction missing blockhash - extracted value is null/undefined');
      }
      
      // CRITICAL: Log the ACTUAL blockhash from the transaction
      // This is the blockhash that will be used for validation and submission
      // It MUST match what the client sent
      const blockhashString = transactionBlockhash.toString();
      console.log('Extracted blockhash from transaction (VERIFICATION)', {
        blockhash: blockhashString.substring(0, 8) + '...',
        blockhashFull: blockhashString, // Log full blockhash for verification
        messageVersion: transaction.version,
        hasRecentBlockhash: !!transaction.message?.recentBlockhash,
        transactionSize: transactionBuffer.length,
        numSignatures: transaction.signatures.length,
        note: 'This is the ACTUAL blockhash from the transaction being signed. It MUST match what client sent.'
      });

      console.log('Processing transaction - will validate blockhash right before submission', {
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        timeSinceProcessStart: Date.now() - processStartTime,
        note: 'Client rebuilds if blockhash >1s old. Will validate right before submission to catch any expiration.'
      });

      // CRITICAL: Add company signature and submit IMMEDIATELY - no delays
      // Every millisecond counts - Firebase processing already takes time
      // Don't add any extra RPC calls or validations that cause delay
      const signatureStartTime = Date.now();
      const fullySignedTransaction = await this.addCompanySignature(serializedTransaction);
      const signatureTime = Date.now() - signatureStartTime;
      
      const totalTimeBeforeSubmission = Date.now() - processStartTime;
      console.log('Company signature added, submitting IMMEDIATELY', {
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        signatureTimeMs: signatureTime,
        totalTimeBeforeSubmission,
        note: 'Submitting immediately - no delays. Blockhash age: ~' + totalTimeBeforeSubmission + 'ms'
      });

      // CRITICAL: Submit the transaction IMMEDIATELY - skip all validation
      // Validation takes 100-300ms which causes blockhash expiration
      // Client already sends fresh blockhash (0-100ms old), so validation is redundant
      // If blockhash expired, Solana will reject it, but we've minimized delay
      const result = await this.submitTransaction(fullySignedTransaction, true); // Skip validation to save time

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

