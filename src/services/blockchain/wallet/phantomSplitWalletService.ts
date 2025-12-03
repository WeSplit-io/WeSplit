/**
 * Phantom Split Wallet Service
 *
 * Specialized service for creating wallets using Phantom Connect
 * specifically for split wallet scenarios (degen, spend, fair)
 *
 * KEY DIFFERENCES FROM EXISTING SYSTEM:
 * - Uses Phantom social login (Google/Apple) instead of embedded wallets
 * - No private key storage (Phantom manages keys)
 * - Separate from existing embedded wallet system
 * - Users keep their existing embedded wallets intact
 * - Only for split wallet creation, not general wallet management
 */

import { logger } from '../../analytics/loggingService';
import { PublicKey } from '@solana/web3.js';
import PhantomConnectService from './phantomConnectService';

export interface PhantomSplitWalletOptions {
  splitType: 'degen' | 'spend' | 'fair'; // Based on actual codebase split types
  socialProvider: 'google' | 'apple';
  spendingLimits?: {
    maxAmount?: number;    // Max per transaction
    maxDaily?: number;     // Max per day
    allowedTokens?: string[]; // Default to USDC
  };
  // New: Use Phantom wallet creation instead of embedded wallets
  usePhantomWalletCreation?: boolean; // Default true for new implementation
}

export interface PhantomSplitWalletResult {
  success: boolean;
  walletAddress?: string;
  publicKey?: string;
  phantomUserId?: string; // Phantom's user identifier
  socialProvider?: string;
  splitType?: string;
  error?: string;
  requiresSocialAuth?: boolean;
  authUrl?: string;
}

export interface PhantomSplitParticipant {
  userId: string;
  name: string;
  email?: string;
  phantomWalletAddress: string;
  socialProvider: string;
  splitType: 'degen' | 'spend' | 'fair';
  joinedAt: number;
  // Note: No private key stored - Phantom manages it
}

class PhantomSplitWalletService {
  private static instance: PhantomSplitWalletService;

  public static getInstance(): PhantomSplitWalletService {
    if (!PhantomSplitWalletService.instance) {
      PhantomSplitWalletService.instance = new PhantomSplitWalletService();
    }
    return PhantomSplitWalletService.instance;
  }

  /**
   * Initialize Phantom Connect for split wallet creation
   */
  public async initializeForSplitWallet(options: PhantomSplitWalletOptions): Promise<void> {
    const phantomConnect = PhantomConnectService.getInstance();

    // Configure Phantom Connect specifically for split wallets
    phantomConnect.configure({
      enableSocialLogin: true,
      enableEmbeddedWallets: true, // Phantom handles embedded wallets
      spendingLimits: options.spendingLimits || {
        maxAmount: 50, // $50 per transaction for splits
        maxDaily: 200, // $200 per day
        allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] // USDC
      }
    });

    logger.info('Phantom Connect initialized for split wallet creation', {
      splitType: options.splitType,
      socialProvider: options.socialProvider
    }, 'PhantomSplitWalletService');
  }

  /**
   * Create a wallet for split participation using Phantom
   *
   * This creates a Phantom wallet specifically for the split,
   * separate from any existing embedded wallets the user might have.
   */
  public async createSplitWallet(
    userId: string,
    userName: string,
    userEmail: string,
    options: PhantomSplitWalletOptions
  ): Promise<PhantomSplitWalletResult> {
    try {
      logger.info('Creating Phantom wallet for split participation', {
        userId,
        splitType: options.splitType,
        socialProvider: options.socialProvider
      }, 'PhantomSplitWalletService');

      // Check if user already has a Phantom wallet for this split type
      const existingWallet = await this.getExistingSplitWallet(userId, options.splitType);
      if (existingWallet) {
        logger.info('User already has Phantom wallet for this split type', {
          userId,
          splitType: options.splitType,
          walletAddress: existingWallet.walletAddress
        }, 'PhantomSplitWalletService');

        return {
          success: true,
          walletAddress: existingWallet.walletAddress,
          publicKey: existingWallet.walletAddress,
          phantomUserId: existingWallet.userId,
          socialProvider: existingWallet.socialProvider,
          splitType: existingWallet.splitType
        };
      }

      // Create new Phantom wallet via social login
      const phantomConnect = PhantomConnectService.getInstance();
      const connectResult = await phantomConnect.connect({
        preferredMethod: 'social',
        socialProvider: options.socialProvider
      });

      if (!connectResult.success) {
        // Check if it requires social authentication
        if (connectResult.error?.includes('social_auth_required')) {
          return {
            success: false,
            requiresSocialAuth: true,
            authUrl: this.generateSocialAuthUrl(options.socialProvider, userId, options.splitType),
            error: 'Social authentication required'
          };
        }

        return {
          success: false,
          error: connectResult.error || 'Failed to connect Phantom wallet'
        };
      }

      // Store the Phantom wallet association (without private keys)
      const participantData: PhantomSplitParticipant = {
        userId,
        name: userName,
        email: userEmail,
        phantomWalletAddress: connectResult.address!,
        socialProvider: options.socialProvider,
        splitType: options.splitType,
        joinedAt: Date.now()
      };

      await this.storePhantomSplitParticipant(participantData);

      logger.info('Phantom wallet created for split participation', {
        userId,
        splitType: options.splitType,
        walletAddress: connectResult.address
      }, 'PhantomSplitWalletService');

      return {
        success: true,
        walletAddress: connectResult.address,
        publicKey: connectResult.publicKey,
        phantomUserId: connectResult.address, // Using address as user ID
        socialProvider: options.socialProvider,
        splitType: options.splitType
      };

    } catch (error) {
      logger.error('Failed to create Phantom split wallet', error, 'PhantomSplitWalletService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle social authentication callback
   */
  public async handleSocialAuthCallback(
    authCode: string,
    state: string
  ): Promise<PhantomSplitWalletResult> {
    try {
      // Parse state to get user and split info
      const stateData = JSON.parse(atob(state));
      const { userId, splitType, socialProvider } = stateData;

      // Complete authentication with Phantom
      const phantomConnect = PhantomConnectService.getInstance();
      const connectResult = await phantomConnect.connect({
        authCode,
        preferredMethod: 'social',
        socialProvider: socialProvider as 'google' | 'apple'
      });

      if (!connectResult.success) {
        return {
          success: false,
          error: connectResult.error || 'Social authentication failed'
        };
      }

      // Store participant data
      const participantData: PhantomSplitParticipant = {
        userId,
        name: stateData.userName,
        email: stateData.userEmail,
        phantomWalletAddress: connectResult.address!,
        socialProvider,
        splitType,
        joinedAt: Date.now()
      };

      await this.storePhantomSplitParticipant(participantData);

      return {
        success: true,
        walletAddress: connectResult.address,
        publicKey: connectResult.publicKey,
        phantomUserId: connectResult.address,
        socialProvider,
        splitType
      };

    } catch (error) {
      logger.error('Failed to handle social auth callback', error, 'PhantomSplitWalletService');
      return {
        success: false,
        error: 'Social authentication callback failed'
      };
    }
  }

  /**
   * Check if user already has a Phantom wallet for specific split type
   */
  private async getExistingSplitWallet(
    userId: string,
    splitType: 'degen' | 'spend' | 'fair'
  ): Promise<PhantomSplitParticipant | null> {
    try {
      const { db } = await import('../../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const docRef = doc(db, 'phantom_split_participants', `${userId}_${splitType}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PhantomSplitParticipant;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get existing split wallet', error, 'PhantomSplitWalletService');
      return null;
    }
  }

  /**
   * Store Phantom split participant data (no private keys)
   */
  private async storePhantomSplitParticipant(participant: PhantomSplitParticipant): Promise<void> {
    try {
      const { db } = await import('../../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      const docId = `${participant.userId}_${participant.splitType}`;
      await setDoc(doc(db, 'phantom_split_participants', docId), participant);

      logger.info('Phantom split participant stored', {
        userId: participant.userId,
        splitType: participant.splitType,
        walletAddress: participant.phantomWalletAddress
      }, 'PhantomSplitWalletService');

    } catch (error) {
      logger.error('Failed to store Phantom split participant', error, 'PhantomSplitWalletService');
      throw error;
    }
  }

  /**
   * Generate social authentication URL
   */
  private generateSocialAuthUrl(
    provider: 'google' | 'apple',
    userId: string,
    splitType: 'degen' | 'spend' | 'fair'
  ): string {
    const state = btoa(JSON.stringify({
      userId,
      splitType,
      provider,
      timestamp: Date.now()
    }));

    const baseUrl = 'https://phantom.app/ul/v1/social';

    const params = new URLSearchParams({
      provider,
      state,
      redirect_uri: 'wesplit://wallet/phantom-auth',
      scope: 'wallet:create',
      response_type: 'code'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Validate Phantom wallet address format
   */
  public static isValidPhantomWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all Phantom wallets for a user across different split types
   */
  public async getUserPhantomWallets(userId: string): Promise<PhantomSplitParticipant[]> {
    try {
      const { db } = await import('../../../config/firebase/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const q = query(
        collection(db, 'phantom_split_participants'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const wallets: PhantomSplitParticipant[] = [];

      querySnapshot.forEach((doc) => {
        wallets.push(doc.data() as PhantomSplitParticipant);
      });

      return wallets;
    } catch (error) {
      logger.error('Failed to get user Phantom wallets', error, 'PhantomSplitWalletService');
      return [];
    }
  }

  /**
   * Clean up Phantom wallet association (when split is deleted)
   */
  public async removePhantomSplitWallet(userId: string, splitType: 'degen' | 'spend' | 'fair'): Promise<boolean> {
    try {
      const { db } = await import('../../../config/firebase/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');

      const docId = `${userId}_${splitType}`;
      await deleteDoc(doc(db, 'phantom_split_participants', docId));

      logger.info('Phantom split wallet removed', { userId, splitType }, 'PhantomSplitWalletService');
      return true;
    } catch (error) {
      logger.error('Failed to remove Phantom split wallet', error, 'PhantomSplitWalletService');
      return false;
    }
  }

  /**
   * Check if split type supports Phantom wallets
   */
  public static isPhantomSupportedSplitType(splitType: string): boolean {
    const supportedTypes: ('degen' | 'spend' | 'fair')[] = ['degen', 'spend'];
    return supportedTypes.includes(splitType as 'degen' | 'spend' | 'fair');
  }

  /**
   * Get spending limits for split type
   */
  public static getDefaultSpendingLimits(splitType: 'degen' | 'spend' | 'fair'): {
    maxAmount: number;
    maxDaily: number;
    allowedTokens: string[];
  } {
    // Customize limits based on split type
    switch (splitType) {
      case 'degen':
        return {
          maxAmount: 100, // Higher limits for gambling splits
          maxDaily: 500,
          allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] // USDC only
        };
      case 'spend':
        return {
          maxAmount: 50, // Moderate limits for spend splits
          maxDaily: 200,
          allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] // USDC only
        };
      case 'fair':
        return {
          maxAmount: 25, // Lower limits for fair splits
          maxDaily: 100,
          allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
        };
      default:
        return {
          maxAmount: 10,
          maxDaily: 50,
          allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
        };
    }
  }
}

export default PhantomSplitWalletService;
export { PhantomSplitWalletService };
