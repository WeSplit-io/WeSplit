import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Header } from '../../components/shared';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { styles } from './styles';
import { User } from '../../types';
import { logger } from '../../services/analytics/loggingService';
import { Container, Tabs } from '../../components/shared';
import QrCodeView from '../../services/core/QrCodeView';
import { createUsdcRequestUri } from '../../services/core/solanaPay';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';

const RequestContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { address } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [contactsActiveTab, setContactsActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [requestActiveTab, setRequestActiveTab] = useState<'Contacts' | 'Show QR code'>('Contacts');

  // Handle contact selection
  const handleSelectContact = (contact: any) => {
    navigation.navigate('RequestAmount', {
      contact: contact,
      groupId,
    });
  };

  // Note: This callback is called AFTER ContactsList has already added the contact
  // It's for notification/UI updates only, not for the actual adding logic
  const handleAddContact = async (user: User) => {
    // This is just a notification callback - the actual adding is done in ContactsList
    // We can use this to show success messages or update UI if needed
    logger.info('Contact addition callback received', { userName: user.name }, 'RequestContactsScreen');
    // No need to call addContact here - ContactsList already did it
  };

  // Contacts list tab change handler
  const handleContactsTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setContactsActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  // Request tab change handler
  const handleRequestTabChange = (tab: 'Contacts' | 'Show QR code') => {
    setRequestActiveTab(tab);
  };

  return (
    <Container>
      {/* Header */}
      <Header
        title="Request"
        onBackPress={() => navigation.goBack()}
      />

      {/* Request Mode Tabs */}
      <Tabs
        tabs={[
          { label: 'Contacts', value: 'Contacts' },
          { label: 'Show QR code', value: 'Show QR code' }
        ]}
        activeTab={requestActiveTab}
        onTabChange={(tab) => handleRequestTabChange(tab as 'Contacts' | 'Show QR code')}
      />

      {/* Contacts List or QR Code */}
      <View style={styles.content}>
        {requestActiveTab === 'Show QR code' ? (
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
                <Text style={{ color: colors.white, textAlign: 'center', marginBottom: 10 }}>
                  No wallet address available
                </Text>
                <Text style={{ color: colors.white70, textAlign: 'center' }}>
                  Please connect a wallet to generate QR code
                </Text>
              </View>
            )}
          </View>
        ) : (
          <ContactsList
            groupId={groupId}
            onContactSelect={handleSelectContact}
            onAddContact={handleAddContact}
            showAddButton={true}
            showSearch={true}
            showTabs={true}
            activeTab={contactsActiveTab}
            onTabChange={handleContactsTabChange}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            placeholder="Search contacts"
            hideToggleBar={true}
          />
        )}
      </View>
    </Container>
  );
};

export default RequestContactsScreen; 