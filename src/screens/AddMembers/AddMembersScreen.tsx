import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, ActivityIndicator, Share } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { UserContact } from '../../types';
import { styles } from './styles';

const AddMembersScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, createGroup } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;
  const groupData = route.params?.groupData; // For creation flow
  const fromCreation = route.params?.fromCreation;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorite'>('all');
  const [inviteLink, setInviteLink] = useState<string>('');

  useEffect(() => {
    const initializeScreen = async () => {
      if (fromCreation && groupData) {
        // Handle creation flow with temporary group data
        setGroup({
          id: 'temp',
          name: groupData.name,
          icon: groupData.icon,
          color: groupData.color,
          description: groupData.description,
          member_count: 1,
          isTemporary: true
        });
        
        // Set current user as initial member
        setMembers([{
          id: currentUser?.id,
          name: currentUser?.name || 'You',
          email: currentUser?.email || '',
          wallet_address: currentUser?.wallet_address || '',
          joined_at: new Date().toISOString()
        }]);
      } else if (groupId) {
        // Handle existing group flow
        try {
          // Use hybrid service instead of direct service call
          const { hybridDataService } = await import('../../services/hybridDataService');
          const groupMembers = await hybridDataService.group.getGroupMembers(groupId);
          setMembers(groupMembers);
          
          setGroup({
            id: groupId,
            name: 'Group',
            member_count: groupMembers.length
          });
        } catch (err) {
          console.error('Error fetching group data:', err);
          setError('Failed to load group data');
        }
      }

      // Fetch user contacts for both flows
      if (currentUser?.id) {
        try {
          // Use hybrid service instead of direct service call
          const { hybridDataService } = await import('../../services/hybridDataService');
          const userContacts = await hybridDataService.group.getUserContacts(String(currentUser.id));
          setContacts(userContacts);
          setFilteredContacts(userContacts);
        } catch (err) {
          console.error('Error fetching contacts:', err);
          // Continue without contacts if this fails
        }
      }

      setLoading(false);
    };

    initializeScreen();
  }, [groupId, groupData, fromCreation, currentUser]);

  useEffect(() => {
    // Filter contacts based on search and tab
    let filtered = contacts;

    if (activeTab === 'favorite') {
      filtered = contacts.filter(contact => contact.isFavorite);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredContacts(filtered);
  }, [contacts, searchQuery, activeTab]);

  const handleContactToggle = (contactId: string | number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleCreateGroupAndInvite = async () => {
    if (!groupData || !currentUser?.id) {
      Alert.alert('Error', 'Missing group data or user information');
      return;
    }

    try {
      setIsCreating(true);
      
      const newGroupData = {
        name: groupData.name,
        description: groupData.description,
        category: 'general',
        currency: 'USDC',
        icon: groupData.icon,
        color: groupData.color,
        created_by: currentUser.id, // Use snake_case for hybrid service
      };

      const createdGroup = await createGroup(newGroupData);
      
      // If users are selected, send them invites
      if (selectedContacts.size > 0) {
        await sendInvitesToSelected(String(createdGroup.id));
      }
      
      // Navigate to success screen
      navigation.navigate('GroupCreated', { 
        groupId: createdGroup.id,
        groupName: groupData.name,
        groupIcon: groupData.icon,
        groupColor: groupData.color
      });
      
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const sendInvitesToSelected = async (targetGroupId: string) => {
    if (!currentUser?.id) return;

    try {
      // Generate invite link for the group using hybrid service
      const { hybridDataService } = await import('../../services/hybridDataService');
      const inviteData = await hybridDataService.group.generateInviteLink(targetGroupId, String(currentUser.id));
      
      // Prepare message for selected contacts
      const selectedContactsList = filteredContacts.filter(contact => 
        selectedContacts.has(contact.id)
      );
      
      const contactNames = selectedContactsList.map(c => c.name).join(', ');
      const message = `Join my WeSplit group "${group?.name}"!\n\nInvite code: ${inviteData.inviteCode}\n\nOr click this link: wesplit://join/${inviteData.inviteCode}`;
      
      // Show share sheet with native options
      await Share.share({
        message: message,
        title: `Join ${group?.name} on WeSplit`,
      });
      
      Alert.alert(
        'Invites Ready!', 
        `Share the invite with ${contactNames} using your preferred method.`
      );
      
    } catch (error) {
      console.error('Error sending invites:', error);
      Alert.alert('Error', 'Failed to generate invites. Please try again.');
    }
  };

  const handleInviteSelected = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Selection', 'Please select contacts to invite');
      return;
    }

    if (fromCreation) {
      await handleCreateGroupAndInvite();
    } else if (groupId) {
      await sendInvitesToSelected(groupId);
    }
  };

  const handleShareInviteLink = async () => {
    if (!currentUser?.id) return;

    try {
      const targetGroupId = fromCreation ? 'temp' : groupId;
      let shareMessage = '';
      
      if (fromCreation) {
        shareMessage = `Join my WeSplit group "${group?.name}"! I'll send you the invite link once it's created.`;
      } else {
        const { hybridDataService } = await import('../../services/hybridDataService');
        const inviteData = await hybridDataService.group.generateInviteLink(groupId!, String(currentUser.id));
        shareMessage = `Join my WeSplit group "${group?.name}"!\n\nInvite code: ${inviteData.inviteCode}\n\nOr click this link: wesplit://join/${inviteData.inviteCode}`;
      }
      
      await Share.share({
        message: shareMessage,
        title: `Join ${group?.name} on WeSplit`,
      });
      
    } catch (error) {
      console.error('Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to share invite link. Please try again.');
    }
  };

  // Split contacts into friends and others
  const friends = filteredContacts.filter(contact => contact.mutual_groups_count > 0);
  const others = filteredContacts.filter(contact => contact.mutual_groups_count === 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add new members</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#A89B9B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#A89B9B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'favorite' && styles.activeTab]}
          onPress={() => setActiveTab('favorite')}
        >
          <Text style={[styles.tabText, activeTab === 'favorite' && styles.activeTabText]}>Favorite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        {/* Share Link Option */}
        <TouchableOpacity style={styles.shareLinkButton} onPress={handleShareInviteLink}>
          <Icon name="share" size={20} color="#A5EA15" />
          <Text style={styles.shareLinkText}>Share Invite Link</Text>
          <Icon name="chevron-right" size={20} color="#A89B9B" />
        </TouchableOpacity>

        {/* Friends Section */}
        {friends.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Friends</Text>
            {friends.map((contact) => (
              <TouchableOpacity 
                key={contact.id} 
                style={styles.contactRow}
                onPress={() => handleContactToggle(contact.id)}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, selectedContacts.has(contact.id) && styles.checkboxSelected]}>
                    {selectedContacts.has(contact.id) && (
                      <Icon name="check" size={12} color="#212121" />
                    )}
                  </View>
                </View>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => {
                    // Toggle favorite status
                    const updatedContacts = contacts.map(c => 
                      c.id === contact.id ? { ...c, isFavorite: !c.isFavorite } : c
                    );
                    setContacts(updatedContacts);
                  }}
                >
                  <Icon 
                    name="star" 
                    size={20} 
                    color={contact.isFavorite ? "#A5EA15" : "#A89B9B"} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Others Section */}
        {others.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Others</Text>
            {others.map((contact) => (
              <TouchableOpacity 
                key={contact.id} 
                style={styles.contactRow}
                onPress={() => handleContactToggle(contact.id)}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, selectedContacts.has(contact.id) && styles.checkboxSelected]}>
                    {selectedContacts.has(contact.id) && (
                      <Icon name="check" size={12} color="#212121" />
                    )}
                  </View>
                </View>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactEmail}>{contact.email}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => {
                    // Toggle favorite status
                    const updatedContacts = contacts.map(c => 
                      c.id === contact.id ? { ...c, isFavorite: !c.isFavorite } : c
                    );
                    setContacts(updatedContacts);
                  }}
                >
                  <Icon 
                    name="star" 
                    size={20} 
                    color={contact.isFavorite ? "#A5EA15" : "#A89B9B"} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* No Contacts Message */}
        {filteredContacts.length === 0 && !loading && (
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

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.addButton, 
            (selectedContacts.size === 0 && !fromCreation) && styles.addButtonDisabled,
            isCreating && styles.addButtonDisabled
          ]}
          onPress={handleInviteSelected}
          disabled={(selectedContacts.size === 0 && !fromCreation) || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={styles.addButtonText}>
              {fromCreation 
                ? selectedContacts.size > 0 
                  ? `Create & Invite ${selectedContacts.size}` 
                  : 'Create Group'
                : selectedContacts.size > 0 
                  ? `Add ${selectedContacts.size}` 
                  : 'Add'
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddMembersScreen; 