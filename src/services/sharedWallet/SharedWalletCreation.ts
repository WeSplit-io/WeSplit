/**
 * Shared Wallet Creation Service
 * Handles creation of shared wallets with secure private key sharing
 * Uses the same encryption system as Degen Split for security
 * 
 * Best Practices:
 * - Single Responsibility: Only handles wallet creation
 * - Separation of Concerns: Separate from split wallet logic
 * - Error Handling: Comprehensive error handling with logging
 * - Security: Uses encrypted private key storage for all members
 */

import { logger } from '../core';
import type {
  SharedWallet,
  CreateSharedWalletParams,
  SharedWalletResult,
  SharedWalletMember,
} from './types';
import { SHARED_WALLET_CONSTANTS } from './index';

export class SharedWalletCreation {
  /**
   * Generate unique shared wallet ID
   */
  private static generateSharedWalletId(): string {
    const { generateUniqueId } = require('./utils');
    return generateUniqueId('shared_wallet');
  }

  /**
   * Validate creation parameters
   */
  private static validateCreationParams(
    params: CreateSharedWalletParams
  ): { valid: boolean; error?: string } {
    if (!params.name || params.name.trim().length === 0) {
      return { valid: false, error: 'Wallet name is required' };
    }

    if (params.name.length > SHARED_WALLET_CONSTANTS.MAX_WALLET_NAME_LENGTH) {
      return {
        valid: false,
        error: `Wallet name must be ${SHARED_WALLET_CONSTANTS.MAX_WALLET_NAME_LENGTH} characters or less`
      };
    }

    if (!params.creatorId || typeof params.creatorId !== 'string') {
      return { valid: false, error: 'Creator ID is required' };
    }

    if (!params.creatorName || params.creatorName.trim().length === 0) {
      return { valid: false, error: 'Creator name is required' };
    }

    if (!params.creatorWalletAddress || typeof params.creatorWalletAddress !== 'string') {
      return { valid: false, error: 'Creator wallet address is required' };
    }

    if (!params.initialMembers || !Array.isArray(params.initialMembers)) {
      return { valid: false, error: 'Initial members must be an array' };
    }

    if (params.initialMembers.length === 0) {
      return { valid: false, error: 'At least one member (creator) is required' };
    }

    // Validate that creator is in initial members
    const creatorInMembers = params.initialMembers.some(
      m => m.userId === params.creatorId
    );
    if (!creatorInMembers) {
      return { valid: false, error: 'Creator must be included in initial members' };
    }

    // Validate member data
    for (const member of params.initialMembers) {
      if (!member.userId || typeof member.userId !== 'string') {
        return { valid: false, error: 'All members must have a valid user ID' };
      }
      if (!member.name || member.name.trim().length === 0) {
        return { valid: false, error: 'All members must have a name' };
      }
      if (!member.walletAddress || typeof member.walletAddress !== 'string') {
        return { valid: false, error: 'All members must have a wallet address' };
      }
    }

    return { valid: true };
  }

  /**
   * Create a new shared wallet with secure private key sharing
   * 
   * Flow:
   * 1. Validate parameters
   * 2. Generate new Solana wallet
   * 3. Create shared wallet document in Firebase
   * 4. Store encrypted private key for all members (using Degen Split security system)
   * 5. Return created wallet
   */
  static async createSharedWallet(
    params: CreateSharedWalletParams
  ): Promise<SharedWalletResult> {
    try {
      // Validate parameters
      const validation = this.validateCreationParams(params);
      if (!validation.valid) {
        logger.error('Invalid shared wallet creation parameters', {
          error: validation.error,
          params: {
            name: params.name,
            creatorId: params.creatorId,
            membersCount: params.initialMembers?.length
          }
        }, 'SharedWalletCreation');
        
        return {
          success: false,
          error: validation.error || 'Invalid parameters'
        };
      }

      logger.info('Creating shared wallet', {
        name: params.name,
        creatorId: params.creatorId,
        membersCount: params.initialMembers.length,
        currency: params.currency || 'USDC'
      }, 'SharedWalletCreation');

      // ✅ LIGHTWEIGHT WALLET GEN: avoid heavy wallet/derive import (OOM)
      // Use direct Keypair.generate to keep bundle small for shared wallets
      const { Keypair } = await import('@solana/web3.js');
      const keypair = Keypair.generate();
      const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
      const wallet = {
        address: keypair.publicKey.toBase58(),
        publicKey: keypair.publicKey.toBase58(),
        secretKey: secretKeyBase64
      };

      logger.info('Shared wallet generated', {
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        isNewWallet: true,
        walletType: 'shared_wallet'
      }, 'SharedWalletCreation');

      // Generate unique shared wallet ID
      const sharedWalletId = this.generateSharedWalletId();

      // Prepare members data with proper structure
      const members: SharedWalletMember[] = params.initialMembers.map(member => ({
        userId: member.userId,
        name: member.name,
        walletAddress: member.walletAddress,
        role: member.userId === params.creatorId ? 'creator' as const : 'member' as const,
        totalContributed: 0,
        totalWithdrawn: 0,
        joinedAt: new Date().toISOString(),
        status: 'active' as const,
        linkedCards: []
      }));

      // Create shared wallet document
      // Only include description if it's provided and not empty (Firestore doesn't allow undefined)
      const trimmedDescription = params.description?.trim();
      const sharedWalletData: Omit<SharedWallet, 'firebaseDocId'> = {
        id: sharedWalletId,
        name: params.name.trim(),
        description: trimmedDescription || '',
        creatorId: params.creatorId,
        creatorName: params.creatorName,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        totalBalance: 0, // Start with zero balance
        currency: params.currency || SHARED_WALLET_CONSTANTS.DEFAULT_CURRENCY,
        status: 'active',
        members,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          allowMemberInvites: params.settings?.allowMemberInvites ?? true,
          requireApprovalForWithdrawals: params.settings?.requireApprovalForWithdrawals ?? false,
          ...(params.settings?.maxMembers !== undefined && { maxMembers: params.settings.maxMembers }),
          ...(params.settings?.autoTopUpEnabled !== undefined && { autoTopUpEnabled: params.settings.autoTopUpEnabled }),
          ...(params.settings?.autoTopUpThreshold !== undefined && { autoTopUpThreshold: params.settings.autoTopUpThreshold }),
          ...(params.settings?.autoTopUpAmount !== undefined && { autoTopUpAmount: params.settings.autoTopUpAmount }),
        }
      };

      // Store in Firebase
      const { db } = await import('../../config/firebase/firebase');
      const { collection, addDoc } = await import('firebase/firestore');
      
      const docRef = await addDoc(collection(db, 'sharedWallets'), sharedWalletData);
      
      const createdSharedWallet: SharedWallet = {
        ...sharedWalletData,
        firebaseDocId: docRef.id,
      };

      logger.info('Shared wallet document stored in Firebase', {
        sharedWalletId: createdSharedWallet.id,
        firebaseDocId: docRef.id,
        walletAddress: wallet.address,
        membersCount: members.length
      }, 'SharedWalletCreation');

      // Store encrypted private key for ALL members (using Degen Split security system)
      const privateKey = wallet.secretKey;
      if (!privateKey) {
        logger.error('No private key available from wallet service', {
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          hasSecretKey: !!wallet.secretKey
        }, 'SharedWalletCreation');
        
        // Clean up: Delete the wallet document if private key storage fails
        try {
          const { doc, deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'sharedWallets', docRef.id));
        } catch (cleanupError) {
          logger.error('Failed to cleanup shared wallet document after private key error', {
            sharedWalletId,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }, 'SharedWalletCreation');
        }
        
        return {
          success: false,
          error: 'Failed to generate wallet private key'
        };
      }

      // Use the same secure encryption system as Degen Split
      const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
      const storeResult = await SplitWalletSecurity.storeSplitWalletPrivateKeyForAllParticipants(
        sharedWalletId,
        members.map(m => ({ userId: m.userId, name: m.name })),
        privateKey
      );

      if (!storeResult.success) {
        logger.error('Failed to store private keys for all members', {
          sharedWalletId,
          error: storeResult.error
        }, 'SharedWalletCreation');
        
        // Clean up: Delete the wallet document if private key storage fails
        try {
          const { doc, deleteDoc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'sharedWallets', docRef.id));
        } catch (cleanupError) {
          logger.error('Failed to cleanup shared wallet document after private key storage error', {
            sharedWalletId,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
          }, 'SharedWalletCreation');
        }
        
        return {
          success: false,
          error: storeResult.error || 'Failed to store encrypted private key for members'
        };
      }

      logger.info('Encrypted private key stored for all shared wallet members', {
        sharedWalletId,
        membersCount: members.length
      }, 'SharedWalletCreation');

      logger.info('Shared wallet created successfully', {
        sharedWalletId: createdSharedWallet.id,
        firebaseDocId: docRef.id,
        walletAddress: wallet.address,
        membersCount: createdSharedWallet.members.length,
        sharedPrivateKeyAccess: true
      }, 'SharedWalletCreation');

      return {
        success: true,
        wallet: createdSharedWallet,
      };

    } catch (error) {
      logger.error('Failed to create shared wallet', error, 'SharedWalletCreation');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

