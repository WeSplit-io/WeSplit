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
  Image,
} from 'react-native';
import Icon from '../Icon';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { walletService } from '../../services/blockchain/wallet';

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
    // Map provider keys to Firebase Storage URLs
    const iconMap: { [key: string]: any } = {
      'phantom': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a' },
      'solflare': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsolflare-logo.png?alt=media&token=36e5b0d8-5f20-4eba-a5fb-5f1b2063926d' },
      'backpack': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbackpack-logo.png?alt=media&token=8624ee25-0f7d-475f-baad-3c80ad66d0aa' },
      'slope': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fslope-logo.png?alt=media&token=b5039c6d-9438-4b96-a9c3-22a1dec74bd0' },
      'glow': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fglow-logo.png?alt=media&token=707a5ab3-e81d-48e0-9391-49169cf37872' },
      'exodus': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fexodus-logo.png?alt=media&token=57837099-dd80-4b70-8a3b-600cd2e10132' },
      'coinbase': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoinbase-logo.png?alt=media&token=8b4331c1-3f9d-4f57-907c-53a2f0d8b137' },
      'okx': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fokx-logo.png?alt=media&token=504420f4-acd0-4c3d-be8d-bccdae6c0509' },
      'brave': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbrave-logo.png?alt=media&token=62079355-59e2-48da-989b-b795873f8be6' },
      'cluster': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' },
      'magic-eden': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmagiceden-logo.png?alt=media&token=00c68158-c015-4056-a513-cfb2763017e3' },
      'talisman': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftalisman-logo.png?alt=media&token=0f95aee3-3c56-4d0f-b6ad-617b8c46bbdf' },
      'xdefi': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fxdefi-logo.png?alt=media&token=f429ac0c-bf51-4890-9998-19bb353d4752' },
      'zerion': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fzerion-logo.png?alt=media&token=27b12d12-569e-4051-8074-8c80c7aa0175' },
      'trust': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrustwallet-logo.png?alt=media&token=f376904f-5032-4ad6-8572-15502018881c' },
      'safepal': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsafepal-logo.png?alt=media&token=c2ed8958-ff46-4f44-bc20-372426e3d235' },
      'bitget': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbitget-logo.png?alt=media&token=fbe986bd-e5ef-488e-87c0-7fa860cb9a39' },
      'bybit': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbybit-logo.png?alt=media&token=77756071-5994-4ba8-b173-7ff617e2bb9b' },
      'gate': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgate-logo.png?alt=media&token=d551e2d3-e180-4cc0-b9f3-914a174b2d5e' },
      'huobi': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhuobi-logo.png?alt=media&token=aa0417be-fae6-4e55-a9f3-4e46fd837c6f' },
      'kraken': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkraken-logo.png?alt=media&token=b97dc798-92d6-4d5c-aa26-a2727c025d93' },
      'binance': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbinance-logo.png?alt=media&token=3880f1e5-d8a0-4494-af9f-997ba91e6ce0' },
      'math': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmathwallet-logo.png?alt=media&token=93173eb3-f83f-4b49-abeb-0334621205a3' },
      'tokenpocket': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftokenpocket-logo.png?alt=media&token=4d31dd0f-1d69-4bd5-a024-52239dedb53d' },
      'onto': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fonto-logo.png?alt=media&token=ab746131-d390-4dbc-b94b-f4c7efecf753' },
      'imtoken': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fimtoken-logo.png?alt=media&token=878e8b4b-6c6a-4b38-828d-c402d56352b4' },
      'coin98': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcoin98-logo.png?alt=media&token=e217c873-7346-47be-bc7b-acee7e9559ee' },
      'blocto': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fblocto-logo.png?alt=media&token=65abdd59-1fc7-4e8b-ad25-0c29df68f412' },
      'nightly': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fnightly-logo.png?alt=media&token=d51a8fd6-25d9-41be-8333-c3f46bce0bb3' },
      'clover': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fclover-logo.png?alt=media&token=10b35b99-3100-4e22-b17c-ca522d3e0cd8' },
      'wallet-connect': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwalletconnect-logo.png?alt=media&token=4e2dad45-747f-4cf2-b7f7-ebea73936e41' },
      'metamask': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmetamask-logo.png?alt=media&token=8d75e112-385c-45de-a0b5-ee47e67eb310' },
      'rainbow': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fraimbow-logo.png?alt=media&token=22d86212-70c3-4c53-8a53-ffe1547c36ef' },
      'argent': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fargent-logo.png?alt=media&token=f09e5ed1-88b7-4b80-ae06-198c223b965a' },
      'bravos': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbravos-logo.png?alt=media&token=7c063169-db3e-4396-ad9f-e112b39d688b' },
      'myria': { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmyria-logo.png?alt=media&token=465739a9-f5b3-4691-b6c3-321eab727363' },
    };

    return iconMap[providerKey] || { uri: '' };
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
          <Image
            source={getProviderIcon(provider.name.toLowerCase())}
            style={{
              width: 32,
              height: 32,
              resizeMode: 'contain',
              opacity: isAvailable ? 1 : 0.5,
            }}
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