import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ContactsList from '../../components/ContactsList';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { LinkedWalletService } from '../../services/blockchain/wallet/LinkedWalletService';
import { UserContact, User } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';
import { logger } from '../../services/analytics/loggingService';
import type { LinkedWallet } from '../../services/blockchain/wallet/LinkedWalletService';
import { Container, Button, Tabs } from '../../components/shared';
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
    appWalletConnected,
    ensureAppWallet 
  } = useWallet();
  
  
  const [activeTab, setActiveTab] = useState<'friends' | 'external'>(initialTab || 'friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsTab, setContactsTab] = useState<'All' | 'Favorite' | 'Search'>('All');
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [linkedKastCards, setLinkedKastCards] = useState<LinkedWallet[]>([]);
  const [loadingLinkedDestinations, setLoadingLinkedDestinations] = useState(false);

  // Load linked destinations
  const loadLinkedDestinations = useCallback(async () => {
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
  }, [currentUser?.id]);

  // Ensure app wallet is connected on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletConnected) {
      ensureAppWallet(currentUser.id?.toString() || '');
    }
  }, [currentUser?.id, appWalletConnected, ensureAppWallet]);

  // Load linked destinations when component mounts or when external tab is selected
  // Use useFocusEffect only to avoid duplicate calls
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id && activeTab === 'external') {
        loadLinkedDestinations();
      }
    }, [currentUser?.id, activeTab, loadLinkedDestinations])
  );

  // Auto-navigate to CentralizedTransaction if we have pre-filled data from notification
  useEffect(() => {
    if (contact && prefilledAmount && currentUser?.id) {
      logger.info('Auto-navigating to CentralizedTransaction with pre-filled data from notification', {
        contactName: contact.name,
        prefilledAmount,
        prefilledNote,
        requestId
      }, 'SendScreen');

      // Navigate directly to CentralizedTransaction with pre-filled data
      navigation.navigate('CentralizedTransaction', {
        context: 'send_1to1',
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

    navigation.navigate('CentralizedTransaction', {
      context: 'send_1to1',
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

    navigation.navigate('CentralizedTransaction', {
      context: 'send_1to1',
      destinationType: 'external',
      wallet: destination, // Pass as 'wallet' parameter to match CentralizedTransactionScreen expectations
      groupId,
    });
  };

  // Note: This callback is called AFTER ContactsList has already added the contact
  // It's for notification/UI updates only, not for the actual adding logic
  const handleAddContact = (user: User) => {
    // This is just a notification callback - the actual adding is done in ContactsList
    // We can use this to show success messages or update UI if needed
    logger.info('Contact addition callback received', { userName: user.name }, 'SendScreen');
    // No need to call addContact here - ContactsList already did it
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

  // const handleScanQR = () => {
  //   // TODO: Implement QR scanner for wallet addresses
  //   Alert.alert('QR Scanner', 'QR scanner functionality will be implemented');
  // };

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
          const isKastCard = destination.type === 'kast';
          
          return (
            <TouchableOpacity
              key={destination.id}
              style={styles.walletRow}
              onPress={() => handleSelectWallet(destination)}
            >
              {isKastCard ? (
                <Image
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }}
                  style={[styles.kastIcon]}
                />
              ) : (
                <View style={styles.walletIcon}>
                  <PhosphorIcon
                    name="Wallet"
                    size={24}
                    color={colors.white}
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
                  <Text style={{ color: colors.green, fontSize: 12, fontWeight: '500' }}>KAST Card</Text>
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
      <Tabs
        tabs={[
          { label: 'Friends', value: 'friends' },
          { label: 'External Wallet', value: 'external' }
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'friends' | 'external')}
        enableAnimation={true}
      />

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'friends' ? renderFriendsTab() : renderExternalWalletTab()}
      </View>
      
    </Container>
  );
};

export default SendScreen;