import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { Container } from '../../components/shared';

// Temporary inline styles to fix the import issue
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  instructionsContainer: {
    marginBottom: spacing.xl,
  },
  instructionsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.white10,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brandGreen,
    borderRadius: 2,
  },
  currentWordContainer: {
    backgroundColor: colors.white10,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  currentWordLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  currentWordText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  enteredWordsContainer: {
    marginBottom: spacing.xl,
  },
  enteredWordsLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  enteredWordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  enteredWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    marginBottom: spacing.sm,
    width: '48%',
  },
  enteredWordNumber: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginRight: spacing.sm,
  },
  enteredWord: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  wordSelectionContainer: {
    marginBottom: spacing.xl,
  },
  wordSelectionLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
  },
  wordSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordSelectionButton: {
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    marginBottom: spacing.sm,
    width: '48%',
    alignItems: 'center',
  },
  wordSelectionButtonSelected: {
    backgroundColor: colors.brandGreen,
  },
  wordSelectionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
  },
  wordSelectionButtonTextSelected: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  clearButton: {
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.lg,
    flex: 1,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  confirmButton: {
    backgroundColor: colors.brandGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.lg,
    flex: 1,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.white10,
  },
  confirmButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

const SeedPhraseVerifyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { state } = useApp();
  const { currentUser } = state;
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [enteredWords, setEnteredWords] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [originalSeedPhrase, setOriginalSeedPhrase] = useState<string[]>([]);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load seed phrase from Firebase
  useEffect(() => {
    const loadSeedPhrase = async () => {
      if (!currentUser?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user's seed phrase from Firebase
        const userSeedPhrase = await firebaseDataService.user.getUserSeedPhrase(currentUser.id.toString());
        
        if (userSeedPhrase && userSeedPhrase.length > 0) {
          setOriginalSeedPhrase(userSeedPhrase);
          // Create shuffled words for selection
          setShuffledWords([...userSeedPhrase].sort(() => Math.random() - 0.5));
        } else {
          setError('No seed phrase found for this user');
        }
      } catch (error) {
        console.error('Error loading seed phrase:', error);
        setError('Failed to load seed phrase');
      } finally {
        setLoading(false);
      }
    };

    loadSeedPhrase();
  }, [currentUser?.id]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleWordSelect = (word: string) => {
    setSelectedWord(word);
  };

  const handleConfirmWord = async () => {
    if (!selectedWord) {return;}

    const newEnteredWords = [...enteredWords, selectedWord];
    setEnteredWords(newEnteredWords);
    setSelectedWord('');

    if (newEnteredWords.length === originalSeedPhrase.length) {
      // Verify the complete phrase
      const isCorrect = newEnteredWords.every((word, index) => word === originalSeedPhrase[index]);
      
      if (isCorrect) {
        setVerificationComplete(true);
        
        // Mark seed phrase as verified in Firebase
        try {
          await firebaseDataService.user.markSeedPhraseVerified(currentUser!.id.toString());
          
          Alert.alert(
            'Success!',
            'Your seed phrase has been verified successfully.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } catch (error) {
          console.error('Error marking seed phrase as verified:', error);
          Alert.alert(
            'Verification Complete',
            'Your seed phrase has been verified successfully.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        Alert.alert(
          'Incorrect Seed Phrase',
          'The seed phrase you entered is incorrect. Please try again.',
          [
            { text: 'Try Again', onPress: () => {
              setEnteredWords([]);
              setCurrentWordIndex(0);
            }}
          ]
        );
      }
    } else {
      setCurrentWordIndex(newEnteredWords.length);
    }
  };

  const handleClearLastWord = () => {
    if (enteredWords.length > 0) {
      const newEnteredWords = enteredWords.slice(0, -1);
      setEnteredWords(newEnteredWords);
      setCurrentWordIndex(newEnteredWords.length);
    }
  };

  const getCurrentExpectedWord = () => {
    return originalSeedPhrase[currentWordIndex];
  };

  if (loading) {
    return (
      <Container>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Seed Phrase</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <Text style={styles.instructionsText}>Loading seed phrase...</Text>
        </View>
      </Container>
    );
  }

  if (error || originalSeedPhrase.length === 0) {
    return (
      <Container>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Seed Phrase</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Seed Phrase Unavailable</Text>
            <Text style={styles.instructionsText}>
              {error || 'No seed phrase found for verification'}
            </Text>
          </View>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Seed Phrase</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Verify Your Seed Phrase</Text>
          <Text style={styles.instructionsText}>
            Please re-enter your seed phrase in the correct order to verify you have written it down correctly.
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentWordIndex + 1} of {originalSeedPhrase.length} words
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentWordIndex + 1) / originalSeedPhrase.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Current Word Display */}
        <View style={styles.currentWordContainer}>
          <Text style={styles.currentWordLabel}>Word {currentWordIndex + 1}:</Text>
          <Text style={styles.currentWordText}>{getCurrentExpectedWord()}</Text>
        </View>

        {/* Entered Words Display */}
        <View style={styles.enteredWordsContainer}>
          <Text style={styles.enteredWordsLabel}>Your Entry:</Text>
          <View style={styles.enteredWordsGrid}>
            {enteredWords.map((word, index) => (
              <View key={index} style={styles.enteredWordContainer}>
                <Text style={styles.enteredWordNumber}>{index + 1}.</Text>
                <Text style={styles.enteredWord}>{word}</Text>
              </View>
            ))}
            {selectedWord && (
              <View style={styles.enteredWordContainer}>
                <Text style={styles.enteredWordNumber}>{enteredWords.length + 1}.</Text>
                <Text style={styles.enteredWord}>{selectedWord}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Word Selection Grid */}
        <View style={styles.wordSelectionContainer}>
          <Text style={styles.wordSelectionLabel}>Select the correct word:</Text>
          <View style={styles.wordSelectionGrid}>
            {shuffledWords.map((word, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.wordSelectionButton,
                  selectedWord === word && styles.wordSelectionButtonSelected
                ]}
                onPress={() => handleWordSelect(word)}
              >
                <Text style={[
                  styles.wordSelectionButtonText,
                  selectedWord === word && styles.wordSelectionButtonTextSelected
                ]}>
                  {word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearLastWord}
            disabled={enteredWords.length === 0}
          >
            <Text style={styles.clearButtonText}>Clear Last</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              !selectedWord && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmWord}
            disabled={!selectedWord}
          >
            <Text style={styles.confirmButtonText}>Confirm Word</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
};

export default SeedPhraseVerifyScreen; 