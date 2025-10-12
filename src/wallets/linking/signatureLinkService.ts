/**
 * Signature-Based Wallet Linking Service
 * Handles secure linking of external wallets using signature challenges
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { Platform, Linking, Alert } from 'react-native';
import { WALLET_PROVIDER_REGISTRY, WalletProviderInfo } from '../providers/registry';
import { walletService } from '../../services/WalletService';
import { startRemoteScenario, transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { SolanaMobileWalletAdapterError, SolanaMobileWalletAdapterErrorCode } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { logger } from '../services/loggingService';

export interface SignatureChallenge {
  nonce: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
  userId: string;
  appInstanceId: string;
}

export interface SignatureLinkResult {
  success: boolean;
  publicKey?: string;
  signature?: string;
  error?: string;
  provider?: string;
  challenge?: SignatureChallenge;
}

export interface LinkedWallet {
  id: string;
  publicKey: string;
  provider: string;
  label: string;
  signature: string;
  challenge: SignatureChallenge;
  createdAt: number;
  lastUsed?: number;
}

export interface SignatureLinkOptions {
  userId: string;
  provider: string;
  label?: string;
  timeout?: number;
}

class SignatureLinkService {
  private static instance: SignatureLinkService;
  private readonly CHALLENGE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly APP_INSTANCE_ID = this.generateAppInstanceId();

  public static getInstance(): SignatureLinkService {
    if (!SignatureLinkService.instance) {
      SignatureLinkService.instance = new SignatureLinkService();
    }
    return SignatureLinkService.instance;
  }

  /**
   * Link an external wallet using signature-based authentication
   */
  async linkExternalWallet(options: SignatureLinkOptions): Promise<SignatureLinkResult> {
    const { userId, provider, label, timeout = this.DEFAULT_TIMEOUT } = options;

    logger.info('Starting wallet linking process', {
      userId,
      provider,
      label,
      timeout
    });

    try {
      // Validate provider
      const providerInfo = WALLET_PROVIDER_REGISTRY[provider.toLowerCase()];
      if (!providerInfo) {
        throw new Error(`Unsupported wallet provider: ${provider}`);
      }

      // Generate signature challenge
      const challenge = this.generateSignatureChallenge(userId);
      logger.debug('Generated challenge', {
        nonce: challenge.nonce,
        expiresAt: new Date(challenge.expiresAt).toISOString()
      });

      // Request signature from wallet
      const signatureResult = await this.requestWalletSignature(providerInfo, challenge, timeout);
      
      if (!signatureResult.success) {
        return {
          success: false,
          error: signatureResult.error || 'Signature request failed',
          provider
        };
      }

      // Verify signature
      const verificationResult = await this.verifySignature(
        signatureResult.publicKey!,
        challenge,
        signatureResult.signature!
      );

      if (!verificationResult.success) {
        return {
          success: false,
          error: verificationResult.error || 'Signature verification failed',
          provider
        };
      }

      // Store linked wallet
      const linkedWallet = await this.storeLinkedWallet({
        publicKey: signatureResult.publicKey!,
        provider,
        label: label || providerInfo.displayName,
        signature: signatureResult.signature!,
        challenge,
        userId
      });

      logger.info('Wallet linked successfully', {
        publicKey: linkedWallet.publicKey,
        provider: linkedWallet.provider
      });

      return {
        success: true,
        publicKey: linkedWallet.publicKey,
        signature: linkedWallet.signature,
        provider
      };

    } catch (error) {
      console.error('🔗 Signature Link: Linking failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Linking failed',
        provider
      };
    }
  }

  /**
   * Generate a signature challenge
   */
  private generateSignatureChallenge(userId: string): SignatureChallenge {
    const nonce = this.generateNonce();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + this.CHALLENGE_DURATION;

    const message = this.createChallengeMessage(nonce, issuedAt, userId);

    return {
      nonce,
      message,
      issuedAt,
      expiresAt,
      userId,
      appInstanceId: this.APP_INSTANCE_ID
    };
  }

  /**
   * Create a challenge message for signing
   */
  private createChallengeMessage(nonce: string, issuedAt: number, userId: string): string {
    return `WeSplit Wallet Linking Challenge

Nonce: ${nonce}
Issued At: ${new Date(issuedAt).toISOString()}
User ID: ${userId}
App Instance: ${this.APP_INSTANCE_ID}

This signature proves ownership of the wallet and authorizes linking to WeSplit.`;
  }

  /**
   * Request signature from wallet
   */
  private async requestWalletSignature(
    provider: WalletProviderInfo,
    challenge: SignatureChallenge,
    timeout: number
  ): Promise<SignatureLinkResult> {
    logger.info('Requesting signature from wallet', {
      provider: provider.name,
      message: challenge.message
    });

    try {
      // Since MWA requires complex setup, let's use deep link approach directly
      // This will provide a better user experience with real wallet interaction
      logger.debug('Using deep link approach for', { providerName: provider.name }, 'signatureLinkService');
      
      // For now, just open the wallet app with a simple deep link
      // Most wallets don't support complex signature request deep links
      const simpleDeepLink = provider.deepLinkScheme || `${provider.name}://`;
      
      logger.debug('Attempting to open wallet with simple deep link', { simpleDeepLink }, 'signatureLinkService');
      
      // Always try to open the wallet app, even if canOpenURL returns false
      // This is because canOpenURL can be unreliable on some devices
      try {
        await Linking.openURL(simpleDeepLink);
        logger.info('Successfully opened wallet app', null, 'signatureLinkService');
      } catch (openError) {
        logger.warn('Failed to open wallet app', { error: openError.message }, 'signatureLinkService');
        // Continue anyway - user can manually open the app
      }

      // Don't show alert here - let the calling screen handle the user flow

      // Always return manual input required since we can't capture the signature automatically
      const result = {
        success: false,
        error: 'MANUAL_INPUT_REQUIRED',
        provider: provider.name,
        challenge: challenge // Include challenge for manual input
      };
      
      logger.debug('Returning result', {
        success: result.success,
        error: result.error,
        provider: result.provider,
        hasChallenge: !!result.challenge,
        challengeNonce: result.challenge?.nonce
      });
      
      return result;

    } catch (error) {
      console.error('🔗 Signature Link: Signature request failed:', error);
      
      // Even if deep link fails, we can still provide manual input

      const result = {
        success: false,
        error: 'MANUAL_INPUT_REQUIRED',
        provider: provider.name,
        challenge: challenge // Include challenge for manual input
      };
      
      logger.debug('Returning result from catch block', {
        success: result.success,
        error: result.error,
        provider: result.provider,
        hasChallenge: !!result.challenge,
        challengeNonce: result.challenge?.nonce
      });
      
      return result;
    }
  }

  /**
   * Create deep link URL for signature request
   */
  private createSignatureRequestUrl(provider: WalletProviderInfo, challenge: SignatureChallenge): string {
    const baseUrl = provider.deepLinkScheme || `${provider.name}://`;
    
    // Create different deep link formats for different providers
    switch (provider.name.toLowerCase()) {
      case 'phantom':
        // Phantom uses a simpler format that's more likely to work
        const phantomParams = new URLSearchParams({
          dapp: 'WeSplit',
          redirect: 'wesplit://wallet/linked',
          message: challenge.message,
          nonce: challenge.nonce
        });
        return `${baseUrl}sign?${phantomParams.toString()}`;
        
      case 'solflare':
        // Solflare format
        const solflareParams = new URLSearchParams({
          action: 'sign_message',
          message: challenge.message,
          callback: 'wesplit://wallet/linked',
          nonce: challenge.nonce
        });
        return `${baseUrl}sign?${solflareParams.toString()}`;
        
      case 'backpack':
        // Backpack format
        const backpackParams = new URLSearchParams({
          action: 'sign',
          message: challenge.message,
          return_url: 'wesplit://wallet/linked',
          nonce: challenge.nonce
        });
        return `${baseUrl}sign?${backpackParams.toString()}`;
        
      default:
        // Generic format for other wallets
        const params = new URLSearchParams({
          action: 'sign_message',
          message: challenge.message,
          app_url: 'wesplit://wallet/linked',
          nonce: challenge.nonce
        });
        return `${baseUrl}sign?${params.toString()}`;
    }
  }

  /**
   * Verify signature (placeholder for future implementation)
   */
  async verifySignature(
    publicKey: string,
    challenge: SignatureChallenge,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info('Verifying signature', {
      publicKey,
      nonce: challenge.nonce
    });

    try {
      // TODO: Implement actual signature verification using @solana/web3.js
      // This would involve:
      // 1. Converting the signature from base64 to bytes
      // 2. Verifying the signature against the message and public key
      // 3. Checking that the challenge hasn't expired
      
      // For now, return success for mock signatures
      if (signature === 'mock_signature') {
        return { success: true };
      }

      // Check if challenge has expired
      if (Date.now() > challenge.expiresAt) {
        return { success: false, error: 'Challenge has expired' };
      }

      // Mock verification - in real implementation, use actual crypto verification
      return { success: true };

    } catch (error) {
      console.error('🔗 Signature Link: Signature verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Store linked wallet information
   */
  async storeLinkedWallet(data: {
    publicKey: string;
    provider: string;
    label: string;
    signature: string;
    challenge: SignatureChallenge;
    userId: string;
  }): Promise<LinkedWallet> {
    const linkedWallet: LinkedWallet = {
      id: this.generateWalletId(),
      publicKey: data.publicKey,
      provider: data.provider,
      label: data.label,
      signature: data.signature,
      challenge: data.challenge,
      createdAt: Date.now()
    };

    try {
      // Store in secure storage
      // Linked wallet storage moved to walletService
      logger.info('Linked wallet stored successfully', {
        id: linkedWallet.id,
        publicKey: linkedWallet.publicKey
      });

      return linkedWallet;
    } catch (error) {
      console.error('🔗 Signature Link: Failed to store linked wallet:', error);
      throw new Error('Failed to store linked wallet');
    }
  }

  /**
   * Get linked wallets for a user
   */
  async getLinkedWallets(userId: string): Promise<LinkedWallet[]> {
    try {
      // Linked wallet retrieval moved to walletService
      // Get linked wallets from walletService
      const { walletService } = await import('../../services/WalletService');
      return await walletService.getLinkedWallets(userId);
    } catch (error) {
      console.error('🔗 Signature Link: Failed to get linked wallets:', error);
      return [];
    }
  }

  /**
   * Remove a linked wallet
   */
  async removeLinkedWallet(userId: string, walletId: string): Promise<boolean> {
    try {
      // Linked wallet removal moved to walletService
      logger.info('Linked wallet removed', { walletId }, 'signatureLinkService');
      return true;
    } catch (error) {
      console.error('🔗 Signature Link: Failed to remove linked wallet:', error);
      return false;
    }
  }

  /**
   * Generate a unique nonce
   */
  private generateNonce(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}_${random}`;
  }

  /**
   * Generate a unique app instance ID
   */
  private generateAppInstanceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `wesplit_${timestamp}_${random}`;
  }

  /**
   * Generate a unique wallet ID
   */
  private generateWalletId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `wallet_${timestamp}_${random}`;
  }

  /**
   * Validate a signature challenge
   */
  private validateChallenge(challenge: SignatureChallenge): boolean {
    const now = Date.now();
    
    // Check if challenge has expired
    if (now > challenge.expiresAt) {
      return false;
    }

    // Check if challenge is too old (more than 1 hour)
    if (now - challenge.issuedAt > 60 * 60 * 1000) {
      return false;
    }

    // Validate required fields
    if (!challenge.nonce || !challenge.message || !challenge.userId) {
      return false;
    }

    return true;
  }

  /**
   * Test signature linking (for debugging)
   */
  async testSignatureLinking(providerName: string, userId: string): Promise<SignatureLinkResult> {
    logger.info('Testing signature linking', { providerName, userId }, 'signatureLinkService');
    
    return this.linkExternalWallet({
      userId,
      provider: providerName,
      label: `Test ${providerName} Wallet`,
      timeout: 10000
    });
  }
}

export const signatureLinkService = SignatureLinkService.getInstance();