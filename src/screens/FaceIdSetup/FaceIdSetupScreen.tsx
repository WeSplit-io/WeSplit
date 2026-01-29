import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Modal, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Container, Header, Button } from '../../components/shared';
import { colors, spacing, typography } from '../../theme';
import { styles } from './styles';
import * as LocalAuthentication from 'expo-local-authentication';

const FaceIdSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const handleEnableFaceId = async () => {
    setIsEnabling(true);
    try {
      // Check if biometric authentication is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        // Skip Face ID if not available
        handleSkip();
        return;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        // Skip if not enrolled
        handleSkip();
        return;
      }

      // Try to authenticate
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Face ID',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        // Face ID enabled successfully
        setShowModal(false);
        setTimeout(() => {
          (navigation as any).navigate('SetupNotifications');
        }, 300);
      } else {
        // User cancelled or failed
        setShowModal(false);
      }
    } catch (error) {
      console.error('Face ID error:', error);
      handleSkip();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    setShowModal(false);
    setTimeout(() => {
      (navigation as any).navigate('SetupNotifications');
    }, 300);
  };

  const handleContinue = () => {
    setShowModal(true);
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
          
          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              size="large"
              fullWidth={true}
            />
          </View>
        </View>

        {/* Face ID Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enable Face ID</Text>
              <Text style={styles.modalMessage}>
                Use Face ID to quickly and securely access your account.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.modalButtonDivider} />
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleEnableFaceId}
                  activeOpacity={0.7}
                  disabled={isEnabling}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {isEnabling ? 'Enabling...' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Container>
  );
};

export default FaceIdSetupScreen;
