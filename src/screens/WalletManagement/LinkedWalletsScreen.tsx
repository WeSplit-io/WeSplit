import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { walletLinkingService, WalletLink } from '../../services/walletLinkingService';
import { theme } from '../../lib/theme';

interface LinkedWalletsScreenProps {
  navigation: any;
  route: any;
}

const LinkedWalletsScreen: React.FC<LinkedWalletsScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [linkedWallets, setLinkedWallets] = useState<WalletLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLinkedWallets();
  }, []);

  const loadLinkedWallets = async () => {
    try {
      setLoading(true);
      if (!currentUser?.id) {
        console.log('🔗 LinkedWalletsScreen: No current user');
        return;
      }

      console.log('🔗 LinkedWalletsScreen: Loading linked wallets for user:', currentUser.id);
      const wallets = await walletLinkingService.getLinkedWallets(currentUser.id.toString());
      setLinkedWallets(wallets);
      
      console.log('🔗 LinkedWalletsScreen: Loaded wallets:', wallets.length);
    } catch (error) {
      console.error('🔗 LinkedWalletsScreen: Error loading linked wallets:', error);
      Alert.alert('Error', 'Failed to load linked wallets');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLinkedWallets();
    setRefreshing(false);
  };

  const handleUnlinkWallet = async (wallet: WalletLink) => {
    try {
      Alert.alert(
        'Unlink Wallet',
        `Are you sure you want to unlink ${wallet.walletName}?\n\nAddress: ${wallet.walletAddress.slice(0, 8)}...${wallet.walletAddress.slice(-8)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink',
            style: 'destructive',
            onPress: async () => {
              try {
                await walletLinkingService.unlinkWalletFromUser(
                  currentUser!.id!.toString(),
                  wallet.walletAddress
                );
                Alert.alert('Success', 'Wallet unlinked successfully');
                loadLinkedWallets(); // Refresh the list
              } catch (error) {
                console.error('🔗 LinkedWalletsScreen: Error unlinking wallet:', error);
                Alert.alert('Error', 'Failed to unlink wallet');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🔗 LinkedWalletsScreen: Error in unlink handler:', error);
    }
  };

  const handleAddWallet = () => {
    navigation.navigate('ExternalWalletConnection', {
      onSuccess: (result: any) => {
        console.log('🔗 LinkedWalletsScreen: Wallet connection result:', result);
        if (result.success) {
          Alert.alert('Success', 'Wallet linked successfully!');
          loadLinkedWallets(); // Refresh the list
        }
      }
    });
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getWalletTypeColor = (type: string) => {
    return type === 'external' ? theme.colors.primary : theme.colors.secondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading linked wallets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Linked Wallets</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddWallet}>
          <Text style={styles.addButtonText}>+ Add Wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {linkedWallets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Linked Wallets</Text>
            <Text style={styles.emptySubtitle}>
              You haven't linked any external wallets yet.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddWallet}>
              <Text style={styles.emptyButtonText}>Link Your First Wallet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          linkedWallets.map((wallet) => (
            <View key={wallet.id} style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{wallet.walletName}</Text>
                  <View style={[styles.walletTypeBadge, { backgroundColor: getWalletTypeColor(wallet.walletType) }]}>
                    <Text style={styles.walletTypeText}>{wallet.walletType}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={() => handleUnlinkWallet(wallet)}
                >
                  <Text style={styles.unlinkButtonText}>Unlink</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.walletDetails}>
                <Text style={styles.walletAddress}>
                  {formatWalletAddress(wallet.walletAddress)}
                </Text>
                <Text style={styles.walletNetwork}>
                  Network: {wallet.network}
                </Text>
                <Text style={styles.walletLinkedDate}>
                  Linked: {formatDate(wallet.linkedAt)}
                </Text>
                {wallet.balance !== undefined && (
                  <Text style={styles.walletBalance}>
                    Balance: {wallet.balance.toFixed(4)} SOL
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  walletCard: {
    backgroundColor: theme.colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  walletTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  unlinkButton: {
    backgroundColor: theme.colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unlinkButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  walletDetails: {
    gap: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  walletNetwork: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  walletLinkedDate: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  walletBalance: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
});

export default LinkedWalletsScreen; 