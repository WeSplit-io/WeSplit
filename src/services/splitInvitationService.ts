/**
 * Split Invitation Service
 * Handles split invitations, QR codes, NFC sharing, and link generation
 */

import { logger } from './loggingService';

export interface SplitInvitationData {
  type: 'split_invitation';
  splitId: string;
  billName: string;
  totalAmount: number;
  currency: string;
  creatorId: string;
  creatorName?: string;
  timestamp: string;
  expiresAt?: string;
}

export interface SplitJoinResult {
  success: boolean;
  splitId?: string;
  error?: string;
  message?: string;
}

export class SplitInvitationService {
  /**
   * Generate split invitation data
   */
  static generateInvitationData(
    splitId: string,
    billName: string,
    totalAmount: number,
    currency: string,
    creatorId: string,
    expiresInHours: number = 24
  ): SplitInvitationData {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    return {
      type: 'split_invitation',
      splitId,
      billName,
      totalAmount,
      currency,
      creatorId,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Generate QR code data for split invitation
   */
  static generateQRCodeData(invitationData: SplitInvitationData): string {
    return JSON.stringify(invitationData);
  }

  /**
   * Generate shareable link for split invitation
   */
  static generateShareableLink(invitationData: SplitInvitationData): string {
    const encodedData = encodeURIComponent(JSON.stringify(invitationData));
    return `wesplit://join-split?data=${encodedData}`;
  }

  /**
   * Parse invitation data from QR code or link
   */
  static parseInvitationData(data: string): SplitInvitationData | null {
    try {
      const parsed = JSON.parse(data);
      
      // Validate required fields
      if (!parsed.type || parsed.type !== 'split_invitation') {
        throw new Error('Invalid invitation type');
      }
      
      if (!parsed.splitId || !parsed.billName || !parsed.creatorId) {
        throw new Error('Missing required invitation fields');
      }

      // Check if invitation has expired
      if (parsed.expiresAt) {
        const expiresAt = new Date(parsed.expiresAt);
        if (expiresAt < new Date()) {
          throw new Error('Invitation has expired');
        }
      }

      return parsed as SplitInvitationData;
    } catch (error) {
      logger.error('Failed to parse invitation data', error, 'SplitInvitationService');
      return null;
    }
  }

  /**
   * Join a split using invitation data
   */
  static async joinSplit(
    invitationData: SplitInvitationData,
    userId: string
  ): Promise<SplitJoinResult> {
    try {
      logger.info('joinSplit called with', {
        invitationData,
        userId
      });

      logger.info('User attempting to join split', {
        splitId: invitationData.splitId,
        userId,
        billName: invitationData.billName,
      }, 'SplitInvitationService');

      // Validate invitation
      if (invitationData.creatorId === userId) {
        logger.warn('User trying to join their own split', null, 'splitInvitationService');
        return {
          success: false,
          error: 'You cannot join your own split',
        };
      }

      // Check if invitation has expired
      if (invitationData.expiresAt) {
        const expiresAt = new Date(invitationData.expiresAt);
        if (expiresAt < new Date()) {
          return {
            success: false,
            error: 'This invitation has expired',
          };
        }
      }

      // Implement actual split joining logic
      // 1. Fetch the split from the database
      const { SplitStorageService } = await import('./splitStorageService');
      const splitResult = await SplitStorageService.getSplit(invitationData.splitId);
      
      logger.info('Split fetch result', {
        success: splitResult.success,
        hasSplit: !!splitResult.split,
        splitId: splitResult.split?.id,
        error: splitResult.error
      });
      
      if (!splitResult.success || !splitResult.split) {
        logger.warn('Split not found or error', { error: splitResult.error }, 'splitInvitationService');
        return {
          success: false,
          error: 'Split not found or has been deleted',
        };
      }

      const split = splitResult.split;
      logger.info('Split data', {
        id: split.id,
        title: split.title,
        participantsCount: split.participants.length,
        participants: split.participants.map(p => ({ userId: p.userId, status: p.status, name: p.name }))
      });

      // Note: Wallet creation happens after participants are added, so we don't require wallet info for joining
      // The wallet will be created when the split method is locked

      // 2. Check if user is already a participant
      const existingParticipant = split.participants.find(p => p.userId === userId);
      logger.info('Existing participant check', {
        userId,
        existingParticipant: existingParticipant ? {
          userId: existingParticipant.userId,
          status: existingParticipant.status,
          name: existingParticipant.name
        } : null,
        allParticipants: split.participants.map(p => ({ userId: p.userId, status: p.status, name: p.name }))
      });

      if (existingParticipant) {
        // If user is already accepted, they're already in the split
        if (existingParticipant.status === 'accepted') {
          logger.info('User already accepted', null, 'splitInvitationService');
          return {
            success: true,
            splitId: invitationData.splitId,
            message: `You are already a participant in "${invitationData.billName}" split`,
          };
        }
        
        // If user is pending or invited, update their status to accepted
        if (existingParticipant.status === 'pending' || existingParticipant.status === 'invited') {
          logger.info('User is pending/invited, updating status to accepted', null, 'splitInvitationService');
          logger.info('User is pending/invited, updating status to accepted', {
            splitId: invitationData.splitId,
            userId,
            currentStatus: existingParticipant.status,
          }, 'SplitInvitationService');
          
          // Update the participant status to accepted
          const updatedParticipant = {
            ...existingParticipant,
            status: 'accepted' as const,
            joinedAt: new Date().toISOString(),
          };
          
          const updateResult = await SplitStorageService.addParticipant(invitationData.splitId, updatedParticipant);
          logger.info('Update participant result', { updateResult }, 'splitInvitationService');
          
          if (!updateResult.success) {
            return {
              success: false,
              error: updateResult.error || 'Failed to update participant status',
            };
          }
          
          // Send confirmation notification to the creator
          const { notificationService } = await import('./notificationService');
          await notificationService.sendNotification(
            invitationData.creatorId,
            'User Joined Your Split',
            `A user has joined your split "${invitationData.billName}". The split is ready to begin!`,
            'group_added',
            {
              splitId: invitationData.splitId,
              billName: invitationData.billName,
              totalAmount: invitationData.totalAmount,
            }
          );
          
          logger.info('User successfully joined split (status updated)', {
            splitId: invitationData.splitId,
            userId,
            previousStatus: existingParticipant.status,
          }, 'SplitInvitationService');
          
          return {
            success: true,
            splitId: invitationData.splitId,
            message: `Successfully joined "${invitationData.billName}" split`,
          };
        }
        
        // If user has some other status, return an error
        logger.warn('User has invalid status', { status: existingParticipant.status }, 'splitInvitationService');
        return {
          success: false,
          error: `You cannot join this split with your current status: ${existingParticipant.status}`,
        };
      }

      // 3. Get the actual user data
      const { firebaseDataService } = await import('./firebaseDataService');
      const userData = await firebaseDataService.user.getCurrentUser(userId);
      
      if (!userData) {
        return {
          success: false,
          error: 'User data not found',
        };
      }

      // 4. Add the user as a participant
      const newParticipant = {
        userId: userId,
        name: userData.name || 'Unknown User',
        email: userData.email || '',
        walletAddress: userData.wallet_address || userData.wallet_public_key || '',
        amountOwed: invitationData.totalAmount / (split.participants.length + 1), // Equal split
        amountPaid: 0,
        status: 'accepted' as const,
      };

      const addResult = await SplitStorageService.addParticipant(invitationData.splitId, newParticipant);
      if (!addResult.success) {
        return {
          success: false,
          error: addResult.error || 'Failed to join split',
        };
      }

      // 5. Send confirmation notification to the creator
      const { notificationService } = await import('./notificationService');
      await notificationService.sendNotification(
        invitationData.creatorId,
        'User Joined Your Split',
        `A user has joined your split "${invitationData.billName}". The split is ready to begin!`,
        'group_added',
        {
          splitId: invitationData.splitId,
          billName: invitationData.billName,
          totalAmount: invitationData.totalAmount,
        }
      );

      logger.info('User successfully joined split', {
        splitId: invitationData.splitId,
        userId,
      }, 'SplitInvitationService');

      return {
        success: true,
        splitId: invitationData.splitId,
        message: `Successfully joined "${invitationData.billName}" split`,
      };

    } catch (error) {
      logger.error('Failed to join split', error, 'SplitInvitationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate invitation URL
   */
  static validateInvitationURL(url: string): SplitInvitationData | null {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol !== 'wesplit:') {
        return null;
      }

      if (urlObj.hostname !== 'join-split') {
        return null;
      }

      const dataParam = urlObj.searchParams.get('data');
      if (!dataParam) {
        return null;
      }

      return this.parseInvitationData(decodeURIComponent(dataParam));
    } catch (error) {
      logger.error('Failed to validate invitation URL', error, 'SplitInvitationService');
      return null;
    }
  }

  /**
   * Generate NFC payload for split invitation
   */
  static generateNFCPayload(invitationData: SplitInvitationData): string {
    // NFC payload should be a simple string that can be easily parsed
    return `WESPLIT:${invitationData.splitId}:${invitationData.creatorId}:${invitationData.timestamp}`;
  }

  /**
   * Parse NFC payload
   */
  static parseNFCPayload(payload: string): SplitInvitationData | null {
    try {
      const parts = payload.split(':');
      
      if (parts.length !== 4 || parts[0] !== 'WESPLIT') {
        return null;
      }

      const [prefix, splitId, creatorId, timestamp] = parts;

      // Create minimal invitation data from NFC payload
      // Additional data would need to be fetched from the server
      return {
        type: 'split_invitation',
        splitId,
        billName: 'Split from NFC', // Would be fetched from server
        totalAmount: 0, // Would be fetched from server
        currency: 'USD', // Would be fetched from server
        creatorId,
        timestamp,
      };
    } catch (error) {
      logger.error('Failed to parse NFC payload', error, 'SplitInvitationService');
      return null;
    }
  }

  /**
   * Check if user can join split
   */
  static async canUserJoinSplit(
    splitId: string,
    userId: string
  ): Promise<{ canJoin: boolean; reason?: string }> {
    try {
      // TODO: Implement actual validation logic
      // This would check:
      // 1. If split exists and is active
      // 2. If user is already a participant
      // 3. If split has reached maximum participants
      // 4. If user has sufficient balance

      // For now, return true
      return { canJoin: true };
    } catch (error) {
      logger.error('Failed to check if user can join split', error, 'SplitInvitationService');
      return { canJoin: false, reason: 'Unable to validate split' };
    }
  }
}
