/**
 * Wallet Recovery UI Component
 * Provides user interface for wallet recovery when data loss is detected
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';
import { walletRecoveryService } from '../../services/blockchain/wallet';
import Modal from '../shared/Modal';
import ModernLoader from '../shared/ModernLoader';

interface WalletRecoveryModalProps {
  visible: boolean;
  userId: string;
  expectedWalletAddress: string;
  onRecoverySuccess: (wallet: {
    address: string;
    publicKey: string;
    privateKey: string;
    recoveryMethod: string;
  }) => void;
  onRecoveryFailed: (error: string) => void;
  onClose: () => void;
}

interface RecoveryReport {
  hasLocalWallet: boolean;
  localWallets: string[];
  hasDatabaseWallet: boolean;
  databaseWallet: string;
  recoveryOptions: string[];
  criticalIssue: boolean;
}

const WalletRecoveryModal: React.FC<WalletRecoveryModalProps> = ({
  visible,
  userId,
  expectedWalletAddress,
  onRecoverySuccess,
  onRecoveryFailed,
  onClose
}) => {
  const [recoveryReport, setRecoveryReport] = useState<RecoveryReport | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadRecoveryReport = useCallback(async () => {
    try {
      setLoading(true);
      // Get basic recovery information
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      const report = {
        hasLocalWallet: recoveryResult.success,
        localWallets: recoveryResult.wallet ? [recoveryResult.wallet.address] : [],
        hasDatabaseWallet: true,
        databaseWallet: expectedWalletAddress,
        recoveryOptions: [],
        criticalIssue: !recoveryResult.success
      };
      setRecoveryReport(report);
    } catch (error) {
      logger.error('Failed to load recovery report', error as Record<string, unknown>, 'WalletRecoveryModal');
    } finally {
      setLoading(false);
    }
  }, [userId, expectedWalletAddress]);

  useEffect(() => {
    if (visible) {
      loadRecoveryReport();
    }
  }, [visible, loadRecoveryReport]);

  const handleAutomaticRecovery = async () => {
    try {
      setIsRecovering(true);
      setRecoveryStep('Starting automatic recovery...');

      const result = await walletRecoveryService.recoverWallet(userId);

      if (result.success && result.wallet) {
        setRecoveryStep('Recovery successful!');
        logger.info('Wallet recovery successful via UI', {
          userId,
          recoveredAddress: result.wallet.address
        }, 'WalletRecoveryModal');

        Alert.alert(
          'Recovery Successful! 🎉',
          `Your wallet has been recovered successfully!\n\nWallet address: ${result.wallet.address}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                onRecoverySuccess({
                  ...result.wallet!,
                  recoveryMethod: 'automatic' // Default recovery method
                });
                onClose();
              }
            }
          ]
        );
      } else {
        setRecoveryStep('Recovery failed');
        const errorMessage = result.error || 'Recovery failed for unknown reason';
        onRecoveryFailed(errorMessage);
      }
    } catch (error) {
      setRecoveryStep('Recovery failed');
      const errorMessage = error instanceof Error ? error.message : 'Recovery failed';
      logger.error('Wallet recovery failed via UI', error as Record<string, unknown>, 'WalletRecoveryModal');
      onRecoveryFailed(errorMessage);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleManualRecovery = () => {
    Alert.alert(
      'Manual Recovery Required',
      'Automatic recovery failed. You have the following options:\n\n1. Restore from your seed phrase\n2. Import using your private key\n3. Contact support for assistance\n\nWould you like to proceed with manual recovery?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Manual Recovery', 
          onPress: () => {
            // Navigate to manual recovery screen
            onRecoveryFailed('Manual recovery required');
          }
        }
      ]
    );
  };

  const renderRecoveryReport = () => {
    if (!recoveryReport) return null;

    return (
      <View style={styles.reportContainer}>
        <Text style={styles.reportTitle}>Recovery Analysis</Text>
        
        <View style={styles.reportItem}>
          <Text style={styles.reportLabel}>Database Wallet:</Text>
          <Text style={styles.reportValue}>{recoveryReport.databaseWallet}</Text>
        </View>

        <View style={styles.reportItem}>
          <Text style={styles.reportLabel}>Local Wallets Found:</Text>
          <Text style={styles.reportValue}>{recoveryReport.localWallets.length}</Text>
        </View>

        {recoveryReport.localWallets.length > 0 && (
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>Local Wallet Addresses:</Text>
            {recoveryReport.localWallets.map((address, index) => (
              <Text key={index} style={styles.reportValue}>
                {address}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.reportItem}>
          <Text style={styles.reportLabel}>Recovery Options:</Text>
          <Text style={styles.reportValue}>
            {recoveryReport.recoveryOptions.join(', ')}
          </Text>
        </View>

        <View style={[
          styles.statusIndicator,
          { backgroundColor: recoveryReport.criticalIssue ? colors.error : colors.warning }
        ]}>
          <Text style={styles.statusText}>
            {recoveryReport.criticalIssue ? 'Critical Issue Detected' : 'Recovery Possible'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      transparent={false}
      title="Wallet Recovery"
      showHandle={true}
      closeOnBackdrop={true}
    >
      <View style={styles.container}>

        <ScrollView style={styles.content}>
          <View style={styles.warningContainer}>
            <Text style={styles.warningTitle}>⚠️ Wallet Data Issue Detected</Text>
            <Text style={styles.warningText}>
              We detected that your wallet data in local storage doesn&apos;t match your database wallet. 
              This can happen after app updates or device changes.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ModernLoader size="large" text="Analyzing wallet data..." />
            </View>
          ) : (
            renderRecoveryReport()
          )}

          {isRecovering && (
            <View style={styles.recoveryContainer}>
              <ModernLoader size="large" text={recoveryStep} />
            </View>
          )}

          {recoveryReport && !isRecovering && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleAutomaticRecovery}
              >
                <Text style={styles.buttonText}>Try Automatic Recovery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleManualRecovery}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Manual Recovery
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              If automatic recovery fails, you can restore your wallet using:
            </Text>
            <Text style={styles.helpText}>
              • Your seed phrase (12 or 24 words)
            </Text>
            <Text style={styles.helpText}>
              • Your private key
            </Text>
            <Text style={styles.helpText}>
              • Contact support for assistance
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  warningContainer: {
    backgroundColor: colors.warning + '20',
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  recoveryContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.primaryGreen + '20',
    borderRadius: spacing.radiusMd,
    marginVertical: spacing.lg,
  },
  recoveryText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryGreen,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  reportContainer: {
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  reportTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reportItem: {
    marginBottom: spacing.sm,
  },
  reportLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  reportValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    marginTop: 2,
  },
  statusIndicator: {
    padding: spacing.sm,
    borderRadius: spacing.radiusSm,
    marginTop: spacing.md,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
  actionContainer: {
    marginVertical: spacing.lg,
  },
  button: {
    padding: spacing.lg,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primaryGreen,
  },
  secondaryButton: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  secondaryButtonText: {
    color: colors.white70,
  },
  helpContainer: {
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  helpTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});

export default WalletRecoveryModal;
