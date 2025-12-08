/**
 * Deep Link Handler for WeSplit App
 * Handles both:
 * - App-scheme links: wesplit://action/params
 * - Universal links: https://wesplit.io/action?params
 * 
 * Universal links allow the app to be opened from web links, supporting:
 * - Users with the app installed (opens directly in app)
 * - Users without the app (web page redirects to app store)
 */

import { Linking, Alert } from 'react-native';
import { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { logger } from '../analytics/loggingService';
import { User } from '../../types';
import { pendingInvitationService, PendingInvitation } from './pendingInvitationService';
import { firebaseDataService } from '../data/firebaseDataService';

// Universal link domains that we recognize
const UNIVERSAL_LINK_DOMAINS = ['wesplit.io', 'www.wesplit.io'];

export interface DeepLinkData {
  action: 'join' | 'invite' | 'profile' | 'send' | 'transfer' | 'moonpay-success' | 'moonpay-failure' | 'oauth-callback' | 'join-split' | 'view-split' | 'wallet-linked' | 'wallet-error';
  inviteId?: string;
  groupId?: string;
  groupName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userWalletAddress?: string;
  recipientWalletAddress?: string;
  transferAmount?: string;
  transactionId?: string;
  oauthProvider?: 'google' | 'twitter' | 'apple';
  oauthCode?: string;
  oauthError?: string;
  splitInvitationData?: string; // JSON string for split invitation data
  splitId?: string; // Split ID for view-split action
  walletProvider?: string; // Wallet provider (phantom, solflare, etc.)
  walletAddress?: string; // Connected wallet address
  signature?: string; // Wallet signature for verification
  linkingError?: string; // Error message if wallet linking failed
}

/**
 * Check if a URL is a WeSplit deep link (either app-scheme or universal link)
 */
export function isWeSplitDeepLink(url: string): boolean {
  try {
    // Check app-scheme
    if (url.startsWith('wesplit://')) {
      return true;
    }
    
    // Check universal link
    const urlObj = new URL(url);
    if (urlObj.protocol === 'https:' && UNIVERSAL_LINK_DOMAINS.includes(urlObj.hostname)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Parse a WeSplit deep link URL
 * Supports both app-scheme (wesplit://) and universal links (https://wesplit.io)
 * 
 * @param url - The URL to parse
 * @returns Parsed deep link data or null if invalid
 */
export function parseWeSplitDeepLink(url: string): DeepLinkData | null {
  try {
    logger.debug('Parsing deep link URL', { url }, 'deepLinkHandler');
    
    // Determine if this is an app-scheme or universal link
    const isAppScheme = url.startsWith('wesplit://');
    let urlObj: URL;
    let action: string;
    let params: string[];
    
    try {
      urlObj = new URL(url);
    } catch {
      logger.warn('Failed to parse URL', { url }, 'deepLinkHandler');
      return null;
    }

    if (isAppScheme) {
      // App-scheme: wesplit://action/params
      const urlParts = url.replace('wesplit://', '').split('?')[0].split('/');
      action = urlParts[0];
      params = urlParts.slice(1);
    } else {
      // Universal link: https://wesplit.io/action?params
      // Check if it's a valid universal link domain
      if (!UNIVERSAL_LINK_DOMAINS.includes(urlObj.hostname)) {
        logger.debug('URL is not a WeSplit universal link', { hostname: urlObj.hostname }, 'deepLinkHandler');
        return null;
      }
      
      // Extract action from pathname
      const pathname = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
      const pathParts = pathname.split('/');
      action = pathParts[0] || '';
      params = pathParts.slice(1);
    }

    logger.debug('Parsed URL parts', { action, params }, 'deepLinkHandler');

    switch (action) {
      case 'join':
        if (!params[0]) {
          console.warn('🔥 Join action missing inviteId parameter');
          return null;
        }
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
      
      case 'profile':
        if (!params[0]) {
          console.warn('🔥 Profile action missing userId parameter');
          return null;
        }
        return {
          action: 'profile',
          userId: params[0],
          userName: params[1] ? decodeURIComponent(params[1]) : undefined,
          userEmail: params[2] ? decodeURIComponent(params[2]) : undefined,
          userWalletAddress: params[3] ? decodeURIComponent(params[3]) : undefined
        };
      
      case 'send':
        if (!params[0]) {
          console.warn('🔥 Send action missing recipientWalletAddress parameter');
          return null;
        }
        return {
          action: 'send',
          recipientWalletAddress: decodeURIComponent(params[0]),
          userName: params[1] ? decodeURIComponent(params[1]) : undefined,
          userEmail: params[2] ? decodeURIComponent(params[2]) : undefined
        };
      
      case 'transfer':
        if (!params[0]) {
          console.warn('🔥 Transfer action missing recipientWalletAddress parameter');
          return null;
        }
        return {
          action: 'transfer',
          recipientWalletAddress: decodeURIComponent(params[0]),
          userName: params[1] ? decodeURIComponent(params[1]) : undefined,
          userEmail: params[2] ? decodeURIComponent(params[2]) : undefined,
          transferAmount: params[3] ? decodeURIComponent(params[3]) : undefined
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
      
      case 'join-split': {
        // Handle split invitation deep links
        // Format (app-scheme): wesplit://join-split?data=<encoded_invitation_data>
        // Format (universal): https://wesplit.io/join-split?data=<encoded_invitation_data>
        const dataParam = urlObj.searchParams.get('data');

        if (!dataParam) {
          console.warn('🔥 Join-split action missing data parameter');
          return null;
        }

        logger.debug('Parsed join-split deep link', {
          isAppScheme,
          hasData: !!dataParam,
          dataLength: dataParam.length
        }, 'deepLinkHandler');

        return {
          action: 'join-split',
          splitInvitationData: dataParam
        };
      }
      
      case 'view-split': {
        // Handle viewing a split from external source (e.g., "spend" integration)
        // Format (app-scheme): wesplit://view-split?splitId=xxx&userId=xxx
        // Format (universal): https://wesplit.io/view-split?splitId=xxx&userId=xxx
        const splitId = urlObj.searchParams.get('splitId');
        const userId = urlObj.searchParams.get('userId');

        if (!splitId) {
          console.warn('🔥 View-split action missing splitId parameter');
          return null;
        }

        logger.debug('Parsed view-split deep link', { splitId, userId }, 'deepLinkHandler');

        return {
          action: 'view-split',
          splitId: splitId,
          userId: userId || undefined
        };
      }

      case 'wallet-linked':
        // Handle successful wallet linking callback
        // Format (app-scheme): wesplit://wallet-linked?provider=phantom&address=xxx&signature=xxx
        // Format (universal): https://wesplit.io/wallet-linked?provider=phantom&address=xxx&signature=xxx
        {
          const provider = urlObj.searchParams.get('provider');
          const address = urlObj.searchParams.get('address');
          const signature = urlObj.searchParams.get('signature');

          if (!provider || !address) {
            console.warn('🔥 Wallet-linked action missing required parameters');
            return null;
          }

          logger.debug('Parsed wallet-linked deep link', { provider, address, hasSignature: !!signature }, 'deepLinkHandler');

          return {
            action: 'wallet-linked',
            walletProvider: provider,
            walletAddress: address,
            signature: signature || undefined
          };
        }

      case 'wallet-error':
        // Handle wallet linking error callback
        // Format (app-scheme): wesplit://wallet-error?provider=phantom&error=xxx
        // Format (universal): https://wesplit.io/wallet-error?provider=phantom&error=xxx
        {
          const provider = urlObj.searchParams.get('provider');
          const error = urlObj.searchParams.get('error');

          logger.debug('Parsed wallet-error deep link', { provider, error }, 'deepLinkHandler');

          return {
            action: 'wallet-error',
            walletProvider: provider || undefined,
            linkingError: error || 'Unknown wallet error'
          };
        }
      
      default:
        console.warn('🔥 Unknown deep link action:', action);
        return null;
    }
  } catch (error) {
    console.error('🔥 Error parsing deep link:', error);
    return null;
  }
}

/**
 * Handle a deep link for joining a group
 */
export async function handleJoinGroupDeepLink(inviteId: string, userId: string) {
  try {
    logger.info('Handling join group deep link', { inviteId, userId }, 'deepLinkHandler');
    
    const result = await firebaseDataService.group.joinGroupViaInvite(inviteId, userId);
    
    logger.info('Successfully joined group via deep link', { result }, 'deepLinkHandler');
    
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
 * Handle a deep link for adding a contact from profile QR code
 */
export async function handleAddContactFromProfile(linkData: DeepLinkData, currentUserId: string) {
  try {
    logger.info('Handling add contact from profile deep link', { linkData, currentUserId }, 'deepLinkHandler');
    
    if (!linkData.userId || !linkData.userName) {
      throw new Error('Invalid profile QR code - missing user information');
    }

    // Check if user is trying to add themselves
    if (linkData.userId === currentUserId) {
      throw new Error('You cannot add yourself as a contact');
    }

    // Check if contact already exists
    const existingContacts = await firebaseDataService.contact.getContacts(currentUserId);
    const contactExists = existingContacts.some(contact => 
      contact.email === linkData.userEmail || 
      contact.wallet_address === linkData.userWalletAddress
    );

    if (contactExists) {
      throw new Error('This person is already in your contacts');
    }

    // Add the contact
    const contactData = {
      name: linkData.userName,
      email: linkData.userEmail || '',
      wallet_address: linkData.userWalletAddress || '',
      wallet_public_key: '', // Not included in QR code for security
      avatar: '', // Will be fetched separately if needed
      mutual_groups_count: 0,
      isFavorite: false
    };

    const newContact = await firebaseDataService.user.addContact(currentUserId, contactData);
    
    logger.info('Successfully added contact via deep link', { newContact }, 'deepLinkHandler');
    
    // Send notification to the added contact
    try {
      const { notificationService } = await import('../notifications');
      await notificationService.sendNotification(
        linkData.userId,
        '👋 New Contact Added You!',
        `${linkData.userName} has added you as a contact. You can now easily send money to each other!`,
        'general',
        {
          addedBy: currentUserId,
          addedByName: linkData.userName,
          addedAt: new Date().toISOString(),
          type: 'contact_added'
        }
      );
    } catch (notificationError) {
      console.error('🔥 Failed to send contact add notification:', notificationError);
      // Don't fail the contact addition if notification fails
    }
    
    return {
      success: true,
      contactName: linkData.userName,
      contactId: newContact.id,
      message: 'Contact added successfully'
    };
  } catch (error) {
    console.error('🔥 Error adding contact via deep link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add contact'
    };
  }
}

/**
 * Set up deep link listeners
 */
export function setupDeepLinkListeners(
  navigation: NavigationContainerRef<ParamListBase> | { navigate: (route: string, params?: Record<string, unknown>) => void },
  currentUser: User | null
) {
  const handleDeepLink = async (url: string) => {
    logger.info('Received deep link', { url }, 'deepLinkHandler');
    
    const linkData = parseWeSplitDeepLink(url);
    if (!linkData) {
      console.warn('🔥 Invalid deep link format:', url);
      Alert.alert('Invalid Link', 'This invitation link is not valid.');
      return;
    }

    logger.debug('Parsed deep link data', { linkData }, 'deepLinkHandler');

    switch (linkData.action) {
      case 'join': {
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot join group');
          Alert.alert('Authentication Required', 'Please log in to join the group.');
          // Navigate to login if needed
          navigation.navigate('AuthMethods');
          return;
        }

        logger.info('Attempting to join group with inviteId', { inviteId: linkData.inviteId }, 'deepLinkHandler');
        const joinResult = await handleJoinGroupDeepLink(linkData.inviteId!, currentUser.id);

        if (joinResult.success) {
          logger.info('Successfully joined group, navigating to GroupDetails', null, 'deepLinkHandler');
          Alert.alert('Success', `Successfully joined ${joinResult.groupName}!`);
          // Navigate to the group details
          navigation.navigate('GroupDetails', {
            groupId: joinResult.groupId
          });
        } else {
          // Show error message
          console.error('🔥 Failed to join group:', joinResult.error);
          Alert.alert('Error', joinResult.error || 'Failed to join group. Please try again.');
        }
        break;
      }
      
      case 'profile': {
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot add contact');
          Alert.alert('Authentication Required', 'Please log in to add contacts.');
          navigation.navigate('AuthMethods');
          return;
        }

        logger.info('Attempting to add contact from profile QR', { linkData }, 'deepLinkHandler');
        const addContactResult = await handleAddContactFromProfile(linkData, currentUser.id);

        if (addContactResult.success) {
          logger.info('Successfully added contact, navigating to Contacts', null, 'deepLinkHandler');
          Alert.alert('Contact Added', `Successfully added ${addContactResult.contactName} to your contacts!`);
          // Navigate to contacts screen
          navigation.navigate('Contacts');
        } else {
          console.error('🔥 Failed to add contact:', addContactResult.error);
          Alert.alert('Error', addContactResult.error || 'Failed to add contact. Please try again.');
        }
        break;
      }
      
      case 'send': {
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot send money');
          Alert.alert('Authentication Required', 'Please log in to send money.');
          navigation.navigate('AuthMethods');
          return;
        }

        logger.info('Attempting to navigate to Send screen with recipient', { recipientWalletAddress: linkData.recipientWalletAddress }, 'deepLinkHandler');

        // Navigate to Send screen with recipient wallet address
        navigation.navigate('Send', {
          recipientWalletAddress: linkData.recipientWalletAddress,
          recipientName: linkData.userName,
          recipientEmail: linkData.userEmail
        });
        break;
      }
      
      case 'transfer': {
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot initiate transfer');
          Alert.alert('Authentication Required', 'Please log in to initiate transfers.');
          navigation.navigate('AuthMethods');
          return;
        }

        logger.info('Attempting to initiate external wallet transfer to', { recipientWalletAddress: linkData.recipientWalletAddress }, 'deepLinkHandler');

        // Navigate to CryptoTransfer screen with recipient wallet address
        navigation.navigate('CryptoTransfer', {
          targetWallet: {
            address: linkData.recipientWalletAddress,
            name: linkData.userName || 'App Wallet',
            type: 'personal'
          },
          prefillAmount: linkData.transferAmount ? parseFloat(linkData.transferAmount) : undefined
        });
        break;
      }
      
      case 'moonpay-success':
        logger.info('MoonPay success, navigating to Dashboard', null, 'deepLinkHandler');
        navigation.navigate('Dashboard');
        break;
      
      case 'moonpay-failure':
        logger.info('MoonPay failure, navigating to Dashboard', null, 'deepLinkHandler');
        navigation.navigate('Dashboard');
        break;
      
      case 'oauth-callback': {
        logger.info('OAuth callback received', { linkData }, 'deepLinkHandler');
        // Handle OAuth callback - this will be processed by the OAuth services
        // The OAuth services will handle the code exchange and user authentication
        if (linkData.oauthError) {
          console.error('🔥 OAuth callback error:', linkData.oauthError);
          Alert.alert(
            'Authentication Error',
            `OAuth authentication failed: ${linkData.oauthError}`
          );
        } else if (linkData.oauthCode) {
          logger.info('OAuth callback success, code received', null, 'deepLinkHandler');
          // The OAuth service should handle this automatically
          // This is just for logging and debugging
        }
        break;
      }

      case 'phantom-callback': {
        logger.info('Phantom auth callback received', {
          linkData,
          responseType: linkData.response_type,
          hasWalletId: !!linkData.wallet_id,
          hasError: !!linkData.error
        }, 'deepLinkHandler');

        // The Phantom SDK will handle the authentication result internally
        // The usePhantom hook in AuthMethodsScreen will detect the state change
        // and process the authenticated user. We just log here for debugging.

        if (linkData.response_type === 'success') {
          logger.info('Phantom authentication callback successful', {
            walletId: linkData.wallet_id,
            authUserId: linkData.authUserId,
            provider: linkData.provider
          }, 'deepLinkHandler');
        } else if (linkData.error) {
          logger.error('Phantom authentication callback failed', {
            error: linkData.error,
            linkData
          }, 'deepLinkHandler');
        }

        break;
      }
      
      case 'join-split':
        if (!linkData.splitInvitationData) {
          console.warn('🔥 Missing split invitation data');
          Alert.alert('Invalid Link', 'This split invitation link is not valid.');
          return;
        }

        try {
          // Validate split invitation data before proceeding
          const invitationData: PendingInvitation = JSON.parse(decodeURIComponent(linkData.splitInvitationData));
          
          if (!invitationData.splitId) {
            throw new Error('Invalid split invitation data: missing splitId');
          }

          // Check if user is authenticated
          if (!currentUser?.id) {
            logger.info('User not authenticated, storing pending invitation for after login', {
              splitId: invitationData.splitId,
              splitType: invitationData.splitType,
            }, 'deepLinkHandler');
            
            // Store the invitation for processing after authentication
            await pendingInvitationService.storePendingInvitation(invitationData, url);
            
            // Inform user and redirect to authentication
            Alert.alert(
              'Sign In Required',
              `You've been invited to join "${invitationData.billName || 'a split'}"!\n\nPlease sign in or create an account to join this split. Your invitation will be waiting for you.`,
              [
                {
                  text: 'Sign In',
                  onPress: () => navigation.navigate('AuthMethods'),
                },
              ]
            );
            return;
          }
          
          logger.info('Attempting to join split with invitation data', { splitInvitationData: linkData.splitInvitationData }, 'deepLinkHandler');
          
          // Navigate to SplitDetails screen with validated invitation data
          navigation.navigate('SplitDetails', {
            shareableLink: url, // Pass the original URL
            splitInvitationData: linkData.splitInvitationData,
            splitId: invitationData.splitId,
            isFromDeepLink: true
          });
          
          logger.info('Successfully navigated to SplitDetails with split invitation', { 
            splitId: invitationData.splitId 
          }, 'deepLinkHandler');
        } catch (error) {
          console.error('🔥 Error processing split invitation:', error);
          Alert.alert('Invalid Link', 'This split invitation link is corrupted or invalid.');
        }
        break;
      
      case 'view-split':
        // Handle viewing a split from external source (e.g., "spend" integration)
        if (!linkData.splitId) {
          console.warn('🔥 Missing splitId for view-split action');
          Alert.alert('Invalid Link', 'This split link is not valid.');
          return;
        }

        logger.info('Navigating to split from deep link', {
          splitId: linkData.splitId,
          userId: linkData.userId
        }, 'deepLinkHandler');

        // Navigate to SplitDetails screen
        navigation.navigate('SplitDetails', {
          splitId: linkData.splitId,
          isFromDeepLink: true,
          isFromExternalSource: true
        });
        break;

      case 'wallet-linked':
        // Handle successful wallet linking callback from external wallet
        logger.info('Wallet linking success callback received', {
          provider: linkData.walletProvider,
          address: linkData.walletAddress,
          hasSignature: !!linkData.signature
        }, 'deepLinkHandler');

        if (!linkData.walletProvider || !linkData.walletAddress) {
          console.warn('🔥 Invalid wallet linking callback - missing required data');
          Alert.alert('Wallet Connection Error', 'Invalid wallet connection data received.');
          return;
        }

        // For now, show success message and navigate to wallet settings
        // In a full implementation, this would trigger the signature verification process
        Alert.alert(
          'Wallet Connected',
          `Successfully connected ${linkData.walletProvider} wallet!\n\nAddress: ${linkData.walletAddress.slice(0, 8)}...${linkData.walletAddress.slice(-8)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to wallet settings or wherever wallet management happens
                navigation.navigate('Settings'); // Adjust route as needed
              }
            }
          ]
        );
        break;

      case 'wallet-error':
        // Handle wallet linking error callback
        logger.warn('Wallet linking error callback received', {
          provider: linkData.walletProvider,
          error: linkData.linkingError
        }, 'deepLinkHandler');

        Alert.alert(
          'Wallet Connection Failed',
          `Failed to connect ${linkData.walletProvider || 'wallet'}: ${linkData.linkingError || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
        break;
      
      default:
        console.warn('🔥 Unknown deep link action:', linkData.action);
        Alert.alert('Unknown Action', 'This link is not supported.');
    }
  };

  // Listen for incoming links when app is already running
  const subscription = Linking.addEventListener('url', (event) => {
    logger.info('Deep link event received', { url: event.url }, 'deepLinkHandler');
    handleDeepLink(event.url);
  });

  // Handle links that opened the app (only once)
  // Note: This is now handled in NavigationWrapper to avoid duplicate calls
  // Linking.getInitialURL().then((url) => {
  //   if (url) {
  //     logger.info('Initial URL found', { url }, 'deepLinkHandler');
  //     handleDeepLink(url);
  //   }
  // });

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

/**
 * Generate a shareable profile QR code link
 */
export function generateProfileLink(userId: string, userName: string, userEmail?: string, userWalletAddress?: string): string {
  const baseUrl = `wesplit://profile/${userId}/${encodeURIComponent(userName)}`;
  
  let fullUrl = baseUrl;
  
  if (userEmail) {
    fullUrl += `/${encodeURIComponent(userEmail)}`;
  } else {
    fullUrl += '/'; // Empty email parameter
  }
  
  if (userWalletAddress) {
    fullUrl += `/${encodeURIComponent(userWalletAddress)}`;
  }
  
  return fullUrl;
}

/**
 * Generate a send money QR code link
 */
export function generateSendLink(walletAddress: string, userName?: string, userEmail?: string): string {
  const baseUrl = `wesplit://send/${encodeURIComponent(walletAddress)}`;
  
  let fullUrl = baseUrl;
  
  if (userName) {
    fullUrl += `/${encodeURIComponent(userName)}`;
  }
  
  if (userEmail) {
    fullUrl += `/${encodeURIComponent(userEmail)}`;
  }
  
  return fullUrl;
}

/**
 * Generate a transfer link for external wallet transfers
 */
export function generateTransferLink(walletAddress: string, userName?: string, userEmail?: string, amount?: string): string {
  const baseUrl = `wesplit://transfer/${encodeURIComponent(walletAddress)}`;

  let fullUrl = baseUrl;

  if (userName) {
    fullUrl += `/${encodeURIComponent(userName)}`;
  }

  if (userEmail) {
    fullUrl += `/${encodeURIComponent(userEmail)}`;
  }

  if (amount) {
    fullUrl += `/${encodeURIComponent(amount)}`;
  }

  return fullUrl;
}

/**
 * Generate a wallet linking success callback link
 */
export function generateWalletLinkedLink(provider: string, address: string, signature?: string): string {
  const baseUrl = 'wesplit://wallet-linked';
  const params = new URLSearchParams({
    provider,
    address
  });

  if (signature) {
    params.append('signature', signature);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate a wallet linking error callback link
 */
export function generateWalletErrorLink(provider?: string, error?: string): string {
  const baseUrl = 'wesplit://wallet-error';
  const params = new URLSearchParams();

  if (provider) {
    params.append('provider', provider);
  }

  if (error) {
    params.append('error', encodeURIComponent(error));
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Test function to verify deep link flow
 * This can be called to test the invitation system
 */
export function testDeepLinkFlow() {
  logger.info('Testing deep link flow', null, 'deepLinkHandler');
  
  // Test URL parsing
  const testUrl = 'wesplit://join/invite_123_1234567890_abc123';
  const parsed = parseWeSplitDeepLink(testUrl);
  logger.info('Parsed test URL', { parsed }, 'deepLinkHandler');
  
  // Test invalid URL
  const invalidUrl = 'https://example.com/invalid';
  const invalidParsed = parseWeSplitDeepLink(invalidUrl);
  logger.info('Parsed invalid URL', { invalidParsed }, 'deepLinkHandler');
  
  // Test URL generation
  const generatedUrl = generateShareableLink('invite_123_1234567890_abc123', 'Test Group');
  logger.info('Generated URL', { generatedUrl }, 'deepLinkHandler');
  
  // Test profile URL generation and parsing
  const profileUrl = generateProfileLink('user123', 'John Doe', 'john@example.com', 'wallet123');
  const profileParsed = parseWeSplitDeepLink(profileUrl);
  logger.info('Generated profile URL', { profileUrl, profileParsed }, 'deepLinkHandler');
  
  // Test send URL generation and parsing
  const sendUrl = generateSendLink('wallet123', 'John Doe', 'john@example.com');
  const sendParsed = parseWeSplitDeepLink(sendUrl);
  logger.info('Generated send URL', { sendUrl, sendParsed }, 'deepLinkHandler');
  
  // Test transfer URL generation and parsing
  const transferUrl = generateTransferLink('wallet123', 'John Doe', 'john@example.com', '100');
  const transferParsed = parseWeSplitDeepLink(transferUrl);
  logger.info('Generated transfer URL', { transferUrl, transferParsed }, 'deepLinkHandler');
  
  return {
    testUrl,
    parsed,
    invalidUrl,
    invalidParsed,
    generatedUrl,
    profileUrl,
    profileParsed,
    sendUrl,
    sendParsed,
    transferUrl,
    transferParsed
  };
}

// Export the deepLinkHandler object
export const deepLinkHandler = {
  parseWeSplitDeepLink,
  handleJoinGroupDeepLink,
  handleAddContactFromProfile,
  setupDeepLinkListeners,
  generateShareableLink,
  generateProfileLink,
  generateSendLink,
  generateTransferLink,
  generateWalletLinkedLink,
  generateWalletErrorLink,
  testDeepLinkFlow
}; 