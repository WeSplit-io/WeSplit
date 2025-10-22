/**
 * Wallet Debug Screen
 * Provides diagnostic tools and testing capabilities for wallet detection and linking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { mwaDiscoveryService, MWADiscoveryResult } from '../../services/wallet/discovery/mwaDiscoveryService';
import { signatureLinkService } from '../../services/wallet/linking/signatureLinkService';
import { WALLET_PROVIDER_REGISTRY, getAllWalletProviders } from '../../services/wallet/providers/registry';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/core';

interface WalletDebugScreenProps {
  navigation: any;
}

const WalletDebugScreen: React.FC<WalletDebugScreenProps> = ({ navigation }) => {
  const { state } = useApp();
  const currentUser = state.currentUser;

  // State
  const [discoveryResults, setDiscoveryResults] = useState<MWADiscoveryResult[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStats, setDiscoveryStats] = useState<any>(null);
  const [testUserId, setTestUserId] = useState(currentUser?.id?.toString() || '');
  const [testProvider, setTestProvider] = useState('phantom');
  const [isLinking, setIsLinking] = useState(false);
  const [linkedWallets, setLinkedWallets] = useState<any[]>([]);
  const [useCache, setUseCache] = useState(true);
  const [includeUnsupported, setIncludeUnsupported] = useState(false);

  useEffect(() => {
    loadLinkedWallets();
    loadDiscoveryStats();
  }, []);

  const loadLinkedWallets = async () => {
    if (!currentUser?.id) {return;}
    
    try {
      const wallets = await signatureLinkService.getLinkedWallets(currentUser.id.toString());
      setLinkedWallets(wallets);
    } catch (error) {
      console.error('Failed to load linked wallets:', error);
    }
  };

  const loadDiscoveryStats = () => {
    const stats = mwaDiscoveryService.getDiscoveryStats();
    setDiscoveryStats(stats);
  };

  const runDiscovery = async () => {
    setIsDiscovering(true);
    try {
      logger.info('Running wallet discovery', null, 'WalletDebugScreen');
      const results = await mwaDiscoveryService.discoverProviders({
        useCache,
        includeUnsupported
      });
      
      setDiscoveryResults(results);
      loadDiscoveryStats();
      
      logger.info('Discovery completed', { results }, 'WalletDebugScreen');
    } catch (error) {
      console.error('Discovery failed:', error);
      Alert.alert('Discovery Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const testProviderDiscovery = async (providerName: string) => {
    try {
      logger.info('Testing discovery for provider', { providerName }, 'WalletDebugScreen');
      const result = await mwaDiscoveryService.testDiscovery(providerName);
      
      Alert.alert(
        'Discovery Test Result',
        `${providerName}\nAvailable: ${result.isAvailable}\nMethod: ${result.detectionMethod}\nError: ${result.error || 'None'}`
      );
    } catch (error) {
      Alert.alert('Test Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testSignatureLinking = async () => {
    if (!testUserId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    setIsLinking(true);
    try {
      logger.info('Testing signature linking for provider', { testProvider }, 'WalletDebugScreen');
      const result = await signatureLinkService.testSignatureLinking(testProvider, testUserId);
      
      if (result.success) {
        Alert.alert('Linking Success', `Wallet linked successfully!\nPublic Key: ${result.publicKey}`);
        loadLinkedWallets();
      } else {
        Alert.alert('Linking Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Linking Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLinking(false);
    }
  };

  const clearCache = () => {
    mwaDiscoveryService.clearCache();
    setDiscoveryResults([]);
    loadDiscoveryStats();
    Alert.alert('Cache Cleared', 'Discovery cache has been cleared');
  };

  const removeLinkedWallet = async (walletId: string) => {
    if (!currentUser?.id) {return;}
    
    try {
      const success = await signatureLinkService.removeLinkedWallet(currentUser.id.toString(), walletId);
      if (success) {
        Alert.alert('Success', 'Linked wallet removed');
        loadLinkedWallets();
      } else {
        Alert.alert('Error', 'Failed to remove linked wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove linked wallet');
    }
  };

  const renderDiscoveryResults = () => {
    if (discoveryResults.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery Results</Text>
          <Text style={styles.emptyText}>No discovery results yet. Run discovery to see results.</Text>
        </View>
      );
    }

    const availableCount = discoveryResults.filter(r => r.isAvailable).length;
    const mwaSupportedCount = discoveryResults.filter(r => r.provider.mwaSupported).length;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovery Results</Text>
        <Text style={styles.statsText}>
          Available: {availableCount}/{discoveryResults.length} | MWA Supported: {mwaSupportedCount}
        </Text>
        
        {discoveryResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.providerName}>{result.provider.displayName}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: result.isAvailable ? colors.primaryGreen : colors.error }
              ]}>
                <Text style={styles.statusText}>
                  {result.isAvailable ? 'Available' : 'Not Available'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.resultDetails}>
              Method: {result.detectionMethod} | Priority: {result.provider.priority}
            </Text>
            
            {result.error && (
              <Text style={styles.errorText}>Error: {result.error}</Text>
            )}
            
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => testProviderDiscovery(result.provider.name)}
            >
              <Text style={styles.testButtonText}>Test Discovery</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderLinkedWallets = () => {
    if (linkedWallets.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Wallets</Text>
          <Text style={styles.emptyText}>No linked wallets found.</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Linked Wallets ({linkedWallets.length})</Text>
        
        {linkedWallets.map((wallet, index) => (
          <View key={index} style={styles.linkedWalletItem}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletLabel}>{wallet.label}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeLinkedWallet(wallet.id)}
              >
                <Icon name="trash" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.walletDetails}>
              Provider: {wallet.provider} | Public Key: {wallet.publicKey.substring(0, 8)}...
            </Text>
            
            <Text style={styles.walletDetails}>
              Created: {new Date(wallet.createdAt).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDiscoveryStats = () => {
    if (!discoveryStats) {return null;}

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovery Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{discoveryStats.totalProviders}</Text>
            <Text style={styles.statLabel}>Total Providers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{discoveryStats.availableProviders}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{discoveryStats.mwaSupported}</Text>
            <Text style={styles.statLabel}>MWA Supported</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{discoveryStats.cacheSize}</Text>
            <Text style={styles.statLabel}>Cached</Text>
          </View>
        </View>
        
        <Text style={styles.platformText}>Platform: {discoveryStats.platform}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Wallet Debug"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Discovery Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery Controls</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Use Cache</Text>
            <Switch
              value={useCache}
              onValueChange={setUseCache}
              trackColor={{ false: colors.border, true: colors.primaryGreen }}
              thumbColor={colors.white}
            />
          </View>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Include Unsupported</Text>
            <Switch
              value={includeUnsupported}
              onValueChange={setIncludeUnsupported}
              trackColor={{ false: colors.border, true: colors.primaryGreen }}
              thumbColor={colors.white}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, isDiscovering && styles.actionButtonDisabled]}
            onPress={runDiscovery}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.actionButtonText}>Run Discovery</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={clearCache}>
            <Text style={styles.secondaryButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Discovery Statistics */}
        {renderDiscoveryStats()}

        {/* Discovery Results */}
        {renderDiscoveryResults()}

        {/* Signature Linking Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature Linking Test</Text>
          
          <TextInput
            style={styles.input}
            value={testUserId}
            onChangeText={setTestUserId}
            placeholder="User ID"
            placeholderTextColor={colors.textLightSecondary}
          />
          
          <View style={styles.providerSelector}>
            <Text style={styles.controlLabel}>Provider:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getAllWalletProviders().slice(0, 5).map((provider) => (
                <TouchableOpacity
                  key={provider.name}
                  style={[
                    styles.providerChip,
                    testProvider === provider.name && styles.providerChipSelected
                  ]}
                  onPress={() => setTestProvider(provider.name)}
                >
                  <Text style={[
                    styles.providerChipText,
                    testProvider === provider.name && styles.providerChipTextSelected
                  ]}>
                    {provider.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, isLinking && styles.actionButtonDisabled]}
            onPress={testSignatureLinking}
            disabled={isLinking}
          >
            {isLinking ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.actionButtonText}>Test Signature Linking</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Linked Wallets */}
        {renderLinkedWallets()}

        {/* Provider Registry Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Provider Registry</Text>
          <Text style={styles.infoText}>
            Total providers: {Object.keys(WALLET_PROVIDER_REGISTRY).length}
          </Text>
          <Text style={styles.infoText}>
            MWA supported: {Object.values(WALLET_PROVIDER_REGISTRY).filter(p => p.mwaSupported).length}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  controlLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  actionButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryGreen,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
  },
  statsText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  platformText: {
    fontSize: 12,
    color: colors.textLightSecondary,
  },
  resultItem: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  resultDetails: {
    fontSize: 12,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  testButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  testButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.white,
    marginBottom: spacing.md,
  },
  providerSelector: {
    marginBottom: spacing.md,
  },
  providerChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerChipSelected: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  providerChipText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  providerChipTextSelected: {
    color: colors.white,
  },
  linkedWalletItem: {
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  walletLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  removeButton: {
    padding: spacing.sm,
  },
  walletDetails: {
    fontSize: 12,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLightSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
});

export default WalletDebugScreen;
