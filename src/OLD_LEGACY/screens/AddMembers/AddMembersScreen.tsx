import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User, GroupMember } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';
import UserAvatar from '../../components/UserAvatar';

// Utility function to generate dynamic avatar colors
const getAvatarColor = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ];
  
  if (!name) {return colors[0];}
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Utility function to format wallet address
const formatWalletAddress = (address: string): string => {
  if (!address) {return '';}
  if (address.length <= 12) {return address;}
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
};

// Utility function to get display name
const getDisplayName = (contact: UserContact | User): string => {
  if (contact.name && contact.name.trim()) {
    return contact.name;
  }
  if (contact.wallet_address) {
    return formatWalletAddress(contact.wallet_address);
  }
  if (contact.email) {
    return contact.email.split('@')[0]; // Use email prefix as name
  }
  return 'Unknown';
};

// Utility function to get avatar text (unused - kept for potential future use)
// const getAvatarText = (contact: UserContact | User): string => {
//   const displayName = getDisplayName(contact);
//   return displayName.charAt(0).toUpperCase();
// };

// Utility function to render avatar
const renderAvatar = (contact: UserContact | User) => {
  const displayName = getDisplayName(contact);
  const avatarColor = getAvatarColor(displayName);

  return (
    <UserAvatar
      userId={contact.id.toString()}
      userName={displayName}
      size={40}
      avatarUrl={contact.avatar}
      style={[styles.contactAvatar, { borderColor: avatarColor }]}
      backgroundColor={avatarColor}
    />
  );
};

const AddMembersScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, createGroup } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;
  const groupData = route.params?.groupData; // For creation flow
  const fromCreation = route.params?.fromCreation;
  const openSearchTab = route.params?.openSearchTab;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorite' | 'search'>(openSearchTab ? 'search' : 'all');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    const initializeScreen = async () => {
      if (groupId) {
        // Handle existing group flow (both creation and existing groups)
        try {
          // Use hybrid service instead of direct service call
          const groupMembers = await firebaseDataService.group.getGroupMembers(groupId);
          setMembers(groupMembers);
          setGroupMembers(groupMembers);

          // For creation flow, we might not have full group details yet
          // So we'll set a basic group object
          setGroup({
            id: groupId,
            name: fromCreation ? 'New Group' : 'Group',
            member_count: groupMembers.length,
            isNewGroup: fromCreation
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
          const userContacts = await firebaseDataService.group.getUserContacts(String(currentUser.id));
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

    if (searchQuery.trim() && activeTab !== 'search') {
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
    if (activeTab === 'search' && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleUserSearch(searchQuery);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (activeTab === 'search') {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  // Check if a user is already in the group (member or invited)
  const isUserInGroup = (userId: string): boolean => {
    return groupMembers.some(member => 
      member.id === userId || (member as any).user_id === userId
    );
  };

  // Get the status of a user in the group
  const getUserGroupStatus = (userId: string): 'member' | 'invited' | 'not_in_group' => {
    const member = groupMembers.find(member => 
      member.id === userId || (member as any).user_id === userId
    );
    
    if (!member) {return 'not_in_group';}
    if (member.invitation_status === 'pending') {return 'invited';}
    return 'member';
  };

  const handleContactToggle = (contactId: string | number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleInviteSelected = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert('No Selection', 'Please select contacts to invite');
      return;
    }

    if (fromCreation && group?.isNewGroup) {
      // For new groups, send invites and then navigate to success
      await sendInvitesToSelected(groupId!);

      // Navigate to success screen
      navigation.navigate('GroupCreated', {
        groupId: groupId,
        groupName: group.name,
        groupIcon: 'briefcase', // Default icon
        groupColor: '#A5EA15' // Default color
      });
    } else if (groupId) {
      // For existing groups, just send invites
      await sendInvitesToSelected(groupId);
    }
  };

  const handleDoneWithoutMembers = () => {
    // Navigate to success screen without inviting anyone
    navigation.navigate('GroupCreated', {
      groupId: groupId,
      groupName: group?.name || 'New Group',
      groupIcon: 'briefcase', // Default icon
      groupColor: '#A5EA15' // Default color
    });
  };

  const sendInvitesToSelected = async (targetGroupId: string) => {
    if (!currentUser?.id) {return;}

    try {
      // Generate invite link for the group using hybrid service
      const inviteData = await firebaseDataService.group.generateInviteLink(targetGroupId, String(currentUser.id));

      // Prepare message for selected contacts
      const selectedContactsList = filteredContacts.filter(contact =>
        selectedContacts.has(contact.id)
      );

      const contactNames = selectedContactsList.map(c => c.name).join(', ');
      const message = `Join my WeSplit group "${group?.name}"!\n\nClick this link: ${inviteData.inviteLink}`;

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



  const handleInviteSearchedUser = async (user: User) => {
    if (!currentUser?.id || !group?.name) {
      Alert.alert('Error', 'Missing user or group information');
      return;
    }

    try {
      // Send invitation via notification
      await firebaseDataService.group.sendGroupInvitation(
        group.id,
        group.name,
        String(currentUser.id),
        currentUser.name || currentUser.email || 'Unknown User',
        String(user.id)
      );

      Alert.alert(
        'Invitation Sent!',
        `Invitation sent to ${user.name || user.email}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleShareInviteLink = async () => {
    if (!currentUser?.id || !groupId) {return;}

    try {
      const inviteData = await firebaseDataService.group.generateInviteLink(groupId, String(currentUser.id));
      const shareMessage = `Join my WeSplit group "${group?.name}"!\n\nClick this link: ${inviteData.inviteLink}`;

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
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add new members</Text>
        <TouchableOpacity onPress={handleShareInviteLink} style={styles.backButton}>
          <Icon name="share" size={20} color={colors.white} />
        </TouchableOpacity>

      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsearch-icon-white50.png?alt=media&token=d90fd15d-40f6-4fe0-8990-c38881dc1e8a' }} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.white50}
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>


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
                      <Icon name="check" size={16} color={colors.black} />
                    )}
                  </View>
                </View>
                {renderAvatar(contact)}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{getDisplayName(contact)}</Text>
                  <Text style={styles.contactEmail}>
                    {contact.wallet_address ? formatWalletAddress(contact.wallet_address) : contact.email}
                  </Text>
                  {contact.email && contact.wallet_address && (
                    <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
                      {contact.email}
                    </Text>
                  )}
                  {/*{contact.mutual_groups_count > 1 && (
                    <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2, color: colors.green }]}>
                      {contact.mutual_groups_count} mutual groups
                    </Text>
                  )}*/}
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
                {renderAvatar(contact)}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{getDisplayName(contact)}</Text>
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

        {/* Search Results Section */}
        {activeTab === 'search' && (
          <>
            {isSearching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#A5EA15" />
                <Text style={styles.loadingText}>Searching users...</Text>
              </View>
            )}

            {!isSearching && searchResults.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {searchResults.map((user) => {
                  const userStatus = getUserGroupStatus(String(user.id));
                  const isInGroup = isUserInGroup(String(user.id));
                  
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.contactRow}
                      onPress={() => !isInGroup && handleInviteSearchedUser(user)}
                    >
                      {renderAvatar(user)}
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{getDisplayName(user)}</Text>
                        <Text style={styles.contactEmail}>
                          {user.wallet_address ? formatWalletAddress(user.wallet_address) : user.email}
                        </Text>
                        {user.email && user.wallet_address && (
                          <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2 }]}>
                            {user.email}
                          </Text>
                        )}
                        {isInGroup && (
                          <Text style={[styles.contactEmail, { fontSize: 12, marginTop: 2, color: userStatus === 'invited' ? '#FFA500' : '#A5EA15' }]}>
                            {userStatus === 'invited' ? 'Invited' : 'Member'}
                          </Text>
                        )}
                      </View>
                      {!isInGroup ? (
                        <TouchableOpacity
                          style={styles.inviteButton}
                          onPress={() => handleInviteSearchedUser(user)}
                        >
                          <Icon name="user-plus" size={20} color="#A5EA15" />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.statusContainer}>
                          <Icon 
                            name={userStatus === 'invited' ? 'clock' : 'check-circle'} 
                            size={20} 
                            color={userStatus === 'invited' ? '#FFA500' : '#A5EA15'} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
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
        {filteredContacts.length === 0 && !loading && activeTab !== 'search' && (
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
          onPress={fromCreation && selectedContacts.size === 0 ? handleDoneWithoutMembers : handleInviteSelected}
          disabled={(selectedContacts.size === 0 && !fromCreation) || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#212121" />
          ) : (
            <Text style={styles.addButtonText}>
              {fromCreation
                ? selectedContacts.size > 0
                  ? `Add ${selectedContacts.size} `
                  : 'Done'
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