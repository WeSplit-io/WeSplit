/**
 * Shared Wallet Name Screen
 * First step in shared wallet creation - name input with validation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Container,
  Button,
  Input,
  Header,
} from '../../components/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';

interface SharedWalletNameScreenProps {
  navigation: any;
  route: any;
}

const SharedWalletNameScreen: React.FC<SharedWalletNameScreenProps> = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: { name?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Wallet name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name]);

  const handleNext = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsValidating(true);

    try {
      const trimmedName = name.trim();

      logger.info('Shared wallet name validated', {
        name: trimmedName
      }, 'SharedWalletNameScreen');

      // Navigate to members screen with validated data
      navigation.navigate('SharedWalletMembers', {
        walletName: trimmedName,
      });

    } catch (error) {
      logger.error('Error validating shared wallet name', error, 'SharedWalletNameScreen');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsValidating(false);
    }
  }, [validateForm, name, navigation]);

  return (
    <Container>
      <Header
        title="Create Shared Wallet"
        subtitle="Step 1 of 3: Basic Information"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
          <View style={styles.stepIndicators}>
            <View style={[styles.stepIndicator, styles.stepActive]}>
              <Text style={[styles.stepText, styles.stepTextActive]}>1</Text>
            </View>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>3</Text>
            </View>
          </View>
        </View>

        {/* Wallet Name Input */}
        <Input
          label="Wallet Name"
          placeholder="Enter your wallet name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) {
              setErrors(prev => ({ ...prev, name: undefined }));
            }
          }}
          error={errors.name}
          leftIcon="Wallet"
          required
          containerStyle={styles.inputContainer}
          maxLength={100}
        />

        {/* Example Suggestions */}
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesLabel}>Examples:</Text>
          <View style={styles.examplesList}>
            {['Trip to Bali', 'Apartment Rent', 'Party Fund', 'Family Vacation', 'Business Trip', 'Concert Tickets'].map((example, index) => (
              <TouchableOpacity
                key={example}
                style={styles.exampleChip}
                onPress={() => setName(example)}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Button */}
        <Button
          title="Next: Add Members"
          onPress={handleNext}
          variant="primary"
          size="large"
          disabled={isValidating || !name.trim()}
          loading={isValidating}
          fullWidth
          style={styles.nextButton}
          icon="ArrowRight"
          iconPosition="right"
        />
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.white10,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white20,
  },
  stepActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  stepText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white70,
  },
  stepTextActive: {
    color: colors.white,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  nextButton: {
    marginTop: spacing.md,
  },
  examplesContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  examplesLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  examplesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exampleChip: {
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.white20,
  },
  exampleText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SharedWalletNameScreen;
