import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { colors, spacing } from '../../theme';
import { styles } from './styles';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { auth } from '../../config/firebase/firebase';
import { secureVault } from '../../services/security/secureVault';

const PIN_LENGTH = 6;

/**
 * Shown when the user is already authenticated (auto-login) but has a PIN set.
 * Login flow: Face ID / fingerprint first (via vault – one prompt, primes vault so Dashboard won't prompt again),
 * then PIN entry, with "Forgot your pin?" to log in with email.
 */
const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

const PinUnlockScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { state, logoutUser } = useApp();
  // Prefer userId from route params (e.g. from "verified within 30 days" path) so we use the correct user before context updates
  const userId = (route.params as { userId?: string } | undefined)?.userId ?? state.currentUser?.id;
  const userEmail = state.currentUser?.email;
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const faceIdAttemptedRef = useRef(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  /**
   * Login flow: use vault Face ID so one prompt both unlocks the app and primes the vault
   * (Dashboard won't prompt again). Same Keychain/biometric used at signup in VerifyPin.
   */
  const tryBiometricUnlock = async (): Promise<boolean> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return false;
      const ok = await secureVault.preAuthenticate();
      if (ok) {
        logger.info('Biometric unlock successful (vault primed)', { userId }, 'PinUnlockScreen');
        (navigation as any).replace('Dashboard', { fromPinUnlock: true });
        return true;
      }
    } catch (e) {
      logger.warn('Biometric unlock failed', { error: e }, 'PinUnlockScreen');
    }
    return false;
  };

  // If we don't have a user, go to GetStarted. If user has no PIN set, go straight to CreatePin/Dashboard.
  // Use route.params.userId first (from "verified within 30 days" etc.), then context, then Firebase Auth so PIN key is consistent.
  useEffect(() => {
    const effectiveUserId = userId ?? auth?.currentUser?.uid;
    if (!effectiveUserId) {
      logger.warn('PinUnlockScreen: no current user, navigating to GetStarted', null, 'PinUnlockScreen');
      (navigation as any).replace('GetStarted');
      return;
    }
    (async () => {
      const userIdStr = String(effectiveUserId);
      const hasPin = await AuthPersistenceService.hasPin(userIdStr);
      if (!hasPin) {
        logger.info('PinUnlockScreen: user has no PIN set, routing to CreatePin', { userId: userIdStr }, 'PinUnlockScreen');
        (navigation as any).replace('CreatePin', { fromPinUnlock: true });
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(!!compatible && !!enrolled);
      if (compatible && enrolled && !faceIdAttemptedRef.current) {
        faceIdAttemptedRef.current = true;
        await tryBiometricUnlock();
      }
    })();
  }, [userId, auth?.currentUser?.uid, navigation]);


  const handleNumberPress = (number: string) => {
    if (!userId || pin.length >= PIN_LENGTH) return;
    setError(false); // Clear error so dots turn back to white when user starts new attempt
    const newPin = [...pin, number];
    setPin(newPin);
    if (newPin.length === PIN_LENGTH) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  const handleSubmit = async (enteredPin: string) => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const valid = await AuthPersistenceService.verifyPin(String(userId), enteredPin);
      if (!valid) {
        setError(true);
        triggerShake();
        setTimeout(() => setPin([]), 500);
        setLoading(false);
        return;
      }
      logger.info('PIN unlock successful', { userId }, 'PinUnlockScreen');
      (navigation as any).replace('Dashboard', { fromPinUnlock: true });
    } catch (err) {
      logger.error('PIN unlock failed', err, 'PinUnlockScreen');
      setError(true);
      triggerShake();
      setTimeout(() => setPin([]), 500);
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleUseDifferentAccount = async () => {
    try {
      const { authService } = await import('../../services/auth/AuthService');
      await authService.signOut();
      if (state.currentUser?.id) await AuthPersistenceService.clearPin(String(state.currentUser.id));
      if (state.currentUser?.email) await AuthPersistenceService.clearPinLoginData(state.currentUser.email);
      await AuthPersistenceService.clearEmail();
      await AuthPersistenceService.clearPhone();
      const { clearAesKeyCache } = await import('../../services/security/secureVault');
      clearAesKeyCache();
      logoutUser();
    } catch (e) {
      logger.warn('Error during sign out from PinUnlock', e, 'PinUnlockScreen');
    }
    (navigation as any).replace('GetStarted');
  };

  const handleForgotPin = async () => {
    try {
      const { authService } = await import('../../services/auth/AuthService');
      await authService.signOut();
      if (userId) await AuthPersistenceService.clearPin(String(userId));
      if (userEmail) await AuthPersistenceService.clearPinLoginData(userEmail);
      const { clearAesKeyCache } = await import('../../services/security/secureVault');
      clearAesKeyCache();
      logoutUser();
    } catch (e) {
      logger.warn('Error during forgot PIN flow', e, 'PinUnlockScreen');
    }
    (navigation as any).replace('GetStarted', {
      prefilledEmail: userEmail || undefined,
    });
  };

  const handleFaceIdPress = async () => {
    if (loading) return;
    await tryBiometricUnlock();
  };

  if (!userId) {
    return null;
  }

  return (
    <Container>
      <View style={styles.container}>
        <Header
          showBackButton={false}
          rightElement={
            <TouchableOpacity
              onPress={handleUseDifferentAccount}
              disabled={loading}
              hitSlop={HIT_SLOP}
              activeOpacity={0.7}
              style={{ width: spacing.iconBoxSize, height: spacing.iconBoxSize, alignItems: 'center', justifyContent: 'center' }}
            >
              <PhosphorIcon name="SignOut" size={24} color={colors.white80} weight="regular" />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(80, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Enter your PIN</Text>

            <Animated.View
            style={[
              styles.pinIndicators,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  pin[index] ? styles.pinDotFilled : styles.pinDotEmpty,
                  error ? styles.pinDotError : null,
                ]}
              />
              ))}
            </Animated.View>

            <View style={styles.keypad}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'back']].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.keypadRow}>
                {row.map((num) =>
                  num === '' ? (
                    <TouchableOpacity
                      key="biometric"
                      style={styles.keypadButtonFingerprint}
                      onPress={handleFaceIdPress}
                      disabled={loading || !biometricAvailable}
                      activeOpacity={0.7}
                    >
                      <PhosphorIcon name="Fingerprint" size={28} color="#fff" weight="regular" />
                    </TouchableOpacity>
                  ) : num === 'back' ? (
                    <TouchableOpacity
                      key="back"
                      style={styles.keypadButtonDelete}
                      onPress={handleBackspace}
                      disabled={pin.length === 0 || loading}
                    >
                      <Image
                        source={{
                          uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FDelete.png?alt=media&token=4cb8e3f2-c9e4-473c-a87b-412c9cd577a4',
                        }}
                        style={[styles.deleteIcon, pin.length === 0 && styles.deleteIconDisabled]}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      key={num}
                      style={styles.keypadButton}
                      onPress={() => handleNumberPress(num)}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <Text style={styles.keypadButtonText}>{num}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
              ))}
            </View>

            <View style={styles.bottomLinksWrap}>
              <TouchableOpacity
                style={styles.forgotPin}
                onPress={handleForgotPin}
                disabled={loading}
                hitSlop={HIT_SLOP}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPinText}>Forgot your pin?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Container>
  );
};

export default PinUnlockScreen;
