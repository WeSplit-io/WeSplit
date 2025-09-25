/**
 * Manual Signature Input Screen
 * Allows users to manually input the signature they received from their wallet
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { logger } from '../../services/loggingService';

interface RouteParams {
  challenge: {
    nonce: string;
    message: string;
    issuedAt: number;
    expiresAt: number;
    userId: string;
    appInstanceId: string;
  };
  provider: string;
  providerDisplayName: string;
}

export const ManualSignatureInputScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { challenge, provider, providerDisplayName } = route.params as RouteParams;

  const [signature, setSignature] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signature.trim() || !publicKey.trim()) {
      Alert.alert('Missing Information', 'Please enter both the signature and public key from your wallet.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Import the signature link service
      const { signatureLinkService } = await import('../../wallets/linking/signatureLinkService');
      
      // Verify the signature
      const verificationResult = await signatureLinkService.verifySignature(
        publicKey.trim(),
        challenge,
        signature.trim()
      );

      if (verificationResult.success) {
        // Store the linked wallet
        const linkedWallet = await signatureLinkService.storeLinkedWallet({
          publicKey: publicKey.trim(),
          provider,
          label: `${providerDisplayName} Wallet`,
          signature: signature.trim(),
          challenge,
          userId: challenge.userId
        });

        logger.info('Manual signature input successful', {
          publicKey: linkedWallet.publicKey,
          provider: linkedWallet.provider
        }, 'ManualSignatureInput');

        Alert.alert(
          'Wallet Linked Successfully!',
          `Your ${providerDisplayName} wallet has been successfully linked to WeSplit.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert(
          'Signature Verification Failed',
          verificationResult.error || 'The signature could not be verified. Please check your input and try again.'
        );
      }
    } catch (error) {
      logger.error('Manual signature input failed', error, 'ManualSignatureInput');
      Alert.alert(
        'Error',
        'Failed to verify signature. Please check your input and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Signature</Text>
          <Text style={styles.subtitle}>
            Please enter the signature and public key you received from {providerDisplayName}
          </Text>
        </View>

        <View style={styles.challengeSection}>
          <Text style={styles.sectionTitle}>Message You Signed:</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{challenge.message}</Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Public Key:</Text>
          <TextInput
            style={styles.textInput}
            value={publicKey}
            onChangeText={setPublicKey}
            placeholder="Enter the public key from your wallet"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Signature:</Text>
          <TextInput
            style={styles.textInput}
            value={signature}
            onChangeText={setSignature}
            placeholder="Enter the signature from your wallet"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Open {providerDisplayName} and sign the message above{'\n'}
            2. Copy the signature and public key from your wallet{'\n'}
            3. Paste them into the fields above{'\n'}
            4. Tap "Verify & Link Wallet"
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Verifying...' : 'Verify & Link Wallet'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  challengeSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  messageContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  instructionsSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primaryGreen,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ManualSignatureInputScreen;
