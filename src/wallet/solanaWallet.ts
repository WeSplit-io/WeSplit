/**
 * Secure Solana Wallet Implementation
 * Handles wallet creation, storage, export/import with proper security
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { CURRENT_NETWORK } from '../config/chain';
import { logger } from '../services/loggingService';

export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string; // Only available during creation/import
  balance?: number;
  usdcBalance?: number;
  isConnected: boolean;
  walletName: string;
  walletType: 'app-generated' | 'imported';
}

export interface WalletCreationResult {
  success: boolean;
  wallet: WalletInfo;
  mnemonic?: string;
  error?: string;
}

export interface WalletImportResult {
  success: boolean;
  wallet: WalletInfo;
  error?: string;
}

export interface ExportResult {
  success: boolean;
  mnemonic?: string;
  privateKey?: string;
  error?: string;
}

class SolanaWalletService {
  private connection: Connection;
  private keypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(CURRENT_NETWORK.rpcUrl, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
    });
  }

  /**
   * Create a new wallet from mnemonic (optional)
   */
  async createWalletFromMnemonic(mnemonic?: string): Promise<WalletCreationResult> {
    try {
      let keypair: Keypair;
      let generatedMnemonic: string | undefined;

      if (mnemonic) {
        // Import from existing mnemonic
        keypair = await this.importFromMnemonic(mnemonic);
      } else {
        // Generate new mnemonic and keypair
        const result = await this.generateFromMnemonic();
        keypair = result.keypair;
        generatedMnemonic = result.mnemonic;
      }

      const address = keypair.publicKey.toBase58();
      
      // Get initial balance
      const balance = await this.connection.getBalance(keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // Get USDC balance
      let usdcBalance = 0;
      try {
        const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(CURRENT_NETWORK.usdcMintAddress),
          keypair.publicKey
        );
        const tokenAccount = await getAccount(this.connection, usdcTokenAddress);
        usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6); // USDC has 6 decimals
      } catch (error) {
        // Token account doesn't exist yet, balance is 0
        logger.info('USDC token account not found, balance is 0', { address }, 'SolanaWalletService');
      }

      const wallet: WalletInfo = {
        address,
        publicKey: address,
        secretKey: Buffer.from(keypair.secretKey).toString('base64'),
        balance: solBalance,
        usdcBalance,
        isConnected: true,
        walletName: 'App Wallet',
        walletType: mnemonic ? 'imported' : 'app-generated'
      };

      // Store wallet securely
      await this.storeWalletSecurely(wallet);

      logger.info('Wallet created successfully', { 
        address, 
        type: wallet.walletType,
        hasMnemonic: !!generatedMnemonic 
      }, 'SolanaWalletService');

      return {
        success: true,
        wallet,
        mnemonic: generatedMnemonic
      };
    } catch (error) {
      logger.error('Failed to create wallet', error, 'SolanaWalletService');
      return {
        success: false,
        wallet: {} as WalletInfo,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import wallet from mnemonic
   */
  async importWallet(mnemonic: string): Promise<WalletImportResult> {
    try {
      const result = await this.createWalletFromMnemonic(mnemonic);
      return {
        success: result.success,
        wallet: result.wallet,
        error: result.error
      };
    } catch (error) {
      logger.error('Failed to import wallet', error, 'SolanaWalletService');
      return {
        success: false,
        wallet: {} as WalletInfo,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Export mnemonic (requires biometric authentication)
   */
  async exportMnemonic(): Promise<ExportResult> {
    try {
      // Require biometric authentication
      const authResult = await this.requireBiometricAuth('Export Wallet Mnemonic');
      if (!authResult.success) {
        return {
          success: false,
          error: 'Biometric authentication required'
        };
      }

      const mnemonic = await this.getStoredMnemonic();
      if (!mnemonic) {
        return {
          success: false,
          error: 'No mnemonic found for this wallet'
        };
      }

      return {
        success: true,
        mnemonic
      };
    } catch (error) {
      logger.error('Failed to export mnemonic', error, 'SolanaWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Export private key (requires biometric authentication)
   */
  async exportSecretKeyBase58(): Promise<ExportResult> {
    try {
      // Require biometric authentication
      const authResult = await this.requireBiometricAuth('Export Private Key');
      if (!authResult.success) {
        return {
          success: false,
          error: 'Biometric authentication required'
        };
      }

      const privateKey = await this.getStoredPrivateKey();
      if (!privateKey) {
        return {
          success: false,
          error: 'No private key found for this wallet'
        };
      }

      return {
        success: true,
        privateKey
      };
    } catch (error) {
      logger.error('Failed to export private key', error, 'SolanaWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get public key
   */
  getPublicKey(): string | null {
    return this.keypair?.publicKey.toBase58() || null;
  }

  /**
   * Get wallet info for signing
   */
  async getWalletInfo(): Promise<{ address: string; publicKey: string; secretKey?: string } | null> {
    if (!this.keypair) {
      return null;
    }

    return {
      address: this.keypair.publicKey.toBase58(),
      publicKey: this.keypair.publicKey.toBase58(),
      secretKey: Buffer.from(this.keypair.secretKey).toString('base64')
    };
  }

  /**
   * Get wallet balance from on-chain
   */
  async getBalance(): Promise<{ sol: number; usdc: number }> {
    if (!this.keypair) {
      throw new Error('No wallet loaded');
    }

    try {
      // Get SOL balance
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Get USDC balance
      let usdcBalance = 0;
      try {
        const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
        const usdcTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(CURRENT_NETWORK.usdcMintAddress),
          this.keypair.publicKey
        );
        const tokenAccount = await getAccount(this.connection, usdcTokenAddress);
        usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6);
      } catch (error) {
        // Token account doesn't exist, balance is 0
      }

      return { sol: solBalance, usdc: usdcBalance };
    } catch (error) {
      logger.error('Failed to get balance', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Load wallet from secure storage
   */
  async loadWallet(userId?: string, expectedAddress?: string): Promise<boolean> {
    try {
      logger.info('Loading wallet for user', { userId, expectedAddress }, 'SolanaWalletService');
      
      if (!userId || !expectedAddress) {
        logger.error('Missing required parameters for wallet loading', { userId, expectedAddress }, 'SolanaWalletService');
        return false;
      }

        // Try to get the mnemonic first (this is more likely to be the correct wallet)
        try {
          const { walletService } = await import('../services/WalletService');
          
          // Try to get the seed phrase from the walletService
          const seedPhrase = await walletService.getSeedPhrase(userId);
          if (seedPhrase) {
            logger.info('Found seed phrase, attempting to derive keypair', { userId, expectedAddress }, 'SolanaWalletService');
            
            try {
              const bip39 = await import('bip39');
              if (bip39.validateMnemonic(seedPhrase)) {
                // It's a valid mnemonic, derive keypair using the same method as wallet creation
                const { walletService } = await import('../services/WalletService');
                const walletInfo = await walletService.importWallet(seedPhrase);
                
                // Check if this keypair matches the expected address
                if (walletInfo.address === expectedAddress) {
                  // Convert the secret key back to keypair
                  const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
                  const keypair = Keypair.fromSecretKey(secretKeyBuffer);
                  this.keypair = keypair;
                  
                  logger.info('Successfully loaded wallet from seed phrase', { 
                    address: keypair.publicKey.toBase58(),
                    expectedAddress,
                    userId 
                  }, 'SolanaWalletService');
                  return true;
                } else {
                  logger.warn('Derived keypair does not match expected address', {
                    derivedAddress: walletInfo.address,
                    expectedAddress,
                    userId
                  }, 'SolanaWalletService');
                }
              }
            } catch (error) {
              logger.warn('Failed to process seed phrase as mnemonic', { error }, 'SolanaWalletService');
            }
          }
        
        // If seed phrase didn't work, try the stored private key as fallback
        const storedPrivateKey = await walletService.getSecureData(`private_key_${userId}`);
        if (storedPrivateKey) {
          logger.info('Found stored private key, attempting to load', { userId, expectedAddress }, 'SolanaWalletService');
          
          try {
            // Parse the stored private key (it's stored as JSON array)
            const privateKeyArray = JSON.parse(storedPrivateKey);
            const privateKeyBuffer = Buffer.from(privateKeyArray);
            const keypair = Keypair.fromSecretKey(privateKeyBuffer);
            
            // Check if this keypair matches the expected address
            if (keypair.publicKey.toBase58() === expectedAddress) {
              this.keypair = keypair;
              logger.info('Successfully loaded wallet from stored private key', { 
                address: keypair.publicKey.toBase58(),
                expectedAddress,
                userId 
              }, 'SolanaWalletService');
              return true;
            } else {
              logger.warn('Stored private key does not match expected address', {
                storedAddress: keypair.publicKey.toBase58(),
                expectedAddress,
                userId
              }, 'SolanaWalletService');
            }
          } catch (error) {
            logger.warn('Failed to load from stored private key', { error }, 'SolanaWalletService');
          }
        }
        
        // Try the standard storage as last resort
        const standardPrivateKey = await this.getStoredPrivateKey();
        if (standardPrivateKey) {
          logger.info('Found private key in standard storage, attempting to load', { userId, expectedAddress }, 'SolanaWalletService');
          
          try {
            const keypair = Keypair.fromSecretKey(Buffer.from(standardPrivateKey, 'base64'));
            
            if (keypair.publicKey.toBase58() === expectedAddress) {
              this.keypair = keypair;
              logger.info('Successfully loaded wallet from standard storage', { 
                address: keypair.publicKey.toBase58(),
                expectedAddress,
                userId 
              }, 'SolanaWalletService');
              return true;
            } else {
              logger.warn('Standard storage private key does not match expected address', {
                storedAddress: keypair.publicKey.toBase58(),
                expectedAddress,
                userId
              }, 'SolanaWalletService');
            }
          } catch (error) {
            logger.warn('Failed to load from standard storage', { error }, 'SolanaWalletService');
          }
        }
        
      } catch (error) {
        logger.error('Failed to load wallet from secure storage', error, 'SolanaWalletService');
      }

      // If no matching wallet found, try to find any available wallet
      logger.warn('No matching wallet found for expected address, trying to find any available wallet', { 
        userId, 
        expectedAddress 
      }, 'SolanaWalletService');
      
      // Try to load any available wallet as a fallback
      const fallbackWallet = await this.findAnyAvailableWallet(userId);
      if (fallbackWallet) {
        this.keypair = fallbackWallet;
        logger.warn('Loaded fallback wallet (address mismatch)', {
          expectedAddress,
          actualAddress: fallbackWallet.publicKey.toBase58(),
          userId
        }, 'SolanaWalletService');
        return true;
      }
      
      logger.error('No matching wallet found for expected address - this wallet was likely created externally', { 
        userId, 
        expectedAddress 
      }, 'SolanaWalletService');
      
      return false;
    } catch (error) {
      logger.error('Failed to load wallet', error, 'SolanaWalletService');
      return false;
    }
  }

  /**
   * Sign a message with the wallet
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.keypair) {
      throw new Error('No wallet loaded');
    }

    try {
      // Use nacl for signing (ed25519)
      const nacl = await import('tweetnacl');
      const signature = nacl.sign.detached(message, this.keypair.secretKey);
      return signature;
    } catch (error) {
      logger.error('Failed to sign message', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Generate new mnemonic and keypair
   */
  private async generateFromMnemonic(): Promise<{ keypair: Keypair; mnemonic: string }> {
    try {
      // Generate mnemonic using BIP-39
      const bip39 = await import('bip39');
      const mnemonic = bip39.generateMnemonic(256); // 24 words
      
      // Derive keypair from mnemonic
      const keypair = await this.deriveKeypairFromMnemonic(mnemonic);
      
      // Store mnemonic securely
      await this.storeMnemonicSecurely(mnemonic);
      
      return { keypair, mnemonic };
    } catch (error) {
      logger.error('Failed to generate mnemonic', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Import keypair from mnemonic
   */
  private async importFromMnemonic(mnemonic: string): Promise<Keypair> {
    try {
      // Validate mnemonic
      const bip39 = await import('bip39');
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Derive keypair from mnemonic
      const keypair = await this.deriveKeypairFromMnemonic(mnemonic);
      
      // Store mnemonic securely
      await this.storeMnemonicSecurely(mnemonic);
      
      return keypair;
    } catch (error) {
      logger.error('Failed to import from mnemonic', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Derive keypair from mnemonic using BIP-44 path for Solana
   */
  private async deriveKeypairFromMnemonic(mnemonic: string): Promise<Keypair> {
    try {
      const bip39 = await import('bip39');
      const ed25519HdKey = await import('ed25519-hd-key');
      
      // Convert mnemonic to seed
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive key using BIP-44 path for Solana: m/44'/501'/0'/0'
      const derivedSeed = ed25519HdKey.derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
      
      // Create keypair from derived seed
      const keypair = Keypair.fromSeed(derivedSeed);
      
      return keypair;
    } catch (error) {
      logger.error('Failed to derive keypair from mnemonic', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Find the correct keypair that matches the expected address
   */
  private async findCorrectKeypair(mnemonic: string, expectedAddress: string): Promise<Keypair | null> {
    try {
      const bip39 = await import('bip39');
      const ed25519HdKey = await import('ed25519-hd-key');
      
      // Convert mnemonic to seed
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Try different derivation paths
      const derivationPaths = [
        "m/44'/501'/0'/0'",  // Standard Solana path
        "m/44'/501'/0'/0",   // Without hardened derivation
        "m/44'/501'/0'",     // Shorter path
        "m/44'/501'",        // Even shorter path
        "m/44'/501'/0'/1'",  // Different account index
        "m/44'/501'/1'/0'",  // Different change index
      ];
      
      for (const path of derivationPaths) {
        try {
          const derivedSeed = ed25519HdKey.derivePath(path, seed.toString('hex')).key;
          const keypair = Keypair.fromSeed(derivedSeed);
          
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Found matching keypair with derivation path', {
              path,
              address: keypair.publicKey.toBase58(),
              expectedAddress
            }, 'SolanaWalletService');
            return keypair;
          }
        } catch (error) {
          // Continue to next path if this one fails
          continue;
        }
      }
      
      logger.warn('No matching keypair found for expected address', {
        expectedAddress,
        triedPaths: derivationPaths.length
      }, 'SolanaWalletService');
      
      return null;
    } catch (error) {
      logger.error('Failed to find correct keypair', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Store wallet securely
   */
  private async storeWalletSecurely(wallet: WalletInfo): Promise<void> {
    try {
      if (wallet.secretKey) {
        await SecureStore.setItemAsync('wallet_private_key', wallet.secretKey, {
          requireAuthentication: true,
          authenticationPrompt: 'Access your wallet private key'
        });
      }
    } catch (error) {
      logger.error('Failed to store wallet securely', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Store mnemonic securely
   */
  private async storeMnemonicSecurely(mnemonic: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('wallet_mnemonic', mnemonic, {
        requireAuthentication: true,
        authenticationPrompt: 'Access your wallet mnemonic'
      });
    } catch (error) {
      logger.error('Failed to store mnemonic securely', error, 'SolanaWalletService');
      throw error;
    }
  }

  /**
   * Get stored private key
   */
  private async getStoredPrivateKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('wallet_private_key', {
        requireAuthentication: true,
        authenticationPrompt: 'Access your wallet private key'
      });
    } catch (error) {
      logger.error('Failed to get stored private key', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Get stored mnemonic
   */
  private async getStoredMnemonic(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('wallet_mnemonic', {
        requireAuthentication: true,
        authenticationPrompt: 'Access your wallet mnemonic'
      });
    } catch (error) {
      logger.error('Failed to get stored mnemonic', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Load wallet with sufficient balance for transaction
   */
  async loadWalletWithBalance(userId: string, expectedAddress: string, currency: 'SOL' | 'USDC'): Promise<boolean> {
    try {
      logger.info('Loading wallet with balance for transaction', { userId, expectedAddress, currency }, 'SolanaWalletService');
      
      // First try to load the expected wallet
      const expectedWalletLoaded = await this.loadWallet(userId, expectedAddress);
      if (expectedWalletLoaded) {
        // Check if this wallet has sufficient balance
        const balance = await this.getBalance();
        const hasBalance = currency === 'SOL' ? balance.sol > 0 : balance.usdc > 0;
        
        if (hasBalance) {
          logger.info('Expected wallet has sufficient balance', { 
            address: expectedAddress, 
            balance: currency === 'SOL' ? balance.sol : balance.usdc,
            currency 
          }, 'SolanaWalletService');
          return true;
        } else {
          logger.warn('Expected wallet has no balance', { 
            address: expectedAddress, 
            balance: currency === 'SOL' ? balance.sol : balance.usdc,
            currency 
          }, 'SolanaWalletService');
        }
      }
      
      // Try to find any wallet with sufficient balance
      const { walletService } = await import('../services/WalletService');
      
      // First, try to find the wallet that matches the expected address by checking all stored credentials
      const expectedWallet = await this.findWalletByAddress(userId, expectedAddress);
      if (expectedWallet) {
        this.keypair = expectedWallet;
        logger.info('Found expected wallet with credentials', { 
          address: expectedWallet.publicKey.toBase58(),
          expectedAddress 
        }, 'SolanaWalletService');
        return true;
      }
      
      // If we can't find the expected wallet, we need to find ANY wallet that has the required balance
      // This is a critical fallback for cases where the user has multiple wallets
      logger.warn('Expected wallet not found, searching for any wallet with sufficient balance', {
        expectedAddress,
        currency
      }, 'SolanaWalletService');
      
      // Try stored private key
      // Secure storage functionality moved to walletService
      const storedPrivateKey = null; // Placeholder
      if (storedPrivateKey) {
        try {
          const privateKeyArray = JSON.parse(storedPrivateKey);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const keypair = Keypair.fromSecretKey(privateKeyBuffer);
          
          // Check balance for this wallet
          const tempConnection = new Connection(CURRENT_NETWORK.rpcUrl, {
            commitment: CURRENT_NETWORK.commitment,
            confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
          });
          
          const balance = await tempConnection.getBalance(keypair.publicKey);
          const solBalance = balance / LAMPORTS_PER_SOL;
          
          // Check USDC balance if needed
          let usdcBalance = 0;
          if (currency === 'USDC') {
            try {
              const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
              const usdcTokenAddress = await getAssociatedTokenAddress(
                new PublicKey(CURRENT_NETWORK.usdcMintAddress),
                keypair.publicKey
              );
              const tokenAccount = await getAccount(tempConnection, usdcTokenAddress);
              usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6);
            } catch (error) {
              // Token account doesn't exist, balance is 0
            }
          }
          
          const hasBalance = currency === 'SOL' ? solBalance > 0 : usdcBalance > 0;
          
          logger.info('Checked wallet balance', {
            address: keypair.publicKey.toBase58(),
            solBalance,
            usdcBalance,
            currency,
            hasBalance
          }, 'SolanaWalletService');
          
          if (hasBalance) {
            this.keypair = keypair;
            logger.info('Found wallet with sufficient balance', { 
              address: keypair.publicKey.toBase58(),
              balance: currency === 'SOL' ? solBalance : usdcBalance,
              currency 
            }, 'SolanaWalletService');
            return true;
          }
        } catch (error) {
          logger.warn('Failed to check balance for stored private key', { error }, 'SolanaWalletService');
        }
      }
      
      // Try stored seed phrase
      // Secure storage functionality moved to walletService
      const seedPhrase = null; // Placeholder
      if (seedPhrase) {
        try {
          const bip39 = await import('bip39');
          if (bip39.validateMnemonic(seedPhrase)) {
            const { walletService } = await import('../services/WalletService');
            const walletInfo = await walletService.importWallet(seedPhrase);
            
            // Check balance for this wallet
            const tempConnection = new Connection(CURRENT_NETWORK.rpcUrl, {
              commitment: CURRENT_NETWORK.commitment,
              confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
            });
            
            const balance = await tempConnection.getBalance(new PublicKey(walletInfo.address));
            const solBalance = balance / LAMPORTS_PER_SOL;
            
            // Check USDC balance if needed
            let usdcBalance = 0;
            if (currency === 'USDC') {
              try {
                const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
                const usdcTokenAddress = await getAssociatedTokenAddress(
                  new PublicKey(CURRENT_NETWORK.usdcMintAddress),
                  new PublicKey(walletInfo.address)
                );
                const tokenAccount = await getAccount(tempConnection, usdcTokenAddress);
                usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6);
              } catch (error) {
                // Token account doesn't exist, balance is 0
              }
            }
            
            const hasBalance = currency === 'SOL' ? solBalance > 0 : usdcBalance > 0;
            
            logger.info('Checked wallet balance from seed phrase', {
              address: walletInfo.address,
              solBalance,
              usdcBalance,
              currency,
              hasBalance
            }, 'SolanaWalletService');
            
            if (hasBalance) {
              const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
              const keypair = Keypair.fromSecretKey(secretKeyBuffer);
              this.keypair = keypair;
              logger.info('Found wallet with sufficient balance from seed phrase', { 
                address: keypair.publicKey.toBase58(),
                balance: currency === 'SOL' ? solBalance : usdcBalance,
                currency 
              }, 'SolanaWalletService');
              return true;
            }
          }
        } catch (error) {
          logger.warn('Failed to check balance for stored seed phrase', { error }, 'SolanaWalletService');
        }
      }
      
      // Last resort: Try to find the wallet with USDC balance by checking the expected address directly
      if (currency === 'USDC') {
        logger.info('Last resort: Checking if expected address has USDC balance', {
          expectedAddress,
          currency
        }, 'SolanaWalletService');
        
        try {
          const tempConnection = new Connection(CURRENT_NETWORK.rpcUrl, {
            commitment: CURRENT_NETWORK.commitment,
            confirmTransactionInitialTimeout: CURRENT_NETWORK.timeout,
          });
          
          // Check if the expected address has USDC balance
          const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');
          const usdcTokenAddress = await getAssociatedTokenAddress(
            new PublicKey(CURRENT_NETWORK.usdcMintAddress),
            new PublicKey(expectedAddress)
          );
          
          try {
            const tokenAccount = await getAccount(tempConnection, usdcTokenAddress);
            const usdcBalance = Number(tokenAccount.amount) / Math.pow(10, 6);
            
            if (usdcBalance > 0) {
              logger.warn('Expected address has USDC balance but we cannot find the private key', {
                expectedAddress,
                usdcBalance,
                issue: 'The wallet with USDC balance exists but we do not have the private key for it. The user needs to import their wallet.'
              }, 'SolanaWalletService');
              
              // Try to find the wallet using different derivation paths from the stored seed phrase
              // Get seed phrase from walletService
          const seedPhrase = await walletService.getSeedPhrase(userId);
              if (seedPhrase) {
                logger.info('Attempting to find wallet using different derivation paths', {
                  expectedAddress,
                  seedPhrase: seedPhrase.substring(0, 20) + '...'
                }, 'SolanaWalletService');
                
                const foundWallet = await this.tryMultipleDerivationPaths(seedPhrase, expectedAddress);
                if (foundWallet) {
                  this.keypair = foundWallet;
                  logger.info('Found wallet using alternative derivation path', {
                    address: foundWallet.publicKey.toBase58(),
                    expectedAddress
                  }, 'SolanaWalletService');
                  return true;
                }
              }
              
              // This is a critical error - the user has USDC in a wallet we can't access
              return false;
            }
          } catch (error) {
            logger.info('Expected address has no USDC token account', { expectedAddress }, 'SolanaWalletService');
          }
        } catch (error) {
          logger.warn('Failed to check USDC balance for expected address', { error }, 'SolanaWalletService');
        }
      }
      
      logger.error('No wallet with sufficient balance found', { userId, expectedAddress, currency }, 'SolanaWalletService');
      return false;
    } catch (error) {
      logger.error('Failed to load wallet with balance', error, 'SolanaWalletService');
      return false;
    }
  }

  /**
   * Find wallet by address from stored credentials
   */
  private async findWalletByAddress(userId: string, expectedAddress: string): Promise<Keypair | null> {
    try {
      const { walletService } = await import('../services/WalletService');
      
      // Try stored private key first
      // Secure storage functionality moved to walletService
      const storedPrivateKey = null; // Placeholder
      if (storedPrivateKey) {
        try {
          const privateKeyArray = JSON.parse(storedPrivateKey);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const keypair = Keypair.fromSecretKey(privateKeyBuffer);
          
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Found wallet by address from stored private key', { 
              address: keypair.publicKey.toBase58(),
              expectedAddress 
            }, 'SolanaWalletService');
            return keypair;
          }
        } catch (error) {
          logger.warn('Failed to check stored private key for address match', { error }, 'SolanaWalletService');
        }
      }
      
      // Try stored seed phrase
      // Secure storage functionality moved to walletService
      const seedPhrase = null; // Placeholder
      if (seedPhrase) {
        try {
          const bip39 = await import('bip39');
          if (bip39.validateMnemonic(seedPhrase)) {
            const { walletService } = await import('../services/WalletService');
            const walletInfo = await walletService.importWallet(seedPhrase);
            
            if (walletInfo.address === expectedAddress) {
              const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
              const keypair = Keypair.fromSecretKey(secretKeyBuffer);
              logger.info('Found wallet by address from stored seed phrase', { 
                address: keypair.publicKey.toBase58(),
                expectedAddress 
              }, 'SolanaWalletService');
              return keypair;
            }
          }
        } catch (error) {
          logger.warn('Failed to check stored seed phrase for address match', { error }, 'SolanaWalletService');
        }
      }
      
      // Try standard storage
      const standardPrivateKey = await this.getStoredPrivateKey();
      if (standardPrivateKey) {
        try {
          const keypair = Keypair.fromSecretKey(Buffer.from(standardPrivateKey, 'base64'));
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Found wallet by address from standard storage', { 
              address: keypair.publicKey.toBase58(),
              expectedAddress 
            }, 'SolanaWalletService');
            return keypair;
          }
        } catch (error) {
          logger.warn('Failed to check standard storage for address match', { error }, 'SolanaWalletService');
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find wallet by address', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Try multiple derivation paths to find a wallet matching the target address
   */
  async tryMultipleDerivationPaths(seedPhrase: string, targetAddress: string): Promise<Keypair | null> {
    try {
      const { walletService } = await import('../services/WalletService');
      
      // Common Solana derivation paths to try
      const derivationPaths = [
        "m/44'/501'/0'/0'",    // Standard BIP44 Solana
        "m/44'/501'/0'",       // Alternative
        "m/44'/501'/0'/0'/0'", // Extended
        "m/44'/501'/1'/0'",    // Account 1
        "m/44'/501'/0'/1'",    // Change 1
        "m/44'/501'/0'/0'/1'", // Extended change
      ];
      
      for (const path of derivationPaths) {
        try {
          logger.info('Trying derivation path', { path, targetAddress }, 'SolanaWalletService');
          
          // Import wallet with specific derivation path
          const walletInfo = await walletService.importWallet(seedPhrase, path);
          
          if (walletInfo.address === targetAddress) {
            logger.info('Found matching wallet with derivation path', { 
              path, 
              address: walletInfo.address 
            }, 'SolanaWalletService');
            
            const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
            return Keypair.fromSecretKey(secretKeyBuffer);
          }
        } catch (error) {
          // Continue to next path
          logger.debug('Derivation path failed', { path, error }, 'SolanaWalletService');
        }
      }
      
      logger.warn('No matching wallet found with any derivation path', { targetAddress }, 'SolanaWalletService');
      return null;
    } catch (error) {
      logger.error('Failed to try multiple derivation paths', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Find any available wallet for the user (fallback method)
   */
  private async findAnyAvailableWallet(userId: string): Promise<Keypair | null> {
    try {
      const { walletService } = await import('../services/WalletService');
      
      // Try to get any stored private key
      // Secure storage functionality moved to walletService
      const storedPrivateKey = null; // Placeholder
      if (storedPrivateKey) {
        try {
          const privateKeyArray = JSON.parse(storedPrivateKey);
          const privateKeyBuffer = Buffer.from(privateKeyArray);
          const keypair = Keypair.fromSecretKey(privateKeyBuffer);
          logger.info('Found fallback wallet from stored private key', { 
            address: keypair.publicKey.toBase58(),
            userId 
          }, 'SolanaWalletService');
          return keypair;
        } catch (error) {
          logger.warn('Failed to load fallback wallet from stored private key', { error }, 'SolanaWalletService');
        }
      }

      // Try to get any stored seed phrase
      // Secure storage functionality moved to walletService
      const seedPhrase = null; // Placeholder
      if (seedPhrase) {
        try {
          const bip39 = await import('bip39');
          if (bip39.validateMnemonic(seedPhrase)) {
            const { walletService } = await import('../services/WalletService');
            const walletInfo = await walletService.importWallet(seedPhrase);
            const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
            const keypair = Keypair.fromSecretKey(secretKeyBuffer);
            logger.info('Found fallback wallet from stored seed phrase', { 
              address: keypair.publicKey.toBase58(),
              userId 
            }, 'SolanaWalletService');
            return keypair;
          }
        } catch (error) {
          logger.warn('Failed to load fallback wallet from stored seed phrase', { error }, 'SolanaWalletService');
        }
      }

      // Try standard storage as last resort
      const standardPrivateKey = await this.getStoredPrivateKey();
      if (standardPrivateKey) {
        try {
          const keypair = Keypair.fromSecretKey(Buffer.from(standardPrivateKey, 'base64'));
          logger.info('Found fallback wallet from standard storage', { 
            address: keypair.publicKey.toBase58(),
            userId 
          }, 'SolanaWalletService');
          return keypair;
        } catch (error) {
          logger.warn('Failed to load fallback wallet from standard storage', { error }, 'SolanaWalletService');
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to find any available wallet', error, 'SolanaWalletService');
      return null;
    }
  }

  /**
   * Require biometric authentication
   */
  private async requireBiometricAuth(reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device'
        };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedTypes.length === 0) {
        return {
          success: false,
          error: 'No biometric authentication methods available'
        };
      }

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      return {
        success: result.success,
        error: result.success ? undefined : 'Authentication failed'
      };
    } catch (error) {
      logger.error('Biometric authentication failed', error, 'SolanaWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error'
      };
    }
  }

  /**
   * Clear wallet from memory and storage
   */
  async clearWallet(): Promise<void> {
    try {
      this.keypair = null;
      await SecureStore.deleteItemAsync('wallet_private_key');
      await SecureStore.deleteItemAsync('wallet_mnemonic');
      
      logger.info('Wallet cleared from memory and storage', {}, 'SolanaWalletService');
    } catch (error) {
      logger.error('Failed to clear wallet', error, 'SolanaWalletService');
      throw error;
    }
  }
}

// Export singleton instance
export const solanaWalletService = new SolanaWalletService();
