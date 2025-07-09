import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { getGroupMembers, getUserContacts, UserContact } from '../../services/groupService';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme';
import { styles } from './styles';

const RequestContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { address } = useWallet();
  const { currentUser } = state;
  const { groupId, preselectedContact } = route.params || {};
  
  const [activeTab, setActiveTab] = useState<'Contact List' | 'Show QR code'>('Contact List');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UserContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(preselectedContact || null);
  const [loading, setLoading] = useState(true);

  // Get user's wallet address for QR code (same logic as DepositScreen)
  const userWalletAddress = currentUser?.wallet_address || 
                           currentUser?.walletAddress || 
                           address;
  
  useEffect(() => {
    loadContacts();
  }, [groupId, currentUser]);

  useEffect(() => {
    // Filter contacts based on search query 
    let filtered = [...contacts];
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    if (!currentUser) {
      console.log('No current user found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      if (groupId) {
        // Load group members
        const members = await getGroupMembers(groupId);
        // Filter out current user and convert to UserContact format
        const otherMembers = members.filter(member => 
          String(member.id) !== String(currentUser.id)
        ).map(member => ({
          ...member,
          first_met_at: member.joined_at,
          mutual_groups_count: 1,
          isFavorite: false // Default to false for group members
        }));
        setContacts(otherMembers);
      } else {
        // Load all contacts from groups the user has been in
        const userContacts = await getUserContacts(String(currentUser.id));
        setContacts(userContacts);
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
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.sendContactInfo}>
        <Text style={styles.sendContactName}>{item.name}</Text>
        <Text style={styles.sendContactWallet}>
          {formatWalletAddress(item.wallet_address)}
          {item.mutual_groups_count > 1 && (
            <Text style={styles.sendContactGroups}> • {item.mutual_groups_count} groups</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.sendContactStar}
        onPress={() => toggleFavorite(item.id)}
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
    <ScrollView style={styles.sendTabContent} showsVerticalScrollIndicator={false}>
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
      
      {loading && (
        <View style={styles.sendLoadingContainer}>
          <Text style={styles.sendLoadingText}>Loading contacts...</Text>
        </View>
      )}
      
      {!loading && filteredContacts.length === 0 && (
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