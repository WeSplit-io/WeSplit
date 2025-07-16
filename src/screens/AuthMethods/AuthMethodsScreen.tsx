import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Modal,
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
import { solanaAppKitService, WalletInfo } from '../../services/solanaAppKitService';
import { sendVerificationCode } from '../../services/firebaseAuthService';

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
  const { authenticateUser } = useApp();
  const { connectWallet } = useWallet();
  
  // State management
  const [email, setEmail] = useState('vincent@we.split');
  const [loading, setLoading] = useState(false);
  const [walletCreationModal, setWalletCreationModal] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
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
  }, []);

  // Handle authenticated user
  const handleAuthenticatedUser = async (firebaseUser: any) => {
    try {
      // Get or create user document
      let userData = await firestoreService.getUserDocument(firebaseUser.uid);
      
      if (!userData) {
        // Create new user document
        userData = await firestoreService.createUserDocument(firebaseUser);
      }

      // Transform to app user format
      const appUser = {
        id: parseInt(userData.id) || 0,
        name: userData.name || firebaseUser.displayName || '',
        email: userData.email || firebaseUser.email || '',
        wallet_address: userData.wallet_address || '',
        wallet_public_key: userData.wallet_public_key || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || ''
      };

      // Check if user has a wallet
      if (appUser.wallet_address) {
        // User has wallet, authenticate and navigate to dashboard
        authenticateUser(appUser, 'email');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      } else {
        // User needs wallet creation
        setWalletCreationModal(true);
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    }
  };

  // Handle email authentication using Firebase directly
  const handleEmailAuth = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Use Firebase backend service for 4-digit code verification
      const result = await sendVerificationCode(email);
      
      if (result.success) {
        // Navigate directly to verification screen
        navigation.navigate('Verification', { email });
        
        // Store email for later use
        await AsyncStorage.setItem('pendingEmail', email);
        
        if (__DEV__) {
          console.log('Verification code sent to:', email);
        }
      } else {
        Alert.alert('Authentication Error', result.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      Alert.alert('Authentication Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle wallet creation
  const handleWalletCreation = async () => {
    try {
      setLoading(true);
      
      // Create new wallet using AppKit
      const result = await solanaAppKitService.createWallet();
      const wallet = result.wallet;
      
      setWalletInfo(wallet);
      
      // Update user document with wallet info
      const currentUser = auth.currentUser;
      if (currentUser) {
        await firestoreService.updateUserWallet(currentUser.uid, {
          address: wallet.address,
          publicKey: wallet.publicKey
        });
      }
      
      // Request airdrop for development
      if (process.env.NODE_ENV !== 'production') {
        try {
          await solanaAppKitService.requestAirdrop(1);
          Alert.alert('Success', '1 SOL airdropped to your wallet for testing!');
        } catch (airdropError) {
          console.log('Airdrop failed (this is normal in some cases):', airdropError);
        }
      }
      
      // Get updated user data
      if (currentUser) {
        await handleAuthenticatedUser(currentUser);
      }
      
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Wallet Creation Error', 'Failed to create wallet. Please try again.');
    } finally {
      setLoading(false);
      setWalletCreationModal(false);
    }
  };

  // Handle social authentication (placeholder for future implementation)
  const handleSocialAuth = (provider: 'google' | 'twitter' | 'apple') => {
    Alert.alert('Coming Soon', `${provider} authentication will be available soon!`);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Logo row */}
        <View style={styles.logoRow}>
          <Image source={require('../../../assets/WeSplitLogo.png')} style={styles.logoIcon} />
          <Text style={styles.logoText}>
            We<Text style={styles.logoSplit}>Split</Text>
          </Text>
        </View>

        {/* Centered content */}
        <View style={styles.centerContent}>
          {/* Social buttons */}
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialAuth('google')}
          >
            <Image source={require('../../../assets/google.png')} style={styles.socialIcon} />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialAuth('twitter')}
          >
            <Image source={require('../../../assets/twitter.png')} style={styles.socialIcon} />
            <Text style={styles.socialText}>Continue with Twitter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialAuth('apple')}
          >
            <Image source={require('../../../assets/apple.png')} style={styles.socialIcon} />
            <Text style={styles.socialText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Email input */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {/* Submit button */}
          <TouchableOpacity 
            style={[styles.nextButton, loading && { opacity: 0.6 }]} 
            onPress={handleEmailAuth} 
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={colors.darkBackground} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Help link */}
        <TouchableOpacity style={styles.helpLink}>
          <Text style={styles.helpText}>Need help?</Text>
        </TouchableOpacity>
      </ScrollView>



      {/* Wallet Creation Modal */}
      <Modal
        visible={walletCreationModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Solana Wallet</Text>
            <Text style={styles.modalText}>
              We'll create a secure Solana wallet for you to send and receive USDC payments.
            </Text>
            
            <TouchableOpacity 
              style={[styles.modalButton, loading && { opacity: 0.6 }]}
              onPress={handleWalletCreation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.darkBackground} />
              ) : (
                <Text style={styles.modalButtonText}>Create Wallet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default AuthMethodsScreen; 