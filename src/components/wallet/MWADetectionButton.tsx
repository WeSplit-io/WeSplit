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
        environment: platformInfo.environment
      });
      
      if (platformInfo.isExpoGo) {
        console.log('❌ Expo Go detected, MWA not available');
        setMwaActuallyAvailable(false);
        return;
      }
      
      try {
        console.log('🔄 Attempting to import MWA module...');
        const mwaModule = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
        const isAvailable = !!(mwaModule.startRemoteScenario);
        console.log('✅ MWA module imported successfully:', {
          hasStartRemoteScenario: !!mwaModule.startRemoteScenario,
          isAvailable
        });
        setMwaActuallyAvailable(isAvailable);
      } catch (error) {
        console.log('❌ MWA module not available:', error);
        setMwaActuallyAvailable(false);
      }
    };
    
    checkMWAAvailability();
  }, [platformInfo.isExpoGo]);

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
      } else {
        // Use real MWA discovery for development builds
        const discoveryResults = await mwaDiscoveryService.getAvailableWallets();
        const walletOptions: WalletOption[] = discoveryResults.allAvailable.map(result => ({
          name: result.provider.name,
          displayName: result.provider.displayName,
          icon: result.provider.icon,
          isAvailable: result.isAvailable,
          isMock: false
        }));
        setAvailableWallets(walletOptions);
      }
      
      logger.info('Available wallets loaded', { 
        count: availableWallets.length,
        platform: platformInfo.environment 
      }, 'MWADetectionButton');
      
    } catch (error) {
      logger.error('Failed to load available wallets', error, 'MWADetectionButton');
      Alert.alert('Error', 'Failed to detect available wallets');
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
      console.log('❌ MWA not available in dev build, showing alert');
      Alert.alert(
        'MWA Not Available',
        'Mobile Wallet Adapter is not properly configured in this build. You can still manually enter your wallet address below.'
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
      logger.error('Failed to detect wallets', error, 'MWADetectionButton');
      Alert.alert('Error', 'Failed to detect wallets. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (disabled || isConnecting) return;
    
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
                      
                      // Check if MWA is available before attempting to import
                      const mwaModule = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
                      
                      if (!mwaModule.startRemoteScenario) {
                        throw new Error('MWA startRemoteScenario not available');
                      }
                      
                      // Start MWA session
                      const scenario = await mwaModule.startRemoteScenario({
                        app: {
                          name: 'WeSplit',
                          uri: 'https://wesplit.app',
                          icon: 'https://wesplit.app/icon.png'
                        }
                      });
                      
                      // Request authorization
                      const authResult = await scenario.requestAuthorization({
                        identity: {
                          name: 'WeSplit',
                          uri: 'https://wesplit.app',
                          icon: 'https://wesplit.app/icon.png'
                        },
                        accounts: []
                      });
                      
                      if (authResult.accounts && authResult.accounts.length > 0) {
                        const account = authResult.accounts[0];
                        onWalletDetected({
                          name: wallet.displayName,
                          address: account.address,
                          publicKey: account.address,
                          isMock: false
                        });
                        
                        setShowWalletModal(false);
                        Alert.alert(
                          'Wallet Connected',
                          `Successfully connected to ${wallet.displayName}!\n\nAddress: ${account.address.slice(0, 8)}...${account.address.slice(-8)}`
                        );
                      } else {
                        Alert.alert('Error', 'No accounts found in wallet');
                      }
                      
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

  return (
    <>
      <TouchableOpacity
        style={[
          styles.detectButton,
          disabled && styles.detectButtonDisabled,
          style
        ]}
        onPress={handleDetectWallets}
        disabled={disabled || isDetecting}
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
    opacity: 0.6,
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
    backgroundColor: colors.lightGray,
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
