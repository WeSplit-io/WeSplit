import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking, Keyboard, ScrollView, TextStyle, Dimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Header, Button } from '../../components/shared';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from './styles';
import { verifyCode, sendVerificationCode } from '../../services/data';
import { useApp } from '../../context/AppContext';
import { colors, spacing, typography } from '../../theme';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';
import { authService } from '../../services/auth/AuthService';
import { auth } from '../../config/firebase/firebase';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import PhosphorIcon from '../../components/shared/PhosphorIcon';

// Dynamic code length based on verification type
const getCodeLength = (phoneNumber?: string) => phoneNumber ? 6 : 6; // 6 digits for phone, 6 for email
const RESEND_SECONDS = 30;

const VerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { authenticateUser, state } = useApp();

  // Get code length based on verification type
  const codeLength = getCodeLength(route.params?.phoneNumber);

  const [code, setCode] = useState(Array(codeLength).fill(''));
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  // Auto-focus first input to open keyboard by default
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  useEffect(() => {
    if (timer === 0) {return;}
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Reset code array when verification type changes
  useEffect(() => {
    const newCodeLength = getCodeLength(route.params?.phoneNumber);
    if (__DEV__) {
      console.log('VerificationScreen: Code length calculation', {
        phoneNumber: route.params?.phoneNumber,
        email: route.params?.email,
        calculatedLength: newCodeLength,
        currentLength: code.length
      });
    }
    if (newCodeLength !== code.length) {
      setCode(Array(newCodeLength).fill(''));
      setError(''); // Clear any existing errors
      // Reset input refs
      inputRefs.current = [];
    }
  }, [route.params?.phoneNumber]); // Re-run when phoneNumber param changes

  const handleChange = (val: string, idx: number) => {
    // Handle paste: if multiple digits are pasted, fill all inputs
    if (val.length > 1) {
      const cleanedCode = val.replace(/\D/g, ''); // Remove non-digits
      if (cleanedCode.length >= codeLength) {
        // Full code pasted
        const codeArray = cleanedCode.substring(0, codeLength).split('');
        setCode(codeArray);
        inputRefs.current[codeLength - 1]?.focus();
        return;
      } else if (cleanedCode.length > 0) {
        // Partial code pasted - fill from current index
        const newCode = [...code];
        for (let i = 0; i < cleanedCode.length && (idx + i) < codeLength; i++) {
          newCode[idx + i] = cleanedCode[i];
        }
        setCode(newCode);
        const nextFocusIdx = Math.min(idx + cleanedCode.length, codeLength - 1);
        inputRefs.current[nextFocusIdx]?.focus();
        return;
      }
    }
    
    // Handle single digit input
    if (/^\d?$/.test(val)) {
      const newCode = [...code];
      newCode[idx] = val;
      setCode(newCode);
      if (val && idx < codeLength - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!code[idx] && idx > 0) {
        // If current input is empty, delete previous digit and focus previous input
        const newCode = [...code];
        newCode[idx - 1] = '';
        setCode(newCode);
        inputRefs.current[idx - 1]?.focus();
      } else if (code[idx]) {
        // If current input has a digit, clear it
        const newCode = [...code];
        newCode[idx] = '';
        setCode(newCode);
      }
    }
  };

  const handleInputPress = () => {
    // Check if code is complete
    const isCodeComplete = code.join('').length === codeLength;
    
    if (isCodeComplete) {
      // If code is complete, focus last input to allow deletion
      inputRefs.current[codeLength - 1]?.focus();
    } else {
      // If code is incomplete, focus first empty input or first input
      const firstEmptyIndex = code.findIndex(digit => !digit);
      const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      
      if (!clipboardContent || clipboardContent.trim() === '') {
        return; // Empty clipboard
      }
      
      const cleanedCode = clipboardContent.replace(/\D/g, ''); // Remove non-digits
      
      if (cleanedCode.length >= codeLength) {
        // Full code pasted
        const codeArray = cleanedCode.substring(0, codeLength).split('');
        setCode(codeArray);
        inputRefs.current[codeLength - 1]?.focus();
      } else if (cleanedCode.length > 0) {
        // Partial code pasted
        const newCode = [...code];
        for (let i = 0; i < cleanedCode.length && i < codeLength; i++) {
          newCode[i] = cleanedCode[i];
        }
        setCode(newCode);
        const nextFocusIdx = Math.min(cleanedCode.length, codeLength - 1);
        inputRefs.current[nextFocusIdx]?.focus();
      }
    } catch (error) {
      logger.error('Failed to paste code', { error }, 'VerificationScreen');
      Alert.alert('Error', 'Failed to paste code. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (code.join('').length !== codeLength) {
      setError(`Please enter the ${codeLength}-digit code`);
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
                    await AuthPersistenceService.saveEmail(transformedUser.email);
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
                await AuthPersistenceService.saveEmail(state.currentUser.email);
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

          // Create user object from Firebase Auth data - AuthService handles Firestore
          const transformedUser = {
            id: authResponse.user.uid, // Use actual Firebase Auth UID
            name: authResponse.user.displayName || '',
            email: authResponse.user.email || '',
            phone: phoneNumber,
            wallet_address: '',
            wallet_public_key: '',
            created_at: authResponse.user.metadata.creationTime || new Date().toISOString(),
            avatar: authResponse.user.photoURL || '',
            emailVerified: false,
            lastLoginAt: new Date().toISOString(),
            hasCompletedOnboarding: false,
            badges: [],
            active_badge: undefined,
            profile_borders: [],
            active_profile_border: undefined,
            wallet_backgrounds: [],
            active_wallet_background: undefined,
          };

          // Save email if available
          if (transformedUser.email) {
            try {
              await AuthPersistenceService.saveEmail(transformedUser.email);
            } catch (error) {
              logger.warn('Failed to save email after phone auth', error, 'VerificationScreen');
            }
          }

          // Update app context
          authenticateUser(transformedUser, 'phone');

          // Ensure wallet exists
          try {
            const { authService } = await import('../../services/auth/AuthService');
            await authService.ensureUserWallet(transformedUser.id);
          } catch (error) {
            logger.warn('Failed to ensure wallet for phone user', error, 'VerificationScreen');
          }

          // Check if profile needed
          const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

          if (needsProfile) {
            // Preserve referral code from route params
            const referralCode = route.params?.referralCode;
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'CreateProfile', params: {
                email: transformedUser.email,
                phoneNumber: transformedUser.phone,
                referralCode: referralCode
              } }],
            });
          } else {
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
          }
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
                  await AuthPersistenceService.saveEmail(transformedUser.email);
                  if (__DEV__) { logger.info('Email saved to SecureStore after phone signup', { email: transformedUser.email }, 'VerificationScreen'); }
                } catch (emailSaveError) {
                  logger.warn('Failed to save email after phone signup (non-critical)', emailSaveError, 'VerificationScreen');
                  // Non-critical, continue with authentication
                }
              }

              if (__DEV__) {
                logger.debug('Raw Phone API Response', { authResponse }, 'VerificationScreen');
                logger.debug('Transformed Phone User', { transformedUser }, 'VerificationScreen');
              }
              
              // Update the global app context with the authenticated user
              authenticateUser(transformedUser, 'phone');
              if (__DEV__) { logger.info('User authenticated in app context', null, 'VerificationScreen'); }

              // Ensure wallet exists for the user (consistent with email authentication)
              try {
                const { authService } = await import('../../services/auth/AuthService');
                await authService.ensureUserWallet(transformedUser.id);
                logger.info('Wallet ensured for phone user', { userId: transformedUser.id }, 'VerificationScreen');
              } catch (walletError) {
                logger.warn('Failed to ensure wallet for phone user (non-critical)', walletError, 'VerificationScreen');
                // Non-critical, continue with authentication
              }

              // Check if user needs to create a profile (same logic for both email and phone)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

              if (needsProfile) {
                // Preserve referral code from route params
                const referralCode = route.params?.referralCode;
                logger.info('User needs to create profile (no name), navigating to CreateProfile', {
                  method: route.params?.phoneNumber ? 'phone' : 'email',
                  phoneNumber: transformedUser.phone,
                  email: transformedUser.email,
                  hasReferralCode: !!referralCode
                }, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'CreateProfile', params: {
                    email: transformedUser.email,
                    phoneNumber: transformedUser.phone,
                    referralCode: referralCode
                  } }],
                });
              } else {
                logger.info('User already has name, navigating to Dashboard', {
                  name: transformedUser.name,
                  method: route.params?.phoneNumber ? 'phone' : 'email'
                }, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              }
            } else {
              // CRITICAL: User data not found in Firestore - this should not happen for phone auth
              // But let's handle it gracefully like email verification does
              logger.error('User data not found in Firestore for phone auth', {
                userId: authResponse.user.uid,
                phoneNumber: phoneNumber.substring(0, 5) + '...'
              }, 'VerificationScreen');

              // Create a basic user object from Firebase Auth user data
              // This ensures the user can still proceed even if Firestore data is missing
              const transformedUser = {
                id: authResponse.user.uid,
                name: authResponse.user.displayName || '',
                email: authResponse.user.email || '',
                phone: phoneNumber,
                wallet_address: '',
                wallet_public_key: '',
                created_at: new Date().toISOString(),
                avatar: authResponse.user.photoURL || '',
                emailVerified: false,
                lastLoginAt: new Date().toISOString(),
                hasCompletedOnboarding: false,
                // Ensure asset fields are included with proper defaults
                badges: [],
                active_badge: undefined,
                profile_borders: [],
                active_profile_border: undefined,
                wallet_backgrounds: [],
                active_wallet_background: undefined,
              };

              logger.info('Created fallback user object for phone auth', { transformedUser }, 'VerificationScreen');

              // Update the global app context with the authenticated user
              authenticateUser(transformedUser, 'phone');
              if (__DEV__) { logger.info('User authenticated in app context', null, 'VerificationScreen'); }

              // Ensure wallet exists for the user (consistent with email authentication)
              try {
                const { authService } = await import('../../services/auth/AuthService');
                await authService.ensureUserWallet(transformedUser.id);
                logger.info('Wallet ensured for phone user (fallback)', { userId: transformedUser.id }, 'VerificationScreen');
              } catch (walletError) {
                logger.warn('Failed to ensure wallet for phone user (fallback, non-critical)', walletError, 'VerificationScreen');
                // Non-critical, continue with authentication
              }

              // Check if user needs to create a profile (same logic as email)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

              if (needsProfile) {
                // Preserve referral code from route params
                const referralCode = route.params?.referralCode;
                logger.info('Phone user needs to create profile (no name, fallback case), navigating to CreateProfile', { 
                  phoneNumber: transformedUser.phone,
                  hasReferralCode: !!referralCode
                }, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'CreateProfile', params: {
                    phoneNumber: transformedUser.phone,
                    email: transformedUser.email,
                    referralCode: referralCode
                  } }],
                });
              } else {
                logger.info('Phone user already has name (fallback case), navigating to Dashboard', { name: transformedUser.name, phoneNumber: transformedUser.phone }, 'VerificationScreen');
                (navigation as any).reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              }
              return;
            }
          } catch (firestoreError) {
            logger.error('Failed to get user data from Firestore for phone auth', firestoreError, 'VerificationScreen');

            // CRITICAL FIX: Even if Firestore fails, create a basic user object
            // This ensures phone authentication can still succeed even with Firestore issues
            const transformedUser = {
              id: authResponse.user.uid,
              name: authResponse.user.displayName || '',
              email: authResponse.user.email || '',
              phone: phoneNumber,
              wallet_address: '',
              wallet_public_key: '',
              created_at: new Date().toISOString(),
              avatar: authResponse.user.photoURL || '',
              emailVerified: false,
              lastLoginAt: new Date().toISOString(),
              hasCompletedOnboarding: false,
              // Ensure asset fields are included with proper defaults
              badges: [],
              active_badge: undefined,
              profile_borders: [],
              active_profile_border: undefined,
              wallet_backgrounds: [],
              active_wallet_background: undefined,
            };

            logger.info('Created fallback user object after Firestore error', { transformedUser }, 'VerificationScreen');

            // CRITICAL: If user has email, save it to SecureStore for future logins
            // This ensures users can log in with either email or phone after phone signup
            if (transformedUser.email) {
              try {
                await AuthPersistenceService.saveEmail(transformedUser.email);
                if (__DEV__) { logger.info('Email saved to SecureStore after phone signup (fallback)', { email: transformedUser.email }, 'VerificationScreen'); }
              } catch (emailSaveError) {
                logger.warn('Failed to save email after phone signup (fallback, non-critical)', emailSaveError, 'VerificationScreen');
                // Non-critical, continue with authentication
              }
            }

            // Update the global app context with the fallback user
            authenticateUser(transformedUser, 'phone');
            if (__DEV__) { logger.info('User authenticated in app context with fallback data', null, 'VerificationScreen'); }

            // Ensure wallet exists for the user (consistent with email authentication, even for fallback)
            try {
              const { authService } = await import('../../services/auth/AuthService');
              await authService.ensureUserWallet(transformedUser.id);
              logger.info('Wallet ensured for phone user (Firestore error fallback)', { userId: transformedUser.id }, 'VerificationScreen');
            } catch (walletError) {
              logger.warn('Failed to ensure wallet for phone user (Firestore error fallback, non-critical)', walletError, 'VerificationScreen');
              // Non-critical, continue with authentication
            }

            // Check if user needs to create a profile (same logic as email, even for fallback)
            const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

            if (needsProfile) {
              // Preserve referral code from route params
              const referralCode = route.params?.referralCode;
              logger.info('Phone user needs to create profile (no name, Firestore error fallback), navigating to CreateProfile', { 
                phoneNumber: transformedUser.phone,
                hasReferralCode: !!referralCode
              }, 'VerificationScreen');
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: {
                  phoneNumber: transformedUser.phone,
                  email: transformedUser.email,
                  referralCode: referralCode
                } }],
              });
            } else {
              logger.info('Phone user already has name (Firestore error fallback), navigating to Dashboard', { name: transformedUser.name, phoneNumber: transformedUser.phone }, 'VerificationScreen');
              (navigation as any).reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
            return;
          }
        }
      } 
      // Handle email verification (existing flow)
      else if (email) {
        if (__DEV__) { logger.info('Verifying email code', { codeString, email }, 'VerificationScreen'); }
      
      const authResponse = await authService.verifyEmailCode(email, codeString);

      if (!authResponse.success || !authResponse.user) {
        throw new Error(authResponse.error || 'Authentication failed');
      }

      // Code verified successfully and user is now authenticated
      if (__DEV__) { logger.info('Authentication successful', { user: authResponse.user }, 'VerificationScreen'); }
      
      // CRITICAL: Sign user into Firebase Auth using custom token if available
      // This ensures auth.currentUser is set, which is required for Firestore operations
      if (authResponse.customToken) {
        try {
          const { signInWithCustomToken, onAuthStateChanged } = await import('firebase/auth');
          const { auth } = await import('../../config/firebase/firebase');
          
          // Sign in with custom token
          await signInWithCustomToken(auth, authResponse.customToken);
          logger.info('✅ Signed in to Firebase Auth with custom token', null, 'VerificationScreen');
          
          // CRITICAL: Wait for auth state to propagate before accessing Firestore
          // This ensures Firestore security rules recognize the authenticated user
          const authReady = await new Promise<boolean>((resolve) => {
            if (auth.currentUser && auth.currentUser.uid === authResponse.user.id) {
              resolve(true);
              return;
            }
            
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              if (user && user.uid === authResponse.user.id) {
                unsubscribe();
                resolve(true);
              }
            });
            
            // Timeout after 3 seconds
            setTimeout(() => {
              unsubscribe();
              resolve(!!auth.currentUser && auth.currentUser.uid === authResponse.user.id);
            }, 3000);
          });
          
          if (!authReady) {
            logger.warn('Auth state not ready after sign-in, Firestore operations may fail', {
              userId: authResponse.user.id,
              hasCurrentUser: !!auth.currentUser
            }, 'VerificationScreen');
          } else {
            logger.info('✅ Auth state ready, Firestore operations can proceed', {
              userId: authResponse.user.id
            }, 'VerificationScreen');
          }
        } catch (tokenError) {
          logger.error('Failed to sign in with custom token', tokenError, 'VerificationScreen');
          // This is critical - without auth, Firestore operations will fail
          throw new Error('Failed to authenticate. Please try again.');
        }
      } else {
        logger.warn('No custom token returned from verification - user may not be signed into Firebase Auth', null, 'VerificationScreen');
        // For new users, we still need to sign them in - this should not happen
        // But if it does, we'll try to continue and let Firestore rules handle it
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
      
      // CRITICAL: Always fetch fresh user data from Firestore after verification
      // This ensures we have the latest lastVerifiedAt timestamp and all user fields
      // NOTE: This will only work if user is authenticated (auth.currentUser is set)
      try {
        const { firestoreService } = await import('../../config/firebase/firebase');
        const freshUserData = await firestoreService.getUserDocument(transformedUser.id);
        
        if (freshUserData) {
          if (__DEV__) { 
            logger.info('Fetched fresh user data from Firestore after verification', { 
              userId: transformedUser.id,
              hasLastVerifiedAt: !!freshUserData.lastVerifiedAt,
              lastVerifiedAt: freshUserData.lastVerifiedAt
            }, 'VerificationScreen'); 
          }
          
          // Update transformed user with fresh Firestore data (includes lastVerifiedAt)
          transformedUser = {
            ...transformedUser,
            name: freshUserData.name || transformedUser.name,
            email: freshUserData.email || transformedUser.email,
            wallet_address: freshUserData.wallet_address || transformedUser.wallet_address,
            wallet_public_key: freshUserData.wallet_public_key || freshUserData.wallet_address || transformedUser.wallet_public_key,
            created_at: freshUserData.created_at || transformedUser.created_at,
            avatar: freshUserData.avatar || transformedUser.avatar,
            hasCompletedOnboarding: freshUserData.hasCompletedOnboarding !== undefined ? freshUserData.hasCompletedOnboarding : transformedUser.hasCompletedOnboarding,
            // Include lastVerifiedAt for reference (though it's not part of User type)
            lastVerifiedAt: freshUserData.lastVerifiedAt
          };
          
          if (__DEV__) { 
            logger.info('Updated user data with fresh Firestore data', { 
              userId: transformedUser.id,
              hasLastVerifiedAt: !!transformedUser.lastVerifiedAt
            }, 'VerificationScreen'); 
          }
        } else {
          if (__DEV__) { 
            logger.warn('User document not found in Firestore after verification', { userId: transformedUser.id }, 'VerificationScreen'); 
          }
        }
      } catch (firestoreError) {
        logger.warn('Could not fetch fresh user data from Firestore after verification (non-critical)', firestoreError, 'VerificationScreen');
        // Continue with transformed user from API response
      }
      
      if (__DEV__) {
        logger.debug('Raw API Response', { authResponse }, 'VerificationScreen');
        logger.debug('Transformed User', { transformedUser }, 'VerificationScreen');
      }
      
      // Save email to persistence for future logins
      try {
        await AuthPersistenceService.saveEmail(transformedUser.email);
        if (__DEV__) { logger.info('Email saved to persistence after successful verification', { email: transformedUser.email }, 'VerificationScreen'); }
      } catch (emailSaveError) {
        logger.warn('Failed to save email to persistence (non-critical)', emailSaveError, 'VerificationScreen');
        // Non-critical, continue with authentication
      }
      
      // Update the global app context with the authenticated user
      authenticateUser(transformedUser, 'email');
      if (__DEV__) { logger.info('User authenticated in app context', null, 'VerificationScreen'); }

      // Ensure wallet exists for the user (consistent with phone authentication)
      try {
        const { authService } = await import('../../services/auth/AuthService');
        await authService.ensureUserWallet(transformedUser.id);
        logger.info('Wallet ensured for email user', { userId: transformedUser.id }, 'VerificationScreen');
      } catch (walletError) {
        logger.warn('Failed to ensure wallet for email user (non-critical)', walletError, 'VerificationScreen');
        // Non-critical, continue with authentication
      }

      // Check if user needs to create a profile
      // A user has a profile if they have a name AND have completed onboarding
      const hasName = transformedUser.name && transformedUser.name.trim() !== '';
      const hasCompletedOnboarding = transformedUser.hasCompletedOnboarding === true;
      
      logger.info('Checking user profile status after verification', {
        userId: transformedUser.id,
        hasName,
        hasCompletedOnboarding,
        name: transformedUser.name?.substring(0, 10) + '...',
        email: transformedUser.email?.substring(0, 10) + '...'
      }, 'VerificationScreen');
      
      if (!hasName) {
        // User doesn't have a name - needs to create profile
        const referralCode = route.params?.referralCode;
        logger.info('User needs to create profile (no name), navigating to CreateProfile', {
          userId: transformedUser.id,
          hasReferralCode: !!referralCode
        }, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'CreateProfile', params: { 
            email: transformedUser.email,
            referralCode: referralCode
          } }],
        });
      } else if (hasCompletedOnboarding) {
        // User has name and completed onboarding - go to dashboard
        logger.info('User has profile and completed onboarding, navigating to Dashboard', { 
          userId: transformedUser.id,
          name: transformedUser.name 
        }, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        // User has name but hasn't completed onboarding - go to dashboard (onboarding handled there)
        logger.info('User has name but needs onboarding, navigating to Dashboard', { 
          userId: transformedUser.id,
          name: transformedUser.name 
        }, 'VerificationScreen');
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

  const handleHelpCenterPress = () => {
    Linking.openURL('https://help.wesplit.io/');
  };

  const timerText = `00 : ${timer < 10 ? '0' : ''}${timer}`;
  const email = route.params?.email || '';
  const phoneNumber = route.params?.phoneNumber || '';

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
            {/* Title */}
            <View style={styles.titleContainer}>
              <View style={styles.iconContainer}>
                <PhosphorIcon
                  name="Lock"
                  size={24}
                  color={colors.white}
                  weight="regular"
                />
              </View>
              <Text style={styles.title}>Enter Code</Text>
              <Text style={styles.subtitle}>
                We sent a verification code to{' '}
                {phoneNumber 
                  ? `your phone ${phoneNumber.substring(0, 5)}***${phoneNumber.slice(-2)}`
                  : `your email ${email}`}
              </Text>
            </View>

            {/* Code Input */}
            <View style={styles.codeRow}>
              {code.map((digit, idx) => (
                <TextInput
                  key={`input-${idx}`}
                  ref={(ref) => {
                    if (inputRefs.current) {
                      inputRefs.current[idx] = ref;
                    }
                  }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={val => handleChange(val, idx)}
                  onPressIn={handleInputPress}
                  onFocus={handleInputPress}
                  keyboardType="number-pad"
                  maxLength={codeLength} // Allow paste of full code
                  onKeyPress={e => handleKeyPress(e, idx)}
                  textContentType="oneTimeCode"
                  returnKeyType="done"
                  autoComplete="one-time-code"
                  enablesReturnKeyAutomatically={true}
                  placeholder="—"
                  placeholderTextColor={colors.white30}
                />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Resend Code and Paste Button - Same Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleResend}
                disabled={timer !== 0 || resending}
              >
                <Text style={[styles.resendText, timer !== 0 || resending ? styles.resendTextDisabled : null]}>
                  Resend Code ({timerText})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handlePaste} style={styles.pasteButton}>
                <PhosphorIcon
                  name="Clipboard"
                  size={16}
                  color={colors.white80}
                  weight="regular"
                />
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Next Button - Positioned above keyboard */}
        <View style={[styles.buttonContainer, { paddingBottom: keyboardHeight > 0 ? keyboardHeight - 20 : 20 }]}>
          <Button
            title="Next"
            onPress={handleSubmit}
            variant="primary"
            size="large"
            fullWidth={true}
            disabled={code.join('').length !== codeLength || verifying}
            loading={verifying}
          />
        </View>
      </View>
    </Container>
  );
};

export default VerificationScreen; 
