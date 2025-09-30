/**
 * Privy Wallet Manager Component for WeSplit
 * Manages wallet operations through Privy
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { usePrivyAuth } from '../hooks/usePrivyAuth';
import { colors, spacing, typography } from '../theme';

interface PrivyWalletManagerProps {
  style?: any;
}

export const PrivyWalletManager: React.FC<PrivyWalletManagerProps> = ({ style }) => {
  const {
    authenticated,
    wallets,
    activeWallet,
    createWallet,
    exportWallet,
    setActiveWallet,
    isLoading,
  } = usePrivyAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCreateWallet = async () => {
    try {
      setIsCreating(true);
      await createWallet();
      Alert.alert('Success', 'Wallet created successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportWallet = async () => {
    if (!activeWallet) {
      Alert.alert('Error', 'No active wallet to export');
      return;
    }

    try {
      setIsExporting(true);
      const exportResult = await exportWallet();
      Alert.alert('Success', 'Wallet exported successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export wallet';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSetActiveWallet = async (walletAddress: string) => {
    try {
      await setActiveWallet(walletAddress);
      Alert.alert('Success', 'Active wallet updated!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active wallet';
      Alert.alert('Error', errorMessage);
    }
  };

  if (!authenticated) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.notAuthenticatedText}>
          Please sign in to manage your wallets
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loadingText}>Loading wallets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]}>
      <Text style={styles.title}>Wallet Management</Text>

      {/* Active Wallet */}
      {activeWallet && (
        <View style={styles.activeWalletContainer}>
          <Text style={styles.sectionTitle}>Active Wallet</Text>
          <View style={styles.walletCard}>
            <Text style={styles.walletAddress}>
              {activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
            </Text>
            <Text style={styles.walletType}>
              {activeWallet.walletClientType || 'Embedded Wallet'}
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.exportButton]}
              onPress={handleExportWallet}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Export Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* All Wallets */}
      <View style={styles.walletsContainer}>
        <Text style={styles.sectionTitle}>All Wallets ({wallets.length})</Text>
        
        {wallets.length === 0 ? (
          <View style={styles.noWalletsContainer}>
            <Text style={styles.noWalletsText}>No wallets found</Text>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateWallet}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {wallets.map((wallet, index) => (
              <View key={wallet.address} style={styles.walletCard}>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletAddress}>
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </Text>
                  <Text style={styles.walletType}>
                    {wallet.walletClientType || 'Embedded Wallet'}
                  </Text>
                  {wallet.address === activeWallet?.address && (
                    <Text style={styles.activeIndicator}>● Active</Text>
                  )}
                </View>
                
                {wallet.address !== activeWallet?.address && (
                  <TouchableOpacity
                    style={[styles.button, styles.setActiveButton]}
                    onPress={() => handleSetActiveWallet(wallet.address)}
                  >
                    <Text style={styles.buttonText}>Set Active</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateWallet}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create New Wallet</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Wallet Information */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>About Privy Wallets</Text>
        <Text style={styles.infoText}>
          • Embedded wallets are created and managed by Privy
        </Text>
        <Text style={styles.infoText}>
          • You can export your wallet to use with other applications
        </Text>
        <Text style={styles.infoText}>
          • Each wallet is secured with your authentication method
        </Text>
        <Text style={styles.infoText}>
          • You can have multiple wallets for different purposes
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
  },
  notAuthenticatedText: {
    fontSize: typography.fontSize.lg,
    color: colors.textLightSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  activeWalletContainer: {
    marginBottom: spacing.lg,
  },
  walletsContainer: {
    marginBottom: spacing.lg,
  },
  walletCard: {
    backgroundColor: colors.darkCard,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  walletInfo: {
    marginBottom: spacing.sm,
  },
  walletAddress: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
    fontFamily: 'monospace',
  },
  walletType: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginTop: spacing.xs,
  },
  activeIndicator: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  createButton: {
    backgroundColor: colors.primaryGreen,
    marginTop: spacing.md,
  },
  exportButton: {
    backgroundColor: colors.warning,
    alignSelf: 'flex-start',
  },
  setActiveButton: {
    backgroundColor: colors.success,
    alignSelf: 'flex-start',
  },
  noWalletsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noWalletsText: {
    fontSize: typography.fontSize.md,
    color: colors.textLightSecondary,
    marginBottom: spacing.md,
  },
  infoContainer: {
    backgroundColor: colors.darkCardSecondary,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textLightSecondary,
    marginBottom: spacing.xs,
  },
});

export default PrivyWalletManager;
