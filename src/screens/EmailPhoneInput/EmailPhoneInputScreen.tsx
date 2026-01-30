/**
 * EmailPhoneInputScreen
 * Screen for entering email or phone number.
 * Flow: GetStarted -> EmailPhoneInput -> Verification
 *
 * DUPLICATION: Email/phone auth logic is duplicated from AuthMethodsScreen (see comment there).
 * Used by GetStarted; AuthMethods is used by Forgot PIN, logout, deep links. Consider extracting
 * shared auth logic (send code, verify, navigate) into a single service or hook to avoid drift.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  Linking,
  Keyboard,
  TextStyle,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { Container, Header, Button, Input, LoadingScreen } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import { authService } from '../../services/auth/AuthService';
import { isValidPhoneNumber as validatePhoneE164, normalizePhoneNumber } from '../../utils/validation/phone';
import { colors } from '@/theme';

type RootStackParamList = {
  Dashboard: undefined;
  Verification: { email?: string; phoneNumber?: string; verificationId?: string; referralCode?: string };
  CreateProfile: { email?: string; phoneNumber?: string; referralCode?: string };
  EmailPhoneInput: { authMethod: 'email' | 'phone'; referralCode?: string; prefilledEmail?: string };
};

const EmailPhoneInputScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { authenticateUser } = useApp();

  // Get auth method from route params (default to 'email' if not provided)
  const authMethod = (route.params as any)?.authMethod || 'email';
  const referralCode = (route.params as any)?.referralCode;
  // Support both prefilledEmail and email (legacy) for autofill
  const prefilledEmail = (route.params as any)?.prefilledEmail ?? (route.params as any)?.email;

  // State management
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    return validatePhoneE164(phone);
  };

  const formatPhoneNumber = (phone: string): string => {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized || !validatePhoneE164(normalized)) {
      return phone;
    }
    return normalized;
  };

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load persisted data on mount and auto-focus input
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        if (authMethod === 'email') {
          if (prefilledEmail) {
            setEmail(prefilledEmail);
            logger.info('Email prefilled from route params', { email: prefilledEmail }, 'EmailPhoneInputScreen');
          } else {
            const persistedEmail = await AuthPersistenceService.loadEmail();
            if (persistedEmail) {
              setEmail(persistedEmail);
            }
          }
        } else {
          const persistedPhone = await AuthPersistenceService.loadPhone();
          if (persistedPhone) {
            setPhoneNumber(persistedPhone);
          }
        }
      } catch (error) {
        logger.error('Failed to load persisted auth data', { error }, 'EmailPhoneInputScreen');
      } finally {
        setIsInitializing(false);
        // Auto-focus input to open keyboard by default
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    };

    loadPersistedData();
  }, [authMethod, prefilledEmail]);

  // Handle email authentication - EXACT COPY from AuthMethodsScreen to preserve backend logic
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
      logger.info('Starting email authentication', { email: email.trim() }, 'EmailPhoneInputScreen');

      await AuthPersistenceService.saveEmail(email.trim());

      let userExistsResult;
      try {
        userExistsResult = await authService.checkEmailUserExists(email.trim());
      } catch (checkError) {
        logger.error('Exception thrown during checkEmailUserExists', { 
          error: checkError instanceof Error ? checkError.message : String(checkError)
        }, 'EmailPhoneInputScreen');
        userExistsResult = { success: false, userExists: false, error: 'Failed to check user existence' };
      }

      if (!userExistsResult || typeof userExistsResult !== 'object') {
        logger.error('Invalid userExistsResult received', { userExistsResult }, 'EmailPhoneInputScreen');
        userExistsResult = { success: false, userExists: false, error: 'Invalid response from user check' };
      }

      if (!userExistsResult.success) {
        logger.warn('Failed to check if email user exists, proceeding with verification code', {
          error: userExistsResult.error
        }, 'EmailPhoneInputScreen');
      }

      if (userExistsResult.success && userExistsResult.userExists && userExistsResult.userId) {
        logger.info('Email user exists - checking last verification timestamp', {
          userId: userExistsResult.userId,
          email: email.trim()
        }, 'EmailPhoneInputScreen');

        try {
          const { firestoreService } = await import('../../config/firebase/firebase');
          const hasVerifiedRecently = await firestoreService.hasVerifiedWithin30Days(email.trim());

          if (hasVerifiedRecently) {
            logger.info('User verified within 30 days - skipping verification code', {
              userId: userExistsResult.userId,
              email: email.trim()
            }, 'EmailPhoneInputScreen');

            try {
              const { auth, app } = await import('../../config/firebase/firebase');
              const { signInWithCustomToken } = await import('firebase/auth');
              
              const { getFunctions, httpsCallable } = await import('firebase/functions');
              const functions = getFunctions(app);
              const getUserToken = httpsCallable<{ userId: string }, {
                success: boolean;
                customToken: string;
                message?: string;
              }>(functions, 'getUserCustomToken');

              const tokenResult = await getUserToken({ userId: userExistsResult.userId });
              const tokenData = tokenResult.data as {
                success: boolean;
                customToken: string;
                message?: string;
              };

              if (tokenData.success && tokenData.customToken) {
                await signInWithCustomToken(auth, tokenData.customToken);
                logger.info('✅ Signed in to Firebase Auth with custom token', null, 'EmailPhoneInputScreen');
              } else {
                logger.warn('getUserCustomToken did not return a valid token, falling back to verification code', {
                  userId: userExistsResult.userId,
                  tokenData
                }, 'EmailPhoneInputScreen');
                throw new Error('Failed to obtain custom token');
              }
            } catch (tokenError) {
              logger.warn('Failed to sign in with custom token, falling back to verification code', { 
                error: tokenError instanceof Error ? tokenError.message : String(tokenError),
                userId: userExistsResult.userId
              }, 'EmailPhoneInputScreen');
              throw tokenError;
            }

            try {
              const { firebaseDataService } = await import('../../services/data/firebaseDataService');
              const existingUserData = await firebaseDataService.user.getCurrentUser(userExistsResult.userId);

              if (existingUserData) {
                const authenticatedUser = {
                  id: userExistsResult.userId,
                  name: existingUserData.name || '',
                  email: existingUserData.email || email.trim(),
                  phone: existingUserData.phone || '',
                  wallet_address: existingUserData.wallet_address || '',
                  wallet_public_key: existingUserData.wallet_public_key || '',
                  created_at: existingUserData.created_at || new Date().toISOString(),
                  avatar: existingUserData.avatar || '',
                  emailVerified: existingUserData.email_verified !== false,
                  lastLoginAt: new Date().toISOString(),
                  hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false,
                };

                authenticateUser(authenticatedUser, 'email');

                logger.info('Authentication context updated for email login (verified within 30 days)', {
                  userId: userExistsResult.userId
                }, 'EmailPhoneInputScreen');

                // Login vs signup: existing user with profile → PinUnlock (PIN → Dashboard); new user → CreateProfile
                const hasName = authenticatedUser.name && authenticatedUser.name.trim() !== '';
                if (!hasName) {
                  logger.info('Email user needs profile, navigating to CreateProfile', {
                    userId: userExistsResult.userId,
                    email: email.trim(),
                    hasReferralCode: !!referralCode
                  }, 'EmailPhoneInputScreen');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'CreateProfile', params: {
                      email: email.trim(),
                      phoneNumber: authenticatedUser.phone,
                      referralCode: referralCode
                    } }],
                  });
                } else {
                  logger.info('Email user has profile, routing to PinUnlock (PIN → Dashboard)', {
                    userId: userExistsResult.userId,
                    name: authenticatedUser.name?.substring(0, 10) + '...'
                  }, 'EmailPhoneInputScreen');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'PinUnlock', params: { userId: userExistsResult.userId } }],
                  });
                }
                return;
              }
            } catch (firestoreError) {
              logger.error('Failed to fetch user data for email login', {
                error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
                userId: userExistsResult.userId
              }, 'EmailPhoneInputScreen');
            }
          } else {
            logger.info('User has not verified within 30 days - sending verification code', {
              userId: userExistsResult.userId,
              email: email.trim()
            }, 'EmailPhoneInputScreen');
          }
        } catch (verificationCheckError) {
          logger.error('Failed to check 30-day verification status', {
            error: verificationCheckError instanceof Error ? verificationCheckError.message : String(verificationCheckError),
            email: email.trim()
          }, 'EmailPhoneInputScreen');
        }
      }

      logger.info('Sending verification code', {
        email: email.trim(),
        userExists: userExistsResult.userExists
      }, 'EmailPhoneInputScreen');

      const result = await authService.sendEmailVerificationCode(email.trim());
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send verification code');
        return;
      }

      navigation.navigate('Verification', { 
        email: email.trim(),
        referralCode: referralCode
      });
    } catch (error) {
      logger.error('Email authentication failed', { error, email: email.trim() }, 'EmailPhoneInputScreen');
      Alert.alert('Error', 'Failed to process email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle phone authentication - EXACT COPY from AuthMethodsScreen to preserve backend logic
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
      logger.info('Starting phone authentication', { phoneNumber: formattedPhone.substring(0, 5) + '...' }, 'EmailPhoneInputScreen');

      await AuthPersistenceService.savePhone(formattedPhone);

      const result = await authService.signInWithPhoneNumber(formattedPhone);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to authenticate with phone number');
        return;
      }

      if (result.user && !result.isNewUser) {
        logger.info('Phone instant login successful - user already exists', {
          userId: result.user.uid,
          phoneNumber: formattedPhone.substring(0, 5) + '...'
        }, 'EmailPhoneInputScreen');

        try {
          const { firebaseDataService } = await import('../../services/data/firebaseDataService');
          const existingUserData = await firebaseDataService.user.getCurrentUser(result.user.uid);

          if (existingUserData) {
            const authenticatedUser = {
              id: result.user.uid,
              name: existingUserData.name || '',
              email: existingUserData.email || '',
              phone: existingUserData.phone || formattedPhone,
              wallet_address: existingUserData.wallet_address || '',
              wallet_public_key: existingUserData.wallet_public_key || '',
              created_at: existingUserData.created_at || new Date().toISOString(),
              avatar: existingUserData.avatar || '',
              emailVerified: existingUserData.email_verified || false,
              lastLoginAt: new Date().toISOString(),
              hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false,
            };

            authenticateUser(authenticatedUser, 'phone');

            logger.info('Authentication context updated for phone instant login', {
              userId: result.user.uid
            }, 'EmailPhoneInputScreen');

            // Login vs signup: existing user with profile → PinUnlock (PIN → Dashboard); new user → CreateProfile
            const needsProfile = !authenticatedUser.name || authenticatedUser.name.trim() === '';
            if (needsProfile) {
              logger.info('Phone user needs profile, navigating to CreateProfile', {
                userId: result.user.uid,
                phoneNumber: formattedPhone.substring(0, 5) + '...',
                hasReferralCode: !!referralCode
              }, 'EmailPhoneInputScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: {
                  phoneNumber: formattedPhone,
                  email: authenticatedUser.email,
                  referralCode: referralCode
                } }],
              });
            } else {
              logger.info('Phone user has profile, routing to PinUnlock (PIN → Dashboard)', {
                userId: result.user.uid,
                name: authenticatedUser.name?.substring(0, 10) + '...'
              }, 'EmailPhoneInputScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'PinUnlock', params: { userId: result.user.uid } }],
              });
            }
            return;
          } else {
            logger.error('User data not found in Firestore for instant login', {
              userId: result.user.uid
            }, 'EmailPhoneInputScreen');
            Alert.alert('Error', 'User data not found. Please try again.');
            return;
          }
        } catch (firestoreError) {
          logger.error('Failed to fetch user data for instant login', {
            error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
          }, 'EmailPhoneInputScreen');
          Alert.alert('Error', 'Failed to load user data. Please try again.');
          return;
        }
      }

      logger.info('New phone user - navigating to SMS verification', {
        phoneNumber: formattedPhone.substring(0, 5) + '...',
        verificationId: result.verificationId,
        hasReferralCode: !!referralCode
      }, 'EmailPhoneInputScreen');

      navigation.navigate('Verification', {
        phoneNumber: formattedPhone,
        verificationId: result.verificationId,
        referralCode: referralCode
      });
    } catch (error) {
      logger.error('Phone authentication failed', { error, phoneNumber: formattedPhone.substring(0, 5) + '...' }, 'EmailPhoneInputScreen');

      let errorMessage = 'Failed to send SMS. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('reCAPTCHA') || error.message.includes('external scripts')) {
          errorMessage = 'Phone authentication requires reCAPTCHA verification. Please ensure reCAPTCHA is properly configured in Firebase Console. If the issue persists, try email authentication instead.';
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

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  if (isInitializing) {
    return (
      <Container>
        <View style={styles.contentContainer}>
          <Header
            showBackButton={true}
            onBackPress={() => navigation.goBack()}
            showHelpCenter={true}
            onHelpCenterPress={handleHelpCenterPress}
          />
          <LoadingScreen
            message="Loading..."
            showSpinner={true}
          />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Header
            showBackButton={true}
            onBackPress={() => navigation.goBack()}
            showHelpCenter={true}
            onHelpCenterPress={handleHelpCenterPress}
          />

          <View style={styles.contentContainer}>
            {/* Title based on auth method */}
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <PhosphorIcon
                  name={authMethod === 'email' ? 'Envelope' : 'DeviceMobileSpeaker'}
                  size={24}
                  color={colors.white}
                  weight="regular"
                />
              </View>
              <Text style={styles.title}>
                {authMethod === 'email' ? 'Continue with Email' : 'Continue with Phone'}
              </Text>
              <Text style={styles.subtitle}>
                {authMethod === 'email' 
                  ? 'Sign in or sign up with your email.'
                  : 'Sign in or sign up with your phone number.'}
              </Text>
            </View>

            {/* Input Field */}
            {authMethod === 'email' ? (
              <Input
                inputRef={inputRef}
                label="Email"
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  AuthPersistenceService.saveEmail(text).catch((error) => {
                    logger.error('Failed to save email', { error }, 'EmailPhoneInputScreen');
                  });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                autoFocus={!isInitializing}
              />
            ) : (
              <Input
                inputRef={inputRef}
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
                autoFocus={!isInitializing}
              />
            )}
          </View>
        </ScrollView>

        {/* Next Button - Positioned above keyboard */}
        <View style={[styles.buttonContainer, { paddingBottom: keyboardHeight > 0 ? keyboardHeight - 20 : 20 }]}>
          <Button
            title="Next"
            onPress={() => {
              if (authMethod === 'email') {
                handleEmailAuth();
              } else {
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
      </View>
    </Container>
  );
};

export default EmailPhoneInputScreen;
