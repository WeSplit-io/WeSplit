import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import Icon from './Icon';
import { useApp } from '../context/AppContext';
import { useGroupData } from '../hooks/useGroupData';
import { firebaseDataService } from '../services/firebaseDataService';
import { UserContact, User } from '../types';
import { colors } from '../theme';
import { styles } from './ContactsList.styles';

interface ContactsListProps {
  groupId?: string;
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
  hideToggleBar?: boolean; // NEW PROP
}

const ContactsList: React.FC<ContactsListProps> = ({
  groupId,
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
  hideToggleBar = false, // NEW PROP
}) => {
  const { state } = useApp();
  const { currentUser } = state;

  // Use the efficient hook for group data when groupId is provided
  const {
    group,
    loading: groupLoading
  } = useGroupData(groupId ? Number(groupId) : null);

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState<number | null>(null);
  const [mode, setMode] = useState<'list' | 'qr'>('list');

  useEffect(() => {
    loadContacts();
  }, [currentUser, group, groupId]);

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
      setIsSearching(true);
      const results = await firebaseDataService.group.searchUsersByUsername(
        query.trim(),
        currentUser?.id ? String(currentUser.id) : undefined
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (activeTab === 'Search' && searchQuery.trim()) {
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

  const loadContacts = async () => {
    if (!currentUser) {
      console.log('No current user found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading contacts for user:', currentUser.id, 'groupId:', groupId);

      if (groupId && group?.members) {
        // Use cached group members from useGroupData hook
        const otherMembers = group.members.filter(member =>
          String(member.id) !== String(currentUser.id)
        ).map(member => ({
          ...member,
          first_met_at: member.joined_at,
          mutual_groups_count: 1,
          isFavorite: false // Default to false for group members
        }));
        console.log('📱 Loaded', otherMembers.length, 'group members');
        setContacts(otherMembers);
      } else {
        // Load contacts from both sources: groups and user's added contacts
        console.log('📱 Loading all user contacts...');

        // Get contacts from groups
        const groupContacts = await firebaseDataService.group.getUserContacts(currentUser.id.toString());

        // Get contacts from user's added contacts
        const addedContacts = await firebaseDataService.user.getUserContacts(currentUser.id.toString());

        // Combine and deduplicate contacts
        const contactsMap = new Map<string, UserContact>();
        const emailMap = new Map<string, UserContact>();
        const walletMap = new Map<string, UserContact>();

        // Add group contacts first
        groupContacts.forEach(contact => {
          const contactId = String(contact.id);
          contactsMap.set(contactId, contact);

          // Also track by email and wallet for deduplication
          if (contact.email) {
            emailMap.set(contact.email.toLowerCase(), contact);
          }
          if (contact.wallet_address) {
            walletMap.set(contact.wallet_address.toLowerCase(), contact);
          }
        });

        // Add or update with added contacts
        addedContacts.forEach(contact => {
          const contactId = String(contact.id);
          const contactEmail = contact.email?.toLowerCase();
          const contactWallet = contact.wallet_address?.toLowerCase();

          // Check for existing contact by ID, email, or wallet
          const existingById = contactsMap.get(contactId);
          const existingByEmail = contactEmail ? emailMap.get(contactEmail) : null;
          const existingByWallet = contactWallet ? walletMap.get(contactWallet) : null;

          if (existingById || existingByEmail || existingByWallet) {
            // Contact already exists, update favorite status if needed
            const existing = existingById || existingByEmail || existingByWallet;
            if (existing) {
              const existingId = String(existing.id);
              contactsMap.set(existingId, {
                ...existing,
                isFavorite: contact.isFavorite || existing.isFavorite
              });
            }
          } else {
            // This is a new contact that was manually added
            contactsMap.set(contactId, contact);

            // Track by email and wallet
            if (contactEmail) {
              emailMap.set(contactEmail, contact);
            }
            if (contactWallet) {
              walletMap.set(contactWallet, contact);
            }
          }
        });

        const allContacts = Array.from(contactsMap.values());

        console.log('📱 Loaded', allContacts.length, 'total contacts:', allContacts.map((c: UserContact) => ({
          name: c.name || 'No name',
          email: c.email,
          wallet: c.wallet_address ? formatWalletAddress(c.wallet_address) : 'No wallet',
          fullWallet: c.wallet_address,
          source: contactsMap.has(String(c.id)) ? 'combined' : 'unknown'
        })));

        setContacts(allContacts);
      }
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
      console.log('⚠️ Contact already exists:', user.name);
      return;
    }

    setIsAddingContact(Number(user.id));

    try {
      // Call the parent's onAddContact function
      await onAddContact(user);

      // Refresh contacts list
      await loadContacts();

      console.log('✅ Contact added successfully:', user.name);
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

  const renderContact = (item: UserContact, section: 'friends' | 'others' | 'all' | 'favorite') => (
    <TouchableOpacity
      key={`${section}-${item.id}`}
      style={styles.contactRow}
      onPress={() => onContactSelect(item)}
    >
      <View style={styles.avatar}>
        {item.avatar && item.avatar.trim() !== '' ? (
          <Image
            source={{ uri: item.avatar }}
            style={{ width: '100%', height: '100%', borderRadius: 999 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : formatWalletAddress(item.wallet_address).charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.name || formatWalletAddress(item.wallet_address)}
        </Text>
        <Text style={styles.contactEmail}>
          {item.wallet_address ? formatWalletAddress(item.wallet_address) : item.email}
          {item.mutual_groups_count > 1 && (
            <Text style={styles.mutualGroupsText}> • {item.mutual_groups_count} groups</Text>
          )}
        </Text>
        {item.email && item.wallet_address && (
          <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
            {item.email}
          </Text>
        )}
      </View>
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
    </TouchableOpacity>
  );

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
                style={[styles.tab, activeTab === 'All' && styles.tabActive]}
                onPress={() => onTabChange?.('All')}
              >
                <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'Favorite' && styles.tabActive]}
                onPress={() => onTabChange?.('Favorite')}
              >
                <Text style={[styles.tabText, activeTab === 'Favorite' && styles.tabTextActive]}>
                  Favorite
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'Search' && styles.tabActive]}
                onPress={() => onTabChange?.('Search')}
              >
                <Text style={[styles.tabText, activeTab === 'Search' && styles.tabTextActive]}>
                  Search
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Search Input */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <Image source={require('../../assets/search-icon-white50.png')} style={styles.searchIcon} />
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
          <ScrollView
            style={styles.contactsScrollView}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                    {searchResults.map((user) => (
                      <View key={`search-${user.id}`} style={styles.contactRow}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          onPress={() => onContactSelect({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            wallet_address: user.wallet_address,
                            wallet_public_key: user.wallet_public_key,
                            created_at: user.created_at,
                            joined_at: user.created_at,
                            first_met_at: user.created_at,
                            mutual_groups_count: 0,
                            isFavorite: false
                          })}
                        >
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {user.name ? user.name.charAt(0).toUpperCase() : formatWalletAddress(user.wallet_address).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>
                              {user.name || formatWalletAddress(user.wallet_address)}
                            </Text>
                            {user.email && user.wallet_address && (
                              <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
                                {user.email}
                              </Text>
                            )}
                            <Text style={styles.contactEmail}>
                              {user.wallet_address ? formatWalletAddress(user.wallet_address) : user.email}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {showAddButton && (
                          !isUserAlreadyContact(user) ? (
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
                        )}
                      </View>
                    ))}
                  </View>
                )}
                {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Image source={require('../../assets/search-empty-state.png')} style={styles.searchIconEmpty} />
                    <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
                  </View>
                )}
                {!isSearching && !searchQuery.trim() && (
                  <View style={styles.emptyContainer}>
                    <Image source={require('../../assets/search-empty-state.png')} style={styles.searchIconEmpty} />

                    <Text style={styles.emptyText}>Search users by username or email to add them to your contacts</Text>
                  </View>
                )}
              </>
            )}
            {/* Empty State */}
            {filteredContacts.length === 0 && (activeTab === 'All' || activeTab === 'Favorite') && (
              <View style={styles.emptyContainer}>
                <Image source={require('../../assets/search-empty-state.png')} style={styles.searchIconEmpty} />
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
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: 300, backgroundColor: colors.darkBackground, borderRadius: 16, margin: 16 }}>
          {/* TODO: Remplacer par composant caméra/QR code */}
          <Text style={{ color: colors.textLight, fontSize: 18 }}>[Camera QR Scanner Placeholder]</Text>
        </View>
      )}
    </View>
  );
};

export default ContactsList; 