import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { externalWalletAuthService, WalletProvider } from '../../services/externalWalletAuthService';
import { walletConnectionService } from '../../services/walletConnectionService';

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
    if (provider.logoUrl) {
      return (
        <Image
          source={{ uri: provider.logoUrl }}
          style={styles.walletLogo}
          resizeMode="contain"
        />
      );
    }
    
    // Fallback to icon if logo URL is not available
    return (
      <Text style={styles.walletIcon}>{provider.icon}</Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Connect External Wallet</Text>
        <View style={styles.headerSpacer} />
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
        {providers.map((provider, index) => (
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
                  <Text style={styles.providerName}>{provider.name}</Text>
                  {provider.isAvailable && (
                    <View style={styles.detectedBadge}>
                      <Text style={styles.detectedText}>Detected</Text>
                    </View>
                  )}
                </View>
              </View>
              {!provider.isAvailable && (
                <Text style={styles.providerUnavailable}>Not available</Text>
              )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSpacer: {
    width: 48, // Same width as back button for centering
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  description: {
    color: colors.textLight,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textLight,
    marginTop: spacing.md,
  },
  providerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white10,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  providerButtonDisabled: {
    opacity: 0.5,
  },
  providerInfo: {
    flex: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  walletLogoContainer: {
    marginRight: spacing.sm,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  walletIcon: {
    fontSize: 24,
  },
  providerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  detectedBadge: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
  },
  detectedText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  providerUnavailable: {
    color: colors.textLightSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textLightSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ExternalWalletConnectionScreen; 