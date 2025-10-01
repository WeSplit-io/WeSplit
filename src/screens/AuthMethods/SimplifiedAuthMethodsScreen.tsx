/**
 * Simplified Auth Methods Screen for WeSplit
 * Clean authentication flow with automatic wallet creation
 * Uses app's built-in wallet for processing send transactions
 */

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
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { simplifiedAuthService, AppUser } from '../../services/simplifiedAuthService';
import { auth } from '../../config/firebase';

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

const SimplifiedAuthMethodsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { authenticateUser, state } = useApp();
  const { ensureAppWallet, clearAllWalletStateForUserSwitch } = useWallet();

  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'twitter' | 'apple' | null>(null);
  const [hasHandledAuthState, setHasHandledAuthState] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (hasHandledAuthState) {
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && !hasHandledAuthState) {
        setHasHandledAuthState(true);
        
        if (firebaseUser.emailVerified) {
          // Email is verified, proceed with authentication
          await handleAuthenticatedUser(firebaseUser);
        } else {
          // Email not verified, navigate to verification screen
          navigation.navigate('Verification', { email: firebaseUser.email || '' });
        }
      }
    });

    return () => unsubscribe();
  }, [hasHandledAuthState]);

  // Handle authenticated user
  const handleAuthenticatedUser = async (firebaseUser: any) => {
    try {
      console.log('🔍 AuthMethods: Handling authenticated user:', firebaseUser.uid);


      // Clear wallet state for user switch (if different user by email)
      // This prevents wallet loss when users switch authentication methods but are the same person
      if (state.currentUser && state.currentUser.email !== firebaseUser.email) {
        console.log('🔄 AuthMethods: Different user detected (different email), clearing wallet state');
        clearAllWalletStateForUserSwitch();
      } else if (state.currentUser && state.currentUser.email === firebaseUser.email) {
        console.log('✅ AuthMethods: Same user detected (same email), preserving wallet state');
      }

      // Use simplified auth service to authenticate user and ensure wallet
      const appUser = await simplifiedAuthService.authenticateUser(firebaseUser, 'email');

      console.log('✅ AuthMethods: User authenticated with wallet:', {
        id: appUser.id,
        email: appUser.email,
        wallet_address: appUser.wallet_address,
        hasWallet: !!appUser.wallet_address
      });

      // Authenticate user in app context
      authenticateUser(appUser, 'email');

      // Ensure app wallet is connected in wallet context
      await ensureAppWallet(appUser.id);

      // Check if user needs to create a profile (has no name/pseudo)
      const needsProfile = !appUser.name || appUser.name.trim() === '';

      if (needsProfile) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateProfile' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }

    } catch (error) {
      console.error('❌ AuthMethods: Error handling authenticated user:', error);
      Alert.alert('Authentication Error', 'Failed to authenticate user. Please try again.');
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setSocialLoading('google');
      console.log('🔄 AuthMethods: Starting Google Sign-In...');

      const result = await simplifiedAuthService.signInWithGoogle();

      if (result.success && result.user) {
        console.log('✅ AuthMethods: Google Sign-In successful');
        
        // Handle the authenticated user
        await handleAuthenticatedUser(result.user);
      } else {
        console.error('❌ AuthMethods: Google Sign-In failed:', result.error);
        
        // Don't show alert for user cancellation
        if (result.error && !result.error.includes('cancelled')) {
          Alert.alert('Sign-In Error', result.error);
        }
      }
    } catch (error) {
      console.error('❌ AuthMethods: Google Sign-In error:', error);
      Alert.alert('Sign-In Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Handle Email Sign-In
  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 AuthMethods: Starting Email Sign-In...');

      const result = await simplifiedAuthService.signInWithEmail(email.trim(), password);

      if (result.success && result.user) {
        console.log('✅ AuthMethods: Email Sign-In successful');
        
        // Handle the authenticated user
        await handleAuthenticatedUser(result.user);
      } else {
        console.error('❌ AuthMethods: Email Sign-In failed:', result.error);
        Alert.alert('Sign-In Error', result.error || 'Failed to sign in. Please try again.');
      }
    } catch (error) {
      console.error('❌ AuthMethods: Email Sign-In error:', error);
      Alert.alert('Sign-In Error', 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Sign-Up
  const handleEmailSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 AuthMethods: Starting Email Sign-Up...');

      const result = await simplifiedAuthService.createAccountWithEmail(email.trim(), password);

      if (result.success && result.user) {
        console.log('✅ AuthMethods: Email Sign-Up successful');
        
        // Navigate to verification screen for new users
        navigation.navigate('Verification', { email: email.trim() });
      } else {
        console.error('❌ AuthMethods: Email Sign-Up failed:', result.error);
        Alert.alert('Sign-Up Error', result.error || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('❌ AuthMethods: Email Sign-Up error:', error);
      Alert.alert('Sign-Up Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome to WeSplit</Text>
            <Text style={styles.subtitle}>
              Split expenses with friends and manage your shared finances
            </Text>
          </View>

          {/* Email/Password Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEmailSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
              onPress={handleEmailSignUp}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Sign-In */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'google' && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={!!socialLoading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <Image 
                    source={require('../../assets/google-icon.png')} 
                    style={styles.socialIcon}
                  />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SimplifiedAuthMethodsScreen;
