import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { useWallet } from '../../context/WalletContext';
import { walletService } from '../../services/WalletService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/loggingService';
import { Container, Header } from '../../components/shared';

const SeedPhraseViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [isRevealed, setIsRevealed] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        
        // Initialize secure wallet if needed
        // Initialize secure wallet
        const { address, isNew } = await walletService.initializeSecureWallet(currentUser.id.toString());
        
        if (isNew) {
          logger.info('New secure wallet created for user', { userId: currentUser.id }, 'SeedPhraseViewScreen');
        } else {
          logger.info('Existing app wallet seed phrase retrieved for user', { userId: currentUser.id }, 'SeedPhraseViewScreen');
        }

        // Get the seed phrase from secure device storage
        // Get seed phrase from walletService
        const mnemonic = await walletService.getSeedPhrase(currentUser.id.toString());
        
        if (mnemonic) {
          // Format seed phrase for display
          const seedPhraseWords = mnemonic.split(' ');
          setSeedPhrase(seedPhraseWords);
          logger.info('Seed phrase retrieved successfully from device storage', null, 'SeedPhraseViewScreen');
        } else {
          // Don't show error - just leave seed phrase empty for user-friendly experience
          logger.info('No seed phrase found - user will see empty state', null, 'SeedPhraseViewScreen');
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
      Alert.alert(
        'No Seed Phrase Available',
        'No seed phrase found for your wallet. This may be because:\n\n• Your wallet was created externally\n• The seed phrase is not available on this device\n\nYou can still use your wallet normally, but you won\'t be able to export it to other apps.',
        [{ text: 'OK' }]
      );
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
        />

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Write Down Your Seed Phrase</Text>
          <Text style={styles.instructionsText}>
            {!isRevealed 
              ? "This is your single app wallet's 12-word seed phrase. Write it down on a paper and keep it in a safe place. This seed phrase is compatible with most external wallets like Phantom and Solflare."
              : "This is your single app wallet's 12-word seed phrase. Write it down on a paper and keep it in a safe place. You can use this to export your wallet to other apps."
            }
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

      </View>
      
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