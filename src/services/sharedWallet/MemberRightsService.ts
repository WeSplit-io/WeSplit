/**
 * Member Rights Service
 * Handles member permissions and rights management for shared wallets
 */

import { logger } from '../core';
import type {
  SharedWallet,
  SharedWalletMember,
  SharedWalletMemberPermissions,
} from './types';

/**
 * Default permissions based on role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  'creator' | 'admin' | 'member',
  SharedWalletMemberPermissions
> = {
  creator: {
    canInviteMembers: true,
    canWithdraw: true,
    canManageSettings: true,
    canRemoveMembers: true,
    canViewTransactions: true,
    canFund: true,
  },
  admin: {
    canInviteMembers: true,
    canWithdraw: true,
    canManageSettings: false,
    canRemoveMembers: false,
    canViewTransactions: true,
    canFund: true,
  },
  member: {
    canInviteMembers: false,
    canWithdraw: true,
    canManageSettings: false,
    canRemoveMembers: false,
    canViewTransactions: true,
    canFund: true,
  },
};

export class MemberRightsService {
  /**
   * Get effective permissions for a member
   * Combines role-based defaults with custom permissions if enabled
   */
  static getMemberPermissions(
    member: SharedWalletMember,
    wallet: SharedWallet
  ): SharedWalletMemberPermissions {
    // Creator always has all permissions
    if (member.role === 'creator') {
      return DEFAULT_ROLE_PERMISSIONS.creator;
    }

    // If custom permissions are enabled and member has custom permissions, use them
    if (
      wallet.settings?.enableCustomPermissions &&
      member.permissions
    ) {
      // Merge custom permissions with role defaults (custom takes precedence)
      return {
        ...DEFAULT_ROLE_PERMISSIONS[member.role],
        ...member.permissions,
      };
    }

    // Otherwise use role-based defaults
    return DEFAULT_ROLE_PERMISSIONS[member.role];
  }

  /**
   * Check if a member has a specific permission
   */
  static hasPermission(
    member: SharedWalletMember,
    wallet: SharedWallet,
    permission: keyof SharedWalletMemberPermissions
  ): boolean {
    const permissions = this.getMemberPermissions(member, wallet);
    return permissions[permission] === true;
  }

  /**
   * Check if a member can perform an action
   */
  static canPerformAction(
    member: SharedWalletMember,
    wallet: SharedWallet,
    action: 'invite' | 'withdraw' | 'manageSettings' | 'removeMembers' | 'viewTransactions' | 'fund'
  ): boolean {
    const permissionMap: Record<string, keyof SharedWalletMemberPermissions> = {
      invite: 'canInviteMembers',
      withdraw: 'canWithdraw',
      manageSettings: 'canManageSettings',
      removeMembers: 'canRemoveMembers',
      viewTransactions: 'canViewTransactions',
      fund: 'canFund',
    };

    const permission = permissionMap[action];
    if (!permission) {
      return false;
    }

    // Check if member is active
    if (member.status !== 'active') {
      return false;
    }

    return this.hasPermission(member, wallet, permission);
  }

  /**
   * Check if withdrawal amount is within limits
   */
  static canWithdrawAmount(
    member: SharedWalletMember,
    wallet: SharedWallet,
    amount: number
  ): { allowed: boolean; reason?: string } {
    // Check if member is active first
    if (member.status !== 'active') {
      if (member.status === 'invited') {
        return {
          allowed: false,
          reason: 'You need to accept the invitation to this shared wallet before you can withdraw funds. Please check your notifications or the wallet details.',
        };
      } else if (member.status === 'removed') {
        return {
          allowed: false,
          reason: 'You have been removed from this shared wallet and can no longer withdraw funds.',
        };
      } else {
        return {
          allowed: false,
          reason: `Your account status is "${member.status}". You must be an active member to withdraw funds. Please contact the wallet creator if you believe this is an error.`,
        };
      }
    }

    // Check basic permission
    if (!this.canPerformAction(member, wallet, 'withdraw')) {
      const permissions = this.getMemberPermissions(member, wallet);
      if (!permissions.canWithdraw) {
        return {
          allowed: false,
          reason: 'You do not have permission to withdraw funds from this shared wallet. The wallet creator or an admin needs to grant you withdrawal permissions. Please contact them to request access.',
        };
      }
      return {
        allowed: false,
        reason: 'You do not have permission to withdraw funds from this shared wallet.',
      };
    }

    const permissions = this.getMemberPermissions(member, wallet);

    // Check per-transaction limit
    if (permissions.withdrawalLimit && amount > permissions.withdrawalLimit) {
      return {
        allowed: false,
        reason: `Withdrawal amount exceeds your limit of ${permissions.withdrawalLimit} ${wallet.currency}`,
      };
    }

    // Check daily limit (would need to track daily withdrawals)
    // This is a placeholder - would need to implement daily tracking
    if (permissions.dailyWithdrawalLimit) {
      // TODO: Implement daily withdrawal tracking
      // For now, just check the limit
      if (amount > permissions.dailyWithdrawalLimit) {
        return {
          allowed: false,
          reason: `Withdrawal amount exceeds your daily limit of ${permissions.dailyWithdrawalLimit} ${wallet.currency}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Update member permissions
   */
  static async updateMemberPermissions(
    walletId: string,
    memberId: string,
    updaterId: string,
    permissions: Partial<SharedWalletMemberPermissions>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');

      // Get wallet
      const result = await getSharedWalletDocById(walletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;

      // Verify updater has permission
      const updater = wallet.members.find((m) => m.userId === updaterId);
      if (!updater) {
        return {
          success: false,
          error: 'You are not a member of this shared wallet',
        };
      }

      // Only creator or admin can update permissions
      if (updater.role !== 'creator' && updater.role !== 'admin') {
        return {
          success: false,
          error: 'Only creator or admin can update member permissions',
        };
      }

      // Cannot update creator's permissions
      const targetMember = wallet.members.find((m) => m.userId === memberId);
      if (!targetMember) {
        return {
          success: false,
          error: 'Member not found',
        };
      }

      if (targetMember.role === 'creator') {
        return {
          success: false,
          error: 'Cannot modify creator permissions',
        };
      }

      // Cannot update your own permissions (unless you're creator)
      if (memberId === updaterId && updater.role !== 'creator') {
        return {
          success: false,
          error: 'Cannot modify your own permissions',
        };
      }

      // Update member permissions
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === memberId) {
          return {
            ...m,
            permissions: {
              ...(m.permissions || {}),
              ...permissions,
            },
          };
        }
        return m;
      });

      // ✅ FIX: Use runTransaction for atomic update to ensure consistency and trigger listeners
      const { runTransaction } = await import('firebase/firestore');
      await runTransaction(db, async (transaction) => {
        const walletDocRef = doc(db, 'sharedWallets', walletDocId);
        const walletDoc = await transaction.get(walletDocRef);
        
        if (!walletDoc.exists()) {
          throw new Error('Shared wallet not found');
        }
        
        transaction.update(walletDocRef, {
          members: updatedMembers,
          updatedAt: serverTimestamp(),
        });
      });

      logger.info('Member permissions updated', {
        walletId,
        memberId,
        updaterId,
        permissions: Object.keys(permissions),
      }, 'MemberRightsService');

      // ✅ FIX: Send notification to the member whose permissions were changed
      try {
        const { notificationService } = await import('../../notifications/notificationService');
        const { firebaseDataService } = await import('../data/firebaseDataService');
        const updaterData = await firebaseDataService.user.getCurrentUser(updaterId);
        const updaterName = updaterData?.name || 'An admin';
        
        // Build permission change description
        const permissionChanges: string[] = [];
        if (permissions.canWithdraw !== undefined) {
          permissionChanges.push(permissions.canWithdraw ? 'withdraw funds' : 'no longer withdraw funds');
        }
        if (permissions.canInviteMembers !== undefined) {
          permissionChanges.push(permissions.canInviteMembers ? 'invite members' : 'no longer invite members');
        }
        if (permissions.canManageSettings !== undefined) {
          permissionChanges.push(permissions.canManageSettings ? 'manage settings' : 'no longer manage settings');
        }
        if (permissions.withdrawalLimit !== undefined) {
          permissionChanges.push(`withdrawal limit set to ${permissions.withdrawalLimit} ${wallet.currency || 'USDC'}`);
        }
        
        const changeDescription = permissionChanges.length > 0 
          ? permissionChanges.join(', ')
          : 'permissions updated';
        
        await notificationService.instance.sendNotification(
          memberId,
          'Shared Wallet Permissions Updated',
          `${updaterName} updated your permissions in "${wallet.name || 'Shared Wallet'}". You can now ${changeDescription}.`,
          'shared_wallet_permissions_updated',
          {
            sharedWalletId: walletId,
            walletName: wallet.name || 'Shared Wallet',
            updaterId: updaterId,
            updaterName: updaterName,
            permissions: permissions,
            changeDescription: changeDescription,
          }
        );
        
        logger.info('Permission change notification sent', {
          memberId,
          walletId
        }, 'MemberRightsService');
      } catch (notificationError) {
        logger.warn('Failed to send permission change notification', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          memberId,
          walletId
        }, 'MemberRightsService');
        // Don't fail the permission update if notification fails
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error updating member permissions', {
        walletId,
        memberId,
        error: errorMessage,
      }, 'MemberRightsService');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    walletId: string,
    memberId: string,
    updaterId: string,
    newRole: 'admin' | 'member'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { getSharedWalletDocById } = await import('./utils');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');

      // Get wallet
      const result = await getSharedWalletDocById(walletId);
      if (!result) {
        return {
          success: false,
          error: 'Shared wallet not found',
        };
      }

      const { wallet, walletDocId } = result;

      // Verify updater is creator
      if (wallet.creatorId !== updaterId) {
        return {
          success: false,
          error: 'Only the creator can change member roles',
        };
      }

      // Cannot change creator's role
      if (memberId === wallet.creatorId) {
        return {
          success: false,
          error: 'Cannot change creator role',
        };
      }

      // Update member role
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === memberId) {
          return {
            ...m,
            role: newRole,
            // Reset permissions when role changes (unless custom permissions are enabled)
            permissions: wallet.settings?.enableCustomPermissions
              ? m.permissions
              : undefined,
          };
        }
        return m;
      });

      await updateDoc(doc(db, 'sharedWallets', walletDocId), {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });

      logger.info('Member role updated', {
        walletId,
        memberId,
        newRole,
        updaterId,
      }, 'MemberRightsService');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error updating member role', {
        walletId,
        memberId,
        error: errorMessage,
      }, 'MemberRightsService');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
