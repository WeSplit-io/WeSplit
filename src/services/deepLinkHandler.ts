/**
 * Deep Link Handler for WeSplit App
 * Handles wesplit:// links for group invitations and other app actions
 */

import { Linking } from 'react-native';
import { firebaseDataService } from './firebaseDataService';

export interface DeepLinkData {
  action: 'join' | 'invite' | 'moonpay-success' | 'moonpay-failure' | 'oauth-callback';
  inviteId?: string;
  groupId?: string;
  groupName?: string;
  transactionId?: string;
  oauthProvider?: 'google' | 'twitter' | 'apple';
  oauthCode?: string;
  oauthError?: string;
}

/**
 * Parse a WeSplit deep link URL
 * Expected format: wesplit://action/params
 */
export function parseWeSplitDeepLink(url: string): DeepLinkData | null {
  try {
    if (!url.startsWith('wesplit://')) {
      return null;
    }

    const urlParts = url.replace('wesplit://', '').split('/');
    const action = urlParts[0];
    const params = urlParts.slice(1);

    switch (action) {
      case 'join':
        return {
          action: 'join',
          inviteId: params[0]
        };
      
      case 'invite':
        return {
          action: 'invite',
          groupId: params[0],
          groupName: params[1] ? decodeURIComponent(params[1]) : undefined
        };
      
      case 'moonpay-success':
        return {
          action: 'moonpay-success',
          transactionId: params[0]
        };
      
      case 'moonpay-failure':
        return {
          action: 'moonpay-failure',
          transactionId: params[0]
        };
      
      case 'oauth-callback':
        return {
          action: 'oauth-callback',
          oauthProvider: params[0] as 'google' | 'twitter' | 'apple',
          oauthCode: params[1],
          oauthError: params[2]
        };
      
      default:
        console.warn('Unknown deep link action:', action);
        return null;
    }
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
}

/**
 * Handle a deep link for joining a group
 */
export async function handleJoinGroupDeepLink(inviteId: string, userId: string) {
  try {
    console.log('🔥 Handling join group deep link:', { inviteId, userId });
    
    const result = await firebaseDataService.group.joinGroupViaInvite(inviteId, userId);
    
    console.log('🔥 Successfully joined group via deep link:', result);
    
    return {
      success: true,
      groupId: result.groupId,
      groupName: result.groupName,
      message: result.message
    };
  } catch (error) {
    console.error('🔥 Error joining group via deep link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join group'
    };
  }
}

/**
 * Set up deep link listeners
 */
export function setupDeepLinkListeners(navigation: any, currentUser: any) {
  const handleDeepLink = async (url: string) => {
    console.log('🔥 Received deep link:', url);
    
    const linkData = parseWeSplitDeepLink(url);
    if (!linkData) {
      console.warn('🔥 Invalid deep link format:', url);
      return;
    }

    console.log('🔥 Parsed deep link data:', linkData);

    switch (linkData.action) {
      case 'join':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot join group');
          // Navigate to login if needed
          navigation.navigate('AuthMethods');
          return;
        }

        console.log('🔥 Attempting to join group with inviteId:', linkData.inviteId);
        const joinResult = await handleJoinGroupDeepLink(linkData.inviteId!, currentUser.id);
        
        if (joinResult.success) {
          console.log('🔥 Successfully joined group, navigating to GroupDetails');
          // Navigate to the group details
          navigation.navigate('GroupDetails', { 
            groupId: joinResult.groupId 
          });
        } else {
          // Show error message
          console.error('🔥 Failed to join group:', joinResult.error);
          // You might want to show an alert here
        }
        break;
      
      case 'moonpay-success':
        console.log('🔥 MoonPay success, navigating to Dashboard');
        navigation.navigate('Dashboard');
        break;
      
      case 'moonpay-failure':
        console.log('🔥 MoonPay failure, navigating to Dashboard');
        navigation.navigate('Dashboard');
        break;
      
      case 'oauth-callback':
        console.log('🔥 OAuth callback received:', linkData);
        // Handle OAuth callback - this will be processed by the OAuth services
        // The OAuth services will handle the code exchange and user authentication
        break;
      
      default:
        console.warn('🔥 Unknown deep link action:', linkData.action);
    }
  };

  // Listen for incoming links when app is already running
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('🔥 Deep link event received:', event.url);
    handleDeepLink(event.url);
  });

  // Handle links that opened the app
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('🔥 Initial URL found:', url);
      handleDeepLink(url);
    }
  });

  return subscription;
}

/**
 * Generate a shareable invite link
 */
export function generateShareableLink(inviteId: string, groupName?: string): string {
  const baseUrl = `wesplit://join/${inviteId}`;
  
  if (groupName) {
    return `${baseUrl}?name=${encodeURIComponent(groupName)}`;
  }
  
  return baseUrl;
} 