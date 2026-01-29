/**
 * AuthMethodSelectionModal
 * Modal component that displays 3 authentication options:
 * - Continue with Email (green gradient)
 * - Continue with Phone (white10)
 * - Continue with Phantom (white10 with image)
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextStyle } from 'react-native';
import { Modal, Button } from '../shared';
import { colors, spacing, typography } from '../../theme';
import { isPhantomSocialLoginEnabled } from '../../config/features';
import { logger } from '../../services/analytics/loggingService';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';
import { usePhantom, useModal } from '@phantom/react-native-sdk';

interface AuthMethodSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmail: () => void;
  onSelectPhone: () => void;
  onPhantomSuccess?: (user: any) => void;
  onPhantomError?: (error: string) => void;
}

const AuthMethodSelectionModal: React.FC<AuthMethodSelectionModalProps> = ({
  visible,
  onClose,
  onSelectEmail,
  onSelectPhone,
  onPhantomSuccess,
}) => {
  const isPhantomEnabled = isPhantomSocialLoginEnabled();
  const { open } = useModal();
  const { isConnected, user } = usePhantom();
  /** Only process Phantom success when user explicitly tapped "Continue with Phantom"; prevents auto sign-in after logout. */
  const userInitiatedPhantomRef = useRef(false);

  const handlePhantomPress = () => {
    userInitiatedPhantomRef.current = true;
    onClose();
    setTimeout(() => {
      const authService = PhantomAuthService.getInstance();
      authService.resetLogoutFlag();
      logger.info('Opening Phantom authentication modal', null, 'AuthMethodSelectionModal');
      open();
    }, 300);
  };

  // Reset ref when modal closes so we don't carry over state
  useEffect(() => {
    if (!visible) {
      userInitiatedPhantomRef.current = false;
    }
  }, [visible]);

  // Only process Phantom success when user explicitly tapped "Continue with Phantom"
  React.useEffect(() => {
    const isLoggedOut = PhantomAuthService.getInstance().getIsLoggedOut();
    if (isLoggedOut) return;
    if (!isConnected || !user || !onPhantomSuccess || !userInitiatedPhantomRef.current) return;
    userInitiatedPhantomRef.current = false;
    onPhantomSuccess(user);
    onClose();
  }, [isConnected, user, onPhantomSuccess, onClose]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showHandle={false}
      closeOnBackdrop={true}
      animationType="slide"
      style={styles.modalStyle}
    >
      {/* Title */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {/* Email Option - Green Gradient */}
        <Button
          title="Continue with Email"
          onPress={() => {
            logger.info('Email option selected', null, 'AuthMethodSelectionModal');
            onSelectEmail();
            onClose();
          }}
          variant="primary"
          size="large"
          fullWidth={true}
          style={styles.button}
        />

        {/* Phone Option - White10 */}
        <Button
          title="Continue with Phone"
          onPress={() => {
            logger.info('Phone option selected', null, 'AuthMethodSelectionModal');
            onSelectPhone();
            onClose();
          }}
          variant="secondary"
          size="large"
          fullWidth={true}
          style={styles.button}
        />

        {/* Phantom Option - White10 with Image */}
        {isPhantomEnabled && (
          <Button
            onPress={handlePhantomPress}
            variant="secondary"
            size="large"
            fullWidth={true}
            style={styles.button}
          >
            <View style={styles.phantomImageContainer}>
              <Image
                source={{
                  uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbutton-img.png?alt=media&token=ee5161e9-5177-4000-87a0-96238aaeb232'
                }}
                style={styles.phantomImage}
                resizeMode="contain"
              />
            </View>
          </Button>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalStyle: {
    minHeight: 0, // Override default minHeight to allow content-based height
    maxHeight: 400,
  },
  headerContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    width: '100%',
  },
  title: {
    ...(typography.textStyles.h2 as TextStyle),
    lineHeight: typography.textStyles.h2.lineHeight * typography.textStyles.h2.fontSize,
    color: colors.white,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white80,
    textAlign: 'center' as const,
  },
  optionsContainer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    width: '100%',
    flexShrink: 0, // Prevent flex shrinking
  },
  button: {
    marginVertical: spacing.xs,
  },
  phantomImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phantomImage: {
    width: '100%',
    height: 22,
  },
});

export default AuthMethodSelectionModal;
