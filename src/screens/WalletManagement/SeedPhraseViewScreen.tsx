import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Clipboard,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { useWallet } from '../../context/WalletContext';
import { walletService } from '../../services/blockchain/wallet';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(null);
  
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

        logger.info('Retrieving seed phrase from secure device storage', null, 'SeedPhraseViewScreen');
        
        // First, get the active wallet address (the one displayed in dashboard)
        const walletResult = await walletService.ensureUserWallet(currentUser.id.toString());
        
        if (!walletResult.success || !walletResult.wallet) {
          logger.error('Failed to get active wallet', { userId: currentUser.id }, 'SeedPhraseViewScreen');
          setError('Failed to retrieve wallet information');
          setLoading(false);
          return;
        }

        const activeWalletAddress = walletResult.wallet.address;
        setActiveWalletAddress(activeWalletAddress);
        logger.info('Active wallet address retrieved', { 
          userId: currentUser.id, 
          walletAddress: activeWalletAddress 
        }, 'SeedPhraseViewScreen');
        
        // Now get the seed phrase for this specific wallet address
        const mnemonic = await walletService.getSeedPhraseForWallet(currentUser.id.toString(), activeWalletAddress);
        
        if (mnemonic) {
          // Format seed phrase for display
          const seedPhraseWords = mnemonic.split(' ');
          setSeedPhrase(seedPhraseWords);
          logger.info('Seed phrase retrieved successfully for active wallet', { 
            userId: currentUser.id,
            walletAddress: activeWalletAddress,
            wordCount: seedPhraseWords.length
          }, 'SeedPhraseViewScreen');
        } else {
          // Don't show error - just leave seed phrase empty for user-friendly experience
          logger.info('No seed phrase found for active wallet - user will see empty state', { 
            userId: currentUser.id,
            walletAddress: activeWalletAddress
          }, 'SeedPhraseViewScreen');
        }
      } catch (err) {
        console.error('🔐 SeedPhraseView: Error retrieving secure seed phrase:', err);
        // Don't show error to user - keep it user-friendly
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
      const privateKey = await walletService.getPrivateKeyForWallet(currentUser.id.toString(), activeWalletAddress);
      
      if (privateKey) {
        Alert.alert(
          'Export Private Key',
          'Your private key will be copied to clipboard. This can be used to import your wallet into external apps.\n\n⚠️ Keep your private key secure and never share it with anyone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Copy Private Key', 
              onPress: async () => {
                try {
                  await Clipboard.setString(privateKey);
                  Alert.alert('Copied', 'Private key copied to clipboard!');
                } catch (error) {
                  Alert.alert('Error', 'Failed to copy private key');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Private key not available for this wallet');
      }
    } catch (error) {
      logger.error('Failed to export private key', error, 'SeedPhraseViewScreen');
      Alert.alert('Error', 'Failed to retrieve private key');
    }
  };

  const handleShowExportInstructions = () => {
    // Get export instructions from walletService
    const instructions = walletService.getExportInstructions();
    Alert.alert(
      'Export to External Wallets',
      instructions,
      [{ text: 'Got it' }]
    );
  };

  const handleDone = () => {
    navigation.navigate('Profile' as never);
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
          <Text style={styles.instructionsTitle}>Write Down Your Seed Phrase</Text>
          <Text style={styles.instructionsText}>
            {!isRevealed 
              ? `This is your single app wallet's ${seedPhrase.length || 24}-word seed phrase. Write it down on a paper and keep it in a safe place. This seed phrase is compatible with most external wallets like Phantom and Solflare.`
              : `This is your single app wallet's ${seedPhrase.length || 24}-word seed phrase. Write it down on a paper and keep it in a safe place. You can use this to export your wallet to other apps.`
            }
          </Text>
          
          {/* Display wallet address for verification */}
          {activeWalletAddress && (
            <View style={styles.walletAddressContainer}>
              <Text style={styles.walletAddressLabel}>Wallet Address:</Text>
              <Text style={styles.walletAddressText}>{activeWalletAddress}</Text>
            </View>
          )}
        </View>

        {/* Seed Phrase Display */}
        <View style={styles.seedPhraseContainer}>
          {seedPhrase.length === 0 ? (
            <View style={styles.noSeedPhraseContainer}>
              <Text style={styles.noSeedPhraseTitle}>No Seed Phrase Available</Text>
              <Text style={styles.noSeedPhraseText}>
                Your wallet was created using random key generation, so no seed phrase is available for export.
              </Text>
              <Text style={styles.noSeedPhraseSubtext}>
                However, you can still export your wallet using the private key below.
              </Text>
              
              {/* Private Key Export Section */}
              <View style={styles.privateKeyExportSection}>
                <Text style={styles.privateKeyLabel}>Export via Private Key:</Text>
                <TouchableOpacity 
                  style={styles.privateKeyButton}
                  onPress={handleExportPrivateKey}
                >
                  <Text style={styles.privateKeyButtonText}>Export Private Key</Text>
                </TouchableOpacity>
                <Text style={styles.privateKeyNote}>
                  ⚠️ Keep your private key secure and never share it with anyone.
                </Text>
              </View>
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
        {isRevealed && seedPhrase.length > 0 && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={handleCopySeedPhrase}
            >
              <Text style={styles.copyButtonText}>Copy Seed Phrase</Text>
            </TouchableOpacity>
          </View>
        )}

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
    </Container>
  );
};

export default SeedPhraseViewScreen; 