/**
 * Wallet Validation Service
 * Comprehensive wallet validation and recovery service to fix off-curve wallet issues
 * Ensures proper ed25519 curve validation and correct derivation paths
 */

import { logger } from '../../core';
import { Keypair, PublicKey } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import * as bip39 from 'bip39';

export interface WalletValidationResult {
  success: boolean;
  wallet?: {
    keypair: Keypair;
    address: string;
    derivationPath: string;
  };
  error?: string;
  issues?: string[];
}

export interface WalletRecoveryResult {
  success: boolean;
  recoveredWallet?: {
    keypair: Keypair;
    address: string;
    derivationPath: string;
  };
  error?: string;
  recoveryMethod?: string;
}

export class WalletValidationService {
  // Standard Solana derivation paths in order of preference
  private static readonly DERIVATION_PATHS = [
    "m/44'/501'/0'/0'",  // Standard Solana path (most common)
    "m/44'/501'/0'/0",    // Without hardened derivation
    "m/44'/501'/0'",      // Shorter path
    "m/44'/501'",         // Even shorter path
  ];

  /**
   * Validate a keypair to ensure it's on the correct ed25519 curve
   */
  static validateKeypairCurve(keypair: Keypair): { isValid: boolean; error?: string } {
    try {
      // Test if the keypair can sign a message (this validates the curve)
      const testMessage = new Uint8Array([1, 2, 3, 4]);
      const signature = keypair.sign(testMessage);
      
      // Verify the signature using the public key
      const isValid = Keypair.fromPublicKey(keypair.publicKey).verify(testMessage, signature);
      
      if (!isValid) {
        return {
          isValid: false,
          error: 'Keypair failed signature verification - likely off-curve'
        };
      }

      // Additional validation: check if the public key is valid
      const publicKeyString = keypair.publicKey.toBase58();
      if (publicKeyString.length !== 44) {
        return {
          isValid: false,
          error: 'Invalid public key length'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Keypair validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate a wallet address format
   */
  static validateWalletAddress(address: string): { isValid: boolean; error?: string } {
    try {
      const publicKey = new PublicKey(address);
      const addressString = publicKey.toBase58();
      
      if (addressString !== address) {
        return {
          isValid: false,
          error: 'Address format mismatch'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid wallet address: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Find the correct keypair from a mnemonic that matches the expected address
   */
  static async findCorrectKeypairFromMnemonic(
    mnemonic: string, 
    expectedAddress: string
  ): Promise<WalletValidationResult> {
    try {
      logger.info('Finding correct keypair from mnemonic', { 
        expectedAddress,
        mnemonicLength: mnemonic.split(' ').length 
      }, 'WalletValidationService');

      // Validate mnemonic first
      if (!bip39.validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Invalid BIP39 mnemonic'
        };
      }

      // Convert mnemonic to seed
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      // Try each derivation path
      for (const derivationPath of this.DERIVATION_PATHS) {
        try {
          logger.debug('Trying derivation path', { derivationPath }, 'WalletValidationService');
          
          const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
          const keypair = Keypair.fromSeed(derivedSeed);
          
          // Validate the keypair is on the correct curve
          const curveValidation = this.validateKeypairCurve(keypair);
          if (!curveValidation.isValid) {
            logger.warn('Keypair failed curve validation', { 
              derivationPath, 
              error: curveValidation.error 
            }, 'WalletValidationService');
            continue;
          }
          
          const derivedAddress = keypair.publicKey.toBase58();
          
          if (derivedAddress === expectedAddress) {
            logger.info('Found matching keypair', { 
              derivationPath, 
              address: derivedAddress 
            }, 'WalletValidationService');
            
            return {
              success: true,
              wallet: {
                keypair,
                address: derivedAddress,
                derivationPath
              }
            };
          }
        } catch (error) {
          logger.debug('Derivation path failed', { 
            derivationPath, 
            error: error instanceof Error ? error.message : String(error) 
          }, 'WalletValidationService');
          continue;
        }
      }
      
      return {
        success: false,
        error: 'No valid keypair found for the expected address with any derivation path'
      };
    } catch (error) {
      logger.error('Failed to find correct keypair from mnemonic', error, 'WalletValidationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate and recover a wallet from stored credentials
   */
  static async validateAndRecoverWallet(
    userId: string,
    expectedAddress: string,
    storedCredentials: {
      mnemonic?: string;
      privateKey?: string;
      derivationPath?: string;
    }
  ): Promise<WalletRecoveryResult> {
    try {
      logger.info('Validating and recovering wallet', { 
        userId, 
        expectedAddress,
        hasMnemonic: !!storedCredentials.mnemonic,
        hasPrivateKey: !!storedCredentials.privateKey
      }, 'WalletValidationService');

      // Method 1: Try mnemonic recovery if available
      if (storedCredentials.mnemonic) {
        const mnemonicResult = await this.findCorrectKeypairFromMnemonic(
          storedCredentials.mnemonic, 
          expectedAddress
        );
        
        if (mnemonicResult.success && mnemonicResult.wallet) {
          logger.info('Wallet recovered from mnemonic', { 
            userId, 
            address: mnemonicResult.wallet.address,
            derivationPath: mnemonicResult.wallet.derivationPath
          }, 'WalletValidationService');
          
          return {
            success: true,
            recoveredWallet: mnemonicResult.wallet,
            recoveryMethod: 'mnemonic'
          };
        }
      }

      // Method 2: Try private key recovery if available
      if (storedCredentials.privateKey) {
        try {
          // Try different private key formats
          const privateKeyFormats = [
            storedCredentials.privateKey, // Raw format
            Buffer.from(storedCredentials.privateKey, 'base64'), // Base64 format
            Buffer.from(JSON.parse(storedCredentials.privateKey)), // JSON array format
          ];

          for (const privateKeyFormat of privateKeyFormats) {
            try {
              const keypair = Keypair.fromSecretKey(privateKeyFormat);
              
              // Validate the keypair is on the correct curve
              const curveValidation = this.validateKeypairCurve(keypair);
              if (!curveValidation.isValid) {
                continue;
              }
              
              const derivedAddress = keypair.publicKey.toBase58();
              
              if (derivedAddress === expectedAddress) {
                logger.info('Wallet recovered from private key', { 
                  userId, 
                  address: derivedAddress 
                }, 'WalletValidationService');
                
                return {
                  success: true,
                  recoveredWallet: {
                    keypair,
                    address: derivedAddress,
                    derivationPath: 'private_key'
                  },
                  recoveryMethod: 'private_key'
                };
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          logger.warn('Private key recovery failed', { 
            userId, 
            error: error instanceof Error ? error.message : String(error) 
          }, 'WalletValidationService');
        }
      }

      return {
        success: false,
        error: 'Unable to recover wallet with stored credentials'
      };
    } catch (error) {
      logger.error('Failed to validate and recover wallet', error, 'WalletValidationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Comprehensive wallet validation and repair
   */
  static async validateAndRepairWallet(
    userId: string,
    expectedAddress: string
  ): Promise<WalletRecoveryResult> {
    try {
      logger.info('Starting comprehensive wallet validation and repair', { 
        userId, 
        expectedAddress 
      }, 'WalletValidationService');

      // Step 1: Validate the expected address format
      const addressValidation = this.validateWalletAddress(expectedAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: `Invalid expected address: ${addressValidation.error}`
        };
      }

      // Step 2: Try to get stored credentials
      const { WalletRecoveryService } = await import('./walletRecoveryService');
      const storedWallets = await WalletRecoveryService.getStoredWallets(userId);
      
      if (storedWallets.length === 0) {
        return {
          success: false,
          error: 'No stored wallet credentials found'
        };
      }

      // Step 3: Try to find a matching wallet
      for (const storedWallet of storedWallets) {
        if (storedWallet.address === expectedAddress || storedWallet.publicKey === expectedAddress) {
          logger.info('Found matching stored wallet', { 
            userId, 
            storedAddress: storedWallet.address,
            expectedAddress
          }, 'WalletValidationService');

          // Try to recover using stored credentials
          const recoveryResult = await this.validateAndRecoverWallet(userId, expectedAddress, {
            mnemonic: storedWallet.mnemonic,
            privateKey: storedWallet.privateKey,
            derivationPath: storedWallet.derivationPath
          });

          if (recoveryResult.success) {
            return recoveryResult;
          }
        }
      }

      // Step 4: Try comprehensive recovery from all stored wallets
      logger.info('Trying comprehensive recovery from all stored wallets', { 
        userId, 
        storedWalletsCount: storedWallets.length 
      }, 'WalletValidationService');

      for (const storedWallet of storedWallets) {
        const recoveryResult = await this.validateAndRecoverWallet(userId, expectedAddress, {
          mnemonic: storedWallet.mnemonic,
          privateKey: storedWallet.privateKey,
          derivationPath: storedWallet.derivationPath
        });

        if (recoveryResult.success) {
          return recoveryResult;
        }
      }

      return {
        success: false,
        error: 'Unable to recover wallet with any stored credentials'
      };
    } catch (error) {
      logger.error('Failed to validate and repair wallet', error, 'WalletValidationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get wallet balance with validation
   */
  static async getValidatedWalletBalance(
    walletAddress: string,
    currency: 'SOL' | 'USDC' = 'USDC'
  ): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      // Validate wallet address first
      const addressValidation = this.validateWalletAddress(walletAddress);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: `Invalid wallet address: ${addressValidation.error}`
        };
      }

      // Get balance using the validated address
      const { BalanceUtils } = await import('../../shared/balanceUtils');
      const { getConfig } = await import('../../../config/unified');
      
      const publicKey = new PublicKey(walletAddress);
      
      if (currency === 'USDC') {
        const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);
        const balanceResult = await BalanceUtils.getUsdcBalance(publicKey, usdcMint);
        
        return {
          success: true,
          balance: balanceResult.balance
        };
      } else {
        const balance = await BalanceUtils.getSolBalance(publicKey);
        return {
          success: true,
          balance: balance
        };
      }
    } catch (error) {
      logger.error('Failed to get validated wallet balance', error, 'WalletValidationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const walletValidationService = WalletValidationService;
