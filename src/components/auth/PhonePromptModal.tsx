/**
 * Phone Prompt Modal Component
 * Prompts existing users to add their phone number for enhanced security
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../utils/validation/phone';
import { logger } from '../../services/analytics/loggingService';

interface PhonePromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddPhone: (phone: string) => void;
}

const PhonePromptModal: React.FC<PhonePromptModalProps> = ({
  visible,
  onDismiss,
  onAddPhone,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPhone = async () => {
    setError('');
    
    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      setError('Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    
    try {
      logger.info('Adding phone number from prompt modal', { phone: normalizedPhone.substring(0, 5) + '...' }, 'PhonePromptModal');
      onAddPhone(normalizedPhone);
    } catch (error) {
      logger.error('Failed to add phone number', error, 'PhonePromptModal');
      setError(error instanceof Error ? error.message : 'Failed to add phone number');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    logger.info('User skipped phone prompt', null, 'PhonePromptModal');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      onClose={onDismiss}
      title="Add Your Phone Number"
      description="Add your phone number for faster login and enhanced account security"
      closeOnBackdrop={false}
    >
      <View style={styles.content}>
        <Input
          label="Phone Number"
          placeholder="+1234567890"
          value={phoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
            setError(''); // Clear error when user types
          }}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="telephoneNumber"
          autoComplete="tel"
          error={error}
          containerStyle={styles.inputContainer}
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Add Phone"
            onPress={handleAddPhone}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={!phoneNumber || !isValidPhoneNumber(normalizePhoneNumber(phoneNumber)) || loading}
            loading={loading}
            style={styles.addButton}
          />

          <Button
            title="Skip for now"
            onPress={handleSkip}
            variant="secondary"
            size="large"
            fullWidth={true}
            disabled={loading}
            style={styles.skipButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  addButton: {
    marginBottom: spacing.sm,
  },
  skipButton: {
    // Secondary button styling is handled by Button component
  },
});

export default PhonePromptModal;

