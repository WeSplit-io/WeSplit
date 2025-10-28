/**
 * MWA Detection Button Component
 * Provides wallet detection and connection functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet
} from 'react-native';
import PhosphorIcon from '../shared/PhosphorIcon';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { mwaDiscoveryService, MWADiscoveryResult } from '../../services/blockchain/wallet/discovery/mwaDiscoveryService';
import { mockMWAService, MockWalletInfo } from '../../services/blockchain/wallet/mockMWAService';
import { getPlatformInfo } from '../../utils/core/platformDetection';
import { logger } from '../../services/analytics/loggingService';
import { safeMWAImport, handleMWAError, isMWAError } from '../../utils/mwaErrorHandler';

interface MWADetectionButtonProps {
  onWalletDetected: (walletInfo: {
    name: string;
    address: string;
    publicKey: string;
    isMock?: boolean;
  }) => void;
  disabled?: boolean;
  style?: any;
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
      console.log('🔍 Checking MWA availability:', {
        isExpoGo: platformInfo.isExpoGo,
        environment: platformInfo.environment,
        canUseMWA: platformInfo.canUseMWA
      });
      
      // MWA is not available in Expo Go
      if (platformInfo.isExpoGo) {
        console.log('❌ Expo Go detected, MWA not available');
        setMwaActuallyAvailable(false);
        return;
      }
      
      // Check if platform supports MWA
      if (!platformInfo.canUseMWA) {
        console.log('❌ Platform does not support MWA');
        setMwaActuallyAvailable(false);
        return;
      }
      
      try {
        console.log('🔄 Attempting to import MWA module...');
        const result = await safeMWAImport();
        
        if (result.success) {
          console.log('✅ MWA module imported successfully:', {
            hasStartRemoteScenario: !!result.module?.startRemoteScenario,
            isAvailable: result.success
          });
          setMwaActuallyAvailable(true);
        } else {
          console.log('❌ MWA module not available:', result.error);
          setMwaActuallyAvailable(false);
        }
      } catch (error) {
        handleMWAError(error, 'MWADetectionButton.checkMWAAvailability');
        console.log('❌ MWA module not available:', error);
        setMwaActuallyAvailable(false);
      }
    };
    
    checkMWAAvailability();
  }, [platformInfo.isExpoGo, platformInfo.canUseMWA]);

  // Load available wallets when component mounts
  useEffect(() => {
    loadAvailableWallets();
  }, []);

  const loadAvailableWallets = async () => {
    try {
      setIsDetecting(true);
      
      if (platformInfo.isExpoGo) {
        // Use mock service for Expo Go
        const mockWallets = mockMWAService.getAvailableWallets();
        console.log('🔍 Mock wallets from service:', mockWallets);
        
        const walletOptions: WalletOption[] = mockWallets.map(wallet => ({
          name: wallet.name,
          displayName: wallet.name,
          icon: getWalletIcon(wallet.name),
          isAvailable: wallet.isConnected,
          isMock: true,
          address: wallet.address,
          publicKey: wallet.publicKey
        }));
        
        console.log('🔍 Mapped wallet options:', walletOptions);
        setAvailableWallets(walletOptions);
      } else if (mwaActuallyAvailable === false) {
        // MWA not available, show empty state with helpful message
        console.log('❌ MWA not available, showing empty state');
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
          console.error('❌ MWA discovery failed:', discoveryError);
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
      logger.error('Failed to load available wallets', error, 'MWADetectionButton');
      // Don't show alert for MWA unavailability, just log it
      if (!isMWAError(error)) {
        Alert.alert('Error', 'Failed to detect available wallets');
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDetectWallets = async () => {
    console.log('🔍 MWA Detection Button Pressed:', {
      disabled,
      mwaActuallyAvailable,
      isDetecting,
      platformInfo: platformInfo.environment
    });
    
    if (disabled) {
      console.log('❌ Button is disabled');
      return;
    }
    
    // Check if MWA is available before attempting detection
    if (mwaActuallyAvailable === false && !platformInfo.isExpoGo) {
      console.log('❌ MWA not available in dev build, showing coming soon message');
      Alert.alert(
        'Coming Soon! 🚀',
        'Automatic wallet detection is coming soon! For now, you can manually enter your wallet address below.',
        [{ text: 'Got it!', style: 'default' }]
      );
      return;
    }
    
    // In Expo Go, we always show mock wallets for design purposes
    if (platformInfo.isExpoGo) {
      console.log('✅ Expo Go detected, showing mock wallets for design');
    }
    
    try {
      console.log('✅ Starting wallet detection...');
      setIsDetecting(true);
      await loadAvailableWallets();
      setShowWalletModal(true);
    } catch (error) {
      handleMWAError(error, 'MWADetectionButton.handleDetectWallets');
      logger.error('Failed to detect wallets', error, 'MWADetectionButton');
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
                      console.error('MWA connection error:', mwaError);
                      
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
      logger.error('Failed to connect wallet', error, 'MWADetectionButton');
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
          <ActivityIndicator size="small" color={colors.primaryGreen} />
        )}
      </View>
    </TouchableOpacity>
  );

  // Determine if button should appear disabled (only for actual loading states)
  const isButtonDisabled = disabled || isDetecting;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.detectButton,
          isButtonDisabled && styles.detectButtonDisabled,
          style
        ]}
        onPress={handleButtonPress}
        // Remove disabled prop so button always responds to clicks
      >
        <View style={styles.detectButtonContent}>
          {isDetecting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <PhosphorIcon
              name="Wallet"
              size={20}
              color={colors.white}
            />
          )}
          <Text style={styles.detectButtonText}>
            {isDetecting ? 'Detecting...' : 'Detect Wallets'}
          </Text>
        </View>
      </TouchableOpacity>

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
    backgroundColor: colors.textSecondary,
    opacity: 0.7,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
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
    backgroundColor: colors.primaryGreen,
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
    color: colors.text,
  },
  walletStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mockNotice: {
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  mockNoticeText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    fontWeight: typography.fontWeight.medium,
  },
});

export default MWADetectionButton;
