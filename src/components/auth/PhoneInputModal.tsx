/**
 * Phone Input Modal Component
 * Modal for entering phone number to link to existing account
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { spacing } from '../../theme/spacing';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../utils/validation/phone';
import { logger } from '../../services/analytics/loggingService';

interface PhoneInputModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSendCode: (phone: string) => void;
}

const PhoneInputModal: React.FC<PhoneInputModalProps> = ({
  visible,
  onDismiss,
  onSendCode,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError('');
    
    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      setError('Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    
    try {
      logger.info('Sending phone verification code from profile', { phone: normalizedPhone.substring(0, 5) + '...' }, 'PhoneInputModal');
      onSendCode(normalizedPhone);
      // Modal will be closed by parent after navigation
    } catch (error) {
      logger.error('Failed to send phone code', { error: error instanceof Error ? error.message : String(error) }, 'PhoneInputModal');
      setError(error instanceof Error ? error.message : 'Failed to send verification code');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setError('');
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Add Phone Number"
      description="Enter your phone number to link it to your account. You'll be able to log in with either email or phone."
      closeOnBackdrop={true}
      showHandle={true}
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
            title="Send Verification Code"
            onPress={handleSendCode}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={!phoneNumber || !isValidPhoneNumber(normalizePhoneNumber(phoneNumber)) || loading}
            loading={loading}
            style={styles.sendButton}
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
  sendButton: {
    marginBottom: spacing.sm,
  },
});

export default PhoneInputModal;

