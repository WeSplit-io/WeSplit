import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import NavBar from '../../components/shared/NavBar';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useContactActions } from '../../hooks';
import { walletService, LinkedWalletService } from '../../services/blockchain/wallet';
import { UserContact, User } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';
import { logger } from '../../services/analytics/loggingService';
import type { LinkedWallet } from '../../services/blockchain/wallet/LinkedWalletService';
import { Container, Button } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';

const SendScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    groupId, 
    initialTab,
    // Pre-filled data from notifications
    destinationType,
    contact,
    prefilledAmount,
    prefilledNote,
    requestId
  } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    availableWallets, 
    appWalletBalance, 
    appWalletConnected,
    ensureAppWallet 
  } = useWallet();
  const { addContact } = useContactActions();
  
  
  const [activeTab, setActiveTab] = useState<'friends' | 'external'>(initialTab || 'friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsTab, setContactsTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [linkedKastCards, setLinkedKastCards] = useState<LinkedWallet[]>([]);
  const [loadingLinkedDestinations, setLoadingLinkedDestinations] = useState(false);

  // Load linked destinations
  const loadLinkedDestinations = async () => {
    if (!currentUser?.id) {return;}
    
    setLoadingLinkedDestinations(true);
    try {
      logger.info('Loading linked destinations for user', { userId: currentUser.id }, 'SendScreen');
      
      // Get linked destinations from LinkedWalletService
      const linkedData = await LinkedWalletService.getLinkedDestinations(currentUser.id.toString());
      
      logger.info('Loaded linked destinations', {
        wallets: linkedData.externalWallets.length,
        cards: linkedData.kastCards.length
      });

      setLinkedWallets(linkedData.externalWallets);
      setLinkedKastCards(linkedData.kastCards);
    } catch (error) {
      console.error('❌ SendScreen: Error loading linked destinations:', error);
      setLinkedWallets([]);
      setLinkedKastCards([]);
    } finally {
      setLoadingLinkedDestinations(false);
    }
  };

  // Ensure app wallet is connected on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletConnected) {
      ensureAppWallet(currentUser.id?.toString() || '');
    }
  }, [currentUser?.id, appWalletConnected]);

  // Load linked destinations when component mounts or when external tab is selected
  useEffect(() => {
    if (currentUser?.id && activeTab === 'external') {
      loadLinkedDestinations();
    }
  }, [currentUser?.id, activeTab]);

  // Refresh linked destinations when screen comes into focus (e.g., returning from LinkedCards)
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id && activeTab === 'external') {
        loadLinkedDestinations();
      }
    }, [currentUser?.id, activeTab])
  );

  // Auto-navigate to SendAmount if we have pre-filled data from notification
  useEffect(() => {
    if (contact && prefilledAmount && currentUser?.id) {
      logger.info('Auto-navigating to SendAmount with pre-filled data from notification', {
        contactName: contact.name,
        prefilledAmount,
        prefilledNote,
        requestId
      }, 'SendScreen');
      
      // Navigate directly to SendAmount with pre-filled data
      navigation.navigate('SendAmount', {
        destinationType: destinationType || 'friend',
        contact: contact,
        groupId,
        prefilledAmount,
        prefilledNote,
        requestId
      });
    }
  }, [contact, prefilledAmount, currentUser?.id, navigation, destinationType, groupId, prefilledNote, requestId]);

  const handleSelectContact = (contact: UserContact) => {
    logger.info('Selected contact for sending', {
      name: contact.name || 'No name',
      email: contact.email,
      wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact.wallet_address,
      id: contact.id,
      avatar: contact.avatar,
      hasAvatar: !!contact.avatar
    });
    
    navigation.navigate('SendAmount', {
      destinationType: 'friend',
      contact: contact,
      groupId,
    });
  };

  const handleSelectWallet = (destination: LinkedWallet) => {
    logger.info('Selected external destination for sending', {
      name: destination.label,
      address: destination.address,
      id: destination.id,
      type: destination.type
    });
    
    navigation.navigate('SendAmount', {
      destinationType: 'external',
      wallet: destination, // Pass as 'wallet' parameter to match SendAmountScreen expectations
      groupId,
    });
  };

  const handleAddContact = async (user: User) => {
    const result = await addContact(user);
    
    if (result.success) {
      logger.info('Contact added successfully', { userName: user.name }, 'SendScreen');
    } else {
      logger.error('Failed to add contact', { error: result.error }, 'SendScreen');
      Alert.alert('Error', result.error || 'Failed to add contact');
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
        logger.info('External wallet connected successfully', null, 'SendScreen');
        loadLinkedDestinations(); // Reload linked destinations
      }
    });
  };

  const handleScanQR = () => {
    // TODO: Implement QR scanner for wallet addresses
    Alert.alert('QR Scanner', 'QR scanner functionality will be implemented');
  };

  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 10) {return address;}
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderFriendsTab = () => (
    <ContactsList
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
    // Combine linked wallets and KAST cards
    const allDestinations = [...linkedWallets, ...linkedKastCards];

    if (loadingLinkedDestinations) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>Loading linked destinations...</Text>
        </View>
      );
    }

    if (allDestinations.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <PhosphorIcon
              name="LinkBreak"
              size={38}
              color={colors.white}
              weight="regular"
            />
          </View>
          <Text style={styles.emptyStateTitle}>No cards or wallets connected</Text>
          <Text style={styles.emptyStateSubtitle}>
            Link a card or wallet to start sending funds easily.
          </Text>
          <Button
            title="Connect a wallet"
            onPress={handleConnectWallet}
            variant="primary"
            fullWidth={true}
          />
        </View>
      );
    }

    return (
      <ScrollView style={styles.walletsList} showsVerticalScrollIndicator={false}>
        {allDestinations.map((destination) => {
          const isKastCard = 'identifier' in destination;
          
          return (
            <TouchableOpacity
              key={destination.id}
              style={styles.walletRow}
              onPress={() => handleSelectWallet(destination)}
            >
              {isKastCard ? (
                <Image
                  source={require('../../../assets/kast-logo.png')}
                  style={[styles.kastIcon]}
                />
              ) : (
                <View style={styles.walletIcon}>
                  <Image
                    source={require('../../../assets/wallet-icon-white.png')}
                    style={styles.walletIconImage}
                  />
                </View>
              )}
              <View style={styles.walletInfo}>
                <Text style={styles.walletName}>{destination.label}</Text>
                <Text style={styles.walletAddress}>
                  {formatWalletAddress(destination.address || '')}
                </Text>
                {isKastCard && (
                  <Text style={{ color: colors.primaryGreen, fontSize: 12, fontWeight: '500' }}>KAST Card</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        
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
    <Container>
      {/* Header */}
      <Header 
        title="Send"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
          {activeTab === 'friends' ? (
            <View style={styles.tabIndicatorContainer}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 2, width: '100%' }}
              />
            </View>
          ) : (
            <View style={styles.tabIndicatorPlaceholder} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'external' && styles.activeTab]}
          onPress={() => setActiveTab('external')}
        >
          <Text style={[styles.tabText, activeTab === 'external' && styles.activeTabText]}>
            External Wallet
          </Text>
          {activeTab === 'external' ? (
            <View style={styles.tabIndicatorContainer}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 2, width: '100%' }}
              />
            </View>
          ) : (
            <View style={styles.tabIndicatorPlaceholder} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'friends' ? renderFriendsTab() : renderExternalWalletTab()}
      </View>
      
    </Container>
  );
};

export default SendScreen;