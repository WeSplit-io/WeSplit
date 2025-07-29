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
  Platform
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseAuth, firestoreService, auth } from '../../config/firebase';
import { sendVerificationCode } from '../../services/firebaseAuthService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { solanaAppKitService } from '../../services/solanaAppKitService';
import { userWalletService } from '../../services/userWalletService';
import { unifiedUserService } from '../../services/unifiedUserService';
import { SocialAuthService } from '../../services/socialAuthService';

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
  const [hasCheckedMonthlyVerification, setHasCheckedMonthlyVerification] = useState(false);
  const [hasHandledAuthState, setHasHandledAuthState] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (hasHandledAuthState) {
      if (__DEV__) { console.log('🔄 Auth state already handled, skipping...'); }
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
      if (!appUser.wallet_address) {
        if (__DEV__) { console.log('🔄 Ensuring wallet exists for user...'); }

        try {
          const walletResult = await userWalletService.ensureUserWallet(appUser.id);

          if (walletResult.success && walletResult.wallet) {
            // Update app user with wallet info
            appUser.wallet_address = walletResult.wallet.address;
            appUser.wallet_public_key = walletResult.wallet.publicKey;

            if (__DEV__) { console.log('✅ Wallet ensured successfully:', walletResult.wallet.address); }

            // Update user in AppContext to reflect wallet info
            try {
              await updateUser({
                wallet_address: walletResult.wallet.address,
                wallet_public_key: walletResult.wallet.publicKey
              });
              if (__DEV__) { console.log('✅ Updated user in AppContext with wallet info'); }
            } catch (updateError) {
              console.error('❌ Failed to update user in AppContext:', updateError);
            }
          } else {
            console.error('❌ Failed to ensure wallet:', walletResult.error);
            // Continue without wallet - user can still use the app
          }
        } catch (error) {
          console.error('❌ Wallet creation failed:', error);
          // Continue without wallet - user can still use the app
        }
      } else {
        if (__DEV__) { console.log('✅ User already has wallet:', appUser.wallet_address); }
      }

      // Authenticate user with updated data (including wallet if created)
      authenticateUser(appUser, 'email');

      // Check if user needs to create a profile (has no name/pseudo)
      const needsProfile = !appUser.name || appUser.name.trim() === '';

      if (needsProfile) {
        console.log('🔄 User needs to create profile (no name), navigating to CreateProfile');
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
        });
      } else if (appUser.hasCompletedOnboarding) {
        console.log('✅ User completed onboarding, navigating to Dashboard');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        console.log('🔄 User needs onboarding, navigating to Onboarding');
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
    
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Prevent multiple checks
    if (hasCheckedMonthlyVerification) {
      if (__DEV__) { console.log('🔄 Monthly verification already checked, skipping...'); }
      return;
    }

    // Check if user is already authenticated
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === email) {
      if (__DEV__) { console.log('🔄 User already authenticated, skipping verification...'); }
      return;
    }

    setLoading(true);
    setHasCheckedMonthlyVerification(true);

    try {
      // Check if user has already verified within the last 30 days
      const hasVerifiedWithin30Days = await firestoreService.hasVerifiedWithin30Days(sanitizedEmail);

      if (hasVerifiedWithin30Days) {
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
                    } else if (transformedUser.hasCompletedOnboarding) {
                      console.log('✅ User completed onboarding, navigating to Dashboard');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                      });
                    } else {
                      console.log('🔄 User needs onboarding, navigating to Onboarding');
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Onboarding' }],
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
            } else if (transformedUser.hasCompletedOnboarding) {
              console.log('✅ User completed onboarding, navigating to Dashboard');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            } else {
              console.log('🔄 User needs onboarding, navigating to Onboarding');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
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

  // Handle social authentication
  const handleSocialAuth = async (provider: 'google' | 'twitter' | 'apple') => {
    setLoading(true);
    
    try {
      let authResult;
      
      switch (provider) {
        case 'google':
          authResult = await SocialAuthService.signInWithGoogle();
          break;
        case 'twitter':
          authResult = await SocialAuthService.signInWithTwitter();
          break;
        case 'apple':
          authResult = await SocialAuthService.signInWithApple();
          break;
        default:
          throw new Error('Unsupported provider');
      }

      if (authResult.success && authResult.user) {
        // Transform to app user format
        const appUser = {
          id: authResult.user.id,
          name: authResult.user.name,
          email: authResult.user.email,
          wallet_address: authResult.user.wallet_address || '',
          wallet_public_key: authResult.user.wallet_public_key || '',
          created_at: authResult.user.created_at,
          avatar: authResult.user.avatar || '',
          hasCompletedOnboarding: authResult.user.hasCompletedOnboarding || false
        };

        // Authenticate user with social provider
        authenticateUser(appUser, 'social');

        // Check if user needs to create a profile (has no name/pseudo)
        const needsProfile = !appUser.name || appUser.name.trim() === '';

        if (needsProfile) {
          console.log('🔄 User needs to create profile (no name), navigating to CreateProfile');
          navigation.reset({
            index: 0,
            routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
          });
        } else if (appUser.hasCompletedOnboarding) {
          console.log('✅ User completed onboarding, navigating to Dashboard');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        } else {
          console.log('🔄 User needs onboarding, navigating to Onboarding');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      } else {
        Alert.alert(
          'Authentication Failed',
          authResult.error || 'Failed to authenticate with social provider. Please try again.'
        );
      }
    } catch (error) {
      console.error('Social authentication error:', error);
      Alert.alert(
        'Authentication Error',
        error instanceof Error ? error.message : 'Failed to authenticate. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image source={require('../../../assets/WeSplitLogoName.png')} style={styles.logo} />
        </View>

        <View style={styles.contentContainer}>
          {/* Social Login Buttons */}
          <View style={styles.socialSection}>
            <TouchableOpacity
              style={[styles.socialButton, loading && styles.socialButtonDisabled]}
              onPress={() => handleSocialAuth('google')}
              disabled={loading}
            >
              <Image source={require('../../../assets/google.png')} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, loading && styles.socialButtonDisabled]}
              onPress={() => handleSocialAuth('twitter')}
              disabled={loading}
            >
              <Image source={require('../../../assets/twitter.png')} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {loading ? 'Signing in...' : 'Continue with Twitter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, loading && styles.socialButtonDisabled]}
              onPress={() => handleSocialAuth('apple')}
              disabled={loading}
            >
              <Image source={require('../../../assets/apple.png')} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>
                {loading ? 'Signing in...' : 'Continue with Apple'}
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
            />
          </View>
          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, (!email || loading) && styles.nextButtonDisabled]}
            onPress={handleEmailAuth}
            disabled={!email || loading}
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
          <TouchableOpacity>
            <Text style={styles.helpText}>Need help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthMethodsScreen; 