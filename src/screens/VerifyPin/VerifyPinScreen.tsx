import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert, Image, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { colors, spacing, typography } from '../../theme';
import { styles } from './styles';
import { useApp } from '../../context/AppContext';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import { logger } from '../../services/analytics/loggingService';
import { auth } from '../../config/firebase/firebase';
import { secureVault } from '../../services/security/secureVault';

const PIN_LENGTH = 6;

const VerifyPinScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<{ params?: { pin?: string; fromPinUnlock?: boolean } }>();
  const originalPin = route.params?.pin || '';
  const fromPinUnlock = route.params?.fromPinUnlock === true;
  const { state } = useApp();
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState<boolean>(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const handleNumberPress = async (number: string) => {
    if (pin.length < PIN_LENGTH) {
      setError(false); // Clear error so dots turn back to white when user starts new attempt
      const newPin = [...pin, number];
      setPin(newPin);
      
      // Verify PIN when complete
      if (newPin.length === PIN_LENGTH) {
        const enteredPin = newPin.join('');
        if (enteredPin === originalPin) {
          // PIN matches - persist it for the current user (wire PIN/signup data with backend)
          setError(false);

          // Use app context first; fallback to Firebase Auth UID so we always save when user is signed in
          const currentUserId = state.currentUser?.id ?? auth?.currentUser?.uid;
          const currentUserEmail = state.currentUser?.email;
          const userIdStr = currentUserId != null ? String(currentUserId) : '';
          if (!userIdStr) {
            logger.warn('No current user ID available when trying to save app PIN', null, 'VerifyPinScreen');
          } else {
            try {
              await AuthPersistenceService.savePin(userIdStr, enteredPin, currentUserEmail ?? undefined);
              const stored = await AuthPersistenceService.hasPin(userIdStr);
              if (stored) {
                logger.info('PIN persisted and verified for user', { userId: userIdStr }, 'VerifyPinScreen');
              } else {
                logger.warn('PIN save may not have persisted, retrying once', { userId: userIdStr }, 'VerifyPinScreen');
                await AuthPersistenceService.savePin(userIdStr, enteredPin, currentUserEmail ?? undefined);
              }
            } catch (saveError) {
              logger.error('Failed to persist app PIN after verification', { error: saveError, userId: userIdStr }, 'VerifyPinScreen');
              // Still navigate - user can set PIN again later
            }
          }

          // Trigger Face ID once here (after PIN verified, before leaving screen); primes vault so Dashboard won't prompt again
          try {
            await secureVault.preAuthenticate();
          } catch (e) {
            logger.warn('Face ID / vault pre-auth skipped or failed, continuing', { error: e }, 'VerifyPinScreen');
          }
          setTimeout(() => {
            (navigation as any).replace('SetupNotifications');
          }, 300);
        } else {
          // PIN doesn't match, show error animation and reset
          setError(true);
          
          // Shake animation
          Animated.sequence([
            Animated.timing(shakeAnimation, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: -10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]).start();
          
          setTimeout(() => {
            setPin([]);
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setError(false); // Clear error so dots turn back to white when user edits
      setPin(pin.slice(0, -1));
    }
  };

  const handleUseDifferentAccount = () => {
    (navigation as any).replace('GetStarted');
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
          {/* Title */}
          <Text style={styles.title}>Verify your PIN</Text>

          {/* PIN Indicators */}
          <Animated.View
            style={[
              styles.pinIndicators,
              {
                transform: [{ translateX: shakeAnimation }],
              },
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

          {/* Numeric Keypad */}
          <View style={styles.keypad}>
            {/* Row 1: 1, 2, 3 */}
            <View style={styles.keypadRow}>
              {['1', '2', '3'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2: 4, 5, 6 */}
            <View style={styles.keypadRow}>
              {['4', '5', '6'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 3: 7, 8, 9 */}
            <View style={styles.keypadRow}>
              {['7', '8', '9'].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 4: fingerprint (visual consistency), 0, backspace */}
            <View style={styles.keypadRow}>
              <View style={styles.keypadButtonFingerprint}>
                <PhosphorIcon name="Fingerprint" size={28} color="#fff" weight="regular" />
              </View>
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={() => handleNumberPress('0')}
                activeOpacity={0.7}
              >
                <Text style={styles.keypadButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keypadButtonDelete}
                onPress={handleBackspace}
                activeOpacity={0.7}
                disabled={pin.length === 0}
              >
                <Image
                  source={{
                    uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FDelete.png?alt=media&token=4cb8e3f2-c9e4-473c-a87b-412c9cd577a4',
                  }}
                  style={[
                    styles.deleteIcon,
                    pin.length === 0 && styles.deleteIconDisabled,
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.useDifferentAccount} onPress={handleUseDifferentAccount}>
            <Text style={styles.useDifferentAccountText}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Container>
  );
};

export default VerifyPinScreen;
