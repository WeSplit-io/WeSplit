import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../../context/AppContext';
import AddDestinationSheet from '../../../components/AddDestinationSheet';
import { LinkedWalletService, LinkedWallet } from '../../../services/blockchain/wallet/LinkedWalletService';
import { styles } from '../../Settings/LinkedCards/styles';
import { logger } from '../../../services/analytics/loggingService';
import Header from '../../../components/shared/Header';
import { Container } from '../../../components/shared';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import Button from '../../../components/shared/Button';
import { colors, typography } from '@/theme';
import { SharedWalletService } from '../../../services/sharedWallet';
import ModernLoader from '@/components/shared/ModernLoader';

const LinkedCardsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  
  // Get return route params if navigating from SharedWalletDetails
  const { returnRoute, returnParams } = route?.params || {};
  
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

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id) {
        console.log('LinkedCardsScreen: Screen focused, reloading data');
        loadLinkedDestinations();
      }
    }, [currentUser?.id])
  );

  const loadLinkedDestinations = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      logger.info('Loading linked destinations for user', { userId: currentUser.id }, 'LinkedCardsScreen');
      
      const linkedData = await LinkedWalletService.getLinkedDestinations(currentUser.id.toString());
      
      logger.info('Loaded linked destinations', {
        wallets: linkedData.externalWallets.length,
        cards: linkedData.kastCards.length
      });

      // Ensure we have valid arrays
      setExternalWallets(Array.isArray(linkedData.externalWallets) ? linkedData.externalWallets : []);
      setKastCards(Array.isArray(linkedData.kastCards) ? linkedData.kastCards : []);
    } catch (error) {
      logger.error('Failed to load linked destinations', error, 'LinkedCardsScreen');
      
      // Set empty arrays on error to prevent undefined state
      setExternalWallets([]);
      setKastCards([]);
      
      // Only show alert for unexpected errors, not for empty results
      if (error instanceof Error && !error.message.includes('No data found')) {
        Alert.alert('Error', 'Failed to load linked destinations. Please try again.');
      }
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
          const newWallet = { 
            id: result.walletId || Date.now().toString(), 
            type: 'wallet', 
            ...destination,
            label: destination.name, // Ensure label field is set for UI display
            userId: currentUser.id.toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setExternalWallets(prev => [...prev, newWallet]);
          logger.info('External wallet added successfully', { walletId: newWallet.id }, 'LinkedCardsScreen');
          Alert.alert('Success', `Wallet "${newWallet.label}" has been linked successfully!`);
        } else {
          logger.error('Failed to add external wallet', { error: result.error }, 'LinkedCardsScreen');
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
            id: result.walletId || Date.now().toString(), 
            type: 'kast', 
            ...destination,
            label: destination.name, // Ensure label field is set for UI display
            userId: currentUser.id.toString(),
            isActive: destination.status === 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setKastCards(prev => [...prev, newCard]);
          logger.info('Solana card added successfully', { 
            cardId: newCard.id,
            status: newCard.status,
            balance: newCard.balance 
          }, 'LinkedCardsScreen');
          
          // If navigating from SharedWalletDetails, return with the new card
          if (returnRoute === 'SharedWalletDetails' && returnParams) {
            // Navigate back with the new card info for auto-linking
            navigation.navigate(returnRoute, {
              ...returnParams,
              newlyAddedCard: newCard,
            });
            return;
          }
          
          Alert.alert('Success', `Solana card "${newCard.label}" has been linked successfully!`);
        } else {
          logger.error('Failed to add Solana card', { error: result.error }, 'LinkedCardsScreen');
          Alert.alert('Error', result.error || 'Failed to add Solana card');
        }
      }
      
      setShowAddModal(false);
    } catch (error) {
      logger.error('Error adding destination', error, 'LinkedCardsScreen');
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
              // Use LinkedWalletService to properly unlink wallet
              const result = await LinkedWalletService.removeLinkedWallet(
                currentUser.id.toString(),
                walletId
              );
              
              if (result.success) {
                setExternalWallets(prev => prev.filter(wallet => wallet.id !== walletId));
                setExpandedItemId(null);
                logger.info('External wallet unlinked successfully', null, 'LinkedCardsScreen');
                Alert.alert('Success', 'Wallet has been unlinked successfully!');
              } else {
                Alert.alert('Error', result.error || 'Failed to unlink wallet');
              }
            } catch (error) {
              logger.error('Error unlinking wallet', error, 'LinkedCardsScreen');
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
      'Unlink Solana Card',
      'Are you sure you want to unlink this Solana card?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Use LinkedWalletService to properly unlink card
              const result = await LinkedWalletService.removeLinkedWallet(
                currentUser.id.toString(),
                cardId
              );
              
              if (result.success) {
                setKastCards(prev => prev.filter(card => card.id !== cardId));
                setExpandedItemId(null);
                logger.info('Solana card unlinked successfully', null, 'LinkedCardsScreen');
                Alert.alert('Success', 'Solana card has been unlinked successfully!');
              } else {
                Alert.alert('Error', result.error || 'Failed to unlink Solana card');
              }
            } catch (error) {
              logger.error('Error unlinking Solana card', error, 'LinkedCardsScreen');
              const errorMessage = error instanceof Error ? error.message : 'Failed to unlink Solana card';
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
                  <PhosphorIcon 
                    name="Wallet" 
                    size={24} 
                    color="white" 
                    weight="regular"
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
                    <PhosphorIcon 
                      name="Trash" 
                      size={16} 
                      color="white" 
                      weight="regular"
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

  // Handle card selection when coming from SharedWalletDetails
  const handleSelectCard = (card: LinkedWallet) => {
    logger.info('Card selected for linking', { 
      cardId: card.id, 
      cardLabel: card.label,
      returnRoute,
      hasReturnParams: !!returnParams
    }, 'LinkedCardsScreen');
    
    if (returnRoute === 'SharedWalletDetails' && returnParams) {
      // Navigate back with the selected card for linking
      logger.info('Navigating back to SharedWalletDetails with selected card', {
        walletId: returnParams.walletId,
        cardId: card.id
      }, 'LinkedCardsScreen');
      
      navigation.navigate(returnRoute, {
        ...returnParams,
        selectedCard: card,
      });
    } else {
      logger.warn('Cannot navigate: missing returnRoute or returnParams', {
        returnRoute,
        hasReturnParams: !!returnParams
      }, 'LinkedCardsScreen');
    }
  };

  const renderKastCards = () => {
    const isSelectionMode = returnRoute === 'SharedWalletDetails';
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solana Cards</Text>
        {isSelectionMode && (
          <Text style={styles.selectionHint}>Tap a card to link it to the shared wallet</Text>
        )}
        {kastCards.length === 0 ? (
          <Text style={styles.emptyCategoryText}>No Solana cards yet</Text>
        ) : (
          kastCards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.destinationItemContainer,
                isSelectionMode && styles.selectableCard
              ]}
            >
              <TouchableOpacity
                style={styles.destinationItem}
                onPress={isSelectionMode ? () => handleSelectCard(card) : undefined}
                activeOpacity={isSelectionMode ? 0.7 : 1}
              >
              <View style={styles.destinationIcon}>
                <PhosphorIcon 
                  name="CreditCard" 
                  size={24} 
                  color="white" 
                  weight="regular"
                />
                </View>
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationLabel}>{card.label}</Text>
                  <Text style={styles.destinationAddress}>
                    {formatWalletAddress(card.address || '')}
                  </Text>
                </View>
                {!isSelectionMode && (
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
                )}
                {isSelectionMode && (
                  <PhosphorIcon 
                    name="CaretRight" 
                    size={20} 
                    color={colors.green} 
                    weight="regular"
                  />
                )}
              </TouchableOpacity>
              {!isSelectionMode && expandedItemId === card.id && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUnlinkKastCard(card.id);
                    }}
                  >
                    <PhosphorIcon 
                      name="Trash" 
                      size={16} 
                      color="white" 
                      weight="regular"
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
                <PhosphorIcon 
                  name="Plus" 
                  size={20} 
                  color="white" 
                  weight="regular"
                />
              </TouchableOpacity>
            }
          />

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ModernLoader size="large" text="Loading data" />
              </View>
            ) : !currentUser?.id ? (
              <View style={styles.globalEmptyState}>
                <View style={styles.globalEmptyStateIcon}>
                  <PhosphorIcon 
                    name="LinkBreak" 
                    size={48} 
                    color="white" 
                    weight="regular"
                  />
                </View>
                <Text style={styles.globalEmptyStateTitle}>Please log in to view linked wallets</Text>
                <Text style={styles.globalEmptyStateSubtitle}>
                  You need to be logged in to manage your linked wallets and Solana cards
                </Text>
              </View>
            ) : isGlobalEmpty ? (
              <View style={styles.globalEmptyState}>
                <View style={styles.globalEmptyStateIcon}>
                  <PhosphorIcon 
                    name="LinkBreak" 
                    size={48} 
                    color="white" 
                    weight="regular"
                  />
                </View>
                <Text style={styles.globalEmptyStateTitle}>No linked wallets or Solana cards yet</Text>
                <Text style={styles.globalEmptyStateSubtitle}>
                  Add wallets and Solana cards to easily send funds and manage expenses
                </Text>
                <Button
                  title="Link Wallet or Solana Card"
                  onPress={() => setShowAddModal(true)}
                  variant="primary"
                  fullWidth={true}
                  style={{ marginTop: 24 }}
                  textStyle={{ fontSize: typography.fontSize.md}}
                />
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
