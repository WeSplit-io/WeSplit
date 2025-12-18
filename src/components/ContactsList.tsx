import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Linking, RefreshControl } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from './Icon';
import { Input, PhosphorIcon, ModernLoader } from './shared';
import { useApp } from '../context/AppContext';
import { useContacts, useContactActions } from '../hooks';
import { deepLinkHandler } from '../services/core';
import { UserSearchService, UserSearchResult } from '../services/contacts';
import { isSolanaPayUri, parseUri, extractRecipientAddress, isValidSolanaAddress } from '../services/core';
import { UserContact, User } from '../types';
import { colors, spacing } from '../theme';
import { styles } from './ContactsList.styles';
import { logger } from '../services/core';
import Avatar from './shared/Avatar';
import { getWalletAddressStatus } from '../utils/crypto/wallet';
import { useRealtimeUserSearch } from '../hooks/useRealtimeUserSearch';
import CommunityBadge from './profile/CommunityBadge';
import { badgeService } from '../services/rewards/badgeService';
import { TransactionHistoryService } from '../services/blockchain/transaction/transactionHistoryService';

// Type for community badges
type CommunityBadgeType = {
  badgeId: string;
  title: string;
  icon: string;
  imageUrl?: string;
};

interface ContactsListProps {
  onContactSelect: (contact: UserContact) => void;
  onAddContact?: (user: User) => void; // Callback for notification only, not for actual adding
  showAddButton?: boolean;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  placeholder?: string;
  hideToggleBar?: boolean;
  onNavigateToSend?: (recipientWalletAddress: string, userName?: string) => void;
  onNavigateToTransfer?: (recipientWalletAddress: string, userName?: string) => void;
  selectedContacts?: UserContact[];
  multiSelect?: boolean;
  groupId?: string; // Optional groupId for context
}

const ContactsList: React.FC<ContactsListProps> = ({
  onContactSelect,
  onAddContact,
  showAddButton = false,
  showSearch = true,
  searchQuery = '',
  onSearchQueryChange,
  placeholder = "Search contacts",
  hideToggleBar = false,
  onNavigateToSend,
  onNavigateToTransfer,
  selectedContacts = [],
  multiSelect = false,
  groupId: _groupId,
}) => {
  const navigation = useNavigation();
  const { state } = useApp();
  const { currentUser } = state;

  // Use the new hooks for contact management
  const { contacts, loading, refreshContacts } = useContacts();
  const { addContact, isUserAlreadyContact, toggleFavorite: toggleFavoriteAction } = useContactActions();

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<UserContact[]>([]);
  const [loadingRecentInteractions, setLoadingRecentInteractions] = useState(false);
  
  // Real-time user search
  const { 
    subscribe: subscribeRealtimeSearch,
    unsubscribe: unsubscribeRealtimeSearch,
    clearResults: clearRealtimeResults
  } = useRealtimeUserSearch({
    enabled: true,
    debounceMs: 500,
    limit: 20,
    includeDeleted: false,
    includeSuspended: false,
    onUserAdded: (user) => onUserAddedRef.current?.(user),
    onUserModified: (user) => onUserModifiedRef.current?.(user),
    onUserRemoved: (user) => onUserRemovedRef.current?.(user)
  });
  const [isAddingContact, setIsAddingContact] = useState<number | null>(null);
  const [mode, setMode] = useState<'list' | 'qr'>('list');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  
  // Use refs to store callback functions to prevent infinite loops
  const onUserAddedRef = useRef<(user: User) => void | undefined>(undefined);
  const onUserModifiedRef = useRef<(user: User) => void | undefined>(undefined);
  const onUserRemovedRef = useRef<(user: User) => void | undefined>(undefined);
  
  // Update refs when callbacks change
  onUserAddedRef.current = (user: User) => {
    if (__DEV__) {
      logger.debug('New user added to search results', { userId: user.id, name: user.name }, 'ContactsList');
    }
  };
  onUserModifiedRef.current = (user: User) => {
    if (__DEV__) {
      logger.debug('User modified in search results', { userId: user.id, name: user.name }, 'ContactsList');
    }
  };
  onUserRemovedRef.current = (user: User) => {
    if (__DEV__) {
      logger.debug('User removed from search results', { userId: user.id, name: user.name }, 'ContactsList');
    }
  };
  const [refreshing, setRefreshing] = useState(false);

  // Add refresh functionality
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshContacts(); // Use the hook's refresh method
    } finally {
      setRefreshing(false);
    }
  };

  // Camera permissions are now handled by useCameraPermissions hook


  // Use useMemo to prevent unnecessary filtering and state updates
  // Get favorite contacts
  const favoriteContacts = useMemo(() => {
    return contacts.filter(contact => contact.isFavorite);
  }, [contacts]);

  // Get quick access contacts (first 4 favorites)
  const quickAccessContacts = useMemo(() => {
    return favoriteContacts.slice(0, 4);
  }, [favoriteContacts]);

  // Get regular contacts (non-favorites, excluding quick access)
  const regularContacts = useMemo(() => {
    const favoriteIds = new Set(favoriteContacts.map(c => String(c.id)));
    return contacts.filter(contact => !favoriteIds.has(String(contact.id)));
  }, [contacts, favoriteContacts]);

  // Load recently interacted contacts
  useEffect(() => {
    const loadRecentInteractions = async () => {
      if (!currentUser?.id || searchQuery.trim() !== '') {
        return; // Don't load when searching
      }

      try {
        setLoadingRecentInteractions(true);
        const transactionHistoryService = new TransactionHistoryService();
        const history = await transactionHistoryService.getUserTransactionHistory(
          String(currentUser.id),
          { limit: 100 }
        );

        if (history.success && history.transactions) {
          // Map user IDs to their most recent interaction date and contact info
          const userInteractionMap = new Map<string, { lastInteraction: Date; contact?: UserContact }>();

          history.transactions.slice(0, 50).forEach(transaction => {
            const otherUserId = transaction.from_user === String(currentUser.id) 
              ? transaction.to_user 
              : transaction.from_user;
            
            if (otherUserId && otherUserId !== String(currentUser.id)) {
              const existing = userInteractionMap.get(otherUserId);
              const transactionDate = new Date(transaction.created_at || transaction.createdAt || Date.now());
              
              if (!existing || transactionDate > existing.lastInteraction) {
                const contact = contacts.find(c => String(c.id) === otherUserId);
                userInteractionMap.set(otherUserId, {
                  lastInteraction: transactionDate,
                  contact
                });
              }
            }
          });

          // Convert to array and sort by last interaction
          const recentContacts = Array.from(userInteractionMap.values())
            .filter(item => item.contact) // Only include contacts that exist
            .map(item => item.contact!)
            .sort((a, b) => {
              const aDate = userInteractionMap.get(String(a.id))?.lastInteraction || new Date(0);
              const bDate = userInteractionMap.get(String(b.id))?.lastInteraction || new Date(0);
              return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 10); // Limit to 10 most recent

          setRecentInteractions(recentContacts);
        }
      } catch (error) {
        logger.error('Failed to load recent interactions', { error }, 'ContactsList');
      } finally {
        setLoadingRecentInteractions(false);
      }
    };

    loadRecentInteractions();
  }, [currentUser?.id, contacts, searchQuery]);

  // Handle user search with enhanced functionality
  // Memoize handleUserSearch to prevent infinite loops
  const handleUserSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!currentUser?.id) {
      logger.warn('No current user for search', null, 'ContactsList');
      return;
    }

    try {
      if (__DEV__) {
        logger.debug('Starting enhanced user search for', { query }, 'ContactsList');
      }
      setIsSearching(true);
      
      let results: UserSearchResult[] = [];
      
      // Check if query looks like a wallet address (starts with specific prefixes)
      const isWalletAddress = query.trim().match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) || 
                             query.trim().startsWith('solana:') ||
                             query.trim().startsWith('sol:');
      
      if (isWalletAddress) {
        // Search by wallet address
        if (__DEV__) {
          logger.debug('Searching by wallet address', { query: query.substring(0, 8) + '...' }, 'ContactsList');
        }
        results = await UserSearchService.searchUsersByWalletAddress(
          query.trim(),
          String(currentUser.id)
        );
      } else {
        // Regular text search
        results = await UserSearchService.searchUsers(
          query.trim(),
          String(currentUser.id),
          {
            limit: 20,
            includeDeleted: false,
            includeSuspended: false,
            sortBy: 'relevance',
            relationshipFilter: 'all'
          }
        );
      }
      
      if (__DEV__) {
        logger.debug('Enhanced search results received', { 
          count: results.length, 
          searchType: isWalletAddress ? 'wallet' : 'text',
          results: results.map(r => ({ 
            name: r.name, 
            email: r.email,
            isAlreadyContact: r.isAlreadyContact,
            relationshipType: r.relationshipType
          })) 
        }, 'ContactsList');
      }
      
      setSearchResults(results);
    } catch (error) {
      logger.error('Error searching users', { error: error instanceof Error ? error.message : String(error) }, 'ContactsList');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser?.id]); // Only depend on currentUser.id to prevent infinite loops

  // Store functions in refs to prevent infinite loops
  const subscribeRealtimeSearchRef = useRef(subscribeRealtimeSearch);
  const unsubscribeRealtimeSearchRef = useRef(unsubscribeRealtimeSearch);
  const clearRealtimeResultsRef = useRef(clearRealtimeResults);
  const handleUserSearchRef = useRef(handleUserSearch);
  
  // Update refs when functions change
  useEffect(() => {
    subscribeRealtimeSearchRef.current = subscribeRealtimeSearch;
    unsubscribeRealtimeSearchRef.current = unsubscribeRealtimeSearch;
    clearRealtimeResultsRef.current = clearRealtimeResults;
    handleUserSearchRef.current = handleUserSearch;
  }, [subscribeRealtimeSearch, unsubscribeRealtimeSearch, clearRealtimeResults, handleUserSearch]);

  // Debounced search with proper cleanup - only depend on searchQuery
  useEffect(() => {
    const subscribeRef = subscribeRealtimeSearchRef.current;
    const unsubscribeRef = unsubscribeRealtimeSearchRef.current;
    const clearRef = clearRealtimeResultsRef.current;
    const handleSearchRef = handleUserSearchRef.current;
    
    if (searchQuery.trim() && searchQuery.length >= 2) {
      // Subscribe to real-time search using ref
      subscribeRef(searchQuery);
      
      // Also run traditional search as fallback using ref
      handleSearchRef(searchQuery);
    } else {
      setSearchResults([]);
      clearRef();
      unsubscribeRef();
    }
    
    // Cleanup function for all cases
    return () => {
      unsubscribeRef();
      clearRef();
    };
  }, [searchQuery]); // Only depend on searchQuery

  // Cleanup on unmount - use refs to avoid dependency issues
  useEffect(() => {
    const addingRef = addingContactsRef.current;
    const togglingRef = togglingFavoritesRef.current;
    const unsubscribeRef = unsubscribeRealtimeSearchRef.current;
    const clearRef = clearRealtimeResultsRef.current;
    
    return () => {
      // Always cleanup realtime subscriptions on unmount
      if (unsubscribeRef) {
        unsubscribeRef();
      }
      if (clearRef) {
        clearRef();
      }
      // Clear any ongoing operations using refs captured in closure
      if (addingRef) {
        addingRef.clear();
      }
      if (togglingRef) {
        togglingRef.clear();
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Contact loading is now handled by the useContacts hook

  // Track ongoing additions to prevent race conditions
  const addingContactsRef = useRef<Set<string>>(new Set());

  const handleAddContact = async (user: User) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to add contacts');
      return;
    }

    const userId = String(user.id);
    
    // Check if already adding this contact (race condition protection)
    if (addingContactsRef.current.has(userId)) {
      logger.warn('Contact addition already in progress', { userId, name: user.name }, 'ContactsList');
      return;
    }

    // Check if contact already exists using the hook
    if (isUserAlreadyContact(user, contacts)) {
      logger.warn('Contact already exists', { name: user.name }, 'ContactsList');
      Alert.alert('Info', 'This contact is already in your list');
      return;
    }

    // Mark as adding
    addingContactsRef.current.add(userId);
    setIsAddingContact(Number(user.id));

    try {
      // Use the hook's addContact method (this is the single source of truth)
      const result = await addContact(user);

      if (result.success) {
        // Refresh contacts list to get updated data
        await refreshContacts();
        
        // Call parent's onAddContact callback if provided (for notification only, not for adding)
        // This allows parent screens to react to the addition (e.g., show success message)
        if (onAddContact) {
          try {
          await onAddContact(user);
          } catch (callbackError) {
            // Don't fail the operation if callback fails
            logger.error('Error in onAddContact callback', { error: callbackError }, 'ContactsList');
          }
        }

        logger.info('Contact added successfully', { userName: user.name }, 'ContactsList');
      } else {
        logger.error('Failed to add contact', { error: result.error }, 'ContactsList');
        Alert.alert('Error', result.error || 'Failed to add contact');
      }
    } catch (error) {
      logger.error('Error adding contact', { error: error instanceof Error ? error.message : String(error) }, 'ContactsList');
      const errorMessage = error instanceof Error ? error.message : 'Failed to add contact';
      Alert.alert('Error', errorMessage);
    } finally {
      // Remove from adding set and reset state
      addingContactsRef.current.delete(userId);
      setIsAddingContact(null);
    }
  };

  // Track ongoing favorite toggles to prevent race conditions
  const togglingFavoritesRef = useRef<Set<string>>(new Set());

  const toggleFavorite = async (contactId: number | string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to update favorites');
      return;
    }

    const contactIdStr = String(contactId);
    
    // Check if already toggling this contact (race condition protection)
    if (togglingFavoritesRef.current.has(contactIdStr)) {
      logger.warn('Favorite toggle already in progress', { contactId: contactIdStr }, 'ContactsList');
      return;
    }

    // Find the contact to get current favorite status
    // Check in all possible locations: contacts, searchResults, recentInteractions
    // Normalize IDs to strings for comparison (contactId can be number or string, c.id can be number or string)
    const contact = contacts.find(c => String(c.id) === contactIdStr) ||
                    searchResults.find(r => String(r.id) === contactIdStr) ||
                    recentInteractions.find(c => String(c.id) === contactIdStr);
    
    // Determine the new favorite status
    // If contact is found locally, use its current favorite status to toggle
    // If not found, try to get it from the database, or let the backend handle it
    let newFavoriteStatus: boolean;
    
    if (contact && 'isFavorite' in contact && typeof contact.isFavorite === 'boolean') {
      // Contact found with favorite status - toggle it
      newFavoriteStatus = !contact.isFavorite;
      logger.debug('Using local contact favorite status', { 
        contactId: contactIdStr,
        currentFavorite: contact.isFavorite,
        newFavorite: newFavoriteStatus
      }, 'ContactsList');
    } else {
      // Contact not found in local arrays - try to get current status from database
      try {
        // Try to find the contact in the database to get its current favorite status
        // We'll query all contacts for the current user and find the one matching this contactId
        const { firebaseDataService } = await import('../services/data');
        
        // Get all contacts for the current user
        const allContacts = await firebaseDataService.contact.getContacts(currentUser.id.toString());
        
        // Find the contact by ID (which might be user ID or document ID)
        const dbContact = allContacts.find(c => 
          String(c.id) === contactIdStr || 
          c.email === contact?.email || 
          c.wallet_address === contact?.wallet_address
        );
        
        if (dbContact && typeof dbContact.isFavorite === 'boolean') {
          newFavoriteStatus = !dbContact.isFavorite;
          logger.debug('Found contact in database, toggling favorite status', { 
            contactId: contactIdStr,
            currentFavorite: dbContact.isFavorite,
            newFavorite: newFavoriteStatus
          }, 'ContactsList');
        } else {
          // If we still can't find it, default to true (set as favorite)
          // The backend will validate and handle errors if the contact doesn't exist
          logger.warn('Contact not found in local arrays or database, defaulting to true', { 
            contactId: contactIdStr,
        contactsCount: contacts.length,
            allContactsCount: allContacts.length
      }, 'ContactsList');
          newFavoriteStatus = true;
        }
      } catch (dbError) {
        // If database lookup fails, default to true
        // The backend will validate and return an error if the contact doesn't exist
        logger.warn('Failed to get contact from database, defaulting to true', { 
          contactId: contactIdStr,
          error: dbError instanceof Error ? dbError.message : String(dbError)
        }, 'ContactsList');
        newFavoriteStatus = true;
      }
    }

    // Mark as toggling
    togglingFavoritesRef.current.add(contactIdStr);

    try {
      // Update in Firebase
      const result = await toggleFavoriteAction(contactIdStr, newFavoriteStatus);

      if (result.success) {
        // Refresh contacts to get updated favorite status
        await refreshContacts();
        logger.info('Favorite status updated', { contactId: contactIdStr, isFavorite: newFavoriteStatus }, 'ContactsList');
      } else {
        logger.error('Failed to update favorite status', { error: result.error }, 'ContactsList');
        Alert.alert('Error', result.error || 'Failed to update favorite status');
      }
    } catch (error) {
      logger.error('Error toggling favorite', { error: error instanceof Error ? error.message : String(error) }, 'ContactsList');
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorite status';
      Alert.alert('Error', errorMessage);
    } finally {
      // Remove from toggling set
      togglingFavoritesRef.current.delete(contactIdStr);
    }
  };


  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 8) {return address;}
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // isUserAlreadyContact is now provided by the useContactActions hook

  // Handle QR code scanning
  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || isProcessingQR) {return;}
    
    setScanned(true);
    setIsProcessingQR(true);
    
    try {
      logger.info('Scanned QR code', { data }, 'ContactsList');
      
      // Check if it's a Solana Pay URI first
      if (isSolanaPayUri(data)) {
        const parsed = parseUri(data);
        if (parsed.isValid) {
          // Navigate to Send screen with Solana Pay data
          if (onNavigateToSend) {
            onNavigateToSend(parsed.recipient, parsed.label || 'Unknown');
          } else {
            Alert.alert(
              'Solana Pay QR Code',
              `Send ${parsed.amount ? `${parsed.amount} USDC` : 'USDC'} to ${parsed.recipient.substring(0, 6)}...${parsed.recipient.substring(parsed.recipient.length - 6)}?`,
              [
                { text: 'Cancel', onPress: () => resetScanner() },
                { text: 'Send', onPress: () => resetScanner() }
              ]
            );
          }
          return;
        } else {
          Alert.alert('Invalid QR Code', parsed.error || 'This is not a valid USDC payment request.');
          return;
        }
      }
      
      // Check if it's a raw Solana address
      const recipient = extractRecipientAddress(data);
      if (recipient && isValidSolanaAddress(recipient)) {
        if (onNavigateToSend) {
          onNavigateToSend(recipient, 'Unknown');
        } else {
          Alert.alert(
            'Solana Address QR Code',
            `Send USDC to ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 6)}?`,
            [
              { text: 'Cancel', onPress: () => resetScanner() },
              { text: 'Send', onPress: () => resetScanner() }
            ]
          );
        }
        return;
      }
      
      // Parse the deep link
      const linkData = deepLinkHandler.parseWeSplitDeepLink(data);
      
      if (!linkData) {
        Alert.alert('Invalid QR Code', 'This QR code is not recognized by WeSplit.');
        return;
      }
      
      logger.info('Parsed QR data', { linkData }, 'ContactsList');
      
      // Handle different QR code types
      switch (linkData.action) {
        case 'profile':
          if (!currentUser?.id) {
            Alert.alert('Error', 'You must be logged in to add contacts.');
            return;
          }
          
          try {
            const result = await deepLinkHandler.handleAddContactFromProfile(linkData, currentUser.id.toString());
            if (result.success) {
              Alert.alert('Success', 'Contact added successfully!');
              // Refresh contacts list
              await refreshContacts();
            } else {
              Alert.alert('Error', result.message || 'Failed to add contact.');
            }
          } catch (error) {
            logger.error('Error adding contact from QR:', error as Record<string, unknown>, 'ContactsList');
            Alert.alert('Error', 'Failed to add contact. Please try again.');
          }
          break;
          
        case 'join':
          if (!currentUser?.id) {
            Alert.alert('Error', 'You must be logged in to join groups.');
            return;
          }
          
          if (!linkData.inviteId) {
            Alert.alert('Error', 'Invalid group invitation link.');
            return;
          }
          
          try {
            const result = await deepLinkHandler.handleJoinGroupDeepLink(linkData.inviteId, currentUser.id.toString());
            if (result.success) {
              Alert.alert('Success', `Successfully joined group: ${result.groupName || 'Unknown Group'}`);
              // Refresh contacts list
                await refreshContacts();
            } else {
              Alert.alert('Error', result.message || 'Failed to join group.');
            }
          } catch (error) {
            logger.error('Error joining group from QR:', error as Record<string, unknown>, 'ContactsList');
            Alert.alert('Error', 'Failed to join group. Please try again.');
          }
          break;
          
        case 'send':
          if (!linkData.recipientWalletAddress) {
            Alert.alert('Error', 'Invalid send link - missing wallet address.');
            return;
          }
          
          if (onNavigateToSend) {
            Alert.alert(
              'Send Money',
              `Redirect to send money to ${linkData.userName || 'this user'}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Send Money', 
                  onPress: () => {
                    if (linkData.recipientWalletAddress) {
                      onNavigateToSend(linkData.recipientWalletAddress, linkData.userName);
                    }
                  }
                }
              ]
            );
          } else {
            Alert.alert('Send Money', `Send money to ${linkData.userName || 'this user'}? (Navigation not configured)`);
          }
          break;
          
        case 'transfer':
          if (!linkData.recipientWalletAddress) {
            Alert.alert('Error', 'Invalid transfer link - missing wallet address.');
            return;
          }
          
          if (onNavigateToTransfer) {
            Alert.alert(
              'External Transfer',
              `Transfer to ${linkData.userName || 'this user'} via external wallet?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Transfer', 
                  onPress: () => {
                    if (linkData.recipientWalletAddress) {
                      onNavigateToTransfer(linkData.recipientWalletAddress, linkData.userName);
                    }
                  }
                }
              ]
            );
          } else {
            Alert.alert('External Transfer', `Transfer to ${linkData.userName || 'this user'} via external wallet? (Navigation not configured)`);
          }
          break;
          
        default:
          Alert.alert('Unknown QR Code', 'This QR code type is not supported.');
      }
      
    } catch (error) {
      logger.error('Error processing QR code', { error: error instanceof Error ? error.message : String(error) }, 'ContactsList');
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
    } finally {
      setIsProcessingQR(false);
    }
  };

  // Reset scanner state
  const resetScanner = () => {
    setScanned(false);
    setIsProcessingQR(false);
  };


  const renderContact = (item: UserContact, section: 'friends' | 'others' | 'all' | 'favorite') => {
    // Debug logging for contact avatar data
    logger.debug('Rendering contact', {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      hasAvatar: !!item.avatar,
      section
    });

    const isSelected = multiSelect && selectedContacts.some(c => c.id === item.id);

    const handleContactPress = () => {
      // If onContactSelect is provided, use it (for Send/Request flows)
      // Otherwise, navigate to UserProfile (default behavior)
      if (onContactSelect) {
        onContactSelect(item);
      } else {
      navigation.navigate('UserProfile', {
        userId: item.id,
        contact: item
      });
      }
    };

    const handleAvatarPress = () => {
      // If onContactSelect is provided, use it (for Send/Request flows)
      // Otherwise, navigate to UserProfile (default behavior)
      if (onContactSelect) {
        onContactSelect(item);
      } else {
      navigation.navigate('UserProfile', {
        userId: item.id,
        contact: item
      });
      }
    };

    return (
      <ContactRowWithBadges
        key={`${section}-${item.id}`}
        contact={item}
        isSelected={isSelected}
        onPress={handleContactPress}
        onAvatarPress={handleAvatarPress}
        formatWalletAddress={formatWalletAddress}
        multiSelect={multiSelect}
        onContactSelect={onContactSelect}
        toggleFavorite={toggleFavorite}
      />
    );
  };

  // Contact Row Component with Badges
  const ContactRowWithBadges: React.FC<{
    contact: UserContact;
    isSelected: boolean;
    onPress: () => void;
    onAvatarPress: () => void;
    formatWalletAddress: (address: string) => string;
    multiSelect: boolean;
    onContactSelect: (contact: UserContact) => void;
    toggleFavorite: (contactId: string) => void;
  }> = ({ contact, isSelected, onPress, onAvatarPress, formatWalletAddress, multiSelect, onContactSelect, toggleFavorite }) => {
    const [communityBadges, setCommunityBadges] = useState<CommunityBadgeType[]>([]);

    useEffect(() => {
      // Community badges are disabled - do not load or display them
      setCommunityBadges([]);
    }, [contact.id, contact.show_badges_on_profile]);

    return (
      <TouchableOpacity
        style={[styles.contactRow, isSelected && styles.contactRowSelected]}
        onPress={onPress}
      >
        <TouchableOpacity onPress={onAvatarPress}>
          <Avatar
            userId={contact.id.toString()}
            userName={contact.name}
            size={50}
            avatarUrl={contact.avatar}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>
              {contact.name || formatWalletAddress(contact.wallet_address)}
            </Text>
            {communityBadges.map((badge) => (
              <CommunityBadge
                key={badge.badgeId}
                icon={badge.icon}
                iconUrl={badge.imageUrl}
                title={badge.title}
                size={20}
              />
            ))}
          </View>
          <View>
            <Text style={styles.contactEmail}>
              {contact.wallet_address ? formatWalletAddress(contact.wallet_address) : (contact.email || '')}
              {('mutual_groups_count' in contact && typeof (contact as { mutual_groups_count?: number }).mutual_groups_count === 'number' && (contact as { mutual_groups_count: number }).mutual_groups_count > 0) && (
                <Text style={styles.mutualGroupsText}> • {(contact as { mutual_groups_count: number }).mutual_groups_count} splits</Text>
              )}
            </Text>
            {(() => {
              const walletStatus = getWalletAddressStatus(contact.wallet_address);
              if (walletStatus.status !== 'valid') {
                return (
                  <Text style={[styles.contactEmail, { color: walletStatus.color, fontSize: 11, marginTop: 2 }]}>
                    ⚠️ {walletStatus.displayText}
                  </Text>
                );
              }
              return null;
            })()}
          </View>
        </View>
        {multiSelect ? (
          <View style={styles.selectIndicator}>
            {isSelected ? (
              <LinearGradient
                colors={[colors.green, colors.greenBlue || colors.green]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButton}
              >
                <PhosphorIcon 
                  name="Check" 
                  size={16} 
                  color={colors.black} 
                  weight="bold"
                />
              </LinearGradient>
            ) : (
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(contact.id)}
          >
            <Icon
              name="star"
              size={16}
              color={contact.isFavorite ? colors.green : colors.white70}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ModernLoader size="large" text="Loading contacts..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle Contact List / Scan QR Code (design simple, surlignage vert) */}
      {!hideToggleBar && (
        <View style={styles.containerToggle}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setMode('list')}
          >
            <Text style={[styles.toggleText, mode === 'list' && styles.toggleTextActive]}>Contact List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setMode('qr')}
          >
            <Text style={[styles.toggleText, mode === 'qr' && styles.toggleTextActive]}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Affichage selon le mode */}
      {(hideToggleBar || mode === 'list') ? (
        <>
          {/* Search Input */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <Input
                placeholder={placeholder}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                leftIcon="MagnifyingGlass"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          )}
          {/* Content */}
          <View style={styles.animatedContentContainer}>
            <ScrollView
              style={styles.contactsScrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.green}
                  colors={[colors.green]}
                />
              }
            >
            {/* Search Results - Show when searching */}
            {searchQuery.trim() && searchQuery.length >= 2 ? (
              <>
                {isSearching && (
                  <View style={styles.loadingContainer}>
                    <ModernLoader size="medium" text="Searching users..." />
                  </View>
                )}
                {!isSearching && searchResults.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    {searchResults.map((user) => {
                      // Debug logging for enhanced search result user data
                      logger.debug('Enhanced search result user', {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                        hasAvatar: !!user.avatar,
                        isAlreadyContact: user.isAlreadyContact,
                        relationshipType: user.relationshipType
                      });

                      // Check if this user is already in contacts to get favorite status
                      // Use both the search result flag and local contacts check for accuracy
                      const existingContact = contacts.find(c => String(c.id) === String(user.id));
                      const isFavorite = existingContact?.isFavorite || false;
                      
                      // Check if user is already a contact using the hook function (more reliable)
                      const isAlreadyContactLocal = isUserAlreadyContact(user, contacts);
                      // Use local check as primary, fallback to search result flag
                      const isAlreadyContact = isAlreadyContactLocal || user.isAlreadyContact;

                      const userAsContact: UserContact = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        wallet_address: user.wallet_address,
                        wallet_public_key: user.wallet_public_key,
                        created_at: user.created_at,
                        first_met_at: user.created_at,
                        avatar: user.avatar,
                        isFavorite: isFavorite
                      };

                      const isSelected = multiSelect && selectedContacts.some(c => String(c.id) === String(user.id));

                      return (
                        <TouchableOpacity
                          key={`search-${user.id}`}
                          style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                          onPress={() => onContactSelect(userAsContact)}
                        >
                          <Avatar
                            userId={user.id.toString()}
                            userName={user.name}
                            size={50}
                            avatarUrl={user.avatar}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              backgroundColor: colors.white10,
                            }}
                          />
                          <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>
                              {user.name || formatWalletAddress(user.wallet_address)}
                            </Text>
                            <View>
                              <Text style={styles.contactEmail}>
                                {user.wallet_address ? formatWalletAddress(user.wallet_address) : (user.email || '')}
                              </Text>
                              {(() => {
                                const walletStatus = getWalletAddressStatus(user.wallet_address);
                                if (walletStatus.status !== 'valid') {
                                  return (
                                    <Text style={[styles.contactEmail, { color: walletStatus.color, fontSize: 11, marginTop: 2 }]}>
                                      ⚠️ {walletStatus.displayText}
                                    </Text>
                                  );
                                }
                                return null;
                              })()}
                            
                              {/* Show relationship context */}
                              {user.relationshipType && user.relationshipType !== 'none' && (
                                <Text style={[styles.contactEmail, { fontSize: 11, marginTop: 2, color: colors.green }]}>
                                  {user.relationshipType === 'contact' ? '✓ Already a contact' :
                                   user.relationshipType === 'transaction_partner' ? '💸 Transaction partner' :
                                   user.relationshipType === 'split_participant' ? '👥 Split participant' : ''}
                                </Text>
                              )}
                            </View>
                          </View>
                          {multiSelect ? (
                            <View style={styles.selectIndicator}>
                              {isSelected ? (
                                <LinearGradient
                                  colors={[colors.green, colors.greenBlue || colors.green]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={styles.addButton}
                                >
                                  <PhosphorIcon 
                                    name="Check" 
                                    size={16} 
                                    color={colors.white} 
                                    weight="bold"
                                  />
                                </LinearGradient>
                              ) : (
                                <View style={styles.addButton}>
                                  <Text style={styles.addButtonText}>Add</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            // Show different icons based on contact status
                            // If already a contact, show check-circle icon to indicate already added
                            // If not a contact and showAddButton is true, show add button (user-plus)
                            isAlreadyContact ? (
                              // Already a contact - show check-circle icon to indicate already in contact list
                              <TouchableOpacity
                                style={styles.favoriteButton}
                                onPress={() => toggleFavorite(user.id)}
                              >
                                <Icon
                                  name="check-circle-fill"
                                  size={16}
                                  color={colors.green}
                                />
                              </TouchableOpacity>
                            ) : showAddButton ? (
                              // Not a contact and showAddButton is true - show add button
                                <TouchableOpacity
                                  style={styles.favoriteButton}
                                  onPress={() => handleAddContact(user)}
                                  disabled={isAddingContact === Number(user.id)}
                                >
                                  <Icon
                                    name={isAddingContact === Number(user.id) ? "check" : "user-plus"}
                                    size={16}
                                    color={isAddingContact === Number(user.id) ? colors.green : colors.green}
                                  />
                                </TouchableOpacity>
                            ) : null
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />
                    <Text style={styles.emptyText}>No users found matching &quot;{searchQuery}&quot;</Text>
                  </View>
                )}
                {!isSearching && !searchQuery.trim() && (
                  <View style={styles.emptyContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />

                    <Text style={styles.emptyText}>Search users by name, email, or wallet address to add them to your contacts</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Favorites Section - At the top */}
                {favoriteContacts.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Favorites</Text>
                    {favoriteContacts.map(contact => renderContact(contact, 'favorite'))}
                  </View>
                )}

                {/* Quick Access Section - 4 contacts */}
                {quickAccessContacts.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Quick Access</Text>
                    <View style={styles.quickAccessGrid}>
                      {quickAccessContacts.map(contact => (
                        <TouchableOpacity
                          key={`quick-${contact.id}`}
                          style={styles.quickAccessItem}
                          onPress={() => {
                            if (onContactSelect) {
                              onContactSelect(contact);
                            } else {
                              navigation.navigate('UserProfile', {
                                userId: contact.id,
                                contact: contact
                              });
                            }
                          }}
                        >
                          <Avatar
                            userId={contact.id.toString()}
                            userName={contact.name}
                            size={60}
                            avatarUrl={contact.avatar}
                            style={styles.quickAccessAvatar}
                          />
                          <Text style={styles.quickAccessName} numberOfLines={1}>
                            {contact.name || formatWalletAddress(contact.wallet_address || '')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Recently Interacted Section */}
                {recentInteractions.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Interactions</Text>
                    {recentInteractions.map(contact => renderContact(contact, 'all'))}
                  </View>
                )}

                {/* All Contacts Section */}
                {regularContacts.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>All Contacts</Text>
                    {regularContacts.map(contact => renderContact(contact, 'all'))}
                  </View>
                )}

                {/* Empty State */}
                {contacts.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />
                    <Text style={styles.emptyText}>No contacts available</Text>
                  </View>
                )}
              </>
            )}
            </ScrollView>
          </View>
        </>
      ) : (
        <View style={styles.qrScannerContainer}>
          {!permission ? (
            <View style={styles.qrScannerPlaceholder}>
              <Text style={styles.qrScannerPlaceholderText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.qrScannerPlaceholder}>
              <Text style={styles.qrScannerPlaceholderText}>Camera permission denied</Text>
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={async () => {
                  try {
                    const result = await requestPermission();
                    logger.info('Camera permission requested', { result }, 'ContactsList');
                    if (!result.granted) {
                      Alert.alert(
                        'Camera Permission Required',
                        'WeSplit needs camera access to scan QR codes. Please enable it in your device settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Settings', onPress: () => Linking.openSettings() }
                        ]
                      );
                    }
                  } catch (error) {
                    logger.error('Error requesting camera permission', error as Record<string, unknown>, 'ContactsList');
                    Alert.alert('Error', 'Failed to request camera permission. Please try again.');
                  }
                }}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
                      ) : (
              <View style={styles.scannerContainer}>
                <View style={styles.cameraScannerContainer}>
                  <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={styles.cameraWebView}
                    flash="off"
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr', 'pdf417'],
                    }}
                  />
                  <View style={styles.scannerOverlay}>
                    <Text style={styles.scannerOverlayText}>Position QR code within frame</Text>
                  </View>
                </View>
              </View>
            )}
        </View>
      )}
    </View>
  );
};

export default ContactsList; 