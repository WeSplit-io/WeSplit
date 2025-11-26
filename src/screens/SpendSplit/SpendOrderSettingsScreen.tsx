/**
 * SPEND Order Settings Screen
 * Displays order wallet address and private key
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { Split } from '../../services/splits/splitStorageService';
import { SplitWalletService } from '../../services/split';
import { useApp } from '../../context/AppContext';
import { SplitStorageService } from '../../services/splits';
import { logger } from '../../services/analytics/loggingService';

interface SpendOrderSettingsScreenProps {
  navigation: any;
  route: any;
}

const SpendOrderSettingsScreen: React.FC<SpendOrderSettingsScreenProps> = ({
  navigation,
  route,
}) => {
  const { splitData, orderData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [splitWallet, setSplitWallet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load split wallet and create if missing
  React.useEffect(() => {
    const loadWallet = async () => {
      if (!splitData) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to load existing wallet
        if (splitData.walletId) {
          const result = await SplitWalletService.getSplitWallet(splitData.walletId);
          if (result.success && result.wallet) {
            const wallet = result.wallet;
            setSplitWallet(wallet);

            // Fetch private key if user is authenticated
            if (currentUser?.id) {
              try {
                const privateKeyResult = await SplitWalletService.getSplitWalletPrivateKey(
                  splitData.walletId,
                  currentUser.id.toString()
                );
                if (privateKeyResult.success && privateKeyResult.privateKey) {
                  setSplitWallet((prev: any) => ({
                    ...prev,
                    privateKey: privateKeyResult.privateKey,
                  }));
                } else {
                  logger.warn('Private key not available', {
                    walletId: splitData.walletId,
                    error: privateKeyResult.error,
                  }, 'SpendOrderSettingsScreen');
                }
              } catch (pkError) {
                logger.error('Error fetching private key', {
                  error: pkError instanceof Error ? pkError.message : String(pkError),
                }, 'SpendOrderSettingsScreen');
              }
            }
            setIsLoading(false);
            return;
          }
        }

        // No wallet exists - create one for SPEND split
        if (currentUser?.id) {
          logger.info('Creating wallet for SPEND split in settings screen', {
            splitId: splitData.id,
            billId: splitData.billId,
          }, 'SpendOrderSettingsScreen');

          // Create wallet using centralized utility
          const walletResult = await createSpendSplitWallet(
            splitData,
            currentUser.id.toString()
          );

          if (walletResult.success && walletResult.wallet) {
            const newWallet = walletResult.wallet;
            
            // Fetch private key immediately after creation
            try {
              const privateKeyResult = await SplitWalletService.getSplitWalletPrivateKey(
                newWallet.id,
                currentUser.id.toString()
              );
              if (privateKeyResult.success && privateKeyResult.privateKey) {
                setSplitWallet({
                  ...newWallet,
                  privateKey: privateKeyResult.privateKey,
                });
              } else {
                setSplitWallet(newWallet);
              }
            } catch (pkError) {
              logger.warn('Could not fetch private key after wallet creation', {
                error: pkError instanceof Error ? pkError.message : String(pkError),
              }, 'SpendOrderSettingsScreen');
              setSplitWallet(newWallet);
            }
          } else {
            setError(walletResult.error || 'Failed to create wallet');
            // Show user_wallet from orderData as fallback
            const orderDataWallet = orderData?.user_wallet || splitData?.externalMetadata?.orderData?.user_wallet;
            if (orderDataWallet) {
              setSplitWallet({
                address: orderDataWallet,
                privateKey: null,
              });
            }
          }
        } else {
          // No current user - show user_wallet from orderData as fallback
          const orderDataWallet = orderData?.user_wallet || splitData?.externalMetadata?.orderData?.user_wallet;
          if (orderDataWallet) {
            setSplitWallet({
              address: orderDataWallet,
              privateKey: null,
            });
          }
        }
      } catch (error) {
        logger.error('Error loading wallet:', {
          error: error instanceof Error ? error.message : String(error),
        }, 'SpendOrderSettingsScreen');
        setError('Failed to load wallet');
        
        // Show user_wallet from orderData as fallback
        const orderDataWallet = orderData?.user_wallet || splitData?.externalMetadata?.orderData?.user_wallet;
        if (orderDataWallet) {
          setSplitWallet({
            address: orderDataWallet,
            privateKey: null,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadWallet();
  }, [splitData, currentUser, orderData]);

  // Use centralized wallet address formatting utility
  const { formatWalletAddress } = require('../../utils/spend/spendDataUtils');

  const handleCopyAddress = async () => {
    const address = splitWallet?.address || splitWallet?.walletAddress;
    if (!address) return;
    
    try {
      await Clipboard.setString(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleCopyPrivateKey = async () => {
    if (!splitWallet?.privateKey) return;
    
    try {
      await Clipboard.setString(splitWallet.privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy private key');
    }
  };

  const handleTogglePrivateKey = () => {
    if (!splitWallet?.privateKey) {
      Alert.alert('Error', 'Private key not available');
      return;
    }
    setShowPrivateKey(!showPrivateKey);
  };

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Order settings"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </Container>
    );
  }

  if (error && !splitWallet) {
    return (
      <Container>
        <Header
          title="Order settings"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.red }]}>{error}</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Order settings"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <View style={styles.content}>
        {/* Wallet Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Wallet adress</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {splitWallet?.address || splitWallet?.walletAddress
                ? formatWalletAddress(splitWallet.address || splitWallet.walletAddress)
                : 'No wallet address'}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyAddress}
            >
              <PhosphorIcon name="Copy" size={18} color={colors.white} weight="regular" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.privateKeyButton}
              onPress={handleTogglePrivateKey}
            >
              <PhosphorIcon name={showPrivateKey ? "EyeSlash" : "Eye"} size={18} color={colors.white} weight="regular" />
              <Text style={styles.privateKeyButtonText}>Private key</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Private Key Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Private key</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyPrivateKey}
            >
              <PhosphorIcon name="Copy" size={18} color={colors.white} weight="regular" />
            </TouchableOpacity>
          </View>
          <View style={styles.privateKeyContainer}>
            <Text style={[styles.privateKeyText, !showPrivateKey && styles.privateKeyPlaceholder]}>
              {showPrivateKey && splitWallet?.privateKey
                ? splitWallet.privateKey
                : 'Private key'}
            </Text>
          </View>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
  },
  section: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  valueText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.mono,
  },
  copyButton: {
    padding: spacing.xs,
  },
  privateKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs / 2,
  },
  privateKeyButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  privateKeyContainer: {
    backgroundColor: colors.black,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    justifyContent: 'center',
  },
  privateKeyText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontFamily: typography.fontFamily.mono,
  },
  privateKeyPlaceholder: {
    color: colors.white70,
  },
});

export default SpendOrderSettingsScreen;

