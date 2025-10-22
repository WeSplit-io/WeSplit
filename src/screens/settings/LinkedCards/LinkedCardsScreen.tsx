import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import { useWallet } from '../../../context/WalletContext';
import AddDestinationSheet from '../../../components/AddDestinationSheet';
import { LinkedWalletService, LinkedWallet } from '../../../services/wallet/LinkedWalletService';
import { styles } from './styles';
import { logger } from '../../../services/core';
import Header from '../../../components/shared/Header';
import { Container } from '../../../components/shared';

// Interfaces are now imported from the service

const LinkedCardsScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { availableWallets } = useWallet();
  
  const [externalWallets, setExternalWallets] = useState<LinkedWallet[]>([]);
  const [kastCards, setKastCards] = useState<LinkedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Load data on mount and when user changes
  useEffect(() => {
    if (currentUser?.id) {
      loadLinkedDestinations();
    } else {
      // If no current user, set loading to false to show empty state
      console.log('LinkedCardsScreen: No current user available');
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Refresh card information periodically
  useEffect(() => {
    if (kastCards.length > 0) {
      const interval = setInterval(async () => {
        try {
          const { ExternalCardService } = await import('../../../services/external/ExternalCardService');
          
          // Refresh each card's information
          for (const card of kastCards) {
            if (card.identifier) {
              const refreshResult = await ExternalCardService.refreshCardInfo(card.id);
              if (refreshResult.success && refreshResult.card) {
                // Update card information in state
                setKastCards(prev => prev.map(c => 
                  c.id === card.id 
                    ? { ...c, ...refreshResult.card, updatedAt: new Date().toISOString() }
                    : c
                ));
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing card information:', error);
        }
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [kastCards]);

  const loadLinkedDestinations = async () => {
    if (!currentUser?.id) {
      console.log('LinkedCardsScreen: No current user ID available');
      setIsLoading(false);
      return;
    }

    console.log('LinkedCardsScreen: Starting to load linked destinations for user:', currentUser.id);
    setIsLoading(true);
    try {
      logger.info('Loading linked destinations for user', { userId: currentUser.id }, 'LinkedCardsScreen');
      
      // Load from the linked wallets service
      // Get linked destinations from LinkedWalletService
      const linkedData = await LinkedWalletService.getLinkedDestinations(currentUser.id.toString());
      
      console.log('LinkedCardsScreen: Received linked data:', linkedData);
      logger.info('Loaded linked destinations', {
        wallets: linkedData.externalWallets.length,
        cards: linkedData.kastCards.length
      });

      setExternalWallets(linkedData.externalWallets);
      setKastCards(linkedData.kastCards);
    } catch (error) {
      console.error('❌ Error loading linked destinations:', error);
      Alert.alert('Error', 'Failed to load linked destinations');
    } finally {
      console.log('LinkedCardsScreen: Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleAddDestination = async (destination: any) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsAdding(true);
    try {
      logger.info('Adding new destination', { destination }, 'LinkedCardsScreen');
      
      if (destination.type === 'wallet') {
        // Add external wallet using LinkedWalletService
        const result = await LinkedWalletService.addLinkedWallet(
          currentUser.id.toString(),
          {
            type: 'external',
            label: destination.name,
            address: destination.address,
            chain: destination.chain || 'solana',
            status: 'active',
            currency: 'USD',
            isActive: true
          }
        );
        
        if (result.success) {
          const newWallet = { id: Date.now().toString(), type: 'wallet', ...destination };
          setExternalWallets(prev => [...prev, newWallet]);
          logger.info('External wallet added successfully', null, 'LinkedCardsScreen');
          Alert.alert('Success', `Wallet "${newWallet.label}" has been linked successfully!`);
        } else {
          Alert.alert('Error', result.error || 'Failed to add external wallet');
        }
      } else if (destination.type === 'kast') {
        // Add KAST card using LinkedWalletService with full card information
        const result = await LinkedWalletService.addLinkedWallet(
          currentUser.id.toString(),
          {
            type: 'kast',
            label: destination.name,
            address: destination.address, // Use address field for consistency
            identifier: destination.identifier, // Keep for backward compatibility
            cardType: destination.cardType,
            status: destination.status,
            balance: destination.balance,
            currency: destination.currency,
            expirationDate: destination.expirationDate,
            cardholderName: destination.cardholderName,
            isActive: destination.status === 'active'
          }
        );
        
        if (result.success) {
          const newCard = { 
            id: Date.now().toString(), 
            type: 'kast', 
            ...destination,
            isActive: destination.status === 'active'
          };
          setKastCards(prev => [...prev, newCard]);
          logger.info('SOLANA card added successfully', { 
            cardId: newCard.id,
            status: newCard.status,
            balance: newCard.balance 
          }, 'LinkedCardsScreen');
          Alert.alert('Success', `SOLANA card "${newCard.label}" has been linked successfully!`);
        } else {
          Alert.alert('Error', result.error || 'Failed to add SOLANA card');
        }
      }
      
      setShowAddModal(false);
    } catch (error) {
      console.error('❌ Error adding destination:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save destination';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 10) {return address;}
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleUnlinkWallet = (walletId: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Unlink Wallet',
      'Are you sure you want to unlink this wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Linked wallets functionality moved to walletService
              setExternalWallets(prev => prev.filter(wallet => wallet.id !== walletId));
              setExpandedItemId(null);
              logger.info('External wallet unlinked successfully', null, 'LinkedCardsScreen');
            } catch (error) {
              console.error('❌ Error unlinking wallet:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to unlink wallet';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleUnlinkKastCard = (cardId: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Unlink SOLANA Card',
      'Are you sure you want to unlink this SOLANA card?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Linked wallets functionality moved to walletService
              setKastCards(prev => prev.filter(card => card.id !== cardId));
              setExpandedItemId(null);
              logger.info('SOLANA card unlinked successfully', null, 'LinkedCardsScreen');
            } catch (error) {
              console.error('❌ Error unlinking SOLANA card:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to unlink SOLANA card';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const toggleExpandedItem = (itemId: string) => {
    setExpandedItemId(expandedItemId === itemId ? null : itemId);
  };

  const closeDropdown = () => {
    setExpandedItemId(null);
  };

  const isGlobalEmpty = externalWallets.length === 0 && kastCards.length === 0;

  // Debug logging
  console.log('LinkedCardsScreen render - isLoading:', isLoading, 'isGlobalEmpty:', isGlobalEmpty, 'externalWallets:', externalWallets.length, 'kastCards:', kastCards.length, 'currentUser:', currentUser?.id);
  console.log('LinkedCardsScreen render - externalWallets array:', externalWallets);
  console.log('LinkedCardsScreen render - kastCards array:', kastCards);

  const renderExternalWallets = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallets</Text>
        {externalWallets.length === 0 ? (
          <Text style={styles.emptyCategoryText}>No wallets yet</Text>
        ) : (
          externalWallets.map((wallet) => (
            <View key={wallet.id} style={styles.destinationItemContainer}>
              <TouchableOpacity style={styles.destinationItem}>
                <View style={styles.destinationIcon}>
                  <Image 
                    source={require('../../../../assets/wallet-icon-white.png')} 
                    style={styles.destinationIconImage}
                  />
                </View>
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationLabel}>{wallet.label}</Text>
                  <Text style={styles.destinationAddress}>
                    {formatWalletAddress(wallet.address || '')}
                  </Text>
                </View>
                <View style={styles.destinationActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleExpandedItem(wallet.id);
                    }}
                  >
                    <Text style={styles.actionButtonText}>•••</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              {expandedItemId === wallet.id && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUnlinkWallet(wallet.id);
                    }}
                  >
                    <Image 
                      source={require('../../../../assets/bin-icon.png')} 
                      style={styles.dropdownItemIcon}
                    />
                    <Text style={styles.dropdownItemText}>Unlink</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  const renderKastCards = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SOLANA Cards</Text>
        {kastCards.length === 0 ? (
          <Text style={styles.emptyCategoryText}>No SOLANA cards yet</Text>
        ) : (
          kastCards.map((card) => (
            <View key={card.id} style={styles.destinationItemContainer}>
              <TouchableOpacity style={styles.destinationItem}>
                <Image 
                  source={require('../../../../assets/kast-logo.png')} 
                  style={styles.kastCardIcon}
                />
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationLabel}>{card.label}</Text>
                  <Text style={styles.destinationAddress}>
                    {formatWalletAddress(card.address || '')}
                  </Text>
                </View>
                <View style={styles.destinationActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleExpandedItem(card.id);
                    }}
                  >
                    <Text style={styles.actionButtonText}>•••</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              {expandedItemId === card.id && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUnlinkKastCard(card.id);
                    }}
                  >
                    <Image 
                      source={require('../../../../assets/bin-icon.png')} 
                      style={styles.dropdownItemIcon}
                    />
                    <Text style={styles.dropdownItemText}>Unlink</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <Container>
      <TouchableWithoutFeedback onPress={closeDropdown}>
        <View style={styles.container}>
          {/* Header */}
          <Header 
            title="Linked Wallets"
            onBackPress={() => navigation.goBack()}
            showBackButton={true}
            rightElement={
              <TouchableOpacity 
                style={[styles.addButton, isAdding && { opacity: 0.6 }]}
                onPress={() => setShowAddModal(true)}
                disabled={isAdding}
              >
                <Image
                  source={require('../../../../assets/plus-icon-green.png')}
                  style={styles.addButtonIcon}
                  tintColor="white"
                />
              </TouchableOpacity>
            }
          />

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : !currentUser?.id ? (
              <View style={styles.globalEmptyState}>
                <View style={styles.globalEmptyStateIcon}>
                  <Image 
                    source={require('../../../../assets/link-icon.png')} 
                    style={styles.globalEmptyStateIconImage}
                  />
                </View>
                <Text style={styles.globalEmptyStateTitle}>Please log in to view linked wallets</Text>
                <Text style={styles.globalEmptyStateSubtitle}>
                  You need to be logged in to manage your linked wallets and SOLANA cards
                </Text>
              </View>
            ) : isGlobalEmpty ? (
              <View style={styles.globalEmptyState}>
                <View style={styles.globalEmptyStateIcon}>
                  <Image 
                    source={require('../../../../assets/link-icon.png')} 
                    style={styles.globalEmptyStateIconImage}
                  />
                </View>
                <Text style={styles.globalEmptyStateTitle}>No linked wallets or SOLANA cards yet</Text>
                <Text style={styles.globalEmptyStateSubtitle}>
                  Add wallets and SOLANA cards to easily send funds and manage expenses
                </Text>
                <TouchableOpacity 
                  style={styles.globalEmptyStateButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.globalEmptyStateButtonText}>Link Wallet or SOLANA Card</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {renderExternalWallets()}
                {renderKastCards()}
              </>
            )}
          </ScrollView>
          
          
          {/* Add Destination Modal */}
          <AddDestinationSheet
            visible={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setIsAdding(false); // Reset loading state when closing
            }}
            onSaved={handleAddDestination}
            isLoading={isAdding}
          />
        </View>
      </TouchableWithoutFeedback>
    </Container>
  );
};

export default LinkedCardsScreen;
