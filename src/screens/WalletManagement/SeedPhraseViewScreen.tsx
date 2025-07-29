import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';
import { useWallet } from '../../context/WalletContext';
import { solanaAppKitService } from '../../services/solanaAppKitService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { userWalletService } from '../../services/userWalletService';
import { useApp } from '../../context/AppContext';

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

  // Get actual seed phrase from wallet
  useEffect(() => {
    const getSeedPhrase = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First ensure the app wallet is initialized
        if (currentUser?.id) {
          console.log('🔍 SeedPhraseView: Ensuring app wallet is initialized...');
          try {
            await userWalletService.ensureUserWallet(currentUser.id.toString());
            console.log('🔍 SeedPhraseView: App wallet ensured successfully');
          } catch (ensureError) {
            console.error('🔍 SeedPhraseView: Error ensuring app wallet:', ensureError);
          }
        }
        
        // Try to get seed phrase from Firebase first
        if (currentUser?.id) {
          try {
            const userSeedPhrase = await firebaseDataService.user.getUserSeedPhrase(currentUser.id.toString());
            if (userSeedPhrase && userSeedPhrase.length > 0) {
              setSeedPhrase(userSeedPhrase);
              setLoading(false);
              return;
            }
          } catch (firebaseError) {
            // Continue to fallback logic
            if (__DEV__) { console.log('No seed phrase in Firebase, generating one...'); }
          }
        }
        
        // If no seed phrase exists, generate one for the user
        if (currentUser?.id && currentUser?.wallet_address) {
          try {
            if (__DEV__) { console.log('🔧 Generating seed phrase for existing user:', currentUser.id); }
            
            // Generate a new seed phrase
            const newSeedPhrase = solanaAppKitService.generateMnemonic().split(' ');
            
            // Save it to Firebase
            await firebaseDataService.user.saveUserSeedPhrase(currentUser.id.toString(), newSeedPhrase);
            
            if (__DEV__) { console.log('✅ Seed phrase generated and saved for user:', currentUser.id); }
            
            setSeedPhrase(newSeedPhrase);
            setLoading(false);
            return;
          } catch (generateError) {
            console.error('Error generating seed phrase:', generateError);
            setError('Failed to generate seed phrase. Please try again later.');
            setLoading(false);
            return;
          }
        }
        
        // Fallback: Try to get seed phrase from the app wallet
        if (appWalletConnected && appWalletAddress) {
          console.log('🔍 SeedPhraseView: App wallet connected, checking for seed phrase...');
          
          // For app-generated wallets, we can derive the seed phrase
          // Note: This is a simplified approach - in production you'd want more secure handling
          const walletData = await solanaAppKitService.getWalletInfo();
          
          // Check if this is an app-generated wallet that might have a mnemonic
          if (walletData && walletData.walletType === 'app-generated') {
            // For now, we'll show a message that seed phrases are not yet implemented
            // In a real implementation, you'd store the mnemonic when creating the wallet
            setError('Seed phrase feature not yet implemented for app-generated wallets. This feature will be available in a future update.');
          } else {
            setError('Seed phrase not available for external wallets. External wallets manage their own seed phrases.');
          }
        } else if (secretKey) {
          // Fallback to external wallet if app wallet not available
          console.log('🔍 SeedPhraseView: Using external wallet as fallback...');
          setError('Seed phrase not available for external wallets. External wallets manage their own seed phrases.');
        } else {
          setError('No app wallet connected. Please ensure you have an app wallet set up.');
        }
      } catch (err) {
        console.error('Error getting seed phrase:', err);
        setError('Failed to retrieve seed phrase. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    getSeedPhrase();
  }, [secretKey, currentUser?.id]);

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
    navigation.navigate('SeedPhraseVerify' as never);
  };

  const handleCopy = () => {
    const seedPhraseText = seedPhrase.join(' ');
    Clipboard.setString(seedPhraseText);
    Alert.alert('Copied!', 'Seed phrase has been copied to clipboard.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
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
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
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
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seed phrase</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Write Down Your Seed Phrase</Text>
          <Text style={styles.instructionsText}>
            {!isRevealed 
              ? "This is your seed phrase. Write it down on a paper and keep it in a safe place. You'll be asked to re-enter this phrase (in order) on the next step."
              : "This is your seed phrase. Write it down on a paper and keep it in a safe place."
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
                <Icon name="eye" size={20} color={colors.white} />
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

        {/* Copy Button */}
        {isRevealed && (
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={handleCopy}
          >
            <Text style={styles.copyButtonText}>Copy</Text>
            <Icon name="copy" size={20} color={colors.black} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SeedPhraseViewScreen; 