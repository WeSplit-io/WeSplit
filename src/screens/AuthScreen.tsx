import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import { loginUser } from '../services/userService';

const AuthScreen: React.FC<any> = ({ navigation }) => {
  const { connectWallet, isLoading } = useWallet();
  const { authenticateUser } = useApp();
  const [authMethod, setAuthMethod] = useState<'wallet' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleAuthSuccess = (userData: any) => {
    authenticateUser(userData, userData.authMethod);
    navigation.replace('Dashboard');
  };

  const handleWalletAuth = async () => {
    try {
      setIsConnecting(true);
      
      // Use the wallet context to connect wallet
      await connectWallet();
      
      // For now, simulate successful wallet connection
      const userData = {
        id: '1',
        name: 'Ari Colon',
        email: 'ari.colon@gmail.com',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        walletAddress: 'mock_wallet_address_123456789',
        authMethod: 'wallet',
      };
      
      handleAuthSuccess(userData);
    } catch (error) {
      console.error('Wallet authentication failed:', error);
      Alert.alert('Authentication Failed', 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setIsConnecting(true);
      
      console.log('Attempting to login user with email:', email);
      const userData = await loginUser(email);
      console.log('User logged in successfully:', userData);
      
      const user = {
        id: userData.id.toString(),
        name: userData.name,
        email: userData.email,
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg', // Default avatar
        walletAddress: userData.walletAddress,
        authMethod: 'email',
      };
      
      handleAuthSuccess(user);
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Authentication Failed', (error as any).message || 'Invalid email. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGuestMode = () => {
    const userData = {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@wesplit.app',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      walletAddress: null,
      authMethod: 'guest',
    };
    
    handleAuthSuccess(userData);
  };

  if (authMethod === 'email') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setAuthMethod(null)}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Email Login</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.gray}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            

            
            <TouchableOpacity 
              style={[styles.authButton, isConnecting && styles.authButtonDisabled]}
              onPress={handleEmailAuth}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.authButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.content}>
        {/* Logo and Welcome */}
        <View style={styles.welcomeSection}>
          <View style={styles.logoContainer}>
            <Icon name="users" size={64} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to WeSplit</Text>
          <Text style={styles.welcomeSubtitle}>
            Split expenses with friends using Web3 technology
          </Text>
        </View>

        {/* Authentication Options */}
        <View style={styles.authOptions}>
          <TouchableOpacity 
            style={[styles.authOption, styles.walletOption]}
            onPress={handleWalletAuth}
            disabled={isConnecting}
          >
            <Icon name="credit-card" size={24} color={colors.background} />
            <Text style={styles.authOptionText}>Connect Wallet</Text>
            {isConnecting && <ActivityIndicator size="small" color={colors.background} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.authOption, styles.emailOption]}
            onPress={() => setAuthMethod('email')}
            disabled={isConnecting}
          >
            <Icon name="mail" size={24} color={colors.background} />
            <Text style={styles.authOptionText}>Sign in with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.authOption, styles.guestOption]}
            onPress={handleGuestMode}
            disabled={isConnecting}
          >
            <Icon name="user" size={24} color={colors.gray} />
            <Text style={[styles.authOptionText, { color: colors.gray }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  authOptions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  authOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: radii.input,
    gap: spacing.sm,
  },
  walletOption: {
    backgroundColor: colors.primary,
  },
  emailOption: {
    backgroundColor: colors.secondary,
  },
  guestOption: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authOptionText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
  },
  authOptionDisabled: {
    opacity: 0.6,
  },
  formContainer: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    color: colors.background,
  },
  termsSection: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: fontSizes.sm,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: fontWeights.medium as any,
  },
});

export default AuthScreen; 