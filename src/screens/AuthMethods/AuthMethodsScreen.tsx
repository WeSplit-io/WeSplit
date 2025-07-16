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
  const [email, setEmail] = useState('vincent@we.split');
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

      // Transform to app user format
      const appUser = {
        id: userData.id || firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || '',
        email: userData.email || firebaseUser.email || '',
        wallet_address: userData.wallet_address || '',
        wallet_public_key: userData.wallet_public_key || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || ''
      };

      // If user doesn't have a wallet, create one and update the user data
      if (!appUser.wallet_address) {
        if (__DEV__) { console.log('🔄 Creating wallet for new user...'); }
        
        try {
          // Create wallet synchronously for new users
          const result = await solanaAppKitService.createWallet();
          const wallet = result.wallet;
          
          // Update user document with wallet info
          await firestoreService.updateUserWallet(firebaseUser.uid, {
            address: wallet.address,
            publicKey: wallet.publicKey
          });
          
          // Update app user with wallet info
          appUser.wallet_address = wallet.address;
          appUser.wallet_public_key = wallet.publicKey;
          
          // Request airdrop in background for development
          if (process.env.NODE_ENV !== 'production') {
            solanaAppKitService.requestAirdrop(1)
              .then(() => {
                if (__DEV__) {
                  console.log('✅ Background airdrop successful: 1 SOL added to wallet');
                }
              })
              .catch((airdropError) => {
                if (__DEV__) {
                  console.log('⚠️ Background airdrop failed (this is normal):', airdropError.message);
                }
              });
          }
          
          if (__DEV__) { console.log('✅ Wallet creation successful'); }
          
          // Update user in AppContext to reflect wallet info
          try {
            await updateUser({
              wallet_address: wallet.address,
              wallet_public_key: wallet.publicKey
            });
            if (__DEV__) { console.log('✅ Updated user in AppContext with wallet info'); }
          } catch (updateError) {
            console.error('❌ Failed to update user in AppContext:', updateError);
          }
        } catch (error) {
          console.error('❌ Wallet creation failed:', error);
          // Continue without wallet - user can still use the app
        }
      }

      // Authenticate user with updated data (including wallet if created)
      authenticateUser(appUser, 'email');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
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
      // Check if user has already verified this month
      const hasVerifiedThisMonth = await firestoreService.hasVerifiedThisMonth(email);
      
      if (hasVerifiedThisMonth) {
        if (__DEV__) {
          console.log('✅ User has already verified this month, bypassing verification');
        }
        
        // Show loading indicator for bypass
        setLoading(true);
        
        // User has verified this month, try to get their existing user data
        try {
          // Find existing user by email
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Transform to app user format
            const appUser = {
              id: userData.id || userDoc.id,
              name: userData.name || '',
              email: userData.email || email,
              wallet_address: userData.wallet_address || '',
              wallet_public_key: userData.wallet_public_key || '',
              created_at: userData.created_at || new Date().toISOString(),
              avatar: userData.avatar || ''
            };
            
            // Update last login timestamp
            await firestoreService.updateLastVerifiedAt(email);
            
            // If user doesn't have a wallet, create one and update the user data
            if (!appUser.wallet_address) {
              if (__DEV__) { console.log('🔄 Creating wallet for existing user...'); }
              
              try {
                // Create wallet synchronously for existing users without wallet
                const result = await solanaAppKitService.createWallet();
                const wallet = result.wallet;
                
                // Update user document with wallet info
                await firestoreService.updateUserWallet(userDoc.id, {
                  address: wallet.address,
                  publicKey: wallet.publicKey
                });
                
                // Update app user with wallet info
                appUser.wallet_address = wallet.address;
                appUser.wallet_public_key = wallet.publicKey;
                
                // Request airdrop in background for development
                if (process.env.NODE_ENV !== 'production') {
                  solanaAppKitService.requestAirdrop(1)
                    .then(() => {
                      if (__DEV__) {
                        console.log('✅ Background airdrop successful: 1 SOL added to wallet');
                      }
                    })
                    .catch((airdropError) => {
                      if (__DEV__) {
                        console.log('⚠️ Background airdrop failed (this is normal):', airdropError.message);
                      }
                    });
                }
                
                if (__DEV__) { console.log('✅ Wallet creation successful'); }
                
                // Update user in AppContext to reflect wallet info
                try {
                  await updateUser({
                    wallet_address: wallet.address,
                    wallet_public_key: wallet.publicKey
                  });
                  if (__DEV__) { console.log('✅ Updated user in AppContext with wallet info'); }
                } catch (updateError) {
                  console.error('❌ Failed to update user in AppContext:', updateError);
                }
              } catch (error) {
                console.error('❌ Wallet creation failed:', error);
                // Continue without wallet - user can still use the app
              }
            }
            
            // Authenticate user with updated data (including wallet if created)
            authenticateUser(appUser, 'email');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
            return;
          }
        } catch (userError) {
          console.error('Error getting existing user data:', userError);
          // Fall through to send verification code
        }
      }
      
      // User hasn't verified this month or doesn't exist, send verification code
      if (__DEV__) {
        console.log('📧 User needs verification, sending code to:', email);
      }
      
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
    </KeyboardAvoidingView>
  );
};

export default AuthMethodsScreen; 