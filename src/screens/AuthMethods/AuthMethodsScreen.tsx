import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuth, firestoreService, auth } from '../../config/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { walletService } from '../../services/wallet';
import { authService } from '../../services/auth';
import { firebaseDataService } from '../../services/data';
import { sendVerificationCode } from '../../services/data';
import { logOAuthConfiguration } from '../../utils/core';
import { logger } from '../../services/core';
import { testEnvironmentVariables } from '../../utils/core';
import { logOAuthDebugInfo } from '../../utils/core';
import Header from '../../components/shared/Header';

// Background wallet creation: Automatically creates Solana wallet for new users
// without blocking the UI or showing any modals

type RootStackParamList = {
  Dashboard: undefined;
  Verification: { email: string };
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
  const { connectWallet } = useWallet();

  // State management
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'twitter' | 'apple' | null>(null);
  const [hasCheckedMonthlyVerification, setHasCheckedMonthlyVerification] = useState(false);
  const [hasHandledAuthState, setHasHandledAuthState] = useState(false);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
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

  // Reset monthly verification flag when email changes
  useEffect(() => {
    setHasCheckedMonthlyVerification(false);
  }, [email]);

  // Handle authenticated user
  const handleAuthenticatedUser = async (firebaseUser: any) => {
    try {
      // Get or create user document
      let userData = await firestoreService.getUserDocument(firebaseUser.uid);

      if (!userData) {
        // Create new user document
        userData = await firestoreService.createUserDocument(firebaseUser);
      }

      // Debug: Log the user data to understand what we're getting
      logger.debug('Retrieved user data', {
        id: userData.id,
        email: userData.email,
        wallet_address: userData.wallet_address,
        primary_wallet: userData.primary_wallet,
        linked_wallets: userData.linked_wallets,
        wallet_public_key: userData.wallet_public_key,
        wallet_status: userData.wallet_status,
        hasWalletAddress: !!userData.wallet_address,
        walletAddressLength: userData.wallet_address?.length || 0,
        isPlaceholderWallet: userData.primary_wallet === '11111111111111111111111111111111'
      });

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

      // Debug: Log the transformed app user
      logger.debug('Transformed app user', {
        id: appUser.id,
        email: appUser.email,
        wallet_address: appUser.wallet_address,
        wallet_public_key: appUser.wallet_public_key,
        hasWalletAddress: !!appUser.wallet_address,
        walletAddressLength: appUser.wallet_address?.length || 0,
        walletSource: userData.wallet_address ? 'wallet_address' : (userData.primary_wallet ? 'primary_wallet' : 'none')
      });

      // Ensure user has a wallet using the centralized wallet service
      // CRITICAL: Always call ensureUserWallet to verify wallet integrity and restore if needed
      try {
        logger.info('Ensuring wallet integrity for user', null, 'AuthMethodsScreen');
        const walletResult = await walletService.ensureUserWallet(appUser.id);

        if (walletResult.success && walletResult.wallet) {
          // Update app user with wallet info (this will be the same wallet if it already exists)
          appUser.wallet_address = walletResult.wallet.address;
          appUser.wallet_public_key = walletResult.wallet.publicKey;
          
          logger.info('Wallet ensured for user', { address: walletResult.wallet.address }, 'AuthMethodsScreen');
          
          // Update user in AppContext
          updateUser(appUser);
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


  // Handle social authentication with improved error handling and user data management
  const handleSocialAuth = async (provider: 'google' | 'twitter' | 'apple') => {
    setSocialLoading(provider);
    
    try {
      // Log OAuth configuration for debugging
      logger.info('Testing OAuth configuration for provider', { provider }, 'AuthMethodsScreen');
      testEnvironmentVariables();
      logOAuthConfiguration();
      logOAuthDebugInfo();
      
      // Use unified SSO service for authentication
      const ssoResult = await authService.authenticateWithSSO(provider);

      if (ssoResult.success && ssoResult.user) {
        logger.info('Provider authentication successful, saving user data', { provider }, 'AuthMethodsScreen');
        
        // Save user data to Firestore using the firebase data service
        const userData = await firebaseDataService.user.createUserIfNotExists({
          email: ssoResult.user.email || '',
          name: ssoResult.user.displayName || '',
          avatar: ssoResult.user.photoURL || '',
          wallet_address: ''
        });

        if (userData) {
          logger.info('User data saved successfully for provider user', { provider }, 'AuthMethodsScreen');
          
          // Transform to app user format
          const appUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            wallet_address: userData.wallet_address || '',
            wallet_public_key: userData.wallet_public_key || '',
            created_at: userData.created_at,
            avatar: userData.avatar || '',
            hasCompletedOnboarding: userData.hasCompletedOnboarding
          };

          logger.info('SSO User data', {
            id: appUser.id,
            email: appUser.email,
            name: appUser.name,
            hasWallet: !!appUser.wallet_address,
            walletAddress: appUser.wallet_address,
            hasCompletedOnboarding: appUser.hasCompletedOnboarding
          });

          // Authenticate user with social provider
          authenticateUser(appUser, 'social');

          // Check if user needs to create a profile (has no name/pseudo)
          const needsProfile = !appUser.name || appUser.name.trim() === '';

          if (needsProfile) {
            logger.info('User needs profile creation, navigating to CreateProfile', null, 'AuthMethodsScreen');
            navigation.reset({
              index: 0,
              routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
            });
          } else if (appUser.hasCompletedOnboarding) {
            logger.info('User has completed onboarding, navigating to Dashboard', null, 'AuthMethodsScreen');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
          } else {
            logger.info('User needs onboarding, navigating to Onboarding', null, 'AuthMethodsScreen');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          }
        } else {
          console.error(`❌ Failed to save user data for ${provider}`);
          
          // Show user-friendly error message
          const errorMessage = 'Failed to save user data. Please try again.';
          
          Alert.alert(
            'Authentication Issue',
            errorMessage,
            [
              {
                text: 'Try Again',
                onPress: () => handleSocialAuth(provider)
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      } else {
        console.error(`❌ ${provider} authentication failed:`, ssoResult.error);
        
        // Provide more specific error messages for common OAuth issues
        let errorMessage = 'Failed to authenticate with social provider. Please try again.';
        if (ssoResult.error) {
          if (ssoResult.error.includes('cancelled')) {
            errorMessage = 'Sign-in was cancelled. Please try again if you want to continue.';
          } else if (ssoResult.error.includes('not configured') || ssoResult.error.includes('Client ID')) {
            errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not properly configured. Please contact support.`;
          } else if (ssoResult.error.includes('network') || ssoResult.error.includes('timeout')) {
            errorMessage = 'Network error occurred. Please check your connection and try again.';
          } else if (ssoResult.error.includes('already exists')) {
            errorMessage = 'An account with this email already exists. Please try signing in with a different method.';
          } else {
            errorMessage = ssoResult.error;
          }
        }
        
        Alert.alert(
          'Authentication Failed',
          errorMessage,
          [
            {
              text: 'Try Again',
              onPress: () => handleSocialAuth(provider)
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error(`${provider} authentication error:`, error);
      
      // Provide more specific error messages for common OAuth issues
      let errorMessage = 'Failed to authenticate. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Authentication timed out. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        } else if (error.message.includes('cancelled')) {
          errorMessage = 'Sign-in was cancelled. Please try again if you want to continue.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Authentication Error',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => handleSocialAuth(provider)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setSocialLoading(null);
    }
  };

  // Get loading text for social buttons
  const getSocialLoadingText = (provider: 'google' | 'twitter' | 'apple') => {
    switch (provider) {
      case 'google':
        return 'Signing in with Google...';
      case 'twitter':
        return 'Signing in with Twitter...';
      case 'apple':
        return 'Signing in with Apple...';
      default:
        return 'Signing in...';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Logo */}
        <Header variant="logoOnly" />

        <View style={styles.contentContainer}>
          {/* Social Login Buttons */}
          {/*<View style={styles.socialSection}>
            <TouchableOpacity
              style={[
                styles.socialButtonLight, 
                (loading || socialLoading === 'google') && styles.socialButtonLightDisabled
              ]}
              onPress={() => handleSocialAuth('google')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgoogle.png?alt=media&token=76efeba8-dc73-4ed3-bf5c-f28bd0ae6fdd' }} style={styles.socialImageIcon} />
              <Text style={styles.socialButtonTextDark}>
                {socialLoading === 'google' ? getSocialLoadingText('google') : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButtonLight, 
                (loading || socialLoading === 'twitter') && styles.socialButtonLightDisabled
              ]}
              onPress={() => handleSocialAuth('twitter')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftwitter.png?alt=media&token=470228c6-cb4e-4c39-9c40-563b7e707c43' }} style={styles.socialImageIcon} />
              <Text style={styles.socialButtonTextDark}>
                {socialLoading === 'twitter' ? getSocialLoadingText('twitter') : 'Continue with Twitter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButtonLight, 
                (loading || socialLoading === 'apple') && styles.socialButtonLightDisabled
              ]}
              onPress={() => handleSocialAuth('apple')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fapple.png?alt=media&token=783e0e17-b215-4532-896b-6333cc667c5b' }} style={styles.socialImageIcon} />
              <Text style={styles.socialButtonTextDark}>
                {socialLoading === 'apple' ? getSocialLoadingText('apple') : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          </View>*/}


          {/* Separator */}
          {/*<View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Email Input */}
          <View style={styles.emailSection}>
            <Text style={styles.emailLabel}>Email</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your email"
              placeholderTextColor={colors.white50}
              value={email}
              onChangeText={(text) => {
                logger.debug('Email input changed', { text }, 'AuthMethodsScreen');
                setEmail(text);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />
          </View>
          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, (!email || !isValidEmail(email) || loading || socialLoading !== null) && styles.nextButtonDisabled]}
            onPress={() => {
              logger.info('Next button pressed', { email, loading, socialLoading }, 'AuthMethodsScreen');
              handleEmailAuth();
            }}
            disabled={!email || !isValidEmail(email) || loading || socialLoading !== null}
          >
            {loading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              (!email || !isValidEmail(email) || loading || socialLoading !== null) ? (
                <Text style={[styles.nextButtonText, styles.nextButtonTextDisabled]}>Next</Text>
              ) : (
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientNextButton}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                </LinearGradient>
              )
            )}
          </TouchableOpacity>

        </View>

        {/* Help Link */}
        <View style={styles.helpSection}>
          <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
            <Text style={styles.helpText}>Need help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthMethodsScreen; 
