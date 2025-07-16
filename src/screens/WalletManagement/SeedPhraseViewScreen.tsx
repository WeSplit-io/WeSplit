import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { useWallet } from '../../context/WalletContext';
import { solanaAppKitService } from '../../services/solanaAppKitService';

const SeedPhraseViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isRevealed, setIsRevealed] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { walletInfo, secretKey } = useWallet();

  // Get actual seed phrase from wallet
  useEffect(() => {
    const getSeedPhrase = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get seed phrase from the wallet service
        if (secretKey) {
          // For app-generated wallets, we can derive the seed phrase
          // Note: This is a simplified approach - in production you'd want more secure handling
          const walletData = await solanaAppKitService.getWalletInfo();
          
          // Check if this is an app-generated wallet that might have a mnemonic
          if (walletData.walletType === 'app-generated') {
            // For now, we'll show a message that seed phrases are not yet implemented
            // In a real implementation, you'd store the mnemonic when creating the wallet
            setError('Seed phrase feature not yet implemented for app-generated wallets');
          } else {
            setError('Seed phrase not available for external wallets');
          }
        } else {
          setError('No wallet connected');
        }
      } catch (err) {
        console.error('Error getting seed phrase:', err);
        setError('Failed to retrieve seed phrase');
      } finally {
        setLoading(false);
      }
    };

    getSeedPhrase();
  }, [secretKey]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleReveal = () => {
    if (error) {
      Alert.alert('Error', error);
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
    navigation.navigate('SeedPhraseVerify');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seed phrase</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <Text style={styles.instructionsText}>Loading seed phrase...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seed phrase</Text>
          <View style={styles.placeholder} />
        </View>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seed phrase</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Write Down Your Seed Phrase</Text>
          <Text style={styles.instructionsText}>
            This is your seed phrase. Write it down on a paper and keep it in a safe place. 
            You'll be asked to re-enter this phrase (in order) on the next step.
          </Text>
        </View>

        {/* Seed Phrase Display */}
        <View style={styles.seedPhraseContainer}>
          {!isRevealed ? (
            <View style={styles.blurredContainer}>
              <Text style={styles.blurredText}>Tap to reveal your seed phrase</Text>
              <Text style={styles.blurredSubtext}>Make sure no one is watching your screen.</Text>
              <TouchableOpacity 
                style={styles.revealButton}
                onPress={handleReveal}
              >
                <Icon name="eye" size={20} color={colors.white} />
                <Text style={styles.revealButtonText}>View</Text>
              </TouchableOpacity>
            </View>
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

        {/* Next Button */}
        {isRevealed && (
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="chevron-right" size={20} color={colors.black} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SeedPhraseViewScreen; 