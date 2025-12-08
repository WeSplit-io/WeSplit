/**
 * Shared Wallet Name Screen
 * First step in shared wallet creation - name input with validation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Input,
} from '../../components/shared';
import Modal from '../../components/shared/Modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { logger, LogData } from '../../services/analytics/loggingService';

const SharedWalletNameScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialValue = route?.params?.walletName || '';
  const [name, setName] = useState(initialValue);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isValidating, setIsValidating] = useState(false);
  const [visible, setVisible] = useState(true);
  const inputRef = useRef<TextInput>(null);

  const validateForm = useCallback((): boolean => {
    const newErrors: { name?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Wallet name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name]);

  const handleClose = useCallback(() => {
    setVisible(false);
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.walletName) {
      setName(route.params.walletName);
    }
  }, [route?.params?.walletName]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }, [])
  );

  const handleNext = useCallback(async () => {
    if (!__DEV__) {
      Alert.alert('Coming Soon', 'Shared Wallet creation is currently disabled in this version.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsValidating(true);

    try {
      const trimmedName = name.trim();

      logger.info(
        'Shared wallet name validated',
        { name: trimmedName } as LogData,
        'SharedWalletNameScreen'
      );

      Keyboard.dismiss();
      setVisible(false);

      requestAnimationFrame(() => {
        navigation.navigate('SharedWalletMembers', {
          walletName: trimmedName,
        });
      });

    } catch (error) {
      logger.error('Error validating shared wallet name', error as LogData, 'SharedWalletNameScreen');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsValidating(false);
    }
  }, [validateForm, name, navigation]);

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      showHandle
      closeOnBackdrop
      style={styles.modalContent}
      maxHeight={350}
      enableSwipe={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.keyboardAvoider}
      >
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <Text style={styles.title}>Shared wallet name</Text>

          <Input
            placeholder="Search"
            value={name}
            inputRef={inputRef}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors(prev => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNext}
            containerStyle={styles.inputContainer}
            maxLength={100}
          />

          <Text style={styles.examplesText}>
            E.g "Trip", "Breakpoint", "Secret Project", ...
          </Text>

          <Button
            title="Continue"
            onPress={handleNext}
            variant="primary"
            size="large"
            disabled={isValidating || !name.trim()}
            loading={isValidating}
            fullWidth
            style={styles.button}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    minHeight: undefined,
  },
  safeArea: {
    justifyContent: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  keyboardAvoider: {
    width: '100%',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.xs,
  },
  examplesText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'left',
  },
  button: {
    marginTop: spacing.lg,
  },
});

export default SharedWalletNameScreen;
