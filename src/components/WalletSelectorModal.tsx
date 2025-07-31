import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme';
import { SUPPORTED_WALLET_PROVIDERS } from '../services/solanaAppKitService';

interface WalletSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    isConnected,
    walletName,
    connectToExternalWallet,
    getAvailableProviders,
    isProviderAvailable,
    isLoading,
  } = useWallet();

  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadAvailableProviders();
    }
  }, [visible]);

  const loadAvailableProviders = () => {
    const providers = getAvailableProviders();
    setAvailableProviders(providers);
  };

  const handleConnectToProvider = async (providerKey: string, providerName: string) => {
    if (!isProviderAvailable(providerKey)) {
      Alert.alert('Unavailable', `${providerName} is not available on this device.`);
      return;
    }

    try {
      setConnectingProvider(providerKey);
      await connectToExternalWallet(providerKey);
      Alert.alert('Success', `Connected to ${providerName}!`);
      onClose();
    } catch (error) {
      console.error(`Error connecting to ${providerName}:`, error);
      Alert.alert(
        'Connection Failed',
        `Failed to connect to ${providerName}. Please try again.`
      );
    } finally {
      setConnectingProvider(null);
    }
  };

  const getProviderIcon = (providerKey: string) => {
    // Map provider keys to icon names
    const iconMap: { [key: string]: string } = {
      [SUPPORTED_WALLET_PROVIDERS.PHANTOM]: 'phantom',
      [SUPPORTED_WALLET_PROVIDERS.SOLFLARE]: 'solflare',
      [SUPPORTED_WALLET_PROVIDERS.BACKPACK]: 'backpack',
      [SUPPORTED_WALLET_PROVIDERS.SLOPE]: 'slope',
      [SUPPORTED_WALLET_PROVIDERS.GLOW]: 'glow',
      [SUPPORTED_WALLET_PROVIDERS.EXODUS]: 'exodus',
      [SUPPORTED_WALLET_PROVIDERS.COINBASE]: 'coinbase',
      [SUPPORTED_WALLET_PROVIDERS.OKX]: 'okx',
      [SUPPORTED_WALLET_PROVIDERS.BRAVE]: 'brave',
      [SUPPORTED_WALLET_PROVIDERS.CLUSTER]: 'cluster',
      [SUPPORTED_WALLET_PROVIDERS.MAGIC_EDEN]: 'magic-eden',
      [SUPPORTED_WALLET_PROVIDERS.TALISMAN]: 'talisman',
      [SUPPORTED_WALLET_PROVIDERS.XDEFI]: 'xdefi',
      [SUPPORTED_WALLET_PROVIDERS.ZERION]: 'zerion',
      [SUPPORTED_WALLET_PROVIDERS.TRUST]: 'trust',
      [SUPPORTED_WALLET_PROVIDERS.SAFEPAL]: 'safepal',
      [SUPPORTED_WALLET_PROVIDERS.BITGET]: 'bitget',
      [SUPPORTED_WALLET_PROVIDERS.BYBIT]: 'bybit',
      [SUPPORTED_WALLET_PROVIDERS.GATE]: 'gate',
      [SUPPORTED_WALLET_PROVIDERS.HUOBI]: 'huobi',
      [SUPPORTED_WALLET_PROVIDERS.KRAKEN]: 'kraken',
      [SUPPORTED_WALLET_PROVIDERS.BINANCE]: 'binance',
      [SUPPORTED_WALLET_PROVIDERS.MATH]: 'math',
      [SUPPORTED_WALLET_PROVIDERS.TOKENPOCKET]: 'tokenpocket',
      [SUPPORTED_WALLET_PROVIDERS.ONTO]: 'onto',
      [SUPPORTED_WALLET_PROVIDERS.IMTOKEN]: 'imtoken',
      [SUPPORTED_WALLET_PROVIDERS.COIN98]: 'coin98',
      [SUPPORTED_WALLET_PROVIDERS.BLOCTO]: 'blocto',
      [SUPPORTED_WALLET_PROVIDERS.NIGHTLY]: 'nightly',
      [SUPPORTED_WALLET_PROVIDERS.CLOVER]: 'clover',
      [SUPPORTED_WALLET_PROVIDERS.WALLET_CONNECT]: 'wallet-connect',
      [SUPPORTED_WALLET_PROVIDERS.METAMASK]: 'metamask',
      [SUPPORTED_WALLET_PROVIDERS.RAINBOW]: 'rainbow',
      [SUPPORTED_WALLET_PROVIDERS.ARGENT]: 'argent',
      [SUPPORTED_WALLET_PROVIDERS.BRAVOS]: 'bravos',
      [SUPPORTED_WALLET_PROVIDERS.MYRIA]: 'myria',
    };

    return iconMap[providerKey] || 'wallet';
  };

  const renderProviderItem = (provider: any) => {
    const isConnecting = connectingProvider === provider.name.toLowerCase();
    const isAvailable = provider.isAvailable;

    return (
      <TouchableOpacity
        key={provider.name}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            marginBottom: 8,
            opacity: isAvailable ? 1 : 0.5,
          },
          isConnecting && { backgroundColor: '#00000010' },
        ]}
        onPress={() => {
          if (isAvailable && !isConnecting) {
            handleConnectToProvider(provider.name.toLowerCase(), provider.name);
          }
        }}
        disabled={!isAvailable || isConnecting}
      >
        <View style={{ marginRight: 12 }}>
          <Icon
            name={getProviderIcon(provider.name.toLowerCase())}
            size={32}
            color={isAvailable ? '#000000' : '#666666'}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isAvailable ? '#000000' : '#666666',
            }}
          >
            {provider.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#666666',
              marginTop: 2,
            }}
          >
            {isAvailable ? 'Available' : 'Not available'}
          </Text>
        </View>

        {isConnecting && (
          <ActivityIndicator size="small" color="#000000" />
        )}

        {!isConnecting && isAvailable && (
          <Icon name="chevron-right" size={20} color="#666666" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#A5EA15' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#00000020',
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Icon name="x" size={24} color="#000000" />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000',
            }}
          >
            Connect Wallet
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1, padding: 16, backgroundColor: '#A5EA15' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Status */}
          {isConnected && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: '#00000020',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: 4,
                }}
              >
                Currently Connected
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: '#000000',
                }}
              >
                {walletName || 'External Wallet'}
              </Text>
            </View>
          )}

          {/* Available Providers */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 16,
            }}
          >
            Available Wallets
          </Text>

          {availableProviders.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                padding: 32,
              }}
            >
              <Icon name="alert-circle" size={48} color="#666666" />
              <Text
                style={{
                  fontSize: 16,
                  color: '#666666',
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                No wallet providers available
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#666666',
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Please install a supported wallet app
              </Text>
            </View>
          ) : (
            availableProviders.map(renderProviderItem)
          )}

          {/* Info Section */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              padding: 16,
              borderRadius: 12,
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 8,
              }}
            >
              About Wallet Connections
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#666666',
                lineHeight: 18,
              }}
            >
              Connecting an external wallet allows you to use your existing Solana
              wallet with WeSplit. Your private keys remain secure in your wallet
              app and are never shared with WeSplit.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default WalletSelectorModal; 