import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { formatKastIdentifier } from '../../utils/sendUtils';
import AddDestinationSheet from '../../components/AddDestinationSheet';
import { walletService } from '../../services/WalletService';
import { styles } from './styles';

// Interfaces are now imported from the service

const LinkedCardsScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { availableWallets } = useWallet();
  
  const [externalWallets, setExternalWallets] = useState<ExternalWallet[]>([]);
  const [kastCards, setKastCards] = useState<KastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Load data on mount and when user changes
  useEffect(() => {
    if (currentUser?.id) {
      loadLinkedDestinations();
    }
  }, [currentUser?.id]);

  const loadLinkedDestinations = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Loading linked destinations for user:', currentUser.id);
      
      // Load from the linked wallets service
      // Get linked destinations from walletService
      const linkedData = await walletService.getLinkedDestinations(currentUser.id.toString());
      
      console.log('📊 Loaded linked destinations:', {
        wallets: linkedData.externalWallets.length,
        cards: linkedData.kastCards.length
      });

      setExternalWallets(linkedData.externalWallets);
      setKastCards(linkedData.kastCards);
    } catch (error) {
      console.error('❌ Error loading linked destinations:', error);
      Alert.alert('Error', 'Failed to load linked destinations');
    } finally {
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
      console.log('💾 Adding new destination:', destination);
      
      if (destination.type === 'wallet') {
        // Add external wallet using walletService
        const result = await walletService.addExternalWallet(
          currentUser.id.toString(),
          {
            label: destination.name,
            address: destination.address,
            chain: destination.chain || 'solana'
          }
        );
        
        if (result.success) {
          const newWallet = { id: Date.now().toString(), type: 'wallet', ...destination };
          setExternalWallets(prev => [...prev, newWallet]);
          console.log('✅ External wallet added successfully');
          Alert.alert('Success', `Wallet "${newWallet.label}" has been linked successfully!`);
        } else {
          Alert.alert('Error', result.error || 'Failed to add external wallet');
        }
      } else if (destination.type === 'kast') {
        // Add KAST card using walletService
        const result = await walletService.addKastCard(
          currentUser.id.toString(),
          {
            label: destination.name,
            identifier: destination.identifier
          }
        );
        
        if (result.success) {
          const newCard = { id: Date.now().toString(), type: 'kast', ...destination };
          setKastCards(prev => [...prev, newCard]);
          console.log('✅ KAST card added successfully');
          Alert.alert('Success', `KAST card "${newCard.label}" has been linked successfully!`);
        } else {
          Alert.alert('Error', result.error || 'Failed to add KAST card');
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
    if (!address) return '';
    if (address.length <= 10) return address;
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
              console.log('Removing external wallet:', walletId); // Placeholder
              setExternalWallets(prev => prev.filter(wallet => wallet.id !== walletId));
              setExpandedItemId(null);
              console.log('✅ External wallet unlinked successfully');
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
      'Unlink KAST Card',
      'Are you sure you want to unlink this KAST card?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Linked wallets functionality moved to walletService
              console.log('Removing kast card:', cardId); // Placeholder
              setKastCards(prev => prev.filter(card => card.id !== cardId));
              setExpandedItemId(null);
              console.log('✅ KAST card unlinked successfully');
            } catch (error) {
              console.error('❌ Error unlinking KAST card:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to unlink KAST card';
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
                    source={require('../../../assets/wallet-icon-white.png')} 
                    style={styles.destinationIconImage}
                  />
                </View>
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationLabel}>{wallet.label}</Text>
                  <Text style={styles.destinationAddress}>
                    {formatWalletAddress(wallet.address)}
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
                      source={require('../../../assets/bin-icon.png')} 
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
        <Text style={styles.sectionTitle}>Kast Cards</Text>
        {kastCards.length === 0 ? (
          <Text style={styles.emptyCategoryText}>No KAST cards yet</Text>
        ) : (
          kastCards.map((card) => (
            <View key={card.id} style={styles.destinationItemContainer}>
              <TouchableOpacity style={styles.destinationItem}>
                <Image 
                  source={require('../../../assets/kast-logo.png')} 
                  style={styles.kastCardIcon}
                />
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationLabel}>{card.label}</Text>
                  <Text style={styles.destinationAddress}>
                    {formatWalletAddress(card.address)}
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
                      source={require('../../../assets/bin-icon.png')} 
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
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={closeDropdown}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Image
                source={require('../../../assets/chevron-left.png')}
                style={styles.iconWrapper}
                tintColor="white"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Linked Wallets</Text>
            <TouchableOpacity 
              style={[styles.addButton, isAdding && { opacity: 0.6 }]}
              onPress={() => setShowAddModal(true)}
              disabled={isAdding}
            >
              <Image
                source={require('../../../assets/plus-icon-green.png')}
                style={styles.addButtonIcon}
                tintColor="white"
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : isGlobalEmpty ? (
              <View style={styles.globalEmptyState}>
                <View style={styles.globalEmptyStateIcon}>
                  <Image 
                    source={require('../../../assets/link-icon.png')} 
                    style={styles.globalEmptyStateIconImage}
                  />
                </View>
                <Text style={styles.globalEmptyStateTitle}>No linked wallets or KAST cards yet</Text>
                <Text style={styles.globalEmptyStateSubtitle}>
                  Add wallets and KAST cards to easily send funds and manage expenses
                </Text>
                <TouchableOpacity 
                  style={styles.globalEmptyStateButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.globalEmptyStateButtonText}>Link Wallet or KAST Card</Text>
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
    </SafeAreaView>
  );
};

export default LinkedCardsScreen;
