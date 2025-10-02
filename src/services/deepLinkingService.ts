/**
 * Deep Linking Service
 * Handles deep linking for split invitations and other app features
 */

import * as Linking from 'expo-linking';
import { logger } from './loggingService';
import { SplitInvitationService, SplitInvitationData } from './splitInvitationService';

export interface DeepLinkData {
  type: 'split_invitation' | 'other';
  data: any;
  originalUrl: string;
}

export class DeepLinkingService {
  /**
   * Initialize deep linking listeners
   */
  static initialize() {
    // Handle initial URL (when app is opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink(url);
      }
    });

    // Handle subsequent URLs (when app is already running)
    const subscription = Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });

    return subscription;
  }

  /**
   * Handle incoming deep links
   */
  static async handleDeepLink(url: string): Promise<DeepLinkData | null> {
    try {
      logger.info('Handling deep link', { url }, 'DeepLinkingService');

      const parsedUrl = Linking.parse(url);
      
      if (!parsedUrl.scheme || parsedUrl.scheme !== 'wesplit') {
        logger.warn('Invalid scheme in deep link', { url, scheme: parsedUrl.scheme }, 'DeepLinkingService');
        return null;
      }

      // Handle different deep link types
      switch (parsedUrl.hostname) {
        case 'join-split':
          return this.handleSplitInvitation(parsedUrl, url);
        
        default:
          logger.warn('Unknown deep link hostname', { hostname: parsedUrl.hostname }, 'DeepLinkingService');
          return null;
      }
    } catch (error) {
      logger.error('Error handling deep link', error, 'DeepLinkingService');
      return null;
    }
  }

  /**
   * Handle split invitation deep links
   */
  private static handleSplitInvitation(parsedUrl: any, originalUrl: string): DeepLinkData | null {
    try {
      const dataParam = parsedUrl.queryParams?.data;
      
      if (!dataParam) {
        logger.warn('Missing data parameter in split invitation link', { parsedUrl }, 'DeepLinkingService');
        return null;
      }

      // Parse the invitation data
      const invitationData = SplitInvitationService.parseInvitationData(dataParam);
      
      if (!invitationData) {
        logger.warn('Invalid invitation data in deep link', { dataParam }, 'DeepLinkingService');
        return null;
      }

      logger.info('Successfully parsed split invitation from deep link', {
        splitId: invitationData.splitId,
        billName: invitationData.billName,
      }, 'DeepLinkingService');

      return {
        type: 'split_invitation',
        data: invitationData,
        originalUrl,
      };
    } catch (error) {
      logger.error('Error handling split invitation deep link', error, 'DeepLinkingService');
      return null;
    }
  }

  /**
   * Generate deep link URL for split invitation
   */
  static generateSplitInvitationLink(invitationData: SplitInvitationData): string {
    const encodedData = encodeURIComponent(JSON.stringify(invitationData));
    return `wesplit://join-split?data=${encodedData}`;
  }

  /**
   * Check if a URL is a valid WeSplit deep link
   */
  static isValidWeSplitLink(url: string): boolean {
    try {
      const parsedUrl = Linking.parse(url);
      return parsedUrl.scheme === 'wesplit';
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract split invitation data from any WeSplit URL
   */
  static extractSplitInvitationFromUrl(url: string): SplitInvitationData | null {
    try {
      if (!this.isValidWeSplitLink(url)) {
        return null;
      }

      const parsedUrl = Linking.parse(url);
      
      if (parsedUrl.hostname === 'join-split' && parsedUrl.queryParams?.data) {
        return SplitInvitationService.parseInvitationData(parsedUrl.queryParams.data);
      }

      return null;
    } catch (error) {
      logger.error('Error extracting split invitation from URL', error, 'DeepLinkingService');
      return null;
    }
  }

  /**
   * Open the app with a deep link (for testing)
   */
  static async openAppWithDeepLink(url: string): Promise<boolean> {
    try {
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        logger.warn('Cannot open deep link URL', { url }, 'DeepLinkingService');
        return false;
      }
    } catch (error) {
      logger.error('Error opening deep link', error, 'DeepLinkingService');
      return false;
    }
  }

  /**
   * Get the current deep link URL (if any)
   */
  static async getCurrentUrl(): Promise<string | null> {
    try {
      return await Linking.getInitialURL();
    } catch (error) {
      logger.error('Error getting current URL', error, 'DeepLinkingService');
      return null;
    }
  }
}
