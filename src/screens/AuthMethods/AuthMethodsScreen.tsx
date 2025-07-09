import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './styles';
import { colors } from '../../theme';
import { sendVerificationCode } from '../../services/emailAuthService';
import { findUserByEmail } from '../../services/userService';
import { useApp } from '../../context/AppContext';

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
  const [email, setEmail] = useState('vinc.charles0@gmail.com');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const existingUser = await findUserByEmail(email);
      console.log('existingUser:', existingUser);
      if (existingUser && !existingUser.error) {
        authenticateUser(existingUser, 'email');
        navigation.navigate('Dashboard');
      } else {
        await sendVerificationCode(email);
        navigation.navigate('Verification', { email });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to check user or send verification code.');
    } finally {
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
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={loading}>
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