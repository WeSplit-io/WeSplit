import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Image } from 'react-native';
import NavBar from '../../components/NavBar';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import { styles } from './styles';

const SendScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');

  const handleSelectContact = (contact: UserContact) => {
    // Debug logging to ensure contact data is passed correctly
    console.log('📱 SendScreen: Selected contact for sending:', {
      name: contact.name || 'No name',
      email: contact.email,
      wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact.wallet_address,
      id: contact.id
    });
    
    // Auto-navigate to next screen when contact is selected
    navigation.navigate('SendAmount', {
      contact: contact,
      groupId,
    });
  };

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

  const handleTabChange = (tab: 'All' | 'Favorite' | 'Search') => {
    setActiveTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ContactsList
          groupId={groupId}
          onContactSelect={handleSelectContact}
          onAddContact={handleAddContact}
          showAddButton={true}
          showSearch={true}
          showTabs={true}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          placeholder="Search contacts"
          hideToggleBar={true}
        />
      </View>
      
      <NavBar currentRoute="Send" navigation={navigation} />
    </SafeAreaView>
  );
};

export default SendScreen; 