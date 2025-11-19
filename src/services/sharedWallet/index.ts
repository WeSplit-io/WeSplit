/**
 * Shared Wallet Service
 * Main entry point for all shared wallet operations
 * 
 * Architecture:
 * - Modular design with separate services for different concerns
 * - SharedWalletCreation: Wallet creation logic
 * - SharedWalletSecurity: Private key access (reuses SplitWalletSecurity)
 * - SharedWalletManagement: CRUD operations
 * - SharedWalletFunding: Funding operations
 * - SharedWalletTransactions: Transaction history
 * 
 * Best Practices:
 * - Single entry point for all shared wallet operations
 * - Lazy loading of modules to prevent circular dependencies
 * - Consistent error handling and logging
 * - Type safety throughout
 */

import { logger } from '../core';
import type {
  SharedWallet,
  CreateSharedWalletParams,
  SharedWalletResult,
  FundSharedWalletParams,
  FundSharedWalletResult,
  WithdrawFromSharedWalletParams,
  WithdrawFromSharedWalletResult,
  InviteToSharedWalletParams,
  InviteToSharedWalletResult,
  UpdateSharedWalletSettingsParams,
  UpdateSharedWalletSettingsResult,
} from './types';

// Lazy load modules to prevent circular dependencies
let modulesLoaded = false;

async function loadModules() {
  if (modulesLoaded) return;
  
  // Dynamic imports to prevent circular dependencies
  await Promise.all([
    import('./SharedWalletCreation'),
    import('./SharedWalletFunding'),
    import('./SharedWalletWithdrawal'),
  ]);
  
  modulesLoaded = true;
}

/**
 * Main Shared Wallet Service
 * Provides unified interface for all shared wallet operations
 */
export class SharedWalletService {
  /**
   * Create a new shared wallet
   * 
   * @param params - Creation parameters
   * @returns Result with created wallet or error
   */
  static async createSharedWallet(
    params: CreateSharedWalletParams
  ): Promise<SharedWalletResult> {
    try {
      await loadModules();
      const { SharedWalletCreation } = await import('./SharedWalletCreation');
      
      return await SharedWalletCreation.createSharedWallet(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error creating shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a shared wallet by ID
   * 
   * @param sharedWalletId - The shared wallet ID
   * @returns Result with wallet or error
   */
  static async getSharedWallet(
    sharedWalletId: string
  ): Promise<SharedWalletResult> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const result = await getSharedWalletDocById(sharedWalletId);
      
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      return {
        success: true,
        wallet: {
          ...result.wallet,
          firebaseDocId: result.walletDocId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error getting shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all shared wallets for a user
   * 
   * @param userId - The user ID
   * @returns Array of shared wallets the user is a member of
   */
  static async getUserSharedWallets(
    userId: string
  ): Promise<{ success: boolean; wallets?: SharedWallet[]; error?: string }> {
    try {
      await loadModules();
      
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      // Query for wallets where user is creator
      const creatorQuery = query(
        collection(db, 'sharedWallets'),
        where('creatorId', '==', userId)
      );
      
      // Get creator wallets first
      const creatorSnapshot = await getDocs(creatorQuery);
      
      const wallets: SharedWallet[] = [];
      const walletIds = new Set<string>();
      
      // Add wallets where user is creator
      creatorSnapshot.forEach((doc) => {
        const data = doc.data() as SharedWallet;
        wallets.push({
          ...data,
          firebaseDocId: doc.id,
        });
        walletIds.add(doc.id);
      });
      
      // For member wallets, we need to query all and filter client-side
      // This is a limitation of Firestore - can't query nested arrays efficiently
      // TODO: Consider adding a 'memberIds' array field for better performance
      // For now, limit the query to recent wallets to improve performance
      const { orderBy, limit } = await import('firebase/firestore');
      const recentWalletsQuery = query(
        collection(db, 'sharedWallets'),
        orderBy('createdAt', 'desc'),
        limit(100) // Limit to 100 most recent wallets for performance
      );
      
      const recentWalletsSnapshot = await getDocs(recentWalletsQuery);
      
      // Add wallets where user is a member (but not creator)
      recentWalletsSnapshot.forEach((doc) => {
        if (walletIds.has(doc.id)) return; // Already added as creator
        
        const data = doc.data() as SharedWallet;
        const isMember = data.members?.some(m => m.userId === userId);
        
        if (isMember) {
          wallets.push({
            ...data,
            firebaseDocId: doc.id,
          });
          walletIds.add(doc.id);
        }
      });

      return {
        success: true,
        wallets,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error getting user shared wallets', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get the private key for a shared wallet
   * Reuses the secure encryption system from SplitWalletSecurity
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param requesterId - The user ID requesting the key
   * @returns Decrypted private key or error
   */
  static async getSharedWalletPrivateKey(
    sharedWalletId: string,
    requesterId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      await loadModules();
      
      // Reuse the secure private key retrieval from SplitWalletSecurity
      // Shared wallets use the same encryption system as Degen Split
      const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
      
      return await SplitWalletSecurity.getSplitWalletPrivateKey(
        sharedWalletId,
        requesterId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error getting shared wallet private key', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Pre-fetch encrypted private key payload for faster retrieval
   * 
   * @param sharedWalletId - The shared wallet ID
   */
  static async preFetchPrivateKeyPayload(sharedWalletId: string): Promise<void> {
    try {
      await loadModules();
      
      // Reuse the pre-fetch logic from SplitWalletSecurity
      const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
      await SplitWalletSecurity.preFetchPrivateKeyPayload(sharedWalletId);
    } catch (error) {
      // Don't throw - pre-fetch is optional optimization
      logger.warn('SharedWalletService: Error pre-fetching private key payload', {
        sharedWalletId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SharedWalletService');
    }
  }

  /**
   * Fund a shared wallet
   * 
   * @param params - Funding parameters
   * @returns Result with transaction signature or error
   */
  static async fundSharedWallet(
    params: FundSharedWalletParams
  ): Promise<FundSharedWalletResult> {
    try {
      await loadModules();
      const { SharedWalletFunding } = await import('./SharedWalletFunding');
      
      return await SharedWalletFunding.fundSharedWallet(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error funding shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Withdraw from a shared wallet
   * 
   * @param params - Withdrawal parameters
   * @returns Result with transaction signature or error
   */
  static async withdrawFromSharedWallet(
    params: WithdrawFromSharedWalletParams
  ): Promise<WithdrawFromSharedWalletResult> {
    try {
      await loadModules();
      const { SharedWalletWithdrawal } = await import('./SharedWalletWithdrawal');
      
      return await SharedWalletWithdrawal.withdrawFromSharedWallet(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error withdrawing from shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Link a card to a shared wallet member
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param userId - The user ID
   * @param cardId - The linked card ID
   * @returns Success or error
   */
  static async linkCardToSharedWallet(
    sharedWalletId: string,
    userId: string,
    cardId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      const result = await getSharedWalletDocById(sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;
      const userMember = wallet.members?.find((m) => m.userId === userId);
      
      if (!userMember) {
        return {
          success: false,
          error: 'User is not a member of this shared wallet',
        };
      }

      // Add card to member's linkedCards array if not already present
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === userId) {
          const linkedCards = m.linkedCards || [];
          if (!linkedCards.includes(cardId)) {
            return {
              ...m,
              linkedCards: [...linkedCards, cardId],
            };
          }
          return m;
        }
        return m;
      });

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      logger.info('Card linked to shared wallet member', {
        sharedWalletId,
        userId,
        cardId,
      }, 'SharedWalletService');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error linking card to shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Unlink a card from a shared wallet member
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param userId - The user ID
   * @param cardId - The linked card ID
   * @returns Success or error
   */
  static async unlinkCardFromSharedWallet(
    sharedWalletId: string,
    userId: string,
    cardId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      const result = await getSharedWalletDocById(sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;
      
      // Remove card from member's linkedCards array
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === userId) {
          const linkedCards = (m.linkedCards || []).filter((id) => id !== cardId);
          return {
            ...m,
            linkedCards,
          };
        }
        return m;
      });

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      logger.info('Card unlinked from shared wallet member', {
        sharedWalletId,
        userId,
        cardId,
      }, 'SharedWalletService');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error unlinking card from shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Invite users to a shared wallet
   * Adds new members to the shared wallet
   * 
   * @param params - Invitation parameters
   * @returns Result with invitation count or error
   */
  static async inviteToSharedWallet(
    params: InviteToSharedWalletParams
  ): Promise<InviteToSharedWalletResult> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      const { firebaseDataService } = await import('../data/firebaseDataService');
      
      // Get shared wallet
      const result = await getSharedWalletDocById(params.sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;
      
      // Check if inviter is a member or creator
      const isInviterAuthorized = wallet.creatorId === params.inviterId || 
        wallet.members.some(m => m.userId === params.inviterId && m.status === 'active');
      
      if (!isInviterAuthorized) {
        return {
          success: false,
          error: 'You are not authorized to invite members to this shared wallet',
        };
      }

      // Check wallet settings
      if (wallet.settings?.allowMemberInvites === false && wallet.creatorId !== params.inviterId) {
        return {
          success: false,
          error: 'Only the creator can invite members to this shared wallet',
        };
      }

      // Check max members limit
      if (wallet.settings?.maxMembers && wallet.members.length + params.inviteeIds.length > wallet.settings.maxMembers) {
        return {
          success: false,
          error: `Cannot invite more members. Maximum members limit is ${wallet.settings.maxMembers}`,
        };
      }

      // Fetch user data for each invitee
      const newMembers: Array<{
        userId: string;
        name: string;
        walletAddress: string;
        role: 'member';
        totalContributed: number;
        totalWithdrawn: number;
        joinedAt: string;
        status: 'invited';
        linkedCards: string[];
      }> = [];
      const failedInvitations: Array<{ userId: string; reason: string }> = [];
      let invitedCount = 0;

      for (const inviteeId of params.inviteeIds) {
        // Check if user is already a member
        const isAlreadyMember = wallet.members.some(m => m.userId === inviteeId);
        if (isAlreadyMember) {
          logger.warn('User is already a member', { userId: inviteeId }, 'SharedWalletService');
          failedInvitations.push({ userId: inviteeId, reason: 'Already a member' });
          continue;
        }

        // Fetch user data
        let userData;
        try {
          userData = await firebaseDataService.user.getCurrentUser(inviteeId);
        } catch (error) {
          const fetchError = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to fetch user data', { userId: inviteeId, error: fetchError }, 'SharedWalletService');
          failedInvitations.push({ userId: inviteeId, reason: 'Failed to fetch user data' });
          continue;
        }

        if (!userData) {
          logger.warn('User data not found', { userId: inviteeId }, 'SharedWalletService');
          failedInvitations.push({ userId: inviteeId, reason: 'User data not found' });
          continue;
        }

        // Get wallet address - try multiple fields
        // Type assertion needed because user data structure may vary
        const userDataAny = userData as unknown as Record<string, unknown>;
        const walletAddress = (userDataAny.wallet_address as string) || 
                             (userDataAny.wallet_public_key as string) || 
                             (userDataAny.walletAddress as string) ||
                             '';

        if (!walletAddress) {
          logger.warn('User has no wallet address', { 
            userId: inviteeId,
            userName: userData.name,
            availableFields: Object.keys(userData).filter(k => k.toLowerCase().includes('wallet') || k.toLowerCase().includes('address'))
          }, 'SharedWalletService');
          // Continue anyway - wallet address can be added later
        }

        // Create new member
        const newMember = {
          userId: inviteeId,
          name: userData.name || userData.email?.split('@')[0] || 'Unknown User',
          walletAddress: walletAddress,
          role: 'member' as const,
          totalContributed: 0,
          totalWithdrawn: 0,
          joinedAt: new Date().toISOString(),
          status: 'invited' as const,
          linkedCards: [],
        };

        newMembers.push(newMember);
        invitedCount++;
      }

      if (newMembers.length === 0) {
        return {
          success: false,
          error: 'No new members could be added. They may already be members or user data could not be retrieved.',
        };
      }

      // Update wallet with new members
      const updatedMembers = [...wallet.members, ...newMembers];

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      logger.info('Users invited to shared wallet', {
        sharedWalletId: params.sharedWalletId,
        inviterId: params.inviterId,
        invitedCount: newMembers.length,
        failedCount: failedInvitations.length,
      }, 'SharedWalletService');

      // Build message based on results
      let message = `Successfully invited ${newMembers.length} member(s) to the shared wallet`;
      if (failedInvitations.length > 0) {
        message += `. ${failedInvitations.length} invitation(s) failed (they may already be members).`;
      }

      return {
        success: true,
        invitedCount: newMembers.length,
        message: message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error inviting users to shared wallet', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get transaction history for a shared wallet
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param limit - Maximum number of transactions to return (default: 50)
   * @returns Array of transactions or error
   */
  static async getSharedWalletTransactions(
    sharedWalletId: string,
    limit: number = 50
  ): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    try {
      await loadModules();
      
      const { db } = await import('../../config/firebase/firebase');
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'sharedWalletTransactions'),
        where('sharedWalletId', '==', sharedWalletId),
        orderBy('createdAt', 'desc'),
        limitQuery(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseDocId: doc.id,
      }));
      
      return {
        success: true,
        transactions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error getting shared wallet transactions', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update shared wallet settings (customization, etc.)
   * 
   * @param params - Update parameters
   * @returns Result indicating success or error
   */
  static async updateSharedWalletSettings(
    params: UpdateSharedWalletSettingsParams
  ): Promise<UpdateSharedWalletSettingsResult> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const { db } = await import('../../config/firebase/firebase');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Get shared wallet
      const result = await getSharedWalletDocById(params.sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;
      
      // Verify user is the creator (only creator can update settings)
      if (wallet.creatorId !== params.userId) {
        return {
          success: false,
          error: 'Only the wallet creator can update settings',
        };
      }

      // Build update object - only include fields that are provided
      const updates: any = {
        updatedAt: serverTimestamp(),
      };

      if (params.customColor !== undefined) {
        updates.customColor = params.customColor || null;
      }

      if (params.customLogo !== undefined) {
        updates.customLogo = params.customLogo || null;
      }

      if (params.settings !== undefined) {
        updates.settings = {
          ...wallet.settings,
          ...params.settings,
        };
      }

      // Update the document
      await updateDoc(doc(db, 'sharedWallets', walletDocId), updates);

      logger.info('Shared wallet settings updated', {
        sharedWalletId: params.sharedWalletId,
        updates: Object.keys(updates),
      }, 'SharedWalletService');

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error updating shared wallet settings', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Export types for convenience
export type {
  SharedWallet,
  SharedWalletMember,
  CreateSharedWalletParams,
  SharedWalletResult,
  FundSharedWalletParams,
  FundSharedWalletResult,
  WithdrawFromSharedWalletParams,
  WithdrawFromSharedWalletResult,
  InviteToSharedWalletParams,
  InviteToSharedWalletResult,
} from './types';

