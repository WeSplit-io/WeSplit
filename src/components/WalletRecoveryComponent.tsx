/**
 * Wallet Recovery Component
 * Provides UI for users to manually trigger wallet recovery
 * and view recovery status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { walletService } from '../services/WalletService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface WalletRecoveryStatus {
  hasBackup: boolean;
  backupMethods: string[];
  lastBackupTime?: string;
  walletAddress?: string;
}

export const WalletRecoveryComponent: React.FC = () => {
  const { state } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<WalletRecoveryStatus | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const currentUser = state.currentUser;

  useEffect(() => {
    if (currentUser?.email) {
      checkRecoveryStatus();
    }
  }, [currentUser]);

  const checkRecoveryStatus = async () => {
    if (!currentUser?.email || !currentUser?.id) {return;}

    setIsLoading(true);
    try {
      // Wallet backup functionality moved to walletService
      const status = { hasBackup: false, isIntegrityValid: false }; // Placeholder

      setRecoveryStatus({
        hasBackup: status.success,
        backupMethods: Object.entries(status.backupStatus)
          .filter(([_, hasBackup]) => hasBackup)
          .map(([method, _]) => method),
        walletAddress: currentUser.wallet_address
      });
    } catch (error) {
      console.error('Error checking recovery status:', error);
      Alert.alert('Error', 'Failed to check recovery status');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerWalletRecovery = async () => {
    if (!currentUser?.email || !currentUser?.id) {return;}

    Alert.alert(
      'Wallet Recovery',
      'This will attempt to recover your wallet from backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recover',
          onPress: async () => {
            setIsRecovering(true);
            try {
              // Wallet backup functionality moved to walletService
              const result = { success: false, error: 'Backup functionality not implemented' }; // Placeholder

              if (result.success && result.wallet) {
                Alert.alert(
                  'Recovery Successful',
                  `Wallet recovered successfully using ${result.method}.\n\nAddress: ${result.wallet.address}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Refresh the app state
                        window.location.reload();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Recovery Failed',
                  result.error || 'No backup found or recovery failed'
                );
              }
            } catch (error) {
              console.error('Recovery error:', error);
              Alert.alert('Error', 'Recovery failed with an error');
            } finally {
              setIsRecovering(false);
            }
          }
        }
      ]
    );
  };

  const createWalletBackup = async () => {
    if (!currentUser?.email || !currentUser?.id || !currentUser?.wallet_address) {return;}

    setIsLoading(true);
    try {
      // Wallet backup functionality moved to walletService
      const result = { success: false, error: 'Backup functionality not implemented' }; // Placeholder

      if (result.success) {
        Alert.alert(
          'Backup Created',
          `Wallet backup created successfully using: ${result.backupMethods.join(', ')}`
        );
        checkRecoveryStatus(); // Refresh status
      } else {
        Alert.alert('Backup Failed', result.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Backup failed with an error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to access wallet recovery</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Wallet Recovery</Text>
      <Text style={styles.subtitle}>
        Manage your wallet backup and recovery options
      </Text>

      {/* Current Wallet Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Wallet</Text>
        <Text style={styles.walletAddress}>
          {currentUser.wallet_address || 'No wallet address'}
        </Text>
      </View>

      {/* Recovery Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recovery Status</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : recoveryStatus ? (
          <View>
            <Text style={[
              styles.statusText,
              { color: recoveryStatus.hasBackup ? colors.success : colors.error }
            ]}>
              {recoveryStatus.hasBackup ? '✅ Backup Available' : '❌ No Backup Found'}
            </Text>
            {recoveryStatus.backupMethods.length > 0 && (
              <Text style={styles.backupMethods}>
                Backup methods: {recoveryStatus.backupMethods.join(', ')}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.statusText}>Checking status...</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={createWalletBackup}
          disabled={isLoading || !currentUser.wallet_address}
        >
          <Text style={styles.buttonText}>Create Backup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={triggerWalletRecovery}
          disabled={isRecovering || !recoveryStatus?.hasBackup}
        >
          {isRecovering ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.white }]}>
              Recover Wallet
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={checkRecoveryStatus}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Refresh Status
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>How it works:</Text>
        <Text style={styles.helpText}>
          • Create Backup: Saves your wallet data in multiple secure locations
        </Text>
        <Text style={styles.helpText}>
          • Recover Wallet: Restores your wallet from backup if needed
        </Text>
        <Text style={styles.helpText}>
          • Cross-device: Works when switching devices or auth methods
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  walletAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  backupMethods: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  buttonContainer: {
    marginBottom: spacing.lg,
  },
  button: {
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  tertiaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  helpSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
