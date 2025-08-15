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

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const availableProviders = await externalWalletAuthService.getAvailableProviders();
      setProviders(availableProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
      Alert.alert('Error', 'Failed to load available wallet providers');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async (provider: WalletProvider) => {
    if (!provider.isAvailable) {
      Alert.alert('Not Available', `${provider.name} is not available on this device`);
      return;
    }

    try {
      setConnectingProvider(provider.name);
      setStep('connecting');

      // Use the new wallet connection service
      const connectionResult = await walletConnectionService.connectWallet({
        provider: provider.name,
        showInstallPrompt: true
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
        <View style={styles.placeholder} />
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