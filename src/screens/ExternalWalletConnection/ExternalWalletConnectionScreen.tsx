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
        logoSource = require('../../../assets/backpack-logo.png');
        break;
      case 'metamask':
        logoSource = require('../../../assets/metamask-logo.png');
        break;
      case 'walletconnect':
        logoSource = require('../../../assets/walletconnect-logo.png');
        break;
      case 'exodus':
        logoSource = require('../../../assets/exodus-logo.png');
        break;
      case 'glow':
        logoSource = require('../../../assets/glow-logo.png');
        break;
      case 'slope':
        logoSource = require('../../../assets/slope-logo.png');
        break;
      case 'solflare':
        logoSource = require('../../../assets/solflare-logo.png');
        break;
      case 'zerion':
        logoSource = require('../../../assets/zerion-logo.png');
        break;
      case 'xdefi':
        logoSource = require('../../../assets/xdefi-logo.png');
        break;
      case 'trust wallet':
        logoSource = require('../../../assets/trustwallet-logo.png');
        break;
      case 'talisman':
        logoSource = require('../../../assets/talisman-logo.png');
        break;
      case 'safepal':
        logoSource = require('../../../assets/safepal-logo.png');
        break;
      case 'rainbow':
        logoSource = require('../../../assets/raimbow-logo.png');
        break;
      case 'onto':
        logoSource = require('../../../assets/onto-logo.png');
        break;
      case 'okx':
        logoSource = require('../../../assets/okx-logo.png');
        break;
      case 'nightly':
        logoSource = require('../../../assets/nightly-logo.png');
        break;
      case 'myria':
        logoSource = require('../../../assets/myria-logo.png');
        break;
      case 'math wallet':
        logoSource = require('../../../assets/mathwallet-logo.png');
        break;
      case 'magic eden':
        logoSource = require('../../../assets/magiceden-logo.png');
        break;
      case 'kraken':
        logoSource = require('../../../assets/kraken-logo.png');
        break;
      case 'imtoken':
        logoSource = require('../../../assets/imtoken-logo.png');
        break;
      case 'huobi':
        logoSource = require('../../../assets/huobi-logo.png');
        break;
      case 'gate.io':
        logoSource = require('../../../assets/gate-logo.png');
        break;
      case 'coinbase':
        logoSource = require('../../../assets/coinbase-logo.png');
        break;
      case 'coin98':
        logoSource = require('../../../assets/coin98-logo.png');
        break;
      case 'clover':
        logoSource = require('../../../assets/clover-logo.png');
        break;
      case 'bybit':
        logoSource = require('../../../assets/bybit-logo.png');
        break;
      case 'bravos':
        logoSource = require('../../../assets/bravos-logo.png');
        break;
      case 'brave':
        logoSource = require('../../../assets/brave-logo.png');
        break;
      case 'blocto':
        logoSource = require('../../../assets/blocto-logo.png');
        break;
      case 'bitget':
        logoSource = require('../../../assets/bitget-logo.png');
        break;
      case 'binance':
        logoSource = require('../../../assets/binance-logo.png');
        break;
      case 'argent':
        logoSource = require('../../../assets/argent-logo.png');
        break;
      case 'ud':
        logoSource = require('../../../assets/ud-logo.png');
        break;
      case 'tokenpocket':
        logoSource = require('../../../assets/tokenpocket-logo.png');
        break;
      default:
        logoSource = require('../../../assets/phantom-logo.png');
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
            source={require('../../../assets/arrow-left.png')}
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