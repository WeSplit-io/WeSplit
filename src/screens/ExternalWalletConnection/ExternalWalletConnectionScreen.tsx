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
} from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { externalWalletAuthService, WalletProvider } from '../../services/externalWalletAuthService';
import { walletConnectionService } from '../../services/walletConnectionService';
import { styles } from './styles';
import { solanaAppKitService } from '../../services/solanaAppKitService';
import { walletLogoService } from '../../services/walletLogoService';
import { solanaWalletAdapterService } from '../../services/solanaWalletAdapterService';
import { walletLinkingService } from '../../services/walletLinkingService';
import { useApp } from '../../context/AppContext';
import { realWalletAdapterService } from '../../services/realWalletAdapterService';
import { walletWebSocketService } from '../../services/walletWebSocketService';
import { mobileWalletAdapterService } from '../../services/mobileWalletAdapterService';
import { solanaMobileStackService } from '../../services/solanaMobileStackService';
import { phantomDirectService } from '../../services/phantomDirectService';
import { phantomWalletLinkingService } from '../../services/phantomWalletLinkingService';

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

  useEffect(() => {
    loadProviders();
  }, []);

  // Test function to verify Alert dialogs work
  const testAlertDialog = () => {
    console.log('🔍 DEBUG: Testing Alert dialog...');
    Alert.alert(
      'Test Alert',
      'This is a test alert to verify dialogs are working.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => console.log('🔍 DEBUG: Test alert OK pressed') }
      ]
    );
  };

  // Debug function to test wallet detection
  const debugWalletDetection = async () => {
    try {
      console.log('🔍 DEBUG: Testing wallet detection...');
      
      // Test direct access to solanaAppKitService
      const appKitProviders = solanaAppKitService.getAvailableProviders();
      console.log('🔍 DEBUG: AppKit providers:', appKitProviders.map(p => p.name));
      
      // Test walletLogoService
      const logoWallets = await walletLogoService.getAvailableWallets();
      console.log('🔍 DEBUG: Logo service wallets:', logoWallets.map(w => `${w.name} (${w.isAvailable})`));
      
      // Test externalWalletAuthService
      const authProviders = await externalWalletAuthService.getAvailableProviders();
      console.log('🔍 DEBUG: Auth service providers:', authProviders.map(p => `${p.name} (${p.isAvailable})`));
      
      // Test Phantom specifically
      const phantomWallet = logoWallets.find(w => w.name.toLowerCase() === 'phantom');
      console.log('🔍 DEBUG: Phantom wallet details:', phantomWallet);
      
      // Test Phantom deep link schemes
      await phantomDirectService.testPhantomSchemes();
      
      // Test Phantom opening approaches
      await solanaMobileStackService.testPhantomOpening();
      
      Alert.alert(
        'Debug Info',
        `AppKit: ${appKitProviders.length} providers\nLogo: ${logoWallets.length} wallets\nAuth: ${authProviders.length} providers\nPhantom: ${phantomWallet ? (phantomWallet.isAvailable ? 'Available' : 'Not Available') : 'Not Found'}\n\nCheck console for detailed scheme testing.`
      );
    } catch (error) {
      console.error('🔍 DEBUG: Error in wallet detection test:', error);
      Alert.alert('Debug Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Get the correct app store URL for a specific wallet
  const getWalletStoreUrl = (walletName: string, platform: string): string => {
    const walletStoreUrls: { [key: string]: { ios: string; android: string } } = {
      'Phantom': {
        ios: 'https://apps.apple.com/app/phantom-crypto-wallet/id1598432977',
        android: 'https://play.google.com/store/apps/details?id=app.phantom'
      },
      'Solflare': {
        ios: 'https://apps.apple.com/app/solflare-wallet/id1580902717',
        android: 'https://play.google.com/store/apps/details?id=com.solflare.wallet'
      },
      'Backpack': {
        ios: 'https://apps.apple.com/app/backpack-wallet/id6443944476',
        android: 'https://play.google.com/store/apps/details?id=com.backpack.app'
      },
      'Slope': {
        ios: 'https://apps.apple.com/app/slope-wallet/id1574624530',
        android: 'https://play.google.com/store/apps/details?id=com.slope.finance'
      }
    };
    
    const walletUrls = walletStoreUrls[walletName];
    if (walletUrls) {
      return platform === 'ios' ? walletUrls.ios : walletUrls.android;
    }
    
    // Fallback to search
    return platform === 'ios' 
      ? `https://apps.apple.com/search?term=${encodeURIComponent(walletName)}`
      : `https://play.google.com/store/search?q=${encodeURIComponent(walletName)}`;
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      console.log('🔍 ExternalWalletConnection: Loading providers...');
      
      const availableProviders = await externalWalletAuthService.getAvailableProviders();
      console.log('🔍 ExternalWalletConnection: Available providers:', availableProviders.map(p => `${p.name} (${p.isAvailable ? 'Available' : 'Not Available'})`));
      
      setProviders(availableProviders);
      
      // Debug: Check if Phantom is in the list
      const phantomProvider = availableProviders.find(p => p.name.toLowerCase() === 'phantom');
      console.log('🔍 ExternalWalletConnection: Phantom provider found:', phantomProvider);
      
      // Only add Phantom as fallback if it's completely missing from the list
      if (!phantomProvider) {
        console.log('🔍 ExternalWalletConnection: Adding Phantom as fallback provider');
        const fallbackPhantom = {
          name: 'Phantom',
          icon: '👻',
          logoUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.png',
          isAvailable: false, // Start as false, will be tested by the service
          connect: async () => ({ address: '', publicKey: null, balance: 0, walletName: 'Phantom' }),
          disconnect: async () => {},
          signTransaction: async (transaction: any) => transaction,
          signMessage: async (message: any) => message
        };
        setProviders([fallbackPhantom, ...availableProviders]);
      }
      
    } catch (error) {
      console.error('Error loading providers:', error);
      Alert.alert('Error', 'Failed to load available wallet providers');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async (provider: WalletProvider) => {
    if (!provider.isAvailable) {
      // Provide helpful installation instructions
      const installMessage = `${provider.name} is not installed on your device. Would you like to install it?`;
      Alert.alert(
        'Wallet Not Available',
        installMessage,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Install',
            onPress: () => {
              // Open the appropriate app store with specific wallet links
              const { Linking, Platform } = require('react-native');
              
              // Get the correct store URL for the specific wallet
              const storeUrl = getWalletStoreUrl(provider.name, Platform.OS);
              
              Linking.openURL(storeUrl).catch((error: any) => {
                console.error('Error opening app store:', error);
                Alert.alert('Error', 'Could not open app store');
              });
            }
          }
        ]
      );
      return;
    }

    try {
      setConnectingProvider(provider.name);
      setStep('connecting');

      console.log(`🔗 ExternalWalletConnection: Starting connection to ${provider.name}...`);

      // For Phantom, use the direct connection method
      if (provider.name.toLowerCase() === 'phantom') {
        console.log('🔗 ExternalWalletConnection: Using direct Phantom connection...');
        
        // Step 1: Connect to Phantom using secure wallet linking service
        console.log('🔗 ExternalWalletConnection: Starting secure Phantom wallet linking...');
        
        // Get user ID for linking
        const userId = currentUser?.id?.toString();
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Use secure wallet linking with message signing
        const linkingResult = await phantomWalletLinkingService.linkWalletWithSignature(userId, 'Phantom');
        
        if (!linkingResult.success) {
          throw new Error('Failed to link wallet securely');
        }

        console.log('🔗 ExternalWalletConnection: Phantom wallet linked securely with signature:', linkingResult.signature);

        // Step 2: Get the wallet address from the linking result
        const walletAddress = linkingResult.publicKey;
        
        // Step 3: Show success message
        Alert.alert(
          'Wallet Linked Securely',
          `Your Phantom wallet has been securely linked to your account!\n\nWallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}\nSignature: ${linkingResult.signature.slice(0, 16)}...\n\nYour wallet is now authorized for secure transactions.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate back with success result
                navigation.goBack();
                // You can also pass the result back to the previous screen if needed
                if (route.params?.onSuccess) {
                  route.params.onSuccess({
                    success: true,
                    walletAddress: walletAddress,
                    walletName: 'Phantom',
                    balance: 0,
                    linked: true,
                    signature: linkingResult.signature
                  });
                }
              }
            }
          ]
        );
        
        return;
      }

      // For other wallets, use the wallet connection service
      const connectionResult = await walletConnectionService.connectWallet({
        provider: provider.name,
        showInstallPrompt: false // Don't show install prompt since we already checked availability
      });

      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Connection failed');
      }

      // Step 2: Request transaction signing for authentication
      setStep('signing');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate signing time

      // Step 3: Verify the transaction
      setStep('verifying');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate verification time

      // Step 4: Complete authentication
      const result = await externalWalletAuthService.connectWithAuthentication(provider.name);

      if (result.success) {
        Alert.alert(
          'Connection Successful',
          `Successfully connected to ${provider.name}!\n\nWallet: ${result.walletAddress?.slice(0, 8)}...${result.walletAddress?.slice(-8)}\nBalance: $${(result.balance || 0).toFixed(2)} USDC`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate back with success result
                navigation.goBack();
                // You can also pass the result back to the previous screen if needed
                if (route.params?.onSuccess) {
                  route.params.onSuccess(result);
                }
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Authentication failed');
      }

    } catch (error) {
      console.error('Connection failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      Alert.alert(
        'Connection Failed',
        `Failed to connect to ${provider.name}:\n\n${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setConnectingProvider(null);
      setStep('select');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getStepText = () => {
    switch (step) {
      case 'connecting':
        return 'Connecting to wallet...';
      case 'signing':
        return 'Please sign the authentication transaction in your wallet...';
      case 'verifying':
        return 'Verifying transaction signature...';
      default:
        return 'Select a wallet to connect';
    }
  };

    const renderWalletLogo = (provider: WalletProvider) => {
    // Use specific logos for known providers, Phantom for others
    let logoSource;
    
    switch (provider.name.toLowerCase()) {
      case 'backpack':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbackpack-logo.png?alt=media&token=8624ee25-0f7d-475f-baad-3c80ad66d0aa' };
        break;
      case 'metamask':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmetamask-logo.png?alt=media&token=8d75e112-385c-45de-a0b5-ee47e67eb310' };
        break;
      case 'walletconnect':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwalletconnect-logo.png?alt=media&token=4e2dad45-747f-4cf2-b7f7-ebea73936e41' };
        break;
      case 'exodus':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fexodus-logo.png?alt=media&token=57837099-dd80-4b70-8a3b-600cd2e10132' };
        break;
      case 'glow':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fglow-logo.png?alt=media&token=707a5ab3-e81d-48e0-9391-49169cf37872' };
        break;
      case 'slope':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fslope-logo.png?alt=media&token=b5039c6d-9438-4b96-a9c3-22a1dec74bd0' };
        break;
      case 'solflare':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsolflare-logo.png?alt=media&token=36e5b0d8-5f20-4eba-a5fb-5f1b2063926d' };
        break;
      case 'zerion':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fzerion-logo.png?alt=media&token=27b12d12-569e-4051-8074-8c80c7aa0175' };
        break;
      case 'xdefi':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fxdefi-logo.png?alt=media&token=f429ac0c-bf51-4890-9998-19bb353d4752' };
        break;
      case 'trust wallet':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrustwallet-logo.png?alt=media&token=f376904f-5032-4ad6-8572-15502018881c' };
        break;
      case 'talisman':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftalisman-logo.png?alt=media&token=0f95aee3-3c56-4d0f-b6ad-617b8c46bbdf' };
        break;
      case 'safepal':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsafepal-logo.png?alt=media&token=c2ed8958-ff46-4f44-bc20-372426e3d235' };
        break;
      case 'rainbow':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fraimbow-logo.png?alt=media&token=22d86212-70c3-4c53-8a53-ffe1547c36ef' };
        break;
      case 'onto':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonto-logo.png?alt=media&token=ab746131-d390-4dbc-b94b-f4c7efecf753' };
        break;
      case 'okx':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fokx-logo.png?alt=media&token=504420f4-acd0-4c3d-be8d-bccdae6c0509' };
        break;
      case 'nightly':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fnightly-logo.png?alt=media&token=d51a8fd6-25d9-41be-8333-c3f46bce0bb3' };
        break;
      case 'myria':
        logoSource = { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmyria-logo.png?alt=media&token=465739a9-f5b3-4691-b6c3-321eab727363' };
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
        <Text style={styles.headerTitle}>Connect External Wallet</Text>
        <TouchableOpacity style={styles.debugButton} onPress={debugWalletDetection}>
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testAlertDialog}>
          <Text style={styles.testButtonText}>Test Alert</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Description */}
        <Text style={styles.description}>
          Connect your external wallet to fund your app wallet. You'll need to sign a transaction to prove wallet ownership.
        </Text>

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
            if (a.isAvailable && !b.isAvailable) return -1;
            if (!a.isAvailable && b.isAvailable) return 1;
            return 0;
          })
          .map((provider, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.providerButton,
              !provider.isAvailable && styles.providerButtonDisabled
            ]}
            onPress={() => handleConnectWallet(provider)}
            disabled={!provider.isAvailable}
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
                      <Text style={styles.providerUnavailable}>Not available</Text>
                    )}


                  </View>
                  {provider.isAvailable && (
                    <View style={styles.detectedBadge}>
                      <Text style={styles.detectedText}>Detected</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={provider.isAvailable ? colors.white : colors.white}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By connecting your wallet, you agree to sign a transaction to verify ownership.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ExternalWalletConnectionScreen; 