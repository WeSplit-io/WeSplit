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
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { Container, Header, Button, Input, LoadingScreen, Tabs } from '../../components/shared';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';
import { isPhantomSocialLoginEnabled, isPhantomEnabled } from '../../config/features';
import { PhantomAuthButton } from '../../components/auth/PhantomAuthButton';
import { authService } from '../../services/auth/AuthService';
import { isValidPhoneNumber as validatePhoneE164, normalizePhoneNumber } from '../../utils/validation/phone';

type RootStackParamList = {
  Dashboard: undefined;
  Verification: { email?: string; phoneNumber?: string; verificationId?: string; referralCode?: string };
  CreateProfile: { email?: string; phoneNumber?: string; referralCode?: string };
  AuthMethods: { referralCode?: string; email?: string; prefilledEmail?: string };
};

const AuthMethodsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { authenticateUser, updateUser } = useApp();

  // State management
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Get referral code and email from route params (from deep link)
  const referralCode = (route.params as any)?.referralCode;
  const prefilledEmail = (route.params as any)?.email || (route.params as any)?.prefilledEmail;

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // Use centralized phone validation utility
    return validatePhoneE164(phone);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Use centralized phone normalization utility
    const normalized = normalizePhoneNumber(phone);
    // Validate after normalization
    if (!normalized || !validatePhoneE164(normalized)) {
      return phone; // Return original if normalization fails
    }
    return normalized;
  };

  // Load persisted email and phone on component mount, and prefill email from route params
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Priority: route params > persisted email
        if (prefilledEmail) {
          setEmail(prefilledEmail);
          logger.info('Email prefilled from route params', { email: prefilledEmail }, 'AuthMethodsScreen');
        } else {
          // Load persisted email
          const persistedEmail = await AuthPersistenceService.loadEmail();
          if (persistedEmail) {
            setEmail(persistedEmail);
          }
        }

        // Load persisted phone number
        const persistedPhone = await AuthPersistenceService.loadPhone();
        if (persistedPhone) {
          setPhoneNumber(persistedPhone);
        }
      } catch (error) {
        logger.error('Failed to load persisted auth data', { error }, 'AuthMethodsScreen');
      } finally {
        setIsInitializing(false);
      }
    };

    loadPersistedData();
  }, [prefilledEmail]);

  // Helper function to process phantom authentication success
  const processPhantomAuthSuccess = async (phantomUser: any) => {
    logger.info('Processing phantom auth success', {
      phantomUserId: phantomUser.id,
      socialProvider: phantomUser.socialProvider,
      hasFirebaseUserId: !!phantomUser.firebaseUserId,
      firebaseUserId: phantomUser.firebaseUserId
    }, 'AuthMethodsScreen');

    // Handle Google auth with Firebase users
    if (phantomUser.socialProvider === 'google' && phantomUser.firebaseUserId) {
      try {
        // Wait for Firebase Auth to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        const { auth } = await import('../../config/firebase/firebase');
        const currentFirebaseUser = auth.currentUser;

        if (currentFirebaseUser && currentFirebaseUser.uid === phantomUser.firebaseUserId) {
          logger.info('Using Firebase user data for Google Phantom auth', {
            firebaseUserId: currentFirebaseUser.uid,
            phantomUserId: phantomUser.id
          }, 'AuthMethodsScreen');

          // Ensure user has a wallet and create user object
          const walletInfo = await authService.ensureUserWallet(currentFirebaseUser.uid);
          const appUser = {
            id: currentFirebaseUser.uid,
            name: currentFirebaseUser.displayName || phantomUser.name || '',
            email: currentFirebaseUser.email || phantomUser.email || '',
            wallet_address: walletInfo?.walletAddress || '',
            wallet_public_key: walletInfo?.walletPublicKey || '',
            created_at: currentFirebaseUser.metadata.creationTime || new Date().toISOString(),
            avatar: currentFirebaseUser.photoURL || phantomUser.avatar || '',
            emailVerified: currentFirebaseUser.emailVerified,
            lastLoginAt: currentFirebaseUser.metadata.lastSignInTime || new Date().toISOString(),
            hasCompletedOnboarding: true
          };

          updateUser(appUser);
          authenticateUser(appUser, 'social');

          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
          return;
        }
      } catch (error) {
        logger.warn('Failed to get Firebase user for Google Phantom auth, falling back to phantom user', {
          error: error instanceof Error ? error.message : String(error)
        }, 'AuthMethodsScreen');
      }
    }

    // Fallback: handle phantom users (Apple auth or when Firebase user not available)
    const walletInfo = await authService.ensureUserWallet(phantomUser.id);
    const walletAddress = walletInfo?.walletAddress || phantomUser.phantomWalletAddress;
    const walletPublicKey = walletInfo?.walletPublicKey || phantomUser.phantomWalletAddress;

    const appUser = {
      id: phantomUser.id,
      name: phantomUser.name || '',
      email: phantomUser.email || '',
      wallet_address: walletAddress,
      wallet_public_key: walletPublicKey,
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
  };

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
      await AuthPersistenceService.saveEmail(email.trim());

      // Check if user already exists
      let userExistsResult;
      try {
        userExistsResult = await authService.checkEmailUserExists(email.trim());
      } catch (checkError) {
        logger.error('Exception thrown during checkEmailUserExists', { 
          error: checkError instanceof Error ? checkError.message : String(checkError)
        }, 'AuthMethodsScreen');
        userExistsResult = { success: false, userExists: false, error: 'Failed to check user existence' };
      }

      // Ensure userExistsResult is valid
      if (!userExistsResult || typeof userExistsResult !== 'object') {
        logger.error('Invalid userExistsResult received', { userExistsResult }, 'AuthMethodsScreen');
        userExistsResult = { success: false, userExists: false, error: 'Invalid response from user check' };
      }

      if (!userExistsResult.success) {
        logger.warn('Failed to check if email user exists, proceeding with verification code', {
          error: userExistsResult.error
        }, 'AuthMethodsScreen');
      }

      // If user exists, check if they verified within the last 30 days
      if (userExistsResult.success && userExistsResult.userExists && userExistsResult.userId) {
        logger.info('Email user exists - checking last verification timestamp', {
          userId: userExistsResult.userId,
          email: email.trim()
        }, 'AuthMethodsScreen');

        // Check if user verified within 30 days
        try {
          const { firestoreService } = await import('../../config/firebase/firebase');
          const hasVerifiedRecently = await firestoreService.hasVerifiedWithin30Days(email.trim());

          if (hasVerifiedRecently) {
            logger.info('User verified within 30 days - skipping verification code', {
              userId: userExistsResult.userId,
              email: email.trim()
            }, 'AuthMethodsScreen');

            // STEP 1: Sign in to Firebase Auth using custom token so Firestore rules will allow reads
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
                logger.info('✅ Signed in to Firebase Auth with custom token', null, 'AuthMethodsScreen');
              } else {
                logger.warn('getUserCustomToken did not return a valid token, falling back to verification code', {
                  userId: userExistsResult.userId,
                  tokenData
                }, 'AuthMethodsScreen');
                throw new Error('Failed to obtain custom token');
              }
            } catch (tokenError) {
              logger.warn('Failed to sign in with custom token, falling back to verification code', { 
                error: tokenError instanceof Error ? tokenError.message : String(tokenError),
                userId: userExistsResult.userId
              }, 'AuthMethodsScreen');
              // If we can't sign in, fall through to verification code flow
              throw tokenError;
            }

            // STEP 2: Now that we're authenticated, get user data from Firestore to create proper user object
            try {
              const { firebaseDataService } = await import('../../services/data/firebaseDataService');
              const existingUserData = await firebaseDataService.user.getCurrentUser(userExistsResult.userId);

              if (existingUserData) {
                // Create properly formatted user object (consistent with phone flow)
                const authenticatedUser = {
                  id: userExistsResult.userId,
                  name: existingUserData.name || '',
                  email: existingUserData.email || email.trim(),
                  phone: existingUserData.phone || '',
                  wallet_address: existingUserData.wallet_address || '',
                  wallet_public_key: existingUserData.wallet_public_key || '',
                  created_at: existingUserData.created_at || new Date().toISOString(),
                  avatar: existingUserData.avatar || '',
                  emailVerified: existingUserData.email_verified !== false, // Default to true if not explicitly false
                  lastLoginAt: new Date().toISOString(),
                  hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false,
                };

                // Update authentication context BEFORE navigating
                authenticateUser(authenticatedUser, 'email');

                logger.info('Authentication context updated for email login (verified within 30 days)', {
                  userId: userExistsResult.userId
                }, 'AuthMethodsScreen');

                // Check if user needs to create a profile
                // A user has a profile if they have a name AND have completed onboarding
                // If they have a name but haven't completed onboarding, they should go to onboarding
                // If they don't have a name, they need to create a profile
                const hasName = authenticatedUser.name && authenticatedUser.name.trim() !== '';
                const hasCompletedOnboarding = authenticatedUser.hasCompletedOnboarding === true;
                
                logger.info('Checking user profile status', {
                  userId: userExistsResult.userId,
                  hasName,
                  hasCompletedOnboarding,
                  name: authenticatedUser.name?.substring(0, 10) + '...',
                  email: email.trim()
                }, 'AuthMethodsScreen');

                if (!hasName) {
                  // User doesn't have a name - needs to create profile
                  logger.info('Email user needs to create profile (no name), navigating to CreateProfile', {
                    userId: userExistsResult.userId,
                    email: email.trim(),
                    hasReferralCode: !!referralCode
                  }, 'AuthMethodsScreen');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'CreateProfile', params: {
                      email: email.trim(),
                      phoneNumber: authenticatedUser.phone,
                      referralCode: referralCode
                    } }],
                  });
                } else if (hasCompletedOnboarding) {
                  // User has name and completed onboarding - go to dashboard
                  logger.info('Email user has profile and completed onboarding, navigating to Dashboard', {
                    userId: userExistsResult.userId,
                    name: authenticatedUser.name,
                    email: email.trim()
                  }, 'AuthMethodsScreen');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                  });
                } else {
                  // User has name but hasn't completed onboarding - go to dashboard (onboarding handled there)
                  logger.info('Email user has name but needs onboarding, navigating to Dashboard', {
                    userId: userExistsResult.userId,
                    name: authenticatedUser.name,
                    email: email.trim()
                  }, 'AuthMethodsScreen');
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                  });
                }
                return;
              } else {
                logger.error('User data not found in Firestore for email login', {
                  userId: userExistsResult.userId
                }, 'AuthMethodsScreen');
                // Fall through to verification code flow
              }
            } catch (firestoreError) {
              logger.error('Failed to fetch user data for email login', {
                error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
                userId: userExistsResult.userId
              }, 'AuthMethodsScreen');
              // Fall through to verification code flow
            }
          } else {
            logger.info('User has not verified within 30 days - sending verification code', {
              userId: userExistsResult.userId,
              email: email.trim()
            }, 'AuthMethodsScreen');
            // Fall through to verification code flow
          }
        } catch (verificationCheckError) {
          logger.error('Failed to check 30-day verification status', {
            error: verificationCheckError instanceof Error ? verificationCheckError.message : String(verificationCheckError),
            email: email.trim()
          }, 'AuthMethodsScreen');
          // Fall through to verification code flow on error
        }
      }

      // New user, failed login, or needs re-verification - send verification code
      logger.info('Sending verification code', {
        email: email.trim(),
        userExists: userExistsResult.userExists
      }, 'AuthMethodsScreen');

      const result = await authService.sendEmailVerificationCode(email.trim());
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send verification code');
        return;
      }

      // Navigate to verification screen
      navigation.navigate('Verification', { 
        email: email.trim(),
        referralCode: referralCode
      });
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

      // Save phone number for persistence
      await AuthPersistenceService.savePhone(formattedPhone);

      // Start phone authentication (may result in instant login or SMS verification)
      const result = await authService.signInWithPhoneNumber(formattedPhone);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to authenticate with phone number');
        return;
      }

      // Check if user was instantly logged in (existing user)
      if (result.user && !result.isNewUser) {
        logger.info('Phone instant login successful - user already exists', {
          userId: result.user.uid,
          phoneNumber: formattedPhone.substring(0, 5) + '...'
        }, 'AuthMethodsScreen');

        // Get user data from Firestore to create proper user object
        try {
          const { firebaseDataService } = await import('../../services/data/firebaseDataService');
          const existingUserData = await firebaseDataService.user.getCurrentUser(result.user.uid);

          if (existingUserData) {
            // Create properly formatted user object (consistent with email flow)
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
              lastLoginAt: new Date().toISOString(), // Use current time for login
              hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false,
            };

            // Update authentication context BEFORE navigating
            authenticateUser(authenticatedUser, 'phone');

            logger.info('Authentication context updated for phone instant login', {
              userId: result.user.uid
            }, 'AuthMethodsScreen');

            // Check if user needs to create a profile (same logic as email)
            const needsProfile = !authenticatedUser.name || authenticatedUser.name.trim() === '';

            if (needsProfile) {
              logger.info('Phone user needs to create profile (no name), navigating to CreateProfile', {
                userId: result.user.uid,
                phoneNumber: formattedPhone.substring(0, 5) + '...',
                hasReferralCode: !!referralCode
              }, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'CreateProfile', params: {
                  phoneNumber: formattedPhone,
                  email: authenticatedUser.email,
                  referralCode: referralCode
                } }],
              });
            } else {
              logger.info('Phone user already has name, navigating to Dashboard', {
                userId: result.user.uid,
                name: authenticatedUser.name,
                phoneNumber: formattedPhone.substring(0, 5) + '...'
              }, 'AuthMethodsScreen');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              });
            }
            return;
          } else {
            logger.error('User data not found in Firestore for instant login', {
              userId: result.user.uid
            }, 'AuthMethodsScreen');
            Alert.alert('Error', 'User data not found. Please try again.');
            return;
          }
        } catch (firestoreError) {
          logger.error('Failed to fetch user data for instant login', {
            error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
          }, 'AuthMethodsScreen');
          Alert.alert('Error', 'Failed to load user data. Please try again.');
          return;
        }
      }

      // New user - navigate to verification screen for SMS code
      logger.info('New phone user - navigating to SMS verification', {
        phoneNumber: formattedPhone.substring(0, 5) + '...',
        verificationId: result.verificationId,
        hasReferralCode: !!referralCode
      }, 'AuthMethodsScreen');

      navigation.navigate('Verification', {
        phoneNumber: formattedPhone,
        verificationId: result.verificationId,
        referralCode: referralCode
      });
    } catch (error) {
      logger.error('Phone authentication failed', { error, phoneNumber: formattedPhone.substring(0, 5) + '...' }, 'AuthMethodsScreen');

      // Provide specific error messages for common issues
      let errorMessage = 'Failed to send SMS. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('reCAPTCHA') || error.message.includes('external scripts')) {
          // Production-ready error message - phone auth is enabled
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
                onSuccess={async (phantomUser) => {
                  logger.info('Phantom authentication successful', { userId: phantomUser?.id }, 'AuthMethodsScreen');

                  if (phantomUser) {
                    await processPhantomAuthSuccess(phantomUser);
                  }
                }}
                onError={(error) => {
                  logger.error('Phantom authentication failed', { error }, 'AuthMethodsScreen');

                  // Provide more specific error messages for common issues
                  let errorMessage = 'Failed to authenticate with Phantom';
                  let errorTitle = 'Authentication Failed';

                  if (error?.includes('check team status') || error?.includes('not allowed to proceed') || error?.includes('team status') || error?.includes('not allowed')) {
                    errorTitle = 'Phantom Portal Approval Required';
                    errorMessage = 'Your app ID (ab881c51-6335-49b9-8800-0e4ad7d21ca3) needs approval from Phantom Portal.\n\nSteps to fix:\n1. Visit https://phantom.app/developers\n2. Sign in with your Phantom wallet\n3. Find your app and submit for approval\n4. Wait 1-3 business days\n\nFor immediate development testing, use email or phone authentication instead.';
                  } else if (error?.includes('network') || error?.includes('connection')) {
                    errorMessage = 'Network connection issue. Please check your internet connection and try again.';
                  }

                  Alert.alert(errorTitle, errorMessage);
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
                AuthPersistenceService.saveEmail(text).catch((error) => {
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
