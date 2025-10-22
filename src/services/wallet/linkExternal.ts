/**
 * External Wallet Linking Service
 * Handles linking and verification of external wallets
 */

import { PublicKey } from '@solana/web3.js';
import { solanaWalletService } from './solanaWallet.deprecated';
import { logger } from '../core/loggingService';

export interface WalletVerificationResult {
  success: boolean;
  verifiedAddress?: string;
  walletType?: 'phantom' | 'solflare' | 'backpack' | 'other';
  error?: string;
}

import type { LinkedWallet } from './LinkedWalletService';

export interface LinkWalletParams {
  address: string;
  walletType: 'phantom' | 'solflare' | 'backpack' | 'other';
  signature: string;
  message: string;
  userId: string;
}

class ExternalWalletLinkingService {
  /**
   * Verify wallet ownership through signature
   */
  async verifyWalletOwnership(params: LinkWalletParams): Promise<WalletVerificationResult> {
    try {
      logger.info('Verifying wallet ownership', {
        address: params.address,
        walletType: params.walletType,
        userId: params.userId
      }, 'ExternalWalletLinkingService');

      // Validate address format
      const addressValidation = this.validateAddress(params.address);
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: addressValidation.error
        };
      }

      // Verify signature
      const signatureValid = await this.verifySignature(
        params.address,
        params.signature,
        params.message
      );

      if (!signatureValid) {
        return {
          success: false,
          error: 'Invalid signature - wallet ownership could not be verified'
        };
      }

      // Store linked wallet
      const now = new Date().toISOString();
      await this.storeLinkedWallet({
        id: `linked_${Date.now()}`,
        userId: params.userId,
        type: 'external',
        label: `${params.walletType} Wallet`,
        address: params.address,
        status: 'active',
        currency: 'SOL',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }, params.userId);

      logger.info('Wallet ownership verified successfully', {
        address: params.address,
        walletType: params.walletType
      }, 'ExternalWalletLinkingService');

      return {
        success: true,
        verifiedAddress: params.address,
        walletType: params.walletType
      };
    } catch (error) {
      logger.error('Failed to verify wallet ownership', error, 'ExternalWalletLinkingService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate nonce for wallet verification
   */
  async generateVerificationNonce(userId: string): Promise<{ nonce: string; message: string }> {
    try {
      const timestamp = Date.now();
      const nonce = `WeSplit_Verification_${userId}_${timestamp}`;
      const message = `Sign this message to verify ownership of your wallet for WeSplit.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      // Store nonce for verification (in a real implementation, this would be stored in a database)
      await this.storeVerificationNonce(nonce, userId, timestamp);

      return { nonce, message };
    } catch (error) {
      logger.error('Failed to generate verification nonce', error, 'ExternalWalletLinkingService');
      throw error;
    }
  }

  /**
   * Get linked wallets for user
   */
  async getLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      const { LinkedWalletService } = await import('./LinkedWalletService');
      return await LinkedWalletService.getLinkedWallets(userId);
    } catch (error) {
      logger.error('Failed to get linked wallets', error, 'ExternalWalletLinkingService');
      return [];
    }
  }

  /**
   * Unlink a wallet
   */
  async unlinkWallet(walletId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, this would update a database
      logger.info('Wallet unlinked', { walletId, userId }, 'ExternalWalletLinkingService');
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to unlink wallet', error, 'ExternalWalletLinkingService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if wallet is linked
   */
  async isWalletLinked(address: string, userId: string): Promise<boolean> {
    try {
      const linkedWallets = await this.getLinkedWallets(userId);
      return linkedWallets.some(wallet => 
        wallet.address === address && wallet.isActive
      );
    } catch (error) {
      logger.error('Failed to check if wallet is linked', error, 'ExternalWalletLinkingService');
      return false;
    }
  }

  /**
   * Validate Solana address
   */
  private validateAddress(address: string): { isValid: boolean; error?: string } {
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
   * Verify signature
   */
  private async verifySignature(
    address: string, 
    signature: string, 
    message: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would verify the signature using the public key
      // For now, we'll implement a basic check
      
      // Convert signature from base58 to bytes
      const signatureBytes = this.base58ToBytes(signature);
      if (!signatureBytes) {
        return false;
      }

      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Verify signature using nacl
      const nacl = await import('tweetnacl');
      const publicKey = new PublicKey(address);
      
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      return isValid;
    } catch (error) {
      logger.error('Failed to verify signature', error, 'ExternalWalletLinkingService');
      return false;
    }
  }

  /**
   * Store linked wallet
   */
  private async storeLinkedWallet(wallet: LinkedWallet, userId: string): Promise<void> {
    try {
      // In a real implementation, this would store in a database
      logger.info('Linked wallet stored', { wallet, userId }, 'ExternalWalletLinkingService');
    } catch (error) {
      logger.error('Failed to store linked wallet', error, 'ExternalWalletLinkingService');
      throw error;
    }
  }

  /**
   * Store verification nonce
   */
  private async storeVerificationNonce(nonce: string, userId: string, timestamp: number): Promise<void> {
    try {
      // In a real implementation, this would store in a database with expiration
      logger.info('Verification nonce stored', { nonce, userId, timestamp }, 'ExternalWalletLinkingService');
    } catch (error) {
      logger.error('Failed to store verification nonce', error, 'ExternalWalletLinkingService');
      throw error;
    }
  }

  /**
   * Convert base58 string to bytes
   */
  private base58ToBytes(base58: string): Uint8Array | null {
    try {
      // In a real implementation, you would use a proper base58 decoder
      // For now, we'll use a simple implementation
      const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let decoded = 0n;
      let multi = 1n;
      
      for (let i = base58.length - 1; i >= 0; i--) {
        const char = base58[i];
        const index = alphabet.indexOf(char);
        if (index === -1) {return null;}
        
        decoded += BigInt(index) * multi;
        multi *= 58n;
      }
      
      // Convert to bytes
      const bytes: number[] = [];
      while (decoded > 0n) {
        bytes.unshift(Number(decoded & 255n));
        decoded >>= 8n;
      }
      
      return new Uint8Array(bytes);
    } catch (error) {
      logger.error('Failed to decode base58', error, 'ExternalWalletLinkingService');
      return null;
    }
  }

  /**
   * Generate deep link for wallet connection
   */
  generateWalletDeepLink(walletType: 'phantom' | 'solflare' | 'backpack'): string {
    const deepLinks = {
      phantom: 'phantom://',
      solflare: 'solflare://',
      backpack: 'backpack://'
    };
    
    return deepLinks[walletType];
  }

  /**
   * Check if wallet app is installed
   */
  async isWalletAppInstalled(walletType: 'phantom' | 'solflare' | 'backpack'): Promise<boolean> {
    try {
      // In a real implementation, this would check if the wallet app is installed
      // For now, return true for testing
      return true;
    } catch (error) {
      logger.error('Failed to check if wallet app is installed', error, 'ExternalWalletLinkingService');
      return false;
    }
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _externalWalletLinkingService: ExternalWalletLinkingService | null = null;

export const externalWalletLinkingService = {
  get instance() {
    if (!_externalWalletLinkingService) {
      _externalWalletLinkingService = new ExternalWalletLinkingService();
    }
    return _externalWalletLinkingService;
  }
};
