import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { useApp } from '../context/AppContext';
import { useContacts, useContactActions } from '../hooks';
import { firebaseDataService } from '../services/firebaseDataService';
import { UserContact, User } from '../types';
import { colors } from '../theme';
import { styles } from './ContactsList.styles';
import { logger } from '../services/loggingService';
import UserAvatar from './UserAvatar';
import { formatWalletAddress } from '../utils/walletUtils';

export type ContactSelectorMode = 'select' | 'view' | 'add';
export type ContactSelectorAction = 'send' | 'request' | 'split' | 'group';

interface ContactSelectorProps {
  mode: ContactSelectorMode;
  action?: ContactSelectorAction;
  onSelect: (contact: UserContact) => void;
  multiSelect?: boolean;
  selectedContacts?: UserContact[];
  showAddButton?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  placeholder?: string;
  contextData?: any;
  onNavigateToSend?: (recipientWalletAddress: string, userName?: string) => void;
  onNavigateToTransfer?: (recipientWalletAddress: string, userName?: string) => void;
  groupId?: string;
}

/**
 * Unified ContactSelector component that consolidates contact selection logic
 * across different screens and use cases
 */
export const ContactSelector: React.FC<ContactSelectorProps> = ({
  mode,
  action,
  onSelect,
  multiSelect = false,
  selectedContacts = [],
  showAddButton = false,
  showSearch = true,
  showTabs = true,
  placeholder = "Search contacts",
  contextData,
  onNavigateToSend,
  onNavigateToTransfer,
  groupId
}) => {
  const { state } = useApp();
  const { currentUser } = state;

  // Use the new hooks for contact management
  const { contacts, loading, refreshContacts } = useContacts();
  const { addContact, isUserAlreadyContact } = useContactActions();

  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [refreshing, setRefreshing] = useState(false);

  // Filter contacts based on search and tab
  useEffect(() => {
    let filtered = [...contacts];

    if (activeTab === 'Favorite') {
      filtered = contacts.filter(contact => contact.isFavorite);
    }

    if (searchQuery.trim() && activeTab !== 'Search') {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, activeTab]);

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
    }
  }, [searchQuery, activeTab]);

  // Handle contact selection
  const handleContactSelect = (contact: UserContact) => {
    if (multiSelect) {
      // Handle multi-select logic
      const isAlreadySelected = selectedContacts.some(c => c.id === contact.id);
      if (isAlreadySelected) {
        // Remove from selection
        const newSelection = selectedContacts.filter(c => c.id !== contact.id);
        onSelect(contact); // Pass the updated selection back
      } else {
        // Add to selection
        onSelect(contact); // Pass the contact to be added
      }
    } else {
      // Single select
      onSelect(contact);
    }
  };

  // Handle adding contact
  const handleAddContact = async (user: User) => {
    if (!currentUser?.id) {return;}

    // Check if contact already exists
    if (isUserAlreadyContact(user, contacts)) {
      logger.warn('Contact already exists', { name: user.name }, 'ContactSelector');
      return;
    }

    setIsAddingContact(Number(user.id));

    try {
      const result = await addContact(user);

      if (result.success) {
        await refreshContacts();
        logger.info('Contact added successfully', { userName: user.name }, 'ContactSelector');
      } else {
        logger.error('Failed to add contact', { error: result.error }, 'ContactSelector');
        Alert.alert('Error', result.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    } finally {
      setIsAddingContact(null);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshContacts();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  // Split contacts into friends and others
  const friends = filteredContacts.filter(contact => contact.mutual_groups_count > 0);
  const others = filteredContacts.filter(contact => contact.mutual_groups_count === 0);

  // Render contact row
  const renderContactRow = (contact: UserContact, isSelected: boolean = false) => (
    <TouchableOpacity
      key={contact.id}
      style={[styles.contactRow, isSelected && styles.selectedContactRow]}
      onPress={() => handleContactSelect(contact)}
    >
      {multiSelect && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && (
              <Icon name="check" size={16} color={colors.black} />
            )}
          </View>
        </View>
      )}
      
      <UserAvatar
        userId={contact.id.toString()}
        userName={contact.name}
        size={40}
        avatarUrl={contact.avatar}
        style={styles.contactAvatar}
      />
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name || formatWalletAddress(contact.wallet_address)}</Text>
        <Text style={styles.contactEmail}>
          {contact.wallet_address ? formatWalletAddress(contact.wallet_address) : contact.email}
        </Text>
        {contact.email && contact.wallet_address && (
          <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
            {contact.email}
          </Text>
        )}
        {contact.mutual_groups_count > 0 && (
          <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2, color: colors.green }]}>
            {contact.mutual_groups_count} mutual group{contact.mutual_groups_count > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {showAddButton && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => {
            // Toggle favorite status
            // This would need to be implemented in the hook
          }}
        >
          <Icon
            name="star"
            size={20}
            color={contact.isFavorite ? "#A5EA15" : "#A89B9B"}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Render search result row
  const renderSearchResultRow = (user: User) => {
    const isAlreadyContact = contacts.some(contact =>
      String(contact.id) === String(user.id) ||
      contact.email === user.email ||
      contact.wallet_address === user.wallet_address
    );

    return (
      <TouchableOpacity
        key={user.id}
        style={styles.contactRow}
        onPress={() => !isAlreadyContact && handleAddContact(user)}
      >
        <UserAvatar
          userId={user.id.toString()}
          userName={user.name}
          size={40}
          avatarUrl={user.avatar}
          style={styles.contactAvatar}
        />
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{user.name || formatWalletAddress(user.wallet_address)}</Text>
          <Text style={styles.contactEmail}>
            {user.wallet_address ? formatWalletAddress(user.wallet_address) : user.email}
          </Text>
          {user.email && user.wallet_address && (
            <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
              {user.email}
            </Text>
          )}
        </View>

        {!isAlreadyContact ? (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleAddContact(user)}
            disabled={isAddingContact === Number(user.id)}
          >
            <Icon name="user-plus" size={20} color="#A5EA15" />
          </TouchableOpacity>
        ) : (
          <View style={styles.statusContainer}>
            <Icon name="check-circle" size={20} color="#A5EA15" />
          </View>
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
      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Image 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-icon-white50.png?alt=media&token=d90fd15d-40f6-4fe0-8990-c38881dc1e8a' }} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={colors.white50}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Tabs */}
      {showTabs && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'All' && styles.activeTab]}
            onPress={() => handleTabChange('All')}
          >
            <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Favorite' && styles.activeTab]}
            onPress={() => handleTabChange('Favorite')}
          >
            <Text style={[styles.tabText, activeTab === 'Favorite' && styles.activeTabText]}>Favorite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Search' && styles.activeTab]}
            onPress={() => handleTabChange('Search')}
          >
            <Text style={[styles.tabText, activeTab === 'Search' && styles.activeTabText]}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.white}
          />
        }
      >
        {/* Friends Section */}
        {friends.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Friends</Text>
            {friends.map((contact) => {
              const isSelected = selectedContacts.some(c => c.id === contact.id);
              return renderContactRow(contact, isSelected);
            })}
          </>
        )}

        {/* Others Section */}
        {others.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Others</Text>
            {others.map((contact) => {
              const isSelected = selectedContacts.some(c => c.id === contact.id);
              return renderContactRow(contact, isSelected);
            })}
          </>
        )}

        {/* Search Results Section */}
        {activeTab === 'Search' && (
          <>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Searching users...</Text>
              </View>
            )}

            {!isSearching && searchResults.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {searchResults.map((user) => renderSearchResultRow(user))}
              </>
            )}

            {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
              <View style={styles.noContactsContainer}>
                <Text style={styles.noContactsText}>No users found matching "{searchQuery}"</Text>
                <Text style={styles.noContactsSubtext}>Try searching with a different username or email</Text>
              </View>
            )}
          </>
        )}

        {/* No Contacts Message */}
        {filteredContacts.length === 0 && !loading && activeTab !== 'Search' && (
          <View style={styles.noContactsContainer}>
            <Text style={styles.noContactsText}>
              {searchQuery ? 'No contacts found matching your search' : 'No contacts available'}
            </Text>
            <Text style={styles.noContactsSubtext}>
              Users you've shared groups with will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
