import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking 
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { Container, Header, Button, Input, LoadingScreen } from '../../components/shared';
import Tabs from '../../components/shared/Tabs';
import { useApp } from '../../context/AppContext';
import { firebaseAuth, firestoreService, auth } from '../../config/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { walletService } from '../../services/blockchain/wallet';
import { sendVerificationCode } from '../../services/data';
import { logger } from '../../services/analytics/loggingService';
import { EmailPersistenceService } from '../../services/core/emailPersistenceService';
import { PhonePersistenceService } from '../../services/core/phonePersistenceService';
import { useWallet } from '../../context/WalletContext';
import { authService } from '../../services/auth/AuthService';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../utils/validation/phone';

// Background wallet creation: Automatically creates Solana wallet for new users
// without blocking the UI or showing any modals

type RootStackParamList = {
  Dashboard: undefined;
  Verification: { email?: string; phoneNumber?: string; verificationId?: string; isLinking?: boolean };
  AuthMethods: undefined;
  Auth: undefined;
  Splash: undefined;
  GetStarted: undefined;
  CreateProfile: undefined;
  Onboarding: undefined;
};

const AuthMethodsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { authenticateUser, updateUser } = useApp();
  const { hydrateAppWalletSecrets } = useWallet();

  // State management
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasHandledAuthState, setHasHandledAuthState] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [emailSaveTimeout, setEmailSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Load persisted email on component mount
  useEffect(() => {
    const loadPersistedEmail = async () => {
      try {
        const persistedEmail = await EmailPersistenceService.loadEmail();
        if (persistedEmail) {
          logger.info('Loaded persisted email', { email: persistedEmail }, 'AuthMethodsScreen');
          setEmail(persistedEmail);
          
          // Check if user needs re-verification
          await checkVerificationStatus(persistedEmail);
        }
      } catch (error) {
        logger.error('Failed to load persisted email', { error }, 'AuthMethodsScreen');
      } finally {
        setIsInitializing(false);
      }
    };

    loadPersistedEmail();
  }, []);

  // Check if user needs re-verification
  const checkVerificationStatus = async (userEmail: string) => {
    try {
      const { firestoreService } = await import('../../config/firebase/firebase');
      
      // Check if user has verified within 30 days
      const hasVerifiedRecently = await Promise.race([
        firestoreService.hasVerifiedWithin30Days(userEmail),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verification check timeout')), 10000)
        )
      ]) as boolean;

      if (hasVerifiedRecently) {
        logger.info('User has verified within 30 days, auto-authenticating', { email: userEmail }, 'AuthMethodsScreen');
        // Auto-authenticate the user with the verified email
        await handleEmailAuthWithEmail(userEmail);
      } else {
        logger.info('User needs re-verification', { email: userEmail }, 'AuthMethodsScreen');
        // User needs re-verification, but keep the email pre-filled
      }
    } catch (error) {
      logger.error('Failed to check verification status', { error, email: userEmail }, 'AuthMethodsScreen');
      // Continue with normal flow if check fails
    }
  };

  // Save email to persistence when it changes
  const saveEmailToStorage = async (emailValue: string) => {
    try {
      if (emailValue && isValidEmail(emailValue)) {
        await EmailPersistenceService.saveEmail(emailValue);
      }
    } catch (error) {
      logger.error('Failed to save email to storage', { error, email: emailValue }, 'AuthMethodsScreen');
    }
  };

  // Check if user is already authenticated
  useEffect(() => {
    if (hasHandledAuthState) {
      return;
    }

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && !hasHandledAuthState) {
        setHasHandledAuthState(true);
        // User is signed in
        if (firebaseUser.emailVerified) {
          // Email is verified, proceed with wallet connection
          await handleAuthenticatedUser(firebaseUser);
        } else {
          // Email not verified, navigate to verification screen
          navigation.navigate('Verification', { email: firebaseUser.email || '' });
        }
      }
    });

    return () => unsubscribe();
  }, [hasHandledAuthState]);


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailSaveTimeout) {
        clearTimeout(emailSaveTimeout);
      }
    };
  }, [emailSaveTimeout]);

  // Handle authenticated user
  const handleAuthenticatedUser = async (firebaseUser: any) => {
    try {
      // Get or create user document
      let userData = await firestoreService.getUserDocument(firebaseUser.uid);

      if (!userData) {
        // Create new user document
        userData = await firestoreService.createUserDocument(firebaseUser);
      }

      // Check if existing user should skip onboarding
      const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

      // Transform to app user format - prioritize wallet_address over primary_wallet
      const walletAddress = userData.wallet_address || (userData.primary_wallet && userData.primary_wallet !== '11111111111111111111111111111111' ? userData.primary_wallet : '');
      
      const appUser = {
        id: userData.id || firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || '',
        email: userData.email || firebaseUser.email || '',
        wallet_address: walletAddress,
        wallet_public_key: userData.wallet_public_key || walletAddress,
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || '',
        hasCompletedOnboarding: shouldSkipOnboarding
      };

      // Ensure user has a wallet using the centralized wallet service
      // CRITICAL: Always call ensureUserWallet to verify wallet integrity and restore if needed
      // ✅ Pass email for email-based recovery fallback
      try {
        logger.info('Ensuring wallet integrity for user', { 
          userId: appUser.id,
          email: appUser.email?.substring(0, 5) + '...'
        }, 'AuthMethodsScreen');
        const walletResult = await walletService.ensureUserWallet(appUser.id);

        if (walletResult.success && walletResult.wallet) {
          // Update app user with wallet info (this will be the same wallet if it already exists)
          appUser.wallet_address = walletResult.wallet.address;
          appUser.wallet_public_key = walletResult.wallet.publicKey;
          
          logger.info('Wallet ensured for user', { address: walletResult.wallet.address }, 'AuthMethodsScreen');
          
          // Update user in AppContext
          updateUser(appUser);
          // Hydrate mnemonic into app context for session use
          try { await hydrateAppWalletSecrets(appUser.id); } catch {}
        } else {
          console.error('❌ AuthMethods: Failed to ensure user wallet:', walletResult.error);
          // Continue without wallet - user can add it later
          updateUser(appUser);
        }
      } catch (error) {
        console.error('❌ AuthMethods: Error ensuring user wallet:', error);
        // Continue without wallet - user can add it later
        updateUser(appUser);
      }

      // Save email to persistence for future logins
      try {
        await saveEmailToStorage(appUser.email);
        logger.info('Email saved to persistence after successful authentication', { email: appUser.email }, 'AuthMethodsScreen');
      } catch (emailSaveError) {
        logger.warn('Failed to save email to persistence (non-critical)', emailSaveError, 'AuthMethodsScreen');
        // Non-critical, continue with authentication
      }

      // Authenticate user with updated data (including wallet if created)
      authenticateUser(appUser, 'email');

      // Check if user needs to create a profile (has no name/pseudo)
      const needsProfile = !appUser.name || appUser.name.trim() === '';

      if (needsProfile) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
        });
      } else if (appUser.hasCompletedOnboarding) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    }
  };

  // Handle email authentication with a specific email (for auto-authentication)
  const handleEmailAuthWithEmail = async (emailToUse: string) => {
    logger.info('handleEmailAuthWithEmail called', { email: emailToUse }, 'AuthMethodsScreen');
    
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = emailToUse?.trim().replace(/\s+/g, '') || '';

    if (!sanitizedEmail) {
      logger.warn('No email provided to handleEmailAuthWithEmail', null, 'AuthMethodsScreen');
      return;
    }

    setLoading(true);

    try {
      logger.info('Starting email authentication process with provided email', null, 'AuthMethodsScreen');
      
      // Import firestore service
      const { firestoreService } = await import('../../config/firebase/firebase');

      // Check if user has verified within 30 days (with shorter timeout to prevent hanging)
      let hasVerifiedRecently = false;
      try {
        hasVerifiedRecently = await Promise.race([
          firestoreService.hasVerifiedWithin30Days(sanitizedEmail),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Verification check timeout')), 15000)
          )
        ]) as boolean;
      } catch (timeoutError) {
        console.warn('⚠️ Verification check timed out after 5 seconds, proceeding with verification flow');
        // If verification check times out, assume user needs verification
        hasVerifiedRecently = false;
      }

      if (hasVerifiedRecently) {
        if (__DEV__) {
          logger.info('User has already verified within the last 30 days, bypassing verification', null, 'AuthMethodsScreen');
        }

        // Save email to storage for future use
        await saveEmailToStorage(sanitizedEmail);

        // Show loading indicator for bypass
        setLoading(true);

        try {
          // Get existing user from Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', sanitizedEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User exists in Firestore, get the user data
            const userDoc = querySnapshot.docs[0];
            if (!userDoc) {
              throw new Error('User document not found');
            }
            const userData = userDoc.data();

            if (__DEV__) { logger.debug('Found existing user in Firestore', { userData }, 'AuthMethodsScreen'); }

            // Check if user exists in Firebase Auth
            const firebaseUser = auth.currentUser;

            if (!firebaseUser || firebaseUser.email !== sanitizedEmail) {
              // For existing users in Firestore, we don't need to create a new Firebase Auth user
              // We can authenticate them directly using their Firestore data
              if (__DEV__) { 
                logger.info('Existing user found in Firestore, authenticating directly without Firebase Auth', null, 'AuthMethodsScreen'); 
              }

              // Check if existing user should skip onboarding
              const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

              // Use the Firestore user data directly
              const transformedUser = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                wallet_address: userData.wallet_address || '',
                wallet_public_key: userData.wallet_public_key || '',
                created_at: userData.created_at,
                avatar: userData.avatar || '',
                hasCompletedOnboarding: shouldSkipOnboarding
              };

              // Save email to persistence for future logins
              try {
                await saveEmailToStorage(transformedUser.email);
                logger.info('Email saved to persistence after successful login', { email: transformedUser.email }, 'AuthMethodsScreen');
              } catch (emailSaveError) {
                logger.warn('Failed to save email to persistence (non-critical)', emailSaveError, 'AuthMethodsScreen');
                // Non-critical, continue with authentication
              }

              // Update the global app context with the authenticated user
              authenticateUser(transformedUser, 'email');

              // Check if user needs to create a profile (has no name/pseudo)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';
              
              if (needsProfile) {
                logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'AuthMethodsScreen');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
                });
              } else {
                // User has a profile, go directly to Dashboard
                logger.info('User has profile, navigating to Dashboard', null, 'AuthMethodsScreen');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              }
              return;
            }

            // Update the user's last login timestamp
            await firestoreService.updateLastVerifiedAt(sanitizedEmail);

            // Check if existing user should skip onboarding
            const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

            // Use the existing user data
            const transformedUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              wallet_address: userData.wallet_address || '',
              wallet_public_key: userData.wallet_public_key || '',
              created_at: userData.created_at,
              avatar: userData.avatar || '',
              hasCompletedOnboarding: shouldSkipOnboarding
            };

            // Save email to persistence for future logins
            try {
              await saveEmailToStorage(transformedUser.email);
              logger.info('Email saved to persistence after successful login', { email: transformedUser.email }, 'AuthMethodsScreen');
            } catch (emailSaveError) {
              logger.warn('Failed to save email to persistence (non-critical)', emailSaveError, 'AuthMethodsScreen');
              // Non-critical, continue with authentication
            }

            // Update the global app context with the authenticated user
            authenticateUser(transformedUser, 'email');

            // Check if user needs to create a profile (has no name/pseudo)
            const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

            if (needsProfile) {
              logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
              });
            } else {
              // User has a profile, go directly to Dashboard
              logger.info('User has profile, navigating to Dashboard', null, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
          } else {
            // User doesn't exist in Firestore, they need to go through verification
            if (__DEV__) { logger.info('User not found in Firestore, proceeding with verification flow', null, 'AuthMethodsScreen'); }
            
            // Don't create Firebase Auth user here - let the verification flow handle it
            // Navigate to verification screen
            navigation.navigate('Verification', { email: sanitizedEmail });
            return;
          }
        } catch (error: any) {
          console.error('Error handling existing user:', error);
          throw error;
        }
      } else {
        // User needs verification (not verified within 30 days)
        if (__DEV__) {
          logger.info('User needs verification (not verified within 30 days), sending OTP', null, 'AuthMethodsScreen');
        }

        // Send verification code (with longer timeout to allow Firebase Functions to complete)
        logger.info('Sending verification code', null, 'AuthMethodsScreen');
        try {
          await Promise.race([
            sendVerificationCode(sanitizedEmail),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification code send timeout')), 60000)
            )
          ]);
          logger.info('Verification code sent successfully', null, 'AuthMethodsScreen');
        } catch (sendError) {
          console.warn('⚠️ Verification code send failed or timed out:', sendError);
          // Continue anyway - user can request a new code on the verification screen
        }

        // Save email to storage for future use
        await saveEmailToStorage(sanitizedEmail);

        // Navigate to verification screen (always navigate, regardless of send success)
        navigation.navigate('Verification', { email: sanitizedEmail });
      }
    } catch (error: any) {
      logger.error('Error in email authentication with provided email', { error: error.message, code: error.code }, 'AuthMethodsScreen');
      
      // Convert expected errors to warnings
      if (error.code === 'auth/email-already-in-use') {
        if (__DEV__) {
          console.warn('Expected Firebase Auth error (user already exists):', error.message);
        }
        // Continue with the flow since we handle this case above
      } else if (error.message === 'Verification check timeout') {
        console.warn('⚠️ Verification check timed out, proceeding with verification flow');
        // If verification check times out, proceed with sending verification code
        try {
          logger.info('Sending verification code after timeout', null, 'AuthMethodsScreen');
          await Promise.race([
            sendVerificationCode(sanitizedEmail),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification code send timeout')), 60000)
            )
          ]);
          logger.info('Verification code sent successfully', null, 'AuthMethodsScreen');
        } catch (sendError) {
          console.warn('⚠️ Verification code send failed or timed out:', sendError);
          // Continue anyway - user can request a new code on the verification screen
        }
        
        // Always navigate to verification screen
        navigation.navigate('Verification', { email: sanitizedEmail });
      } else if (error.message === 'Verification code send timeout') {
        console.warn('⚠️ Verification code send timed out');
        Alert.alert(
          'Network Error',
          'Unable to send verification code. Please check your connection and try again.'
        );
      } else {
        console.error('Error in email authentication:', error);

        if (error.code === 'auth/too-many-requests') {
          Alert.alert(
            'Too Many Requests',
            'Too many attempts. Please wait a few minutes before trying again.'
          );
        } else if (error.code === 'auth/invalid-email') {
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
        } else {
          Alert.alert(
            'Authentication Error',
            error.message || 'Failed to authenticate. Please try again.'
          );
        }
      }
    } finally {
      logger.info('Email authentication process finished, setting loading to false', null, 'AuthMethodsScreen');
      setLoading(false);
    }
  };

  // Handle phone authentication
  const handlePhoneAuth = async () => {
    logger.info('handlePhoneAuth called', { phoneNumber }, 'AuthMethodsScreen');
    
    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      logger.warn('Invalid phone number', null, 'AuthMethodsScreen');
      Alert.alert('Error', 'Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    setLoading(true);

    try {
      logger.info('Starting phone authentication process', null, 'AuthMethodsScreen');
      
      // Call Firebase Phone Auth to send SMS
      const result = await authService.signInWithPhoneNumber(normalizedPhone);
      
      if (!result.success || !result.verificationId) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      // Save phone to storage for future use
      await PhonePersistenceService.savePhone(normalizedPhone);

      logger.info('SMS code sent successfully', null, 'AuthMethodsScreen');
      
      // Navigate to verification screen with phone number and verification ID
      navigation.navigate('Verification', { 
        phoneNumber: normalizedPhone,
        verificationId: result.verificationId
      });
    } catch (error: any) {
      logger.error('Error in phone authentication', { error: error.message, code: error.code }, 'AuthMethodsScreen');
      
      if (error.code === 'auth/too-many-requests') {
        Alert.alert(
          'Too Many Requests',
          'Too many attempts. Please wait a few minutes before trying again.'
        );
      } else if (error.code === 'auth/invalid-phone-number') {
        Alert.alert('Invalid Phone Number', 'Please enter a valid phone number in international format.');
      } else {
        Alert.alert(
          'Authentication Error',
          error.message || 'Failed to send verification code. Please try again.'
        );
      }
    } finally {
      logger.info('Phone authentication process finished, setting loading to false', null, 'AuthMethodsScreen');
      setLoading(false);
    }
  };

  // Handle email authentication using Firebase directly
  const handleEmailAuth = async () => {
    logger.info('handleEmailAuth called', { email }, 'AuthMethodsScreen');
    
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';

    if (!sanitizedEmail) {
      logger.warn('No email provided', null, 'AuthMethodsScreen');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      logger.info('Starting email authentication process', null, 'AuthMethodsScreen');
      
      // Import firestore service
      const { firestoreService } = await import('../../config/firebase/firebase');

      // Check if user has verified within 30 days (with shorter timeout to prevent hanging)
      let hasVerifiedRecently = false;
      try {
        hasVerifiedRecently = await Promise.race([
          firestoreService.hasVerifiedWithin30Days(sanitizedEmail),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Verification check timeout')), 15000)
          )
        ]) as boolean;
      } catch (timeoutError) {
        console.warn('⚠️ Verification check timed out after 5 seconds, proceeding with verification flow');
        // If verification check times out, assume user needs verification
        hasVerifiedRecently = false;
      }

      if (hasVerifiedRecently) {
        if (__DEV__) {
          logger.info('User has already verified within the last 30 days, bypassing verification', null, 'AuthMethodsScreen');
        }

        // Save email to storage for future use
        await saveEmailToStorage(sanitizedEmail);

        // Show loading indicator for bypass
        setLoading(true);

        try {
          // Get existing user from Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', sanitizedEmail));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User exists in Firestore, get the user data
            const userDoc = querySnapshot.docs[0];
            if (!userDoc) {
              throw new Error('User document not found');
            }
            const userData = userDoc.data();

            if (__DEV__) { logger.debug('Found existing user in Firestore', { userData }, 'AuthMethodsScreen'); }

            // Check if user exists in Firebase Auth
            const firebaseUser = auth.currentUser;

            if (!firebaseUser || firebaseUser.email !== sanitizedEmail) {
              // For existing users in Firestore, we don't need to create a new Firebase Auth user
              // We can authenticate them directly using their Firestore data
              if (__DEV__) { 
                logger.info('Existing user found in Firestore, authenticating directly without Firebase Auth', null, 'AuthMethodsScreen'); 
              }

              // Check if existing user should skip onboarding
              const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

              // Use the Firestore user data directly
              const transformedUser = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                wallet_address: userData.wallet_address || '',
                wallet_public_key: userData.wallet_public_key || '',
                created_at: userData.created_at,
                avatar: userData.avatar || '',
                hasCompletedOnboarding: shouldSkipOnboarding
              };

              // Update the global app context with the authenticated user
              authenticateUser(transformedUser, 'email');

              // Check if user needs to create a profile (has no name/pseudo)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';
              
              if (needsProfile) {
                logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'AuthMethodsScreen');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
                });
              } else {
                // User has a profile, go directly to Dashboard
                logger.info('User has profile, navigating to Dashboard', null, 'AuthMethodsScreen');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Dashboard' }],
                });
              }
              return;
            }

            // Update the user's last login timestamp
            await firestoreService.updateLastVerifiedAt(email);

            // Check if existing user should skip onboarding
            const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

            // Use the existing user data
            const transformedUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              wallet_address: userData.wallet_address || '',
              wallet_public_key: userData.wallet_public_key || '',
              created_at: userData.created_at,
              avatar: userData.avatar || '',
              hasCompletedOnboarding: shouldSkipOnboarding
            };

            // Update the global app context with the authenticated user
            authenticateUser(transformedUser, 'email');

            // Check if user needs to create a profile (has no name/pseudo)
            const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

            if (needsProfile) {
              logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
              });
            } else {
              // User has a profile, go directly to Dashboard
              logger.info('User has profile, navigating to Dashboard', null, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
          } else {
            // User doesn't exist in Firestore, they need to go through verification
            if (__DEV__) { logger.info('User not found in Firestore, proceeding with verification flow', null, 'AuthMethodsScreen'); }
            
            // Don't create Firebase Auth user here - let the verification flow handle it
            // Navigate to verification screen
            navigation.navigate('Verification', { email: sanitizedEmail });
            return;
          }
        } catch (error: any) {
          console.error('Error handling existing user:', error);
          throw error;
        }
      } else {
        // User needs verification (not verified within 30 days)
        if (__DEV__) {
          logger.info('User needs verification (not verified within 30 days), sending OTP', null, 'AuthMethodsScreen');
        }

        // Send verification code (with longer timeout to allow Firebase Functions to complete)
        logger.info('Sending verification code', null, 'AuthMethodsScreen');
        try {
          await Promise.race([
            sendVerificationCode(sanitizedEmail),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Verification code send timeout')), 60000)
            )
          ]);
          logger.info('Verification code sent successfully', null, 'AuthMethodsScreen');
        } catch (sendError) {
          console.warn('⚠️ Verification code send failed or timed out:', sendError);
          // Continue anyway - user can request a new code on the verification screen
        }

        // Save email to storage for future use
        await saveEmailToStorage(sanitizedEmail);

        // Navigate to verification screen (always navigate, regardless of send success)
        navigation.navigate('Verification', { email: sanitizedEmail });
      }
          } catch (error: any) {
        logger.error('Error in email authentication', { error: error.message, code: error.code }, 'AuthMethodsScreen');
        
        // Convert expected errors to warnings
        if (error.code === 'auth/email-already-in-use') {
          if (__DEV__) {
            console.warn('Expected Firebase Auth error (user already exists):', error.message);
          }
          // Continue with the flow since we handle this case above
        } else if (error.message === 'Verification check timeout') {
          console.warn('⚠️ Verification check timed out, proceeding with verification flow');
          // If verification check times out, proceed with sending verification code
          try {
            logger.info('Sending verification code after timeout', null, 'AuthMethodsScreen');
            await Promise.race([
              sendVerificationCode(sanitizedEmail),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Verification code send timeout')), 60000)
              )
            ]);
            logger.info('Verification code sent successfully', null, 'AuthMethodsScreen');
          } catch (sendError) {
            console.warn('⚠️ Verification code send failed or timed out:', sendError);
            // Continue anyway - user can request a new code on the verification screen
          }
          
          // Always navigate to verification screen
          navigation.navigate('Verification', { email: sanitizedEmail });
        } else if (error.message === 'Verification code send timeout') {
          console.warn('⚠️ Verification code send timed out');
          Alert.alert(
            'Network Error',
            'Unable to send verification code. Please check your connection and try again.'
          );
        } else {
          console.error('Error in email authentication:', error);

          if (error.code === 'auth/too-many-requests') {
            Alert.alert(
              'Too Many Requests',
              'Too many attempts. Please wait a few minutes before trying again.'
            );
          } else if (error.code === 'auth/invalid-email') {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
          } else {
            Alert.alert(
              'Authentication Error',
              error.message || 'Failed to authenticate. Please try again.'
            );
          }
        }
      } finally {
        logger.info('Email authentication process finished, setting loading to false', null, 'AuthMethodsScreen');
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

          {/* Auth Method Tabs */}
          <Tabs
            tabs={[
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'phone' }
            ]}
            activeTab={authMethod}
            onTabChange={(tab) => setAuthMethod(tab as 'email' | 'phone')}
            enableAnimation={false}
          />

          {/* Email Input */}
          {authMethod === 'email' && (
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              logger.debug('Email input changed', { text }, 'AuthMethodsScreen');
              setEmail(text);
              
              // Clear existing timeout
              if (emailSaveTimeout) {
                clearTimeout(emailSaveTimeout);
              }
              
              // Set new timeout to save email after user stops typing
              const timeoutId = setTimeout(() => {
                saveEmailToStorage(text);
              }, 1000);
              setEmailSaveTimeout(timeoutId);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
          />
          )}

          {/* Phone Input */}
          {authMethod === 'phone' && (
            <Input
              label="Phone Number"
              placeholder="+1234567890"
              value={phoneNumber}
              onChangeText={(text) => {
                logger.debug('Phone input changed', { text }, 'AuthMethodsScreen');
                setPhoneNumber(text);
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
              authMethod === 'email' 
                ? (!email || !isValidEmail(email) || loading)
                : (!phoneNumber || !isValidPhoneNumber(normalizePhoneNumber(phoneNumber)) || loading)
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
