import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { sendVerificationCode } from '../../services/emailAuthService';
import { useApp } from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [email, setEmail] = useState('pauline.milaalonso@gmail.com');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    console.log('=== Continue button pressed ===');
    console.log('Email entered:', email);
    
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    console.log('Email validation passed, setting loading to true');
    setLoading(true);
    
    try {
      console.log('Attempting to send verification code...');
      
      // Always send verification code with new secure authentication
      // This works for both new and existing users
      const response = await sendVerificationCode(email);
      console.log('Verification code response:', response);
      
      // Check if verification was skipped (user already verified this month)
      if (response.skipVerification && response.user) {
        console.log('✅ User already verified this month, skipping verification');
        console.log('📱 Authenticating user directly...');
        
        // Store tokens securely
        if (response.accessToken && response.refreshToken) {
          await AsyncStorage.setItem('accessToken', response.accessToken);
          await AsyncStorage.setItem('refreshToken', response.refreshToken);
          await AsyncStorage.setItem('user', JSON.stringify(response.user));
        }
        
        // Transform user data to match User type (snake_case)
        const transformedUser = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          wallet_address: response.user.walletAddress,
          wallet_public_key: response.user.walletPublicKey,
          created_at: response.user.createdAt,
          avatar: response.user.avatar
        };
        
        // Update the global app context with the authenticated user
        authenticateUser(transformedUser, 'email');
        
        // Navigate to dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
        return;
      }
      
      console.log('📧 Verification code sent, navigating to verification screen');
      
      // Navigate to verification screen
      console.log('Navigating to Verification screen...');
      navigation.navigate('Verification', { email });
      
    } catch (error) {
      console.error('=== ERROR in handleNext ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Full error:', error);
      
      let errorMessage = 'Failed to send verification code.';
      
      if (error instanceof Error) {
        if (error.message.includes('Cannot connect to backend')) {
          errorMessage = 'Cannot connect to server. Please make sure the backend is running on port 4000.\n\nTo start the backend:\n1. Open terminal in backend folder\n2. Run: npm start';
      } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Connection Error', errorMessage);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo row */}
      <View style={styles.logoRow}>
        <Image source={require('../../../assets/WeSplitLogo.png')} style={styles.logoIcon} />
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>
      {/* Centered content */}
      <View style={styles.centerContent}>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={require('../../../assets/google.png')} style={styles.socialIcon} />
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={require('../../../assets/twitter.png')} style={styles.socialIcon} />
          <Text style={styles.socialText}>Continue with Twitter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
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
        />
        <TouchableOpacity 
          style={[styles.nextButton, loading && { opacity: 0.6 }]} 
          onPress={handleNext} 
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
        <Text style={styles.helpText}>Need help ?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AuthMethodsScreen; 