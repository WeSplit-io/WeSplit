import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { styles } from './SeedPhraseViewScreen.styles';
import { walletExportService } from '../../services/blockchain/wallet/walletExportService';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { Container, Header, Button, PhosphorIcon, Loader } from '../../components/shared';
import { typography } from '../../theme/typography';
import * as ClipboardModule from 'expo-clipboard';

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
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [hasValidSeedPhrase, setHasValidSeedPhrase] = useState(false);

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

        // Note: Authentication is handled centrally (e.g., in DashboardScreen)
        // secureVault.get() will automatically wait for any in-progress authentication
        // No need to call ensureVaultAuthenticated() here - it would cause duplicate prompts

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
              logger.debug('Seed phrase retrieved successfully', { wordCount: seedPhraseWords.length }, 'SeedPhraseViewScreen');
            } else {
              logger.debug('Invalid seed phrase format, will show private key', { wordCount: seedPhraseWords.length }, 'SeedPhraseViewScreen');
              setSeedPhrase([]); // Clear invalid seed phrase
              setHasValidSeedPhrase(false);
            }
          } else {
            logger.debug('No seed phrase available, will show private key', {}, 'SeedPhraseViewScreen');
            setSeedPhrase([]); // Ensure seed phrase is empty
            setHasValidSeedPhrase(false);
          }
        } else {
          setError(exportResult.error || 'Failed to retrieve wallet data');
        }
      } catch (err) {
        logger.error('Error retrieving secure wallet export data', { error: err }, 'SeedPhraseViewScreen');
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

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
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
      await ClipboardModule.setStringAsync(seedPhraseText);
      Alert.alert('Copied', 'Seed phrase copied to clipboard!');
      
      // Track seed phrase export reward (non-blocking)
      if (currentUser?.id) {
        try {
          const { userActionSyncService } = await import('../../services/rewards/userActionSyncService');
          await userActionSyncService.syncSeedPhraseExport(currentUser.id);
        } catch (rewardError) {
          logger.error('Failed to track seed phrase export reward', {
            userId: currentUser.id,
            rewardError
          }, 'SeedPhraseViewScreen');
          // Don't fail copy if reward tracking fails
        }
      }
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
                  await ClipboardModule.setStringAsync(exportResult.privateKey!);
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

  const handleDone = () => {
    navigation.navigate('Profile' as never);
  };


  if (loading) {
    return (
      <Container safeAreaEdges={['top', 'bottom']}>
        <Header
          showBackButton={true}
          onBackPress={handleBack}
          showHelpCenter={true}
          onHelpCenterPress={handleHelpCenterPress}
        />
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container safeAreaEdges={['top', 'bottom']}>
        <View style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Header
              showBackButton={true}
              onBackPress={handleBack}
              showHelpCenter={true}
              onHelpCenterPress={handleHelpCenterPress}
            />
            <View style={styles.contentContainer}>
              <View style={styles.titleContainer}>
                <View style={styles.iconContainer}>
                  <PhosphorIcon name="Keyhole" size={24} color={colors.white} weight="regular" />
                </View>
                <Text style={styles.title}>Seed Phrase Unavailable</Text>
                <Text style={styles.subtitle}>
                  {error}
                </Text>
                <Text style={styles.subtitle}>
                  This may be because you're using an external wallet or the seed phrase is not available for this wallet type.
                </Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <Button
              title="Done"
              onPress={handleDone}
              variant="primary"
              size="large"
              fullWidth={true}
            />
          </View>
        </View>
      </Container>
    );
  }

  // Only show seed phrase view if we have a valid seed phrase
  if (!hasValidSeedPhrase) {
    // Fallback to private key view if no seed phrase
    return (
      <Container safeAreaEdges={['top', 'bottom']}>
        <View style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Header
              showBackButton={true}
              onBackPress={handleBack}
              showHelpCenter={true}
              onHelpCenterPress={handleHelpCenterPress}
            />
            <View style={styles.contentContainer}>
              <View style={styles.titleContainer}>
                <View style={styles.iconContainer}>
                  <PhosphorIcon name="Keyhole" size={24} color={colors.white} weight="regular" />
                </View>
                <Text style={styles.title}>Export Your Private Key</Text>
                <Text style={styles.subtitle}>
                  Your wallet was created using random key generation or the seed phrase is not available. You can export your wallet using the private key below.
                </Text>
              </View>
              <View style={styles.privateKeyContainer}>
                <View style={styles.privateKeyDisplay}>
                  <Text style={styles.privateKeyText}>
                    {privateKey || 'Private key not available'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <Button
              title="Done"
              onPress={handleDone}
              variant="primary"
              size="large"
              fullWidth={true}
            />
          </View>
        </View>
      </Container>
    );
  }

  return (
    <Container safeAreaEdges={['top', 'bottom']}>
      <View style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header
            showBackButton={true}
            onBackPress={handleBack}
            showHelpCenter={true}
            onHelpCenterPress={handleHelpCenterPress}
          />

          <View style={styles.contentContainer}>
            {/* Title and Subtitle */}
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <PhosphorIcon name="Keyhole" size={24} color={colors.white} weight="regular" />
              </View>
              <Text style={styles.title}>
                Write down your seed phrase
              </Text>
              <Text style={styles.subtitle}>
                Write down the words in the sequence below and keep them safe. Don't share them with anyone, or you may permanently lose your assets.
              </Text>
            </View>

            {/* Seed Phrase Display */}
            <View style={styles.seedPhraseContainer}>
              {!isRevealed ? (
                <TouchableOpacity 
                  style={styles.blurredContainer}
                  onPress={handleReveal}
                  activeOpacity={0.8}
                >
                  <TouchableOpacity 
                    style={styles.revealButton}
                    onPress={handleReveal}
                    activeOpacity={0.7}
                  >
                    <PhosphorIcon name="Eye" size={20} color={colors.white} />
                    <Text style={styles.revealButtonText}>Reveal</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.seedPhraseGrid}>
                    {seedPhrase.map((word, index) => (
                      <View key={index} style={styles.seedWordContainer}>
                        <Text style={styles.seedWordNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                        <Text style={styles.seedWord}>{word}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Copy Button */}
                  <TouchableOpacity 
                    style={styles.copyLinkContainer}
                    onPress={handleCopySeedPhrase}
                    activeOpacity={0.7}
                  >
                    <PhosphorIcon name="Copy" size={16} color={colors.white} />
                    <Text style={styles.copyLinkText}>Copy</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Done Button - Fixed at bottom */}
        <View style={styles.buttonContainer}>
          <Button
            title="Done"
            onPress={handleDone}
            variant="primary"
            size="large"
            fullWidth={true}
          />
        </View>
      </View>
    </Container>
  );
};

export default SeedPhraseViewScreen; 