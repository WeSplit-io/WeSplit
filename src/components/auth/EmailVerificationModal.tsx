/**
 * Email Verification Modal Component
 * Modal for entering 6-digit verification code for email verification
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';

interface EmailVerificationModalProps {
  visible: boolean;
  email: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

const CODE_LENGTH = 6;

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  visible,
  email,
  onVerify,
  onCancel,
  title = 'Verify Email',
  description,
  loading = false,
}) => {
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Reset code when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setCode(Array(CODE_LENGTH).fill(''));
      setError('');
      setIsVerifying(false);
      inputRefs.current = [];
    } else {
      // Focus first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [visible]);

  const handleChange = (val: string, idx: number) => {
    // Handle paste: if user pastes full code
    if (val.length === CODE_LENGTH && /^\d{6}$/.test(val)) {
      const newCode = val.split('');
      setCode(newCode);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      // Auto-submit when full code is pasted (with guard to prevent multiple submissions)
      setTimeout(() => {
        if (!isVerifying && !loading) {
          handleSubmit(newCode.join(''));
        }
      }, 100);
      return;
    }

    // Handle single digit input
    if (/^\d?$/.test(val)) {
      const newCode = [...code];
      newCode[idx] = val;
      setCode(newCode);
      setError(''); // Clear error when user types
      
      // Auto-focus next input
      if (val && idx < CODE_LENGTH - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
      
      // Auto-submit when all digits are filled (with guard to prevent multiple submissions)
      if (newCode.every(digit => digit !== '') && newCode.join('').length === CODE_LENGTH) {
        if (!isVerifying && !loading) {
          handleSubmit(newCode.join(''));
        }
      }
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async (codeToVerify?: string) => {
    // Guard against multiple simultaneous calls
    if (isVerifying || loading) {
      return;
    }
    
    const codeString = codeToVerify || code.join('');
    
    if (codeString.length !== CODE_LENGTH) {
      setError(`Please enter the ${CODE_LENGTH}-digit code`);
      return;
    }

    if (!/^\d{6}$/.test(codeString)) {
      setError('Code must be 6 digits');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      await onVerify(codeString);
      // Modal will be closed by parent after successful verification
    } catch (error) {
      logger.error('Email verification failed', { error: error instanceof Error ? error.message : String(error) }, 'EmailVerificationModal');
      setError(error instanceof Error ? error.message : 'Invalid verification code');
      setIsVerifying(false);
      // Clear code on error
      setCode(Array(CODE_LENGTH).fill(''));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const handleClose = () => {
    setCode(Array(CODE_LENGTH).fill(''));
    setError('');
    setIsVerifying(false);
    onCancel();
  };

  const displayDescription = description || `Enter the 6-digit verification code sent to ${email}`;

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={title}
      description={displayDescription}
      closeOnBackdrop={true}
      showHandle={true}
    >
      <View style={styles.content}>
        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={`input-${idx}`}
              ref={(ref) => {
                if (inputRefs.current) {
                  inputRefs.current[idx] = ref;
                }
              }}
              style={[styles.codeInput, error ? styles.codeInputError : null]}
              value={digit}
              onChangeText={(val) => handleChange(val, idx)}
              keyboardType="number-pad"
              maxLength={1}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              textContentType="oneTimeCode"
              returnKeyType="done"
              autoComplete="one-time-code"
              enablesReturnKeyAutomatically={true}
              placeholder="0"
              placeholderTextColor={colors.white30}
              editable={!isVerifying && !loading}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonContainer}>
          <Button
            title="Verify"
            onPress={() => handleSubmit()}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={code.join('').length !== CODE_LENGTH || isVerifying || loading}
            loading={isVerifying || loading}
            style={styles.verifyButton}
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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.white,
    fontFamily: typography.fontFamily.mono,
  },
  codeInputError: {
    borderColor: colors.error || '#FF4444',
    borderWidth: 2,
  },
  errorText: {
    color: colors.error || '#FF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily.regular,
  },
  buttonContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  verifyButton: {
    marginBottom: spacing.sm,
  },
});

export default EmailVerificationModal;
