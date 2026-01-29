import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, Image, Animated, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Container, Header } from '../../components/shared';
import { colors } from '../../theme';
import { styles } from './styles';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';

const PIN_LENGTH = 6;

function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) return '***@***.***';
  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return '***@***.***';
  const localMask = local.length > 1 ? local[0] + '***' : '***';
  const dotIdx = domain.indexOf('.');
  const domainPart = dotIdx > 0 ? domain.substring(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.substring(dotIdx) : '';
  const domainMask = domainPart.length > 1 ? domainPart[0] + '***' + tld : '***' + tld;
  return `${localMask}@${domainMask}`;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

const PinLoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute<{ params: { email: string } }>();
  const email = (route.params?.email || '').trim();
  const { authenticateUser } = useApp();
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < PIN_LENGTH) {
      setError(false); // Clear error so dots turn back to white when user starts new attempt
      const newPin = [...pin, number];
      setPin(newPin);
      if (newPin.length === PIN_LENGTH) {
        const enteredPin = newPin.join('');
        handleSubmit(enteredPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  const handleSubmit = async (enteredPin: string) => {
    if (!email) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const userId = await AuthPersistenceService.verifyPinByEmail(email, enteredPin);
      if (!userId) {
        setError(true);
        triggerShake();
        setTimeout(() => setPin([]), 500);
        setLoading(false);
        return;
      }

      const { auth, app } = await import('../../config/firebase/firebase');
      const { signInWithCustomToken } = await import('firebase/auth');
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app);
      const getUserToken = httpsCallable<{ userId: string }, { success: boolean; customToken: string; message?: string }>(functions, 'getUserCustomToken');
      const tokenResult = await getUserToken({ userId });
      const tokenData = tokenResult.data as { success: boolean; customToken: string; message?: string };

      if (!tokenData?.success || !tokenData.customToken) {
        throw new Error(tokenData?.message || 'Failed to get session');
      }

      await signInWithCustomToken(auth, tokenData.customToken);
      logger.info('Signed in with PIN', { userId }, 'PinLoginScreen');

      const { firestoreService } = await import('../../config/firebase/firebase');
      const userData = await firestoreService.getUserDocument(userId);
      if (!userData) {
        throw new Error('User data not found');
      }

      const transformedUser = {
        ...userData,
        id: userData.id || userId,
        name: userData.name || '',
        email: userData.email || email,
        wallet_address: userData.wallet_address || '',
        wallet_public_key: userData.wallet_public_key || userData.wallet_address || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || '',
        hasCompletedOnboarding: userData.hasCompletedOnboarding !== undefined ? userData.hasCompletedOnboarding : true,
        badges: userData.badges || [],
        active_badge: userData.active_badge,
        profile_borders: userData.profile_borders || [],
        active_profile_border: userData.active_profile_border,
        wallet_backgrounds: userData.wallet_backgrounds || [],
        active_wallet_background: userData.active_wallet_background,
      };

      authenticateUser(transformedUser, 'email');
      (navigation as any).replace('Dashboard', { fromPinUnlock: true });
    } catch (err) {
      logger.error('PIN sign-in failed', err, 'PinLoginScreen');
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

  const handleUseDifferentAccount = () => {
    (navigation as any).replace('GetStarted');
  };

  const handleLogInWithEmail = () => {
    (navigation as any).replace('GetStarted', {
      prefilledEmail: email || undefined,
    });
  };

  if (!email) {
    (navigation as any).replace('GetStarted');
    return null;
  }

  const masked = maskEmail(email);

  return (
    <Container>
      <View style={styles.container}>
        <Header
          showBackButton={true}
          onBackPress={() => (navigation as any).replace('GetStarted')}
          showHelpCenter={true}
          onHelpCenterPress={handleHelpCenterPress}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(80, insets.bottom + 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in with your PIN for {masked}
          </Text>

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
                    <View key="empty" style={styles.keypadButtonEmpty} />
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
              onPress={handleLogInWithEmail}
              disabled={loading}
              hitSlop={HIT_SLOP}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPinText}>Forgot your pin? Log in with email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.useDifferentAccount}
              onPress={handleUseDifferentAccount}
              disabled={loading}
              hitSlop={HIT_SLOP}
              activeOpacity={0.7}
            >
              <Text style={styles.useDifferentAccountText}>Use a different account</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </Container>
  );
};

export default PinLoginScreen;
