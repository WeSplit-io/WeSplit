import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { formatKastIdentifier } from '../../utils/sendUtils';
import AddDestinationSheet from '../../components/AddDestinationSheet';
import { styles } from './styles';

interface ExternalWallet {
  id: string;
  label: string;
  address: string;
  chain: string;
}

interface KastCard {
  id: string;
  label: string;
  identifierMasked: string;
  last4: string;
  address: string;
}

const LinkedCardsScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { availableWallets } = useWallet();
  
  const [externalWallets, setExternalWallets] = useState<ExternalWallet[]>([]);
  const [kastCards, setKastCards] = useState<KastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadLinkedDestinations();
  }, []);

  const loadLinkedDestinations = async () => {
    setIsLoading(true);
    try {
      // Load external wallets from availableWallets
      const wallets: ExternalWallet[] = availableWallets.map(wallet => ({
        id: wallet.id,
        label: wallet.name,
        address: wallet.address,
        chain: 'solana' // Default to Solana for now
      }));

      // TODO: Load KAST cards from API
      const cards: KastCard[] = [];

      setExternalWallets(wallets);
      setKastCards(cards);
    } catch (error) {
      console.error('Error loading linked destinations:', error);
      Alert.alert('Error', 'Failed to load linked destinations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDestination = (destination: any) => {
    if (destination.type === 'wallet') {
      const newWallet: ExternalWallet = {
        id: Date.now().toString(),
        label: destination.name,
        address: destination.address,
        chain: destination.chain || 'solana'
      };
      setExternalWallets(prev => [...prev, newWallet]);
    } else if (destination.type === 'kast') {
      const newCard: KastCard = {
        id: Date.now().toString(),
        label: destination.name,
        identifierMasked: formatKastIdentifier(destination.identifier),
        last4: destination.identifier.slice(-4),
        address: destination.identifier
      };
      setKastCards(prev => [...prev, newCard]);
    }
    
    setShowAddModal(false);
    Alert.alert('Success', 'Saved to Linked Cards');
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleUnlinkWallet = (walletId: string) => {
    Alert.alert(
      'Unlink Wallet',
      'Are you sure you want to unlink this wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: () => {
            setExternalWallets(prev => prev.filter(wallet => wallet.id !== walletId));
            setExpandedItemId(null);
          }
        }
      ]
    );
  };

  const handleUnlinkKastCard = (cardId: string) => {
    Alert.alert(
      'Unlink KAST Card',
      'Are you sure you want to unlink this KAST card?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: () => {
            setKastCards(prev => prev.filter(card => card.id !== cardId));
            setExpandedItemId(null);
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
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
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
            onClose={() => setShowAddModal(false)}
            onSaved={handleAddDestination}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default LinkedCardsScreen;
