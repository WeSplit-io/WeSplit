import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { walletService } from '../../services/blockchain/wallet';
import { colors, spacing, typography } from '../../theme';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';

interface FundTransferScreenProps {
  navigation: any;
  route: any;
}

const FundTransferScreen: React.FC<FundTransferScreenProps> = ({ navigation, route }) => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [linkedWallets, setLinkedWallets] = useState<WalletLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletLink | null>(null);
  const [amount, setAmount] = useState('');
  const [appWalletAddress, setAppWalletAddress] = useState('');

  useEffect(() => {
    loadLinkedWallets();
    loadAppWalletAddress();
  }, []);

  const loadLinkedWallets = async () => {
    try {
      setLoading(true);
      if (!currentUser?.id) {
        logger.warn('No current user', null, 'FundTransferScreen');
        return;
      }

      logger.info('Loading linked wallets for user', { userId: currentUser.id }, 'FundTransferScreen');
      // Get linked wallets from walletService
      // getLinkedWallets doesn't exist - using empty array for now
      // const wallets = await walletService.getLinkedWallets(currentUser.id.toString());
      const wallets: any[] = [];
      setLinkedWallets(wallets);
      
      logger.info('Loaded wallets', { count: wallets.length }, 'FundTransferScreen');
    } catch (error) {
      console.error('🔗 FundTransferScreen: Error loading linked wallets:', error);
      Alert.alert('Error', 'Failed to load linked wallets');
    } finally {
      setLoading(false);
    }
  };

  const loadAppWalletAddress = async () => {
    try {
      // In a real implementation, you would get the user's app wallet address
      // For now, we'll use a placeholder
      setAppWalletAddress('E7W2pyGG9Vkc4FWiEyZPUd7sBvNsrKkhqaA6nnRauniF');
    } catch (error) {
      console.error('🔗 FundTransferScreen: Error loading app wallet address:', error);
    }
  };

  const handleTransferFunds = async () => {
    try {
      if (!selectedWallet) {
        Alert.alert('Error', 'Please select a wallet to transfer from');
        return;
      }

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      setTransferring(true);

      logger.info('Starting fund transfer', { from: selectedWallet.walletAddress, to: appWalletAddress, amount: transferAmount, currency: 'SOL' }, 'FundTransferScreen');

      // Transfer funds using the secure wallet linking service
      // Wallet linking functionality moved to walletService
      const transferResult = { success: false, error: 'Transfer functionality not implemented' }; // Placeholder

      if (transferResult.success) {
        Alert.alert(
          'Transfer Successful',
          `Successfully transferred ${transferAmount} SOL to your app wallet!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Transfer Failed', transferResult.error || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('🔗 FundTransferScreen: Error transferring funds:', error);
      Alert.alert('Error', 'Failed to transfer funds');
    } finally {
      setTransferring(false);
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Loading linked wallets...</Text>
      </View>
    );
  }

  return (
    <Container>
      <Header 
        title="Transfer Funds"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView style={styles.scrollView}>
        {/* App Wallet Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your App Wallet</Text>
          <View style={styles.walletCard}>
            <Text style={styles.walletName}>WeSplit App Wallet</Text>
            <Text style={styles.walletAddress}>
              {formatWalletAddress(appWalletAddress)}
            </Text>
            <Text style={styles.walletType}>Internal Wallet</Text>
          </View>
        </View>

        {/* Select Source Wallet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Source Wallet</Text>
          {linkedWallets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Linked Wallets</Text>
              <Text style={styles.emptySubtitle}>
                You need to link an external wallet first to transfer funds.
              </Text>
              <TouchableOpacity 
                style={styles.linkWalletButton}
                onPress={() => navigation.navigate('ExternalWalletConnection')}
              >
                <Text style={styles.linkWalletButtonText}>Link External Wallet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            linkedWallets.map((wallet) => (
              <TouchableOpacity
                key={wallet.id}
                style={[
                  styles.walletCard,
                  selectedWallet?.id === wallet.id && styles.selectedWalletCard
                ]}
                onPress={() => setSelectedWallet(wallet)}
              >
                <View style={styles.walletHeader}>
                  <Text style={styles.walletName}>{wallet.walletName}</Text>
                  <View style={styles.walletTypeBadge}>
                    <Text style={styles.walletTypeText}>{wallet.walletType}</Text>
                  </View>
                </View>
                <Text style={styles.walletAddress}>
                  {formatWalletAddress(wallet.walletAddress)}
                </Text>
                <Text style={styles.walletLinkedDate}>
                  Linked: {formatDate(wallet.linkedAt)}
                </Text>
                {wallet.balance !== undefined && (
                  <Text style={styles.walletBalance}>
                    Balance: {wallet.balance.toFixed(4)} SOL
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Transfer Amount */}
        {selectedWallet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transfer Amount</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount in SOL"
                placeholderTextColor={colors.textLightSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.currencyLabel}>SOL</Text>
            </View>
            <Text style={styles.amountHint}>
              Transfer from {selectedWallet.walletName} to your app wallet
            </Text>
          </View>
        )}

        {/* Transfer Button */}
        {selectedWallet && amount && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.transferButton,
                transferring && styles.transferButtonDisabled
              ]}
              onPress={handleTransferFunds}
              disabled={transferring}
            >
              {transferring ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.transferButtonText}>Transfer Funds</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
  },
  header: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 12,
  },
  walletCard: {
    backgroundColor: colors.darkCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    marginBottom: 12,
  },
  selectedWalletCard: {
    borderColor: colors.primaryGreen,
    borderWidth: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textLight,
  },
  walletTypeBadge: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  walletAddress: {
    fontSize: 14,
    color: colors.textLight,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  walletType: {
    fontSize: 14,
    color: colors.textLightSecondary,
    marginBottom: 4,
  },
  walletLinkedDate: {
    fontSize: 14,
    color: colors.textLightSecondary,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textLightSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  linkWalletButton: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkWalletButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.darkBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: colors.textLight,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textLight,
    marginLeft: 8,
  },
  amountHint: {
    fontSize: 14,
    color: colors.textLightSecondary,
    marginTop: 8,
  },
  transferButton: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FundTransferScreen; 