/**
 * MWA Detection Button Component
 * Provides wallet detection and connection functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp
} from 'react-native';
import PhosphorIcon from '../shared/PhosphorIcon';
import Button from '../shared/Button';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { mwaDiscoveryService } from '../../services/blockchain/wallet/discovery/mwaDiscoveryService';
import { mockMWAService } from '../../services/blockchain/wallet/mockMWAService';
import { logger } from '../../services/analytics/loggingService';
import { safeMWAImport, handleMWAError, isMWAError } from '../../utils/mwaErrorHandler';
import { getPlatformInfo } from '../../utils/core/platformDetection';

interface MWADetectionButtonProps {
  onWalletDetected: (walletInfo: {
    name: string;
    address: string;
    publicKey: string;
    isMock?: boolean;
  }) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface WalletOption {
  name: string;
  displayName: string;
  icon?: string;
  isAvailable: boolean;
  isMock?: boolean;
  address?: string;
  publicKey?: string;
}

// Helper function to get wallet icons
const getWalletIcon = (walletName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Phantom': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', // Using SOL logo as fallback
    'Solflare': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    'Backpack': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    'Slope': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  };
  return iconMap[walletName] || 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
};

const MWADetectionButton: React.FC<MWADetectionButtonProps> = ({
  onWalletDetected,
  disabled = false,
  style
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  
  const platformInfo = getPlatformInfo();
  
  // Check if MWA is actually available by testing the import
  const [mwaActuallyAvailable, setMwaActuallyAvailable] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkMWAAvailability = async () => {
      logger.debug('Checking MWA availability', {
        isExpoGo: platformInfo.isExpoGo,
        environment: platformInfo.environment,
        canUseMWA: platformInfo.canUseMWA
      }, 'MWADetectionButton');
      
      // MWA is not available in Expo Go
      if (platformInfo.isExpoGo) {
        logger.debug('Expo Go detected, MWA not available', null, 'MWADetectionButton');
        setMwaActuallyAvailable(false);
        return;
      }
      
      // Check if platform supports MWA
      if (!platformInfo.canUseMWA) {
        logger.debug('Platform does not support MWA', null, 'MWADetectionButton');
        setMwaActuallyAvailable(false);
        return;
      }
      
      try {
        logger.debug('Attempting to import MWA module', null, 'MWADetectionButton');
        const result = await safeMWAImport();
        
        if (result.success) {
          logger.debug('MWA module imported successfully', {
            hasStartRemoteScenario: !!result.module?.startRemoteScenario,
            isAvailable: result.success
          }, 'MWADetectionButton');
          setMwaActuallyAvailable(true);
        } else {
          logger.debug('MWA module not available', { error: result.error }, 'MWADetectionButton');
          setMwaActuallyAvailable(false);
        }
      } catch (error) {
        handleMWAError(error, 'MWADetectionButton.checkMWAAvailability');
        logger.debug('MWA module not available', { error: error as Record<string, unknown> }, 'MWADetectionButton');
        setMwaActuallyAvailable(false);
      }
    };
    
    checkMWAAvailability();
  }, [platformInfo.isExpoGo, platformInfo.canUseMWA, platformInfo.environment]);

  // Load available wallets when component mounts
  useEffect(() => {
    loadAvailableWallets();
  }, [loadAvailableWallets]);

  const loadAvailableWallets = useCallback(async () => {
    try {
      setIsDetecting(true);
      
      if (platformInfo.isExpoGo) {
        // Use mock service for Expo Go
        const mockWallets = mockMWAService.getAvailableWallets();
        logger.debug('Mock wallets from service', { mockWallets }, 'MWADetectionButton');
        
        const walletOptions: WalletOption[] = mockWallets.map(wallet => ({
          name: wallet.name,
          displayName: wallet.name,
          icon: getWalletIcon(wallet.name),
          isAvailable: wallet.isConnected,
          isMock: true,
          address: wallet.address,
          publicKey: wallet.publicKey
        }));
        
        logger.debug('Mapped wallet options', { walletOptions }, 'MWADetectionButton');
        setAvailableWallets(walletOptions);
      } else if (mwaActuallyAvailable === false) {
        // MWA not available, show empty state with helpful message
        logger.debug('MWA not available, showing empty state', null, 'MWADetectionButton');
        setAvailableWallets([]);
      } else {
        // Use real MWA discovery for development builds
        try {
          const discoveryResults = await mwaDiscoveryService.getAvailableWallets();
        const walletOptions: WalletOption[] = discoveryResults.allAvailable.map(result => ({
          name: result.provider.name,
          displayName: result.provider.displayName,
          icon: result.provider.logoUrl || result.provider.fallbackIcon,
          isAvailable: result.isAvailable,
          isMock: false
        }));
          setAvailableWallets(walletOptions);
        } catch (discoveryError) {
          logger.error('MWA discovery failed', discoveryError as Record<string, unknown>, 'MWADetectionButton');
          // Fallback to empty state if discovery fails
          setAvailableWallets([]);
        }
      }
      
      logger.info('Available wallets loaded', { 
        count: availableWallets.length,
        platform: platformInfo.environment,
        mwaAvailable: mwaActuallyAvailable
      }, 'MWADetectionButton');
      
    } catch (error) {
      handleMWAError(error, 'MWADetectionButton.loadAvailableWallets');
      logger.error('Failed to load available wallets', error as Record<string, unknown>, 'MWADetectionButton');
      // Don't show alert for MWA unavailability, just log it
      if (!isMWAError(error)) {
        Alert.alert('Error', 'Failed to detect available wallets');
      }
    } finally {
      setIsDetecting(false);
    }
  }, [platformInfo.isExpoGo, platformInfo.environment, mwaActuallyAvailable, availableWallets.length]);

  const handleDetectWallets = async () => {
    logger.debug('MWA Detection Button Pressed', {
      disabled,
      mwaActuallyAvailable,
      isDetecting,
      platformInfo: platformInfo.environment
    }, 'MWADetectionButton');
    
    if (disabled) {
      logger.debug('Button is disabled', null, 'MWADetectionButton');
      return;
    }
    
    // Check if MWA is available before attempting detection
    if (mwaActuallyAvailable === false && !platformInfo.isExpoGo) {
      logger.debug('MWA not available in dev build, showing coming soon message', null, 'MWADetectionButton');
      Alert.alert(
        'Coming Soon! 🚀',
        'Automatic wallet detection is coming soon! For now, you can manually enter your wallet address below.',
        [{ text: 'Got it!', style: 'default' }]
      );
      return;
    }
    
    // In Expo Go, we always show mock wallets for design purposes
    if (platformInfo.isExpoGo) {
      logger.debug('Expo Go detected, showing mock wallets for design', null, 'MWADetectionButton');
    }
    
    try {
      logger.debug('Starting wallet detection', null, 'MWADetectionButton');
      setIsDetecting(true);
      await loadAvailableWallets();
      setShowWalletModal(true);
    } catch (error) {
      handleMWAError(error, 'MWADetectionButton.handleDetectWallets');
      logger.error('Failed to detect wallets', error as Record<string, unknown>, 'MWADetectionButton');
      // Only show alert for non-MWA related errors
      if (!isMWAError(error)) {
        Alert.alert('Error', 'Failed to detect wallets. Please try again.');
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleButtonPress = () => {
    // Show user-friendly message when MWA is not available
    if (mwaActuallyAvailable === false && !platformInfo.isExpoGo) {
      Alert.alert(
        'Feature Coming Soon! 🚀',
        'Automatic wallet detection is currently in development. You can still add wallets manually by entering the wallet address below.',
        [{ text: 'Got it!', style: 'default' }]
      );
      return;
    }
    
    // If button is disabled for other reasons, show appropriate message
    if (disabled || isDetecting) {
      return;
    }
    
    // If button is enabled, proceed with normal detection
    handleDetectWallets();
  };

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (disabled || isConnecting) {return;}
    
    try {
      setIsConnecting(wallet.name);
      
      if (platformInfo.isExpoGo && wallet.isMock) {
        // Use mock service
        const result = await mockMWAService.connectWallet(wallet.name);
        
        if (result.success && result.wallet) {
          onWalletDetected({
            name: result.wallet.name,
            address: result.wallet.address,
            publicKey: result.wallet.publicKey,
            isMock: true
          });
          
          setShowWalletModal(false);
          Alert.alert(
            'Wallet Connected',
            `Successfully connected to ${wallet.displayName}!\n\nAddress: ${result.wallet.address.slice(0, 8)}...${result.wallet.address.slice(-8)}`
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to connect wallet');
        }
                  } else {
                    // Use real MWA connection for development builds
                    try {
                      // Check if MWA is actually available
                      if (mwaActuallyAvailable === false) {
                        throw new Error('MWA not available in this build');
                      }
                      
                      // For now, show a message that MWA connection is not yet implemented
                      // This prevents the TurboModuleRegistry error while maintaining the UI flow
                      Alert.alert(
                        'MWA Connection',
                        `MWA connection to ${wallet.displayName} is not yet fully implemented. Please manually enter your wallet address below.`,
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              // Close the modal so user can enter address manually
                              setShowWalletModal(false);
                            }
                          }
                        ]
                      );
                      
                    } catch (mwaError) {
                      logger.error('MWA connection error', mwaError as Record<string, unknown>, 'MWADetectionButton');
                      
                      // Check if it's a native module error
                      if (mwaError instanceof Error && (
                        mwaError.message.includes('TurboModuleRegistry') ||
                        mwaError.message.includes('startRemoteScenario is not a function') ||
                        mwaError.message.includes('SolanaMobileWalletAdapter')
                      )) {
                        Alert.alert(
                          'MWA Not Available',
                          'The Mobile Wallet Adapter is not properly configured in this build. This feature requires a properly configured development build with MWA support.\n\nFor now, you can manually enter your wallet address below.'
                        );
                      } else {
                        Alert.alert(
                          'Connection Failed',
                          `Failed to connect to ${wallet.displayName}. Please make sure the wallet app is installed and try again.\n\nError: ${mwaError instanceof Error ? mwaError.message : 'Unknown error'}`
                        );
                      }
                    }
                  }
      
    } catch (error) {
      logger.error('Failed to connect wallet', error as Record<string, unknown>, 'MWADetectionButton');
      Alert.alert('Error', 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(null);
    }
  };

  const renderWalletOption = (wallet: WalletOption) => (
    <TouchableOpacity
      key={wallet.name}
      style={[
        styles.walletOption,
        !wallet.isAvailable && styles.walletOptionDisabled
      ]}
      onPress={() => wallet.isAvailable && handleWalletSelect(wallet)}
      disabled={!wallet.isAvailable || isConnecting !== null}
    >
      <View style={styles.walletOptionContent}>
        {wallet.icon ? (
          <Image source={{ uri: wallet.icon }} style={styles.walletIcon} />
        ) : (
          <View style={styles.walletIconPlaceholder}>
            <Text style={styles.walletIconText}>
              {wallet.displayName.charAt(0)}
            </Text>
          </View>
        )}
        
        <View style={styles.walletInfo}>
          <Text style={styles.walletName}>{wallet.displayName}</Text>
          <Text style={styles.walletStatus}>
            {wallet.isAvailable ? 'Available' : 'Not Available'}
            {wallet.isMock && ' (Mock)'}
          </Text>
        </View>
        
        {isConnecting === wallet.name && (
          <ActivityIndicator size="small" color={colors.green} />
        )}
      </View>
    </TouchableOpacity>
  );

  // Determine if button should appear disabled (only for actual loading states)
  const isButtonDisabled = disabled || isDetecting;

  return (
    <>
      <Button
        title={isDetecting ? 'Detecting...' : 'Detect Wallets'}
        onPress={handleButtonPress}
        variant="secondary"
        disabled={isButtonDisabled}
        loading={isDetecting}
        icon="Wallet"
        iconPosition="left"
        style={style}
      />

      <Modal
        visible={showWalletModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Available Wallets</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWalletModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {availableWallets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No wallets detected</Text>
                <Text style={styles.emptyStateSubtext}>
                  Make sure you have a Solana wallet installed on your device
                </Text>
              </View>
            ) : (
              <>
                {platformInfo.isExpoGo && (
                  <View style={styles.mockNotice}>
                    <Text style={styles.mockNoticeText}>
                      🧪 Mock Mode: This is a demo for design purposes
                    </Text>
                  </View>
                )}
                
                {availableWallets.map(renderWalletOption)}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  detectButton: {
    backgroundColor: colors.white10,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detectButtonDisabled: {
    backgroundColor: colors.white70,
    opacity: 0.7,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  detectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectButtonIcon: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
    tintColor: colors.white,
  },
  detectButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    paddingLeft: spacing.sm,
  },
  detectButtonTextDisabled: {
    color: colors.white70,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  walletOption: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  walletOptionDisabled: {
    opacity: 0.5,
  },
  walletOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  walletIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  walletInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  walletName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  walletStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
  },
  mockNotice: {
    backgroundColor: colors.red + '20',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.red,
  },
  mockNoticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.red,
    fontWeight: typography.fontWeight.medium,
  },
});

export default MWADetectionButton;
