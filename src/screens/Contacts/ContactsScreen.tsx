import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import NavBar from '../../components/NavBar';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import { styles } from './styles';

interface ContactsScreenProps {
  navigation: any;
  route: any;
}

const ContactsScreen: React.FC<ContactsScreenProps> = ({ navigation, route }) => {
  const { action, onContactSelect, splitId, splitName, returnRoute } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Favorite' | 'Search'>('All');

  const handleSelectContact = (contact: UserContact) => {
    if (action === 'send' && onContactSelect) {
      // If we're in send mode, call the callback
      onContactSelect(contact);
    } else if (action === 'split') {
      // If we're in split mode, navigate back with the selected contact
      if (returnRoute) {
        navigation.navigate(returnRoute, {
          selectedContact: contact,
          splitId: splitId,
          splitName: splitName,
        });
      } else {
        navigation.goBack();
      }
    } else {
      // Navigate to the new ContactAction screen with toggle
      navigation.navigate('ContactAction', { selectedContact: contact });
    }
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

  const getHeaderTitle = () => {
    if (action === 'send') {
      return 'Select Contact';
    } else if (action === 'split') {
      return 'Add to Split';
    }
    return 'Contacts';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ContactsList
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
      
      <NavBar currentRoute="Contacts" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ContactsScreen; 