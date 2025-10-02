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
      logger.info('User attempting to join split', {
        splitId: invitationData.splitId,
        userId,
        billName: invitationData.billName,
      }, 'SplitInvitationService');

      // Validate invitation
      if (invitationData.creatorId === userId) {
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

      // TODO: Implement actual split joining logic
      // This would involve:
      // 1. Fetching the split from the database
      // 2. Adding the user as a participant
      // 3. Sending notifications
      // 4. Updating split status

      // For now, simulate successful join
      await new Promise(resolve => setTimeout(resolve, 1000));

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
