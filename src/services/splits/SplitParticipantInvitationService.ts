/**
 * Split Participant Invitation Service
 * Reusable utility for inviting participants to splits
 * Separates invitation logic from UI components
 */

import { logger } from '../core';
import { SplitStorageService } from './splitStorageService';
import { notificationService } from '../notifications';
import { firebaseDataService } from '../data';
import { UserContact } from '../../types';
import { Split } from './splitStorageService';

export interface InviteSplitParticipantsParams {
  splitId: string;
  inviterId: string;
  inviterName: string;
  contacts: UserContact[];
  billName: string;
  totalAmount: number;
  existingParticipants?: Array<{ userId: string; id?: string }>;
  splitWalletId?: string;
}

export interface InviteSplitParticipantsResult {
  success: boolean;
  invitedCount?: number;
  error?: string;
  message?: string;
}

export class SplitParticipantInvitationService {
  /**
   * Invite multiple contacts to a split
   * 
   * @param params - Invitation parameters
   * @returns Result with invitation count or error
   */
  static async inviteParticipants(
    params: InviteSplitParticipantsParams
  ): Promise<InviteSplitParticipantsResult> {
    try {
      logger.info('Inviting participants to split', {
        splitId: params.splitId,
        inviterId: params.inviterId,
        contactCount: params.contacts.length,
      }, 'SplitParticipantInvitationService');

      if (!params.contacts || params.contacts.length === 0) {
        return {
          success: false,
          error: 'No contacts selected',
        };
      }

      // Filter out existing participants
      const existingParticipantIds = new Set(
        (params.existingParticipants || []).map(p => (p.userId || p.id)?.toString())
      );
      
      const newContacts = params.contacts.filter(contact => {
        const contactId = (contact.id || contact.userId)?.toString();
        return contactId && !existingParticipantIds.has(contactId);
      });

      if (newContacts.length === 0) {
        return {
          success: false,
          error: 'All selected contacts are already participants in this split.',
        };
      }

      let invitedCount = 0;
      const failedInvitations: string[] = [];

      // Process each contact
      for (const contact of newContacts) {
        try {
          const result = await this.inviteSingleParticipant({
            splitId: params.splitId,
            inviterId: params.inviterId,
            inviterName: params.inviterName,
            contact,
            billName: params.billName,
            totalAmount: params.totalAmount,
            splitWalletId: params.splitWalletId,
          });

          if (result.success) {
            invitedCount++;
          } else {
            failedInvitations.push(contact.name || 'Unknown');
            logger.warn('Failed to invite contact', {
              contactId: contact.id,
              error: result.error,
            }, 'SplitParticipantInvitationService');
          }
        } catch (error) {
          failedInvitations.push(contact.name || 'Unknown');
          logger.error('Error inviting contact', {
            contactId: contact.id,
            error,
          }, 'SplitParticipantInvitationService');
        }
      }

      // Update split wallet participants if we have a split wallet
      if (params.splitWalletId && invitedCount > 0) {
        try {
          const { SplitWalletManagement } = await import('../split/SplitWalletManagement');
          
          // Get current split data to get all participants
          const updatedSplitResult = await SplitStorageService.getSplit(params.splitId);
          if (updatedSplitResult.success && updatedSplitResult.split) {
            const allParticipants = updatedSplitResult.split.participants.map(p => ({
              userId: p.userId,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed
            }));

            await SplitWalletManagement.updateSplitWalletParticipants(
              params.splitWalletId,
              allParticipants
            );
          }
        } catch (walletError) {
          logger.warn('Failed to update split wallet participants', {
            error: walletError,
          }, 'SplitParticipantInvitationService');
          // Don't fail the entire operation if wallet update fails
        }
      }

      if (invitedCount === 0) {
        return {
          success: false,
          error: failedInvitations.length > 0
            ? `Failed to invite contacts: ${failedInvitations.join(', ')}`
            : 'Failed to invite any contacts',
        };
      }

      const message = failedInvitations.length > 0
        ? `Successfully invited ${invitedCount} contact(s). Failed to invite: ${failedInvitations.join(', ')}`
        : `Successfully invited ${invitedCount} contact(s) to the split.`;

      return {
        success: true,
        invitedCount,
        message,
      };
    } catch (error) {
      logger.error('SplitParticipantInvitationService: Error inviting participants', error, 'SplitParticipantInvitationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Invite a single contact to a split
   * 
   * @param params - Single invitation parameters
   * @returns Result with success or error
   */
  private static async inviteSingleParticipant(params: {
    splitId: string;
    inviterId: string;
    inviterName: string;
    contact: UserContact;
    billName: string;
    totalAmount: number;
    splitWalletId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Fetch the latest user data to get current wallet address
      let latestWalletAddress = params.contact.walletAddress || 
                                params.contact.wallet_address || 
                                params.contact.walletAddress ||
                                '';
      
      try {
        const latestUserData = await firebaseDataService.user.getCurrentUser(
          params.contact.id || params.contact.userId
        );
        
        if (latestUserData) {
          // Try multiple fields for wallet address
          latestWalletAddress = latestUserData.wallet_address || 
                               latestUserData.wallet_public_key || 
                               latestUserData.walletAddress ||
                               latestWalletAddress;
          
          if (!latestWalletAddress) {
            logger.warn('User has no wallet address in database', {
              contactId: params.contact.id,
              userName: latestUserData.name,
              availableFields: Object.keys(latestUserData).filter(k => 
                k.toLowerCase().includes('wallet') || k.toLowerCase().includes('address')
              )
            }, 'SplitParticipantInvitationService');
          }
        }
      } catch (error) {
        logger.warn('Could not fetch latest user data, using contact data', {
          contactId: params.contact.id,
          error,
        }, 'SplitParticipantInvitationService');
      }

      // Add participant to the split in the database
      const participantData = {
        userId: params.contact.id || params.contact.userId,
        name: params.contact.name,
        email: params.contact.email || '',
        walletAddress: latestWalletAddress,
        amountOwed: 0, // Will be calculated when split is finalized
        amountPaid: 0,
        status: 'invited' as const,
        avatar: params.contact.avatar,
      };

      const addParticipantResult = await SplitStorageService.addParticipant(
        params.splitId,
        participantData
      );

      if (!addParticipantResult.success) {
        logger.error('Failed to add participant to split', {
          error: addParticipantResult.error,
        }, 'SplitParticipantInvitationService');
        return {
          success: false,
          error: addParticipantResult.error || 'Failed to add participant',
        };
      }

      // Send notification to the invited user
      try {
        const notificationResult = await notificationService.instance.sendNotification(
          params.contact.id || params.contact.userId,
          'Split Invitation',
          `${params.inviterName} has invited you to split "${params.billName}"`,
          'split_invite',
          {
            splitId: params.splitId,
            billName: params.billName,
            totalAmount: params.totalAmount,
            currency: 'USDC',
            invitedBy: params.inviterId,
            invitedByName: params.inviterName,
            participantName: params.contact.name,
            status: 'pending',
          }
        );

        if (notificationResult) {
          logger.info('Split invitation notification sent successfully', {
            splitId: params.splitId,
            invitedUserId: params.contact.id || params.contact.userId,
            invitedUserName: params.contact.name,
            billName: params.billName,
          }, 'SplitParticipantInvitationService');
        } else {
          logger.warn('Failed to send notification, but participant was added', {
            splitId: params.splitId,
            invitedUserId: params.contact.id || params.contact.userId,
            invitedUserName: params.contact.name,
          }, 'SplitParticipantInvitationService');
        }
      } catch (notificationError) {
        logger.warn('Error sending notification', {
          error: notificationError,
        }, 'SplitParticipantInvitationService');
        // Don't fail the invitation if notification fails
      }

      return { success: true };
    } catch (error) {
      logger.error('Error inviting single participant', {
        contactId: params.contact.id,
        error,
      }, 'SplitParticipantInvitationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if a contact is already a participant in the split
   * 
   * @param participants - Array of split participants
   * @param contactId - Contact ID to check
   * @returns True if contact is already a participant
   */
  static isContactAlreadyParticipant(
    participants: Array<{ userId?: string; id?: string }>,
    contactId: string | number
  ): boolean {
    const contactIdStr = contactId.toString();
    return participants.some(p => {
      const participantId = (p.userId || p.id)?.toString();
      return participantId === contactIdStr;
    });
  }

  /**
   * Filter out contacts that are already participants
   * 
   * @param contacts - Contacts to filter
   * @param participants - Array of split participants
   * @returns Filtered contacts (excluding existing participants)
   */
  static filterExistingParticipants(
    contacts: UserContact[],
    participants: Array<{ userId?: string; id?: string }>
  ): UserContact[] {
    return contacts.filter(contact => 
      !this.isContactAlreadyParticipant(participants, contact.id || contact.userId)
    );
  }
}

