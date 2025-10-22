import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { walletService, WalletProvider } from '../../services/WalletService';
import { styles } from './styles';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/loggingService';
import { Container } from '../../components/shared';

interface ExternalWalletConnectionScreenProps {
  navigation: any;
  route: any;
}

const ExternalWalletConnectionScreen: React.FC<ExternalWalletConnectionScreenProps> = ({
  navigation,
  route,
}) => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<WalletProvider[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { state } = useApp();
  const currentUser = state.currentUser;

  useEffect(() => {
    loadProviders();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProviders();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Loading providers', null, 'ExternalWalletConnectionScreen');
      
      const availableProviders = await walletService.getAvailableProviders();
      logger.info('Available providers', { providers: availableProviders.map(p => `${p.name} (${p.isAvailable ? 'Available' : 'Not Available'})`) }, 'ExternalWalletConnectionScreen');
      
      setProviders(availableProviders);
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
      logger.info('Starting connection to', { providerName: provider.name }, 'ExternalWalletConnectionScreen');
      
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Connect to external wallet provider
      const result = await walletService.connectToProvider(provider.name);

      if (result && result.address) {
        Alert.alert(
          'Wallet Connected',
          `Successfully connected to ${provider.name}!\n\nWallet Address: ${result.address?.substring(0, 8)}...`,
          [{ 
            text: 'OK',
            onPress: () => {
              // Navigate back to wallet management
              navigation.goBack();
            }
          }]
        );
      } else {
        // Handle connection failure
        Alert.alert(
          'Connection Failed',
          'Failed to connect to the external wallet. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ ExternalWalletConnection: Connection failed:', error);
      setError(`Failed to connect to ${provider.name}: ${error}`);
      Alert.alert('Connection Failed', `Failed to connect to ${provider.name}. Please try again.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const renderWalletLogo = (provider: WalletProvider) => {
    return (
      <Image
        source={{ uri: provider.logoUrl }}
        style={styles.walletLogo}
        resizeMode="contain"
      />
    );
  };

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primaryGreen]}
            tintColor={colors.primaryGreen}
          />
        }
      >
        {/* Description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Connect External Wallet</Text>
          <Text style={styles.sectionDescription}>
            Link your external Solana wallet to your WeSplit account. This allows you to fund your app wallet and manage your funds across different wallets.
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

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
            if (a.isAvailable && !b.isAvailable) {return -1;}
            if (!a.isAvailable && b.isAvailable) {return 1;}
            return a.name.localeCompare(b.name);
          })
          .map((provider, index) => {
            const isConnecting = connectingProvider === provider.name;
            
            return (
              <TouchableOpacity
                key={`${provider.name}-${index}`}
                style={[
                  styles.providerButton,
                  !provider.isAvailable && styles.providerButtonDisabled
                ]}
                onPress={() => handleConnectWallet(provider)}
                disabled={isConnecting}
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
                            Not detected on device
                          </Text>
                        )}
                      </View>
                      {provider.isAvailable ? (
                        <View style={styles.detectedBadge}>
                          <Text style={styles.detectedText}>Available</Text>
                        </View>
                      ) : (
                        <View style={[styles.detectedBadge, { backgroundColor: colors.warning }]}>
                          <Text style={styles.detectedText}>Install</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {isConnecting ? (
                  <ActivityIndicator size="small" color={colors.primaryGreen} />
                ) : (
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={colors.white}
                  />
                )}
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By connecting your wallet, you agree to sign a message to verify ownership and link it to your WeSplit account.
        </Text>
      </View>
    </Container>
  );
};

export default ExternalWalletConnectionScreen;
