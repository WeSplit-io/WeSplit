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
  StyleProp,
  Platform,
  Linking
} from 'react-native';
import Button from '../shared/Button';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { mwaDiscoveryService } from '../../services/blockchain/wallet/discovery/mwaDiscoveryService';
import { mockMWAService } from '../../services/blockchain/wallet/mockMWAService';
import { logger } from '../../services/analytics/loggingService';
import { safeMWAImport, handleMWAError, isMWAError } from '../../utils/mwaErrorHandler';
import { getPlatformInfo, getEnvironmentConfig } from '../../utils/core/platformDetection';

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
  isInstallable?: boolean;
  address?: string;
  publicKey?: string;
  providerInfo?: any; // Full provider info for install links
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
        canUseMWA: platformInfo.canUseMWA,
        isDevelopmentBuild: platformInfo.isDevelopmentBuild,
        hasNativeModules: platformInfo.hasNativeModules
      }, 'MWADetectionButton');

      // MWA is not available in Expo Go
      if (platformInfo.isExpoGo) {
        logger.debug('Expo Go detected, MWA not available', null, 'MWADetectionButton');
        setMwaActuallyAvailable(false);
        return;
      }

      // Check if platform supports MWA (be more permissive for dev builds)
      if (!platformInfo.canUseMWA && !platformInfo.isDevelopmentBuild) {
        logger.debug('Platform does not support MWA', {
          isDevelopmentBuild: platformInfo.isDevelopmentBuild,
          hasNativeModules: platformInfo.hasNativeModules,
          reason: 'Not a development build or MWA not supported'
        }, 'MWADetectionButton');
        setMwaActuallyAvailable(false);
        return;
      }
      
      try {
        logger.debug('Attempting to import MWA module', null, 'MWADetectionButton');

        const result = await safeMWAImport();

        if (result.success) {
          logger.debug('MWA module imported successfully', {
            hasStartRemoteScenario: !!result.module?.startRemoteScenario,
            hasTransact: !!result.module?.transact,
            isAvailable: result.success
          }, 'MWADetectionButton');
          setMwaActuallyAvailable(true);
        } else {
          logger.debug('MWA module not available', { error: result.error }, 'MWADetectionButton');

          // For development builds, show a helpful message about MWA not being configured
          if (platformInfo.isDevelopmentBuild) {
            logger.debug('Development build detected but MWA not available - native module not linked', null, 'MWADetectionButton');
          }

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

  const showInstallableWallets = useCallback(async () => {
    logger.info('🔧 SHOWING INSTALLABLE WALLETS - Function called', null, 'MWADetectionButton');
    try {
      const { WALLET_PROVIDER_REGISTRY } = await import('../../services/blockchain/wallet/providers/registry');

      // Get all supported wallet providers and show them as installable
      const installableWallets: WalletOption[] = Object.values(WALLET_PROVIDER_REGISTRY)
        .filter(provider => provider.mwaSupported || provider.deepLinkScheme) // Only show wallets that support MWA or deep links
        .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // Sort by priority
        .slice(0, 6) // Limit to top 6 wallets to avoid overwhelming UI
        .map(provider => ({
          name: provider.name,
          displayName: provider.displayName,
          icon: provider.logoUrl || provider.fallbackIcon,
          isAvailable: false, // Not available on device
          isInstallable: true, // Can be installed
          providerInfo: provider
        }));

      logger.info('🎯 INSTALLABLE WALLETS LOADED', { count: installableWallets.length, wallets: installableWallets.map(w => w.name) }, 'MWADetectionButton');
      setAvailableWallets(installableWallets);
    } catch (error) {
      logger.error('Failed to load installable wallets', error as Record<string, unknown>, 'MWADetectionButton');
      setAvailableWallets([]);
    }
  }, []);

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
      } else {
        // Check if MWA is available before attempting discovery
        const envConfig = getEnvironmentConfig();

        if (!envConfig.enableMWA) {
          // MWA not available, show installable wallets
          logger.debug('MWA not enabled for this environment, showing installable wallets', null, 'MWADetectionButton');
          await showInstallableWallets();
        } else if (mwaActuallyAvailable === false) {
          // MWA detection failed, show installable wallets
          logger.debug('MWA detection failed, showing installable wallets', null, 'MWADetectionButton');
          await showInstallableWallets();
        } else {
          // Use real MWA discovery
          logger.debug('Starting MWA discovery', null, 'MWADetectionButton');
          try {
            const discoveryResults = await mwaDiscoveryService.getAvailableWallets();
            logger.debug('MWA discovery completed', {
              mwaWallets: discoveryResults.mwaWallets.length,
              deepLinkWallets: discoveryResults.deepLinkWallets.length,
              allAvailable: discoveryResults.allAvailable.length
            }, 'MWADetectionButton');

            const walletOptions: WalletOption[] = discoveryResults.allAvailable.map(result => ({
              name: result.provider.name,
              displayName: result.provider.displayName,
              icon: result.provider.logoUrl || result.provider.fallbackIcon,
              isAvailable: result.isAvailable,
              isMock: false,
              providerInfo: result.provider
            }));

            // If no wallets are available, show installable wallets instead
            if (walletOptions.length === 0 || walletOptions.every(w => !w.isAvailable)) {
              logger.debug('No wallets available, showing installable wallets', null, 'MWADetectionButton');
              await showInstallableWallets();
            } else {
              setAvailableWallets(walletOptions);
            }
          } catch (discoveryError) {
            logger.error('MWA discovery failed', discoveryError as Record<string, unknown>, 'MWADetectionButton');
            // Fallback to installable wallets if discovery fails
            await showInstallableWallets();
          }
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
  }, [platformInfo.isExpoGo, platformInfo.environment, mwaActuallyAvailable, availableWallets.length, showInstallableWallets]);

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

    // Allow forced detection even if MWA is detected as unavailable (except for production)
    if (mwaActuallyAvailable === false && !platformInfo.isExpoGo && !platformInfo.isDevelopmentBuild) {
      logger.debug('MWA not available in production build, showing coming soon message', null, 'MWADetectionButton');
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

  const testMWADiscovery = async () => {
    try {
      logger.info('Testing MWA discovery directly', null, 'MWADetectionButton');
      setIsDetecting(true);

      // Wrap the discovery call in additional error handling
      let results;
      try {
        results = await mwaDiscoveryService.discoverProviders({
          timeout: 5000,
          useCache: false,
          includeUnsupported: true
        });
      } catch (discoveryError) {
        logger.error('MWA discovery call failed', discoveryError as Record<string, unknown>, 'MWADetectionButton');
        Alert.alert('Discovery Error', `Failed to run discovery: ${discoveryError instanceof Error ? discoveryError.message : 'Unknown error'}`);
        return;
      }

      const availableCount = results.filter(r => r.isAvailable).length;
      const mwaCount = results.filter(r => r.detectionMethod === 'mwa').length;

      Alert.alert(
        'MWA Discovery Test',
        `Discovery completed!\n\nTotal providers: ${results.length}\nAvailable: ${availableCount}\nMWA attempts: ${mwaCount}\n\nCheck console for details.`
      );

      logger.info('MWA discovery test results', {
        totalProviders: results.length,
        availableCount,
        mwaCount,
        results: results.map(r => ({
          name: r.provider.name,
          available: r.isAvailable,
          method: r.detectionMethod,
          error: r.error
        }))
      }, 'MWADetectionButton');

    } catch (error) {
      logger.error('MWA discovery test failed', error as Record<string, unknown>, 'MWADetectionButton');
      Alert.alert('Test Failed', `MWA discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleButtonPress = () => {
    const envConfig = getEnvironmentConfig();

    // Show detailed diagnostic message when MWA is not available in dev builds
    if (mwaActuallyAvailable === false && platformInfo.isDevelopmentBuild) {
      const diagnosticInfo = {
        environment: platformInfo.environment,
        isDevelopmentBuild: platformInfo.isDevelopmentBuild,
        canUseMWA: platformInfo.canUseMWA,
        hasNativeModules: platformInfo.hasNativeModules,
        expoGo: platformInfo.isExpoGo,
        platform: Platform.OS,
        mwaActuallyFunctional: envConfig.mwaActuallyFunctional,
        enableMWA: envConfig.enableMWA
      };

      Alert.alert(
        'MWA Debug Info 🔧',
        `MWA is currently unavailable. Here's the diagnostic info:\n\n${Object.entries(diagnosticInfo).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\nThe issue is likely that the SolanaMobileWalletAdapter native module is not linked in your iOS build.\n\nYou can still add wallets manually by entering the wallet address below.`,
        [
          { text: 'Force Enable MWA', onPress: () => {
            logger.warn('Forcing MWA enable for debugging', diagnosticInfo, 'MWADetectionButton');
            setMwaActuallyAvailable(true);
            Alert.alert('MWA Forced', 'MWA has been force-enabled. Try the wallet detection button again.');
          }},
          { text: 'Try MWA Discovery', onPress: () => {
            // Try MWA discovery directly
            testMWADiscovery();
          }},
          { text: 'Manual Entry', style: 'default' }
        ]
      );
      return;
    }

    // Show user-friendly message when MWA is not available
    if (mwaActuallyAvailable === false && !platformInfo.isExpoGo) {
      Alert.alert(
        'Feature Coming Soon! 🚀',
        'Automatic wallet detection requires a development build with MWA support. You can still add wallets manually by entering the wallet address below.',
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

                      // Import MWA modules
                      const { startRemoteScenario } = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
                      const { PublicKey, SystemProgram } = await import('@solana/web3.js');

                      logger.info('Starting MWA connection', { walletName: wallet.name }, 'MWADetectionButton');

                      // Create a simple transaction to get the wallet's public key
                      // This is a minimal transaction that just gets the accounts
                      const scenario = await startRemoteScenario({
                        associationPublicKey: new PublicKey('11111111111111111111111111111112'), // System Program
                        signers: [],
                        commitment: 'confirmed',
                        instructions: [
                          SystemProgram.transfer({
                            fromPubkey: new PublicKey('11111111111111111111111111111112'), // Will be replaced by wallet
                            toPubkey: new PublicKey('11111111111111111111111111111112'),
                            lamports: 0
                          })
                        ]
                      });

                      // The scenario should return the authorized account
                      const { accounts } = scenario;

                      if (accounts && accounts.length > 0) {
                        const publicKey = accounts[0].publicKey;
                        const address = publicKey.toBase58();

                        logger.info('MWA connection successful', {
                          walletName: wallet.name,
                          address,
                          publicKey: publicKey.toString()
                        }, 'MWADetectionButton');

                        onWalletDetected({
                          name: wallet.displayName,
                          address,
                          publicKey: publicKey.toString(),
                          isMock: false
                        });

                        setShowWalletModal(false);
                        Alert.alert(
                          'Wallet Connected',
                          `Successfully connected to ${wallet.displayName}!\n\nAddress: ${address.slice(0, 8)}...${address.slice(-8)}`
                        );
                      } else {
                        throw new Error('No accounts returned from wallet');
                      }

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
                      } else if (mwaError instanceof Error && mwaError.message.includes('User rejected')) {
                        Alert.alert(
                          'Connection Cancelled',
                          'Wallet connection was cancelled by the user.'
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

  const handleWalletPress = (wallet: WalletOption) => {
    if (wallet.isInstallable) {
      // Open download page for installable wallet
      logger.info('📱 INSTALL BUTTON PRESSED', { walletName: wallet.name }, 'MWADetectionButton');
      openWalletDownload(wallet);
    } else if (wallet.isAvailable) {
      // Connect to available wallet
      handleWalletSelect(wallet);
    }
  };

  const openWalletDownload = async (wallet: WalletOption) => {
    try {
      const provider = wallet.providerInfo;
      if (!provider) {
        logger.warn('No provider info available for wallet download', { walletName: wallet.name }, 'MWADetectionButton');
        return;
      }

      let url: string | null = null;
      let urlSource = '';

      if (Platform.OS === 'ios' && provider.appStoreId) {
        url = `https://apps.apple.com/app/id${provider.appStoreId}`;
        urlSource = 'App Store';
      } else if (Platform.OS === 'android' && provider.playStoreId) {
        url = `https://play.google.com/store/apps/details?id=${provider.playStoreId}`;
        urlSource = 'Play Store';
      } else if (provider.websiteUrl) {
        url = provider.websiteUrl;
        urlSource = 'Website';
      }

      logger.info('Generated download URL', {
        walletName: wallet.name,
        platform: Platform.OS,
        hasAppStoreId: !!provider.appStoreId,
        hasPlayStoreId: !!provider.playStoreId,
        hasWebsite: !!provider.websiteUrl,
        urlSource,
        finalUrl: url
      }, 'MWADetectionButton');

      if (url) {
        await Linking.openURL(url);
        logger.info('📱 Successfully opened wallet download page', { walletName: wallet.name, url, urlSource }, 'MWADetectionButton');
      } else {
        logger.warn('❌ No download URL available for wallet', { walletName: wallet.name, provider }, 'MWADetectionButton');
      }
    } catch (error) {
      logger.error('Failed to open wallet download page', error as Record<string, unknown>, 'MWADetectionButton');
    }
  };

  const renderWalletOption = (wallet: WalletOption) => (
    <TouchableOpacity
      key={wallet.name}
      style={[
        styles.walletOption,
        !wallet.isAvailable && !wallet.isInstallable && styles.walletOptionDisabled
      ]}
      onPress={() => handleWalletPress(wallet)}
      disabled={(!wallet.isAvailable && !wallet.isInstallable) || isConnecting !== null}
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
            {wallet.isAvailable ? 'Available' :
             wallet.isInstallable ? 'Tap to Install' : 'Not Available'}
            {wallet.isMock && ' (Mock)'}
          </Text>
        </View>

        {isConnecting === wallet.name && (
          <ActivityIndicator size="small" color={colors.green} />
        )}
        {wallet.isInstallable && !isConnecting && (
          <View style={styles.installIcon}>
            <Text style={styles.installIconText}>↓</Text>
          </View>
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
  installIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  installIconText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

export default MWADetectionButton;
