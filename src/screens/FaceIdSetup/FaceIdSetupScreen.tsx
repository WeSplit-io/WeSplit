import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Container, Header, Button } from '../../components/shared';
import { colors, spacing, typography } from '../../theme';
import { styles } from './styles';
import * as LocalAuthentication from 'expo-local-authentication';
import { logger } from '../../services/analytics/loggingService';

const FaceIdSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const getBiometricPromptMessage = async (): Promise<string> => {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Unlock WeSplit with Face ID';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return Platform.OS === 'ios' ? 'Unlock WeSplit with Touch ID' : 'Verify your identity';
      }
    } catch (e) {
      logger.warn('Could not get supported auth types', { error: e }, 'FaceIdSetupScreen');
    }
    return 'Verify your identity';
  };

  const handleContinue = async () => {
    setIsEnabling(true);
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        logger.info('Biometrics not available, skipping to notifications', null, 'FaceIdSetupScreen');
        handleSkip();
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        logger.info('Biometrics not enrolled, skipping to notifications', null, 'FaceIdSetupScreen');
        handleSkip();
        return;
      }

      const promptMessage = await getBiometricPromptMessage();
      logger.info('Triggering system biometric prompt', { promptMessage }, 'FaceIdSetupScreen');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        logger.info('Biometric verification succeeded', null, 'FaceIdSetupScreen');
        setTimeout(() => {
          (navigation as any).navigate('SetupNotifications');
        }, 300);
      } else {
        logger.info('Biometric cancelled or failed', { error: result.error }, 'FaceIdSetupScreen');
      }
    } catch (error) {
      logger.error('Face ID error', error, 'FaceIdSetupScreen');
      handleSkip();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    setTimeout(() => {
      (navigation as any).navigate('SetupNotifications');
    }, 300);
  };

  return (
    <Container>
      <View style={styles.container}>
        <Header
          showBackButton={false}
          showHelpCenter={true}
          onHelpCenterPress={handleHelpCenterPress}
        />

        <View style={styles.content}>
          <Text style={styles.title}>Use Face ID</Text>
          <Text style={styles.subtitle}>
            Use Face ID or Touch ID to quickly and securely access your account.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title={isEnabling ? 'Verifying...' : 'Continue'}
              onPress={handleContinue}
              variant="primary"
              size="large"
              fullWidth={true}
              disabled={isEnabling}
            />
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.7}
              disabled={isEnabling}
            >
              <Text style={styles.skipButtonText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Container>
  );
};

export default FaceIdSetupScreen;
