import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { consolidatedWalletService } from '../../services/consolidatedWalletService';
import { WalletProvider as UnifiedWalletProvider } from '../../types/walletTypes';
import { styles } from './styles';
import { useApp } from '../../context/AppContext';
import { userWalletService } from '../../services/userWalletService';
import { firebaseDataService } from '../../services/firebaseDataService';

// Use the actual WalletProvider type from the service
type WalletProvider = UnifiedWalletProvider;

interface ExternalWalletConnectionScreenProps {
  navigation: any;
  route: any;
}

const ExternalWalletConnectionScreen: React.FC<ExternalWalletConnectionScreenProps> = ({
  navigation,
  route,
}) => {
  const [step, setStep] = useState<'select' | 'connecting' | 'signing' | 'verifying'>('select');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<WalletProvider[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state } = useApp();
  const currentUser = state.currentUser;

  // Wallet management state
  const [refreshing, setRefreshing] = useState(false);
  const [linkedWallets, setLinkedWallets] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'privateKey' | 'seedPhrase'>('privateKey');
  const [importInput, setImportInput] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadProviders();
    loadLinkedWallets();
  }, []);

  const loadLinkedWallets = async () => {
    try {
      if (!currentUser?.id) return;
      
      // For now, we'll use an empty array since getLinkedWallets doesn't exist
      // This can be implemented later when the Firebase service is updated
      setLinkedWallets([]);
    } catch (error) {
      console.error('Error loading linked wallets:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProviders(),
        loadLinkedWallets()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFixWallet = async () => {
    try {
      if (!currentUser?.id) return;

      Alert.alert(
        'Fix Wallet',
        'This will attempt to recover your app wallet credentials. This is useful if you have an app wallet with funds but can\'t access it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fix Wallet',
            onPress: async () => {
              try {
                const result = await userWalletService.fixExistingUserWallet(currentUser.id.toString());
                if (result.success) {
                  Alert.alert('Success', 'Wallet fixed successfully! You can now use your app wallet for transactions.');
                  await loadLinkedWallets();
                } else {
                  Alert.alert('Error', result.error || 'Failed to fix wallet');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to fix wallet. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error fixing wallet:', error);
      Alert.alert('Error', 'Failed to fix wallet');
    }
  };

  const handleImportWallet = () => {
    setShowImportModal(true);
  };

  const handleImportSubmit = async () => {
    if (!importInput.trim()) {
      Alert.alert('Error', 'Please enter your private key or seed phrase');
      return;
    }

    if (!currentUser?.id) return;

    setImporting(true);
    try {
      const result = await userWalletService.importExistingWallet(
        currentUser.id.toString(),
        importInput.trim()
      );

      if (result.success) {
        Alert.alert('Success', 'Wallet imported successfully! You can now use this wallet for transactions.');
        setShowImportModal(false);
        setImportInput('');
        await loadLinkedWallets();
      } else {
        Alert.alert('Error', result.error || 'Failed to import wallet');
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', 'Failed to import wallet. Please check your credentials and try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setImportInput('');
    setImportType('privateKey');
  };

  const analyzePhoneForWallets = async () => {
    setAnalyzing(true);
    try {
      // This would analyze the phone for installed wallet apps
      // For now, just refresh the providers
      await loadProviders();
    } catch (error) {
      console.error('Error analyzing phone for wallets:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      console.log('🔍 ExternalWalletConnection: Loading providers...');
      
      const availableProviders = await consolidatedWalletService.getAvailableProviders();
      console.log('🔍 ExternalWalletConnection: Available providers:', availableProviders.map(p => `${p.name} (${p.isAvailable ? 'Available' : 'Not Available'})`));
      
      // Convert to the expected type
      const convertedProviders = availableProviders.map(provider => ({
        ...provider,
        detectionMethod: provider.detectionMethod || 'manual' as const
      }));
      
      setProviders(convertedProviders);
    } catch (error) {
      console.error('❌ ExternalWalletConnection: Error loading providers:', error);
      setError('Failed to load wallet providers');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async (provider: WalletProvider) => {
    try {
      setConnectingProvider(provider.name);
      setError(null);
      console.log('🔗 ExternalWalletConnection: Starting connection to', provider.name);
      
      // For Phantom, use manual connection approach
      if (provider.name.toLowerCase() === 'phantom') {
        await handlePhantomConnection();
      } else {
        // For other wallets, try standard connection
        await consolidatedWalletService.connectToProvider(provider.name);
      }
    } catch (error) {
      console.error('❌ ExternalWalletConnection: Connection failed:', error);
      setError(`Failed to connect to ${provider.name}: ${error}`);
      Alert.alert('Connection Failed', `Failed to connect to ${provider.name}. Please try again.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handlePhantomConnection = async () => {
    try {
      console.log('🔗 ExternalWalletConnection: Starting automatic Phantom connection...');
      
      // Use automatic connection with signature request
      await consolidatedWalletService.connectToProvider('Phantom');
      
      // Show success message
      Alert.alert(
        'Connection Request Sent',
        'Phantom will open and show a connection request. Please sign the message to connect your wallet to WeSplit.',
        [{ text: 'Got it!', style: 'default' }]
      );
    } catch (error) {
      console.error('❌ ExternalWalletConnection: Phantom connection failed:', error);
      throw error;
    }
  };


  const renderWalletLogo = (provider: WalletProvider) => {
    let logoSource;
    
    switch (provider.name.toLowerCase()) {
      case 'phantom':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a' };
        break;
      case 'solflare':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsolflare-logo.png?alt=media&token=8b4331c1-3f9d-4f57-907c-53a2f0d8b137' };
        break;
      case 'backpack':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbackpack-logo.png?alt=media&token=7c063169-db3e-4396-ad9f-e112b39d688b' };
        break;
      case 'slope':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fslope-logo.png?alt=media&token=62079355-59e2-48da-989b-b795873f8be6' };
        break;
      case 'glow':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fglow-logo.png?alt=media&token=65abdd59-1fc7-4e8b-ad25-0c29df68f412' };
        break;
      case 'exodus':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fexodus-logo.png?alt=media&token=fbe986bd-e5ef-488e-87c0-7fa860cb9a39' };
        break;
      case 'okx':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fokx-logo.png?alt=media&token=3880f1e5-d8a0-4494-af9f-997ba91e6ce0' };
        break;
      case 'math wallet':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmathwallet-logo.png?alt=media&token=93173eb3-f83f-4b49-abeb-0334621205a3' };
        break;
      case 'magic eden':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmagiceden-logo.png?alt=media&token=00c68158-c015-4056-a513-cfb2763017e3' };
        break;
      case 'kraken':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkraken-logo.png?alt=media&token=b97dc798-92d6-4d5c-aa26-a2727c025d93' };
        break;
      case 'imtoken':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fimtoken-logo.png?alt=media&token=878e8b4b-6c6a-4b38-828d-c402d56352b4' };
        break;
      case 'huobi':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhuobi-logo.png?alt=media&token=aa0417be-fae6-4e55-a9f3-4e46fd837c6f' };
        break;
      case 'gate.io':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgate-logo.png?alt=media&token=d551e2d3-e180-4cc0-b9f3-914a174b2d5e' };
        break;
      case 'coinbase':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoinbase-logo.png?alt=media&token=8b4331c1-3f9d-4f57-907c-53a2f0d8b137' };
        break;
      case 'coin98':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoin98-logo.png?alt=media&token=e217c873-7346-47be-bc7b-acee7e9559ee' };
        break;
      case 'clover':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fclover-logo.png?alt=media&token=10b35b99-3100-4e22-b17c-ca522d3e0cd8' };
        break;
      case 'bybit':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbybit-logo.png?alt=media&token=77756071-5994-4ba8-b173-7ff617e2bb9b' };
        break;
      case 'bravos':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbravos-logo.png?alt=media&token=7c063169-db3e-4396-ad9f-e112b39d688b' };
        break;
      case 'brave':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbrave-logo.png?alt=media&token=62079355-59e2-48da-989b-b795873f8be6' };
        break;
      case 'blocto':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fblocto-logo.png?alt=media&token=65abdd59-1fc7-4e8b-ad25-0c29df68f412' };
        break;
      case 'bitget':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbitget-logo.png?alt=media&token=fbe986bd-e5ef-488e-87c0-7fa860cb9a39' };
        break;
      case 'binance':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbinance-logo.png?alt=media&token=3880f1e5-d8a0-4494-af9f-997ba91e6ce0' };
        break;
      case 'argent':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fargent-logo.png?alt=media&token=f09e5ed1-88b7-4b80-ae06-198c223b965a' };
        break;
      case 'ud':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fud-logo.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
        break;
      case 'tokenpocket':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftokenpocket-logo.png?alt=media&token=4d31dd0f-1d69-4bd5-a024-52239dedb53d' };
        break;
      default:
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a' };
        break;
    }
    
    return (
      <Image
        source={logoSource}
        style={styles.walletLogo}
        resizeMode="contain"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          console.log('Back button pressed');
          navigation.goBack();
        }} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Management</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.fixButton} onPress={handleFixWallet}>
            <Text style={styles.fixButtonText}>Fix</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={handleImportWallet}>
            <Text style={styles.importButtonText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Wallet Management Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Wallet Management</Text>
          <Text style={styles.sectionDescription}>
            Fix your app wallet or import an existing wallet to regain access to your funds. You can also connect external wallets for funding and withdrawals.
          </Text>
        </View>

        {/* Linked Wallets Section */}
        {linkedWallets.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Linked Wallets ({linkedWallets.length})</Text>
            {linkedWallets.map((wallet, index) => (
              <View key={index} style={styles.linkedWalletItem}>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{wallet.name || 'Unknown Wallet'}</Text>
                  <Text style={styles.walletAddress}>{wallet.address}</Text>
                </View>
                <View style={styles.walletStatus}>
                  <Text style={styles.walletStatusText}>Connected</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        <Text style={styles.description}>
          Connect your external wallet to fund your app wallet. You'll need to sign a transaction to prove wallet ownership.
        </Text>

        {/* Automatic Connection Instructions */}
        <View style={{
          marginVertical: 20,
          padding: 16,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.white,
            marginBottom: 8,
          }}>Automatic Wallet Connection</Text>
          <Text style={{
            fontSize: 14,
            color: colors.textLight,
            marginBottom: 16,
            lineHeight: 20,
          }}>
            Connect your Phantom wallet automatically. Phantom will open and ask you to sign a message to verify wallet ownership.
          </Text>
          <TouchableOpacity 
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: colors.primaryGreen,
            }}
            onPress={async () => {
              try {
                await consolidatedWalletService.connectToProvider('Phantom');
                Alert.alert(
                  'Connection Request Sent', 
                  'Phantom will open and show a connection request. Please sign the message to connect your wallet to WeSplit.',
                  [{ text: 'Got it!', style: 'default' }]
                );
              } catch (error) {
                Alert.alert('Connection Failed', `Error: ${error}`);
              }
            }}
          >
            <Text style={{
              color: colors.white,
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            }}>Connect Phantom Wallet</Text>
          </TouchableOpacity>
          
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading available wallets...</Text>
          </View>
        )}

        {/* Provider buttons */}
        {providers
          .sort((a, b) => {
            // Sort available providers first, then unavailable ones
            // Within each group, sort alphabetically
            if (a.isAvailable && !b.isAvailable) return -1;
            if (!a.isAvailable && b.isAvailable) return 1;
            return a.name.localeCompare(b.name);
          })
          .map((provider, index) => {
            // Allow clicking on all providers - they can try to connect even if not detected
            const isClickable = true;
            
            return (
              <TouchableOpacity
                key={`${provider.name}-${index}`}
                style={[
                  styles.providerButton,
                  !provider.isAvailable && styles.providerButtonDisabled
                ]}
                onPress={() => handleConnectWallet(provider)}
                disabled={false} // Always allow clicking
              >
                <View style={styles.providerInfo}>
                  <View style={styles.providerHeader}>
                    <View style={styles.walletLogoContainer}>
                      {renderWalletLogo(provider)}
                    </View>
                    <View style={styles.providerNameContainer}>
                      <View style={styles.providerInfoHeader}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        {!provider.isAvailable && (
                          <Text style={styles.providerUnavailable}>
                            {provider.name.toLowerCase() === 'phantom' ? 'Not detected - try anyway' : 'Not detected'}
                          </Text>
                        )}
                      </View>
                      {provider.isAvailable ? (
                        <View style={styles.detectedBadge}>
                          <Text style={styles.detectedText}>Detected</Text>
                        </View>
                      ) : (
                        <View style={[styles.detectedBadge, { backgroundColor: colors.warning }]}>
                          <Text style={styles.detectedText}>
                            {provider.name.toLowerCase() === 'phantom' ? 'Try Connect' : 'Install'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={colors.white}
                />
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By connecting your wallet, you agree to sign a transaction to verify ownership.
        </Text>
      </View>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleImportCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Existing Wallet</Text>
            <TouchableOpacity onPress={handleImportCancel} style={styles.modalCloseButton}>
              <Icon name="x" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Import your existing wallet using either your private key or seed phrase. This will give you full control over your wallet and allow you to send transactions.
            </Text>

            {/* Import Type Selection */}
            <View style={styles.importTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.importTypeButton,
                  importType === 'privateKey' && styles.importTypeButtonActive
                ]}
                onPress={() => setImportType('privateKey')}
              >
                <Text style={[
                  styles.importTypeButtonText,
                  importType === 'privateKey' && styles.importTypeButtonTextActive
                ]}>
                  Private Key
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.importTypeButton,
                  importType === 'seedPhrase' && styles.importTypeButtonActive
                ]}
                onPress={() => setImportType('seedPhrase')}
              >
                <Text style={[
                  styles.importTypeButtonText,
                  importType === 'seedPhrase' && styles.importTypeButtonTextActive
                ]}>
                  Seed Phrase
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {importType === 'privateKey' ? 'Private Key' : 'Seed Phrase'}
              </Text>
              <TextInput
                style={styles.inputField}
                value={importInput}
                onChangeText={setImportInput}
                placeholder={
                  importType === 'privateKey' 
                    ? 'Enter your private key (base64 or JSON array format)'
                    : 'Enter your 12 or 24 word seed phrase'
                }
                placeholderTextColor={colors.GRAY}
                multiline={importType === 'seedPhrase'}
                numberOfLines={importType === 'seedPhrase' ? 3 : 1}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Instructions:</Text>
              {importType === 'privateKey' ? (
                <Text style={styles.instructionsText}>
                  • Enter your private key in base64 format or as a JSON array{'\n'}
                  • This will replace your current app wallet{'\n'}
                  • Make sure you have the correct private key for your wallet with funds
                </Text>
              ) : (
                <Text style={styles.instructionsText}>
                  • Enter your 12 or 24 word seed phrase{'\n'}
                  • Words should be separated by spaces{'\n'}
                  • This will replace your current app wallet{'\n'}
                  • Make sure you have the correct seed phrase for your wallet with funds
                </Text>
              )}
            </View>

            {/* Warning */}
            <View style={styles.warningContainer}>
              <Icon name="alert-triangle" size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                Warning: This will replace your current app wallet. Make sure you have the correct credentials for the wallet that contains your funds.
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleImportCancel}
              disabled={importing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importSubmitButton, importing && styles.importSubmitButtonDisabled]}
              onPress={handleImportSubmit}
              disabled={importing || !importInput.trim()}
            >
              {importing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.importSubmitButtonText}>Import Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ExternalWalletConnectionScreen;