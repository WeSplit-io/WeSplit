/**
 * Seed Phrase Recovery Screen
 * Allows users to recover their wallet using a seed phrase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '../../services/analytics/loggingService';
import { colors } from '../../theme/colors';

const SeedPhraseRecoveryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { expectedAddress, userId } = route.params as {
    expectedAddress: string;
    userId: string;
  };

  const [inputType, setInputType] = useState<'phrase' | 'privateKey'>('phrase');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'validating' | 'restoring'>('input');

  const validateInput = (input: string, type: 'phrase' | 'privateKey'): { isValid: boolean; error?: string } => {
    const trimmed = input.trim();

    if (!trimmed) {
      return { isValid: false, error: 'Input cannot be empty' };
    }

    if (type === 'phrase') {
      // Recovery phrase validation: should contain 12 or 24 words
      const words = trimmed.split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        return { isValid: false, error: 'Recovery phrase must contain 12 or 24 words' };
      }
      // Additional BIP39 validation will be done during derivation
      return { isValid: true };
    } else {
      // Private key validation: should be 64-character hex or 88-character base58
      const hexRegex = /^[0-9a-fA-F]{64}$/;
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{88}$/;

      if (hexRegex.test(trimmed)) {
        return { isValid: true };
      }

      if (base58Regex.test(trimmed)) {
        return { isValid: true };
      }

      return {
        isValid: false,
        error: 'Private key must be 64-character hex or 88-character base58 format'
      };
    }
  };

  const handleRecoverWallet = async () => {
    const validation = validateInput(recoveryInput, inputType);

    if (!validation.isValid) {
      Alert.alert('Error', validation.error || 'Invalid input');
      return;
    }

    setIsLoading(true);
    setStep('validating');

    try {
      const inputLabel = inputType === 'phrase' ? 'recovery phrase' : 'private key';

      logger.info(`Starting ${inputLabel} recovery`, {
        userId,
        expectedAddress: expectedAddress.substring(0, 10) + '...',
        inputType
      }, 'SeedPhraseRecoveryScreen');

      // Import required modules
      const { simplifiedWalletService } = await import('../../services/blockchain/wallet/simplifiedWalletService');

      let derivedWallet;
      let derivedAddress;

      if (inputType === 'phrase') {
        // Recovery phrase path
        const { deriveWalletFromMnemonic } = await import('../../services/blockchain/wallet/derive');
        derivedWallet = await deriveWalletFromMnemonic(recoveryInput.trim());

        if (!derivedWallet) {
          throw new Error('Failed to derive wallet from recovery phrase');
        }

        derivedAddress = derivedWallet.address;
      } else {
        // Private key path
        const { deriveWalletFromPrivateKey } = await import('../../services/blockchain/wallet/derive');
        derivedWallet = await deriveWalletFromPrivateKey(recoveryInput.trim());

        if (!derivedWallet) {
          throw new Error('Failed to derive wallet from private key');
        }

        derivedAddress = derivedWallet.address;
      }

      logger.info(`Wallet derived from ${inputLabel}`, {
        derivedAddress: derivedAddress.substring(0, 10) + '...',
        expectedAddress: expectedAddress.substring(0, 10) + '...'
      }, 'SeedPhraseRecoveryScreen');

      // Check if the derived address matches the expected address
      if (derivedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        Alert.alert(
          'Address Mismatch',
          `The ${inputLabel} you entered generates the address:\n\n${derivedAddress}\n\nBut your expected address is:\n\n${expectedAddress}\n\nPlease make sure you're using the correct ${inputLabel} for this wallet.`,
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        setStep('input');
        return;
      }

      // Addresses match! Restore the wallet
      setStep('restoring');

      logger.info('Addresses match, restoring wallet', {
        userId,
        address: derivedAddress.substring(0, 10) + '...',
        inputType
      }, 'SeedPhraseRecoveryScreen');

      // Restore wallet using the appropriate method
      let restoreResult;
      if (inputType === 'phrase') {
        restoreResult = await simplifiedWalletService.restoreWalletFromSeedPhrase(
          userId,
          recoveryInput.trim(),
          expectedAddress
        );
      } else {
        restoreResult = await simplifiedWalletService.restoreWalletFromPrivateKey(
          userId,
          recoveryInput.trim(),
          expectedAddress
        );
      }

      if (restoreResult.success && restoreResult.wallet) {
        logger.info(`Wallet restored successfully from ${inputLabel}`, {
          userId,
          address: restoreResult.wallet.address.substring(0, 10) + '...'
        }, 'SeedPhraseRecoveryScreen');

        Alert.alert(
          'Success!',
          'Your wallet has been successfully restored. You can now access your funds.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to dashboard
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        throw new Error(restoreResult.error || 'Failed to restore wallet');
      }

    } catch (error) {
      logger.error('Wallet recovery failed', error, 'SeedPhraseRecoveryScreen');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      Alert.alert(
        'Recovery Failed',
        `Failed to recover wallet: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setStep('input');
    }
  };

  const formatRecoveryPhrase = (text: string) => {
    // Auto-format recovery phrase with line breaks every 4 words for readability
    const words = text.trim().split(/\s+/);
    let formatted = '';

    for (let i = 0; i < words.length; i++) {
      formatted += words[i];
      if ((i + 1) % 4 === 0 && i < words.length - 1) {
        formatted += '\n';
      } else if (i < words.length - 1) {
        formatted += ' ';
      }
    }

    return formatted;
  };

  const handleRecoveryInputChange = (text: string) => {
    // Allow typing without formatting, but store clean version
    setRecoveryInput(text);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            justifyContent: 'center'
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: colors.black,
              marginBottom: 8
            }}>
              🔑 Recover Wallet
            </Text>
            <Text style={{
              fontSize: 16,
              color: colors.gray,
              textAlign: 'center',
              lineHeight: 24
            }}>
              Choose your recovery method and enter your credentials to restore your wallet
            </Text>
          </View>

          <View style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.black,
              marginBottom: 8
            }}>
              Expected Wallet Address:
            </Text>
            <Text style={{
              fontSize: 12,
              color: colors.gray,
              fontFamily: 'monospace',
              backgroundColor: colors.white,
              padding: 8,
              borderRadius: 6,
              textAlign: 'center'
            }}>
              {expectedAddress}
            </Text>
          </View>

          {/* Input Type Selector */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.black,
              marginBottom: 12
            }}>
              Recovery Method
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: inputType === 'phrase' ? colors.primary : colors.border,
                  backgroundColor: inputType === 'phrase' ? colors.primary + '10' : colors.white,
                  alignItems: 'center'
                }}
                onPress={() => setInputType('phrase')}
                disabled={isLoading}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: inputType === 'phrase' ? colors.primary : colors.gray
                }}>
                  🔤 Recovery Phrase
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: inputType === 'phrase' ? colors.primary : colors.gray,
                  marginTop: 4,
                  textAlign: 'center'
                }}>
                  12 or 24 words
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: inputType === 'privateKey' ? colors.primary : colors.border,
                  backgroundColor: inputType === 'privateKey' ? colors.primary + '10' : colors.white,
                  alignItems: 'center'
                }}
                onPress={() => setInputType('privateKey')}
                disabled={isLoading}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: inputType === 'privateKey' ? colors.primary : colors.gray
                }}>
                  🔐 Private Key
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: inputType === 'privateKey' ? colors.primary : colors.gray,
                  marginTop: 4,
                  textAlign: 'center'
                }}>
                  Hex or base58
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.black,
              marginBottom: 12
            }}>
              {inputType === 'phrase' ? 'Recovery Phrase' : 'Private Key'}
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: inputType === 'phrase' ? 16 : 14,
                minHeight: inputType === 'phrase' ? 120 : 80,
                textAlignVertical: inputType === 'phrase' ? 'top' : 'center',
                backgroundColor: colors.white,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
              }}
              multiline={inputType === 'phrase'}
              placeholder={
                inputType === 'phrase'
                  ? "Enter your 12 or 24-word recovery phrase..."
                  : "Enter your private key (64-char hex or 88-char base58)..."
              }
              placeholderTextColor={colors.gray}
              value={recoveryInput}
              onChangeText={handleRecoveryInputChange}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              editable={!isLoading}
              secureTextEntry={false} // Recovery credentials are meant to be copied/pasted
            />

            <Text style={{
              fontSize: 12,
              color: colors.gray,
              marginTop: 8,
              lineHeight: 18
            }}>
              {inputType === 'phrase' ? (
                <>
                  • Enter your 12 or 24-word recovery phrase{'\n'}
                  • Words should be separated by spaces{'\n'}
                  • Make sure there are no typos
                </>
              ) : (
                <>
                  • Enter your private key in hex (64 chars) or base58 (88 chars) format{'\n'}
                  • Hex: characters 0-9, a-f (uppercase/lowercase){'\n'}
                  • Base58: Solana standard format with mixed case letters{'\n'}
                  • Never share your private key with anyone
                </>
              )}
            </Text>
          </View>

          {step === 'validating' && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{
                marginLeft: 12,
                fontSize: 16,
                color: colors.primary
              }}>
                Validating {inputType === 'phrase' ? 'recovery phrase' : 'private key'}...
              </Text>
            </View>
          )}

          {step === 'restoring' && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{
                marginLeft: 12,
                fontSize: 16,
                color: colors.primary
              }}>
                Restoring wallet...
              </Text>
            </View>
          )}

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: isLoading ? colors.gray : colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: isLoading ? 0.6 : 1
              }}
              onPress={handleRecoverWallet}
              disabled={isLoading}
            >
              <Text style={{
                color: colors.white,
                fontSize: 18,
                fontWeight: '600'
              }}>
                {isLoading ? 'Processing...' : 'Recover Wallet'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center'
              }}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={{
                color: colors.black,
                fontSize: 16,
                fontWeight: '500'
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: '#FFF3CD',
            borderRadius: 8,
            padding: 16,
            marginTop: 20
          }}>
            <Text style={{
              fontSize: 14,
              color: '#856404',
              lineHeight: 20
            }}>
              ⚠️ <Text style={{ fontWeight: '600' }}>Security Warning:</Text>{'\n'}
              • Never share your seed phrase with anyone{'\n'}
              • Make sure you're in a private, secure location{'\n'}
              • This seed phrase gives full access to your wallet funds
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SeedPhraseRecoveryScreen;
