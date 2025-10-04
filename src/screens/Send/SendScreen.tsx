import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image, Alert } from 'react-native';
import NavBar from '../../components/NavBar';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { UserContact, User } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';

const SendScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId, initialTab } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    availableWallets, 
    appWalletBalance, 
    appWalletConnected,
    ensureAppWallet 
  } = useWallet();
  
  const [activeTab, setActiveTab] = useState<'friends' | 'external'>(initialTab || 'friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsTab, setContactsTab] = useState<'All' | 'Favorite' | 'Search'>('All');

  // Ensure app wallet is connected on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletConnected) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletConnected]);

  const handleSelectContact = (contact: UserContact) => {
    console.log('📱 SendScreen: Selected contact for sending:', {
      name: contact.name || 'No name',
      email: contact.email,
      wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact.wallet_address,
      id: contact.id
    });
    
    navigation.navigate('SendAmount', {
      destinationType: 'friend',
      contact: contact,
      groupId,
    });
  };

  const handleSelectWallet = (wallet: any) => {
    console.log('📱 SendScreen: Selected external wallet for sending:', {
      name: wallet.name,
      address: wallet.address,
      id: wallet.id
    });
    
    navigation.navigate('SendAmount', {
      destinationType: 'external',
      wallet: wallet,
      groupId,
    });
  };

  const handleAddContact = async (user: User) => {
    if (!currentUser?.id) return;
    
    try {
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
    setContactsTab(tab);
    if (tab !== 'Search') {
      setSearchQuery('');
    }
  };

  const handleConnectWallet = () => {
    navigation.navigate('LinkedCards', {
      onSuccess: () => {
        // Refresh the screen to show newly connected wallet
        console.log('External wallet connected successfully');
      }
    });
  };

  const handleScanQR = () => {
    // TODO: Implement QR scanner for wallet addresses
    Alert.alert('QR Scanner', 'QR scanner functionality will be implemented');
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderFriendsTab = () => (
    <ContactsList
      groupId={groupId}
      onContactSelect={handleSelectContact}
      onAddContact={handleAddContact}
      showAddButton={true}
      showSearch={true}
      showTabs={true}
      activeTab={contactsTab}
      onTabChange={handleTabChange}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      placeholder="Search contacts"
      hideToggleBar={true}
    />
  );

  const renderExternalWalletTab = () => {
    if (availableWallets.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <Image
              source={require('../../../assets/link-icon.png')}
              style={styles.emptyStateIconImage}
            />
          </View>
          <Text style={styles.emptyStateTitle}>No cards or wallets connected</Text>
          <Text style={styles.emptyStateSubtitle}>
          Link a card or wallet to start sending funds easily.
          </Text>
          <TouchableOpacity 
            style={styles.connectWalletButton}
            onPress={handleConnectWallet}
          >
            <Text style={styles.connectWalletButtonText}>Connect a wallet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.walletsList} showsVerticalScrollIndicator={false}>
        {availableWallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={styles.walletRow}
            onPress={() => handleSelectWallet(wallet)}
          >
            <View style={styles.walletIcon}>
              <Image
                source={require('../../../assets/link-icon.png')}
                style={styles.walletIconImage}
              />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletName}>{wallet.name}</Text>
              <Text style={styles.walletAddress}>
                {formatWalletAddress(wallet.address)}
              </Text>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={handleScanQR}
              >
                <Text style={styles.scanButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity 
          style={styles.addWalletButton}
          onPress={handleConnectWallet}
        >
          <Text style={styles.addWalletButtonText}>+ Add Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'external' && styles.activeTab]}
          onPress={() => setActiveTab('external')}
        >
          <Text style={[styles.tabText, activeTab === 'external' && styles.activeTabText]}>
            External Wallet
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'friends' ? renderFriendsTab() : renderExternalWalletTab()}
      </View>
      
      <NavBar currentRoute="Send" navigation={navigation} />
    </SafeAreaView>
  );
};

export default SendScreen;