import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Header } from '../../components/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useContactActions } from '../../hooks';
import QrCodeView from '../../services/core/QrCodeView';
import { styles } from './styles';
import { colors } from '../../theme/colors';
import { User } from '../../types';
import { createUsdcRequestUri } from '../../services/core/solanaPay';
import { logger } from '../../services/core';
import { Container } from '../../components/shared';

const RequestContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params || {};
  const { state } = useApp();
  const { address } = useWallet();
  const { currentUser } = state;
  const { addContact } = useContactActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Contacts' | 'Show QR code'>('Contacts');
  const [contactsActiveTab, setContactsActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');

  // Handle contact selection
  const handleSelectContact = (contact: any) => {
    navigation.navigate('RequestAmount', {
      contact: contact,
      groupId,
    });
  };

  // Handle adding contact
  const handleAddContact = async (user: User) => {
    const result = await addContact(user);
    
    if (result.success) {
      logger.info('Contact added successfully', { userName: user.name }, 'RequestContactsScreen');
    } else {
      logger.error('Failed to add contact', { error: result.error }, 'RequestContactsScreen');
      console.error('❌ Error adding contact:', result.error);
    }
  };

  // Tab change handler
  const handleTabChange = (tab: 'Contacts' | 'Show QR code') => {
    setActiveTab(tab);
  };

  // Contacts list tab change handler
  const handleContactsTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setContactsActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  // Generate Solana Pay URI for receiving money
  const sendQRCode = createUsdcRequestUri({
    recipient: currentUser?.wallet_address || '',
    label: 'WeSplit Payment',
    message: `Send USDC to ${currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}`
  });
  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';



  return (
    <Container>
      {/* Header */}
      <Header
        title="Request"
        onBackPress={() => navigation.goBack()}
      />

      {/* Tabs - Hidden */}
      {/* <View style={styles.requestTabsContainer}>
        <TouchableOpacity
          style={[
            styles.requestTab,
            activeTab === 'Contacts' && styles.requestTabActive
          ]}
          onPress={() => handleTabChange('Contacts')}
        >
          <Text style={[
            styles.requestTabText,
            activeTab === 'Contacts' && styles.requestTabTextActive
          ]}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.requestTab,
            activeTab === 'Show QR code' && styles.requestTabActive
          ]}
          onPress={() => handleTabChange('Show QR code')}
        >
          <Text style={[
            styles.requestTabText,
            activeTab === 'Show QR code' && styles.requestTabTextActive
          ]}>Show QR code</Text>
        </TouchableOpacity>
      </View> */}

      {/* Tab Content */}
      {activeTab === 'Contacts' ? (
        <View style={styles.content}>
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
            hideToggleBar={true} // HIDE TOGGLE BAR ONLY ON THIS PAGE
          />
        </View>
      ) : (
                  <View style={styles.requestQRContainer}>
            <Text style={styles.requestQRTitle}>Show this QR code to your friend</Text>

            <View style={styles.requestQRCodeContent}>
              <View style={styles.requestQRCodeContainerWrapper}>
                <View style={styles.requestQRCodeContainer}>
                  {currentUser?.wallet_address ? (
                    <QrCodeView
                      value={currentUser?.wallet_address || ''}
                      address={currentUser?.wallet_address || ''}
                      useSolanaPay={true}
                      size={160}
                      backgroundColor={colors.white}
                      color={colors.black}
                      label="WeSplit Payment"
                      message={`Send USDC to ${userName}`}
                      showAddress={false}
                      showButtons={false}
                    />
                  ) : (
                    <View style={styles.requestQRCodePlaceholder}>
                      <Text style={styles.requestQRCodePlaceholderText}>No wallet address</Text>
                    </View>
                  )}
                </View>

              </View>
              <View style={styles.requestQRUserInfo}>
                <Text style={styles.requestQRUserName}>{userName}</Text>
                <Text style={styles.requestQRUserWallet}>{currentUser?.wallet_address ? `${currentUser.wallet_address.substring(0, 6)}...${currentUser.wallet_address.substring(currentUser.wallet_address.length - 6)}` : 'No wallet connected'}</Text>

              </View>

            </View>


          <TouchableOpacity style={styles.requestDoneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.requestDoneButtonText}>Done</Text>
          </TouchableOpacity>


        </View>


      )}
    </Container>
  );
};

export default RequestContactsScreen; 