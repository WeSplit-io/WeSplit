import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useGroupData } from '../../hooks/useGroupData';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme';
import { styles } from './styles';

const RequestContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { address } = useWallet();
  const { currentUser } = state;
  const { groupId, preselectedContact } = route.params || {};

  // Use the efficient hook for group data when groupId is provided
  const {
    group,
    loading: groupLoading
  } = useGroupData(groupId);

  const [activeTab, setActiveTab] = useState<'Contact List' | 'Show QR code'>('Contact List');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(preselectedContact || null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get user's wallet address for QR code (same logic as DepositScreen)
  const userWalletAddress = currentUser?.wallet_address ||
    address;

  useEffect(() => {
    loadContacts();
  }, [groupId, currentUser, group]);

  useEffect(() => {
    // Filter contacts based on search query 
    let filtered = [...contacts];

    if (searchQuery.trim() !== '' && activeTab === 'Contact List') {
      filtered = filtered.filter(contact =>
        (contact.wallet_address && contact.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (contact.name && contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
    if (activeTab === 'Contact List' && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleUserSearch(searchQuery);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (activeTab === 'Contact List') {
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
      } else if (!groupId) {
        // Load all contacts from groups the user has been in
        console.log('📱 Loading all user contacts...');
        const userContacts = await firebaseDataService.user.getUserContacts(String(currentUser.id));
        console.log('📱 Loaded', userContacts.length, 'user contacts:', userContacts.map((c: UserContact) => ({
          name: c.name || 'No name',
          email: c.email,
          wallet: c.wallet_address ? formatWalletAddress(c.wallet_address) : 'No wallet',
          fullWallet: c.wallet_address
        })));
        setContacts(userContacts);
      } else {
        // Group data is still loading or doesn't exist
        console.log('📱 Group data still loading, setting empty contacts');
        setContacts([]);
      }
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: UserContact) => {
    setSelectedContact(contact);
  };

  const handleContinue = () => {
    if (selectedContact && activeTab === 'Contact List') {
      navigation.navigate('RequestAmount', {
        contact: selectedContact,
        groupId,
      });
    }
  };

  const toggleFavorite = (contactId: number) => {
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

  const generateRequestLink = () => {
    const userId = currentUser?.id || 'user';
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
    return `https://wesplit.app/request/${userId}?name=${encodeURIComponent(userName)}`;
  };

  const renderContact = (item: UserContact, section: 'friends' | 'others') => (
    <TouchableOpacity
      key={`${section}-${item.id}`}
      style={[
        styles.sendContactRow,
        selectedContact?.id === item.id && styles.sendContactRowSelected,
      ]}
      onPress={() => handleSelectContact(item)}
    >
      <View style={styles.sendContactAvatar}>
        <Text style={styles.sendContactAvatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : formatWalletAddress(item.wallet_address).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.sendContactInfo}>
        <Text style={styles.sendContactName}>
          {item.name || formatWalletAddress(item.wallet_address)}
        </Text>
        <Text style={styles.sendContactWallet}>
          {item.wallet_address ? formatWalletAddress(item.wallet_address) : item.email}
          {item.mutual_groups_count > 1 && (
            <Text style={styles.sendContactGroups}> • {item.mutual_groups_count} groups</Text>
          )}
        </Text>
        {item.email && item.wallet_address && (
          <Text style={[styles.sendContactWallet, { fontSize: 12, marginTop: 2 }]}>
            {item.email}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.sendContactStar}
        onPress={() => toggleFavorite(Number(item.id))}
      >
        <Icon
          name="star"
          size={16}
          color={item.isFavorite ? colors.brandGreen : colors.textSecondary}
        />
      </TouchableOpacity>
      {selectedContact?.id === item.id && (
        <Icon name="check" size={20} color={colors.brandGreen} style={styles.sendContactCheck} />
      )}
    </TouchableOpacity>
  );

  const renderContactsSection = (title: string, sectionContacts: UserContact[], section: 'friends' | 'others') => {
    if (sectionContacts.length === 0) return null;

    return (
      <View style={styles.sendContactsSection}>
        <Text style={styles.sendContactsSectionTitle}>{title}</Text>
        {sectionContacts.map((contact) => renderContact(contact, section))}
      </View>
    );
  };

  const renderContactListTab = () => (
    <ScrollView
      style={styles.sendTabContent}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search */}
      <View style={styles.sendSearchContainer}>
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.sendSearchIcon} />
        <TextInput
          style={styles.sendSearchInput}
          placeholder="Search"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Contacts Sections */}
      {/* Friends Section */}
      {getFriends().length > 0 &&
        renderContactsSection('Friends', getFriends(), 'friends')
      }

      {/* Others Section */}
      {getOthers().length > 0 &&
        renderContactsSection('Others', getOthers(), 'others')
      }

      {/* Search Results Section */}
      {searchQuery.trim() && searchResults.length > 0 && (
        <>
          <Text style={styles.sendContactsSectionTitle}>Search Results</Text>
          {searchResults.map((user) => (
            <TouchableOpacity
              key={`search-${user.id}`}
              style={[
                styles.sendContactRow,
                selectedContact?.id === user.id && styles.sendContactRowSelected,
              ]}
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
              <View style={styles.sendContactAvatar}>
                <Text style={styles.sendContactAvatarText}>
                  {user.name ? user.name.charAt(0).toUpperCase() : formatWalletAddress(user.wallet_address).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sendContactInfo}>
                <Text style={styles.sendContactName}>
                  {user.name || formatWalletAddress(user.wallet_address)}
                </Text>

                {user.email && user.wallet_address && (
                  <Text style={[styles.sendContactWallet, { fontSize: 12, marginTop: 2 }]}>
                    {user.email}
                  </Text>
                )}
                <Text style={styles.sendContactWallet}>
                  {user.wallet_address ? formatWalletAddress(user.wallet_address) : user.email}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sendContactStar}
                onPress={() => {
                  // This would add to favorites if needed
                }}
              >
                <Icon
                  name="user-plus"
                  size={16}
                  color={colors.brandGreen}
                />
              </TouchableOpacity>
              {selectedContact?.id === user.id && (
                <Icon name="check" size={20} color={colors.brandGreen} style={styles.sendContactCheck} />
              )}
            </TouchableOpacity>
          ))}
        </>
      )}

      {loading && (
        <View style={styles.sendLoadingContainer}>
          <Text style={styles.sendLoadingText}>Loading contacts...</Text>
        </View>
      )}

      {!loading && filteredContacts.length === 0 && !searchQuery.trim() && (
        <View style={styles.sendEmptyContainer}>
          <Icon name="users" size={48} color={colors.textSecondary} />
          <Text style={styles.sendEmptyText}>
            {searchQuery ? 'No contacts found' : groupId ? 'No other group members' : 'No contacts available'}
          </Text>
          <Text style={styles.sendEmptySubtext}>
            {!groupId && !searchQuery && 'Join groups to meet new contacts'}
          </Text>
        </View>
      )}

      {!loading && searchQuery.trim() && searchResults.length === 0 && (
        <View style={styles.sendEmptyContainer}>
          <Icon name="search" size={48} color={colors.textSecondary} />
          <Text style={styles.sendEmptyText}>No users found matching "{searchQuery}"</Text>
          <Text style={styles.sendEmptySubtext}>Try searching with a different username or email</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderQRCodeTab = () => (
    <ScrollView style={styles.sendTabContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sendQRTabContainer}>
      <Text style={styles.sendQRCodeTitle}>Show QR code to your friend</Text>
      <View style={styles.sendQRCodeDisplay}>
        <View style={styles.sendQRCodeBox}>
          {userWalletAddress ? (
            <QRCode
              value={userWalletAddress}
              size={120}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          ) : (
            <View style={styles.sendQRErrorContainer}>
              <Icon name="alert-circle" size={60} color={colors.textSecondary} />
              <Text style={styles.sendQRErrorText}>No wallet address found</Text>
            </View>
          )}
        </View>
        <View style={styles.sendQRUserBadge}>
          <Text style={styles.sendQRUserBadgeText}>
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
      </View>
      <View style={styles.sendQRUserInfo}>
        <Text style={styles.sendQRUserName}>
          {currentUser?.name || currentUser?.email?.split('@')[0] || 'Unknown User'}
        </Text>
        <Text style={styles.sendQRUserWallet}>
          {userWalletAddress ?
            `${userWalletAddress.substring(0, 6)}...${userWalletAddress.substring(userWalletAddress.length - 6)}` :
            'No wallet connected'
          }
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.sendQRContinueButton,
          !userWalletAddress && styles.sendQRContinueButtonDisabled
        ]}
        disabled={!userWalletAddress}
      >
        <Text style={[
          styles.sendQRContinueButtonText,
          !userWalletAddress && styles.sendQRContinueButtonTextDisabled
        ]}>
          Continue
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const isAmountValid = selectedContact && activeTab === 'Contact List';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.sendTabsContainer}>
        <TouchableOpacity
          style={[
            styles.sendTab,
            activeTab === 'Contact List' && styles.sendTabActive,
          ]}
          onPress={() => setActiveTab('Contact List')}
        >
          <Text style={[
            styles.sendTabText,
            activeTab === 'Contact List' && styles.sendTabTextActive,
          ]}>
            Contact List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sendTab,
            activeTab === 'Show QR code' && styles.sendTabActive,
          ]}
          onPress={() => setActiveTab('Show QR code')}
        >
          <Text style={[
            styles.sendTabText,
            activeTab === 'Show QR code' && styles.sendTabTextActive,
          ]}>
            Show QR code
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.sendTabContentContainer}>
        {activeTab === 'Contact List' ? renderContactListTab() : renderQRCodeTab()}

        {/* Continue Button - only show for Contact List tab */}
        {activeTab === 'Contact List' && (
          <TouchableOpacity
            style={[
              styles.sendContinueButton,
              isAmountValid && styles.sendContinueButtonActive,
            ]}
            onPress={handleContinue}
            disabled={!isAmountValid}
          >
            <Text style={[
              styles.sendContinueButtonText,
              isAmountValid && styles.sendContinueButtonTextActive,
            ]}>
              Continue
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default RequestContactsScreen; 