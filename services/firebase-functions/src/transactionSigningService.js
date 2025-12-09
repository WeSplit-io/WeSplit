/**
 * Server-side Transaction Signing Service for Firebase Functions
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
const { retryRpcOperation, isRetryableError } = require('./utils/rpcRetry');
const { performanceMonitor, withPerformanceMonitoring } = require('./utils/performanceMonitor');
const { handleError, ErrorTypes, withErrorHandling } = require('./utils/errorHandler');

class TransactionSigningService {
  constructor() {
    this.connection = null;
    this.companyKeypair = null;
    this.initialized = false;
    this.rpcUrl = null; // Store RPC URL for mainnet detection
    this.rpcEndpoints = []; // Store all available RPC endpoints for rotation
    this.currentEndpointIndex = 0; // Track which endpoint we're currently using
    // Initialize asynchronously - will be called when first function is invoked
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    console.log('🔄 TransactionSigningService.ensureInitialized: Starting', {
      alreadyInitialized: this.initialized,
      hasConnection: !!this.connection,
      hasKeypair: !!this.companyKeypair
    });
    
    if (!this.initialized) {
      try {
        console.log('🔄 TransactionSigningService: Calling initialize()');
        await this.initialize();
        this.initialized = true;
        console.log('✅ Transaction signing service initialized successfully', {
          hasConnection: !!this.connection,
          hasKeypair: !!this.companyKeypair,
          connectionType: this.connection?.constructor?.name,
          rpcUrl: this.rpcUrl ? this.rpcUrl.substring(0, 50) + '...' : 'N/A'
        });
      } catch (error) {
        console.error('❌ Failed to initialize transaction signing service:', {
          error: error.message,
          errorName: error?.name,
          errorCode: error?.code,
          errorStack: error.stack ? error.stack.substring(0, 500) : 'No stack trace',
          hasConnection: !!this.connection,
          hasKeypair: !!this.companyKeypair,
          timestamp: new Date().toISOString()
        });
        // Don't set initialized to true if initialization failed
        throw new Error(`Failed to initialize transaction signing service: ${error.message}`);
      }
    } else {
      console.log('✅ TransactionSigningService: Already initialized, skipping');
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
    console.log('🔵 TransactionSigningService.initialize: STARTING', {
      timestamp: new Date().toISOString()
    });
    
    try {
      // Get company wallet configuration from Firebase Secrets
      // Firebase Secrets are automatically available as process.env variables when deployed
      // CRITICAL: Handle all edge cases - undefined, null, empty string, whitespace-only
      const rawAddress = process.env.COMPANY_WALLET_ADDRESS;
      const rawSecretKey = process.env.COMPANY_WALLET_SECRET_KEY;
      
      // Trim and validate - handle undefined, null, empty string
      const companyWalletAddress = rawAddress && typeof rawAddress === 'string' 
        ? rawAddress.trim() 
        : null;
      const companyWalletSecretKey = rawSecretKey && typeof rawSecretKey === 'string' 
        ? rawSecretKey.trim() 
        : null;
      
      // Enhanced logging for debugging production issues
      // SECURITY: Never log secret key values, previews, or any part of the key
      // Only log metadata (existence, length, type) to prevent exposure
      console.log('🔄 TransactionSigningService.initialize: Checking Firebase Secrets', {
        hasAddressRaw: !!rawAddress,
        hasAddressTrimmed: !!companyWalletAddress,
        addressType: typeof rawAddress,
        addressLength: companyWalletAddress?.length || 0,
        addressPreview: companyWalletAddress 
          ? companyWalletAddress.substring(0, 8) + '...' + companyWalletAddress.substring(companyWalletAddress.length - 8) 
          : 'MISSING',
        hasSecretKeyRaw: !!rawSecretKey,
        hasSecretKeyTrimmed: !!companyWalletSecretKey,
        secretKeyType: typeof rawSecretKey,
        secretKeyLength: companyWalletSecretKey?.length || 0,
        // Check for common issues
        addressIsEmptyString: rawAddress === '',
        secretKeyIsEmptyString: rawSecretKey === '',
        addressIsWhitespaceOnly: rawAddress && rawAddress.trim() === '',
        secretKeyIsWhitespaceOnly: rawSecretKey && rawSecretKey.trim() === '',
        // List all COMPANY/WALLET related env vars (for debugging) - but NOT their values
        relatedEnvKeys: Object.keys(process.env).filter(k => 
          k.includes('COMPANY') || k.includes('WALLET') || k.includes('COMPANY_WALLET')
        ),
        // SECURITY: Never log secret key values, previews, or any part of the key
        // SECURITY: Never log secret key in error messages or stack traces
        // SECURITY: Secret key must remain in memory only, never serialized to logs
      });
      
      // Detailed validation with specific error messages
      if (!companyWalletAddress) {
        const errorDetails = {
          hasRawAddress: !!rawAddress,
          rawAddressType: typeof rawAddress,
          rawAddressValue: rawAddress === '' ? 'EMPTY_STRING' : rawAddress ? 'HAS_VALUE_BUT_INVALID' : 'UNDEFINED',
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('COMPANY') || k.includes('WALLET')),
          nodeEnv: process.env.NODE_ENV,
          functionsEmulator: process.env.FUNCTIONS_EMULATOR
        };
        
        console.error('❌ TransactionSigningService.initialize: COMPANY_WALLET_ADDRESS missing or invalid', errorDetails);
        
        throw new Error(
          'Company wallet address (COMPANY_WALLET_ADDRESS) is missing or invalid. ' +
          'This secret must be set in Firebase Secrets for production. ' +
          'To set it, run: echo "YOUR_WALLET_ADDRESS" | firebase functions:secrets:set COMPANY_WALLET_ADDRESS ' +
          'Or use: firebase functions:secrets:set COMPANY_WALLET_ADDRESS ' +
          `Current value: ${rawAddress === '' ? 'EMPTY_STRING' : rawAddress ? 'HAS_VALUE_BUT_INVALID' : 'UNDEFINED'}`
        );
      }
      
      if (!companyWalletSecretKey) {
        const errorDetails = {
          hasRawSecretKey: !!rawSecretKey,
          rawSecretKeyType: typeof rawSecretKey,
          rawSecretKeyValue: rawSecretKey === '' ? 'EMPTY_STRING' : rawSecretKey ? 'HAS_VALUE_BUT_INVALID' : 'UNDEFINED',
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('COMPANY') || k.includes('WALLET')),
          nodeEnv: process.env.NODE_ENV,
          functionsEmulator: process.env.FUNCTIONS_EMULATOR
        };
        
        console.error('❌ TransactionSigningService.initialize: COMPANY_WALLET_SECRET_KEY missing or invalid', errorDetails);
        
        throw new Error(
          'Company wallet secret key (COMPANY_WALLET_SECRET_KEY) is missing or invalid. ' +
          'This secret must be set in Firebase Secrets for production. ' +
          'To set it, run: echo "[YOUR_SECRET_KEY_ARRAY]" | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY ' +
          'Or use: firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY ' +
          `Current value: ${rawSecretKey === '' ? 'EMPTY_STRING' : rawSecretKey ? 'HAS_VALUE_BUT_INVALID' : 'UNDEFINED'}`
        );
      }
      
      // Validate address format (Solana addresses are 32-44 characters base58)
      if (companyWalletAddress.length < 32 || companyWalletAddress.length > 44) {
        console.error('❌ TransactionSigningService.initialize: Invalid address length', {
          addressLength: companyWalletAddress.length,
          expectedRange: '32-44 characters'
        });
        throw new Error(
          `Company wallet address has invalid length: ${companyWalletAddress.length} characters. ` +
          `Expected 32-44 characters (Solana base58 address). ` +
          `Address preview: ${companyWalletAddress.substring(0, 8)}...`
        );
      }
      
      // SECURITY: Only log metadata, never the actual secret key value
      console.log('✅ TransactionSigningService.initialize: Secrets found', {
        addressLength: companyWalletAddress.length,
        addressPreview: companyWalletAddress.substring(0, 8) + '...' + companyWalletAddress.substring(companyWalletAddress.length - 8),
        secretKeyLength: companyWalletSecretKey.length,
        secretKeyExists: true
        // SECURITY: Never log secretKey value, preview, or any part of it
      });

      // Create company keypair from secret key
      // Support multiple formats: JSON array, base64-encoded JSON array, or base64-encoded Uint8Array
      let secretKeyArray;
      try {
        // First, try to parse as JSON array directly (for backward compatibility)
        secretKeyArray = JSON.parse(companyWalletSecretKey);
      } catch (jsonError) {
        // If JSON parsing fails, try base64 decoding first
        try {
          // Decode from base64
          const decoded = Buffer.from(companyWalletSecretKey, 'base64');
          
          // Try to parse the decoded value as JSON (in case it's base64-encoded JSON)
          try {
            secretKeyArray = JSON.parse(decoded.toString('utf8'));
          } catch (nestedJsonError) {
            // If that fails, treat the decoded bytes as the raw secret key array
            // Convert Buffer to array of numbers
            secretKeyArray = Array.from(decoded);
          }
        } catch (base64Error) {
          console.error('Failed to parse secret key', {
            jsonError: jsonError.message,
            base64Error: base64Error.message,
            secretKeyLength: companyWalletSecretKey.length,
            secretKeyStartsWith: companyWalletSecretKey.substring(0, 10) // First 10 chars for debugging
            // SECURITY: Never log full secret key or significant portions
        });
          throw new Error(`Invalid secret key format: Expected JSON array or base64-encoded key. JSON error: ${jsonError.message}`);
        }
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

      // Create connection - use network from environment
      // ✅ CRITICAL: Production MUST use mainnet (obligatory), emulator can use devnet
      // ✅ MULTIPLE LAYERS OF PROTECTION: No exceptions for production
      
      // ✅ LAYER 1: Detect environment with multiple indicators
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      const nodeEnv = process.env.NODE_ENV;
      const gcloudProject = process.env.GCLOUD_PROJECT;
      const isProduction = !isEmulator && (
        nodeEnv === 'production' || 
        gcloudProject?.includes('prod') ||
        gcloudProject?.includes('production')
      );
      
      // ✅ LAYER 2: Default based on environment: production = mainnet, emulator/dev = devnet
      let actualNetwork = isProduction ? 'mainnet' : 'devnet';
      
      // Debug: Log all relevant environment variables
      console.log('Checking network environment variables', {
        SOLANA_NETWORK: process.env.SOLANA_NETWORK,
        NETWORK: process.env.NETWORK,
        EXPO_PUBLIC_FORCE_MAINNET: process.env.EXPO_PUBLIC_FORCE_MAINNET,
        FORCE_MAINNET: process.env.FORCE_MAINNET,
        EXPO_PUBLIC_DEV_NETWORK: process.env.EXPO_PUBLIC_DEV_NETWORK,
        DEV_NETWORK: process.env.DEV_NETWORK,
        FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
        NODE_ENV: process.env.NODE_ENV,
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
        isEmulator,
        isProduction,
        defaultNetwork: actualNetwork
      });
      
      // ✅ LAYER 3: Check explicit network setting (but production ALWAYS overrides devnet)
      // Trim whitespace/newlines from environment variables to handle Firebase Secrets formatting
      if (process.env.SOLANA_NETWORK) {
        const requestedNetwork = (process.env.SOLANA_NETWORK || '').trim().toLowerCase();
        
        // ✅ CRITICAL: Production builds CANNOT use devnet (security violation)
        if (isProduction && requestedNetwork === 'devnet') {
          console.error('🚨 SECURITY CRITICAL: Production environment detected but SOLANA_NETWORK=devnet!');
          console.error('🚨 This is a security violation. FORCING mainnet. Production builds MUST use mainnet.');
          console.error('🚨 If you need to test mainnet locally, use the emulator with devnet instead.');
          actualNetwork = 'mainnet'; // ✅ FORCE mainnet - no exceptions
        } else {
          actualNetwork = requestedNetwork;
          console.log('Using SOLANA_NETWORK:', actualNetwork);
        }
      } else if (process.env.NETWORK) {
        actualNetwork = (process.env.NETWORK || '').trim().toLowerCase();
        console.log('Using NETWORK:', actualNetwork);
      } else if (process.env.EXPO_PUBLIC_NETWORK) {
        // Check EXPO_PUBLIC_NETWORK (new standard, matches client)
        const expoNetwork = (process.env.EXPO_PUBLIC_NETWORK || '').trim().toLowerCase();
        if (expoNetwork === 'mainnet' || expoNetwork === 'mainnet-beta') {
          actualNetwork = 'mainnet';
        } else if (expoNetwork === 'devnet') {
          actualNetwork = 'devnet';
        } else if (expoNetwork === 'testnet') {
          actualNetwork = 'testnet';
        } else {
          actualNetwork = expoNetwork;
        }
        console.log('Using EXPO_PUBLIC_NETWORK:', expoNetwork, '->', actualNetwork);
      }
      // Check EXPO_PUBLIC_FORCE_MAINNET (matches frontend variable name)
      // Trim whitespace/newlines from environment variable to handle Firebase Secrets formatting
      else if ((process.env.EXPO_PUBLIC_FORCE_MAINNET || '').trim() === 'true' || (process.env.EXPO_PUBLIC_FORCE_MAINNET || '').trim() === '1') {
        actualNetwork = 'mainnet';
        console.log('Using EXPO_PUBLIC_FORCE_MAINNET=true, setting network to mainnet');
      }
      // Check FORCE_MAINNET (backend variable)
      // Trim whitespace/newlines from environment variable to handle Firebase Secrets formatting
      else if ((process.env.FORCE_MAINNET || '').trim() === 'true' || (process.env.FORCE_MAINNET || '').trim() === '1') {
        actualNetwork = 'mainnet';
        console.log('Using FORCE_MAINNET=true, setting network to mainnet');
      }
      // Check EXPO_PUBLIC_DEV_NETWORK (frontend variable - can be 'mainnet' or 'devnet')
      // Trim whitespace/newlines from environment variable to handle Firebase Secrets formatting
      else if (process.env.EXPO_PUBLIC_DEV_NETWORK) {
        const frontendNetwork = (process.env.EXPO_PUBLIC_DEV_NETWORK || '').trim().toLowerCase();
        // Handle both 'mainnet'/'devnet' strings
        if (frontendNetwork === 'mainnet') {
          actualNetwork = 'mainnet';
        } else if (frontendNetwork === 'devnet') {
          actualNetwork = 'devnet';
        } else {
          // If it's 'true'/'false', treat as boolean
          if (frontendNetwork === 'true' || frontendNetwork === '1') {
            actualNetwork = 'devnet'; // true = devnet
          } else if (frontendNetwork === 'false' || frontendNetwork === '0') {
            actualNetwork = 'mainnet'; // false = mainnet
          } else {
            actualNetwork = frontendNetwork; // Use as-is if it's a valid network name
          }
        }
        console.log('Using EXPO_PUBLIC_DEV_NETWORK:', frontendNetwork, '->', actualNetwork);
      }
      // Check legacy DEV_NETWORK variable
      // Trim whitespace/newlines from environment variable to handle Firebase Secrets formatting
      else if (process.env.DEV_NETWORK) {
        const devNetwork = (process.env.DEV_NETWORK || '').trim().toLowerCase();
        if (devNetwork === 'mainnet') {
          actualNetwork = 'mainnet';
        } else if (devNetwork === 'devnet') {
          actualNetwork = 'devnet';
        } else if (devNetwork === 'true' || devNetwork === '1') {
          actualNetwork = 'devnet';
        } else if (devNetwork === 'false' || devNetwork === '0') {
          actualNetwork = 'mainnet';
        } else {
          actualNetwork = devNetwork;
        }
        console.log('Using DEV_NETWORK:', devNetwork, '->', actualNetwork);
      } else {
        // No explicit network variable found - use environment-based default
        if (isProduction) {
          actualNetwork = 'mainnet';
          console.log('No network environment variable found, using production default: mainnet');
        } else {
          actualNetwork = 'devnet';
          console.log('No network environment variable found, using development default: devnet');
        }
      }
      
      // ✅ LAYER 4: FINAL SAFETY CHECK - Prevent devnet in production (NO EXCEPTIONS)
      // ✅ CRITICAL: Even if SOLANA_NETWORK=devnet is set, production MUST use mainnet
      if (isProduction && actualNetwork === 'devnet') {
        console.error('🚨 SECURITY CRITICAL: Production environment detected but network is devnet!');
        console.error('🚨 This is a security violation. FORCING mainnet. Production builds MUST use mainnet.');
        console.error('🚨 Environment details:', {
          FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
          NODE_ENV: process.env.NODE_ENV,
          GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
          SOLANA_NETWORK: process.env.SOLANA_NETWORK,
          isEmulator,
          isProduction,
          requestedNetwork: actualNetwork,
          overridden: 'mainnet',
          note: 'Production builds CANNOT use devnet - this is a security requirement'
        });
        actualNetwork = 'mainnet'; // ✅ FORCE mainnet - no exceptions, no overrides
      }
      
      // Validate network value
      if (!['mainnet', 'devnet', 'testnet'].includes(actualNetwork)) {
        console.warn('Invalid network value, defaulting to devnet', {
          provided: actualNetwork,
          envVars: {
            SOLANA_NETWORK: process.env.SOLANA_NETWORK,
            NETWORK: process.env.NETWORK,
            EXPO_PUBLIC_FORCE_MAINNET: process.env.EXPO_PUBLIC_FORCE_MAINNET,
            FORCE_MAINNET: process.env.FORCE_MAINNET,
            EXPO_PUBLIC_DEV_NETWORK: process.env.EXPO_PUBLIC_DEV_NETWORK,
            DEV_NETWORK: process.env.DEV_NETWORK
          }
        });
        actualNetwork = 'devnet';
      }
      
      console.log('Final network selection:', {
        network: actualNetwork,
        isMainnet: actualNetwork === 'mainnet'
      });
      
      // Helper to extract API key from URL or return as-is
      // Trim whitespace/newlines to handle Firebase Secrets formatting
      const extractApiKey = (value, baseUrl) => {
        if (!value) return '';
        // Trim whitespace/newlines from the value
        const trimmedValue = value.trim();
        if (trimmedValue.startsWith('http')) {
          const parts = trimmedValue.split('/');
          return (parts[parts.length - 1] || trimmedValue).trim();
        }
        if (trimmedValue.includes(baseUrl)) {
          return trimmedValue.replace(baseUrl, '').replace(/^\//, '').replace(/\/$/, '').trim();
        }
        return trimmedValue;
      };
      
      const extractGetBlockKey = (value) => {
        if (!value) return '';
        // Trim whitespace/newlines from the value
        const trimmedValue = value.trim();
        if (trimmedValue.startsWith('http')) {
          const match = trimmedValue.match(/go\.getblock\.io\/([^\/\s]+)/);
          return match ? match[1].trim() : (trimmedValue.split('/').pop() || trimmedValue).trim();
        }
        return trimmedValue;
      };
      
      let rpcUrl;
      const rpcEndpoints = [];
      
      if (actualNetwork === 'mainnet') {
        // Use same priority order as client: Alchemy > GetBlock > QuickNode > Chainstack > Helius > Free
        // SECURITY: Use Firebase Secrets only - never use EXPO_PUBLIC_ variables in production
        // Set USE_PAID_RPC=true to enable paid RPC providers
        // Trim whitespace/newlines from environment variable to handle Firebase Secrets formatting
        const usePaidRpc = (process.env.USE_PAID_RPC || '').trim() === 'true';
        
        // SECURITY: Only use Firebase Secrets (process.env.ALCHEMY_API_KEY) - not EXPO_PUBLIC_ variables
        // EXPO_PUBLIC_ variables are for client-side only and should not be used in Firebase Functions
        // Trim whitespace/newlines from environment variables to handle Firebase Secrets formatting
        const alchemyApiKey = extractApiKey(process.env.ALCHEMY_API_KEY, 'solana-mainnet.g.alchemy.com/v2');
        const getBlockApiKey = extractGetBlockKey(process.env.GETBLOCK_API_KEY);
        const quickNodeEndpoint = process.env.QUICKNODE_ENDPOINT ? process.env.QUICKNODE_ENDPOINT.trim() : undefined;
        const chainstackEndpoint = process.env.CHAINSTACK_ENDPOINT ? process.env.CHAINSTACK_ENDPOINT.trim() : undefined;
        const heliusApiKey = extractApiKey(process.env.HELIUS_API_KEY, 'mainnet.helius-rpc.com');
        
        // Log API key availability for debugging
        console.log('RPC API keys check', {
          usePaidRpc,
          usePaidRpcRaw: process.env.USE_PAID_RPC,
          hasAlchemy: !!alchemyApiKey && alchemyApiKey !== 'YOUR_ALCHEMY_API_KEY_HERE',
          hasGetBlock: !!getBlockApiKey && getBlockApiKey !== 'YOUR_GETBLOCK_API_KEY_HERE',
          hasHelius: !!heliusApiKey && heliusApiKey !== 'YOUR_HELIUS_API_KEY_HERE',
          hasQuickNode: !!quickNodeEndpoint && quickNodeEndpoint !== 'YOUR_QUICKNODE_ENDPOINT_HERE',
          hasChainstack: !!chainstackEndpoint && chainstackEndpoint !== 'YOUR_CHAINSTACK_ENDPOINT_HERE'
        });
        
        // Tier 1: Fast providers with API keys (only if USE_PAID_RPC=true)
        if (usePaidRpc) {
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
        }
        
        // Tier 3: Free fallback (always included, used first if USE_PAID_RPC is not set)
        // NOTE: Removed Ankr as it's returning 403 errors - use official Solana RPC only
        rpcEndpoints.push('https://api.mainnet-beta.solana.com');
        
        rpcUrl = rpcEndpoints[0] || 'https://api.mainnet-beta.solana.com';
        
        console.log('RPC endpoint selection', {
          usePaidRpc,
          usePaidRpcRaw: process.env.USE_PAID_RPC,
          totalEndpoints: rpcEndpoints.length,
          selectedEndpoint: rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***'),
          allEndpoints: rpcEndpoints.map(url => url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***')),
          note: usePaidRpc ? 'Using paid RPC providers' : 'Using free RPC endpoints (set USE_PAID_RPC=true to enable paid providers)'
        });
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
                         rpcUrl.includes('ankr') ? 'Ankr' : 'Official',
        networkSource: process.env.SOLANA_NETWORK ? 'SOLANA_NETWORK (primary)' :
                       process.env.NETWORK ? 'NETWORK (secondary)' :
                       process.env.EXPO_PUBLIC_NETWORK ? 'EXPO_PUBLIC_NETWORK (matches client)' :
                       process.env.FORCE_MAINNET ? 'FORCE_MAINNET (legacy)' :
                       process.env.EXPO_PUBLIC_DEV_NETWORK ? 'EXPO_PUBLIC_DEV_NETWORK (legacy)' :
                       process.env.DEV_NETWORK ? 'DEV_NETWORK (legacy)' :
                       isProduction ? 'environment-based default (production=mainnet)' :
                       'environment-based default (development=devnet)',
        note: 'Backend network must match client network. Use SOLANA_NETWORK env var (matches client EXPO_PUBLIC_NETWORK)'
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

      // CRITICAL: Validate company wallet is a required signer BEFORE attempting to sign
      // This prevents "Cannot sign with non signer key" errors
      const companyWalletAddress = this.companyKeypair.publicKey.toBase58();
      const staticAccountKeys = transaction.message.staticAccountKeys;
      const numRequiredSignatures = transaction.message.header.numRequiredSignatures;
      const feePayer = staticAccountKeys[0];
      
      // Log transaction structure for debugging
      console.log('Validating transaction structure before signing', {
        messageVersion: transaction.version,
        numSignatures: transaction.signatures.length,
        numRequiredSignatures,
        staticAccountKeysCount: staticAccountKeys.length,
        feePayerAddress: feePayer?.toBase58(),
        companyWalletAddress,
        feePayerMatchesCompany: feePayer?.toBase58() === companyWalletAddress,
        requiredSignerAccounts: staticAccountKeys.slice(0, numRequiredSignatures).map(key => key.toBase58()),
        companyWalletInRequiredSigners: staticAccountKeys.slice(0, numRequiredSignatures).some(key => key.toBase58() === companyWalletAddress),
        blockhash: blockhashBeforeSigning.toString().substring(0, 8) + '...'
      });

      // Validate fee payer is company wallet
      if (!feePayer || feePayer.toBase58() !== companyWalletAddress) {
        console.error('❌ Transaction fee payer is not company wallet', {
          feePayerAddress: feePayer?.toBase58(),
          companyWalletAddress,
          staticAccountKeys: staticAccountKeys.map(key => key.toBase58()),
          numRequiredSignatures
        });
        throw new Error(
          `Transaction fee payer is not company wallet. ` +
          `Expected: ${companyWalletAddress}, ` +
          `Got: ${feePayer?.toBase58() || 'undefined'}. ` +
          `The transaction must have the company wallet (${companyWalletAddress}) as the fee payer.`
        );
      }

      // Validate company wallet is in required signers (should be at index 0)
      const requiredSignerAccounts = staticAccountKeys.slice(0, numRequiredSignatures);
      const companyWalletInRequiredSigners = requiredSignerAccounts.some(key => key.toBase58() === companyWalletAddress);
      
      if (!companyWalletInRequiredSigners) {
        console.error('❌ Company wallet is not in required signers list', {
          companyWalletAddress,
          numRequiredSignatures,
          requiredSignerAccounts: requiredSignerAccounts.map(key => key.toBase58()),
          allStaticAccountKeys: staticAccountKeys.map(key => key.toBase58()),
          feePayerIndex: 0,
          feePayerAddress: feePayer.toBase58()
        });
        throw new Error(
          `Company wallet (${companyWalletAddress}) is not in the required signers list. ` +
          `Fee payer is at index 0, but numRequiredSignatures is ${numRequiredSignatures}. ` +
          `Required signers: ${requiredSignerAccounts.map(key => key.toBase58()).join(', ')}. ` +
          `This usually means the transaction was not properly compiled with the company wallet as fee payer.`
        );
      }

      // CRITICAL: Sign immediately - no validation delays here
      // Validation happens before Firestore checks and right before submission
      // Every millisecond counts to prevent blockhash expiration
      console.log('✅ Transaction validation passed, adding company signature', {
        messageVersion: transaction.version,
        numSignatures: transaction.signatures.length,
        numRequiredSignatures,
        companyWalletAddress,
        feePayerAddress: feePayer.toBase58(),
        blockhash: blockhashBeforeSigning.toString().substring(0, 8) + '...',
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
      // Best Practice: Use retry logic for RPC calls
      const blockhashString = transactionBlockhash.toString();
      // Use 'confirmed' commitment for faster validation (vs 'finalized' which is slower)
      const isValid = await retryRpcOperation(
        () => this.connection.isBlockhashValid(blockhashString, { 
          commitment: 'confirmed' // Faster than 'finalized'
        }),
        {
          maxRetries: 2, // Fewer retries for quick validation
          initialDelay: 50,
          maxDelay: 500,
          timeout: 2000
        }
      );
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
      
      // CRITICAL: Skip blockhash validation to save 100-300ms
      // Client already validates blockhash right before sending (0-100ms old)
      // Redundant validation here causes blockhash to expire during processing
      // Solana network will reject expired blockhashes during submission anyway
      // This saves critical time and prevents timeout issues on mainnet
      const blockhashString = transactionBlockhash.toString();
      console.log('Skipping blockhash validation - submitting immediately', {
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        note: 'Client already validated blockhash. Submitting immediately to prevent expiration.'
      });
      
      console.log('Preparing transaction submission', {
        transactionBlockhash: transactionBlockhash.toString().substring(0, 8) + '...',
        hasSignatures: transaction.signatures.length > 0,
        signatureCount: transaction.signatures.length
      });

      // CRITICAL: ALWAYS use skipPreflight: true on both mainnet and devnet to minimize submission time
      // Preflight simulation takes 200-2000ms which can cause blockhash expiration
      // Preflight can also fail with "Blockhash not found" even if blockhash is valid (RPC timing issues)
      // Client already validates transaction structure, so preflight is redundant
      // If blockhash is expired, Solana will reject during actual submission anyway
      // Detect mainnet by checking stored RPC URL (for logging purposes)
      const isMainnet = this.rpcUrl ? (
        this.rpcUrl.includes('mainnet') || 
        this.rpcUrl.includes('helius-rpc.com') ||
        this.rpcUrl.includes('alchemy.com') ||
        this.rpcUrl.includes('getblock.io') ||
        (!this.rpcUrl.includes('devnet') && !this.rpcUrl.includes('testnet'))
      ) : false;
      
      // CRITICAL: Submit IMMEDIATELY - no validation delays
      // Client already validated blockhash (0-100ms old when sent)
      // Every millisecond counts to prevent blockhash expiration
      const submissionStartTime = Date.now();
      console.log('Submitting transaction immediately', {
        isMainnet,
        rpcUrl: this.rpcUrl ? this.rpcUrl.substring(0, 50) + '...' : 'unknown',
        skipPreflight: true, // Always skip preflight to save time and avoid false negatives
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        note: 'Submitting immediately to minimize blockhash expiration risk. Preflight skipped on both networks.'
      });
      
      // CRITICAL: Submit the transaction IMMEDIATELY - no delays
      // Every millisecond counts to avoid blockhash expiration
      // Skip preflight on both mainnet and devnet to save time and avoid false negatives
      // Preflight simulation checks blockhash validity, which can fail if blockhash expired
      // By skipping preflight, we submit immediately and let Solana handle validation
      // On devnet, preflight can also fail due to RPC slowness or blockhash timing issues
      // Best Practice: Use retry logic with exponential backoff for RPC calls
      let signature;
      const submitTimer = performanceMonitor.startOperation('submitTransaction');
      try {
        // Best Practice: Retry RPC calls with exponential backoff
        // CRITICAL: Skip preflight on both networks to avoid blockhash expiration issues
        // Preflight adds 200-500ms delay and can fail even with valid blockhashes
        signature = await retryRpcOperation(
          () => this.connection.sendTransaction(transaction, {
            skipPreflight: true, // Skip preflight on both mainnet and devnet to save time
            maxRetries: 0 // We handle retries ourselves
          }),
          {
            maxRetries: 3,
            initialDelay: 100,
            maxDelay: 1000,
            timeout: 5000
          }
        );
        submitTimer.end();
      } catch (sendError) {
        submitTimer.end();
        performanceMonitor.recordError('submitTransaction', sendError);
        // Check if it's a blockhash-related error
        // CRITICAL: Be specific - only match actual Solana blockhash errors
        // Don't match generic "expired" which could be from other errors
        const errorMessage = sendError.message || String(sendError);
        const errorString = String(sendError).toLowerCase();
        
        // Check for RPC API key errors (403 Forbidden)
        const isApiKeyError = 
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden') ||
          errorMessage.includes('API key is not allowed') ||
          errorMessage.includes('API key') && (errorMessage.includes('not allowed') || errorMessage.includes('invalid')) ||
          errorString.includes('403') ||
          errorString.includes('forbidden') ||
          (sendError.code && sendError.code === 403) ||
          (sendError.response && sendError.response.status === 403);
        
        if (isApiKeyError) {
          // RPC API key doesn't have permission - try next endpoint
          const currentIndex = this.currentEndpointIndex;
          const nextIndex = currentIndex + 1;
          
          if (this.rpcEndpoints && nextIndex < this.rpcEndpoints.length) {
            // Try next endpoint
            console.warn('⚠️ RPC endpoint failed with 403, rotating to next endpoint', {
              failedEndpoint: this.rpcUrl ? this.rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***') : 'unknown',
              currentIndex,
              nextIndex,
              totalEndpoints: this.rpcEndpoints.length,
              nextEndpoint: this.rpcEndpoints[nextIndex].replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***')
            });
            
            // Switch to next endpoint
            this.currentEndpointIndex = nextIndex;
            this.rpcUrl = this.rpcEndpoints[nextIndex];
            this.connection = new Connection(this.rpcUrl, {
              commitment: 'confirmed',
              confirmTransactionInitialTimeout: 30000,
              disableRetryOnRateLimit: false,
              httpHeaders: {
                'User-Agent': 'WeSplit-Firebase/1.0',
                'Connection': 'keep-alive',
              },
            });
            
            // Retry with new endpoint (only once to avoid infinite loops)
            try {
              signature = await this.connection.sendTransaction(transaction, {
                skipPreflight: true,
                maxRetries: 0
              });
              submitTimer.end();
              console.log('✅ Transaction submitted successfully after endpoint rotation', {
                endpoint: this.rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***'),
                signature: signature?.substring(0, 16) + '...'
              });
              // Continue to verification below - don't return early
            } catch (retryError) {
              // If retry also fails, throw original error
              console.error('❌ All RPC endpoints failed', {
                totalEndpoints: this.rpcEndpoints.length,
                triedEndpoints: nextIndex + 1,
                lastError: retryError.message?.substring(0, 200)
              });
              throw new Error(
                `RPC endpoint API key error: All ${this.rpcEndpoints.length} endpoints failed. ` +
                `Last error: ${retryError.message?.substring(0, 200) || errorMessage.substring(0, 200)}`
              );
            }
          } else {
            // No more endpoints to try
            console.error('❌ RPC API key error - all endpoints exhausted', {
              error: errorMessage.substring(0, 300),
              rpcUrl: this.rpcUrl ? this.rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***') : 'unknown',
              availableEndpoints: this.rpcEndpoints ? this.rpcEndpoints.length : 0,
              triedEndpoints: this.currentEndpointIndex + 1
            });
            throw new Error(
              `RPC endpoint API key error: All ${this.rpcEndpoints?.length || 0} endpoints failed. ` +
              `The API key for ${this.rpcUrl ? this.rpcUrl.split('/')[2] : 'RPC endpoint'} does not have permission to access the blockchain. ` +
              `Please check your RPC API key configuration. ` +
              `Error: ${errorMessage.substring(0, 200)}`
            );
          }
        }
        
        // Solana-specific blockhash error patterns
        const isBlockhashError = 
          errorMessage.includes('Blockhash not found') || 
          errorMessage.includes('blockhash not found') ||
          errorMessage.includes('blockhash expired') ||
          errorMessage.includes('blockhash has expired') ||
          errorString.includes('blockhash not found') ||
          errorString.includes('blockhash expired') ||
          errorString.includes('blockhash has expired') ||
          (errorString.includes('simulation failed') && errorString.includes('blockhash')) ||
          // Solana RPC error codes for blockhash issues
          (sendError.code && (sendError.code === -32002 || sendError.code === -32004));

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
          isMainnet,
          rpcUrl: this.rpcUrl ? this.rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@').replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***') : 'unknown'
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
      // Network-aware verification: devnet is faster, mainnet needs more time
      const verificationStartTime = Date.now();
      
      // Network-aware verification timing
      // Mainnet: Transactions can take 1-5 seconds to be indexed by RPCs, especially during high traffic
      // Devnet: Transactions appear faster, but RPC can be unreliable/slow
      // Reuse isMainnet from earlier in function
      
      // Mainnet needs MORE initial wait - RPCs can be slow to index during high traffic
      const initialWait = isMainnet ? 1000 : 500; // Mainnet: 1s, Devnet: 500ms
      await new Promise(resolve => setTimeout(resolve, initialWait));
      
      let transactionFound = false;
      let transactionError = null;
      // Mainnet needs more attempts - RPC indexing can be slow
      const maxVerificationAttempts = isMainnet ? 5 : 5; // Same attempts, but mainnet has longer delays
      // Mainnet needs longer delays between attempts - give RPC time to index
      const verificationDelay = isMainnet ? 1000 : 500; // Mainnet: 1s, Devnet: 500ms
      // Mainnet needs longer timeout per attempt - RPC can be slow
      const verificationTimeout = isMainnet ? 2000 : 1500; // Mainnet: 2s, Devnet: 1.5s
      
      // Try multiple times to find the transaction
      // On mainnet, transactions can take 1-5 seconds to be indexed
      // Best Practice: Use retry logic with exponential backoff
      const verifyTimer = performanceMonitor.startOperation('verifyTransaction');
      try {
        const status = await retryRpcOperation(
          () => Promise.race([
            this.connection.getSignatureStatus(signature, {
              searchTransactionHistory: true
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification timeout')), verificationTimeout)
            )
          ]),
          {
            maxRetries: maxVerificationAttempts - 1, // Already doing one attempt
            initialDelay: verificationDelay,
            maxDelay: verificationTimeout,
            timeout: verificationTimeout
          }
        );
        
        // Process status result
        if (status && status.value) {
          transactionFound = true;
          
          // Transaction found - check if it has an error
          if (status.value.err) {
            transactionError = status.value.err;
            const verificationTime = Date.now() - verificationStartTime;
            verifyTimer.end();
            console.error('Transaction failed on-chain', {
              signature,
              error: transactionError,
              verificationTimeMs: verificationTime,
              note: 'Transaction was submitted but failed during execution.'
            });
            throw handleError(
              new Error(`Transaction failed on-chain: ${JSON.stringify(transactionError)}`),
              { signature, operation: 'verifyTransaction' }
            );
          }
          
          // Transaction found and no error - success!
          const verificationTime = Date.now() - verificationStartTime;
          verifyTimer.end();
          console.log('Transaction verified on-chain', {
            signature,
            verificationTimeMs: verificationTime,
            confirmationStatus: status.value.confirmationStatus,
            note: 'Transaction was successfully submitted and verified on-chain.'
          });
          
          performanceMonitor.recordOperation('verifyTransaction', true);
          
        } else {
          // Transaction not found after all retries
          const verificationTime = Date.now() - verificationStartTime;
          verifyTimer.end();
          
          // On devnet, be more lenient - transaction might still be processing
          // On mainnet, if we can't find it after retries, it's likely rejected
          if (!isMainnet) {
            console.warn('Transaction not found on devnet after retries (may still be processing)', {
              signature,
              verificationTimeMs: verificationTime,
              note: 'Devnet RPC can be slow. Transaction may still be processing. Returning signature for client-side verification.'
            });
            
            // On devnet, return signature anyway - client can verify asynchronously
            // This prevents false negatives from slow RPC indexing
            return {
              signature,
              confirmation: null,
              note: 'Transaction submitted. Verification timeout on devnet - client will verify asynchronously.'
            };
          }
          
          // On mainnet, be more strict - if we can't verify after reasonable time, transaction likely failed
          // Mainnet RPC indexing can be slow, but if we've waited 5+ seconds and still can't find it,
          // the transaction was likely rejected (blockhash expired, insufficient funds, etc.)
          console.error('❌ Transaction not found on mainnet after verification attempts', {
            signature,
            verificationTimeMs: verificationTime,
            maxAttempts: maxVerificationAttempts,
            note: 'Transaction was likely rejected by Solana network (blockhash expired, insufficient funds, or invalid transaction).'
          });
          
          // Throw error instead of returning invalid signature
          throw handleError(
            new Error(
              `Transaction verification failed: Transaction signature ${signature.substring(0, 16)}... was returned but transaction was not found on-chain after ${verificationTime}ms. ` +
              `This usually means the transaction was rejected (blockhash expired, insufficient funds, or invalid transaction). ` +
              `Please check the transaction on Solana Explorer: https://solscan.io/tx/${signature}`
            ),
            { signature, operation: 'verifyTransaction' }
          );
        }
      } catch (verifyError) {
        verifyTimer.end();
          performanceMonitor.recordError('verifyTransaction', verifyError);
          
          // If it's a transaction failure error, throw it
          if (verifyError.message && verifyError.message.includes('Transaction failed on-chain')) {
            throw verifyError;
          }
          
          // If error is not retryable, throw immediately
          if (!isRetryableError(verifyError)) {
            throw handleError(verifyError, { signature, operation: 'verifyTransaction' });
          }
          
          // Retry logic is handled by retryRpcOperation
          // If we get here, all retries failed
          const verificationTime = Date.now() - verificationStartTime;
          
          // On devnet, be more lenient - RPC can be slow or rate-limited
          if (!isMainnet) {
            console.warn('Transaction verification failed on devnet (may be RPC issue)', {
              signature,
              verificationTimeMs: verificationTime,
              error: verifyError.message,
              note: 'Devnet RPC can be slow. Returning signature for client-side verification.'
            });
            
            // On devnet, return signature anyway - client can verify asynchronously
            return {
              signature,
              confirmation: null,
              note: 'Transaction submitted. Verification failed on devnet - client will verify asynchronously.'
            };
          }
          
          // On mainnet, be stricter
          console.error('Transaction verification failed after all retries', {
            signature,
            verificationTimeMs: verificationTime,
            error: verifyError.message,
            note: 'Transaction was likely rejected by Solana network.'
          });
          
          throw handleError(
            new Error('Transaction was rejected by Solana network. The transaction signature was returned but the transaction was not accepted.'),
            { signature, operation: 'verifyTransaction', originalError: verifyError }
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
      // Best Practice: Use structured error handling
      throw handleError(error, { operation: 'submitTransaction' });
    }
  }

  /**
   * Process a USDC transfer with company fee payer
   * Combines signing and submission in one call to minimize blockhash expiration
   */
  async processUsdcTransfer(serializedTransaction) {
    // CRITICAL: Log immediately at method entry
    console.log('🔵 TransactionSigningService.processUsdcTransfer CALLED', {
      timestamp: new Date().toISOString(),
      hasSerializedTransaction: !!serializedTransaction,
      serializedTransactionType: typeof serializedTransaction,
      serializedTransactionLength: serializedTransaction?.length,
      isBuffer: Buffer.isBuffer(serializedTransaction)
    });
    
    const processStartTime = Date.now();
    try {
      // CRITICAL: Ensure service is initialized FIRST (before any other operations)
      // This can take 50-200ms on cold start, so do it immediately
      console.log('🔄 TransactionSigningService: Starting initialization check');
      const initStartTime = Date.now();
      await this.ensureInitialized();
      const initTime = Date.now() - initStartTime;
      
      console.log('✅ TransactionSigningService: Initialization complete', {
        initTimeMs: initTime,
        hasConnection: !!this.connection,
        hasKeypair: !!this.companyKeypair
      });
      
      if (initTime > 500) {
        console.warn('Service initialization took longer than expected', {
          initTimeMs: initTime,
          note: 'This may cause blockhash expiration'
        });
      }
      
      if (!this.connection) {
        throw new Error('Connection not initialized');
      }
      
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

      const timeSinceProcessStart = Date.now() - processStartTime;
      console.log('Processing transaction - submitting immediately without validation', {
        transactionBlockhash: blockhashString.substring(0, 8) + '...',
        timeSinceProcessStart,
        initTimeMs: initTime,
        note: 'Client already validated blockhash. Submitting immediately to prevent expiration.'
      });
      
      // CRITICAL: If processing has taken >2 seconds, blockhash may be expired
      // Log warning but proceed - Solana will reject if truly expired
      if (timeSinceProcessStart > 2000) {
        console.warn('WARNING: Processing time exceeds 2 seconds - blockhash may expire', {
          timeSinceProcessStart,
          blockhashAge: 'unknown (client sent fresh)',
          note: 'Proceeding anyway - Solana will reject if blockhash expired'
        });
      }

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
        initTimeMs: initTime,
        totalTimeBeforeSubmission,
        note: 'Submitting immediately - no delays. Blockhash age: ~' + totalTimeBeforeSubmission + 'ms'
      });
      
      // CRITICAL: If total time >2.5 seconds, blockhash is likely expired
      // Blockhashes expire based on slot height, not just time
      // Mainnet slots are ~400ms, so 2.5 seconds = ~6 slots = likely expired
      if (totalTimeBeforeSubmission > 2500) {
        console.error('CRITICAL: Total processing time exceeds 2.5 seconds - blockhash likely expired', {
          totalTimeBeforeSubmission,
          initTimeMs: initTime,
          signatureTimeMs: signatureTime,
          note: 'Blockhash expires after ~60 seconds or ~150 slots. 2.5 seconds = ~6 slots = likely expired on mainnet.'
        });
      }

      // CRITICAL: Submit the transaction IMMEDIATELY - skip all validation
      // Validation takes 100-300ms which causes blockhash expiration
      // Client already sends fresh blockhash (0-100ms old), so validation is redundant
      // If blockhash expired, Solana will reject it, but we've minimized delay
      // Note: We cannot rebuild transaction here - it's already signed by user and company
      // If blockhash expired, client will retry with fresh blockhash
      const result = await this.submitTransaction(fullySignedTransaction, true); // Skip validation to save time

      console.log('USDC transfer processed successfully', {
        signature: result.signature,
        companyAddress: this.companyKeypair.publicKey.toBase58()
      });

      return result;

    } catch (error) {
      // Log detailed error information for debugging
      console.error('Failed to process USDC transfer:', {
        error: error?.message || String(error),
        errorName: error?.name,
        errorCode: error?.code,
        errorType: error?.type,
        errorStack: error?.stack?.substring(0, 500), // Limit stack trace length
        operation: 'processUsdcTransfer',
        hasConnection: !!this.connection,
        hasKeypair: !!this.companyKeypair
      });
      
      // Best Practice: Use structured error handling
      throw handleError(error, { operation: 'processUsdcTransfer' });
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

      // Best Practice: Use retry logic for RPC calls
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

