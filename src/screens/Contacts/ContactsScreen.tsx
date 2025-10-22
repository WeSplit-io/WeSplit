import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../../components/NavBar';
import ContactsList from '../../components/ContactsList';
import { QrCodeView } from '@features/qr';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useContactActions } from '../../hooks';
import { UserContact, User } from '../../types';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { logger } from '../../services/loggingService';
import { createUsdcRequestUri } from '@features/qr';
import { Container } from '../../components/shared';

interface ContactsScreenProps {
  navigation: any;
  route: any;
}

const ContactsScreen: React.FC<ContactsScreenProps> = ({ navigation, route }) => {
  const { action, onContactSelect, splitId, splitName, returnRoute, currentSplitData, groupId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { address } = useWallet();
  const { addContact } = useContactActions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [selectedContacts, setSelectedContacts] = useState<UserContact[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  
  // For request mode - add QR code tab
  const [requestActiveTab, setRequestActiveTab] = useState<'Contacts' | 'Show QR code'>('Contacts');
  const [contactsActiveTab, setContactsActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');

  const handleSelectContact = (contact: UserContact) => {
    if (action === 'send' && onContactSelect) {
      // If we're in send mode, call the callback
      onContactSelect(contact);
    } else if (action === 'request') {
      // Navigate to RequestAmount screen
      navigation.navigate('RequestAmount', {
        contact: contact,
        groupId,
      });
    } else if (action === 'split') {
      // If we're in split mode, toggle contact selection for multiple selection
      setSelectedContacts(prev => {
        const isAlreadySelected = prev.some(c => c.id === contact.id);
        if (isAlreadySelected) {
          return prev.filter(c => c.id !== contact.id);
        } else {
          return [...prev, contact];
        }
      });
    } else {
      // Navigate to the new ContactAction screen with toggle
      navigation.navigate('ContactAction', { selectedContact: contact });
    }
  };

  const handleInviteContacts = () => {
    if (selectedContacts.length === 0) {return;}

    // Navigate back with all selected contacts
    if (returnRoute) {
      navigation.navigate(returnRoute, {
        selectedContacts: selectedContacts,
        splitId: splitId,
        splitName: splitName,
        // Pass back the current split data to preserve state
        currentSplitData: currentSplitData
      });
    } else {
      navigation.goBack();
    }
  };

  const handleAddContact = async (user: User) => {
    const result = await addContact(user);
    
    if (result.success) {
      logger.info('Contact added successfully', { name: user.name }, 'ContactsScreen');
    } else {
      logger.error('Failed to add contact', { error: result.error }, 'ContactsScreen');
      console.error('❌ Error adding contact:', result.error);
    }
  };

  const handleTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  // For request mode
  const handleRequestTabChange = (tab: 'Contacts' | 'Show QR code') => {
    setRequestActiveTab(tab);
  };

  const handleContactsTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setContactsActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  const getHeaderTitle = () => {
    if (action === 'send') {
      return 'Select Contact';
    } else if (action === 'request') {
      return 'Request Money';
    } else if (action === 'split') {
      return 'Add to Split';
    }
    return 'Contacts';
  };

  const isSplitMode = action === 'split';
  const isRequestMode = action === 'request';

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        {(isSplitMode || isRequestMode) ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image
              source={require('../../../assets/chevron-left.png')}
              style={styles.backIcon}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Request Mode Tabs */}
      {isRequestMode && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={styles.tab} onPress={() => handleRequestTabChange('Contacts')}>
            {requestActiveTab === 'Contacts' ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabActive}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>Contacts</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tab}>
                <Text style={styles.tabText}>Contacts</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => handleRequestTabChange('Show QR code')}>
            {requestActiveTab === 'Show QR code' ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tabActive}
              >
                <Text style={[styles.tabText, styles.tabTextActive]}>Show QR code</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tab}>
                <Text style={styles.tabText}>Show QR code</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.content, (isSplitMode || isRequestMode) && styles.contentWithButton]}>
        {isRequestMode && requestActiveTab === 'Show QR code' ? (
          <QrCodeView
            value={createUsdcRequestUri({ 
              recipient: address || '', 
              label: currentUser?.name || 'User' 
            })}
            size={300}
          />
        ) : (
          <ContactsList
            onContactSelect={handleSelectContact}
            onAddContact={handleAddContact}
            showAddButton={isSplitMode}
            showSearch={true}
            showTabs={!isRequestMode}
            activeTab={isRequestMode ? contactsActiveTab : activeTab}
            onTabChange={isRequestMode ? handleContactsTabChange : handleTabChange}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            placeholder="Search contacts"
            hideToggleBar={true}
            selectedContacts={isSplitMode ? selectedContacts : undefined}
            multiSelect={isSplitMode}
          />
        )}
      </View>

      {isSplitMode && (
        <View style={styles.inviteButtonContainer}>
          <TouchableOpacity
            style={[
              styles.inviteButton,
              selectedContacts.length === 0 && styles.inviteButtonDisabled
            ]}
            onPress={handleInviteContacts}
            disabled={isInviting || selectedContacts.length === 0}
          >
            <LinearGradient
              colors={selectedContacts.length === 0 
                ? [colors.darkGray, colors.darkGray] 
                : [colors.green, colors.greenLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.inviteButtonGradient}
            >
              {isInviting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[
                  styles.inviteButtonText,
                  selectedContacts.length === 0 && styles.inviteButtonTextDisabled
                ]}>
                  {selectedContacts.length === 0 
                    ? 'Invite' 
                    : `Invite ${selectedContacts.length} ${selectedContacts.length === 1 ? 'Contact' : 'Contacts'}`
                  }
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      {!isSplitMode && <NavBar currentRoute="Contacts" navigation={navigation} />}
    </Container>
  );
};

export default ContactsScreen; 