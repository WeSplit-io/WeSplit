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
import {
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
  GetSharedWalletTransactionsResult,
  SHARED_WALLET_CONSTANTS, // Import it as a value, not a type
} from './types';

// Lazy load modules to prevent circular dependencies
let modulesLoaded = false;

async function loadModules() {
  if (modulesLoaded) return;

  // Dynamic imports to prevent circular dependencies
  await Promise.all([
    import('./SharedWalletCreation'),
    // NOTE: SharedWalletFunding and SharedWalletWithdrawal are not used
    // Transaction logic is handled by ConsolidatedTransactionService instead
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
        limit(SHARED_WALLET_CONSTANTS.RECENT_WALLETS_LIMIT) // Limit for performance
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
   * NOTE: This method is deprecated. Use CentralizedTransactionHandler instead.
   * Transaction logic is handled by ConsolidatedTransactionService for consistency.
   *
   * @deprecated Use CentralizedTransactionHandler with 'shared_wallet_funding' context
   * @param params - Funding parameters
   * @returns Result with transaction signature or error
   */
  static async fundSharedWallet(
    params: FundSharedWalletParams
  ): Promise<FundSharedWalletResult> {
    logger.warn('SharedWalletService.fundSharedWallet is deprecated', {
      sharedWalletId: params.sharedWalletId,
      userId: params.userId
    }, 'SharedWalletService');

    return {
      success: false,
      error: 'This method is deprecated. Use CentralizedTransactionHandler instead.',
    };
  }

  /**
   * Withdraw from a shared wallet
   * NOTE: This method is deprecated. Use CentralizedTransactionHandler instead.
   * Transaction logic is handled by ConsolidatedTransactionService for consistency.
   *
   * @deprecated Use CentralizedTransactionHandler with 'shared_wallet_withdrawal' context
   * @param params - Withdrawal parameters
   * @returns Result with transaction signature or error
   */
  static async withdrawFromSharedWallet(
    params: WithdrawFromSharedWalletParams
  ): Promise<WithdrawFromSharedWalletResult> {
    logger.warn('SharedWalletService.withdrawFromSharedWallet is deprecated', {
      sharedWalletId: params.sharedWalletId,
      userId: params.userId
    }, 'SharedWalletService');

    return {
      success: false,
      error: 'This method is deprecated. Use CentralizedTransactionHandler instead.',
    };
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
   * Accept shared wallet invitation
   * Changes member status from 'invited' to 'active'
   *
   * @param sharedWalletId - The shared wallet ID
   * @param userId - The user accepting the invitation
   * @returns Success or error
   */
  static async acceptSharedWalletInvitation(
    sharedWalletId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');

      // Get shared wallet
      const result = await getSharedWalletDocById(sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;

      // Find the invited member
      const memberIndex = wallet.members.findIndex((m) => m.userId === userId);
      if (memberIndex === -1) {
        return {
          success: false,
          error: 'You are not a member of this shared wallet',
        };
      }

      const member = wallet.members[memberIndex];
      if (member.status !== 'invited') {
        return {
          success: false,
          error: 'No pending invitation found',
        };
      }

      // Update member status to active
      const updatedMembers = [...wallet.members];
      updatedMembers[memberIndex] = {
        ...member,
        status: 'active' as const,
      };

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      // CRITICAL: Ensure the user has private key access after accepting invitation
      // The user should already be in the participants list from inviteToSharedWallet,
      // but we verify and sync to prevent access issues during withdrawal
      const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
      const syncResult = await SplitWalletSecurity.syncSharedPrivateKeyParticipants(
        sharedWalletId,
        updatedMembers.map(m => ({ userId: m.userId, name: m.name }))
      );

      if (!syncResult.success) {
        logger.warn('Failed to sync private key participants after invitation acceptance', {
          sharedWalletId,
          userId,
          error: syncResult.error
        }, 'SharedWalletService');
        // Don't fail the acceptance - the user might still have access from the original invite
        // But log it for monitoring
      } else {
        logger.info('Private key participants synced after invitation acceptance', {
          sharedWalletId,
          userId
        }, 'SharedWalletService');
      }

      logger.info('Shared wallet invitation accepted', {
        sharedWalletId,
        userId,
      }, 'SharedWalletService');

      // ✅ FIX: Send notifications when member accepts invitation
      try {
        const { notificationService } = await import('../notifications/notificationService');
        const { firebaseDataService } = await import('../data/firebaseDataService');
        const acceptingUserData = await firebaseDataService.user.getCurrentUser(userId);
        const acceptingUserName = acceptingUserData?.name || 'A member';

        // Notify creator (if not the accepting user)
        if (wallet.creatorId !== userId) {
          try {
            await notificationService.instance.sendNotification(
              wallet.creatorId,
              'Member Joined Shared Wallet',
              `${acceptingUserName} joined "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_member_accepted',
              {
                sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                memberId: userId,
                memberName: acceptingUserName,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send member acceptance notification to creator', {
              creatorId: wallet.creatorId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'SharedWalletService');
          }
        }

        // Notify all active members (except the accepting user)
        // Use updatedMembers which includes the newly accepted member with 'active' status
        const membersToNotify = updatedMembers.filter(m => 
          m.userId !== userId && 
          m.status === 'active'
        );

        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Member Joined Shared Wallet',
              `${acceptingUserName} joined "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_member_accepted',
              {
                sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                memberId: userId,
                memberName: acceptingUserName,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send member acceptance notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'SharedWalletService');
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send member acceptance notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'SharedWalletService');
        // Don't fail the acceptance if notifications fail
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to accept shared wallet invitation', {
        sharedWalletId,
        userId,
        error: errorMessage
      }, 'SharedWalletService');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Remove a member from a shared wallet
   * Only creator or admin with canRemoveMembers permission can remove members
   *
   * @param sharedWalletId - The shared wallet ID
   * @param memberId - The user ID of the member to remove
   * @param removerId - The user ID of the person removing the member
   * @returns Success or error
   */
  static async removeMember(
    sharedWalletId: string,
    memberId: string,
    removerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp, runTransaction } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      const { firebaseDataService } = await import('../data/firebaseDataService');
      const { MemberRightsService } = await import('./MemberRightsService');

      // Get shared wallet
      const result = await getSharedWalletDocById(sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;

      // Verify remover is authorized
      const isCreator = wallet.creatorId === removerId;
      const removerMember = wallet.members?.find(m => m.userId === removerId);
      const canRemove = isCreator || 
        (removerMember && MemberRightsService.canPerformAction(removerMember, wallet, 'removeMembers'));

      if (!canRemove) {
        return {
          success: false,
          error: 'You do not have permission to remove members from this shared wallet',
        };
      }

      // Cannot remove creator
      if (memberId === wallet.creatorId) {
        return {
          success: false,
          error: 'Cannot remove the wallet creator',
        };
      }

      // Find member to remove
      const memberToRemove = wallet.members?.find(m => m.userId === memberId);
      if (!memberToRemove) {
        return {
          success: false,
          error: 'Member not found in this shared wallet',
        };
      }

      // Check if member has pending withdrawals (optional - can be enhanced)
      // For now, we allow removal even if they have contributed funds
      // They can still withdraw their own contributions later if needed

      // Use Firestore transaction to atomically update member status
      const walletRef = doc(db, 'sharedWallets', walletDocId);
      const removedMemberName = memberToRemove.name;

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) {
          throw new Error('Shared wallet document not found');
        }

        const currentWallet = walletDoc.data();
        const currentMembers = currentWallet.members || [];
        
        // Update member status to 'removed'
        const updatedMembers = currentMembers.map((m: any) => {
          if (m.userId === memberId) {
            return {
              ...m,
              status: 'removed' as const,
            };
          }
          return m;
        });

        transaction.update(walletRef, {
          members: updatedMembers,
          updatedAt: serverTimestamp(),
        });
      });

      logger.info('Member removed from shared wallet', {
        sharedWalletId,
        memberId,
        removerId,
      }, 'SharedWalletService');

      // Send notifications
      try {
        const { notificationService } = await import('../notifications/notificationService');
        const removerData = await firebaseDataService.user.getCurrentUser(removerId);
        const removerName = removerData?.name || 'An admin';

        // Notify removed member
        try {
          await notificationService.instance.sendNotification(
            memberId,
            'Removed from Shared Wallet',
            `You have been removed from "${wallet.name || 'Shared Wallet'}" by ${removerName}`,
            'shared_wallet_member_removed',
            {
              sharedWalletId,
              walletName: wallet.name || 'Shared Wallet',
              removerId,
              removerName,
              memberId,
              memberName: removedMemberName,
            }
          );
        } catch (notifError) {
          logger.warn('Failed to send removal notification to removed member', {
            memberId,
            error: notifError instanceof Error ? notifError.message : String(notifError)
          }, 'SharedWalletService');
        }

        // Notify all active members (except the removed member and remover)
        const membersToNotify = wallet.members?.filter(m => 
          m.userId !== memberId && 
          m.userId !== removerId && 
          m.status === 'active'
        ) || [];

        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Member Removed from Shared Wallet',
              `${removerName} removed ${removedMemberName} from "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_member_removed',
              {
                sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                removerId,
                removerName,
                memberId,
                memberName: removedMemberName,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send removal notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'SharedWalletService');
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send removal notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'SharedWalletService');
        // Don't fail the removal if notifications fail
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to remove member from shared wallet', {
        sharedWalletId,
        memberId,
        removerId,
        error: errorMessage
      }, 'SharedWalletService');

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
      
      // ✅ FIX: Check if inviter is a member and has permission to invite
      const inviterMember = wallet.members.find(m => m.userId === params.inviterId);
      const isCreator = wallet.creatorId === params.inviterId;
      
      if (!isCreator && (!inviterMember || inviterMember.status !== 'active')) {
        return {
          success: false,
          error: 'You are not authorized to invite members to this shared wallet',
        };
      }

      // ✅ FIX: Check member permissions using MemberRightsService
      if (!isCreator) {
        const { MemberRightsService } = await import('./MemberRightsService');
        const canInvite = MemberRightsService.canPerformAction(inviterMember, wallet, 'invite');
        if (!canInvite) {
          return {
            success: false,
            error: 'You do not have permission to invite members to this shared wallet',
          };
        }
      }

      // Check wallet settings
      if (wallet.settings?.allowMemberInvites === false && !isCreator) {
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

      // ✅ FIX: Use Firestore transaction to atomically add members and grant private key access
      // This ensures both operations succeed or both fail (prevents members without private key access)
      const { runTransaction } = await import('firebase/firestore');
      const walletRef = doc(db, 'sharedWallets', walletDocId);
      const updatedMembers = [...wallet.members, ...newMembers];

      try {
        await runTransaction(db, async (transaction) => {
          // Step 1: Update shared wallet with new members
          transaction.update(walletRef, {
            members: updatedMembers,
            updatedAt: serverTimestamp(),
          });

          // Step 2: Grant private key access atomically
          if (newMembers.length > 0) {
            const { doc: docFn, getDoc } = await import('firebase/firestore');
            const privateKeyDocRef = docFn(db, 'splitWalletPrivateKeys', params.sharedWalletId);
            const privateKeyDoc = await transaction.get(privateKeyDocRef);

            if (!privateKeyDoc.exists()) {
              throw new Error('Split wallet private key document not found. Cannot grant access to new members.');
            }

            const privateKeyData = privateKeyDoc.data();
            const existingParticipants = privateKeyData?.participants || [];

            // Check for duplicates and filter out existing participants
            const uniqueNewParticipants = newMembers
              .map(m => ({ userId: m.userId, name: m.name }))
              .filter(newParticipant =>
                !existingParticipants.some(existing =>
                  existing.userId === newParticipant.userId
                )
              );

            if (uniqueNewParticipants.length > 0) {
              // Add new participants to the list
              const updatedParticipants = [...existingParticipants, ...uniqueNewParticipants];

              transaction.update(privateKeyDocRef, {
                participants: updatedParticipants,
                updatedAt: new Date().toISOString()
              });
            }
          }
        });

        logger.info('Members added and private key access granted atomically', {
          sharedWalletId: params.sharedWalletId,
          newMembersCount: newMembers.length
        }, 'SharedWalletService');
      } catch (transactionError) {
        const errorMessage = transactionError instanceof Error ? transactionError.message : String(transactionError);
        logger.error('Failed to add members atomically - transaction rolled back', {
          sharedWalletId: params.sharedWalletId,
          newMembersCount: newMembers.length,
          error: errorMessage
        }, 'SharedWalletService');

        // Transaction automatically rolls back both operations
        return {
          success: false,
          error: `Failed to add members: ${errorMessage}. No changes were made.`
        };
      }

      logger.info('Users invited to shared wallet', {
        sharedWalletId: params.sharedWalletId,
        inviterId: params.inviterId,
        invitedCount: newMembers.length,
        failedCount: failedInvitations.length,
      }, 'SharedWalletService');

      // ✅ FIX: Send notifications to invited users
      try {
        const { notificationService } = await import('../notifications/notificationService');
        const inviterData = await firebaseDataService.user.getCurrentUser(params.inviterId);
        const inviterName = inviterData?.name || 'Someone';
        
        for (const newMember of newMembers) {
          try {
            await notificationService.instance.sendNotification(
              newMember.userId,
              'Shared Wallet Invitation',
              `${inviterName} invited you to join the shared wallet "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_invite',
              {
                sharedWalletId: params.sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                inviterId: params.inviterId,
                inviterName: inviterName,
                status: 'invited',
              }
            );
            logger.info('Invitation notification sent', {
              userId: newMember.userId,
              sharedWalletId: params.sharedWalletId
            }, 'SharedWalletService');
          } catch (notifError) {
            logger.warn('Failed to send invitation notification', {
              userId: newMember.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'SharedWalletService');
            // Don't fail the invitation if notification fails
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send invitation notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'SharedWalletService');
        // Don't fail the invitation if notifications fail
      }

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
  ): Promise<GetSharedWalletTransactionsResult> {
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
   * Get on-chain balance for a shared wallet
   *
   * @param sharedWalletId - The shared wallet ID
   * @returns On-chain balance result
   */
  static async getSharedWalletOnChainBalance(
    sharedWalletId: string
  ): Promise<{ success: boolean; balance?: number; error?: string; accountExists?: boolean }> {
    try {
      await loadModules();

      // First get the wallet to find the wallet address
      const walletResult = await this.getSharedWallet(sharedWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Shared wallet not found'
        };
      }

      const wallet = walletResult.wallet;

      // Get on-chain balance
      const { BalanceUtils } = await import('../shared/balanceUtils');
      const { USDC_CONFIG } = await import('../shared/walletConstants');

      const balanceResult = await BalanceUtils.getUsdcBalance(wallet.walletAddress, USDC_CONFIG.mintAddress);

      return {
        success: true,
        balance: balanceResult.balance,
        accountExists: balanceResult.accountExists
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error getting on-chain balance', { error: errorMessage, sharedWalletId }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update member permissions
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param memberId - The member ID to update
   * @param updaterId - The user ID updating the permissions
   * @param permissions - The permissions to update
   * @returns Success or error
   */
  static async updateMemberPermissions(
    sharedWalletId: string,
    memberId: string,
    updaterId: string,
    permissions: Partial<import('./types').SharedWalletMemberPermissions>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      
      const { MemberRightsService } = await import('./MemberRightsService');
      return await MemberRightsService.updateMemberPermissions(
        sharedWalletId,
        memberId,
        updaterId,
        permissions
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error updating member permissions', { error: errorMessage }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update member role
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param memberId - The member ID to update
   * @param updaterId - The user ID updating the role
   * @param newRole - The new role ('admin' | 'member')
   * @returns Success or error
   */
  static async updateMemberRole(
    sharedWalletId: string,
    memberId: string,
    updaterId: string,
    newRole: 'admin' | 'member'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      
      const { MemberRightsService } = await import('./MemberRightsService');
      return await MemberRightsService.updateMemberRole(
        sharedWalletId,
        memberId,
        updaterId,
        newRole
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error updating member role', { error: errorMessage }, 'SharedWalletService');
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
      
      // ✅ FIX: Verify user is authenticated
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser || auth.currentUser.uid !== params.userId) {
        return {
          success: false,
          error: 'User not authenticated or user ID mismatch',
        };
      }
      
      // Verify user is the creator (only creator can update settings)
      if (wallet.creatorId !== params.userId) {
        return {
          success: false,
          error: 'Only the wallet creator can update settings',
        };
      }

      // Build update object - only include fields that are provided
      const updates: Partial<Pick<SharedWallet, 'customColor' | 'customLogo' | 'name' | 'settings' | 'updatedAt'>> = {
        updatedAt: serverTimestamp(),
      };

      if (params.customColor !== undefined) {
        updates.customColor = params.customColor || null;
      }

      if (params.customLogo !== undefined) {
        updates.customLogo = params.customLogo || null;
      }

      if (params.settings !== undefined) {
        // ✅ FIX: Handle undefined settings properly to prevent errors
        updates.settings = {
          ...(wallet.settings || {}), // Use empty object if settings is undefined
          ...params.settings,
        };
      }

      // ✅ FIX: Ensure updatedAt is always set to trigger real-time listeners
      if (!updates.updatedAt) {
        updates.updatedAt = serverTimestamp();
      }

      // ✅ FIX: Use runTransaction for atomic update and better error handling
      const { runTransaction } = await import('firebase/firestore');
      try {
        await runTransaction(db, async (transaction) => {
          const walletDocRef = doc(db, 'sharedWallets', walletDocId);
          const walletDoc = await transaction.get(walletDocRef);
          
          if (!walletDoc.exists()) {
            throw new Error('Shared wallet not found');
          }
          
          transaction.update(walletDocRef, updates);
        });
        
        logger.info('Shared wallet settings updated', {
          sharedWalletId: params.sharedWalletId,
          updates: Object.keys(updates),
        }, 'SharedWalletService');
      } catch (updateError) {
        const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        
        logger.error('Failed to update shared wallet settings', {
          sharedWalletId: params.sharedWalletId,
          error: errorMessage,
          isPermissionError,
          updates: Object.keys(updates)
        }, 'SharedWalletService');
        
        if (isPermissionError) {
          return {
            success: false,
            error: 'Permission denied. You may not have permission to update this wallet. Please ensure you are the creator or have admin rights.'
          };
        }
        
        throw updateError; // Re-throw for outer catch
      }

      // ✅ FIX: Send notifications to all active members when settings are updated
      try {
        const { notificationService } = await import('../notifications/notificationService');
        const { firebaseDataService } = await import('../data/firebaseDataService');
        const updaterData = await firebaseDataService.user.getCurrentUser(params.userId);
        const updaterName = updaterData?.name || 'The creator';

        // Build list of changed settings for notification
        const changedSettings: string[] = [];
        if (params.settings) {
          if (params.settings.allowMemberInvites !== undefined) {
            changedSettings.push('member invitation permissions');
          }
          if (params.settings.requireApprovalForWithdrawals !== undefined) {
            changedSettings.push('withdrawal approval requirements');
          }
          if (params.settings.maxMembers !== undefined) {
            changedSettings.push('maximum members limit');
          }
          if (params.settings.goalAmount !== undefined) {
            changedSettings.push('goal amount');
          }
        }
        if (params.customColor !== undefined) {
          changedSettings.push('wallet color');
        }
        if (params.customLogo !== undefined) {
          changedSettings.push('wallet logo');
        }
        if (params.name !== undefined) {
          changedSettings.push('wallet name');
        }

        const settingsDescription = changedSettings.length > 0 
          ? changedSettings.join(', ')
          : 'wallet settings';

        // Notify all active members
        const membersToNotify = wallet.members?.filter(m => m.status === 'active') || [];
        
        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Shared Wallet Settings Updated',
              `${updaterName} updated ${settingsDescription} for "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_settings_updated',
              {
                sharedWalletId: params.sharedWalletId,
                walletName: wallet.name || 'Shared Wallet',
                updaterId: params.userId,
                updaterName: updaterName,
                changedSettings: changedSettings,
                settingsDescription: settingsDescription,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send settings update notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'SharedWalletService');
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send settings update notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'SharedWalletService');
        // Don't fail the update if notifications fail
      }

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

  /**
   * Delete a shared wallet (only creator can delete)
   * This will:
   * 1. Delete the wallet document from Firestore
   * 2. Delete all related transactions
   * 3. Delete the private key from splitWalletPrivateKeys
   * 4. Clean up private keys from SecureStore for all members
   * 
   * @param sharedWalletId - The shared wallet ID
   * @param userId - The user ID requesting deletion (must be creator)
   * @returns Result indicating success or error
   */
  static async deleteSharedWallet(
    sharedWalletId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await loadModules();
      const { getSharedWalletDocById } = await import('./utils');
      const { db } = await import('../../config/firebase/firebase');
      const { doc, deleteDoc, collection, query, where, getDocs, runTransaction } = await import('firebase/firestore');
      
      // Get shared wallet
      const result = await getSharedWalletDocById(sharedWalletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;

      // Verify user is the creator
      if (wallet.creatorId !== userId) {
        return {
          success: false,
          error: 'Only the creator can delete this shared wallet',
        };
      }

      // Check if wallet has balance (warn but allow deletion)
      if (wallet.totalBalance > 0) {
        logger.warn('Deleting shared wallet with balance', {
          sharedWalletId,
          balance: wallet.totalBalance,
          userId
        }, 'SharedWalletService');
      }

      logger.info('Deleting shared wallet', {
        sharedWalletId,
        walletDocId,
        creatorId: wallet.creatorId,
        membersCount: wallet.members?.length || 0,
        balance: wallet.totalBalance
      }, 'SharedWalletService');

      // Step 1: Delete all related transactions
      try {
        const transactionsRef = collection(db, 'sharedWalletTransactions');
        const transactionsQuery = query(
          transactionsRef,
          where('sharedWalletId', '==', sharedWalletId)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        const deleteTransactionPromises = transactionsSnapshot.docs.map(async (txDoc) => {
          await deleteDoc(txDoc.ref);
        });
        
        await Promise.all(deleteTransactionPromises);
        
        logger.info('Deleted shared wallet transactions', {
          sharedWalletId,
          transactionCount: transactionsSnapshot.docs.length
        }, 'SharedWalletService');
      } catch (transactionError) {
        logger.warn('Failed to delete some transactions', {
          sharedWalletId,
          error: transactionError instanceof Error ? transactionError.message : String(transactionError)
        }, 'SharedWalletService');
        // Continue with deletion even if transaction cleanup fails
      }

      // Step 2: Delete private key from Firebase (splitWalletPrivateKeys collection)
      try {
        const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', sharedWalletId);
        await deleteDoc(privateKeyDocRef);
        
        logger.info('Deleted shared wallet private key from Firebase', {
          sharedWalletId
        }, 'SharedWalletService');
      } catch (privateKeyError) {
        logger.warn('Failed to delete private key from Firebase', {
          sharedWalletId,
          error: privateKeyError instanceof Error ? privateKeyError.message : String(privateKeyError)
        }, 'SharedWalletService');
        // Continue with deletion even if private key cleanup fails
      }

      // Step 3: Clean up private keys from SecureStore for all members
      try {
        const { SplitWalletSecurity } = await import('../split/SplitWalletSecurity');
        const members = wallet.members || [];
        
        // Delete private keys from SecureStore for all members
        const deleteKeyPromises = members.map(async (member) => {
          try {
            const { SecureStore } = await import('expo-secure-store');
            const storageKey = `split_wallet_private_key_${sharedWalletId}_${member.userId}`;
            await SecureStore.deleteItemAsync(storageKey);
            
            logger.debug('Deleted private key from SecureStore', {
              sharedWalletId,
              memberId: member.userId,
              storageKey
            }, 'SharedWalletService');
          } catch (keyError) {
            // Ignore errors for keys that don't exist
            logger.debug('Private key not found in SecureStore (may not exist)', {
              sharedWalletId,
              memberId: member.userId
            }, 'SharedWalletService');
          }
        });
        
        await Promise.all(deleteKeyPromises);
        
        logger.info('Cleaned up private keys from SecureStore', {
          sharedWalletId,
          membersCount: members.length
        }, 'SharedWalletService');
      } catch (secureStoreError) {
        logger.warn('Failed to clean up some private keys from SecureStore', {
          sharedWalletId,
          error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError)
        }, 'SharedWalletService');
        // Continue with deletion even if SecureStore cleanup fails
      }

      // Step 4: Delete the wallet document itself
      const walletDocRef = doc(db, 'sharedWallets', walletDocId);
      await deleteDoc(walletDocRef);

      logger.info('Shared wallet deleted successfully', {
        sharedWalletId,
        walletDocId,
        creatorId: wallet.creatorId
      }, 'SharedWalletService');

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('SharedWalletService: Error deleting shared wallet', {
        sharedWalletId,
        userId,
        error: errorMessage
      }, 'SharedWalletService');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Export constants for convenience
export { SHARED_WALLET_CONSTANTS } from './types';

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

