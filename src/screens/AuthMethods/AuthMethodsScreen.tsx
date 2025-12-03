import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { Container, Header, Button, Input, LoadingScreen, Tabs } from '../../components/shared';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { EmailPersistenceService } from '../../services/core/emailPersistenceService';
import { isPhantomSocialLoginEnabled, isPhantomEnabled } from '../../config/features';
import { sendVerificationCode } from '../../services/data/firebaseFunctionsService';
import { PhantomAuthButton } from '../../components/auth/PhantomAuthButton';
import { authService } from '../../services/auth/AuthService';

type RootStackParamList = {
  Dashboard: undefined;
  Verification: { email?: string; phoneNumber?: string; verificationId?: string };
  AuthMethods: undefined;
};

const AuthMethodsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { authenticateUser, updateUser } = useApp();

  // State management
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // E.164 format validation (e.g., +1234567890)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.trim());
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  // Load persisted email on component mount
  useEffect(() => {
    const loadPersistedEmail = async () => {
      try {
        const persistedEmail = await EmailPersistenceService.loadEmail();
        if (persistedEmail) {
          setEmail(persistedEmail);
        }
      } catch (error) {
        logger.error('Failed to load persisted email', { error }, 'AuthMethodsScreen');
      } finally {
        setIsInitializing(false);
      }
    };

    loadPersistedEmail();
  }, []);

  // Handle email authentication
  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      logger.info('Starting email authentication', { email: email.trim() }, 'AuthMethodsScreen');

      // Save email for persistence
      await EmailPersistenceService.saveEmail(email.trim());

      // Send verification code
      const result = await sendVerificationCode(email.trim());
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send verification code');
        return;
      }

      // Navigate to verification screen
      navigation.navigate('Verification', { email: email.trim() });
    } catch (error) {
      logger.error('Email authentication failed', { error, email: email.trim() }, 'AuthMethodsScreen');
      Alert.alert('Error', 'Failed to process email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle phone authentication
  const handlePhoneAuth = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!isValidPhoneNumber(formattedPhone)) {
      Alert.alert('Error', 'Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    try {
      logger.info('Starting phone authentication', { phoneNumber: formattedPhone.substring(0, 5) + '...' }, 'AuthMethodsScreen');

      // Send SMS verification code
      const result = await authService.signInWithPhoneNumber(formattedPhone);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send SMS code');
        return;
      }

      // Navigate to verification screen
      navigation.navigate('Verification', {
        phoneNumber: formattedPhone,
        verificationId: result.verificationId
      });
    } catch (error) {
      logger.error('Phone authentication failed', { error, phoneNumber: formattedPhone.substring(0, 5) + '...' }, 'AuthMethodsScreen');

      // Provide specific error messages for common issues
      let errorMessage = 'Failed to send SMS. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('reCAPTCHA') || error.message.includes('external scripts')) {
          if (__DEV__) {
            errorMessage = 'Phone authentication needs reCAPTCHA setup. For testing, try: +15551234567, +15559876543, or +15551111111. For production, configure reCAPTCHA in Firebase Console.';
          } else {
            errorMessage = 'Phone authentication is temporarily unavailable. Please try email authentication instead.';
          }
        } else if (error.message.includes('invalid-phone-number')) {
          errorMessage = 'Invalid phone number format. Please use international format (e.g., +1234567890).';
        } else if (error.message.includes('too-many-requests')) {
          errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };






  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <Container>
        <View style={styles.contentContainer}>
          <Header variant="logoOnly" />
          <LoadingScreen
            message="Checking authentication..."
            showSpinner={true}
          />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header variant="logoOnly" />

          <View style={styles.contentContainer}>

          {/* Phantom Social Login - Show if enabled */}
          {isPhantomSocialLoginEnabled() ? (
            <View style={styles.socialSection}>
              <PhantomAuthButton
                fullWidth={true}
                onSuccess={(phantomUser) => {
                  logger.info('Phantom authentication successful', { userId: phantomUser?.id }, 'AuthMethodsScreen');

                  // Process the authenticated user and navigate to dashboard
                  if (phantomUser) {
                    const appUser = {
                      id: phantomUser.id,
                      name: phantomUser.name || '',
                      email: phantomUser.email || '',
                      wallet_address: phantomUser.phantomWalletAddress,
                      wallet_public_key: phantomUser.phantomWalletAddress,
                      created_at: typeof phantomUser.createdAt === 'number'
                        ? new Date(phantomUser.createdAt).toISOString()
                        : phantomUser.createdAt || new Date().toISOString(),
                      avatar: phantomUser.avatar || '',
                      hasCompletedOnboarding: true
                    };

                    updateUser(appUser);
                    authenticateUser(appUser, 'social');

                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Dashboard' }],
                    });
                  }
                }}
                onError={(error) => {
                  logger.error('Phantom authentication failed', { error }, 'AuthMethodsScreen');
                  Alert.alert('Authentication Failed', error || 'Failed to authenticate with Phantom');
                }}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          ) : isPhantomEnabled() && !isPhantomSocialLoginEnabled() ? (
            <View style={styles.socialSection}>
              <View style={[styles.socialButton, styles.socialButtonDisabled]}>
                <Text style={styles.socialEmoji}>👻</Text>
                <Text style={[styles.socialButtonText, styles.socialButtonDisabledText]}>
                  Phantom authentication is disabled
                </Text>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          ) : null}

          {/* Auth Method Toggle */}
          <Tabs
            tabs={[
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'phone' }
            ]}
            activeTab={authMethod}
            onTabChange={(tab) => {
              setAuthMethod(tab as 'email' | 'phone');
              // Clear the opposite field when switching
              if (tab === 'email') {
                setPhoneNumber('');
              } else {
                setEmail('');
              }
            }}
            enableAnimation={true}
          />

          {/* Email/Phone Input */}
          {authMethod === 'email' ? (
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Save email to persistence
                EmailPersistenceService.saveEmail(text).catch((error) => {
                  logger.error('Failed to save email', { error }, 'AuthMethodsScreen');
                });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />
          ) : (
            <Input
              label="Phone Number"
              placeholder="Enter your phone number (e.g., +1234567890)"
              value={phoneNumber}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                setPhoneNumber(formatted);
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          )}

          {/* Next Button */}
          <Button
            title="Next"
            onPress={() => {
              if (authMethod === 'email') {
                logger.info('Next button pressed (email)', { email, loading }, 'AuthMethodsScreen');
                handleEmailAuth();
              } else {
                logger.info('Next button pressed (phone)', { phoneNumber, loading }, 'AuthMethodsScreen');
                handlePhoneAuth();
              }
            }}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={
              (authMethod === 'email' && (!email || !isValidEmail(email))) ||
              (authMethod === 'phone' && (!phoneNumber || !isValidPhoneNumber(phoneNumber))) ||
              loading
            }
            loading={loading}
          />

        </View>

          {/* Help Link */}
          <View style={styles.helpSection}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default AuthMethodsScreen; 
