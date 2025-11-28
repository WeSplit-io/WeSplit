import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Header } from '../../components/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { verifyCode, sendVerificationCode } from '../../services/data';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import { authService } from '../../services/auth/AuthService';
import { auth } from '../../config/firebase/firebase';
import { EmailPersistenceService } from '../../services/core/emailPersistenceService';

const CODE_LENGTH = 4; // 4-digit code
const RESEND_SECONDS = 30;

const VerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { authenticateUser, state } = useApp();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer === 0) {return;}
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (val: string, idx: number) => {
    if (val.length === CODE_LENGTH && /^\d{4}$/.test(val)) {
      setCode(val.split(''));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      return;
    }
    if (/^\d?$/.test(val)) {
      const newCode = [...code];
      newCode[idx] = val;
      setCode(newCode);
      if (val && idx < CODE_LENGTH - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (code.join('').length !== CODE_LENGTH) {
      setError('Please enter the 4-digit code');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const email = route.params?.email;
      const phoneNumber = route.params?.phoneNumber;
      const verificationId = route.params?.verificationId;
      const isLinking = route.params?.isLinking; // Flag for linking phone to existing account

      const codeString = code.join('');

      // Handle phone verification
      if (phoneNumber && verificationId) {
        // Check if this is linking phone to existing account or new signup
        if (isLinking) {
          // Linking phone to existing user account
          if (__DEV__) { logger.info('Linking phone to existing account', { codeString, phoneNumber: phoneNumber.substring(0, 5) + '...' }, 'VerificationScreen'); }
          
          // Get userId from app context
          const userId = state.currentUser?.id;
          const linkResult = await authService.verifyAndLinkPhoneCode(verificationId, codeString, phoneNumber, userId);
          
          if (!linkResult.success) {
            throw new Error(linkResult.error || 'Failed to link phone number');
          }

          // Phone linked successfully - update local user state
          if (__DEV__) { logger.info('Phone linked successfully', { phoneNumber: phoneNumber.substring(0, 5) + '...' }, 'VerificationScreen'); }
          
          // Refresh user data to get updated phone number
          try {
            const { firestoreService } = await import('../../config/firebase/firebase');
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              const updatedUserData = await firestoreService.getUserDocument(currentUser.uid);
              
              if (updatedUserData) {
                const transformedUser = {
                  // Spread all Firestore data first
                  ...updatedUserData,
                  // Then override with critical fields
                  id: updatedUserData.id,
                  name: updatedUserData.name,
                  email: updatedUserData.email || '',
                  phone: updatedUserData.phone || phoneNumber,
                  wallet_address: updatedUserData.wallet_address || '',
                  wallet_public_key: updatedUserData.wallet_public_key || updatedUserData.wallet_address || '',
                  created_at: updatedUserData.created_at || new Date().toISOString(),
                  avatar: updatedUserData.avatar || '',
                  hasCompletedOnboarding: updatedUserData.hasCompletedOnboarding || false,
                  // Ensure asset fields are included with proper defaults
                  badges: updatedUserData.badges || [],
                  active_badge: updatedUserData.active_badge || undefined,
                  profile_borders: updatedUserData.profile_borders || [],
                  active_profile_border: updatedUserData.active_profile_border || undefined,
                  wallet_backgrounds: updatedUserData.wallet_backgrounds || [],
                  active_wallet_background: updatedUserData.active_wallet_background || undefined,
                };

                // CRITICAL: Preserve email in SecureStore after phone linking
                // This ensures the user can still log in with email after linking phone
                if (transformedUser.email) {
                  try {
                    await EmailPersistenceService.saveEmail(transformedUser.email);
                    if (__DEV__) { logger.info('Email preserved in SecureStore after phone linking', { email: transformedUser.email }, 'VerificationScreen'); }
                  } catch (emailSaveError) {
                    logger.warn('Failed to preserve email after phone linking (non-critical)', emailSaveError, 'VerificationScreen');
                    // Non-critical, continue with authentication
                  }
                }
                
                // Update the global app context with the updated user
                authenticateUser(transformedUser, state.authMethod || 'email');
                
                // Clear phone reminder badge
                if (currentUser.uid) {
                  try {
                    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                    const promptShownKey = `phone_prompt_shown_${currentUser.uid}`;
                    await AsyncStorage.removeItem(promptShownKey);
                  } catch (error) {
                    // Non-critical
                  }
                }
                
                // Navigate back to profile
                Alert.alert('Success', 'Phone number linked successfully!');
                navigation.goBack();
                return;
              }
            }
          } catch (error) {
            logger.error('Failed to refresh user data after phone linking', error, 'VerificationScreen');
            
            // CRITICAL: Even if refresh fails, preserve the email from current user context
            // This ensures email persistence is maintained
            if (state.currentUser?.email) {
              try {
                await EmailPersistenceService.saveEmail(state.currentUser.email);
                if (__DEV__) { logger.info('Email preserved in SecureStore after phone linking (fallback)', { email: state.currentUser.email }, 'VerificationScreen'); }
              } catch (emailSaveError) {
                logger.warn('Failed to preserve email after phone linking (fallback, non-critical)', emailSaveError, 'VerificationScreen');
              }
            }
            
            // Still show success and navigate back
            Alert.alert('Success', 'Phone number linked successfully!');
            navigation.goBack();
            return;
          }
        } else {
          // New user signup with phone
          if (__DEV__) { logger.info('Verifying phone code', { codeString, phoneNumber: phoneNumber.substring(0, 5) + '...' }, 'VerificationScreen'); }
          
          const authResponse = await authService.verifyPhoneCode(verificationId, codeString);

          if (!authResponse.success || !authResponse.user) {
            throw new Error(authResponse.error || 'Phone verification failed');
          }

          // Code verified successfully and user is now authenticated
          if (__DEV__) { logger.info('Phone authentication successful', { user: authResponse.user.uid }, 'VerificationScreen'); }
          
          // Get user data from Firestore
          try {
            const { firestoreService } = await import('../../config/firebase/firebase');
            const existingUserData = await firestoreService.getUserDocument(authResponse.user.uid);
            
            if (existingUserData) {
              const transformedUser = {
                // Spread all Firestore data first
                ...existingUserData,
                // Then override with critical fields
                id: existingUserData.id,
                name: existingUserData.name,
                email: existingUserData.email || '',
                phone: existingUserData.phone || phoneNumber,
                wallet_address: existingUserData.wallet_address || '',
                wallet_public_key: existingUserData.wallet_public_key || existingUserData.wallet_address || '',
                created_at: existingUserData.created_at || new Date().toISOString(),
                avatar: existingUserData.avatar || '',
                hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false,
                // Ensure asset fields are included with proper defaults
                badges: existingUserData.badges || [],
                active_badge: existingUserData.active_badge || undefined,
                profile_borders: existingUserData.profile_borders || [],
                active_profile_border: existingUserData.active_profile_border || undefined,
                wallet_backgrounds: existingUserData.wallet_backgrounds || [],
                active_wallet_background: existingUserData.active_wallet_background || undefined,
              };

              // CRITICAL: If user has email, save it to SecureStore for future logins
              // This ensures users can log in with either email or phone after phone signup
              if (transformedUser.email) {
                try {
                  await EmailPersistenceService.saveEmail(transformedUser.email);
                  if (__DEV__) { logger.info('Email saved to SecureStore after phone signup', { email: transformedUser.email }, 'VerificationScreen'); }
                } catch (emailSaveError) {
                  logger.warn('Failed to save email after phone signup (non-critical)', emailSaveError, 'VerificationScreen');
                  // Non-critical, continue with authentication
                }
              }
              
              // Update the global app context with the authenticated user
              authenticateUser(transformedUser, 'phone');
              
              // Check if user needs to create a profile
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';
              
              if (needsProfile) {
                logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'CreateProfile', params: { email: transformedUser.email, phoneNumber: transformedUser.phone } }],
                });
              } else {
                logger.info('User already has name, navigating to Dashboard', { name: transformedUser.name }, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              }
            } else {
              throw new Error('User data not found');
            }
          } catch (firestoreError) {
            logger.error('Failed to get user data from Firestore', firestoreError, 'VerificationScreen');
            throw new Error('Failed to load user data');
          }
        }
      } 
      // Handle email verification (existing flow)
      else if (email) {
        if (__DEV__) { logger.info('Verifying email code', { codeString, email }, 'VerificationScreen'); }
      
      const authResponse = await verifyCode(email, codeString);

      if (!authResponse.success || !authResponse.user) {
        throw new Error(authResponse.error || 'Authentication failed');
      }

      // Code verified successfully and user is now authenticated
      if (__DEV__) { logger.info('Authentication successful', { user: authResponse.user }, 'VerificationScreen'); }
      
      // CRITICAL: Sign user into Firebase Auth using custom token if available
      // This ensures auth.currentUser is set, which is required for phone linking
      if (authResponse.customToken) {
        try {
          const { signInWithCustomToken } = await import('firebase/auth');
          const { auth } = await import('../../config/firebase/firebase');
          await signInWithCustomToken(auth, authResponse.customToken);
          if (__DEV__) { logger.info('✅ Signed in to Firebase Auth with custom token', null, 'VerificationScreen'); }
        } catch (tokenError) {
          logger.warn('Failed to sign in with custom token (non-critical)', tokenError, 'VerificationScreen');
          // Continue anyway - user is still authenticated in app context
        }
      } else {
        logger.warn('No custom token returned from verification - user may not be signed into Firebase Auth', null, 'VerificationScreen');
      }
      
      // Transform API response to match User type (snake_case)
      // Keep Firebase user ID as string to match Firestore format
      let transformedUser = {
        id: authResponse.user.id, // Keep as string for Firebase compatibility
        name: authResponse.user.name,
        email: authResponse.user.email,
        wallet_address: authResponse.user.walletAddress,
        wallet_public_key: authResponse.user.walletPublicKey,
        created_at: authResponse.user.createdAt,
        avatar: authResponse.user.avatar,
        hasCompletedOnboarding: authResponse.user.hasCompletedOnboarding || false
      };
      
      // CRITICAL FIX: If Firebase Functions didn't return user data, fetch it from Firestore
      if (!transformedUser.name || !transformedUser.wallet_address) {
        if (__DEV__) { logger.info('Firebase Functions returned empty data, fetching from Firestore', null, 'VerificationScreen'); }
        
        try {
          const { firestoreService } = await import('../../config/firebase/firebase');
          const existingUserData = await firestoreService.getUserDocument(transformedUser.id);
          
          if (existingUserData && existingUserData.name && existingUserData.wallet_address) {
            if (__DEV__) { logger.info('Found existing user data in Firestore', { existingUserData }, 'VerificationScreen'); }
            
            // Update transformed user with existing data
            transformedUser = {
              ...transformedUser,
              name: existingUserData.name,
              wallet_address: existingUserData.wallet_address,
              wallet_public_key: existingUserData.wallet_public_key || existingUserData.wallet_address,
              hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false
            };
            
            if (__DEV__) { logger.info('Updated user data from Firestore', { transformedUser }, 'VerificationScreen'); }
          }
        } catch (firestoreError) {
          if (__DEV__) { console.warn('⚠️ Could not fetch user data from Firestore:', firestoreError); }
        }
      }
      
      if (__DEV__) {
        logger.debug('Raw API Response', { authResponse }, 'VerificationScreen');
        logger.debug('Transformed User', { transformedUser }, 'VerificationScreen');
      }
      
      // Save email to persistence for future logins
      try {
        await EmailPersistenceService.saveEmail(transformedUser.email);
        if (__DEV__) { logger.info('Email saved to persistence after successful verification', { email: transformedUser.email }, 'VerificationScreen'); }
      } catch (emailSaveError) {
        logger.warn('Failed to save email to persistence (non-critical)', emailSaveError, 'VerificationScreen');
        // Non-critical, continue with authentication
      }
      
      // Update the global app context with the authenticated user
      authenticateUser(transformedUser, 'email');
      if (__DEV__) { logger.info('User authenticated in app context', null, 'VerificationScreen'); }
      
      // Check if user needs to create a profile (has no name/pseudo)
      const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';
      
      if (needsProfile) {
        logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
        });
      } else {
        // User already has a name, go directly to Dashboard
        logger.info('User already has name, navigating to Dashboard', { name: transformedUser.name }, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
        }
      } else {
        throw new Error('Email or phone number not found');
      }
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer === 0 && !resending) {
      setResending(true);
      setError('');
      
      try {
        const email = route.params?.email;
        const phoneNumber = route.params?.phoneNumber;

        // Handle phone resend
        if (phoneNumber) {
          const isLinking = route.params?.isLinking;
          
          // Use appropriate method based on context
          const result = isLinking 
            ? await authService.linkPhoneNumberToUser(phoneNumber)
            : await authService.signInWithPhoneNumber(phoneNumber);
          
          if (result.success) {
            setTimer(RESEND_SECONDS);
            Alert.alert('Success', 'New verification code sent to your phone');
            // Update route params with new verification ID
            route.params = { ...route.params, verificationId: result.verificationId };
          } else {
            throw new Error(result.error || 'Failed to resend code');
        }
        }
        // Handle email resend
        else if (email) {
        const result = await sendVerificationCode(email);
        
        if (result.success) {
          setTimer(RESEND_SECONDS);
        Alert.alert('Success', 'New verification code sent to your email');
        } else {
          throw new Error(result.error || 'Failed to resend code');
          }
        } else {
          throw new Error('Email or phone number not found');
        }
        
      } catch (error) {
        console.error('Failed to resend code:', error);
        setError(error instanceof Error ? error.message : 'Failed to resend code');
      } finally {
        setResending(false);
      }
    }
  };

  const timerText = `00:${timer < 10 ? '0' : ''}${timer}`;

  return (
    <Container>
      <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.mainContainer}>
          {/* Header with Logo Centered */}
          <Header
            onBackPress={() => navigation.goBack()}
            showBackButton={true}
            variant="logoWithBack"
          />

          {/* Main Content - Scrollable */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerContent}>
        <View style={styles.mailIconBox}>
          <Image 
            source={{ 
              uri: route.params?.phoneNumber 
                ? 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphone.png?alt=media' 
                : 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmail.png?alt=media&token=5e3ac6e7-79b1-47e7-8087-f7e4c070d222' 
            }} 
            style={styles.mailIcon} 
          />
        </View>
        <Text style={styles.title}>
          {route.params?.phoneNumber ? 'Check your Phone' : 'Check your Email'}
        </Text>
        <Text style={styles.subtitle}>
          We sent a code to{' '}
          <Text style={styles.emailHighlight}>
            {route.params?.phoneNumber 
              ? route.params.phoneNumber.substring(0, 5) + '...' 
              : route.params?.email || 'yourname@gmail.com'}
          </Text>
        </Text>
        
        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              style={styles.codeInput}
              value={digit}
              onChangeText={val => handleChange(val, idx)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onKeyPress={e => handleKeyPress(e, idx)}
              textContentType="oneTimeCode"
              returnKeyType="done"
              autoComplete="one-time-code"
              enablesReturnKeyAutomatically={true}
            />
          ))}
        </View>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={verifying}
        >
          <LinearGradient
            colors={verifying ? [colors.white10, colors.white10] : [colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {verifying ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Timer and resend */}
        <View style={styles.timerSection}>
        <Text style={styles.timer}>{timerText}</Text>
        <TouchableOpacity
          style={styles.resendLink}
          onPress={handleResend}
          disabled={timer !== 0 || resending}
        >
            <Text style={[styles.resendText, timer !== 0 || resending ? styles.resendTextDisabled : null]}>
              Resend Code
            </Text>
          </TouchableOpacity>
        </View>
            </View>
          </ScrollView>

          {/* Help Link - Fixed at bottom */}
          <View style={styles.helpSection}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default VerificationScreen; 
