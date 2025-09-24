import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Image } from 'react-native';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { QrCodeView } from '@features/qr';
import { styles } from './styles';
import { colors } from '../../theme/colors';
import { firebaseDataService } from '../../services/firebaseDataService';
import { User } from '../../types';
import { generateSendLink } from '../../services/deepLinkHandler';

const RequestContactsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params || {};
  const { state } = useApp();
  const { address } = useWallet();
  const { currentUser } = state;

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
    if (!currentUser?.id) return;
    
    try {
      // Add the user to contacts
      await firebaseDataService.user.addContact(currentUser.id.toString(), {
        name: user.name,
        email: user.email,
        wallet_address: user.wallet_address,
        wallet_public_key: user.wallet_public_key,
        avatar: user.avatar || '',
        mutual_groups_count: 0,
        isFavorite: false
      });
      
      console.log('✅ Contact added successfully:', user.name);
    } catch (error) {
      console.error('❌ Error adding contact:', error);
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

  // Generate send QR code for receiving money
  const sendQRCode = generateSendLink(
    currentUser?.wallet_address || '',
    currentUser?.name || currentUser?.email?.split('@')[0] || 'User',
    currentUser?.email
  );
  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={{ width: 24, height: 24 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.requestTabsContainer}>
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
      </View>

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
                      value={sendQRCode}
                      size={160}
                      backgroundColor={colors.white}
                      color={colors.black}
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
    </SafeAreaView>
  );
};

export default RequestContactsScreen; 