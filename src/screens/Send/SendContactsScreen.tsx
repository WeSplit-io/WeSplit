import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { getUserContacts } from '../../services/groupService';
import { UserContact } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';

const SendContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  // Use the efficient hook for group data when groupId is provided
  const { 
    group, 
    loading: groupLoading 
  } = useGroupData(groupId);

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite'>('All');
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);

  useEffect(() => {
    loadContacts();
  }, [currentUser, group, groupId]);

  useEffect(() => {
    let filtered = [...contacts];
    
    if (activeTab === 'Favorite') {
      filtered = filtered.filter(contact => contact.isFavorite);
    }
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts, activeTab]);

  const loadContacts = async () => {
    if (!currentUser) {
      console.log('No current user found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
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
        setContacts(otherMembers);
      } else if (!groupId) {
        // Load all contacts from groups the user has been in
        const userContacts = await getUserContacts(String(currentUser.id));
        setContacts(userContacts);
      } else {
        // Group data is still loading or doesn't exist
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: UserContact) => {
    setSelectedContact(contact);
    // Auto-navigate to next screen when contact is selected
    navigation.navigate('SendAmount', {
      contact: contact,
      groupId,
    });
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

  const renderContact = (item: UserContact, section: 'friends' | 'others') => (
    <TouchableOpacity
      key={`${section}-${item.id}`}
      style={styles.mockupContactRow}
      onPress={() => handleSelectContact(item)}
    >
      <View style={styles.mockupAvatar}>
        <Text style={styles.mockupAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.mockupContactInfo}>
        <Text style={styles.mockupContactName}>{item.name}</Text>
        <Text style={styles.mockupContactEmail}>
          {formatWalletAddress(item.wallet_address)}
          {item.mutual_groups_count > 1 && (
            <Text style={styles.mutualGroupsText}> • {item.mutual_groups_count} groups</Text>
          )}
        </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'All' && styles.activeTab]}
            onPress={() => setActiveTab('All')}
          >
            <Text style={[styles.tabText, activeTab === 'All' && styles.activeTabText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Favorite' && styles.activeTab]}
            onPress={() => setActiveTab('Favorite')}
          >
            <Text style={[styles.tabText, activeTab === 'Favorite' && styles.activeTabText]}>
              Favorite
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.mockupSearchContainer}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.mockupSearchInput}
            placeholder="Search"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <ScrollView style={styles.contactsScrollView} showsVerticalScrollIndicator={false}>
            {/* Friends Section */}
            {(activeTab === 'All' && getFriends().length > 0) && (
              <View style={styles.sectionContainer}>
                <Text style={styles.mockupSectionTitle}>Friends</Text>
                {getFriends().map(contact => renderContact(contact, 'friends'))}
              </View>
            )}

            {/* Others Section */}
            {(activeTab === 'All' && getOthers().length > 0) && (
              <View style={styles.sectionContainer}>
                <Text style={styles.mockupSectionTitle}>Others</Text>
                {getOthers().map(contact => renderContact(contact, 'others'))}
              </View>
            )}

            {/* Favorites Only */}
            {activeTab === 'Favorite' && (
              <View style={styles.sectionContainer}>
                {getFriends().map(contact => renderContact(contact, 'friends'))}
              </View>
            )}

            {/* Empty State */}
            {filteredContacts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Icon name="users" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No contacts found' : activeTab === 'Favorite' ? 'No favorite contacts' : groupId ? 'No other group members' : 'No contacts available'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {!groupId && !searchQuery && 'Join groups to meet new contacts'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
      
      {/* Show NavBar only when accessed from People tab (no groupId) */}
      {!groupId && <NavBar currentRoute="SendContacts" navigation={navigation} />}
    </SafeAreaView>
  );
};

export default SendContactsScreen; 