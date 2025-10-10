import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NavBar from '../../components/NavBar';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import { colors } from '../../theme/colors';
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
  const [selectedContacts, setSelectedContacts] = useState<UserContact[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const handleSelectContact = (contact: UserContact) => {
    if (action === 'send' && onContactSelect) {
      // If we're in send mode, call the callback
      onContactSelect(contact);
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
    if (selectedContacts.length === 0) return;

    // Navigate back with all selected contacts
    if (returnRoute) {
      navigation.navigate(returnRoute, {
        selectedContacts: selectedContacts,
        splitId: splitId,
        splitName: splitName,
      });
    } else {
      navigation.goBack();
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

  const isSplitMode = action === 'split';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {isSplitMode ? (
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

      <View style={[styles.content, isSplitMode && styles.contentWithButton]}>
        <ContactsList
          onContactSelect={handleSelectContact}
          onAddContact={handleAddContact}
          showAddButton={isSplitMode}
          showSearch={true}
          showTabs={true}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          placeholder="Search contacts"
          hideToggleBar={true}
          selectedContacts={isSplitMode ? selectedContacts : undefined}
          multiSelect={isSplitMode}
        />
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
    </SafeAreaView>
  );
};

export default ContactsScreen; 