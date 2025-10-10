/**
 * Deep Link Handler for WeSplit App
 * Handles wesplit:// links for group invitations and other app actions
 */

import { Linking, Alert } from 'react-native';
import { firebaseDataService } from './firebaseDataService';

export interface DeepLinkData {
  action: 'join' | 'invite' | 'profile' | 'send' | 'transfer' | 'moonpay-success' | 'moonpay-failure' | 'oauth-callback' | 'join-split';
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
}

/**
 * Parse a WeSplit deep link URL
 * Expected format: wesplit://action/params
 */
export function parseWeSplitDeepLink(url: string): DeepLinkData | null {
  try {
    console.log('🔥 Parsing deep link URL:', url);
    
    if (!url.startsWith('wesplit://')) {
      console.warn('🔥 URL does not start with wesplit://:', url);
      return null;
    }

    const urlParts = url.replace('wesplit://', '').split('/');
    const action = urlParts[0];
    const params = urlParts.slice(1);

    console.log('🔥 Parsed URL parts:', { action, params });

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
      
      case 'join-split':
        // Handle split invitation deep links
        // Format: wesplit://join-split?data=<encoded_invitation_data>
        try {
          const urlObj = new URL(url);
          const dataParam = urlObj.searchParams.get('data');
          
          if (!dataParam) {
            console.warn('🔥 Join-split action missing data parameter');
            return null;
          }
          
          return {
            action: 'join-split',
            splitInvitationData: dataParam
          };
        } catch (urlError) {
          console.warn('🔥 Error parsing join-split URL:', urlError);
          return null;
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
 * Handle a deep link for adding a contact from profile QR code
 */
export async function handleAddContactFromProfile(linkData: DeepLinkData, currentUserId: string) {
  try {
    console.log('🔥 Handling add contact from profile deep link:', { linkData, currentUserId });
    
    if (!linkData.userId || !linkData.userName) {
      throw new Error('Invalid profile QR code - missing user information');
    }

    // Check if user is trying to add themselves
    if (linkData.userId === currentUserId) {
      throw new Error('You cannot add yourself as a contact');
    }

    // Check if contact already exists
    const existingContacts = await firebaseDataService.user.getUserContacts(currentUserId);
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
    
    console.log('🔥 Successfully added contact via deep link:', newContact);
    
    // Send notification to the added contact
    try {
      const { sendNotification } = await import('./firebaseNotificationService');
      await sendNotification(
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
      console.log('🔥 Contact add notification sent successfully');
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
export function setupDeepLinkListeners(navigation: any, currentUser: any) {
  const handleDeepLink = async (url: string) => {
    console.log('🔥 Received deep link:', url);
    
    const linkData = parseWeSplitDeepLink(url);
    if (!linkData) {
      console.warn('🔥 Invalid deep link format:', url);
      Alert.alert('Invalid Link', 'This invitation link is not valid.');
      return;
    }

    console.log('🔥 Parsed deep link data:', linkData);

    switch (linkData.action) {
      case 'join':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot join group');
          Alert.alert('Authentication Required', 'Please log in to join the group.');
          // Navigate to login if needed
          navigation.navigate('AuthMethods');
          return;
        }

        console.log('🔥 Attempting to join group with inviteId:', linkData.inviteId);
        const joinResult = await handleJoinGroupDeepLink(linkData.inviteId!, currentUser.id);
        
        if (joinResult.success) {
          console.log('🔥 Successfully joined group, navigating to GroupDetails');
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
      
      case 'profile':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot add contact');
          Alert.alert('Authentication Required', 'Please log in to add contacts.');
          navigation.navigate('AuthMethods');
          return;
        }

        console.log('🔥 Attempting to add contact from profile QR:', linkData);
        const addContactResult = await handleAddContactFromProfile(linkData, currentUser.id);
        
        if (addContactResult.success) {
          console.log('🔥 Successfully added contact, navigating to Contacts');
          Alert.alert('Contact Added', `Successfully added ${addContactResult.contactName} to your contacts!`);
          // Navigate to contacts screen
          navigation.navigate('Contacts');
        } else {
          console.error('🔥 Failed to add contact:', addContactResult.error);
          Alert.alert('Error', addContactResult.error || 'Failed to add contact. Please try again.');
        }
        break;
      
      case 'send':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot send money');
          Alert.alert('Authentication Required', 'Please log in to send money.');
          navigation.navigate('AuthMethods');
          return;
        }

        console.log('🔥 Attempting to navigate to Send screen with recipient:', linkData.recipientWalletAddress);
        
        // Navigate to Send screen with recipient wallet address
        navigation.navigate('Send', {
          recipientWalletAddress: linkData.recipientWalletAddress,
          recipientName: linkData.userName,
          recipientEmail: linkData.userEmail
        });
        break;
      
      case 'transfer':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot initiate transfer');
          Alert.alert('Authentication Required', 'Please log in to initiate transfers.');
          navigation.navigate('AuthMethods');
          return;
        }

        console.log('🔥 Attempting to initiate external wallet transfer to:', linkData.recipientWalletAddress);
        
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
        if (linkData.oauthError) {
          console.error('🔥 OAuth callback error:', linkData.oauthError);
          Alert.alert(
            'Authentication Error',
            `OAuth authentication failed: ${linkData.oauthError}`
          );
        } else if (linkData.oauthCode) {
          console.log('🔥 OAuth callback success, code received');
          // The OAuth service should handle this automatically
          // This is just for logging and debugging
        }
        break;
      
      case 'join-split':
        if (!currentUser?.id) {
          console.warn('🔥 User not authenticated, cannot join split');
          Alert.alert('Authentication Required', 'Please log in to join the split.');
          navigation.navigate('AuthMethods');
          return;
        }

        if (!linkData.splitInvitationData) {
          console.warn('🔥 Missing split invitation data');
          Alert.alert('Invalid Link', 'This split invitation link is not valid.');
          return;
        }

        console.log('🔥 Attempting to join split with invitation data:', linkData.splitInvitationData);
        
        // Navigate to SplitDetails screen with the invitation data
        navigation.navigate('SplitDetails', {
          shareableLink: url, // Pass the original URL
          splitInvitationData: linkData.splitInvitationData
        });
        break;
      
      default:
        console.warn('🔥 Unknown deep link action:', linkData.action);
        Alert.alert('Unknown Action', 'This link is not supported.');
    }
  };

  // Listen for incoming links when app is already running
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('🔥 Deep link event received:', event.url);
    handleDeepLink(event.url);
  });

  // Handle links that opened the app (only once)
  // Note: This is now handled in NavigationWrapper to avoid duplicate calls
  // Linking.getInitialURL().then((url) => {
  //   if (url) {
  //     console.log('🔥 Initial URL found:', url);
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
 * Test function to verify deep link flow
 * This can be called to test the invitation system
 */
export function testDeepLinkFlow() {
  console.log('🧪 Testing deep link flow...');
  
  // Test URL parsing
  const testUrl = 'wesplit://join/invite_123_1234567890_abc123';
  const parsed = parseWeSplitDeepLink(testUrl);
  console.log('🧪 Parsed test URL:', parsed);
  
  // Test invalid URL
  const invalidUrl = 'https://example.com/invalid';
  const invalidParsed = parseWeSplitDeepLink(invalidUrl);
  console.log('🧪 Parsed invalid URL:', invalidParsed);
  
  // Test URL generation
  const generatedUrl = generateShareableLink('invite_123_1234567890_abc123', 'Test Group');
  console.log('🧪 Generated URL:', generatedUrl);
  
  // Test profile URL generation and parsing
  const profileUrl = generateProfileLink('user123', 'John Doe', 'john@example.com', 'wallet123');
  const profileParsed = parseWeSplitDeepLink(profileUrl);
  console.log('🧪 Generated profile URL:', profileUrl);
  console.log('🧪 Parsed profile URL:', profileParsed);
  
  // Test send URL generation and parsing
  const sendUrl = generateSendLink('wallet123', 'John Doe', 'john@example.com');
  const sendParsed = parseWeSplitDeepLink(sendUrl);
  console.log('🧪 Generated send URL:', sendUrl);
  console.log('🧪 Parsed send URL:', sendParsed);
  
  // Test transfer URL generation and parsing
  const transferUrl = generateTransferLink('wallet123', 'John Doe', 'john@example.com', '100');
  const transferParsed = parseWeSplitDeepLink(transferUrl);
  console.log('🧪 Generated transfer URL:', transferUrl);
  console.log('🧪 Parsed transfer URL:', transferParsed);
  
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