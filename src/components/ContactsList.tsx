import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Linking, Animated, RefreshControl } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { Input, PhosphorIcon } from './shared';
import { useApp } from '../context/AppContext';
import { useContacts, useContactActions } from '../hooks';
import { deepLinkHandler } from '../services/core';
import { UserSearchService, UserSearchResult } from '../services/contacts';
import { isSolanaPayUri, parseUri, extractRecipientAddress, isValidSolanaAddress } from '../services/core';
import { UserContact, User } from '../types';
import { colors } from '../theme';
import { styles } from './ContactsList.styles';
import { logger } from '../services/core';
import Avatar from './shared/Avatar';
import { getWalletAddressStatus } from '../utils/crypto/wallet';
import { useRealtimeUserSearch } from '../hooks/useRealtimeUserSearch';

interface ContactsListProps {
  onContactSelect: (contact: UserContact) => void;
  onAddContact?: (user: User) => void; // Callback for notification only, not for actual adding
  showAddButton?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  activeTab?: 'All' | 'Favorite' | 'Search';
  onTabChange?: (tab: 'All' | 'Favorite' | 'Search') => void;
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
  showTabs = true,
  activeTab = 'All',
  onTabChange,
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
  const { state } = useApp();
  const { currentUser } = state;

  // Use the new hooks for contact management
  const { contacts, loading, refreshContacts } = useContacts();
  const { addContact, isUserAlreadyContact, toggleFavorite: toggleFavoriteAction } = useContactActions();

  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

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
  const filteredContacts = useMemo(() => {
    if (__DEV__) {
      logger.debug('Filtering contacts', { 
        contactsCount: contacts.length, 
        activeTab, 
        searchQuery: searchQuery.trim() 
      }, 'ContactsList');
    }
    
    let filtered = [...contacts];

    if (activeTab === 'All') {
      // Show all contacts in All tab
      if (searchQuery.trim() !== '') {
        const queryLower = searchQuery.toLowerCase();
        filtered = filtered.filter(contact =>
          (contact.wallet_address && contact.wallet_address.toLowerCase().includes(queryLower)) ||
          (contact.name && contact.name.toLowerCase().includes(queryLower)) ||
          (contact.email && contact.email.toLowerCase().includes(queryLower))
        );
      }
    } else if (activeTab === 'Favorite') {
      // Show only favorite contacts
      filtered = filtered.filter(contact => contact.isFavorite);
      // Apply search filter to favorites
      if (searchQuery.trim() !== '') {
        const queryLower = searchQuery.toLowerCase();
        filtered = filtered.filter(contact =>
          (contact.wallet_address && contact.wallet_address.toLowerCase().includes(queryLower)) ||
          (contact.name && contact.name.toLowerCase().includes(queryLower)) ||
          (contact.email && contact.email.toLowerCase().includes(queryLower))
        );
      }
    }

    return filtered;
  }, [searchQuery, contacts, activeTab]);

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
      console.error('❌ Error searching users:', error);
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

  // Debounced search with proper cleanup - only depend on searchQuery and activeTab
  useEffect(() => {
    if (__DEV__) {
      logger.debug('Search effect triggered', { activeTab, searchQuery: searchQuery.trim() }, 'ContactsList');
    }
    
    if (searchQuery.trim() && searchQuery.length >= 2) {
      if (__DEV__) {
        logger.debug('Setting up real-time search for', { searchQuery }, 'ContactsList');
      }
      
      // Subscribe to real-time search using ref
      subscribeRealtimeSearchRef.current(searchQuery);
      
      // Also run traditional search as fallback using ref
      handleUserSearchRef.current(searchQuery);
    } else {
      setSearchResults([]);
      clearRealtimeResultsRef.current();
      unsubscribeRealtimeSearchRef.current();
    }
    
    // Cleanup function for all cases
    return () => {
      unsubscribeRealtimeSearchRef.current();
      clearRealtimeResultsRef.current();
    };
  }, [searchQuery, activeTab]); // Only depend on searchQuery and activeTab

  // Cleanup on unmount - use refs to avoid dependency issues
  useEffect(() => {
    const addingRef = addingContactsRef.current;
    const togglingRef = togglingFavoritesRef.current;
    
    return () => {
      unsubscribeRealtimeSearch();
      clearRealtimeResults();
      // Clear any ongoing operations using refs captured in closure
      if (addingRef) {
        addingRef.clear();
      }
      if (togglingRef) {
        togglingRef.clear();
      }
    };
  }, [unsubscribeRealtimeSearch, clearRealtimeResults]);

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
      console.error('❌ Error adding contact:', error);
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
    // Normalize IDs to strings for comparison (contactId can be number or string, c.id can be number or string)
    const contact = contacts.find(c => String(c.id) === contactIdStr);
    if (!contact) {
      logger.warn('Contact not found for favorite toggle', { 
        contactId, 
        contactIdStr,
        contactsCount: contacts.length,
        contactIds: contacts.map(c => ({ id: c.id, idType: typeof c.id }))
      }, 'ContactsList');
      Alert.alert('Error', 'Contact not found');
      return;
    }

    const newFavoriteStatus = !contact.isFavorite;

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
      console.error('❌ Error toggling favorite:', error);
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
      console.error('Error processing QR code:', error);
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

  // Animation function for tab changes
  const animateTabChange = (callback: () => void) => {
    if (isAnimating) {return;}
    
    setIsAnimating(true);
    
    // Fade out and slide out current content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Execute the callback (tab change)
      callback();
      
      // Reset slide position
      slideAnim.setValue(20);
      
      // Fade in and slide in new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    });
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

    return (
      <TouchableOpacity
        key={`${section}-${item.id}`}
        style={[styles.contactRow, isSelected && styles.contactRowSelected]}
        onPress={() => onContactSelect(item)}
      >
        <Avatar
          userId={item.id.toString()}
          userName={item.name}
          size={50}
          avatarUrl={item.avatar}
          style={styles.avatar}
        />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.name || formatWalletAddress(item.wallet_address)}
        </Text>
        <View>
          <Text style={styles.contactEmail}>
            {item.wallet_address ? formatWalletAddress(item.wallet_address) : (item.email || '')}
            {('mutual_groups_count' in item && typeof (item as { mutual_groups_count?: number }).mutual_groups_count === 'number' && (item as { mutual_groups_count: number }).mutual_groups_count > 0) && (
              <Text style={styles.mutualGroupsText}> • {(item as { mutual_groups_count: number }).mutual_groups_count} splits</Text>
            )}
          </Text>
          {(() => {
            const walletStatus = getWalletAddressStatus(item.wallet_address);
            if (walletStatus.status !== 'valid') {
              return (
                <Text style={[styles.contactEmail, { color: walletStatus.color, fontSize: 11, marginTop: 2 }]}>
                  ⚠️ {walletStatus.displayText}
                </Text>
              );
            }
            return null;
          })()}
          {/*{item.email && item.wallet_address && (
            <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
              {item.email}
            </Text>
          )}*/}
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
          onPress={() => toggleFavorite(item.id)}
        >
          <Icon
            name="star"
            size={16}
            color={item.isFavorite ? colors.brandGreen : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading contacts...</Text>
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
          {/* Tabs All/Favorite/Search (design arrondi/fond) */}
          {showTabs && (
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => animateTabChange(() => onTabChange?.('All'))}
                disabled={isAnimating}
              >
                {activeTab === 'All' ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text style={styles.tabTextActive}>All</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.tabText}>All</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => animateTabChange(() => onTabChange?.('Favorite'))}
                disabled={isAnimating}
              >
                {activeTab === 'Favorite' ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text style={styles.tabTextActive}>Favorite</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.tabText}>Favorite</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => animateTabChange(() => onTabChange?.('Search'))}
                disabled={isAnimating}
              >
                {activeTab === 'Search' ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabGradient}
                  >
                    <Text style={styles.tabTextActive}>Search</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.tabText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {/* Search Input */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <Input
                placeholder={activeTab === 'Search' ? "Search users by name or wallet address" : placeholder}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                leftIcon="MagnifyingGlass"
                containerStyle={{ marginBottom: 0 }}
                
                autoFocus={activeTab === 'Search'}
              />
            </View>
          )}
          {/* Content */}
          <Animated.View 
            style={[
              styles.animatedContentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <ScrollView
              style={styles.contactsScrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.brandGreen}
                  colors={[colors.brandGreen]}
                />
              }
            >
            {/* All Tab Content */}
            {activeTab === 'All' && !searchQuery.trim() && (
              <>
                {/* Liste simple de tous les contacts filtrés */}
                {filteredContacts.length > 0 && (
                  <View style={styles.sectionContainer}>
                    {filteredContacts.map(contact => renderContact(contact, 'all'))}
                  </View>
                )}
              </>
            )}
            {/* Favorite Tab Content */}
            {activeTab === 'Favorite' && !searchQuery.trim() && (
              <>
                {/* Liste simple des contacts favoris */}
                {filteredContacts.length > 0 && (
                  <View style={styles.sectionContainer}>
                    {filteredContacts.map(contact => renderContact(contact, 'favorite'))}
                  </View>
                )}
              </>
            )}
            {/* Search Results */}
            {searchQuery.trim() && searchQuery.length >= 2 && (
              <>
                {isSearching && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Searching users...</Text>
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
                                <Text style={[styles.contactEmail, { fontSize: 11, marginTop: 2, color: colors.brandGreen }]}>
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
                                  color={colors.brandGreen}
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
                                    color={isAddingContact === Number(user.id) ? colors.brandGreen : colors.brandGreen}
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
            )}
            {/* Empty State */}
            {filteredContacts.length === 0 && (activeTab === 'All' || activeTab === 'Favorite') && (
              <View style={styles.emptyContainer}>
                <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() !== ''
                    ? 'No contacts found matching your search'
                    : activeTab === 'Favorite'
                      ? 'No favorite contacts yet'
                      : 'No contacts available'}
                </Text>
              </View>
            )}
            </ScrollView>
          </Animated.View>
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