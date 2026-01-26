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
   * Retry Firestore transaction with exponential backoff
   * Handles transaction conflicts and permission errors
   */
  private static async retryTransaction<T>(
    transactionFn: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = 'transaction'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await transactionFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;
        
        // Check if it's a transaction conflict (can retry)
        const isTransactionConflict = 
          errorMessage.includes('transaction') ||
          errorMessage.includes('concurrent') ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('deadline');
        
        // Permission errors should not be retried
        const isPermissionError = 
          errorMessage.includes('permission') ||
          errorMessage.includes('Permission') ||
          errorMessage.includes('PERMISSION_DENIED');
        
        if (isPermissionError) {
          // Don't retry permission errors
          throw lastError;
        }
        
        if (!isTransactionConflict) {
          // Not a retryable error
          throw lastError;
        }
        
        // If it's a transaction conflict and we have retries left, wait and retry
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          logger.warn(`Transaction conflict on ${operationName}, retrying`, {
            attempt: attempt + 1,
            maxRetries,
            backoffMs,
            error: errorMessage
          }, 'MemberRightsService');
          
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    // All retries exhausted
    logger.error(`Transaction failed after ${maxRetries} attempts`, {
      operationName,
      error: lastError?.message
    }, 'MemberRightsService');
    
    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Get the amount withdrawn today by a member
   * Returns 0 if last withdrawal was on a different day (resets at midnight UTC)
   */
  static getDailyWithdrawnAmount(member: SharedWalletMember): number {
    if (!member.lastWithdrawalDate || !member.dailyWithdrawnAmount) {
      return 0;
    }

    // Check if last withdrawal was today (UTC)
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const lastWithdrawalDateStr = member.lastWithdrawalDate.split('T')[0];
    
    // If same day, return the amount; otherwise reset to 0
    if (lastWithdrawalDateStr === todayDateStr) {
      return member.dailyWithdrawnAmount || 0;
    }
    
    // Different day - reset to 0
    return 0;
  }

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

    // If member has custom permissions, always use them (merge with role defaults)
    // Log warning if custom permissions exist but enableCustomPermissions flag is false
    if (member.permissions) {
      if (!wallet.settings?.enableCustomPermissions) {
        logger.warn('Custom permissions exist but enableCustomPermissions flag is false', {
          walletId: wallet.id,
          memberId: member.userId,
          note: 'Custom permissions will still be applied, but flag should be set to true for consistency'
        }, 'MemberRightsService');
      }
      
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
   * Get available balance for withdrawal
   * Returns the wallet's total balance (pool-based approach)
   * This is the single source of truth for balance validation
   */
  static getAvailableBalance(
    member: SharedWalletMember,
    wallet: SharedWallet
  ): { availableBalance: number; error?: string } {
    // Pool-based approach: users can withdraw from the shared pool
    const availableBalance = wallet.totalBalance || 0;
    
    if (availableBalance < 0) {
      return {
        availableBalance: 0,
        error: 'Wallet balance is negative - this should not happen'
      };
    }
    
    return { availableBalance };
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
   * Validate permissions for logical consistency
   * Clears limits when canWithdraw is false, validates limits are positive
   */
  static validatePermissions(
    permissions: Partial<SharedWalletMemberPermissions>
  ): { valid: boolean; cleaned: Partial<SharedWalletMemberPermissions>; errors: string[] } {
    const errors: string[] = [];
    const cleaned: Partial<SharedWalletMemberPermissions> = { ...permissions };

    // If canWithdraw is false, clear withdrawal limits
    if (permissions.canWithdraw === false) {
      if (permissions.withdrawalLimit !== undefined) {
        delete cleaned.withdrawalLimit;
        errors.push('Withdrawal limit cleared because canWithdraw is false');
      }
      if (permissions.dailyWithdrawalLimit !== undefined) {
        delete cleaned.dailyWithdrawalLimit;
        errors.push('Daily withdrawal limit cleared because canWithdraw is false');
      }
    }

    // Validate withdrawal limits are positive numbers
    if (cleaned.withdrawalLimit !== undefined) {
      if (isNaN(cleaned.withdrawalLimit) || cleaned.withdrawalLimit <= 0) {
        errors.push('Withdrawal limit must be a positive number');
        delete cleaned.withdrawalLimit;
      }
    }

    if (cleaned.dailyWithdrawalLimit !== undefined) {
      if (isNaN(cleaned.dailyWithdrawalLimit) || cleaned.dailyWithdrawalLimit <= 0) {
        errors.push('Daily withdrawal limit must be a positive number');
        delete cleaned.dailyWithdrawalLimit;
      }
    }

    // Validate that if limits are set, canWithdraw should be true
    if ((cleaned.withdrawalLimit !== undefined || cleaned.dailyWithdrawalLimit !== undefined) && 
        cleaned.canWithdraw === false) {
      errors.push('Cannot set withdrawal limits when canWithdraw is false');
    }

    return {
      valid: errors.length === 0,
      cleaned,
      errors
    };
  }

  /**
   * Get error reason for action denial based on member status
   */
  static getActionErrorReason(
    member: SharedWalletMember,
    action: string
  ): string {
    if (member.status === 'invited') {
      return `You need to accept the invitation to this shared wallet before you can ${action}. Please check your notifications or the wallet details.`;
    } else if (member.status === 'removed') {
      return `You have been removed from this shared wallet and can no longer ${action}.`;
    } else if (member.status === 'left') {
      return `You have left this shared wallet and can no longer ${action}.`;
    } else {
      return `Your account status is "${member.status}". You must be an active member to ${action}. Please contact the wallet creator if you believe this is an error.`;
    }
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

    // Check if member is active - use detailed status checks like canWithdrawAmount()
    if (member.status !== 'active') {
      return false;
    }

    return this.hasPermission(member, wallet, permission);
  }

  /**
   * Check if a member can perform an action with detailed error reason
   * Returns both allowed status and reason for denial (if applicable)
   */
  static canPerformActionWithReason(
    member: SharedWalletMember,
    wallet: SharedWallet,
    action: 'invite' | 'withdraw' | 'manageSettings' | 'removeMembers' | 'viewTransactions' | 'fund'
  ): { allowed: boolean; reason?: string } {
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
      return {
        allowed: false,
        reason: `Unknown action: ${action}`
      };
    }

    // Check if member is active - provide detailed error reason
    if (member.status !== 'active') {
      return {
        allowed: false,
        reason: this.getActionErrorReason(member, action)
      };
    }

    const hasPermission = this.hasPermission(member, wallet, permission);
    if (!hasPermission) {
      const permissions = this.getMemberPermissions(member, wallet);
      return {
        allowed: false,
        reason: `You do not have permission to ${action} in this shared wallet. Please contact the wallet creator or an admin to request access.`
      };
    }

    return { allowed: true };
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

    // Check daily limit - calculate cumulative daily withdrawals
    if (permissions.dailyWithdrawalLimit) {
      const currentDailyAmount = this.getDailyWithdrawnAmount(member);
      const newDailyTotal = currentDailyAmount + amount;
      
      if (newDailyTotal > permissions.dailyWithdrawalLimit) {
        const remainingDailyLimit = permissions.dailyWithdrawalLimit - currentDailyAmount;
        return {
          allowed: false,
          reason: `Withdrawal would exceed your daily limit of ${permissions.dailyWithdrawalLimit} ${wallet.currency}. You have ${remainingDailyLimit.toFixed(6)} ${wallet.currency} remaining today.`,
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

      // ✅ FIX: Verify user is authenticated
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser || auth.currentUser.uid !== updaterId) {
        return {
          success: false,
          error: 'User not authenticated or user ID mismatch',
        };
      }

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

      // ✅ FIX: Validate permissions before updating
      const validation = this.validatePermissions(permissions);
      if (!validation.valid && validation.errors.length > 0) {
        logger.warn('Permission validation found issues', {
          walletId,
          memberId,
          errors: validation.errors,
          originalPermissions: permissions
        }, 'MemberRightsService');
        // Continue with cleaned permissions - validation fixes issues automatically
      }
      
      // Use cleaned permissions (validation may have removed invalid values)
      const validatedPermissions = validation.cleaned;

      // ✅ FIX: Update member permissions - merge provided permissions with existing
      // This ensures that all fields are preserved, and only updated fields change
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === memberId) {
          // Start with existing permissions (if any)
          const existingPermissions = m.permissions || {};
          
          // Merge with new permissions (new permissions override existing)
          const mergedPermissions: Partial<SharedWalletMemberPermissions> = {
            ...existingPermissions,
            ...validatedPermissions, // Use validated permissions
          };
          
          // Remove undefined values (but keep false values - they're intentional)
          const cleanedPermissions: Partial<SharedWalletMemberPermissions> = {};
          Object.keys(mergedPermissions).forEach(key => {
            const value = mergedPermissions[key as keyof SharedWalletMemberPermissions];
            if (value !== undefined) {
              cleanedPermissions[key as keyof SharedWalletMemberPermissions] = value;
            }
          });
          
          logger.info('Updating member permissions', {
            walletId,
            memberId,
            existingPermissions: Object.keys(existingPermissions),
            newPermissions: Object.keys(validatedPermissions),
            finalPermissions: Object.keys(cleanedPermissions),
            permissionValues: cleanedPermissions,
            validationErrors: validation.errors,
            note: 'Merging new permissions with existing, keeping all explicitly set fields'
          }, 'MemberRightsService');
          
          return {
            ...m,
            permissions: Object.keys(cleanedPermissions).length > 0 ? cleanedPermissions : undefined,
          };
        }
        return m;
      });

      // ✅ FIX: Enable custom permissions in wallet settings if not already enabled
      // This ensures that custom permissions are actually used when retrieved
      const currentSettings = wallet.settings || {};
      const needsEnableCustomPermissions = !currentSettings.enableCustomPermissions;
      const updatedSettings = needsEnableCustomPermissions
        ? { ...currentSettings, enableCustomPermissions: true }
        : currentSettings;

      // ✅ FIX: Use runTransaction for atomic update to ensure consistency and trigger listeners
      // Wrap in retry logic to handle transaction conflicts
      const { runTransaction } = await import('firebase/firestore');
      try {
        await this.retryTransaction(async () => {
          return await runTransaction(db, async (transaction) => {
            const walletDocRef = doc(db, 'sharedWallets', walletDocId);
            const walletDoc = await transaction.get(walletDocRef);
            
            if (!walletDoc.exists()) {
              throw new Error('Shared wallet not found');
            }
            
            // Update both members and settings if needed
            const updateData: any = {
              members: updatedMembers,
              updatedAt: serverTimestamp(),
            };
            
            // Only update settings if we need to enable custom permissions
            if (needsEnableCustomPermissions) {
              updateData.settings = updatedSettings;
              logger.info('Enabling custom permissions in wallet settings', {
                walletId,
                note: 'Custom permissions are now enabled for this wallet'
              }, 'MemberRightsService');
            }
            
            transaction.update(walletDocRef, updateData);
          });
        }, 3, 'updateMemberPermissions');
        
        logger.info('Member permissions updated', {
          walletId,
          memberId,
          updaterId,
          permissions: Object.keys(validatedPermissions),
        }, 'MemberRightsService');
      } catch (updateError) {
        const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        
        logger.error('Failed to update member permissions', {
          walletId,
          memberId,
          updaterId,
          error: errorMessage,
          isPermissionError
        }, 'MemberRightsService');
        
        if (isPermissionError) {
          return {
            success: false,
            error: 'Permission denied. Only creator or admin can update member permissions.'
          };
        }
        
        return {
          success: false,
          error: errorMessage || 'Failed to update member permissions'
        };
      }

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

      // ✅ FIX: Verify user is authenticated
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      if (!auth.currentUser || auth.currentUser.uid !== updaterId) {
        return {
          success: false,
          error: 'User not authenticated or user ID mismatch',
        };
      }

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
      // NOTE: Permission reset behavior:
      // - If enableCustomPermissions is true: custom permissions are preserved when role changes
      // - If enableCustomPermissions is false: custom permissions are cleared (role defaults apply)
      // This ensures that custom permissions are only used when explicitly enabled in wallet settings
      const updatedMembers = wallet.members.map((m) => {
        if (m.userId === memberId) {
          const shouldPreservePermissions = wallet.settings?.enableCustomPermissions === true;
          
          logger.info('Updating member role', {
            walletId,
            memberId,
            oldRole: m.role,
            newRole,
            hasCustomPermissions: !!m.permissions,
            enableCustomPermissions: wallet.settings?.enableCustomPermissions,
            willPreservePermissions: shouldPreservePermissions,
            note: shouldPreservePermissions 
              ? 'Custom permissions will be preserved because enableCustomPermissions is true'
              : 'Custom permissions will be cleared because enableCustomPermissions is false or not set'
          }, 'MemberRightsService');
          
          return {
            ...m,
            role: newRole,
            // Reset permissions when role changes (unless custom permissions are enabled)
            permissions: shouldPreservePermissions
              ? m.permissions
              : undefined,
          };
        }
        return m;
      });

      // ✅ FIX: Use runTransaction for atomic update and better error handling
      // Wrap in retry logic to handle transaction conflicts
      const { runTransaction } = await import('firebase/firestore');
      try {
        await this.retryTransaction(async () => {
          return await runTransaction(db, async (transaction) => {
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
        }, 3, 'updateMemberRole');
        
        logger.info('Member role updated', {
          walletId,
          memberId,
          newRole,
          updaterId,
        }, 'MemberRightsService');
      } catch (updateError) {
        const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        
        logger.error('Failed to update member role', {
          walletId,
          memberId,
          updaterId,
          error: errorMessage,
          isPermissionError
        }, 'MemberRightsService');
        
        if (isPermissionError) {
          return {
            success: false,
            error: 'Permission denied. Only the creator can change member roles.'
          };
        }
        
        return {
          success: false,
          error: errorMessage || 'Failed to update member role'
        };
      }

      // ✅ FIX: Send notifications when member role is changed
      try {
        const { notificationService } = await import('../../notifications/notificationService');
        const { firebaseDataService } = await import('../data/firebaseDataService');
        const updaterData = await firebaseDataService.user.getCurrentUser(updaterId);
        const updaterName = updaterData?.name || 'An admin';
        const memberData = await firebaseDataService.user.getCurrentUser(memberId);
        const memberName = memberData?.name || 'A member';

        // Notify the member whose role changed
        try {
          await notificationService.instance.sendNotification(
            memberId,
            'Role Changed in Shared Wallet',
            `${updaterName} changed your role to ${newRole} in "${wallet.name || 'Shared Wallet'}"`,
            'shared_wallet_role_changed',
            {
              sharedWalletId: walletId,
              walletName: wallet.name || 'Shared Wallet',
              updaterId,
              updaterName,
              memberId,
              memberName,
              newRole,
            }
          );
        } catch (notifError) {
          logger.warn('Failed to send role change notification to member', {
            memberId,
            error: notifError instanceof Error ? notifError.message : String(notifError)
          }, 'MemberRightsService');
        }

        // Notify all active members (except the member whose role changed and the updater)
        const membersToNotify = wallet.members?.filter(m => 
          m.userId !== memberId && 
          m.userId !== updaterId && 
          m.status === 'active'
        ) || [];

        for (const member of membersToNotify) {
          try {
            await notificationService.instance.sendNotification(
              member.userId,
              'Member Role Changed in Shared Wallet',
              `${updaterName} changed ${memberName}'s role to ${newRole} in "${wallet.name || 'Shared Wallet'}"`,
              'shared_wallet_role_changed',
              {
                sharedWalletId: walletId,
                walletName: wallet.name || 'Shared Wallet',
                updaterId,
                updaterName,
                memberId,
                memberName,
                newRole,
              }
            );
          } catch (notifError) {
            logger.warn('Failed to send role change notification to member', {
              memberId: member.userId,
              error: notifError instanceof Error ? notifError.message : String(notifError)
            }, 'MemberRightsService');
          }
        }
      } catch (notificationError) {
        logger.warn('Failed to send role change notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        }, 'MemberRightsService');
        // Don't fail the role update if notifications fail
      }

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
