import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { walletLinkingService, WalletLink } from '../../services/walletLinkingService';
import { phoneWalletAnalysisService, WalletProvider } from '../../services/phoneWalletAnalysisService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import Icon from '../../components/Icon';

interface LinkedWalletsScreenProps {
  navigation: any;
  route: any;
}

const LinkedWalletsScreen: React.FC<LinkedWalletsScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [linkedWallets, setLinkedWallets] = useState<WalletLink[]>([]);
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    console.log('📱 LinkedWalletsScreen: Component mounted, starting initialization...');
    loadLinkedWallets();
    analyzePhoneForWallets();
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

  const analyzePhoneForWallets = async () => {
    try {
      setAnalyzing(true);
      console.log('📱 LinkedWalletsScreen: Analyzing phone for wallet providers...');
      
      const analysisResult = await phoneWalletAnalysisService.analyzePhoneForWallets();
      
      // Debug: Force all wallets to be available if none are detected
      let walletsToShow = analysisResult.detectedWallets;
      if (walletsToShow.length === 0 || walletsToShow.every(w => !w.isAvailable && !w.isInstalled)) {
        console.log('📱 LinkedWalletsScreen: No wallets detected, forcing all to be available for testing');
        walletsToShow = analysisResult.detectedWallets.map(wallet => ({
          ...wallet,
          isAvailable: true,
          isInstalled: false
        }));
      }

      // Fallback: If still no wallets, create a basic list of major wallets
      if (walletsToShow.length === 0) {
        console.log('📱 LinkedWalletsScreen: Creating fallback wallet list');
        walletsToShow = [
          {
            name: 'phantom',
            displayName: 'Phantom',
            isInstalled: false,
            isAvailable: true,
            deepLinkScheme: 'phantom://',
            packageName: 'app.phantom',
            appStoreUrl: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fphantom-logo.png?alt=media',
            detectionMethod: 'deep-link',
            priority: 1
          },
          {
            name: 'solflare',
            displayName: 'Solflare',
            isInstalled: false,
            isAvailable: true,
            deepLinkScheme: 'solflare://',
            packageName: 'com.solflare.mobile',
            appStoreUrl: 'https://apps.apple.com/app/solflare/id1580902717',
            playStoreUrl: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fsolflare-logo.png?alt=media',
            detectionMethod: 'deep-link',
            priority: 2
          }
        ];
      }
      
      setAvailableWallets(walletsToShow);
      
      console.log('📱 LinkedWalletsScreen: Analysis complete -', {
        totalDetected: analysisResult.totalDetected,
        recommended: analysisResult.recommendedWallets.length,
        walletsToShow: walletsToShow.length,
        availableWallets: walletsToShow.filter(w => w.isAvailable).length
      });
    } catch (error) {
      console.error('📱 LinkedWalletsScreen: Error analyzing phone:', error);
      Alert.alert('Error', 'Failed to analyze phone for wallet providers');
    } finally {
      setAnalyzing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadLinkedWallets(),
      analyzePhoneForWallets()
    ]);
    setRefreshing(false);
  };

  const handleConnectWallet = async (provider: WalletProvider) => {
    try {
      console.log('📱 LinkedWalletsScreen: Attempting to connect wallet:', {
        name: provider.displayName,
        isAvailable: provider.isAvailable,
        isInstalled: provider.isInstalled
      });

      if (!provider.isAvailable) {
        console.log('📱 LinkedWalletsScreen: Wallet not available, showing installation instructions');
        const instructions = phoneWalletAnalysisService.getInstallationInstructions(provider);
        Alert.alert(
          instructions.title,
          instructions.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Install', 
              onPress: () => phoneWalletAnalysisService.openWalletInstallation(provider)
            }
          ]
        );
        return;
      }

      console.log('📱 LinkedWalletsScreen: Navigating to ExternalWalletConnection with provider:', provider.name);
      // Navigate to external wallet connection screen
      navigation.navigate('ExternalWalletConnection', {
        provider: provider.name,
        providerInfo: provider
      });
    } catch (error) {
      console.error('🔗 LinkedWalletsScreen: Error connecting wallet:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const handleUnlinkWallet = async (wallet: WalletLink) => {
    try {
      Alert.alert(
        'Unlink Wallet',
        `Are you sure you want to unlink ${wallet.walletName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink',
            style: 'destructive',
            onPress: async () => {
              try {
                await walletLinkingService.unlinkWalletFromUser(
                  currentUser!.id.toString(),
                  wallet.walletAddress
                );
                await loadLinkedWallets();
                Alert.alert('Success', 'Wallet unlinked successfully');
              } catch (error) {
                console.error('🔗 LinkedWalletsScreen: Error unlinking wallet:', error);
                Alert.alert('Error', 'Failed to unlink wallet');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🔗 LinkedWalletsScreen: Error unlinking wallet:', error);
      Alert.alert('Error', 'Failed to unlink wallet');
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
    return type === 'external' ? colors.primaryGreen : colors.GRAY;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
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
        {/* Debug Section - Always show in development */}
        {__DEV__ && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Debug Info</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('📱 LinkedWalletsScreen: Manual debug refresh triggered');
                    analyzePhoneForWallets();
                  }}
                >
                  <Text style={styles.debugToggleText}>Test Detection</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('📱 LinkedWalletsScreen: Force showing wallets');
                    setAvailableWallets([
                      {
                        name: 'phantom',
                        displayName: 'Phantom',
                        isInstalled: false,
                        isAvailable: true,
                        deepLinkScheme: 'phantom://',
                        packageName: 'app.phantom',
                        appStoreUrl: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
                        playStoreUrl: 'https://play.google.com/store/apps/details?id=app.phantom',
                        logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fphantom-logo.png?alt=media',
                        detectionMethod: 'deep-link',
                        priority: 1
                      },
                      {
                        name: 'solflare',
                        displayName: 'Solflare',
                        isInstalled: false,
                        isAvailable: true,
                        deepLinkScheme: 'solflare://',
                        packageName: 'com.solflare.mobile',
                        appStoreUrl: 'https://apps.apple.com/app/solflare/id1580902717',
                        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
                        logoUrl: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/wallet-logos%2Fsolflare-logo.png?alt=media',
                        detectionMethod: 'deep-link',
                        priority: 2
                      }
                    ]);
                  }}
                >
                  <Text style={styles.debugToggleText}>Force Show</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.debugContainer}>
              <Text style={styles.debugInfo}>
                Available Wallets: {availableWallets.length}
              </Text>
              <Text style={styles.debugInfo}>
                Analyzing: {analyzing ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.debugInfo}>
                Available Count: {availableWallets.filter(w => w.isAvailable).length}
              </Text>
              <Text style={styles.debugInfo}>
                Installed Count: {availableWallets.filter(w => w.isInstalled).length}
              </Text>
            </View>
          </View>
        )}

        {/* Available Wallets Section */}
        {availableWallets.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Available Wallets</Text>
                <Text style={styles.sectionSubtitle}>
                  {analyzing ? 'Analyzing your device...' : `${availableWallets.filter(w => w.isAvailable).length} wallets detected`}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={analyzePhoneForWallets}
                disabled={analyzing}
              >
                <Icon 
                  name="refresh" 
                  size={20} 
                  color={analyzing ? colors.GRAY : colors.primaryGreen} 
                />
              </TouchableOpacity>
            </View>
            
            {analyzing ? (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="small" color={colors.primaryGreen} />
                <Text style={styles.analyzingText}>Scanning for wallet apps...</Text>
              </View>
            ) : (
              <View style={styles.availableWalletsContainer}>
                {availableWallets.map((provider) => (
                  <TouchableOpacity
                    key={provider.name}
                    style={[
                      styles.walletProviderCard,
                      !provider.isAvailable && styles.walletProviderCardDisabled
                    ]}
                    onPress={() => handleConnectWallet(provider)}
                    disabled={!provider.isAvailable}
                  >
                    <View style={styles.walletProviderInfo}>
                      {provider.logoUrl && (
                        <Image source={{ uri: provider.logoUrl }} style={styles.walletProviderLogo} />
                      )}
                      <View style={styles.walletProviderDetails}>
                        <Text style={styles.walletProviderName}>{provider.displayName}</Text>
                        <Text style={styles.walletProviderStatus}>
                          {provider.isAvailable ? 'Available' : 'Not Installed'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.walletProviderAction}>
                      {provider.isAvailable ? (
                        <Icon name="plus" size={20} color={colors.primaryGreen} />
                      ) : (
                        <Icon name="download" size={20} color={colors.GRAY} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Debug Information Section */}
        {__DEV__ && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity 
              style={styles.debugToggle}
              onPress={() => setShowDebugInfo(!showDebugInfo)}
            >
              <Text style={styles.debugToggleText}>
                {showDebugInfo ? 'Hide' : 'Show'} Debug Info
              </Text>
            </TouchableOpacity>
            
            {showDebugInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Wallet Detection Debug Info</Text>
                {availableWallets.map((wallet) => (
                  <View key={wallet.name} style={styles.debugItem}>
                    <Text style={styles.debugWalletName}>{wallet.displayName}</Text>
                    <Text style={styles.debugInfo}>
                      Installed: {wallet.isInstalled ? '✅' : '❌'} | 
                      Available: {wallet.isAvailable ? '✅' : '❌'}
                    </Text>
                    <Text style={styles.debugInfo}>
                      Scheme: {wallet.deepLinkScheme || 'N/A'}
                    </Text>
                    <Text style={styles.debugInfo}>
                      Package: {wallet.packageName || 'N/A'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Linked Wallets Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Linked Wallets</Text>
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
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.GRAY,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.darkCard,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  analyzingText: {
    marginLeft: spacing.sm,
    color: colors.GRAY,
    fontSize: 14,
  },
  availableWalletsContainer: {
    paddingHorizontal: spacing.md,
  },
  walletProviderCard: {
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  walletProviderCardDisabled: {
    opacity: 0.6,
    borderColor: colors.GRAY,
  },
  walletProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletProviderLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  walletProviderDetails: {
    flex: 1,
  },
  walletProviderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  walletProviderStatus: {
    fontSize: 12,
    color: colors.GRAY,
  },
  walletProviderAction: {
    padding: spacing.sm,
  },
  debugToggle: {
    backgroundColor: colors.darkCard,
    padding: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  debugToggleText: {
    color: colors.primaryGreen,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugContainer: {
    backgroundColor: colors.darkCard,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  debugTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  debugItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  debugWalletName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  debugInfo: {
    color: colors.GRAY,
    fontSize: 12,
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  addButton: {
    backgroundColor: colors.primaryGreen,
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
    color: colors.white,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.GRAY,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  walletCard: {
    backgroundColor: colors.darkCard,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkBorder,
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
    color: colors.white,
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
    backgroundColor: colors.red,
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
    color: colors.white,
    fontFamily: 'monospace',
  },
  walletNetwork: {
    fontSize: 14,
    color: colors.GRAY,
  },
  walletLinkedDate: {
    fontSize: 14,
    color: colors.GRAY,
  },
  walletBalance: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});

export default LinkedWalletsScreen; 