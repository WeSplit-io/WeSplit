import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../../components/shared/NavBar';
import ContactsList from '../../components/ContactsList';
import QrCodeView, { QrCodeViewProps } from '../../services/core/QrCodeView';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useContactActions } from '../../hooks';
import { UserContact, User } from '../../types';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { logger } from '../../services/analytics/loggingService';
import { createUsdcRequestUri } from '../../services/core/solanaPay';
import { Container } from '../../components/shared';
import { Button } from '../../components/shared';
import Header from '../../components/shared/Header';
import Tabs, { Tab } from '../../components/shared/Tabs';

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

  // Note: This callback is called AFTER ContactsList has already added the contact
  // It's for notification/UI updates only, not for the actual adding logic
  const handleAddContact = async (user: User) => {
    // This is just a notification callback - the actual adding is done in ContactsList
    // We can use this to show success messages or update UI if needed
    logger.info('Contact addition callback received', { name: user.name }, 'ContactsScreen');
    // No need to call addContact here - ContactsList already did it
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
      <Header 
        title={getHeaderTitle()}
        onBackPress={() => navigation.goBack()}
        showBackButton={isSplitMode || isRequestMode}
      />

      {/* Request Mode Tabs */}
      {isRequestMode && (
        <Tabs
          tabs={[
            { label: 'Contacts', value: 'Contacts' },
            { label: 'Show QR code', value: 'Show QR code' }
          ]}
          activeTab={requestActiveTab}
          onTabChange={(tab) => handleRequestTabChange(tab as 'Contacts' | 'Show QR code')}
        />
      )}

      <View style={[styles.content, (isSplitMode || isRequestMode) && styles.contentWithButton]}>
        {isRequestMode && requestActiveTab === 'Show QR code' ? (
          <View style={styles.content}>
            {address ? (
              <QrCodeView
                value={createUsdcRequestUri({ 
                  recipient: address, 
                  label: currentUser?.name || 'User' 
                })}
                size={300}
              />
            ) : (
              <View style={styles.content}>
                <Text style={{ color: colors.textLight, textAlign: 'center', marginBottom: 10 }}>No wallet address available</Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Please connect a wallet to generate QR code</Text>
              </View>
            )}
          </View>
        ) : (
          <ContactsList
            onContactSelect={handleSelectContact}
            onAddContact={handleAddContact}
            showAddButton={true}
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
          <Button
            title={selectedContacts.length === 0 
              ? 'Invite' 
              : `Invite ${selectedContacts.length} ${selectedContacts.length === 1 ? 'Contact' : 'Contacts'}`
            }
            onPress={handleInviteContacts}
            variant="primary"
            disabled={isInviting || selectedContacts.length === 0}
            loading={isInviting}
            fullWidth={true}
            style={styles.inviteButton}
          />
        </View>
      )}
      
      {!isSplitMode && <NavBar currentRoute="Contacts" navigation={navigation} />}
    </Container>
  );
};

export default ContactsScreen; 