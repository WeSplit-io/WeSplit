import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image, Alert, StyleSheet } from 'react-native';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { formatKastIdentifier } from '../../utils/sendUtils';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import AddDestinationSheet from '../../components/AddDestinationSheet';

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
}

// Styles inline pour éviter les problèmes d'import
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingVertical: 16,
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  destinationIcon: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.xxl,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  destinationIconText: {
    fontSize: typography.fontSize.md,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  destinationAddress: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  destinationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
  },
  actionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIconText: {
    fontSize: 32,
  },
  emptyStateTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
});

const LinkedCardsScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { availableWallets } = useWallet();
  
  const [externalWallets, setExternalWallets] = useState<ExternalWallet[]>([]);
  const [kastCards, setKastCards] = useState<KastCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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
      const cards: KastCard[] = [
        // Mock data for now
        {
          id: '1',
          label: 'Team Card',
          identifierMasked: '•••• 1234',
          last4: '1234'
        }
      ];

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
        last4: destination.identifier.slice(-4)
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

  const renderExternalWallets = () => {
    if (externalWallets.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Text style={styles.emptyStateIconText}>🔗</Text>
          </View>
          <Text style={styles.emptyStateTitle}>No external wallets yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Add external wallets to send funds outside the app
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>External Wallets</Text>
        {externalWallets.map((wallet) => (
          <TouchableOpacity key={wallet.id} style={styles.destinationItem}>
            <View style={styles.destinationIcon}>
              <Text style={styles.destinationIconText}>🔗</Text>
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>{wallet.label}</Text>
              <Text style={styles.destinationAddress}>
                {formatWalletAddress(wallet.address)}
              </Text>
            </View>
            <View style={styles.destinationActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>•••</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderKastCards = () => {
    if (kastCards.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Text style={styles.emptyStateIconText}>💳</Text>
          </View>
          <Text style={styles.emptyStateTitle}>No KAST cards yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Add KAST cards to manage team expenses
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KAST Cards</Text>
        {kastCards.map((card) => (
          <TouchableOpacity key={card.id} style={styles.destinationItem}>
            <View style={styles.destinationIcon}>
              <Text style={styles.destinationIconText}>💳</Text>
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>{card.label}</Text>
              <Text style={styles.destinationAddress}>
                {card.identifierMasked}
              </Text>
            </View>
            <View style={styles.destinationActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>•••</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
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
        <Text style={styles.headerTitle}>Linked Cards</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {renderExternalWallets()}
            {renderKastCards()}
          </>
        )}
      </ScrollView>
      
      <NavBar currentRoute="LinkedCards" navigation={navigation} />
      
      {/* Add Destination Modal */}
      <AddDestinationSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleAddDestination}
      />
    </SafeAreaView>
  );
};

export default LinkedCardsScreen;
