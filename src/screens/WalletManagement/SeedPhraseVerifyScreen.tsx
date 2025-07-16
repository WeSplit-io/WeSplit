import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const SeedPhraseVerifyScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [enteredWords, setEnteredWords] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [verificationComplete, setVerificationComplete] = useState(false);
  
  // Mock seed phrase for verification - in real app this would come from context
  const originalSeedPhrase = [
    'future', 'use', 'abuse', 'bubble', 'disagree', 'yard',
    'exit', 'enact', 'drum', 'frequent', 'target', 'organ'
  ];

  // Shuffled words for selection
  const shuffledWords = [...originalSeedPhrase].sort(() => Math.random() - 0.5);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleWordSelect = (word: string) => {
    setSelectedWord(word);
  };

  const handleConfirmWord = () => {
    if (!selectedWord) return;

    const newEnteredWords = [...enteredWords, selectedWord];
    setEnteredWords(newEnteredWords);
    setSelectedWord('');

    if (newEnteredWords.length === originalSeedPhrase.length) {
      // Verify the complete phrase
      const isCorrect = newEnteredWords.every((word, index) => word === originalSeedPhrase[index]);
      
      if (isCorrect) {
        setVerificationComplete(true);
        Alert.alert(
          'Success!',
          'Your seed phrase has been verified successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
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

  return (
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
  );
};

export default SeedPhraseVerifyScreen; 