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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuth, firestoreService, auth } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { solanaAppKitService } from '../../services/solanaAppKitService';
import { userWalletService } from '../../services/userWalletService';
import { unifiedUserService } from '../../services/unifiedUserService';
import { socialAuthService } from '../../services/socialAuthService';
import { userDataService } from '../../services/userDataService';
import * as AuthSession from 'expo-auth-session';
import { loginWithGoogle, getAuthConfig, testAuthConfiguration } from '../../services/firebaseAuthService';
import { sendVerificationCode } from '../../services/firebaseFunctionsService';

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

      // Check if existing user should skip onboarding
      const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

      // Transform to app user format
      const appUser = {
        id: userData.id || firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || '',
        email: userData.email || firebaseUser.email || '',
        wallet_address: userData.wallet_address || '',
        wallet_public_key: userData.wallet_public_key || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || '',
        hasCompletedOnboarding: shouldSkipOnboarding
      };

      // Ensure user has a wallet using the centralized wallet service
      // CRITICAL: Only create wallet if user doesn't have one
      if (!appUser.wallet_address) {
        try {
          console.log('🔄 AuthMethods: User has no wallet, ensuring one exists...');
          const walletResult = await userWalletService.ensureUserWallet(appUser.id);

          if (walletResult.success && walletResult.wallet) {
            // Update app user with wallet info
            appUser.wallet_address = walletResult.wallet.address;
            appUser.wallet_public_key = walletResult.wallet.publicKey;
            
            console.log('✅ AuthMethods: Wallet ensured for user:', walletResult.wallet.address);
            
            // Update user in AppContext
            updateUser(appUser);
          } else {
            console.error('❌ AuthMethods: Failed to ensure user wallet:', walletResult.error);
            // Continue without wallet - user can add it later
          }
        } catch (error) {
          console.error('❌ AuthMethods: Error ensuring user wallet:', error);
          // Continue without wallet - user can add it later
        }
      } else {
        // User already has wallet - preserve it
        console.log('💰 AuthMethods: User already has wallet, preserving it:', appUser.wallet_address);
        // User already has wallet, just update AppContext
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
    // Sanitize email by trimming whitespace and newlines
    const sanitizedEmail = email?.trim().replace(/\s+/g, '') || '';

    if (!sanitizedEmail) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // First, fix any users with invalid lastVerifiedAt dates
      const { firestoreService } = await import('../../config/firebase');
      await firestoreService.fixInvalidLastVerifiedAt();

      // Check if user has verified within 30 days
      const hasVerifiedRecently = await firestoreService.hasVerifiedWithin30Days(sanitizedEmail);

      if (hasVerifiedRecently) {
        if (__DEV__) {
          console.log('✅ User has already verified within the last 30 days, bypassing verification');
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

            if (__DEV__) { console.log('📋 Found existing user in Firestore:', userData); }

            // Check if user exists in Firebase Auth
            let firebaseUser = auth.currentUser;

            if (!firebaseUser || firebaseUser.email !== sanitizedEmail) {
              // Try to get user by email from Firebase Auth
              try {
                // For existing users, we need to handle this differently
                // Since we can't sign in without knowing the password, we'll create a new Firebase Auth user
                // with a secure temporary password and update the Firestore document
                const temporaryPassword = `WeSplit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                try {
                  // Try to create a new Firebase Auth user
                  firebaseUser = await firebaseAuth.createUserWithEmail(sanitizedEmail, temporaryPassword);
                  if (__DEV__) { console.log('✅ Created new Firebase Auth user for existing Firestore user'); }
                } catch (createError: any) {
                  if (createError.code === 'auth/email-already-in-use') {
                    // User already exists in Firebase Auth, we need to handle this
                    // For now, we'll use the existing user data and skip Firebase Auth
                    if (__DEV__) { console.warn('⚠️ User exists in Firebase Auth but we can\'t sign in without password (this is normal)'); }

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
                      console.log('🔄 User needs to create profile (no name), navigating to CreateProfile');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
                      });
                    } else {
                      // User has a profile, go directly to Dashboard
                      console.log('✅ User has profile, navigating to Dashboard');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                      });
                    }
                    return;
                  } else {
                    throw createError;
                  }
                }
              } catch (authError: any) {
                console.error('Firebase Auth error:', authError);
                throw new Error('Failed to authenticate user');
              }
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
              console.log('🔄 User needs to create profile (no name), navigating to CreateProfile');
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
              });
            } else {
              // User has a profile, go directly to Dashboard
              console.log('✅ User has profile, navigating to Dashboard');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
          } else {
            // User doesn't exist in Firestore, create new user
            if (__DEV__) { console.log('🆕 Creating new user since not found in Firestore'); }

            const temporaryPassword = `WeSplit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const userCredential = await firebaseAuth.createUserWithEmail(email, temporaryPassword);
            await handleAuthenticatedUser(userCredential);
          }
        } catch (error: any) {
          console.error('Error handling existing user:', error);
          throw error;
        }
      } else {
        // User needs verification (not verified within 30 days)
        if (__DEV__) {
          console.log('🔄 User needs verification (not verified within 30 days), sending OTP');
        }

        // Send verification code
        await sendVerificationCode(sanitizedEmail);

        // Navigate to verification screen
        navigation.navigate('Verification', { email: sanitizedEmail });
      }
          } catch (error: any) {
        // Convert expected errors to warnings
        if (error.code === 'auth/email-already-in-use') {
          if (__DEV__) {
            console.warn('Expected Firebase Auth error (user already exists):', error.message);
          }
          // Continue with the flow since we handle this case above
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
        setLoading(false);
      }
  };

  // Handle social authentication with improved error handling and user data management
  const handleSocialAuth = async (provider: 'google' | 'twitter' | 'apple') => {
    setSocialLoading(provider);
    
    try {
      let authResult;
      
      switch (provider) {
        case 'google':
          authResult = await loginWithGoogle();
          break;
        case 'twitter':
          authResult = await socialAuthService.signInWithTwitter();
          break;
        case 'apple':
          authResult = await socialAuthService.signInWithApple();
          break;
        default:
          throw new Error('Unsupported provider');
      }

      if (authResult.success && authResult.user) {
        // Save user data to Firestore using the new user data service
        const userDataResult = await userDataService.saveUserDataAfterSSO(authResult.user, provider);

        if (userDataResult.success && userDataResult.userData) {
          // Transform to app user format
          const appUser = {
            id: userDataResult.userData.id,
            name: userDataResult.userData.name,
            email: userDataResult.userData.email,
            wallet_address: userDataResult.userData.wallet_address || '',
            wallet_public_key: userDataResult.userData.wallet_public_key || '',
            created_at: userDataResult.userData.created_at,
            avatar: userDataResult.userData.avatar || '',
            hasCompletedOnboarding: userDataResult.userData.hasCompletedOnboarding
          };

          // Authenticate user with social provider
          authenticateUser(appUser, 'social');

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
        } else {
          console.error(`Failed to save user data for ${provider}:`, userDataResult.error);
          Alert.alert(
            'Authentication Failed',
            userDataResult.error || 'Failed to save user data. Please try again.'
          );
        }
      } else {
        console.error(`${provider} authentication failed:`, authResult.error);
        Alert.alert(
          'Authentication Failed',
          authResult.error || 'Failed to authenticate with social provider. Please try again.'
        );
      }
    } catch (error) {
      console.error(`${provider} authentication error:`, error);
      Alert.alert(
        'Authentication Error',
        error instanceof Error ? error.message : 'Failed to authenticate. Please try again.'
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
        {/* Logo Section */}
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FWeSplitLogoName.png?alt=media&token=f785d9b1-f4e8-4f51-abac-e17407e4a48f' }} style={styles.logo} />
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Social Login Buttons */}
          <View style={styles.socialSection}>
            <TouchableOpacity
              style={[
                styles.socialButton, 
                (loading || socialLoading === 'google') && styles.socialButtonDisabled
              ]}
              onPress={() => handleSocialAuth('google')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fgoogle.png?alt=media&token=76efeba8-dc73-4ed3-bf5c-f28bd0ae6fdd' }} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'google' ? getSocialLoadingText('google') : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton, 
                (loading || socialLoading === 'twitter') && styles.socialButtonDisabled
              ]}
              onPress={() => handleSocialAuth('twitter')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftwitter.png?alt=media&token=470228c6-cb4e-4c39-9c40-563b7e707c43' }} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'twitter' ? getSocialLoadingText('twitter') : 'Continue with Twitter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton, 
                (loading || socialLoading === 'apple') && styles.socialButtonDisabled
              ]}
              onPress={() => handleSocialAuth('apple')}
              disabled={loading || socialLoading !== null}
            >
              <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fapple.png?alt=media&token=783e0e17-b215-4532-896b-6333cc667c5b' }} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'apple' ? getSocialLoadingText('apple') : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Separator */}
          <View style={styles.separator}>
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
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />
          </View>
          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, (!email || loading || socialLoading !== null) && styles.nextButtonDisabled]}
            onPress={handleEmailAuth}
            disabled={!email || loading || socialLoading !== null}
          >
            {loading ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
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