import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Clipboard,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { useWallet } from '../../context/WalletContext';
import { walletService, walletExportService, walletRecoveryService } from '../../services/blockchain/wallet';
import { firebaseDataService } from '../../services/data';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';

const SeedPhraseViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [isRevealed, setIsRevealed] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [hasValidSeedPhrase, setHasValidSeedPhrase] = useState(false);
  
  const { 
    // App wallet state (for seed phrase)
    appWalletAddress,
    appWalletConnected,
    // External wallet state (for fallback)
    walletInfo, 
    secretKey 
  } = useWallet();

  // Get seed phrase from secure device storage (never from database)
  useEffect(() => {
    const getSecureSeedPhrase = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser?.id) {
          setLoading(false);
          return;
        }

        // Get wallet data in one call - no redundant checks
        const exportResult = await walletExportService.exportWallet(currentUser.id.toString());
        
        if (exportResult.success) {
          // Set wallet address
          if (exportResult.walletAddress) {
            setActiveWalletAddress(exportResult.walletAddress);
          }
          
          // Always try to get private key first (more reliable)
          if (exportResult.privateKey) {
            setPrivateKey(exportResult.privateKey);
          }
          
          // Try to get seed phrase (may not be available)
          if (exportResult.seedPhrase && exportResult.seedPhrase.trim().length > 0) {
            // Format seed phrase for display
            const seedPhraseWords = exportResult.seedPhrase.split(' ').filter(word => word.trim().length > 0);
            if (seedPhraseWords.length >= 12) { // Valid seed phrase should have at least 12 words
              setSeedPhrase(seedPhraseWords);
              setHasValidSeedPhrase(true);
              console.log('🔐 SeedPhraseView: Seed phrase retrieved successfully', { wordCount: seedPhraseWords.length });
            } else {
              console.log('🔐 SeedPhraseView: Invalid seed phrase format, will show private key', { wordCount: seedPhraseWords.length });
              setSeedPhrase([]); // Clear invalid seed phrase
              setHasValidSeedPhrase(false);
            }
          } else {
            console.log('🔐 SeedPhraseView: No seed phrase available, will show private key');
            setSeedPhrase([]); // Ensure seed phrase is empty
            setHasValidSeedPhrase(false);
          }
        } else {
          setError(exportResult.error || 'Failed to retrieve wallet data');
        }
      } catch (err) {
        console.error('🔐 SeedPhraseView: Error retrieving secure wallet export data:', err);
        setError('Failed to retrieve wallet export data');
      } finally {
        setLoading(false);
      }
    };

    getSecureSeedPhrase();
  }, [currentUser?.id]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleReveal = () => {
    if (seedPhrase.length === 0) {
      // Don't show popup - let the UI handle the empty state
      return;
    }
    
    Alert.alert(
      'Security Warning',
      'Make sure no one is watching your screen before revealing your seed phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reveal', 
          style: 'destructive',
          onPress: () => setIsRevealed(true)
        }
      ]
    );
  };

  const handleNext = () => {
    navigation.navigate('SeedPhraseVerify' as never);
  };

  const handleCopySeedPhrase = async () => {
    if (seedPhrase.length === 0) {return;}
    
    try {
      const seedPhraseText = seedPhrase.join(' ');
      await Clipboard.setString(seedPhraseText);
      Alert.alert('Copied', 'Seed phrase copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy seed phrase');
    }
  };

  const handleExportPrivateKey = async () => {
    if (!currentUser?.id || !activeWalletAddress) {
      Alert.alert('Error', 'Wallet information not available');
      return;
    }

    try {
      // Use the consolidated export service to get private key
      const exportResult = await walletExportService.exportWallet(currentUser.id.toString(), activeWalletAddress, {
        includeSeedPhrase: false,
        includePrivateKey: true
      });
      
      if (exportResult.success && exportResult.privateKey) {
        Alert.alert(
          'Export Private Key',
          'Your private key will be copied to clipboard. This can be used to import your wallet into external apps.\n\n⚠️ Keep your private key secure and never share it with anyone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Copy Private Key', 
              onPress: async () => {
                try {
                  await Clipboard.setString(exportResult.privateKey!);
                  Alert.alert('Copied', 'Private key copied to clipboard!');
                } catch (error) {
                  Alert.alert('Error', 'Failed to copy private key');
                }
              }
            }
          ]
        );
      } else {
        const errorMessage = exportResult.error || 'Private key not available for this wallet';
        Alert.alert('Export Error', errorMessage);
      }
    } catch (error) {
      logger.error('Failed to export private key', error, 'SeedPhraseViewScreen');
      Alert.alert('Export Error', 'Failed to retrieve private key. Please try again or contact support if the issue persists.');
    }
  };

  const handleShowExportInstructions = () => {
    // Get export instructions from consolidated export service
    const instructions = walletExportService.getExportInstructions();
    Alert.alert(
      'Export to External Wallets',
      instructions,
      [{ text: 'Got it' }]
    );
  };

  const handleDone = () => {
    navigation.navigate('Profile' as never);
  };

  const handleShowExportModal = () => {
    setShowExportModal(true);
  };

  const handleExportAll = async () => {
    if (!currentUser?.id || !activeWalletAddress) {
      Alert.alert('Error', 'Wallet information not available');
      return;
    }

    try {
      setExportLoading(true);
      
      const result = await walletExportService.exportWallet(currentUser.id.toString(), activeWalletAddress);
      
      if (result.success) {
        let message = `Wallet Address: ${result.walletAddress}\n\n`;
        
        if (result.seedPhrase) {
          message += `Seed Phrase: ${result.seedPhrase}\n\n`;
        }
        
        if (result.privateKey) {
          message += `Private Key: ${result.privateKey}\n\n`;
        }
        
        message += `Export Type: ${result.exportType}\n\n`;
        message += '⚠️ IMPORTANT: Keep this information safe and never share it with anyone!';
        
        Alert.alert('Complete Wallet Export', message, [
          { text: 'OK', style: 'default' }
        ]);
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export wallet');
      }
    } catch (error) {
      logger.error('Failed to export wallet', error, 'SeedPhraseViewScreen');
      Alert.alert('Export Error', 'Failed to export wallet. Please try again.');
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const handleDebugWallet = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      setDebugInfo(null);
      setShowDebugModal(true);

      // Get comprehensive wallet debug information
      const debugData = {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        walletInfo: {
          activeWalletAddress,
          seedPhraseLength: seedPhrase.length,
          hasSeedPhrase: seedPhrase.length > 0,
          hasValidSeedPhrase,
          seedPhrasePreview: seedPhrase.length > 0 ? seedPhrase.slice(0, 3).join(' ') + '...' : 'None',
          hasPrivateKey: !!privateKey,
          privateKeyPreview: privateKey ? privateKey.substring(0, 10) + '...' : 'None',
          isRevealed
        },
        recoveryInfo: await getRecoveryDebugInfo(currentUser.id.toString()),
        storageInfo: await getStorageDebugInfo(currentUser.id.toString())
      };

      setDebugInfo(debugData);
    } catch (error) {
      logger.error('Failed to get debug information', error, 'SeedPhraseViewScreen');
      Alert.alert('Debug Error', 'Failed to retrieve debug information');
      setShowDebugModal(false);
    }
  };

  const getRecoveryDebugInfo = async (userId: string) => {
    try {
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      return {
        success: recoveryResult.success,
        error: recoveryResult.error,
        hasWallet: !!recoveryResult.wallet,
        walletAddress: recoveryResult.wallet?.address,
        requiresUserAction: recoveryResult.requiresUserAction
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getStorageDebugInfo = async (userId: string) => {
    try {
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      
      return {
        storedWalletsCount: storedWallets.length,
        storedWalletAddresses: storedWallets.map(w => w.address),
        hasMnemonic: !!mnemonic,
        mnemonicLength: mnemonic ? mnemonic.split(' ').length : 0
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };


  if (loading) {
    return (
      <Container safeAreaEdges={['top', 'bottom']}>
        <Header 
          title="Seed phrase"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <View style={styles.loaderSeedPhraseContainer}>
          <Text style={styles.instructionsText}>Loading seed phrase...</Text>
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container safeAreaEdges={['top', 'bottom']}>
        <Header 
          title="Seed phrase"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <View style={styles.content}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Seed Phrase Unavailable</Text>
            <Text style={styles.instructionsText}>
              {error}
            </Text>
            <Text style={styles.instructionsText}>
              This may be because you're using an external wallet or the seed phrase is not available for this wallet type.
            </Text>
          </View>
        </View>
        
        {/* Done Button */}
        <TouchableOpacity 
          style={styles.doneButtonFixed}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </Container>
    );
  }

  return (
    <Container safeAreaEdges={['top', 'bottom']}>
      {/* Header */}
      <Header 
        title="Seed phrase"
        onBackPress={handleBack}
        showBackButton={true}
      />

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            {hasValidSeedPhrase 
              ? (showPrivateKey ? 'Export Your Private Key' : 'Write Down Your Seed Phrase')
              : 'Export Your Private Key'
            }
          </Text>
          <Text style={styles.instructionsText}>
            {hasValidSeedPhrase 
              ? (showPrivateKey 
                  ? 'Your wallet\'s private key. Write it down and keep it in a safe place. You can use this to import your wallet into other apps.'
                  : 'This is your wallet\'s 24-word seed phrase. Write it down on paper and keep it in a safe place. This seed phrase is compatible with most external wallets like Phantom and Solflare.'
                )
              : 'Your wallet was created using random key generation or the seed phrase is not available. You can export your wallet using the private key below. Write it down and keep it in a safe place.'
            }
          </Text>
          
          {/* Display wallet address for verification */}
          {activeWalletAddress && (
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressText}>{activeWalletAddress}</Text>
            </View>
          )}

          {/* Production Toggle Button - Only show if seed phrase is available */}
          {hasValidSeedPhrase && (
            <View style={{
              flexDirection: 'row',
              backgroundColor: colors.white5,
              borderRadius: spacing.radiusMd,
              padding: 4,
              marginTop: spacing.lg,
              borderWidth: 1,
              borderColor: colors.white10,
            }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: spacing.radiusSm,
                  alignItems: 'center',
                  backgroundColor: !showPrivateKey ? colors.green : 'transparent',
                }}
                onPress={() => setShowPrivateKey(false)}
              >
                <Text style={{
                  color: !showPrivateKey ? colors.white : colors.white70,
                  fontSize: typography.fontSize.sm,
                  fontWeight: !showPrivateKey ? typography.fontWeight.semibold : typography.fontWeight.medium,
                }}>
                  Seed Phrase
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: spacing.radiusSm,
                  alignItems: 'center',
                  backgroundColor: showPrivateKey ? colors.green : 'transparent',
                }}
                onPress={() => setShowPrivateKey(true)}
              >
                <Text style={{
                  color: showPrivateKey ? colors.white : colors.white70,
                  fontSize: typography.fontSize.sm,
                  fontWeight: showPrivateKey ? typography.fontWeight.semibold : typography.fontWeight.medium,
                }}>
                  Private Key
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Seed Phrase or Private Key Display */}
        <View style={styles.seedPhraseContainer}>
          {showPrivateKey || !hasValidSeedPhrase ? (
            <View style={styles.privateKeyContainer}>
              <View style={styles.privateKeyDisplay}>
                <Text style={styles.privateKeyText}>
                  {privateKey || 'Private key not available'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={handleExportPrivateKey}
              >
                <Text style={styles.copyButtonText}>Copy Private Key</Text>
              </TouchableOpacity>
              <Text style={styles.privateKeyWarning}>
                ⚠️ Keep your private key secure and never share it with anyone.
              </Text>
            </View>
          ) : !isRevealed ? (
            <TouchableOpacity 
              style={styles.blurredContainer}
              onPress={handleReveal}
              activeOpacity={0.8}
            >
              <View style={styles.blurOverlay} />
              <Text style={styles.blurredText}>Tap to reveal your seed phrase</Text>
              <Text style={styles.blurredSubtext}>Make sure no one is watching your screen.</Text>
              <View style={styles.revealButton}>
                <Image source={require('../../../assets/eye-icon.png')} style={styles.iconWrapper} />
                <Text style={styles.revealButtonText}>View</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.seedPhraseGrid}>
              {seedPhrase.map((word, index) => (
                <View key={index} style={styles.seedWordContainer}>
                  <Text style={styles.seedWordNumber}>{index + 1}.</Text>
                  <Text style={styles.seedWord}>{word}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(isRevealed || !hasValidSeedPhrase) && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={showPrivateKey || !hasValidSeedPhrase ? handleExportPrivateKey : handleCopySeedPhrase}
            >
              <Text style={styles.copyButtonText}>
                {showPrivateKey || !hasValidSeedPhrase ? 'Copy Private Key' : 'Copy Seed Phrase'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.copyButton, styles.exportAllButton]}
              onPress={handleShowExportModal}
            >
              <Text style={styles.exportAllButtonText}>Export All</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Debug Button - Always visible for troubleshooting */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.copyButton, { backgroundColor: colors.white10, borderColor: colors.white10 }]}
            onPress={handleDebugWallet}
          >
            <Text style={[styles.copyButtonText, { color: colors.white70 }]}>🔍 Debug Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer to ensure content doesn't get covered by fixed button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* Done Button - Fixed at bottom */}
      <TouchableOpacity 
        style={styles.doneButtonFixed}
        onPress={handleDone}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export Wallet</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.instructionsText, { fontSize: 18, fontWeight: 'bold' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={{ paddingVertical: 20 }}>
              <Text style={styles.exportDescription}>
                Choose how you want to export your wallet information. This will allow you to use your wallet in external apps like Phantom or Solflare.
              </Text>

              <TouchableOpacity
                style={[styles.exportOptionButton, exportLoading && styles.exportOptionButtonDisabled]}
                onPress={handleExportAll}
                disabled={exportLoading}
              >
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Export Everything</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Get your wallet address, seed phrase, and private key
                  </Text>
                </View>
                {exportLoading && (
                  <ActivityIndicator size="small" color={colors.primaryGreen} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOptionButton, styles.exportOptionButtonSecondary, exportLoading && styles.exportOptionButtonDisabled]}
                onPress={() => {
                  // Export only seed phrase
                  const result = walletExportService.exportWallet(currentUser?.id?.toString() || '', activeWalletAddress || '', {
                    includeSeedPhrase: true,
                    includePrivateKey: false
                  });
                  result.then(exportResult => {
                    if (exportResult.success && exportResult.seedPhrase) {
                      Alert.alert('Seed Phrase', exportResult.seedPhrase);
                    } else {
                      Alert.alert('Export Failed', exportResult.error || 'Failed to export seed phrase');
                    }
                  });
                }}
                disabled={exportLoading}
              >
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Seed Phrase Only</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Get your 12 or 24-word seed phrase
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOptionButton, styles.exportOptionButtonSecondary, exportLoading && styles.exportOptionButtonDisabled]}
                onPress={handleExportPrivateKey}
                disabled={exportLoading}
              >
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Private Key Only</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Get your wallet's private key
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOptionButton, styles.exportOptionButtonSecondary]}
                onPress={handleShowExportInstructions}
              >
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Export Instructions</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Learn how to import into external wallets
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Security Warning</Text>
              <Text style={styles.warningText}>
                Never share your seed phrase or private key with anyone. Anyone with access to these credentials can control your wallet and steal your funds.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Debug Modal */}
      <Modal
        visible={showDebugModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDebugModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wallet Debug Information</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDebugModal(false)}
            >
              <Text style={[styles.instructionsText, { fontSize: 18, fontWeight: 'bold' }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {debugInfo ? (
              <View style={{ padding: 16 }}>
                <Text style={[styles.instructionsTitle, { marginTop: 20, marginBottom: 10 }]}>Wallet Information</Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  User ID: {debugInfo.userId}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Timestamp: {debugInfo.timestamp}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Active Wallet: {debugInfo.walletInfo.activeWalletAddress || 'None'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Seed Phrase Length: {debugInfo.walletInfo.seedPhraseLength}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Has Seed Phrase: {debugInfo.walletInfo.hasSeedPhrase ? 'Yes' : 'No'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Has Valid Seed Phrase: {debugInfo.walletInfo.hasValidSeedPhrase ? 'Yes' : 'No'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Seed Phrase Preview: {debugInfo.walletInfo.seedPhrasePreview}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Has Private Key: {debugInfo.walletInfo.hasPrivateKey ? 'Yes' : 'No'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Private Key Preview: {debugInfo.walletInfo.privateKeyPreview}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Is Revealed: {debugInfo.walletInfo.isRevealed ? 'Yes' : 'No'}
                </Text>

                <Text style={[styles.instructionsTitle, { marginTop: 20, marginBottom: 10 }]}>Recovery Information</Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Recovery Success: {debugInfo.recoveryInfo.success ? 'Yes' : 'No'}
                </Text>
                {debugInfo.recoveryInfo.error && (
                  <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                    Recovery Error: {debugInfo.recoveryInfo.error}
                  </Text>
                )}
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Has Wallet: {debugInfo.recoveryInfo.hasWallet ? 'Yes' : 'No'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Recovered Address: {debugInfo.recoveryInfo.walletAddress || 'None'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Requires User Action: {debugInfo.recoveryInfo.requiresUserAction ? 'Yes' : 'No'}
                </Text>

                <Text style={[styles.instructionsTitle, { marginTop: 20, marginBottom: 10 }]}>Storage Information</Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Stored Wallets Count: {debugInfo.storageInfo.storedWalletsCount}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Stored Addresses: {debugInfo.storageInfo.storedWalletAddresses?.join(', ') || 'None'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Has Mnemonic: {debugInfo.storageInfo.hasMnemonic ? 'Yes' : 'No'}
                </Text>
                <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                  Mnemonic Length: {debugInfo.storageInfo.mnemonicLength}
                </Text>
                {debugInfo.storageInfo.error && (
                  <Text style={[styles.instructionsText, { fontFamily: 'monospace' }]}>
                    Storage Error: {debugInfo.storageInfo.error}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.loaderSeedPhraseContainer}>
                <ActivityIndicator size="large" color={colors.primaryGreen} />
                <Text style={styles.instructionsText}>Gathering debug information...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </Container>
  );
};

export default SeedPhraseViewScreen; 