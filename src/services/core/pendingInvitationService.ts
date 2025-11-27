/**
 * Pending Invitation Service
 * 
 * Handles deferred deep linking for split invitations.
 * When a user without authentication clicks an invitation link:
 * 1. The invitation data is stored locally
 * 2. User is redirected to authentication
 * 3. After successful authentication, the invitation is retrieved and processed
 * 4. User is automatically navigated to the split
 * 
 * This ensures invitations are not lost during the auth flow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../analytics/loggingService';

// Storage keys
const PENDING_INVITATION_KEY = '@wesplit:pending_invitation';
const PENDING_INVITATION_TIMESTAMP_KEY = '@wesplit:pending_invitation_timestamp';
const INVITATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PendingInvitation {
  type: 'split_invitation';
  splitId: string;
  billName: string;
  totalAmount: number;
  currency: string;
  creatorId: string;
  creatorName?: string;
  timestamp: string;
  expiresAt?: string;
  splitType?: 'fair' | 'degen' | 'spend';
  // Original deep link URL for logging purposes
  originalUrl?: string;
}

export interface PendingInvitationResult {
  success: boolean;
  invitation?: PendingInvitation;
  error?: string;
}

class PendingInvitationService {
  private static instance: PendingInvitationService;

  private constructor() {}

  static getInstance(): PendingInvitationService {
    if (!PendingInvitationService.instance) {
      PendingInvitationService.instance = new PendingInvitationService();
    }
    return PendingInvitationService.instance;
  }

  /**
   * Store a pending invitation for later processing
   * Called when user is not authenticated and clicks an invitation link
   */
  async storePendingInvitation(
    invitationData: PendingInvitation,
    originalUrl?: string
  ): Promise<boolean> {
    try {
      const dataToStore: PendingInvitation = {
        ...invitationData,
        originalUrl,
      };

      await AsyncStorage.setItem(
        PENDING_INVITATION_KEY,
        JSON.stringify(dataToStore)
      );
      await AsyncStorage.setItem(
        PENDING_INVITATION_TIMESTAMP_KEY,
        Date.now().toString()
      );

      logger.info('Stored pending invitation', {
        splitId: invitationData.splitId,
        splitType: invitationData.splitType,
        billName: invitationData.billName,
      }, 'PendingInvitationService');

      return true;
    } catch (error) {
      logger.error('Failed to store pending invitation', {
        error: error instanceof Error ? error.message : String(error),
      }, 'PendingInvitationService');
      return false;
    }
  }

  /**
   * Retrieve and clear a pending invitation
   * Called after successful authentication
   */
  async retrievePendingInvitation(): Promise<PendingInvitationResult> {
    try {
      const invitationJson = await AsyncStorage.getItem(PENDING_INVITATION_KEY);
      const timestampStr = await AsyncStorage.getItem(PENDING_INVITATION_TIMESTAMP_KEY);

      if (!invitationJson || !timestampStr) {
        return { success: false, error: 'No pending invitation found' };
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      // Check if invitation has expired
      if (now - timestamp > INVITATION_EXPIRY_MS) {
        logger.info('Pending invitation expired, clearing', {
          age: now - timestamp,
        }, 'PendingInvitationService');
        await this.clearPendingInvitation();
        return { success: false, error: 'Invitation has expired' };
      }

      const invitation: PendingInvitation = JSON.parse(invitationJson);

      logger.info('Retrieved pending invitation', {
        splitId: invitation.splitId,
        splitType: invitation.splitType,
        billName: invitation.billName,
        age: now - timestamp,
      }, 'PendingInvitationService');

      return { success: true, invitation };
    } catch (error) {
      logger.error('Failed to retrieve pending invitation', {
        error: error instanceof Error ? error.message : String(error),
      }, 'PendingInvitationService');
      return { success: false, error: 'Failed to retrieve invitation' };
    }
  }

  /**
   * Check if there's a pending invitation without clearing it
   */
  async hasPendingInvitation(): Promise<boolean> {
    try {
      const invitationJson = await AsyncStorage.getItem(PENDING_INVITATION_KEY);
      const timestampStr = await AsyncStorage.getItem(PENDING_INVITATION_TIMESTAMP_KEY);

      if (!invitationJson || !timestampStr) {
        return false;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      // Check if not expired
      return now - timestamp <= INVITATION_EXPIRY_MS;
    } catch {
      return false;
    }
  }

  /**
   * Clear the pending invitation
   * Called after the invitation has been processed or if it's invalid
   */
  async clearPendingInvitation(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        PENDING_INVITATION_KEY,
        PENDING_INVITATION_TIMESTAMP_KEY,
      ]);

      logger.info('Cleared pending invitation', null, 'PendingInvitationService');
      return true;
    } catch (error) {
      logger.error('Failed to clear pending invitation', {
        error: error instanceof Error ? error.message : String(error),
      }, 'PendingInvitationService');
      return false;
    }
  }

  /**
   * Process a pending invitation after authentication
   * Returns navigation params if there's a valid invitation to process
   */
  async processPendingInvitationAfterAuth(): Promise<{
    shouldNavigate: boolean;
    navigationParams?: {
      screen: string;
      params: Record<string, unknown>;
    };
  }> {
    const result = await this.retrievePendingInvitation();

    if (!result.success || !result.invitation) {
      return { shouldNavigate: false };
    }

    const invitation = result.invitation;

    // Clear the invitation after retrieval
    await this.clearPendingInvitation();

    // Return navigation parameters
    return {
      shouldNavigate: true,
      navigationParams: {
        screen: 'SplitDetails',
        params: {
          splitId: invitation.splitId,
          isFromDeepLink: true,
          isFromPendingInvitation: true,
          splitInvitationData: JSON.stringify(invitation),
        },
      },
    };
  }

  /**
   * Parse invitation data from a deep link URL parameter
   */
  parseInvitationFromUrl(encodedData: string): PendingInvitation | null {
    try {
      const decoded = decodeURIComponent(encodedData);
      const parsed = JSON.parse(decoded);

      // Validate required fields
      if (
        parsed.type !== 'split_invitation' ||
        !parsed.splitId ||
        !parsed.creatorId
      ) {
        logger.warn('Invalid invitation data structure', {
          hasType: !!parsed.type,
          hasSplitId: !!parsed.splitId,
          hasCreatorId: !!parsed.creatorId,
        }, 'PendingInvitationService');
        return null;
      }

      return parsed as PendingInvitation;
    } catch (error) {
      logger.error('Failed to parse invitation data', {
        error: error instanceof Error ? error.message : String(error),
      }, 'PendingInvitationService');
      return null;
    }
  }
}

export const pendingInvitationService = PendingInvitationService.getInstance();
export default pendingInvitationService;

