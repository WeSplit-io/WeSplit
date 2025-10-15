import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert, Linking, Animated, RefreshControl } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { useApp } from '../context/AppContext';
import { firebaseDataService } from '../services/firebaseDataService';
import { TransactionBasedContactService } from '../services/transactionBasedContactService';
import { parseWeSplitDeepLink, handleJoinGroupDeepLink, handleAddContactFromProfile } from '../services/deepLinkHandler';
import { isSolanaPayUri, parseUri, extractRecipientAddress, isValidSolanaAddress } from '@features/qr';
import { UserContact, User } from '../types';
import { colors } from '../theme';
import { styles } from './ContactsList.styles';
import { logger } from '../services/loggingService';
import UserAvatar from './UserAvatar';
import { formatWalletAddress, getWalletAddressStatus } from '../utils/walletUtils';

interface ContactsListProps {
  onContactSelect: (contact: UserContact) => void;
  onAddContact?: (user: User) => void;
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
}) => {
  const { state } = useApp();
  const { currentUser } = state;

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState<number | null>(null);
  const [mode, setMode] = useState<'list' | 'qr'>('list');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [qrInputValue, setQrInputValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [currentUser]);

  // Add refresh functionality
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadContacts(true); // Force refresh
    } finally {
      setRefreshing(false);
    }
  };

  // Camera permissions are now handled by useCameraPermissions hook

  // Handle QR code scanning with real camera
  const handleQRScan = (data: { recipient: string; amount?: number; label?: string; message?: string }) => {
    // Process the scanned QR code data
    handleBarCodeScanned({ type: 'qr', data: data.recipient });
  };

  useEffect(() => {
    let filtered = [...contacts];

    if (activeTab === 'All') {
      // Show all contacts in All tab
      if (searchQuery.trim() !== '') {
        filtered = filtered.filter(contact =>
          (contact.wallet_address && contact.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    } else if (activeTab === 'Favorite') {
      // Show only favorite contacts
      filtered = filtered.filter(contact => contact.isFavorite);
      // Apply search filter to favorites
      if (searchQuery.trim() !== '') {
        filtered = filtered.filter(contact =>
          (contact.wallet_address && contact.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    setFilteredContacts(filtered);
  }, [searchQuery, contacts, activeTab]);

  // Handle user search
  const handleUserSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      logger.info('Starting user search for', { query }, 'ContactsList');
      setIsSearching(true);
      const results = await firebaseDataService.group.searchUsersByUsername(
        query.trim(),
        currentUser?.id ? String(currentUser.id) : undefined
      );
      logger.info('Search results received', { count: results.length, results: results.map(r => ({ name: r.name, email: r.email })) }, 'ContactsList');
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    logger.debug('Search effect triggered', { activeTab, searchQuery: searchQuery.trim() }, 'ContactsList');
    
    if (activeTab === 'Search' && searchQuery.trim()) {
      logger.debug('Setting up debounced search for', { searchQuery }, 'ContactsList');
      const timeoutId = setTimeout(() => {
        handleUserSearch(searchQuery);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (activeTab === 'Search') {
      setSearchResults([]);
    } else {
      // Clear search results when not in search tab
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const loadContacts = async (forceRefresh: boolean = false) => {
    if (!currentUser) {
      logger.warn('No current user found', null, 'ContactsList');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      logger.info('Loading contacts for user', { userId: currentUser.id, forceRefresh }, 'ContactsList');

      // Load contacts from transaction and split history
      logger.info('Loading transaction-based contacts', { userId: currentUser.id, forceRefresh }, 'ContactsList');

      const transactionBasedContacts = await TransactionBasedContactService.getTransactionBasedContacts(currentUser.id.toString());

      logger.info('Loaded transaction-based contacts', { 
        count: transactionBasedContacts.length, 
        contacts: transactionBasedContacts.map((c: UserContact) => ({
          name: c.name || 'No name',
          email: c.email,
          wallet: c.wallet_address ? formatWalletAddress(c.wallet_address) : 'No wallet',
          fullWallet: c.wallet_address,
          mutualSplits: c.mutual_groups_count || 0
        }))
      }, 'ContactsList');

      setContacts(transactionBasedContacts);
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (user: User) => {
    if (!currentUser?.id || !onAddContact) return;

    // Check if contact already exists
    const existingContact = contacts.find(contact =>
      String(contact.id) === String(user.id) ||
      contact.email === user.email ||
      contact.wallet_address === user.wallet_address
    );

    if (existingContact) {
      logger.warn('Contact already exists', { name: user.name }, 'ContactsList');
      return;
    }

    setIsAddingContact(Number(user.id));

    try {
      // Call the parent's onAddContact function
      await onAddContact(user);

      // Refresh contacts list
      await loadContacts();

      logger.info('Contact added successfully', { userName: user.name }, 'ContactsList');
    } catch (error) {
      console.error('❌ Error adding contact:', error);
    } finally {
      setIsAddingContact(null);
    }
  };

  const toggleFavorite = (contactId: number | string) => {
    setContacts(prev => prev.map(contact =>
      contact.id === contactId
        ? { ...contact, isFavorite: !contact.isFavorite }
        : contact
    ));
  };

  const getFriends = () => filteredContacts.filter(contact => contact.isFavorite);
  const getOthers = () => filteredContacts.filter(contact => !contact.isFavorite);

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const isUserAlreadyContact = (user: User) => {
    return contacts.some(contact =>
      String(contact.id) === String(user.id) ||
      contact.email === user.email ||
      contact.wallet_address === user.wallet_address
    );
  };

  // Handle QR code scanning
  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessingQR) return;
    
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
      const linkData = parseWeSplitDeepLink(data);
      
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
            const result = await handleAddContactFromProfile(linkData, currentUser.id.toString());
            if (result.success) {
              Alert.alert('Success', 'Contact added successfully!');
              // Refresh contacts list
              await loadContacts();
            } else {
              Alert.alert('Error', result.message || 'Failed to add contact.');
            }
          } catch (error) {
            console.error('Error adding contact from QR:', error);
            Alert.alert('Error', 'Failed to add contact. Please try again.');
          }
          break;
          
        case 'join':
          if (!currentUser?.id) {
            Alert.alert('Error', 'You must be logged in to join groups.');
            return;
          }
          
          try {
            const result = await handleJoinGroupDeepLink(linkData.inviteId!, currentUser.id.toString());
            if (result.success) {
              Alert.alert('Success', `Successfully joined group: ${result.groupName || 'Unknown Group'}`);
              // Refresh contacts list if we're in a group context
              if (groupId) {
                await loadContacts();
              }
            } else {
              Alert.alert('Error', result.message || 'Failed to join group.');
            }
          } catch (error) {
            console.error('Error joining group from QR:', error);
            Alert.alert('Error', 'Failed to join group. Please try again.');
          }
          break;
          
        case 'send':
          if (onNavigateToSend) {
            Alert.alert(
              'Send Money',
              `Redirect to send money to ${linkData.userName || 'this user'}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Send Money', 
                  onPress: () => {
                    onNavigateToSend(linkData.recipientWalletAddress!, linkData.userName);
                  }
                }
              ]
            );
          } else {
            Alert.alert('Send Money', `Send money to ${linkData.userName || 'this user'}? (Navigation not configured)`);
          }
          break;
          
        case 'transfer':
          if (onNavigateToTransfer) {
            Alert.alert(
              'External Transfer',
              `Transfer to ${linkData.userName || 'this user'} via external wallet?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Transfer', 
                  onPress: () => {
                    onNavigateToTransfer(linkData.recipientWalletAddress!, linkData.userName);
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
    if (isAnimating) return;
    
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
        <UserAvatar
          userId={item.id.toString()}
          userName={item.name}
          size={40}
          avatarUrl={item.avatar}
          style={styles.avatar}
          backgroundColor={colors.surface}
        />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.name || formatWalletAddress(item.wallet_address)}
        </Text>
        <View style={styles.contactDetails}>
          <Text style={styles.contactEmail}>
            {item.wallet_address ? formatWalletAddress(item.wallet_address) : item.email}
            {item.mutual_groups_count > 0 && (
              <Text style={styles.mutualGroupsText}> • {item.mutual_groups_count} splits</Text>
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
          {item.email && item.wallet_address && (
            <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
              {item.email}
            </Text>
          )}
        </View>
      </View>
      {multiSelect ? (
        <View style={styles.selectIndicator}>
          {isSelected ? (
            <View style={styles.addButton}>
              <Image source={require('../../assets/check-lg-linear.png')} style={styles.addButtonIcon} />
            </View>
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
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-icon-white50.png?alt=media&token=d90fd15d-40f6-4fe0-8990-c38881dc1e8a' }} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={activeTab === 'Search' ? "Search users by username or email" : placeholder}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
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
            {activeTab === 'All' && (
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
            {activeTab === 'Favorite' && (
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
            {activeTab === 'Search' && (
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
                      // Debug logging for search result user data
                      logger.debug('Search result user', {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar,
                        hasAvatar: !!user.avatar
                      });

                      const userAsContact: UserContact = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        wallet_address: user.wallet_address,
                        wallet_public_key: user.wallet_public_key,
                        created_at: user.created_at,
                        joined_at: user.created_at,
                        first_met_at: user.created_at,
                        avatar: user.avatar,
                        mutual_groups_count: 0,
                        isFavorite: false
                      };

                      const isSelected = multiSelect && selectedContacts.some(c => c.id === user.id);
                      const isAlreadyContact = isUserAlreadyContact(user);

                      return (
                        <TouchableOpacity
                          key={`search-${user.id}`}
                          style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                          onPress={() => onContactSelect(userAsContact)}
                        >
                          <UserAvatar
                            userId={user.id.toString()}
                            userName={user.name}
                            size={40}
                            avatarUrl={user.avatar}
                            style={styles.avatar}
                            backgroundColor={colors.surface}
                          />
                          <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>
                              {user.name || formatWalletAddress(user.wallet_address)}
                            </Text>
                            <View style={styles.contactDetails}>
                              <Text style={styles.contactEmail}>
                                {user.wallet_address ? formatWalletAddress(user.wallet_address) : user.email}
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
                              {user.email && user.wallet_address && (
                                <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
                                  {user.email}
                                </Text>
                              )}
                            </View>
                          </View>
                          {multiSelect ? (
                            <View style={styles.selectIndicator}>
                              {isSelected ? (
                                <View style={styles.addButton}>
                                  
                                  <Image source={require('../../assets/check-lg-linear.png')} style={styles.addButtonIcon} />
                                </View>
                              ) : (
                                <View style={styles.addButton}>
                                  <Text style={styles.addButtonText}>Add</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            showAddButton && (
                              !isAlreadyContact ? (
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
                              ) : (
                                <View style={styles.favoriteButton}>
                                  <Icon
                                    name="check"
                                    size={16}
                                    color={colors.brandGreen}
                                  />
                                </View>
                              )
                            )
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />
                    <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
                  </View>
                )}
                {!isSearching && !searchQuery.trim() && (
                  <View style={styles.emptyContainer}>
                    <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-empty-state.png?alt=media&token=9da88073-11df-4b69-bfd8-21ec369f51c4' }} style={styles.searchIconEmpty} />

                    <Text style={styles.emptyText}>Search users by username or email to add them to your contacts</Text>
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
                    logger.error('Error requesting camera permission', error, 'ContactsList');
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