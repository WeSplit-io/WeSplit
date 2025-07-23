import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';

interface ContactsScreenProps {
  navigation: any;
  route: any;
}

const ContactsScreen: React.FC<ContactsScreenProps> = ({ navigation, route }) => {
  const { action, onContactSelect } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [currentUser]);

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
      const userContacts = await firebaseDataService.group.getUserContacts(currentUser.id.toString());
      console.log('📱 Contacts: Loaded contacts:', userContacts.length);
      setContacts(userContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: UserContact) => {
    console.log('📱 Contacts: Selected contact:', {
      name: contact.name || 'No name',
      email: contact.email,
      wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      id: contact.id
    });
    
    if (onContactSelect) {
      // If there's a callback function, call it with the selected contact
      onContactSelect(contact);
      navigation.goBack();
    } else {
      // Default behavior - navigate to send flow
      navigation.navigate('SendContacts', { selectedContact: contact });
    }
  };

  const handleTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
      setSearchResults([]);
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

  const renderContact = (item: UserContact, section: 'friends' | 'others') => (
    <TouchableOpacity
      key={`${section}-${item.id}`}
      style={styles.contactRow}
      onPress={() => handleSelectContact(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : formatWalletAddress(item.wallet_address).charAt(0).toUpperCase()}
        </Text>
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

  const getHeaderTitle = () => {
    if (action === 'send') return 'Send to Contact';
    if (action === 'request') return 'Request from Contact';
    return 'Contacts';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Search Input - only show for Search tab */}
        {activeTab === 'Search' && (
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by username or email"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          </View>
        )}
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'All' && styles.tabActive]}
            onPress={() => setActiveTab('All')}
          >
            <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Favorite' && styles.tabActive]}
            onPress={() => setActiveTab('Favorite')}
          >
            <Text style={[styles.tabText, activeTab === 'Favorite' && styles.tabTextActive]}>
              Favorite
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Search' && styles.tabActive]}
            onPress={() => setActiveTab('Search')}
          >
            <Text style={[styles.tabText, activeTab === 'Search' && styles.tabTextActive]}>
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.contactsScrollView} 
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* All Tab Content */}
            {activeTab === 'All' && (
              <>
                {/* Friends Section */}
                {getFriends().length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Friends</Text>
                    {getFriends().map(contact => renderContact(contact, 'friends'))}
                  </View>
                )}

                {/* Others Section */}
                {getOthers().length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Others</Text>
                    {getOthers().map(contact => renderContact(contact, 'others'))}
                  </View>
                )}
              </>
            )}

            {/* Favorite Tab Content */}
            {activeTab === 'Favorite' && (
              <>
                {/* Favorite Contacts Section */}
                {getFriends().length > 0 && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Favorite Contacts</Text>
                    {getFriends().map(contact => renderContact(contact, 'friends'))}
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
                      <TouchableOpacity
                        key={`search-${user.id}`}
                        style={styles.contactRow}
                        onPress={() => handleSelectContact({
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
                        <View style={styles.favoriteButton}>
                          <Icon 
                            name="user-plus" 
                            size={16} 
                            color={colors.brandGreen} 
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
                  </View>
                )}

                {!isSearching && !searchQuery.trim() && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Search for users by username or email</Text>
                  </View>
                )}
              </>
            )}

            {/* Empty State */}
            {filteredContacts.length === 0 && (activeTab === 'All' || activeTab === 'Favorite') && (
              <View style={styles.emptyContainer}>
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
        )}
      </View>
      
      <NavBar currentRoute="Contacts" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ContactsScreen; 