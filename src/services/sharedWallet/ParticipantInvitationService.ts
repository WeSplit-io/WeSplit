/**
 * Participant Invitation Service
 * Reusable utility for inviting participants to shared wallets
 * Separates invitation logic from UI components
 */

import { logger } from '../core';
import { SharedWalletService } from './index';
import { UserContact } from '../../types';

export interface InviteParticipantsParams {
  sharedWalletId: string;
  inviterId: string;
  contacts: UserContact[];
}

export interface InviteParticipantsResult {
  success: boolean;
  invitedCount?: number;
  error?: string;
  message?: string;
}

export class ParticipantInvitationService {
  /**
   * Invite multiple contacts to a shared wallet
   * 
   * @param params - Invitation parameters
   * @returns Result with invitation count or error
   */
  static async inviteParticipants(
    params: InviteParticipantsParams
  ): Promise<InviteParticipantsResult> {
    try {
      logger.info('Inviting participants to shared wallet', {
        sharedWalletId: params.sharedWalletId,
        inviterId: params.inviterId,
        contactCount: params.contacts.length,
      }, 'ParticipantInvitationService');

      if (!params.contacts || params.contacts.length === 0) {
        return {
          success: false,
          error: 'No contacts selected',
        };
      }

      // Extract user IDs from contacts
      const inviteeIds = params.contacts.map(contact => contact.id.toString());

      // Use SharedWalletService to invite
      const result = await SharedWalletService.inviteToSharedWallet({
        sharedWalletId: params.sharedWalletId,
        inviterId: params.inviterId,
        inviteeIds,
      });

      if (result.success) {
        logger.info('Participants invited successfully', {
          sharedWalletId: params.sharedWalletId,
          invitedCount: result.invitedCount,
        }, 'ParticipantInvitationService');
      } else {
        logger.error('Failed to invite participants', {
          sharedWalletId: params.sharedWalletId,
          error: result.error,
        }, 'ParticipantInvitationService');
      }

      return result;
    } catch (error) {
      logger.error('ParticipantInvitationService: Error inviting participants', error, 'ParticipantInvitationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if a contact is already a member of the shared wallet
   * 
   * @param walletMembers - Array of wallet members
   * @param contactId - Contact ID to check
   * @returns True if contact is already a member
   */
  static isContactAlreadyMember(
    walletMembers: Array<{ userId: string }>,
    contactId: string | number
  ): boolean {
    const contactIdStr = contactId.toString();
    return walletMembers.some(member => member.userId === contactIdStr);
  }

  /**
   * Filter out contacts that are already members
   * 
   * @param contacts - Contacts to filter
   * @param walletMembers - Array of wallet members
   * @returns Filtered contacts (excluding existing members)
   */
  static filterExistingMembers(
    contacts: UserContact[],
    walletMembers: Array<{ userId: string }>
  ): UserContact[] {
    return contacts.filter(contact => 
      !this.isContactAlreadyMember(walletMembers, contact.id)
    );
  }
}

